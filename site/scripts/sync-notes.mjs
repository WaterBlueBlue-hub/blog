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
const NOTE_COVERS = [
  {
    from: path.join(
      SRC,
      '计算机图形学',
      '物理',
      '数值计算基础',
      '素材',
      '阻尼算法',
      '图片',
      '阻尼算法封面.png',
    ),
    to: path.join(DOCS, 'public', 'damping', 'note-cover.png'),
  },
]
const IMAGE_PROCESSING_ITEMS = [
  ['数字图像处理/噪声.md', 'noise'],
  ['数字图像处理/滤波.md', 'filtering'],
  ['数字图像处理/滤波算子.md', 'filtering-operators'],
]
const GRAPHICS_PHYSICS_ITEMS = [
  ['计算机图形学/物理/XPBD/基于位置的扩展动力学（XPBD）.md', 'xpbd'],
  ['计算机图形学/物理/数值计算基础/数值积分器.md', 'numerical-integrators'],
  ['计算机图形学/物理/数值计算基础/数值迭代法.md', 'numerical-iteration-methods'],
  ['计算机图形学/物理/数值计算基础/阻尼算法.md', 'damping'],
  ['计算机图形学/物理/水动力学仿真/拉格朗日方法/光滑粒子流体动力学（SPH）.md', 'sph'],
  ['计算机图形学/物理/水动力学仿真/拉格朗日方法/基于位置的流体（PBF）.md', 'pbf'],
  ['计算机图形学/物理/水动力学仿真/拉格朗日方法/Müller SPH 流体模型（2003）.md', 'muller-sph-2003'],
  ['物理/流体力学/水动力学/核函数.md', 'kernel-functions'],
  ['物理/流体力学/纳维-斯托克斯方程.md', 'navier-stokes'],
  ['计算机图形学/物理/空气动力学仿真/Tanabe-Kaneko 模型.md', 'tanabe-kaneko-model'],
  ['物理/流体力学/空气动力学/空气动力学的一些基础定理.md', 'aerodynamics-basics'],
  ['计算机基础/数据结构与算法/空间数据结构.md', 'spatial-data-structures'],
]
const GRAPHICS_RENDERING_ITEMS = [
  ['计算机图形学/渲染/水体渲染/水体着色概览.md', 'water-shading-overview'],
  ['计算机图形学/渲染/辐射度量学.md', 'radiometry'],
  ['计算机图形学/渲染/图形渲染管线.md', 'rendering-pipeline'],
  ['计算机图形学/渲染/齐次坐标与 MVP 变换矩阵推导.md', 'homogeneous-coordinates-mvp'],
]
const GRAPHICS_ANIMATION_ITEMS = [
  ['计算机图形学/动画/蒙皮/线性混合蒙皮（LBS）.md', 'lbs'],
]
const MATH_ANALYSIS_ITEMS = [
  ['数学/分析学/场论.md', 'field-theory'],
]

