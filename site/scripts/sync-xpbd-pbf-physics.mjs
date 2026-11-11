import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE = path.resolve(SITE, '..')
const DOCS = path.join(SITE, 'docs')
const PROJECT_ROUTE = '/projects/xpbd-pbf-physics/'
const PROJECT_PUBLIC = path.join(DOCS, 'public', 'xpbd-pbf-physics')
const PROJECT_PUBLIC_URL = '/xpbd-pbf-physics'
const SNAPSHOT_ROOT = path.join(SITE, 'content', 'xpbd-pbf-physics')
const PROJECT_SOURCE = path.join(
  WORKSPACE,
  '作品',
  '计算机图形学',
  '物理',
  'Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟.md',
)
const PROJECT_MEDIA = path.join(
  path.dirname(PROJECT_SOURCE),
  '素材',
  'Unity-XPBD-PBF',
)
const PROJECT_SNAPSHOT = path.join(SNAPSHOT_ROOT, 'project.md')
const PROJECT_OUT = path.join(DOCS, 'projects', 'xpbd-pbf-physics', 'index.md')

const ARTICLE_SPECS = [
  {
    slug: 'xpbd-cloth',
    route: '/articles/graphics/xpbd-cloth/',
    source: '文章/计算机图形学/物理/XPBD/基于 XPBD 的网格布料仿真.md',
    media: '文章/计算机图形学/物理/XPBD/素材/xpbd-cloth',
  },
  {
    slug: 'xpbd-rig',
    route: '/articles/graphics/xpbd-rig/',
    source: '文章/计算机图形学/物理/XPBD/基于 XPBD 的柔性骨骼仿真.md',
    media: '文章/计算机图形学/物理/XPBD/素材/xpbd-rig',
  },
  {
    slug: 'perlin-real-time-wind',
    route: '/articles/graphics/perlin-real-time-wind/',
    source: '文章/计算机图形学/物理/空气动力学仿真/基于 Perlin 噪声的实时风场模拟.md',
    media: '文章/计算机图形学/物理/空气动力学仿真/素材/wind-field',
  },
  {
    slug: 'tanabe-kaneko-leaf-fall',
    route: '/articles/graphics/tanabe-kaneko-leaf-fall/',
    source: '文章/计算机图形学/物理/空气动力学仿真/基于 Tanabe-Kaneko 模型的落叶模拟.md',
    media: '文章/计算机图形学/物理/空气动力学仿真/素材/leaf-fall',
  },
  {
    slug: 'xpbd-collision',
    route: '/articles/graphics/xpbd-collision/',
    source: '文章/计算机图形学/物理/碰撞/实时柔性体的碰撞检测与响应.md',
    media: '文章/计算机图形学/物理/碰撞/素材/xpbd-collision',
  },
  {
    slug: 'shallow-water-wave-field',
    route: '/articles/graphics/shallow-water-wave-field/',
    source: '文章/计算机图形学/物理/水动力学仿真/基于二维波动方程的浅水波场.md',
    media: '文章/计算机图形学/物理/水动力学仿真/素材/water-wave',
  },
  {
    slug: 'pbf-particle-fluid',
    route: '/articles/graphics/pbf-particle-fluid/',
    source: '文章/计算机图形学/物理/水动力学仿真/PBF 粒子流体模拟.md',
    media: '文章/计算机图形学/物理/水动力学仿真/素材/fluid-pbf',
  },
  {
    slug: 'water-heightfield-geometry',
    route: '/articles/graphics/water-heightfield-geometry/',
    source: '文章/计算机图形学/渲染/水体渲染/基于顶点高度位移贴图的浅水水面几何重建.md',
    media: '文章/计算机图形学/渲染/水体渲染/素材/fluid-heightfield',
  },
  {
    slug: 'water-shading',
    route: '/articles/graphics/water-shading/',
    source: '文章/计算机图形学/渲染/水体渲染/基础水体着色.md',
    media: '文章/计算机图形学/渲染/水体渲染/素材/base-water-shading',
  },
  {
    slug: 'water-caustics',
    route: '/articles/graphics/water-caustics/',
    source: '文章/计算机图形学/渲染/水体渲染/焦散.md',
    media: '文章/计算机图形学/渲染/水体渲染/素材/water-caustics',
  },
  {
    slug: 'lbs-skirt-clipping-tool',
    route: '/articles/graphics/lbs-skirt-clipping-tool/',
    source: '文章/计算机图形学/动画/蒙皮/基于 LBS 的裙摆防穿模工具.md',
    media: '文章/计算机图形学/动画/蒙皮/素材/character-skinning',
  },
]

