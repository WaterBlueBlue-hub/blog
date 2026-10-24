<script setup lang="ts">
import { withBase } from 'vitepress'
import {
  cardEditorState,
  getCardOverride,
  openCardEditor,
} from '../composables/cardEditor'

type Note = {
  id: number
  title: string
  date: string
  topic: string
  excerpt: string
  tags: string[]
  image?: string
  link?: string
  placeholder?: boolean
  coverMode?: 'icon' | 'full'
}

const notes: Note[] = [
  {
    id: 1,
    title: 'LaTeX 数学公式速查',
    date: '2026-10-22',
    topic: '写作工具',
    excerpt: '整理 KaTeX 与 MathJax 通用的行内公式、独立公式、多行对齐、矩阵和常见错误。',
    tags: ['LaTeX', 'KaTeX', 'MathJax'],
    image: '/notes/latex-cover.webp',
    link: '/notes/writing-tools/latex-math.html',
    coverMode: 'icon',
  },
  {
    id: 101,
    title: '噪声',
    date: '2026-10-24',
    topic: '数字图像处理',
    excerpt: '从高斯与椒盐噪声，到 Perlin 和 Worley 的程序化生成与参数对比。',
    tags: ['Perlin', 'Worley', '噪声模型'],
    image: '/note-covers/noise.png',
    link: '/notes/image-processing/noise.html',
    coverMode: 'full',
  },
  {
    id: 102,
    title: '滤波',
    date: '2026-10-24',
    topic: '数字图像处理',
    excerpt: '均值、高斯、双边、中值与形态学滤波的公式、适用范围和效果对照。',
    tags: ['高斯滤波', '双边滤波', '形态学'],
    image: '/note-covers/filtering.png',
    link: '/notes/image-processing/filtering.html',
    coverMode: 'full',
  },
  {
    id: 103,
    title: '滤波算子',
    date: '2026-10-24',
    topic: '数字图像处理',
    excerpt: 'Roberts、Sobel、Scharr、Laplacian、LoG 与 Canny 的卷积核和响应对比。',
    tags: ['Sobel', 'LoG', 'Canny'],
    image: '/note-covers/operators.png',
    link: '/notes/image-processing/filtering-operators.html',
    coverMode: 'full',
  },
]

const publishedCount = notes.filter((note) => !note.placeholder).length

function valueFor(note: Note, field: 'title' | 'date' | 'topic' | 'excerpt' | 'image') {
  return getCardOverride('note', note.id)?.[field] ?? note[field] ?? ''
}

function tagsFor(note: Note) {
  return getCardOverride('note', note.id)?.tags ?? note.tags
}

function imageFor(note: Note) {
  const image = valueFor(note, 'image')
  if (!image) return ''
  return /^(data:|https?:)/.test(image) ? image : withBase(image)
}

function handleCardClick(note: Note, event: MouseEvent) {
  if (!cardEditorState.active) return
  event.preventDefault()
  openCardEditor({
    kind: 'note',
    id: note.id,
    title: valueFor(note, 'title'),
    date: valueFor(note, 'date'),
    topic: valueFor(note, 'topic'),
    excerpt: valueFor(note, 'excerpt'),
    tags: tagsFor(note),
    image: valueFor(note, 'image') || undefined,
  })
}
</script>

<template>
  <section class="note-feed" aria-labelledby="note-feed-title">
    <header class="note-feed__head">
      <div>
        <span class="note-feed__eyebrow">NOTES / QUICK REFERENCE</span>
        <h2 id="note-feed-title">笔记</h2>
      </div>
      <span class="note-feed__total"><b>{{ publishedCount }}</b> / {{ notes.length }}</span>
    </header>

    <div :key="cardEditorState.revision" class="note-feed__grid">
      <component
        :is="note.link && !cardEditorState.active ? 'a' : 'article'"
        v-for="note in notes"
        :key="note.id"
        class="note-card"
        :class="{
          'note-card--link': note.link && !cardEditorState.active,
          'note-card--placeholder': note.placeholder,
          'note-card--editing': cardEditorState.active,
        }"
        :href="note.link && !cardEditorState.active ? withBase(note.link) : undefined"
        @click="handleCardClick(note, $event)"
      >
        <div
          class="note-card__cover"
          :class="{
            'has-custom-cover':
              Boolean(getCardOverride('note', note.id)?.image) || note.coverMode === 'full',
          }"
        >
          <img v-if="imageFor(note)" :src="imageFor(note)" alt="" loading="lazy" />
          <span v-if="cardEditorState.active" class="note-card__edit">点击编辑</span>
          <span v-if="note.placeholder" class="note-card__serial" aria-hidden="true">
            {{ String(note.id).padStart(2, '0') }}
          </span>
        </div>

        <div class="note-card__body">
          <h3>{{ valueFor(note, 'title') }}</h3>
          <div class="note-card__meta">
            <span>{{ valueFor(note, 'date') }}</span>
            <i aria-hidden="true"></i>
            <span>{{ valueFor(note, 'topic') }}</span>
          </div>
          <p>{{ valueFor(note, 'excerpt') }}</p>
          <div class="note-card__tags" aria-label="笔记标签">
            <span v-for="tag in tagsFor(note)" :key="tag">#{{ tag }}</span>
          </div>
        </div>
      </component>
    </div>
  </section>