const WEBSITE_LINK_ROUTES = new Map([
  ['Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟.md', '/projects/xpbd-pbf-physics/'],
  ['基于 XPBD 的网格布料仿真.md', '/articles/graphics/xpbd-cloth/'],
  ['基于 XPBD 的柔性骨骼仿真.md', '/articles/graphics/xpbd-rig/'],
  ['基于 Perlin 噪声的实时风场模拟.md', '/articles/graphics/perlin-real-time-wind/'],
  ['基于 Tanabe-Kaneko 模型的落叶模拟.md', '/articles/graphics/tanabe-kaneko-leaf-fall/'],
  ['基于 LBS 的裙摆防穿模工具.md', '/articles/graphics/lbs-skirt-clipping-tool/'],
  ['实时柔性体的碰撞检测与响应.md', '/articles/graphics/xpbd-collision/'],
  ['基于二维波动方程的浅水波场.md', '/articles/graphics/shallow-water-wave-field/'],
  ['PBF 粒子流体模拟.md', '/articles/graphics/pbf-particle-fluid/'],
  ['基于顶点高度位移贴图的浅水水面几何重建.md', '/articles/graphics/water-heightfield-geometry/'],
  ['基础水体着色.md', '/articles/graphics/water-shading/'],
  ['焦散.md', '/articles/graphics/water-caustics/'],
  ['基于位置的扩展动力学（XPBD）.md', '/notes/graphics-physics/xpbd.html'],
  ['数值积分器.md', '/notes/graphics-physics/numerical-integrators.html'],
  ['数值迭代法.md', '/notes/graphics-physics/numerical-iteration-methods.html'],
  ['阻尼算法.md', '/notes/graphics-physics/damping.html'],
  ['光滑粒子流体动力学（SPH）.md', '/notes/graphics-physics/sph.html'],
  ['基于位置的流体（PBF）.md', '/notes/graphics-physics/pbf.html'],
  ['Müller SPH 流体模型（2003）.md', '/notes/graphics-physics/muller-sph-2003.html'],
  ['Tanabe-Kaneko 模型.md', '/notes/graphics-physics/tanabe-kaneko-model.html'],
  ['空气动力学的一些基础定理.md', '/notes/graphics-physics/aerodynamics-basics.html'],
  ['核函数.md', '/notes/graphics-physics/kernel-functions.html'],
  ['纳维-斯托克斯方程.md', '/notes/graphics-physics/navier-stokes.html'],
  ['空间数据结构.md', '/notes/graphics-physics/spatial-data-structures.html'],
  ['水体着色概览.md', '/notes/graphics-rendering/water-shading-overview.html'],
  ['辐射度量学.md', '/notes/graphics-rendering/radiometry.html'],
  ['图形渲染管线.md', '/notes/graphics-rendering/rendering-pipeline.html'],
  ['齐次坐标与 MVP 变换矩阵推导.md', '/notes/graphics-rendering/homogeneous-coordinates-mvp.html'],
  ['场论.md', '/notes/math-analysis/field-theory.html'],
  ['噪声.md', '/notes/image-processing/noise.html'],
  ['线性混合蒙皮（LBS）.md', '/notes/graphics-animation/lbs.html'],
])

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
  {
    slug: 'graphics-rendering',
    title: '计算机图形学 · 渲染',
    desc: '辐射度量、着色模型与实时渲染管线。',
    items: GRAPHICS_RENDERING_ITEMS,
  },
  {
    slug: 'graphics-geometry',
    title: '计算机图形学 · 几何',
    desc: '几何表示、曲线曲面与几何处理。',
    items: [],
  },
  {
    slug: 'graphics-animation',
    title: '计算机图形学 · 动画',
    desc: '角色蒙皮、动画控制与实时形变。',
    items: GRAPHICS_ANIMATION_ITEMS,
  },
  {
    slug: 'graphics-physics',
    title: '计算机图形学 · 物理',
    desc: '数值计算、XPBD 约束投影、空气动力学与实时物理仿真。',
    items: GRAPHICS_PHYSICS_ITEMS,
  },
  {
    slug: 'math-analysis',
    title: '数学 · 分析学',
    desc: '场、梯度、散度与旋度等连续数学工具。',
    items: MATH_ANALYSIS_ITEMS,
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

/** 同步首页笔记卡使用的自定义封面。 */
function syncNoteCovers() {
  for (const cover of NOTE_COVERS) {
    if (!fs.existsSync(cover.from)) {
      throw new Error(`笔记封面不存在：${cover.from}`)
    }
    copyIfChanged(cover.from, cover.to)
  }
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
      /\]\(\.\.\/\.\.\/作品\/数字图像处理\/ACN-Estimation：[^)]+\.md\)/g,
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
    .replace(
      /\[Unity 实时柔性体与粒子流体系统\]\(<\.\.\/\.\.\/\.\.\/\.\.\/作品\/计算机图形学\/物理\/[^)]+\.md>\)/g,
      '[Unity 实时柔性体与粒子流体系统](/projects/xpbd-pbf-physics/)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/文章\/计算机图形学\/物理\/XPBD\/基于%20XPBD%20的网格布料仿真\.md\)/g,
      '](/articles/graphics/xpbd-cloth/)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/文章\/计算机图形学\/物理\/XPBD\/基于%20XPBD%20的柔性骨骼仿真\.md\)/g,
      '](/articles/graphics/xpbd-rig/)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/文章\/计算机图形学\/物理\/空气动力学仿真\/基于%20Perlin%20噪声的实时风场模拟\.md\)/g,
      '](/articles/graphics/perlin-real-time-wind/)',
    )
    .replace(
      /\[基于 Tanabe-Kaneko 模型的落叶模拟\]\(\.\.\/\.\.\/\.\.\/\.\.\/文章\/计算机图形学\/物理\/空气动力学仿真\/基于%20Tanabe-Kaneko%20模型的落叶模拟\.md\)/g,
      '[基于 Tanabe-Kaneko 模型的落叶模拟](/articles/graphics/tanabe-kaneko-leaf-fall/)',
    )
    .replace(
      /\[基于 Tanabe-Kaneko 模型的落叶模拟\]\(<\.\.\/\.\.\/\.\.\/\.\.\/文章\/计算机图形学\/物理\/空气动力学仿真\/基于 Tanabe-Kaneko 模型的落叶模拟\.md>\)/g,
      '[基于 Tanabe-Kaneko 模型的落叶模拟](/articles/graphics/tanabe-kaneko-leaf-fall/)',
    )
    .replace(
      /\[Tanabe-Kaneko 模型\]\(\.\.\/\.\.\/\.\.\/计算机图形学\/物理\/空气动力学仿真\/Tanabe-Kaneko%20模型\.md\)/g,
      '[Tanabe-Kaneko 模型](/notes/graphics-physics/tanabe-kaneko-model.html)',
    )
    .replace(
      /\[Tanabe-Kaneko 模型\]\(<\.\.\/\.\.\/\.\.\/计算机图形学\/物理\/空气动力学仿真\/Tanabe-Kaneko 模型\.md>\)/g,
      '[Tanabe-Kaneko 模型](/notes/graphics-physics/tanabe-kaneko-model.html)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/物理\/流体力学\/空气动力学\/空气动力学的一些基础定理\.md\)/g,
      '](/notes/graphics-physics/aerodynamics-basics.html)',
    )
    .replace(
      /\]\(\.\.\/\.\.\/\.\.\/\.\.\/文章\/计算机图形学\/动画\/蒙皮\/基于%20LBS%20的裙摆防穿模工具\.md\)/g,
      '](/articles/graphics/lbs-skirt-clipping-tool/)',
    )
    .replace(
      /\]\(<\.\.\/\.\.\/物理\/XPBD\/基于位置的扩展动力学（XPBD）\.md>\)/g,
      '](/notes/graphics-physics/xpbd.html)',
    )
    .replace(
      /\[李群基础中的特殊正交群\]\([^)]+\)/g,
      '李群基础中的特殊正交群（暂未上线）',
    )
    .replace(
      /\[齐次坐标与 MVP 变换矩阵中的旋转\]\(<[^>]+>\)/g,
      '齐次坐标与 MVP 变换矩阵中的旋转（暂未上线）',
    )
    .replace(
      /\[基于位置的扩展动力学（XPBD）\]\(<\.\.\/XPBD\/基于位置的扩展动力学（XPBD）\.md>\)/g,
      '[基于位置的扩展动力学（XPBD）](/notes/graphics-physics/xpbd.html)',
    )
    .replace(
      /\]\(数值积分器\.md\)/g,
      '](/notes/graphics-physics/numerical-integrators.html)',
    )
    .replace(
      /\]\(数值迭代法\.md\)/g,
      '](/notes/graphics-physics/numerical-iteration-methods.html)',
    )
    .replace(/(<img\b[^>]*\bsrc=")素材\//g, '$1./素材/')
    .replace(/\]\(噪声\.md\)/g, '](/notes/image-processing/noise.html)')
    .replace(/\]\(滤波\.md\)/g, '](/notes/image-processing/filtering.html)')
    .replace(
      /\]\(滤波算子\.md\)/g,
      '](/notes/image-processing/filtering-operators.html)',
    )
    .replace(/\]\((<[^>]+>|[^)]+)\)/g, (full, rawTarget) => {
      const target = rawTarget.startsWith('<') ? rawTarget.slice(1, -1) : rawTarget
      if (/^(https?:|mailto:|#|\/)/i.test(target)) return full
      const [pathPart, hash] = target.split('#')
      const route = WEBSITE_LINK_ROUTES.get(path.basename(decodeURIComponent(pathPart)))
      return route ? `](${route}${hash ? `#${hash}` : ''})` : full
    })
}

