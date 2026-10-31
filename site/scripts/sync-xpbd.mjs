/**
 * 把 XPBD 笔记配套的两篇文章同步为站点文章页。
 *
 * 源文件位于仓库根目录的 文章/计算机图形学/物理/XPBD/。
 * 脚本只生成 docs 中的站点副本，并复制每篇文章实际引用的素材目录。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(SITE, '..')
const DOCS = path.join(SITE, 'docs')
const SOURCE_DIR = path.join(
  REPO,
  '文章',
  '计算机图形学',
  '物理',
  'XPBD',
)
const NOTE_COVER_SOURCE = path.join(
  REPO,
  '笔记',
  '计算机图形学',
  '物理',
  'XPBD',
  '素材',
  '基于位置的扩展动力学（XPBD）',
  '约束流形.png',
)
const PUBLIC_COVER_DIR = path.join(DOCS, 'public', 'xpbd')

const CLOTH_ROUTE = '/articles/graphics/xpbd-cloth/'
const RIG_ROUTE = '/articles/graphics/xpbd-rig/'
const NOTE_ROUTE = '/notes/graphics-physics/xpbd.html'
const WIND_ROUTE = '/articles/graphics/perlin-real-time-wind/'

const ARTICLES = [
  {
    slug: 'xpbd-cloth',
    route: CLOTH_ROUTE,
    source: '基于 XPBD 的网格布料仿真.md',
    media: 'xpbd-cloth',
  },
  {
    slug: 'xpbd-rig',
    route: RIG_ROUTE,
    source: '基于 XPBD 的柔性骨骼仿真.md',
    media: 'xpbd-rig',
  },
]

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

function titleOf(markdown, fallback) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || fallback
}

function rewriteLinks(markdown) {
  return markdown
    .replace(
      /\[Unity 实时柔性体与粒子流体系统\]\(<\.\.\/\.\.\/\.\.\/\.\.\/项目\/计算机图形学\/物理\/[^)]+\.md>\)/g,
      'Unity 实时柔性体与粒子流体系统（暂未上线）',
    )
    .replace(
      /\]\(\.\/基于%20XPBD%20的网格布料仿真\.md\)/g,
      `](${CLOTH_ROUTE})`,
    )
    .replace(
      /\]\(\.\/基于%20XPBD%20的柔性骨骼仿真\.md\)/g,
      `](${RIG_ROUTE})`,
    )
    .replace(
      /\]\(\.\.\/空气动力学仿真\/基于%20Perlin%20噪声的实时风场模拟\.md\)/g,
      `](${WIND_ROUTE})`,
    )
    .replace(
      /\]\(<\.\.\/\.\.\/\.\.\/\.\.\/笔记\/计算机图形学\/物理\/XPBD\/基于位置的扩展动力学（XPBD）\.md>\)/g,
      `](${NOTE_ROUTE})`,
    )
    .replace(/(<img\b[^>]*\bsrc=")素材\//g, '$1./素材/')
}

function page(markdown, fallbackTitle) {
  const title = titleOf(markdown, fallbackTitle).replace(/"/g, '\\"')
  const body = rewriteLinks(markdown).trim()
  return `---\ntitle: "${title}"\noutline: [2, 3]\naside: true\n---\n\n${body}\n`
}

const coverFiles = [
  {
    from: path.join(SOURCE_DIR, '素材', 'xpbd-cloth', '图片', '柔度权重与窗帘结果.webp'),
    to: 'article-cloth.webp',
  },
  {
    from: path.join(SOURCE_DIR, '素材', 'xpbd-rig', '图片', '姿态维持对比_用户截图.webp'),
    to: 'article-rig.webp',
  },
  {
    from: NOTE_COVER_SOURCE,
    to: 'note-cover.png',
  },
]

fs.rmSync(PUBLIC_COVER_DIR, { recursive: true, force: true })
fs.mkdirSync(PUBLIC_COVER_DIR, { recursive: true })
for (const cover of coverFiles) {
  if (!fs.existsSync(cover.from)) {
    throw new Error(`XPBD 首页封面不存在：${cover.from}`)
  }
  fs.copyFileSync(cover.from, path.join(PUBLIC_COVER_DIR, cover.to))
}

for (const article of ARTICLES) {
  const sourceFile = path.join(SOURCE_DIR, article.source)
  const mediaSource = path.join(SOURCE_DIR, '素材', article.media)
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`XPBD 文章源文件不存在：${sourceFile}`)
  }
  if (!fs.existsSync(mediaSource)) {
    throw new Error(`XPBD 文章素材不存在：${mediaSource}`)
  }

  const outputDir = path.join(DOCS, 'articles', 'graphics', article.slug)
  fs.rmSync(outputDir, { recursive: true, force: true })
  const markdown = fs.readFileSync(sourceFile, 'utf8')
  writeIfChanged(
    path.join(outputDir, 'index.md'),
    page(markdown, path.basename(article.source, '.md')),
  )
  fs.cpSync(
    mediaSource,
    path.join(outputDir, '素材', article.media),
    { recursive: true, force: true },
  )
}

writeIfChanged(
  path.join(DOCS, 'articles', 'index.md'),
  `---
title: 文章
---

# 文章

<div class="collection-grid">
  <a class="collection-card" href="${WIND_ROUTE}">
    <span>ARTICLE / GRAPHICS</span>
    <h2>基于 Perlin 噪声的实时风场模拟</h2>
    <p>用噪声构造连续风向，并以二次阻力驱动布料、骨骼代理与场景中的动态元素。</p>
  </a>
  <a class="collection-card" href="${CLOTH_ROUTE}">
    <span>ARTICLE / XPBD</span>
    <h2>基于 XPBD 的网格布料仿真</h2>
    <p>从距离与二面角约束出发，构建各向同性与各向异性布料。</p>
  </a>
  <a class="collection-card" href="${RIG_ROUTE}">
    <span>ARTICLE / XPBD</span>
    <h2>基于 XPBD 的柔性骨骼仿真</h2>
    <p>以低分辨率骨骼链实现系链、弯曲、扭转与姿态维持约束。</p>
  </a>
  <a class="collection-card" href="/articles/graphics/acn-estimation-albedo-to-normal/">
    <span>ARTICLE / GRAPHICS</span>
    <h2>基于纹理—几何耦合的自然材质法线估计</h2>
    <p>从 Albedo 估计切线空间法线的方法、实验与边界。</p>
  </a>
</div>
`,
)

console.log('XPBD 同步完成：网格布料、柔性骨骼与笔记入口')
