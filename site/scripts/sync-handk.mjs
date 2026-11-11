import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACE = path.resolve(SITE, '..')
const SOURCE_ROOT = path.join(WORKSPACE, '作品', '手 k 动画')
const SOURCE_MARKDOWN = path.join(SOURCE_ROOT, '手 K 动画.md')
const SOURCE_MEDIA = path.join(SOURCE_ROOT, '素材')
const SOURCE_GIFS = path.join(SOURCE_MEDIA, '动图')
const SOURCE_FILM = path.join(SOURCE_ROOT, '成片')
const SOURCE_STILLS = path.join(SOURCE_ROOT, '静帧')
const WEB_FILM = path.join(SOURCE_FILM, '网页版')
const WEB_GIFS = path.join(WEB_FILM, 'gifs')
const WEB_POSTERS = path.join(SOURCE_STILLS, '网页封面')
const SNAPSHOT = path.join(SITE, 'content', 'hand-k-animation', 'index.md')
const DOC_OUT = path.join(SITE, 'docs', 'projects', 'hand-k-animation', 'index.md')
const PUBLIC_DIR = path.join(SITE, 'docs', 'public', 'hand-k-animation')
const FILM_NAME = 'hand-k-animation-showcase.mp4'
const STORYBOARD_NAME = 'storyboard.webp'

const actions = [
  {
    key: 'blade-idle',
    front: '刃待机_正视图_黏土高清.mp4',
    side: '刃待机_侧视图_黏土高清.mp4',
    dual: '刃待机_双视图_黏土高清.mp4',
    frontGif: '待机正.gif',
    sideGif: '待机侧.gif',
  },
  {
    key: 'hu-tao-run',
    front: '胡桃跑步_正视图_黏土高清.mp4',
    side: '胡桃跑步_侧视图_黏土高清.mp4',
    dual: '胡桃跑步_双视图_黏土高清.mp4',
    frontGif: '跑步正.gif',
    sideGif: '跑步侧.gif',
  },
  {
    key: 'anby-strike',
    front: '安比1a_正视图_黏土高清.mp4',
    side: '安比1a_侧视图_黏土高清.mp4',
    dual: '安比1a_双视图_黏土高清.mp4',
    frontGif: '单击正.gif',
    sideGif: '单击侧.gif',
  },
  {
    key: 'anby-combo',
    front: '安比连击_正视图_黏土高清_跟随.mp4',
    side: '安比连击_侧视图_黏土高清_跟随.mp4',
    dual: '安比连击_双视图_黏土高清_跟随.mp4',
    frontGif: '安比连击正.gif',
    sideGif: '安比连击侧.gif',
  },
  {
    key: 'jiyan-combo',
    front: '忌炎连击_正视图_黏土高清.mp4',
    side: '忌炎连击_侧视图_黏土高清.mp4',
    dual: '忌炎连击_双视图_黏土高清.mp4',
    frontGif: '忌炎连击正.gif',
    sideGif: '忌炎连击侧.gif',
  },
]

function actionGifs(action) {
  return ['front', 'side', 'dual']
    .map((view) => ({ view, name: action[`${view}Gif`] }))
    .filter((item) => item.name)
}

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

function newerThan(source, output) {
  return fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(source).mtimeMs
}

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || 'ffmpeg 执行失败')
  }
}

function buildVideo(source, output, maxWidth = 1280) {
  if (newerThan(source, output)) return
  fs.mkdirSync(path.dirname(output), { recursive: true })
  runFfmpeg([
    '-i',
    source,
    '-vf',
    `scale='min(${maxWidth},iw)':-2:flags=lanczos`,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    output,
  ])
}

function buildPoster(source, output, seek = '00:00:01', maxWidth = 960) {
  if (newerThan(source, output)) return
  fs.mkdirSync(path.dirname(output), { recursive: true })
  runFfmpeg([
    '-ss',
    seek,
    '-i',
    source,
    '-frames:v',
    '1',
    '-vf',
    `scale='min(${maxWidth},iw)':-2:flags=lanczos`,
    '-c:v',
    'libwebp',
    '-quality',
    '84',
    output,
  ])
}

