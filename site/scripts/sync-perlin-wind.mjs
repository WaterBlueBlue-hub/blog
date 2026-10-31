/**
 * 把“基于 Perlin 噪声的实时风场模拟”同步为站点文章页。
 *
 * 本地存在个人网站内容工作区时优先读取原始 Markdown 与素材；
 * GitHub Actions 中则使用 site/content/perlin-real-time-wind 的快照。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(SITE, 'docs')
const WEBSITE_ROOT = path.resolve(SITE, '..')
const TITLE = '基于 Perlin 噪声的实时风场模拟'
const CATEGORY = path.join('计算机图形学', '物理', '空气动力学仿真')
const LOCAL_ARTICLE_SOURCE = path.join(
  WEBSITE_ROOT,
  '文章',
  CATEGORY,
  `${TITLE}.md`,
)
const LOCAL_MEDIA_SOURCE = path.join(
  WEBSITE_ROOT,
  '文章',
  CATEGORY,
  '素材',
  'wind-field',
  '图片',
)
const CONTENT_DIR = path.join(SITE, 'content', 'perlin-real-time-wind')
const ARTICLE_SOURCE = path.join(CONTENT_DIR, 'article.md')
const MEDIA_SNAPSHOT = path.join(CONTENT_DIR, '素材', 'wind-field', '图片')
const ARTICLE_ROUTE = '/articles/graphics/perlin-real-time-wind/'
const ARTICLE_DIR = path.join(
  DOCS,
  'articles',
  'graphics',
  'perlin-real-time-wind',
)
const ARTICLE_OUT = path.join(ARTICLE_DIR, 'index.md')
const USE_LOCAL_SOURCES = process.env.PERLIN_USE_SNAPSHOT !== '1'

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

function normalizeMarkdown(markdown) {
  return `${markdown.replace(/[ \t]+$/gm, '').trimEnd()}\n`
}

if (USE_LOCAL_SOURCES && fs.existsSync(LOCAL_ARTICLE_SOURCE)) {
  writeIfChanged(
    ARTICLE_SOURCE,
    normalizeMarkdown(fs.readFileSync(LOCAL_ARTICLE_SOURCE, 'utf8')),
  )
}

if (USE_LOCAL_SOURCES && fs.existsSync(LOCAL_MEDIA_SOURCE)) {
  fs.rmSync(path.dirname(MEDIA_SNAPSHOT), { recursive: true, force: true })
  fs.mkdirSync(path.dirname(MEDIA_SNAPSHOT), { recursive: true })
  fs.cpSync(LOCAL_MEDIA_SOURCE, MEDIA_SNAPSHOT, {
    recursive: true,
    force: true,
  })
}

if (!fs.existsSync(ARTICLE_SOURCE)) {
  throw new Error(`Perlin 风场文章快照不存在：${ARTICLE_SOURCE}`)
}
if (!fs.existsSync(MEDIA_SNAPSHOT)) {
  throw new Error(`Perlin 风场素材快照不存在：${MEDIA_SNAPSHOT}`)
}

function rewriteLinks(markdown) {
  return markdown
    .replace(
      /\]\(<\.\.\/\.\.\/\.\.\/\.\.\/笔记\/数字图像处理\/噪声\.md>\)/g,
      '](/notes/image-processing/noise.html)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/笔记\/数字图像处理\/噪声\.md#([^)]+)\)/g,
      '](/notes/image-processing/noise.html#$1)',
    )
    .replace(/src="素材\//g, 'src="./素材/')
}

function titleOf(markdown) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || TITLE
}

const raw = fs.readFileSync(ARTICLE_SOURCE, 'utf8')
const title = titleOf(raw).replace(/"/g, '\\"')
const body = rewriteLinks(raw).trim()
const page = `---\ntitle: "${title}"\noutline: [2, 3]\naside: true\n---\n\n${body}\n`

fs.rmSync(ARTICLE_DIR, { recursive: true, force: true })
writeIfChanged(ARTICLE_OUT, page)
fs.cpSync(
  MEDIA_SNAPSHOT,
  path.join(ARTICLE_DIR, '素材', 'wind-field', '图片'),
  { recursive: true, force: true },
)

writeIfChanged(
  path.join(DOCS, 'articles', 'index.md'),
  `---
title: 文章
---

# 文章

<div class="collection-grid">
  <a class="collection-card" href="${ARTICLE_ROUTE}">
    <span>ARTICLE / GRAPHICS</span>
    <h2>${TITLE}</h2>
    <p>用噪声构造连续风向，并以二次阻力驱动布料、骨骼代理与场景中的动态元素。</p>
  </a>
  <a class="collection-card" href="/articles/graphics/acn-estimation-albedo-to-normal/">
    <span>ARTICLE / GRAPHICS</span>
    <h2>基于纹理—几何耦合的自然材质法线估计</h2>
    <p>从 Albedo 估计切线空间法线的方法、实验与边界。</p>
  </a>
</div>
`,
)

console.log('Perlin 风场文章同步完成')
