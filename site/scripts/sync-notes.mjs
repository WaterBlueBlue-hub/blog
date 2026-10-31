/**
 * 把仓库里的 笔记/ 同步成站点页面。
 *
 * 源目录只读：所有编辑都发生在 笔记/*.md，这个脚本只负责
 *   1. 复制 Markdown 与同目录配图到 docs/notes/<section>/<slug>.md
 *   2. 补 frontmatter（标题）、转义 <T> 这类会被 Vue 当成标签的文本
 *   3. 生成侧边栏、分节首页、全文搜索索引
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(SITE, '..')
const SRC = path.join(REPO, '笔记')
const WEBSITE_ROOT = path.resolve(SITE, '..')
const WEBSITE_NOTES_SRC = path.join(WEBSITE_ROOT, '笔记')
const WEBSITE_NOTES_SNAPSHOT = path.join(SITE, 'content', 'notes')
const DOCS = path.join(SITE, 'docs')
const OUT = path.join(DOCS, 'notes')
const IMAGE_PROCESSING_ITEMS = [
  ['数字图像处理/噪声.md', 'noise'],
  ['数字图像处理/滤波.md', 'filtering'],
  ['数字图像处理/滤波算子.md', 'filtering-operators'],
]

const SECTIONS = [
  {
    slug: 'writing-tools',
    title: '写作工具',
    desc: 'Markdown、LaTeX 与 MathJax 的常用写法。',
    items: [
      ['基础理论/LaTeX.md', 'latex-math'],
    ],
  },
  {
    slug: 'image-processing',
    title: '数字图像处理',
    desc: '噪声、空间域滤波与边缘算子：从图像处理基础到法线估计实践。',
    source: 'website',
    items: IMAGE_PROCESSING_ITEMS,
  },
]

const MIN_CHARS = 40

function copyIfChanged(from, to) {
  if (
    fs.existsSync(to) &&
    fs.readFileSync(from).equals(fs.readFileSync(to))
  ) {
    return
  }
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
}

/** 本地有个人网站内容工作区时，同步三篇图像处理笔记及其配图快照。 */
function syncImageProcessingSnapshot() {
  if (!fs.existsSync(WEBSITE_NOTES_SRC)) return

  for (const [rel] of IMAGE_PROCESSING_ITEMS) {
    const from = path.join(WEBSITE_NOTES_SRC, rel)
    if (!fs.existsSync(from)) continue
    const to = path.join(WEBSITE_NOTES_SNAPSHOT, rel)
    copyIfChanged(from, to)

    const raw = fs.readFileSync(from, 'utf8')
    const sourceDir = path.dirname(from)
    const destinationDir = path.dirname(to)
    for (const match of raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
      const ref = decodeURI(match[1])
      if (/^(https?:)?\/\//.test(ref)) continue
      const assetFrom = path.resolve(sourceDir, ref)
      const assetTo = path.resolve(destinationDir, ref)
      if (!fs.existsSync(assetFrom)) continue
      copyIfChanged(assetFrom, assetTo)
    }
  }
}

function rewriteWebsiteNoteLinks(markdown) {
  return markdown
    .replace(
      /\]\(\.\.\/\.\.\/项目\/数字图像处理\/ACN-Estimation：[^)]+\.md\)/g,
      '](/projects/acn-estimation/)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/文章\/数字图像处理\/ACN-Estimation：[^)]+\.md\)/g,
      '](/articles/graphics/acn-estimation-albedo-to-normal/)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/文章\/计算机图形学\/物理\/空气动力学仿真\/基于%20Perlin%20噪声的实时风场模拟\.md(#[^)]+)?\)/g,
      (_, hash = '') => `](/articles/graphics/perlin-real-time-wind/${hash})`,
    )
    .replace(/\]\(噪声\.md\)/g, '](/notes/image-processing/noise.html)')
    .replace(/\]\(滤波\.md\)/g, '](/notes/image-processing/filtering.html)')
    .replace(
      /\]\(滤波算子\.md\)/g,
      '](/notes/image-processing/filtering-operators.html)',
    )
}

syncImageProcessingSnapshot()

function getTitle(md, fallback) {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m)
  return m ? m[1].trim() : fallback
}

/** 内容没变就不写，避免 dev 模式下无谓的重载 */
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

/** <T> / <float3> 这类泛型写法会被 Vue 当成组件标签，转成实体 */
function escapeAngles(text) {
  return text.replace(/<(\/?)([A-Za-z][A-Za-z0-9_.]*)([^<>]*)>/g, '&lt;$1$2$3&gt;')
}

