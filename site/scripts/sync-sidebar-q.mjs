import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const siteDir = path.resolve(scriptDir, '..')
const workspaceDir = path.resolve(siteDir, '..')
const sourceDir = path.join(workspaceDir, '素材', '网站素材', 'q版')
const publicDir = path.join(siteDir, 'docs', 'public', 'sidebar-q')
const manifestPath = path.join(publicDir, 'manifest.json')
const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp'])

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

if (!existsSync(sourceDir)) {
  throw new Error(`素材目录不存在：${sourceDir}`)
}

const sourceFiles = walk(sourceDir)
  .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))
  .sort((left, right) => left.localeCompare(right, 'zh-CN'))

if (!sourceFiles.length) {
  throw new Error(`素材目录中没有可同步的图片：${sourceDir}`)
}

mkdirSync(publicDir, { recursive: true })

for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
  if (entry.isFile() && (entry.name === 'manifest.json' || entry.name.endsWith('.webp'))) {
    rmSync(path.join(publicDir, entry.name))
  }
}

const manifest = []
const seenHashes = new Set()
let outputBytes = 0
const filter =
  'scale=320:320:force_original_aspect_ratio=decrease:flags=lanczos,' +
  'pad=320:320:(ow-iw)/2:(oh-ih)/2:color=#00000000'

for (const sourceFile of sourceFiles) {
  const hash = createHash('sha1').update(readFileSync(sourceFile)).digest('hex').slice(0, 16)
  if (seenHashes.has(hash)) continue

  seenHashes.add(hash)
  const outputName = `q-${hash}.webp`
  const outputPath = path.join(publicDir, outputName)
  const result = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-y',
      '-i',
      sourceFile,
      '-vf',
      filter,
      '-frames:v',
      '1',
      '-an',
      '-c:v',
      'libwebp',
      '-lossless',
      '0',
      '-quality',
      '82',
      '-compression_level',
      '5',
      outputPath,
    ],
    { encoding: 'utf8' },
  )

  if (result.status !== 0) {
    throw new Error(`转换失败：${sourceFile}\n${result.stderr || result.stdout}`)
  }

  manifest.push(outputName)
  outputBytes += statSync(outputPath).size
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(
  `Q 版素材同步完成：${sourceFiles.length} 张源图，` +
    `${manifest.length} 张静态 WebP，共 ${(outputBytes / 1024 / 1024).toFixed(2)} MB`,
)