const NOTE_COVERS = [
  {
    source: '笔记/计算机图形学/物理/水动力学仿真/拉格朗日方法/素材/光滑粒子流体动力学（SPH）/图片/SPH求解流程.png',
    output: 'note-sph.png',
  },
  {
    source: '笔记/计算机图形学/物理/水动力学仿真/拉格朗日方法/素材/光滑粒子流体动力学（SPH）/图片/SPH与PBF路径对比.png',
    output: 'note-pbf.png',
  },
  {
    source: '笔记/计算机图形学/物理/水动力学仿真/拉格朗日方法/素材/光滑粒子流体动力学（SPH）/图片/SPH求解流程.png',
    output: 'note-muller-sph.png',
  },
  {
    source: '笔记/计算机图形学/渲染/水体渲染/素材/水体着色概览/图片/水体着色分支.webp',
    output: 'note-water-shading.webp',
  },
]

const LINK_ROUTES = new Map([
  ['Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟.md', PROJECT_ROUTE],
  ...ARTICLE_SPECS.map((article) => [path.basename(article.source), article.route]),
  ['基于位置的扩展动力学（XPBD）.md', '/notes/graphics-physics/xpbd.html'],
  ['数值积分器.md', '/notes/graphics-physics/numerical-integrators.html'],
  ['数值迭代法.md', '/notes/graphics-physics/numerical-iteration-methods.html'],
  ['阻尼算法.md', '/notes/graphics-physics/damping.html'],
  ['Tanabe-Kaneko 模型.md', '/notes/graphics-physics/tanabe-kaneko-model.html'],
  ['基于位置的流体（PBF）.md', '/notes/graphics-physics/pbf.html'],
  ['光滑粒子流体动力学（SPH）.md', '/notes/graphics-physics/sph.html'],
  ['Müller SPH 流体模型（2003）.md', '/notes/graphics-physics/muller-sph-2003.html'],
  ['核函数.md', '/notes/graphics-physics/kernel-functions.html'],
  ['纳维-斯托克斯方程.md', '/notes/graphics-physics/navier-stokes.html'],
  ['空间数据结构.md', '/notes/graphics-physics/spatial-data-structures.html'],
  ['空气动力学的一些基础定理.md', '/notes/graphics-physics/aerodynamics-basics.html'],
  ['噪声.md', '/notes/image-processing/noise.html'],
  ['线性混合蒙皮（LBS）.md', '/notes/graphics-animation/lbs.html'],
  ['水体着色概览.md', '/notes/graphics-rendering/water-shading-overview.html'],
  ['辐射度量学.md', '/notes/graphics-rendering/radiometry.html'],
  ['图形渲染管线.md', '/notes/graphics-rendering/rendering-pipeline.html'],
  ['齐次坐标与 MVP 变换矩阵推导.md', '/notes/graphics-rendering/homogeneous-coordinates-mvp.html'],
  ['场论.md', '/notes/math-analysis/field-theory.html'],
])

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8',
  })
  if (result.status !== 0) throw new Error(result.stderr || 'ffmpeg 执行失败')
}

function newerThan(source, output) {
  return fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(source).mtimeMs
}

function mediaReferences(markdown) {
  const references = []
  for (const pattern of [
    /<(?:img|source)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /\bposter=["']([^"']+)["']/gi,
    /!\[[^\]]*\]\((?:<)?([^)>]+)(?:>)?\)/g,
  ]) {
    for (const match of markdown.matchAll(pattern)) references.push(match[1])
  }
  return references
}

function resolveMedia(sourceFile, reference) {
  if (/^(?:https?:|data:|\/)/i.test(reference)) return undefined
  const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0])
  const target = path.resolve(path.dirname(sourceFile), clean)
  return fs.existsSync(target) ? target : undefined
}

