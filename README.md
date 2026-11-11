# WaterBlueBlue 个人网站

本目录只维护个人网站及其内容源文件。独立项目仓库统一放在 `D:\作品集\作品文件`。

## 目录

```text
文章/                 技术文章源文件
笔记/                 已验收笔记
笔记（未验收）/       待整理笔记
作品/                 作品文章与原始素材
素材/网站素材/q版/    网站随机 Q 版素材源文件
site/                 VitePress 网站工程
.github/workflows/    GitHub Pages 部署
```

## 本地运行

```powershell
cd site
npm ci
npm run dev
```

生产构建：

```powershell
cd site
npm run build
```

`node_modules/`、`.cache/`、`dist/`、同步生成的页面与公开资源都可以随时重建，不属于源文件。
