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
const DOCS = path.join(SITE, 'docs')
const OUT = path.join(DOCS, 'notes')

/** 公开站点不收录的目录（面试问答属于个人求职材料，不适合公开） */
const EXCLUDE_DIRS = ['面试']

const SECTIONS = [
  {
    slug: 'math-mechanics',
    title: '数学与力学',
    desc: '线性代数、分析力学、连续介质力学——模拟器里每个公式的来源。',
    items: [
      ['基础理论/物理模拟中的线性代数.md', 'linear-algebra'],
      ['基础理论/分析力学.md', 'analytical-mechanics'],
      ['基础理论/连续介质力学.md', 'continuum-mechanics'],
      ['基础理论/场论.md', 'field-theory'],
      ['基础理论/滤波.md', 'filtering'],
    ],
  },
  {
    slug: 'numerics',
    title: '数值方法',
    desc: '积分器、迭代解法与伴随方法，决定模拟稳不稳、准不准。',
    items: [
      ['数值方法/数值积分器与迭代法.md', 'integrators'],
      ['数值方法/伴随方法.md', 'adjoint'],
    ],
  },
  {
    slug: 'simulation',
    title: '模拟算法',
    desc: 'XPBD 主体、阻尼、邻域搜索、涟漪与流体渲染的实现取舍。',
    items: [
      ['模拟算法/基于位置的扩展动力学（XPBD）.md', 'xpbd'],
      ['模拟算法/阻尼算法.md', 'damping'],
      ['模拟算法/邻域搜索.md', 'neighbor-search'],
      ['模拟算法/涟漪模拟.md', 'ripples'],
      ['模拟算法/流体渲染.md', 'fluid-rendering'],
      ['模拟算法/Tanabe-Kaneko 模型.md', 'tanabe-kaneko'],
    ],
  },
  {
    slug: 'constraints',
    title: '约束与碰撞',
    desc: '距离、二面角弯曲与相交测试：从推导到代码里的那一行。',
    items: [
      ['约束函数/距离约束.md', 'distance'],
      ['约束函数/弯曲约束.md', 'bending'],
      ['碰撞/相交测试.md', 'intersection'],
    ],
  },
  {
    slug: 'fluid',
    title: '流体',
    desc: 'SPH 核函数、涡量与 PBF 的概念梳理，流体解算器的数学准备。',
    items: [
      ['流体/概念.md', 'concepts'],
      ['流体/核函数.md', 'kernels'],
      ['流体/涡.md', 'vorticity'],
    ],
  },
  {
    slug: 'unity',
    title: 'Unity 引擎',
    desc: '脚本生命周期、渲染管线扩展点与常用 API 的笔记。',
    items: [
      ['Unity 引擎/生命周期.md', 'lifecycle'],
      ['Unity 引擎/脚本 API/Object/Texture.md', 'texture'],
      ['Unity 引擎/脚本 API/Object/ScriptableObject/ScriptableRendererFeature.md', 'renderer-feature'],
      ['Unity 引擎/脚本 API/Rendering/ScriptableRenderPass.md', 'render-pass'],
    ],
  },
  {
    slug: 'cs',
    title: '编程与系统',
    desc: 'C# 内存模型、Job System、操作系统与计算机组成：写出跑得快的代码。',
    items: [
      ['基础理论/job.md', 'job-system'],
      ['基础理论/面向对象编程.md', 'oop'],
      ['基础理论/操作系统.md', 'operating-systems'],
      ['基础理论/计算机组成.md', 'computer-organization'],
      ['计算机基础/C#.md', 'csharp'],
    ],
  },
]

const MIN_CHARS = 40

const mdFiles = []
for (const dir of fs.existsSync(SRC) ? fs.readdirSync(SRC) : []) {
  if (EXCLUDE_DIRS.includes(dir)) continue
  walk(path.join(SRC, dir), dir)
}

function walk(absDir, relDir) {
  for (const name of fs.readdirSync(absDir)) {
    const abs = path.join(absDir, name)
    const stat = fs.statSync(abs)
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.includes(name)) continue
      walk(abs, `${relDir}/${name}`)
    } else if (name.toLowerCase().endsWith('.md')) {
      mdFiles.push(`${relDir}/${name}`)
    }
  }
}

const known = new Set(SECTIONS.flatMap((s) => s.items.map((i) => i[0])))
const unmapped = mdFiles.filter((f) => !known.has(f))

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
  fs.mkdirSync(secDir, { recursive: true })

  const entries = []
  for (const [rel, slug] of section.items) {
    const abs = path.join(SRC, rel)
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
    const body = transform(raw)
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

/* 未登记的新笔记：放进页面末尾提示，避免默默丢掉 */
for (const rel of unmapped) {
  warnings.push(`未登记的笔记（未上线）：${rel}`)
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