function relativeWorkspace(file) {
  return file.slice(WORKSPACE.length + 1).replaceAll('\\', '/')
}

function buildMedia(referencedFiles) {
  const hashByFile = new Map()
  const nameGroups = new Map()

  for (const file of referencedFiles) {
    const hash = createHash('sha1').update(fs.readFileSync(file)).digest('hex')
    hashByFile.set(file, hash)
    const basename = path.basename(file).toLowerCase()
    const group = nameGroups.get(basename) ?? []
    group.push({ file, hash })
    nameGroups.set(basename, group)
  }

  const outputByFile = new Map()
  for (const group of nameGroups.values()) {
    const hashes = new Set(group.map((item) => item.hash))
    for (const item of group) {
      const extension = path.extname(item.file)
      const stem = path.basename(item.file, extension)
      const name = hashes.size === 1 ? `${stem}${extension}` : `${stem}-${item.hash.slice(0, 8)}${extension}`
      outputByFile.set(item.file, {
        name,
        url: `${PROJECT_PUBLIC_URL}/media/${name}`,
      })
    }
  }

  fs.mkdirSync(path.join(PROJECT_PUBLIC, 'media'), { recursive: true })

  for (const [source, output] of outputByFile) {
    const destination = path.join(PROJECT_PUBLIC, 'media', output.name)
    if (newerThan(source, destination)) continue
    const extension = path.extname(source).toLowerCase()
    if (extension === '.gif') {
      runFfmpeg([
        '-i',
        source,
        '-filter_complex',
        '[0:v]fps=10,scale=480:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
        '-loop',
        '0',
        destination,
      ])
    } else if (extension === '.mp4') {
      runFfmpeg([
        '-i',
        source,
        '-vf',
        "scale='min(1280,iw)':-2:flags=lanczos",
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '24',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        destination,
      ])
    } else {
      fs.copyFileSync(source, destination)
    }
  }

  return outputByFile
}

function rewriteMarkdown(markdown, sourceFile, outputByFile) {
  let next = markdown.replace(
    /\]\((<[^>]+>|[^)]+)\)/g,
    (full, rawTarget) => {
      const target = rawTarget.startsWith('<') ? rawTarget.slice(1, -1) : rawTarget
      if (/^(?:https?:|mailto:|#|\/)/i.test(target)) return full
      const [pathPart, hash] = target.split('#')
      const filename = path.basename(decodeURIComponent(pathPart))
      const route = LINK_ROUTES.get(filename)
      return route ? `](${route}${hash ? `#${hash}` : ''})` : full
    },
  )

  next = next.replace(
    /\b(src|poster)=["']([^"']+)["']/gi,
    (full, attribute, reference) => {
      const source = resolveMedia(sourceFile, reference)
      const output = source ? outputByFile.get(source) : undefined
      return output ? `${attribute}="${output.url}"` : full
    },
  )

  next = next.replace(
    /!\[([^\]]*)\]\((?:<)?([^)>]+)(?:>)?\)/g,
    (full, alt, reference) => {
      const source = resolveMedia(sourceFile, reference)
      const output = source ? outputByFile.get(source) : undefined
      return output ? `![${alt}](${output.url})` : full
    },
  )

  return next.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"')
}

function inlineMathToCode(markdown) {
  return markdown.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, formula) => {
    return `\`${formula.trim()}\``
  })
}

function page(markdown, title, aside = false) {
  const body = markdown.trim()
  return `---\ntitle: "${title.replaceAll('"', '\\"')}"\noutline: [2, 3]${aside ? '\naside: true' : ''}\n---\n\n${body}\n`
}

function titleOf(markdown, fallback) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || fallback
}

const articleSources = ARTICLE_SPECS.map((article) => path.join(WORKSPACE, article.source))
const hasLocalSources =
  fs.existsSync(PROJECT_SOURCE) &&
  fs.existsSync(PROJECT_MEDIA) &&
  articleSources.every((file) => fs.existsSync(file))

