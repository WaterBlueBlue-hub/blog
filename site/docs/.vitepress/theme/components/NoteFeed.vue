<script setup lang="ts">
import { withBase } from 'vitepress'

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
    link: '/notes/math-mechanics/latex-math.html',
  },
  ...Array.from({ length: 5 }, (_, index): Note => ({
    id: index + 2,
    title: '预留笔记位',
    date: '待整理',
    topic: '笔记',
    excerpt: '这一位置暂未发布，后续会用于整理新的数学、图形或工程笔记。',
    tags: ['预留'],
    placeholder: true,
  })),
]
</script>

<template>
  <section class="note-feed" aria-labelledby="note-feed-title">
    <header class="note-feed__head">
      <div>
        <span class="note-feed__eyebrow">NOTES / QUICK REFERENCE</span>
        <h2 id="note-feed-title">笔记</h2>
      </div>
      <span class="note-feed__total"><b>1</b> / 6</span>
    </header>

    <div class="note-feed__grid">
      <component
        :is="note.link ? 'a' : 'article'"
        v-for="note in notes"
        :key="note.id"
        class="note-card"
        :class="{
          'note-card--link': note.link,
          'note-card--placeholder': note.placeholder,
        }"
        :href="note.link ? withBase(note.link) : undefined"
      >
        <div class="note-card__cover">
          <img v-if="note.image" :src="withBase(note.image)" alt="" loading="lazy" />
          <span class="note-card__code">N{{ String(note.id).padStart(2, '0') }}</span>
          <span v-if="note.placeholder" class="note-card__serial" aria-hidden="true">
            {{ String(note.id).padStart(2, '0') }}
          </span>
        </div>

        <div class="note-card__body">
          <h3>{{ note.title }}</h3>
          <div class="note-card__meta">
            <span>{{ note.date }}</span>
            <i aria-hidden="true"></i>
            <span>{{ note.topic }}</span>
          </div>
          <p>{{ note.excerpt }}</p>
          <div class="note-card__footer">
            <div class="note-card__tags" aria-label="笔记标签">
              <span v-for="tag in note.tags" :key="tag">#{{ tag }}</span>
            </div>
            <span v-if="note.link" class="note-card__arrow" aria-hidden="true">↗</span>
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

.note-card__code {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  letter-spacing: 1px;
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

.note-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.note-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.note-card__tags span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(116, 105, 120, 0.075);
  color: var(--vp-c-text-3);
  font-size: 10px;
}

.note-card__arrow {
  color: var(--vp-c-brand-1);
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.note-card--link:hover .note-card__arrow {
  transform: translate(2px, -2px);
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
  .note-card__cover img,
  .note-card__arrow {
    transition: none;
  }
}
</style>
