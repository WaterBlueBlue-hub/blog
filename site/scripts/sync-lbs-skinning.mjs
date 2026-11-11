/**
 * 把 LBS 裙摆防穿模文章同步为站点文章页。
 *
 * 文章与素材位于仓库根目录，脚本负责生成页面、复制图片/GIF，
 * 并生成首页文章卡和笔记卡共用的封面文件。
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
  '动画',
  '蒙皮',
)
const TITLE = '基于 LBS 的裙摆防穿模工具'
const ARTICLE_SOURCE = path.join(SOURCE_DIR, `${TITLE}.md`)
const MEDIA_SOURCE = path.join(SOURCE_DIR, '素材', 'character-skinning')
const ARTICLE_COVER_SOURCE = path.join(
  MEDIA_SOURCE,
  '图片',
  '蒙皮奔跑序列.webp',
)
const NOTE_COVER_SOURCE = path.join(
  REPO,
  '笔记',
  '计算机图形学',
  '动画',
  '蒙皮',
  '素材',
  '线性混合蒙皮（LBS）',
  'GAMES105-07-糖纸效应.png',
)

const ARTICLE_ROUTE = '/articles/graphics/lbs-skirt-clipping-tool/'
const ARTICLE_DIR = path.join(
  DOCS,
  'articles',
  'graphics',
  'lbs-skirt-clipping-tool',
)
const PUBLIC_COVER_DIR = path.join(DOCS, 'public', 'character-skinning')
const NOTE_ROUTE = '/notes/graphics-animation/lbs.html'
const XPBD_RIG_ROUTE = '/articles/graphics/xpbd-rig/'
const XPBD_NOTE_ROUTE = '/notes/graphics-physics/xpbd.html'
const WIND_ROUTE = '/articles/graphics/perlin-real-time-wind/'
const TANABE_ROUTE = '/articles/graphics/tanabe-kaneko-leaf-fall/'
const CLOTH_ROUTE = '/articles/graphics/xpbd-cloth/'
const ACN_ROUTE = '/articles/graphics/acn-estimation-albedo-to-normal/'

for (const [label, file] of [
  ['LBS 文章', ARTICLE_SOURCE],
  ['LBS 文章素材', MEDIA_SOURCE],
  ['LBS 文章封面', ARTICLE_COVER_SOURCE],
  ['LBS 笔记封面', NOTE_COVER_SOURCE],
]) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label}不存在：${file}`)
  }
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
      '[Unity 实时柔性体与粒子流体系统](/projects/xpbd-pbf-physics/)',
    )
    .replace(
      /\]\(\.\.\/物理\/XPBD\/基于%20XPBD%20的柔性骨骼仿真\.md\)/g,
      `](${XPBD_RIG_ROUTE})`,
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/笔记\/计算机图形学\/动画\/蒙皮\/线性混合蒙皮（LBS）\.md\)/g,
      `](${NOTE_ROUTE})`,
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/笔记\/计算机图形学\/物理\/XPBD\/基于位置的扩展动力学（XPBD）\.md\)/g,
      `](${XPBD_NOTE_ROUTE})`,
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
  path.join(ARTICLE_DIR, '素材', 'character-skinning'),
  { recursive: true, force: true },
)

fs.rmSync(PUBLIC_COVER_DIR, { recursive: true, force: true })
fs.mkdirSync(PUBLIC_COVER_DIR, { recursive: true })
fs.copyFileSync(
  ARTICLE_COVER_SOURCE,
  path.join(PUBLIC_COVER_DIR, 'article-cover.webp'),
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
  <a class="collection-card" href="${TANABE_ROUTE}">
    <span>ARTICLE / GRAPHICS</span>
    <h2>基于 Tanabe-Kaneko 模型的落叶模拟</h2>
    <p>把准定常薄板模型扩展到三维 XPBD 柔性叶片，并加入近场骨骼气流。</p>
  </a>
  <a class="collection-card" href="${ARTICLE_ROUTE}">
    <span>ARTICLE / ANIMATION</span>
    <h2>${TITLE}</h2>
    <p>从结构化网格自动生成蒙皮骨骼链，并修正裙摆权重以抑制角色穿模。</p>
  </a>
  <a class="collection-card" href="${CLOTH_ROUTE}">
    <span>ARTICLE / XPBD</span>
    <h2>基于 XPBD 的网格布料仿真</h2>
    <p>从距离与二面角约束出发，构建各向同性与各向异性布料。</p>
  </a>
  <a class="collection-card" href="${XPBD_RIG_ROUTE}">
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

console.log('LBS 裙摆防穿模文章同步完成')
