import { defineConfig } from 'vitepress'
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// sidebar.mjs 由 scripts/sync-notes.mjs 生成；首次 clone 时可能还不存在
let notesSidebar: any[] = []
try {
  ;({ notesSidebar } = await import('./sidebar.mjs'))
} catch {
  /* 没跑过 sync 时留空，构建前 npm run build 会自动生成 */
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const NOTES_DIR = path.resolve(ROOT, '../笔记')

/** dev 模式下监听 笔记/，改动后重新生成页面 */
const notesWatcher = {
  name: 'notes-watcher',
  configureServer() {
    let timer: NodeJS.Timeout | null = null
    try {
      watch(NOTES_DIR, { recursive: true }, (_event, file) => {
        if (file && !String(file).toLowerCase().endsWith('.md')) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          spawn(process.execPath, [path.join(ROOT, 'scripts/sync-notes.mjs'), '--no-clean'], {
            stdio: 'inherit',
          })
        }, 200)
      })
    } catch (err) {
      console.warn('[notes] 监听 笔记/ 失败：', err)
    }
  },
}

/**
 * 中文检索：MiniSearch 默认按空格切词，中文会被切成一个整句。
 * 这里同时建「单字 + 相邻双字」索引，查询也走同一个分词器。
 */
function tokenizeCJK(text: string): string[] {
  const tokens: string[] = []
  const runs = text.match(/\p{Script=Han}+|[A-Za-z0-9_]+/gu) ?? []
  for (const run of runs) {
    if (/^\p{Script=Han}+$/u.test(run)) {
      const chars = Array.from(run)
      for (let i = 0; i < chars.length; i++) {
        tokens.push(chars[i])
        if (i + 1 < chars.length) tokens.push(chars[i] + chars[i + 1])
      }
    } else {
      tokens.push(run.toLowerCase())
    }
  }
  return tokens
}

const SITE_TITLE = 'WaterBlueBlue 的笔记'
const SITE_DESC =
  '实时物理模拟、图形学与 Unity 工程实践的技术笔记：XPBD 约束推导、PBF 流体、数值方法与实现细节。'

export default defineConfig({
  // 部署到 GitHub Pages 的子路径时：SITE_BASE=/repo-name/ npm run build
  base: process.env.SITE_BASE || '/',
  lang: 'zh-CN',
  title: SITE_TITLE,
  titleTemplate: `:title · ${SITE_TITLE}`,
  description: SITE_DESC,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'WaterBlueBlue' }],
    ['meta', { name: 'theme-color', content: '#2f6df6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: SITE_TITLE }],
    ['meta', { property: 'og:description', content: SITE_DESC }],
  ],

  markdown: {
    math: true,
    lineNumbers: false,
    theme: { light: 'github-light', dark: 'github-dark' },
  },

  vite: {
    plugins: [notesWatcher],
  },

  themeConfig: {
    logo: '/avatar.png',
    siteTitle: SITE_TITLE,

    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/', activeMatch: '^/notes/' },
      { text: '关于', link: '/about.html' },
    ],

    sidebar: {
      '/notes/': notesSidebar,
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    externalLinkIcon: true,

    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize: tokenizeCJK,
          },
          searchOptions: {
            boost: { title: 5, titles: 2 },
            fuzzy: 0.2,
            prefix: true,
          },
        },
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索笔记' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除',
            backButtonTitle: '返回',
            noResultsText: '没有找到相关内容',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '回车',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '上',
              navigateDownKeyAriaLabel: '下',
              closeText: '关闭',
              closeKeyAriaLabel: 'Esc',
            },
          },
        },
      },
    },

    footer: {
      message: '笔记持续更新中 · 公式由 MathJax 渲染',
      copyright: '© 2026 WaterBlueBlue',
    },

  },
})