if (hasLocalSources) {
  const markdownEntries = [
    { source: PROJECT_SOURCE, snapshot: PROJECT_SNAPSHOT, aside: false },
    ...ARTICLE_SPECS.map((article) => ({
      source: path.join(WORKSPACE, article.source),
      snapshot: path.join(SNAPSHOT_ROOT, 'articles', `${article.slug}.md`),
      aside: true,
    })),
  ]

  const referencedFiles = new Set()
  for (const entry of markdownEntries) {
    const raw = fs.readFileSync(entry.source, 'utf8')
    for (const reference of mediaReferences(raw)) {
      const media = resolveMedia(entry.source, reference)
      if (media) referencedFiles.add(media)
    }
  }
  for (const cover of NOTE_COVERS) {
    const source = path.join(WORKSPACE, cover.source)
    if (fs.existsSync(source)) referencedFiles.add(source)
  }

  const outputByFile = buildMedia([...referencedFiles])

  for (const entry of markdownEntries) {
    const raw = fs.readFileSync(entry.source, 'utf8')
    const title = titleOf(raw, path.basename(entry.source, '.md'))
    const rewritten = rewriteMarkdown(
      entry.source === PROJECT_SOURCE ? inlineMathToCode(raw) : raw,
      entry.source,
      outputByFile,
    )
    writeIfChanged(entry.snapshot, page(rewritten, title, entry.aside))
  }

  for (const cover of NOTE_COVERS) {
    const source = path.join(WORKSPACE, cover.source)
    const output = outputByFile.get(source)
    if (output) fs.copyFileSync(source, path.join(PROJECT_PUBLIC, 'media', cover.output))
  }
} else if (!fs.existsSync(PROJECT_SNAPSHOT) || !fs.existsSync(PROJECT_PUBLIC)) {
  throw new Error('XPBD / PBF 作品快照与本地源文件均不存在')
}

if (!fs.existsSync(PROJECT_SNAPSHOT)) throw new Error('缺少 XPBD / PBF 作品快照')
writeIfChanged(PROJECT_OUT, fs.readFileSync(PROJECT_SNAPSHOT, 'utf8'))

for (const article of ARTICLE_SPECS) {
  const snapshot = path.join(SNAPSHOT_ROOT, 'articles', `${article.slug}.md`)
  if (!fs.existsSync(snapshot)) {
    throw new Error(`缺少文章快照：${snapshot}`)
  }
  writeIfChanged(path.join(DOCS, 'articles', 'graphics', article.slug, 'index.md'), fs.readFileSync(snapshot, 'utf8'))
}

writeIfChanged(
  path.join(DOCS, 'projects', 'index.md'),
  `---\ntitle: 作品\n---\n\n# 作品\n\n<div class="collection-grid">\n  <a class="collection-card" href="${PROJECT_ROUTE}">\n    <span>PROJECT / PHYSICS</span>\n    <h2>基于 XPBD 与 PBF 的实时物理模拟</h2>\n    <p>布料、柔性骨骼链、气动落叶与 PBF 流体组成的 Unity 实时物理系统。</p>\n  </a>\n  <a class="collection-card" href="/projects/hand-k-animation/">\n    <span>PROJECT / ANIMATION</span>\n    <h2>手 K 动画</h2>\n    <p>正侧视图逐组同步的手 K 动作展示。</p>\n  </a>\n  <a class="collection-card" href="/projects/acn-estimation/">\n    <span>PROJECT / IMAGE</span>\n    <h2>ACN-Estimation</h2>\n    <p>从自然纹理 Albedo 估计切线空间法线。</p>\n  </a>\n</div>\n`,
)

writeIfChanged(
  path.join(DOCS, 'articles', 'index.md'),
  `---\ntitle: 文章\n---\n\n# 文章\n\n<div class="collection-grid">\n${ARTICLE_SPECS.map((article) => {
    const markdown = fs.readFileSync(path.join(SNAPSHOT_ROOT, 'articles', `${article.slug}.md`), 'utf8')
    return `  <a class="collection-card" href="${article.route}">\n    <span>ARTICLE / XPBD + PBF</span>\n    <h2>${titleOf(markdown, article.slug)}</h2>\n  </a>`
  }).join('\n')}\n</div>\n`,
)

console.log(`XPBD / PBF 同步完成：作品页与 ${ARTICLE_SPECS.length} 篇文章`)