</template>

<style scoped>
.note-feed {
  margin: 52px 0 22px;
}

.note-feed__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.note-feed__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 1.3px;
}

.note-feed__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 30px;
  line-height: 1.25;
}

.note-feed__total {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.note-feed__total b {
  color: var(--vp-c-brand-1);
  font-size: 15px;
}

.note-feed__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.note-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow:
    0 18px 44px -36px rgba(71, 43, 62, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  color: inherit;
  text-decoration: none;
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  backdrop-filter: blur(14px) saturate(1.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.note-card--link:hover {
  border-color: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 24px 54px -38px rgba(67, 42, 61, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  transform: translateY(-3px);
}

.note-card--editing {
  cursor: pointer;
}

.note-card--editing:hover {
  border-color: rgba(47, 109, 246, 0.46);
  box-shadow:
    0 0 0 3px rgba(47, 109, 246, 0.08),
    0 24px 54px -38px rgba(67, 42, 61, 0.62);
}

.note-card__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  margin: 9px 9px 0;
  overflow: hidden;
  border-radius: 11px;
  background:
    radial-gradient(circle at 50% 48%, rgba(112, 106, 122, 0.24), transparent 34%),
    linear-gradient(135deg, #292832, #8e858c 52%, #25242b);
}

.note-card__cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.42;
}

.note-card__cover::after {
  content: '';
  position: absolute;
  right: -12%;
  bottom: -42%;
  width: 82%;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  box-shadow:
    0 0 0 18px rgba(255, 255, 255, 0.025),
    0 0 0 42px rgba(255, 255, 255, 0.018);
}

.note-card__cover img {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  width: 58%;
  max-width: 164px;
  height: auto;
  filter: drop-shadow(0 16px 18px rgba(19, 17, 23, 0.42));
  transform: translate(-50%, -50%);
  transition: transform 0.32s ease;
}

.note-card--link:hover .note-card__cover img {
  transform: translate(-50%, -52%) scale(1.035);
}

.note-card:first-child .note-card__cover img {
  width: 78%;
  max-width: 210px;
  border-radius: 50%;
}

.note-card .note-card__cover.has-custom-cover img {
  top: 0;
  left: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  border-radius: 0;
  object-fit: cover;
  transform: none;
}

.note-card--link:hover .note-card__cover.has-custom-cover img {
  transform: scale(1.025);
}

.note-card__edit {
  position: absolute;
  z-index: 3;
  right: 9px;
  top: 9px;
  border-radius: 999px;
  padding: 3px 7px;
  background: rgba(34, 35, 47, 0.72);
  color: rgba(255, 255, 255, 0.86);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  letter-spacing: 0.4px;
}

.note-card__serial {
  position: absolute;
  z-index: 2;
  right: 12px;
  bottom: 4px;
  color: rgba(255, 255, 255, 0.12);
  font-family: var(--vp-font-family-mono);
  font-size: 58px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -5px;
}

.note-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 17px 18px;
}

.note-card__body h3 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 18px;
  line-height: 1.48;
  letter-spacing: -0.2px;
}

.note-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  color: var(--vp-c-text-3);
  font-size: 11px;
}

.note-card__meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}

.note-card__body p {
  margin: 12px 0 15px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.75;
}

.note-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.note-card__tags span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(116, 105, 120, 0.075);
  color: var(--vp-c-text-3);
  font-size: 10px;
}

.note-card--placeholder:nth-child(3) .note-card__cover {
  background:
    radial-gradient(circle at 75% 23%, rgba(137, 174, 207, 0.3), transparent 30%),
    linear-gradient(145deg, #303845, #8794a0 55%, #2d3340);
}

.note-card--placeholder:nth-child(4) .note-card__cover {
  background:
    radial-gradient(circle at 22% 78%, rgba(183, 147, 190, 0.28), transparent 32%),
    linear-gradient(145deg, #443742, #9b838e 55%, #3b3038);
}

.note-card--placeholder:nth-child(5) .note-card__cover {
  background:
    radial-gradient(circle at 70% 72%, rgba(144, 181, 156, 0.28), transparent 34%),
    linear-gradient(145deg, #303c36, #7f9487 55%, #29322e);
}

.note-card--placeholder:nth-child(6) .note-card__cover {
  background:
    radial-gradient(circle at 28% 24%, rgba(198, 165, 130, 0.28), transparent 32%),
    linear-gradient(145deg, #433a32, #9b846f 55%, #362f2a);
}

.note-card--placeholder .note-card__body h3 {
  color: var(--vp-c-text-2);
}

.dark .note-card {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(23, 25, 37, 0.72);
  box-shadow: 0 18px 44px -36px rgba(0, 0, 0, 0.75);
}

.dark .note-card__tags span {
  background: rgba(255, 255, 255, 0.07);
}

@media (max-width: 1050px) {
  .note-feed__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .note-feed {
    margin-top: 42px;
  }

  .note-feed__grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .note-card,
  .note-card__cover img {
    transition: none;
  }
}
</style>
