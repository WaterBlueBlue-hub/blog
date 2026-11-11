<script setup lang="ts">
import { withBase } from 'vitepress'
import {
  cardEditorState,
  coverCropStyle,
  getCardOverride,
  openCardEditor,
  resolveCoverImage,
} from '../composables/cardEditor'

type ProjectTile = {
  id: string
  date: string
  category: string
  title: string
  summary: string
  link?: string
  image?: string
  tags: string[]
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
    tags: ['法线贴图', 'Sobel', '自然纹理'],
    colors: ['#426fd1', '#97d6eb', '#172b55'],
    pattern: 'grid',
  },
  {
    id: 'P02',
    date: '2026-11-11',
    category: '动画',
    title: '手 K 动画',
    summary: '以等长的正视图、侧视图展示待机、跑步与连击动作，并整理为 1080p 成片。',
    link: '/projects/hand-k-animation/',
    image: '/hand-k-animation/posters/cover.webp',
    tags: ['角色动画', '三视图', '1080p'],
    colors: ['#7b4737', '#d79270', '#12100e'],
    pattern: 'orbit',
  },
  {
    id: 'P03',
    date: '2026-11-11',
    category: '物理',
    title: '基于 XPBD 与 PBF 的实时物理模拟',
    summary: '以 XPBD 布料、柔性骨骼链与气动落叶，结合 PBF 流体和浅水波场构建实时物理系统。',
    link: '/projects/xpbd-pbf-physics/',
    image: '/xpbd-pbf-physics/media/片头封面.webp',
    tags: ['XPBD', 'PBF', '实时模拟'],
    colors: ['#287f88', '#8bd1bd', '#173e48'],
    pattern: 'wave',
  },
  {
    id: 'P04',
    date: '待上线',
    category: '未分类',
    title: '预留作品位',
    summary: '作品内容待添加。',
    tags: ['待上线'],
    colors: ['#b36d8d', '#edb6c5', '#5c3045'],
    pattern: 'orbit',
  },
  {
    id: 'P05',
    date: '待上线',
    category: '未分类',
    title: '预留作品位',
    summary: '作品内容待添加。',
    tags: ['待上线'],
    colors: ['#8c6d4c', '#d8bd8c', '#433226'],
    pattern: 'grid',
  },
  {
    id: 'P06',
    date: '待上线',
    category: '未分类',
    title: '预留作品位',
    summary: '作品内容待添加。',
    tags: ['待上线'],
    colors: ['#54657e', '#aebbd0', '#263141'],
    pattern: 'mesh',
  },
]

const workCount = tiles.filter((tile) => tile.link).length

function valueFor(
  tile: ProjectTile,
  field: 'title' | 'date' | 'category' | 'summary' | 'image',
) {
  const override = getCardOverride('project', tile.id)
  if (field === 'category') return override?.topic ?? tile.category
  return override?.[field] ?? tile[field] ?? ''
}

function imageFor(tile: ProjectTile) {
  const image = valueFor(tile, 'image')
  if (!image) return ''
  if (image.startsWith('idb://')) {
    return resolveCoverImage('project', tile.id, image)
  }
  return /^(data:|https?:)/.test(image) ? image : withBase(image)
}

function imageStyleFor(tile: ProjectTile) {
  return coverCropStyle(getCardOverride('project', tile.id)?.imageCrop)
}

function tagsFor(tile: ProjectTile) {
  return getCardOverride('project', tile.id)?.tags ?? tile.tags
}

function handleCardClick(tile: ProjectTile, event: MouseEvent) {
  if (!cardEditorState.active) return
  event.preventDefault()
  openCardEditor({
    kind: 'project',
    id: tile.id,
    title: valueFor(tile, 'title'),
    date: valueFor(tile, 'date'),
    topic: valueFor(tile, 'category'),
    excerpt: valueFor(tile, 'summary'),
    tags: tagsFor(tile),
    image: valueFor(tile, 'image') || undefined,
    imageCrop: getCardOverride('project', tile.id)?.imageCrop,
  })
}
</script>

<template>
  <section class="project-feed" aria-labelledby="project-feed-title">
    <header class="project-feed__head">
      <div>
        <span class="project-feed__eyebrow">WORKS / CASE STUDIES</span>
        <h2 id="project-feed-title">作品</h2>
      </div>
      <span class="project-feed__total">{{ workCount }} 个作品 · {{ tiles.length }} 个入口</span>
    </header>

    <div :key="cardEditorState.revision" class="project-feed__grid">
      <component
        :is="tile.link && !cardEditorState.active ? 'a' : 'article'"
        v-for="tile in tiles"
        :key="tile.id"
        class="project-tile"
        :class="{
          'is-placeholder': !tile.link,
          'project-tile--link': tile.link && !cardEditorState.active,
          'project-tile--editing': cardEditorState.active,
        }"
        :href="tile.link && !cardEditorState.active ? withBase(tile.link) : undefined"
        @click="handleCardClick(tile, $event)"
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
          <img
            v-if="imageFor(tile)"
            :src="imageFor(tile)"
            :style="imageStyleFor(tile)"
            alt=""
            loading="lazy"
          />
          <span v-if="cardEditorState.active" class="project-tile__edit">点击编辑</span>
        </div>
        <div class="project-tile__body">
          <h3>{{ valueFor(tile, 'title') }}</h3>
          <div class="project-tile__meta">
            <span>{{ valueFor(tile, 'date') }}</span>
            <i aria-hidden="true"></i>
            <span>{{ valueFor(tile, 'category') }}</span>
          </div>
          <p>{{ valueFor(tile, 'summary') }}</p>
          <div class="project-tile__tags" aria-label="作品标签">
            <span v-for="tag in tagsFor(tile)" :key="tag">#{{ tag }}</span>
          </div>
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

.project-tile--editing,
.project-tile--editing:hover {
  border-color: rgba(114, 196, 255, 0.72);
  cursor: pointer;
  transform: translateY(-3px);
  box-shadow:
    0 0 0 3px rgba(47, 109, 246, 0.12),
    0 24px 54px -38px rgba(67, 42, 61, 0.62);
}

.project-tile__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  margin: 9px 9px 0;
  overflow: hidden;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--cover-a), var(--cover-c));
}

.project-tile__cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 1;
}

.project-tile__edit {
  position: absolute;
  top: 8px;
  right: 8px;
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(25, 27, 38, 0.78);
  color: rgba(255, 255, 255, 0.9);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  letter-spacing: 0.4px;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.project-tile__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 17px 18px;
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
  margin: 12px 0 15px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.75;
}

.project-tile__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.project-tile__tags span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(116, 105, 120, 0.075);
  color: var(--vp-c-text-3);
  font-size: 10px;
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