function transform(md) {
  const lines = md.split('\n')
  let inFence = false
  let inMath = false
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      if (/^\s*\$\$/.test(line)) {
        inMath = !inMath
        return line
      }
      if (inMath) return line
      // 行内代码与行内公式原样保留
      const parts = line.split(/(`[^`]*`|\$[^$\n]*\$)/g)
      return parts.map((p, i) => (i % 2 ? p : escapeAngles(p))).join('')
    })
    .join('\n')
}

/* ---------------- 生成 ---------------- */
// 只清理生成目录本身，防止路径写错时误删源码
if (!OUT.startsWith(DOCS + path.sep) || !OUT.endsWith(path.sep + 'notes')) {
  throw new Error(`拒绝清理非生成目录：${OUT}`)
}
// --no-clean：dev 模式下由监听器触发，避免文件短暂消失
if (!process.argv.includes('--no-clean')) {
  fs.rmSync(OUT, { recursive: true, force: true })
}
fs.mkdirSync(OUT, { recursive: true })

const sidebar = []
const sectionsOut = []
let total = 0
const warnings = []

for (const section of SECTIONS) {
  const secDir = path.join(OUT, section.slug)
  const sectionSource = section.source === 'website'
    ? WEBSITE_NOTES_SNAPSHOT
    : SRC
  fs.mkdirSync(secDir, { recursive: true })

  const entries = []
  for (const [rel, slug] of section.items) {
    const abs = path.join(sectionSource, rel)
    if (!fs.existsSync(abs)) {
      warnings.push(`缺少笔记：${rel}`)
      continue
    }
    const raw = fs.readFileSync(abs, 'utf8')
    if (raw.replace(/\s/g, '').length < MIN_CHARS) {
      warnings.push(`跳过空文件：${rel}`)
      continue
    }

    const title = getTitle(raw, path.basename(rel, '.md'))
    const body = transform(
      section.source === 'website'
        ? rewriteWebsiteNoteLinks(raw)
        : raw,
    )
    const front = `---\ntitle: "${title.replace(/"/g, '\\"')}"\n---\n\n`
    writeIfChanged(path.join(secDir, `${slug}.md`), front + body)

    // 复制同目录配图（以及 ../素材 之类的相对引用）
    const srcDir = path.dirname(abs)
    for (const m of raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
      const ref = decodeURI(m[1])
      if (/^(https?:)?\/\//.test(ref)) continue
      const from = path.resolve(srcDir, ref)
      const to = path.resolve(secDir, ref)
      if (!fs.existsSync(from)) {
        warnings.push(`图片缺失：${rel} -> ${ref}`)
        continue
      }
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.copyFileSync(from, to)
    }

    entries.push({ title, slug })
    total++
  }

  sidebar.push({
    text: section.title,
    collapsed: false,
    items: entries.map((e) => ({ text: e.title, link: `/notes/${section.slug}/${e.slug}.html` })),
  })
  sectionsOut.push({ ...section, count: entries.length })

  // 分节首页
  const list = entries
    .map((e) => `- [${e.title}](/notes/${section.slug}/${e.slug}.html)`)
    .join('\n')
  writeIfChanged(
    path.join(secDir, 'index.md'),
    `---\ntitle: ${section.title}\n---\n\n# ${section.title}\n\n${section.desc}\n\n${list}\n`,
  )
}

writeIfChanged(
  path.join(DOCS, '.vitepress', 'sidebar.mjs'),
  `// 由 scripts/sync-notes.mjs 生成，请勿手改\nexport const notesSidebar = ${JSON.stringify(sidebar, null, 2)}\n`,
)

// 笔记总览页
const cards = sectionsOut
  .map(
    (s) => `<a class="topic-card" href="/notes/${s.slug}/index.html">
  <span class="topic-card__count">${s.count} 篇</span>
  <h3>${s.title}</h3>
  <p>${s.desc}</p>
</a>`,
  )
  .join('\n')

writeIfChanged(
  path.join(OUT, 'index.md'),
    `---
title: 笔记
pageClass: notes-home
aside: false
---

# 笔记

目前共 **${total} 篇**，按主题分成 ${sectionsOut.length} 组。全部用 Markdown 维护，公式是 LaTeX，站点直接从这里生成。

<div class="topic-grid">
${cards}
</div>
`,
)

console.log(`同步完成：${total} 篇笔记，${sectionsOut.length} 个分组`)
for (const w of warnings) console.warn('  ! ' + w)
