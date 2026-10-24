# 笔记站

一个静态的笔记站：VitePress + MathJax（构建时渲染成 SVG）+ 中文分词搜索。
内容直接取自仓库根目录的 `笔记/`，站点本身不保存笔记副本。

```bash
npm install
npm run dev      # http://localhost:5173 ，改 笔记/*.md 会自动同步
npm run build    # 输出到 docs/.vitepress/dist
npm run preview  # 本地预览构建结果
```

## 结构

```
site/
  scripts/sync-notes.mjs     把 笔记/ 同步成 docs/notes/**（并生成侧边栏）
  content/notes/             个人网站数字图像处理笔记的仓库快照
  docs/
    index.md                 首页（hero、常读的几篇）
    about.md                 关于 / 联系方式
    .vitepress/config.mts    站点配置：导航、搜索分词、Markdown
    .vitepress/theme/        品牌色与排版（custom.css）
    notes/                   生成物，不要手改（已被 .gitignore）
    public/favicon.svg
```

## 加一篇笔记

1. 在仓库根目录 `笔记/<主题>/xxx.md` 里写内容（Markdown + `$...$` / `$$...$$` 公式 + 同目录图片）。`数字图像处理/` 三篇笔记从 `D:\作品集\个人网站\笔记\数字图像处理` 同步到仓库快照后构建。
2. 在 `scripts/sync-notes.mjs` 的 `SECTIONS` 里登记一行：`['<主题>/xxx.md', '<slug>']`，
   slug 决定网址，例如 `xpbd` → `/notes/simulation/xpbd.html`。
3. `npm run dev`（或 `npm run build`）即可。

没登记的笔记不会上线，构建时会在控制台提示，不会被静默丢掉。
`面试/` 目录默认不收录（属于个人求职材料），要放进来就把它从 `EXCLUDE_DIRS` 里去掉。

## 部署

构建产物是纯静态文件（`docs/.vitepress/dist`，约 5 MB），任何静态托管都能用。

**Cloudflare Pages（推荐，国内访问相对稳）**

- 连接 Git 仓库时：根目录填 `site`，构建命令 `npm run build`，输出目录 `docs/.vitepress/dist`
- 或者本地 `npm run build` 后，把 dist 目录拖进 Pages 的 Direct Upload

**GitHub Pages**

- 项目页在子路径下（`https://<user>.github.io/<repo>/`），构建时要带 base：
  `SITE_BASE=/<repo>/ npm run build`
- 部署 `dist` 到 `gh-pages` 分支即可

绑定自定义域名后，可以在 `config.mts` 里补一个 `sitemap: { hostname: 'https://…' }`。

## 改外观

- 品牌色、字体、卡片样式：`docs/.vitepress/theme/custom.css`
- 首页文案与「常读的几篇」：`docs/index.md`
- 关于页：`docs/about.md`
