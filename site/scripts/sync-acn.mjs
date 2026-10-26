/**
 * 把个人网站资源包中的 ACN-Estimation 项目同步为 VitePress 页面。
 * 源文件仍以 blog/acn-estimation 为准，这里只生成站点副本并修正链接。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(SITE, 'docs')
const WEBSITE_ROOT = path.resolve(SITE, '../../../个人网站')
const TITLE = 'ACN-Estimation：基于纹理—几何耦合的自然材质法线估计'
const CATEGORY = '数字图像处理'
const LOCAL_PROJECT_SOURCE = path.join(WEBSITE_ROOT, '项目', CATEGORY, `${TITLE}.md`)
const LOCAL_ARTICLE_SOURCE = path.join(WEBSITE_ROOT, '文章', CATEGORY, `${TITLE}.md`)
const PROJECT_MEDIA_SOURCE = path.join(
  WEBSITE_ROOT,
  '项目',
  CATEGORY,
  '素材',
  'ACN',
)
const ARTICLE_MEDIA_SOURCE = path.join(
  WEBSITE_ROOT,
  '文章',
  CATEGORY,
  '素材',
  'ACN',
)
const CONTENT_DIR = path.join(SITE, 'content', 'acn-estimation')
const PROJECT_SOURCE = path.join(CONTENT_DIR, 'project.md')
const ARTICLE_SOURCE = path.join(CONTENT_DIR, 'article.md')
const USE_LOCAL_SOURCES = process.env.ACN_USE_SNAPSHOT !== '1'

const ARTICLE_ROUTE = '/articles/graphics/acn-estimation-albedo-to-normal/'
const PROJECT_ROUTE = '/projects/acn-estimation/'
const PUBLIC_DIR = path.join(DOCS, 'public', 'acn-estimation')
const ARTICLE_OUT = path.join(
  DOCS,
  'articles',
  'graphics',
  'acn-estimation-albedo-to-normal',
  'index.md',
)
const PROJECT_OUT = path.join(DOCS, 'projects', 'acn-estimation', 'index.md')
const SITE_BASE = process.env.SITE_BASE || '/'

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

function normalizeMarkdown(markdown) {
  return `${markdown.replace(/[ \t]+$/gm, '').trimEnd()}\n`
}

if (
  USE_LOCAL_SOURCES &&
  fs.existsSync(LOCAL_PROJECT_SOURCE) &&
  fs.existsSync(LOCAL_ARTICLE_SOURCE)
) {
  writeIfChanged(
    PROJECT_SOURCE,
    normalizeMarkdown(fs.readFileSync(LOCAL_PROJECT_SOURCE, 'utf8')),
  )
  writeIfChanged(
    ARTICLE_SOURCE,
    normalizeMarkdown(fs.readFileSync(LOCAL_ARTICLE_SOURCE, 'utf8')),
  )
}

for (const file of [PROJECT_SOURCE, ARTICLE_SOURCE]) {
  if (!fs.existsSync(file)) throw new Error(`ACN 源文件不存在：${file}`)
}

function titleOf(markdown, fallback) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || fallback
}

function rewriteLinks(markdown) {
  return markdown
    .replaceAll(
      `](../文章/${TITLE}.md)`,
      `](${ARTICLE_ROUTE})`,
    )
    .replaceAll(
      `](../项目/${TITLE}.md)`,
      `](${PROJECT_ROUTE})`,
    )
    .replace(
      /\]\(\.\.\/\.\.\/文章\/数字图像处理\/[^)]+\.md\)/g,
      `](${ARTICLE_ROUTE})`,
    )
    .replace(
      /\]\(\.\.\/\.\.\/项目\/数字图像处理\/[^)]+\.md\)/g,
      `](${PROJECT_ROUTE})`,
    )
    .replace(
      /\]\((?:\.\.\/)+笔记\/数字图像处理\/噪声\.md\)/g,
      '](/notes/image-processing/noise.html)',
    )
    .replace(
      /\]\((?:\.\.\/)+笔记\/数字图像处理\/滤波\.md\)/g,
      '](/notes/image-processing/filtering.html)',
    )
    .replace(
      /\]\((?:\.\.\/)+笔记\/数字图像处理\/滤波算子\.md\)/g,
      '](/notes/image-processing/filtering-operators.html)',
    )
    .replace(
      /\]\((?:\.\.\/)*素材\/ACN\/图片\//g,
      '](/acn-estimation/images/',
    )
    .replace(
      /(src|poster)="(?:\.\.\/)*素材\/ACN\/图片\//g,
      '$1="/acn-estimation/images/',
    )
    .replace(
      /\]\((?:\.\.\/)*素材\/ACN\/视频\//g,
      '](/acn-estimation/video/',
    )
    .replace(
      /(src|poster)="(?:\.\.\/)*素材\/ACN\/视频\//g,
      '$1="/acn-estimation/video/',
    )
    .replace(
      /\]\(\.\.\/素材\/ACN-Estimation\/图片\//g,
      '](/acn-estimation/images/',
    )
    .replace(
      /(src|poster)="\.\.\/素材\/ACN-Estimation\/图片\//g,
      '$1="/acn-estimation/images/',
    )
    .replace(
      /\]\(\.\.\/素材\/ACN-Estimation\/视频\//g,
      '](/acn-estimation/video/',
    )
    .replace(
      /(src|poster)="\.\.\/素材\/ACN-Estimation\/视频\//g,
      '$1="/acn-estimation/video/',
    )
    .replace(/\]\(\.\/article\.md\)/g, `](${ARTICLE_ROUTE})`)
    .replace(/\]\(\.\.\/article\.md\)/g, `](${ARTICLE_ROUTE})`)
    .replace(/\]\(article\.md\)/g, `](${ARTICLE_ROUTE})`)
    .replace(/\]\(\.\/project\.md\)/g, `](${PROJECT_ROUTE})`)
    .replace(/\]\(\.\.\/project\.md\)/g, `](${PROJECT_ROUTE})`)
    .replace(/\]\(project\.md\)/g, `](${PROJECT_ROUTE})`)
    .replace(
      /\]\((?:\.\/)?notes\/([a-z0-9-]+)\.md\)/g,
      '](/notes/graphics/$1.html)',
    )
    .replace(
      /\]\(([a-z0-9-]+)\.md\)/g,
      '](/notes/graphics/$1.html)',
    )
    .replace(/\]\(images\//g, '](/acn-estimation/images/')
    .replace(
      /(src|poster)="(?:\.\/)?images\//g,
      '$1="/acn-estimation/images/',
    )
    .replace(/\]\(\.\/video\//g, '](/acn-estimation/video/')
    .replace(
      /(src|poster)="(?:\.\/)?video\//g,
      '$1="/acn-estimation/video/',
    )
    .replace(
      /(<track\b[^>]*\bsrc=")(\/[^"]*)"/g,
      (_, prefix, src) =>
        `${prefix}${SITE_BASE.replace(/\/$/, '')}${src}"`,
    )
}

function page(markdown, fallbackTitle) {
  const title = titleOf(markdown, fallbackTitle).replace(/"/g, '\\"')
  return `---\ntitle: "${title}"\noutline: [2, 3]\npageClass: acn-reading\naside: true\n---\n\n${rewriteLinks(markdown).trim()}\n`
}

const article = fs.readFileSync(ARTICLE_SOURCE, 'utf8')
const project = fs.readFileSync(PROJECT_SOURCE, 'utf8')

writeIfChanged(ARTICLE_OUT, page(article, 'ACN-Estimation 技术文章'))
writeIfChanged(PROJECT_OUT, page(project, 'ACN-Estimation 项目'))

writeIfChanged(
  path.join(DOCS, 'projects', 'index.md'),
  `---\ntitle: 项目\n---\n\n# 项目\n\n<div class="collection-grid">\n  <a class="collection-card" href="${PROJECT_ROUTE}">\n    <span>PROJECT / ACN</span>\n    <h2>ACN-Estimation</h2>\n    <p>基于纹理—几何耦合的自然材质法线估计。</p>\n  </a>\n</div>\n`,
)

writeIfChanged(
  path.join(DOCS, 'articles', 'index.md'),
  `---\ntitle: 文章\n---\n\n# 文章\n\n<div class="collection-grid">\n  <a class="collection-card" href="${ARTICLE_ROUTE}">\n    <span>ARTICLE / GRAPHICS</span>\n    <h2>基于纹理—几何耦合的自然材质法线估计</h2>\n    <p>从 Albedo 估计切线空间法线的方法、实验与边界。</p>\n  </a>\n</div>\n`,
)

if (
  USE_LOCAL_SOURCES &&
  fs.existsSync(PROJECT_MEDIA_SOURCE) &&
  fs.existsSync(ARTICLE_MEDIA_SOURCE)
) {
  fs.rmSync(PUBLIC_DIR, { recursive: true, force: true })
  fs.mkdirSync(PUBLIC_DIR, { recursive: true })
  for (const source of [ARTICLE_MEDIA_SOURCE, PROJECT_MEDIA_SOURCE]) {
    for (const [sourceDir, targetDir] of [
      ['图片', 'images'],
      ['视频', 'video'],
    ]) {
      const from = path.join(source, sourceDir)
      if (fs.existsSync(from)) {
        fs.cpSync(from, path.join(PUBLIC_DIR, targetDir), {
          recursive: true,
          force: true,
        })
      }
    }
  }
} else if (
  !fs.existsSync(path.join(PUBLIC_DIR, 'images')) ||
  !fs.existsSync(path.join(PUBLIC_DIR, 'video'))
) {
  throw new Error(`ACN 站点媒体不存在：${PUBLIC_DIR}`)
}

console.log('ACN 同步完成：项目页与文章页')
