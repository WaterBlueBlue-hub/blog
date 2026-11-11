<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  cardEditorState,
  coverCropStyle,
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

const PAGE_SIZE = 6

const notes: Note[] = [
  {
    id: 110,
    title: '阻尼算法',
    date: '2026-11-05',
    topic: '计算机图形学 · 物理',
    excerpt: '对比帧级速度衰减、PBD 形变速度过滤与 XPBD 瑞利约束阻尼的耗散对象和实现方式。',
    tags: ['阻尼', 'PBD', 'XPBD'],
    image: '/damping/note-cover.png',
    link: '/notes/graphics-physics/damping.html',
    coverMode: 'full',
  },
  {
    id: 109,
    title: '线性混合蒙皮（LBS）',
    date: '2026-11-04',
    topic: '计算机图形学 · 动画',
    excerpt: '从绑定空间、权重混合与仿射不变性出发，分析糖纸效应及 LBS 的几何局限性。',
    tags: ['LBS', '蒙皮', '糖纸效应'],
    image: '/character-skinning/note-cover.png',
    link: '/notes/graphics-animation/lbs.html',
    coverMode: 'full',
  },
  {
    id: 108,
    title: 'Tanabe-Kaneko 模型',
    date: '2026-11-04',
    topic: '计算机图形学 · 物理',
    excerpt: '从薄板受力、各向异性阻尼与 Kutta-Joukowski 升力出发，推导纸片自由下落的运动方程。',
    tags: ['Tanabe-Kaneko', '薄板', '环量'],
    image: '/leaf-fall/note-cover.png',
    link: '/notes/graphics-physics/tanabe-kaneko-model.html',
    coverMode: 'full',
  },
  {
    id: 106,
    title: '数值积分器',
    date: '2026-11-04',
    topic: '计算机图形学 · 物理',
    excerpt: '对比显式、隐式与半隐式欧拉的能量行为，并从泰勒展开推导 Verlet 与稳定性条件。',
    tags: ['欧拉积分', 'Verlet', '稳定性'],
    link: '/notes/graphics-physics/numerical-integrators.html',
  },
  {
    id: 107,
    title: '数值迭代法',
    date: '2026-11-04',
    topic: '计算机图形学 · 物理',
    excerpt: '从雅可比与高斯-塞德尔矩阵迭代，延伸到 PBD 约束投影中的并行与串行更新。',
    tags: ['Jacobi', 'Gauss-Seidel', 'PBD'],
    link: '/notes/graphics-physics/numerical-iteration-methods.html',
  },
  {
    id: 104,
    title: '基于位置的扩展动力学（XPBD）',
    date: '2026-10-31',
    topic: '计算机图形学 · 物理',
    excerpt: '从约束流形出发，对照 PBD 与 XPBD 的位置投影、拉格朗日乘子和柔度更新。',
    tags: ['XPBD', 'PBD', '约束投影'],
    image: '/xpbd/note-cover.png',
    link: '/notes/graphics-physics/xpbd.html',
    coverMode: 'full',
  },
  {
    id: 105,
    title: '空气动力学的一些基础定理',
    date: '2026-10-31',
    topic: '计算机图形学 · 物理',
    excerpt: '整理无穿透条件、Kutta 条件、Biot-Savart 定律、Kutta-Joukowski 定理与二次阻力定律。',
    tags: ['空气动力学', '环量', '阻力'],
    link: '/notes/graphics-physics/aerodynamics-basics.html',
  },
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

const page = ref(1)
const publishedCount = notes.filter((note) => !note.placeholder).length
const totalPages = computed(() => Math.max(1, Math.ceil(notes.length / PAGE_SIZE)))
const visibleNotes = computed(() =>
  notes.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

function goToPage(next: number) {
  page.value = Math.min(totalPages.value, Math.max(1, next))
}

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

function imageStyleFor(note: Note) {
  return coverCropStyle(getCardOverride('note', note.id)?.imageCrop)
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
    imageCrop: getCardOverride('note', note.id)?.imageCrop,
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
        v-for="note in visibleNotes"
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
          <img
            v-if="imageFor(note)"
            :src="imageFor(note)"
            :style="imageStyleFor(note)"
            alt=""
            loading="lazy"
          />
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

    <nav v-if="totalPages > 1" class="note-feed__pager" aria-label="笔记分页">
      <button type="button" :disabled="page === 1" @click="goToPage(page - 1)">上一页</button>
      <button
        v-for="number in totalPages"
        :key="number"
        type="button"
        :class="{ 'is-active': page === number }"
        :aria-current="page === number ? 'page' : undefined"
        @click="goToPage(number)"
      >
        {{ number }}
      </button>
      <button type="button" :disabled="page === totalPages" @click="goToPage(page + 1)">下一页</button>
    </nav>
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
  object-position: var(--cover-crop-x, 50%) var(--cover-crop-y, 50%);
  transform: scale(var(--cover-crop-zoom, 1));
  transform-origin: var(--cover-crop-x, 50%) var(--cover-crop-y, 50%);
}

.note-card--link:hover .note-card__cover.has-custom-cover img {
  transform: scale(calc(var(--cover-crop-zoom, 1) * 1.025));
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

.note-feed__pager {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
}

.note-feed__pager button {
  min-width: 34px;
  height: 34px;
  padding: 0 11px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.note-feed__pager button:hover:not(:disabled),
.note-feed__pager button.is-active {
  border-color: rgba(47, 109, 246, 0.34);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.note-feed__pager button:disabled {
  cursor: default;
  opacity: 0.4;
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

.dark .note-feed__pager button {
  border-color: rgba(255, 255, 255, 0.11);
  background: rgba(30, 32, 45, 0.6);
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
