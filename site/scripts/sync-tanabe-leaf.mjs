/**
 * 把 Tanabe-Kaneko 落叶模拟文章同步为站点页面。
 *
 * 文章与素材位于仓库根目录，脚本只生成 docs 中的站点副本，
 * 并生成首页文章卡和笔记卡共用的封面文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(SITE, '..')
const DOCS = path.join(SITE, 'docs')
const CATEGORY = path.join('计算机图形学', '物理', '空气动力学仿真')
const TITLE = '基于 Tanabe-Kaneko 模型的落叶模拟'
const SOURCE_ROOT = path.join(REPO, '文章', CATEGORY)
const ARTICLE_SOURCE = path.join(SOURCE_ROOT, `${TITLE}.md`)
const MEDIA_SOURCE = path.join(SOURCE_ROOT, '素材', 'leaf-fall')
const NOTE_COVER_SOURCE = path.join(
  REPO,
  '笔记',
  CATEGORY,
  '素材',
  'Tanabe-Kaneko 模型',
  '图片',
  '纸片受力示意图.png',
)

const ARTICLE_ROUTE = '/articles/graphics/tanabe-kaneko-leaf-fall/'
const ARTICLE_DIR = path.join(
  DOCS,
  'articles',
  'graphics',
  'tanabe-kaneko-leaf-fall',
)
const PUBLIC_COVER_DIR = path.join(DOCS, 'public', 'leaf-fall')
const NOTE_ROUTE = '/notes/graphics-physics/tanabe-kaneko-model.html'
const WIND_ROUTE = '/articles/graphics/perlin-real-time-wind/'
const CLOTH_ROUTE = '/articles/graphics/xpbd-cloth/'
const RIG_ROUTE = '/articles/graphics/xpbd-rig/'
const ACN_ROUTE = '/articles/graphics/acn-estimation-albedo-to-normal/'
const AERODYNAMICS_ROUTE =
  '/notes/graphics-physics/aerodynamics-basics.html'

if (!fs.existsSync(ARTICLE_SOURCE)) {
  throw new Error(`Tanabe-Kaneko 文章不存在：${ARTICLE_SOURCE}`)
}
if (!fs.existsSync(MEDIA_SOURCE)) {
  throw new Error(`Tanabe-Kaneko 文章素材不存在：${MEDIA_SOURCE}`)
}
if (!fs.existsSync(NOTE_COVER_SOURCE)) {
  throw new Error(`Tanabe-Kaneko 笔记封面不存在：${NOTE_COVER_SOURCE}`)
}

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

function titleOf(markdown) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || TITLE
}

function rewriteLinks(markdown) {
  return markdown
    .replace(
      /\[Unity 实时柔性体与粒子流体系统\]\(<\.\.\/\.\.\/\.\.\/\.\.\/作品\/计算机图形学\/物理\/[^)]+\.md>\)/g,
      'Unity 实时柔性体与粒子流体系统（暂未上线）',
    )
    .replace(
      /\]\(基于%20Perlin%20噪声的实时风场模拟\.md\)/g,
      `](${WIND_ROUTE})`,
    )
    .replace(
      /\]\(<\.\.\/\.\.\/\.\.\/\.\.\/笔记\/计算机图形学\/物理\/空气动力学仿真\/Tanabe-Kaneko%20模型\.md(#[^>)]+)?>\)/g,
      (_, hash = '') => `](${NOTE_ROUTE}${hash})`,
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/笔记\/计算机图形学\/物理\/空气动力学仿真\/Tanabe-Kaneko%20模型\.md\)/g,
      `](${NOTE_ROUTE})`,
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/笔记\/物理\/流体力学\/空气动力学\/空气动力学的一些基础定理\.md\)/g,
      `](${AERODYNAMICS_ROUTE})`,
    )
    .replace(/src="素材\//g, 'src="./素材/')
}

const raw = fs.readFileSync(ARTICLE_SOURCE, 'utf8')
const title = titleOf(raw).replace(/"/g, '\\"')
const body = rewriteLinks(raw).trim()
const page = `---\ntitle: "${title}"\noutline: [2, 3]\naside: true\n---\n\n${body}\n`

fs.rmSync(ARTICLE_DIR, { recursive: true, force: true })
writeIfChanged(path.join(ARTICLE_DIR, 'index.md'), page)
fs.cpSync(
  MEDIA_SOURCE,
  path.join(ARTICLE_DIR, '素材', 'leaf-fall'),
  { recursive: true, force: true },
)

fs.rmSync(PUBLIC_COVER_DIR, { recursive: true, force: true })
fs.mkdirSync(PUBLIC_COVER_DIR, { recursive: true })
fs.copyFileSync(
  path.join(MEDIA_SOURCE, '图片', '叶片批量模拟.png'),
  path.join(PUBLIC_COVER_DIR, 'article-cover.png'),
)
fs.copyFileSync(NOTE_COVER_SOURCE, path.join(PUBLIC_COVER_DIR, 'note-cover.png'))

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
  <a class="collection-card" href="${ARTICLE_ROUTE}">
    <span>ARTICLE / GRAPHICS</span>
    <h2>${TITLE}</h2>
    <p>把准定常薄板模型扩展到三维 XPBD 柔性叶片，并加入近场骨骼气流。</p>
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
  <a class="collection-card" href="${ACN_ROUTE}">
    <span>ARTICLE / GRAPHICS</span>
    <h2>基于纹理—几何耦合的自然材质法线估计</h2>
    <p>从 Albedo 估计切线空间法线的方法、实验与边界。</p>
  </a>
</div>
`,
)

console.log('Tanabe-Kaneko 落叶模拟文章同步完成')