function buildGif(source, output, maxWidth = 480) {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  runFfmpeg([
    '-i',
    source,
    '-filter_complex',
    `[0:v]fps=12,scale=${maxWidth}:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
    '-loop',
    '0',
    output,
  ])
}

function rewriteForSite(markdown) {
  let next = markdown
    .replaceAll(
      '成片/网页版/hand-k-animation-showcase.mp4',
      '/hand-k-animation/film/hand-k-animation-showcase.mp4',
    )
    .replaceAll('成片/网页版/clips/', '/hand-k-animation/clips/')
    .replaceAll('静帧/网页封面/', '/hand-k-animation/posters/')
    .replaceAll('静帧/分镜总览.webp', '/hand-k-animation/storyboard.webp')

  for (const action of actions) {
    for (const { view, name } of actionGifs(action)) {
      next = next.replaceAll(
        `素材/动图/${name}`,
        `/hand-k-animation/gifs/${action.key}-${view}.gif?v=20261111-loop`,
      )
    }
  }

  return next
}

function referencedGifNames(markdown) {
  return new Set(
    [...markdown.matchAll(/素材\/动图\/([^"\s]+\.gif)/g)].map((match) => match[1]),
  )
}

function page(markdown, title) {
  return `---\ntitle: "${title}"\noutline: [2, 3]\npageClass: project-reading\n---\n\n${rewriteForSite(markdown).trim()}\n`
}

function buildLocalMedia(referencedGifs) {
  const finalSource = path.join(SOURCE_FILM, '手k动画_成片.mp4')
  const storyboardSource = path.join(SOURCE_STILLS, '分镜总览.png')
  if (!fs.existsSync(finalSource)) throw new Error(`缺少成片：${finalSource}`)
  if (!fs.existsSync(storyboardSource)) throw new Error(`缺少分镜总览：${storyboardSource}`)

  fs.mkdirSync(SOURCE_GIFS, { recursive: true })
  fs.mkdirSync(WEB_GIFS, { recursive: true })
  fs.mkdirSync(WEB_POSTERS, { recursive: true })

  buildVideo(finalSource, path.join(WEB_FILM, FILM_NAME))
  buildPoster(finalSource, path.join(WEB_POSTERS, 'cover.webp'), '00:00:50', 1280)

  const storyboardOutput = path.join(SOURCE_STILLS, STORYBOARD_NAME)
  if (!newerThan(storyboardSource, storyboardOutput)) {
    runFfmpeg([
      '-i',
      storyboardSource,
      '-frames:v',
      '1',
      '-vf',
      "scale='min(1600,iw)':-2:flags=lanczos",
      '-c:v',
      'libwebp',
      '-quality',
      '88',
      storyboardOutput,
    ])
  }

  for (const action of actions) {
    const posterOutput = path.join(WEB_POSTERS, `${action.key}.webp`)
    buildPoster(path.join(SOURCE_MEDIA, action.dual), posterOutput)

    for (const { view, name } of actionGifs(action)) {
      if (!referencedGifs.has(name)) continue

      const gif = path.join(SOURCE_GIFS, name)
      if (!fs.existsSync(gif)) throw new Error(`缺少动作 GIF：${gif}`)
      buildGif(gif, path.join(WEB_GIFS, `${action.key}-${view}.gif`))
    }
  }
}

function publishMedia(referencedGifs) {
  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true })
  fs.mkdirSync(path.join(PUBLIC_DIR, 'film'), { recursive: true })
  fs.cpSync(WEB_FILM, path.join(PUBLIC_DIR, 'film'), {
    recursive: true,
    filter: (source) => {
      if (source === WEB_GIFS || source.startsWith(`${WEB_GIFS}${path.sep}`)) return false
      return source === WEB_FILM || !source.endsWith('.mp4') || source.endsWith(FILM_NAME)
    },
  })
  fs.cpSync(WEB_POSTERS, path.join(PUBLIC_DIR, 'posters'), { recursive: true })
  fs.copyFileSync(path.join(SOURCE_STILLS, STORYBOARD_NAME), path.join(PUBLIC_DIR, STORYBOARD_NAME))

  const publicGifs = path.join(PUBLIC_DIR, 'gifs')
  fs.mkdirSync(publicGifs, { recursive: true })
  for (const action of actions) {
    for (const { view, name } of actionGifs(action)) {
      if (!referencedGifs.has(name)) continue
      fs.copyFileSync(
        path.join(WEB_GIFS, `${action.key}-${view}.gif`),
        path.join(publicGifs, `${action.key}-${view}.gif`),
      )
    }
  }
}

if (fs.existsSync(SOURCE_MARKDOWN)) {
  const markdown = fs.readFileSync(SOURCE_MARKDOWN, 'utf8')
  const referencedGifs = referencedGifNames(markdown)
  buildLocalMedia(referencedGifs)
  const title = markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || '手 K 动画'
  const snapshot = page(markdown, title)
  writeIfChanged(SNAPSHOT, snapshot)
  publishMedia(referencedGifs)
  console.log(`手 K 动画同步完成：成片、${referencedGifs.size} 段动作 GIF 与网页封面已生成`)
} else if (!fs.existsSync(SNAPSHOT)) {
  throw new Error(`手 K 动画源文件和站点快照均不存在：${SNAPSHOT}`)
} else {
  console.log('手 K 动画使用站点快照（本地原素材不存在）')
}

writeIfChanged(DOC_OUT, fs.readFileSync(SNAPSHOT, 'utf8'))