syncImageProcessingSnapshot()
syncNoteCovers()

function getTitle(md, fallback) {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m)
  return m ? m[1].trim() : fallback
}

/** 内容没变就不写，避免 dev 模式下无谓的重载 */
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return
  fs.writeFileSync(file, content, 'utf8')
}

const SAFE_HTML_TAGS = new Set([
  'a',
  'audio',
  'blockquote',
  'br',
  'details',
  'div',
  'em',
  'figcaption',
  'figure',
  'img',
  'p',
  'picture',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'track',
  'video',
])

/** <T> / <float3> 这类泛型写法会被 Vue 当成组件标签，转成实体 */
function escapeAngles(text) {
  return text.replace(
    /<(\/?)([A-Za-z][A-Za-z0-9_.]*)([^<>]*)>/g,
    (tag, slash, name, rest) =>
      SAFE_HTML_TAGS.has(name.toLowerCase())
        ? tag
        : `&lt;${slash}${name}${rest}&gt;`,
  )
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
    const body = transform(rewriteWebsiteNoteLinks(raw))
    const front = `---\ntitle: "${title.replace(/"/g, '\\"')}"\n---\n\n`
    writeIfChanged(path.join(secDir, `${slug}.md`), front + body)

    // 复制同目录配图（以及 ../素材 之类的相对引用）
    const srcDir = path.dirname(abs)
    const imageReferences = [
      ...[...raw.matchAll(/!\[[^\]]*\]\((<[^>]+>|[^)]+)\)/g)].map((m) => m[1]),
      ...[...raw.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(
        (m) => m[1],
      ),
    ]
    for (const rawRef of imageReferences) {
      const ref = decodeURI(rawRef.replace(/^<|>$/g, ''))
      if (/^(https?:)?\/\//.test(ref) || ref.startsWith('/') || ref.startsWith('data:')) continue
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
