/**
 * 扫描 论文/ 里的 PDF，生成本地离线检索页 论文/文献库.html。
 * 注意：只生成本地文件，不上传站点（第三方 PDF 与中译本都不适合公开分发）。
 *
 * 命名约定：论文/<主题>/<短名>（<年份>）_<英文原版|中文机翻|中文译本>.pdf
 * 中文要点写在 papers.meta.json 里，按 "<短名>-<年份>" 索引。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO = path.resolve(SITE, '..')
const PAPERS = path.join(REPO, '论文')
const META = JSON.parse(fs.readFileSync(path.join(SITE, 'papers.meta.json'), 'utf8'))

const TOPIC_ORDER = [
  '解算器',
  '碰撞',
  '流体',
  '有限元',
  '蒙皮',
  '加速算法',
  '可微求解器',
  '叶片下落',
  '其它',
]
const VARIANT_LABEL = {
  英文原版: '英文',
  中文机翻: '机翻',
  中文译本: '中译',
}

const groups = new Map()
function collect(dir, topicHint) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    const st = fs.statSync(abs)
    if (st.isDirectory()) {
      if (name === '_work') continue
      collect(abs, topicHint ?? name)
      continue
    }
    if (!name.toLowerCase().endsWith('.pdf')) continue
    const m = name.match(/^(.+?)（(\d{4})）_(.+)\.pdf$/)
    if (!m) continue
    const [, short, year, variant] = m
    const key = `${short}-${year}`
    const rel = path.relative(PAPERS, abs).split(path.sep).join('/')
    if (!groups.has(key)) {
      groups.set(key, { key, short, year, topics: new Set(), variants: new Set(), files: [] })
    }
    const g = groups.get(key)
    if (topicHint && topicHint !== '对照版') g.topics.add(topicHint)
    g.variants.add(VARIANT_LABEL[variant] ?? variant)
    g.files.push(rel)
  }
}

if (fs.existsSync(PAPERS)) collect(PAPERS, null)

const entries = [...groups.values()].map((g) => ({
  ...g,
  topics: [...g.topics].sort((a, b) => TOPIC_ORDER.indexOf(a) - TOPIC_ORDER.indexOf(b)),
  variants: [...g.variants].sort(),
  meta: META[g.key] ?? {},
}))

// 全新 clone 里没有 论文/（第三方 PDF 不入库），直接跳过
if (!entries.length) {
  console.log('未找到 论文/ 目录：跳过本地文献库生成')
  process.exit(0)
}
const totalFiles = entries.reduce((n, e) => n + e.files.length, 0)

/* ---------------- 本地离线文献库 ---------------- */
const payload = entries
  .map((e) => ({
    short: e.short,
    year: e.year,
    en: e.meta.en ?? '',
    zh: e.meta.zh ?? '',
    topics: e.topics,
    files: e.files,
  }))
  .sort((a, b) => (a.topics[0] ?? '').localeCompare(b.topics[0] ?? '') || a.short.localeCompare(b.short))

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>文献库（本地）</title>
<style>
  :root { color-scheme: light dark; --bg:#fff; --fg:#1f2328; --muted:#6b7280; --line:#e5e7eb; --accent:#2f6df6; --soft:#f6f8fa; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0d1117; --fg:#e6edf3; --muted:#8b949e; --line:#21262d; --accent:#7aa6ff; --soft:#161b22; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 20px 80px; background:var(--bg); color:var(--fg);
         font: 15px/1.7 -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
  .wrap { max-width: 980px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 6px; }
  .sub { color: var(--muted); margin: 0 0 22px; font-size: 14px; }
  input { width: 100%; padding: 11px 14px; font-size: 15px; border-radius: 10px;
          border: 1px solid var(--line); background: var(--soft); color: var(--fg); outline: none; }
  input:focus { border-color: var(--accent); }
  .stat { color: var(--muted); font-size: 13px; margin: 10px 2px 18px; }
  .topic { margin: 26px 0 8px; font-size: 13px; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
  .item { padding: 14px 2px; border-top: 1px solid var(--line); display: flex; gap: 16px; align-items: flex-start; }
  .item:first-of-type { border-top: none; }
  .main { flex: 1; min-width: 0; }
  .t { font-weight: 600; }
  .en { color: var(--muted); font-size: 13px; }
  .zh { color: var(--fg); opacity: .85; font-size: 14px; margin-top: 4px; }
  .badges { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 6px; }
  .badge { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: var(--soft); border: 1px solid var(--line); color: var(--muted); }
  .badge.year { color: var(--accent); border-color: currentColor; }
  .files { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
  .files a { font-size: 13px; color: var(--accent); text-decoration: none; white-space: nowrap; }
  .files a:hover { text-decoration: underline; }
  .empty { color: var(--muted); padding: 40px 0; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <h1>文献库</h1>
  <p class="sub">本地离线索引 · 点右侧链接直接用系统阅读器打开 PDF（不会上传到任何地方）</p>
  <input id="q" type="search" placeholder="搜索短名 / 英文标题 / 主题 / 年份，例如 XPBD、流体、2016" autofocus>
  <div class="stat" id="stat"></div>
  <div id="list"></div>
</div>
<script>
const PAPERS = ${JSON.stringify(payload)};
const TOPIC_ORDER = ${JSON.stringify(TOPIC_ORDER)};
const list = document.getElementById('list');
const stat = document.getElementById('stat');

function render(q) {
  const kw = q.trim().toLowerCase();
  const hit = PAPERS.filter(p => !kw || [p.short, p.en, p.year, ...p.topics].join(' ').toLowerCase().includes(kw));
  const byTopic = new Map();
  for (const p of hit) {
    const t = p.topics[0] || '未分类';
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(p);
  }
  const order = [...byTopic.keys()].sort((a, b) => {
    const ia = TOPIC_ORDER.indexOf(a), ib = TOPIC_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  let html = '';
  for (const t of order) {
    html += '<div class="topic">' + t + '</div>';
    for (const p of byTopic.get(t)) {
      const links = p.files.map(f => {
        const label = f.split('_').pop().replace('.pdf', '');
        return '<a href="' + encodeURI(f) + '" target="_blank">' + label + ' ↗</a>';
      }).join('');
      html += '<div class="item"><div class="main">'
        + '<div class="t">' + p.short + '</div>'
        + (p.en ? '<div class="en">' + p.en + '</div>' : '')
        + (p.zh ? '<div class="zh">' + p.zh + '</div>' : '<div class="zh" style="opacity:.45">（要点待补）</div>')
        + '<div class="badges"><span class="badge year">' + p.year + '</span>'
        + p.topics.map(t => '<span class="badge">' + t + '</span>').join('')
        + '</div></div><div class="files">' + links + '</div></div>';
    }
  }
  list.innerHTML = html || '<div class="empty">没有匹配的文献</div>';
  stat.textContent = '共 ' + PAPERS.length + ' 篇 · 命中 ' + hit.length + ' 篇';
}
document.getElementById('q').addEventListener('input', e => render(e.target.value));
render('');
</script>
</body>
</html>
`

fs.writeFileSync(path.join(PAPERS, '文献库.html'), html, 'utf8')

console.log(`文献库：${entries.length} 篇 / ${totalFiles} 份 PDF`)
const missing = entries.filter((e) => !e.meta.zh)
if (missing.length) console.log('  待补要点：' + missing.map((e) => e.key).join(', '))
