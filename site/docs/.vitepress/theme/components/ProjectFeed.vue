<script setup lang="ts">
import { withBase } from 'vitepress'

type ProjectTile = {
  id: string
  date: string
  category: string
  title: string
  summary: string
  link?: string
  image?: string
  colors: [string, string, string]
  pattern: 'grid' | 'wave' | 'orbit' | 'mesh'
}

const tiles: ProjectTile[] = [
  {
    id: 'P01',
    date: '2026-10-22',
    category: '图形',
    title: 'ACN-Estimation',
    summary: '从自然纹理 Albedo 估计切线空间法线。',
    link: '/projects/acn-estimation/',
    image: '/acn-estimation/images/cover.webp',
    colors: ['#426fd1', '#97d6eb', '#172b55'],
    pattern: 'grid',
  },
  {
    id: 'P02',
    date: '待上线',
    category: '未分类',
    title: '预留项目位',
    summary: '项目内容待添加。',
    colors: ['#715ec9', '#d4bee7', '#2a2458'],
    pattern: 'mesh',
  },
  {
    id: 'P03',
    date: '待上线',
    category: '未分类',
    title: '预留项目位',
    summary: '项目内容待添加。',
    colors: ['#287f88', '#8bd1bd', '#173e48'],
    pattern: 'wave',
  },
  {
    id: 'P04',
    date: '待上线',
    category: '未分类',
    title: '预留项目位',
    summary: '项目内容待添加。',
    colors: ['#b36d8d', '#edb6c5', '#5c3045'],
    pattern: 'orbit',
  },
  {
    id: 'P05',
    date: '待上线',
    category: '未分类',
    title: '预留项目位',
    summary: '项目内容待添加。',
    colors: ['#8c6d4c', '#d8bd8c', '#433226'],
    pattern: 'grid',
  },
  {
    id: 'P06',
    date: '待上线',
    category: '未分类',
    title: '预留项目位',
    summary: '项目内容待添加。',
    colors: ['#54657e', '#aebbd0', '#263141'],
    pattern: 'mesh',
  },
]
</script>

<template>
  <section class="project-feed" aria-labelledby="project-feed-title">
    <header class="project-feed__head">
      <div>
        <span class="project-feed__eyebrow">PROJECTS / CASE STUDIES</span>
        <h2 id="project-feed-title">项目</h2>
      </div>
      <span class="project-feed__total">1 个项目 · 6 个入口</span>
    </header>

    <div class="project-feed__grid">
      <component
        :is="tile.link ? 'a' : 'article'"
        v-for="tile in tiles"
        :key="tile.id"
        class="project-tile"
        :class="{ 'is-placeholder': !tile.link }"
        :href="tile.link ? withBase(tile.link) : undefined"
      >
        <div
          class="project-tile__cover"
          :class="`is-${tile.pattern}`"
          :style="{
            '--cover-a': tile.colors[0],
            '--cover-b': tile.colors[1],
            '--cover-c': tile.colors[2],
          }"
        >
          <img v-if="tile.image" :src="withBase(tile.image)" alt="" />
        </div>
        <div class="project-tile__body">
          <h3>{{ tile.title }}</h3>
          <div class="project-tile__meta">
            <span>{{ tile.date }}</span>
            <i aria-hidden="true"></i>
            <span>{{ tile.category }}</span>
          </div>
          <p>{{ tile.summary }}</p>
        </div>
      </component>
    </div>
  </section>
</template>

<style scoped>
.project-feed {
  margin: 30px 0 8px;
}

.project-feed__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.project-feed__eyebrow {
  display: block;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 1.2px;
}

.project-feed__head h2 {
  margin: 4px 0 0;
  border: 0;
  padding: 0;
  font-size: 30px;
  line-height: 1.25;
}

.project-feed__total {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.project-feed__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.project-tile {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  text-decoration: none;
  box-shadow:
    0 18px 44px -36px rgba(71, 43, 62, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  backdrop-filter: blur(14px) saturate(1.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.project-tile:hover {
  border-color: rgba(255, 255, 255, 0.92);
  transform: translateY(-3px);
  box-shadow:
    0 24px 54px -38px rgba(67, 42, 61, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.project-tile.is-placeholder {
  cursor: default;
  opacity: 0.68;
}

.project-tile.is-placeholder:hover {
  border-color: rgba(255, 255, 255, 0.68);
  transform: none;
  box-shadow:
    0 18px 44px -36px rgba(71, 43, 62, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
}

.project-tile__cover {
  position: relative;
  aspect-ratio: 16 / 7;
  margin: 9px 9px 0;
  overflow: hidden;
  border-radius: 11px;
  background:
    radial-gradient(circle at 76% 22%, var(--cover-b), transparent 32%),
    linear-gradient(135deg, var(--cover-a), var(--cover-c));
}

.project-tile__cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.46;
}

.project-tile__body {
  padding: 14px 17px 17px;
}

.project-tile__body h3 {
  margin: 0;
  border: 0;
  padding: 0;
  font-size: 18px;
  line-height: 1.45;
}

.project-tile__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  color: var(--vp-c-text-3);
  font-size: 11px;
}

.project-tile__meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}

.project-tile__body p {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.7;
}

.dark .project-tile {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(23, 25, 37, 0.72);
}

@media (max-width: 1050px) {
  .project-feed__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }
}

@media (max-width: 680px) {
  .project-feed__grid {
    grid-template-columns: 1fr;
  }

  .project-feed__head h2 {
    font-size: 26px;
  }
}
</style>
