<script setup lang="ts">
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  cardEditorState,
  getCardOverride,
  openCardEditor,
} from '../composables/cardEditor'

type Article = {
  id: number
  title: string
  date: string
  category: '物理' | '图形' | '工程' | '随笔'
  excerpt: string
  tags: string[]
  colors: [string, string, string]
  pattern: 'grid' | 'wave' | 'orbit' | 'mesh'
  image?: string
  link?: string
}

const PAGE_SIZE = 6
const categories = ['全部', '物理', '图形', '工程', '随笔'] as const
type Category = (typeof categories)[number]

const articles: Article[] = [
  {
    id: 13,
    title: 'ACN-Estimation：基于纹理—几何耦合的自然材质法线估计',
    date: '2026-10-22',
    category: '图形',
    excerpt: '以 Albedo 灰度场为输入，经 Sobel 梯度提取与去噪处理，构建自然材质的法线估计管线。',
    tags: ['法线贴图', 'Sobel', '形态学滤波'],
    colors: ['#356ec9', '#7ecbe8', '#152b57'],
    pattern: 'mesh',
    image: '/acn-estimation/images/article-cover.webp',
    link: '/articles/graphics/acn-estimation-albedo-to-normal/',
  },
  {
    id: 1,
    title: 'XPBD 柔度与迭代次数为什么总是打架',
    date: '2026-10-18',
    category: '物理',
    excerpt: '从约束残差和乘子更新出发，整理柔度映射在实际调参中出现的非线性问题。',
    tags: ['XPBD', '约束', '推导'],
    colors: ['#426fd1', '#75c9ee', '#142852'],
    pattern: 'grid',
  },
  {
    id: 2,
    title: 'PBF 表面的密度振荡从哪里来',
    date: '2026-10-16',
    category: '物理',
    excerpt: '记录自由表面密度偏低、单侧约束和位置修正共同造成的细小振荡。',
    tags: ['PBF', '流体', '稳定性'],
    colors: ['#285aa8', '#5fc7da', '#102449'],
    pattern: 'wave',
  },
  {
    id: 3,
    title: '从二面角约束理解弯曲刚度',
    date: '2026-10-13',
    category: '物理',
    excerpt: '把二面角、梯度和零能模式放在同一张图里，重新理解布料的弯曲响应。',
    tags: ['弯曲', '几何', '约束'],
    colors: ['#7867c6', '#d7afde', '#2f285d'],
    pattern: 'mesh',
  },
  {
    id: 4,
    title: '用 Burst Job 加速近场叶片气动',
    date: '2026-10-10',
    category: '工程',
    excerpt: '叶片数量上来以后，托管循环成为瓶颈；这里整理批处理与数据布局的取舍。',
    tags: ['Unity', 'Burst', 'Job System'],
    colors: ['#2b8f82', '#a4dda0', '#153e43'],
    pattern: 'wave',
  },
  {
    id: 5,
    title: 'SSFR 深度补洞与法线重建记录',
    date: '2026-10-08',
    category: '图形',
    excerpt: '从粒子深度到屏幕空间法线，记录补洞半径、滤波和轮廓稳定性的调参过程。',
    tags: ['SSFR', '渲染', '法线'],
    colors: ['#5b68c9', '#d399c7', '#1d2856'],
    pattern: 'orbit',
  },
  {
    id: 6,
    title: '布料裙摆绕腿碰撞调试',
    date: '2026-10-05',
    category: '物理',
    excerpt: '约束与碰撞的先后顺序会直接影响裙摆是否卷进腿部胶囊体。',
    tags: ['布料', '碰撞', '角色'],
    colors: ['#c8768e', '#efb4bd', '#63394d'],
    pattern: 'mesh',
  },
  {
    id: 7,
    title: 'Unity 生命周期里的物理时序坑',
    date: '2026-10-02',
    category: '工程',
    excerpt: 'Update、FixedUpdate 和 LateUpdate 混用后，力的累积和渲染会怎样错位。',
    tags: ['Unity', '时序', '刚体'],
    colors: ['#b27b50', '#ecc28f', '#4d3429'],
    pattern: 'grid',
  },
  {
    id: 8,
    title: '一次流体调试面板的重构',
    date: '2026-09-29',
    category: '图形',
    excerpt: '把粒子、胶囊体、速度和密度放在一起观察之后，调试路径发生了什么变化。',
    tags: ['可视化', '调试', 'Canvas'],
    colors: ['#437fae', '#9fd3dc', '#173b52'],
    pattern: 'orbit',
  },
  {
    id: 9,
    title: '写论文和写工程之间',
    date: '2026-09-26',
    category: '随笔',
    excerpt: '同一套算法，论文关心结论是否成立，工程还要面对性能、资产和可调参数。',
    tags: ['写作', '方法', '记录'],
    colors: ['#b49287', '#ead2c4', '#59413d'],
    pattern: 'wave',
  },
  {
    id: 10,
    title: '我为什么把演示场景拆成五套',
    date: '2026-09-22',
    category: '工程',
    excerpt: '角色、叶片、布料和水池共享同一个解算器，却需要完全不同的验收方式。',
    tags: ['Unity', '场景', '工程化'],
    colors: ['#6579ab', '#c1cde7', '#2c385b'],
    pattern: 'grid',
  },
  {
    id: 11,
    title: '2026 秋番第一印象',
    date: '2026-09-18',
    category: '随笔',
    excerpt: '只记第一集留下的画面、节奏和角色记忆点，不写完整评价。',
    tags: ['动画', '观后感', '秋番'],
    colors: ['#c789a6', '#edbfce', '#63374f'],
    pattern: 'orbit',
  },
  {
    id: 12,
    title: '一个技术博客首页的交互实验',
    date: '2026-09-15',
    category: '图形',
    excerpt: '从流体、花朵到枫叶，把实时模拟的视觉语言带进个人博客首屏。',
    tags: ['网页', '交互', '物理模拟'],
    colors: ['#5b8f90', '#d6bca2', '#263d46'],
    pattern: 'mesh',
  },
]

const activeCategory = ref<Category>('全部')
const page = ref(1)

const countFor = (category: Category) =>
  category === '全部' ? articles.length : articles.filter((article) => article.category === category).length

const filtered = computed(() =>
  activeCategory.value === '全部'
    ? articles
    : articles.filter((article) => article.category === activeCategory.value),
)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const visibleArticles = computed(() =>
  filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

function valueFor(
  article: Article,
  field: 'title' | 'date' | 'excerpt' | 'image',
) {
  return getCardOverride('article', article.id)?.[field] ?? article[field] ?? ''
}

function topicFor(article: Article) {
  return getCardOverride('article', article.id)?.topic ?? article.category
}

function tagsFor(article: Article) {
  return getCardOverride('article', article.id)?.tags ?? article.tags
}

function imageFor(article: Article) {
  const image = valueFor(article, 'image')
  if (!image) return ''
  return /^(data:|https?:)/.test(image) ? image : withBase(image)
}

function handleCardClick(article: Article, event: MouseEvent) {
  if (!cardEditorState.active) return
  event.preventDefault()
  openCardEditor({
    kind: 'article',
    id: article.id,
    title: valueFor(article, 'title'),
    date: valueFor(article, 'date'),
    topic: topicFor(article),
    excerpt: valueFor(article, 'excerpt'),
    tags: tagsFor(article),
    image: valueFor(article, 'image') || undefined,
  })
}

function selectCategory(category: Category) {
  activeCategory.value = category
  page.value = 1
}

function goToPage(next: number) {
  page.value = Math.min(totalPages.value, Math.max(1, next))
}
</script>

<template>
  <section class="article-feed" aria-labelledby="article-feed-title">
    <header class="article-feed__head">
      <div>
        <span class="article-feed__eyebrow">ARTICLES / NOTES</span>
        <h2 id="article-feed-title">文章</h2>
      </div>
      <span class="article-feed__total">{{ filtered.length }} 篇</span>
    </header>

    <nav class="article-feed__filters" aria-label="文章分类">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        :class="{ 'is-active': activeCategory === category }"
        :aria-pressed="activeCategory === category"
        @click="selectCategory(category)"
      >
        {{ category }}
        <b>{{ countFor(category) }}</b>
      </button>
    </nav>

    <div :key="cardEditorState.revision" class="article-feed__grid">
      <component
        :is="article.link && !cardEditorState.active ? 'a' : 'article'"
        v-for="article in visibleArticles"
        :key="article.id"
        class="article-card"
        :class="{
          'article-card--link': article.link && !cardEditorState.active,
          'article-card--editing': cardEditorState.active,
        }"
        :href="article.link && !cardEditorState.active ? withBase(article.link) : undefined"
        @click="handleCardClick(article, $event)"
      >
        <div
          class="article-card__cover"
          :class="[`is-${article.pattern}`, { 'has-image': imageFor(article) }]"
          :style="{
            '--cover-a': article.colors[0],
            '--cover-b': article.colors[1],
            '--cover-c': article.colors[2],
          }"
        >
          <img v-if="imageFor(article)" :src="imageFor(article)" alt="" />
          <span class="article-card__code">A{{ String(article.id).padStart(2, '0') }}</span>
          <span v-if="cardEditorState.active" class="article-card__edit">点击编辑</span>
          <span class="article-card__mark" aria-hidden="true"></span>
        </div>

        <div class="article-card__body">
          <h3>{{ valueFor(article, 'title') }}</h3>
          <div class="article-card__meta">
            <span>{{ valueFor(article, 'date') }}</span>
            <i aria-hidden="true"></i>
            <span>{{ topicFor(article) }}</span>
          </div>
          <p>{{ valueFor(article, 'excerpt') }}</p>
          <div class="article-card__tags" aria-label="文章标签">
            <span v-for="tag in tagsFor(article)" :key="tag">#{{ tag }}</span>
          </div>
        </div>
      </component>
    </div>

    <nav v-if="totalPages > 1" class="article-feed__pager" aria-label="文章分页">
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
.article-feed {
  /* 首屏花带已经在文章上方留出视觉边界，这里只保留一点呼吸空间。 */
  margin: -14px 0 10px;
}

.article-feed__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.article-feed__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 1.3px;
}

.article-feed__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 30px;
  line-height: 1.25;
}

.article-feed__total {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.article-feed__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  padding: 9px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: blur(14px) saturate(1.12);
  backdrop-filter: blur(14px) saturate(1.12);
}

.article-feed__filters button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-radius: 10px;
  background: rgba(255, 248, 246, 0.58);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.article-feed__filters button b {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 500;
}

.article-feed__filters button:hover {
  border-color: rgba(47, 109, 246, 0.32);
  color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.article-feed__filters button.is-active {
  border-color: rgba(47, 109, 246, 0.4);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.article-feed__filters button.is-active b {
  color: rgba(255, 255, 255, 0.74);
}

.article-feed__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.article-card {
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
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  backdrop-filter: blur(14px) saturate(1.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.article-card--link {
  color: inherit;
  text-decoration: none;
}

.article-card:hover {
  border-color: rgba(255, 255, 255, 0.92);
  transform: translateY(-3px);
  box-shadow:
    0 24px 54px -38px rgba(67, 42, 61, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.article-card--editing {
  cursor: pointer;
}

.article-card--editing:hover {
  border-color: rgba(47, 109, 246, 0.46);
  box-shadow:
    0 0 0 3px rgba(47, 109, 246, 0.08),
    0 24px 54px -38px rgba(67, 42, 61, 0.62);
}

.article-card__cover {
  position: relative;
  aspect-ratio: 16 / 9;
  margin: 9px 9px 0;
  overflow: hidden;
  border-radius: 11px;
  background:
    radial-gradient(circle at 73% 24%, var(--cover-b), transparent 30%),
    linear-gradient(135deg, var(--cover-a), var(--cover-c));
}

.article-card__cover::before,
.article-card__cover::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.article-card__cover::before {
  opacity: 0.38;
}

.article-card__cover::after {
  inset: auto -10% -35% 28%;
  height: 70%;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  transform: rotate(-18deg);
}

.article-card__cover img {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-card__cover.has-image::before,
.article-card__cover.has-image::after {
  display: none;
}

.article-card__cover.has-image .article-card__code {
  color: rgba(28, 42, 63, 0.72);
}

.article-card__cover.has-image .article-card__mark {
  border-color: rgba(28, 42, 63, 0.32);
  box-shadow:
    0 0 0 8px rgba(28, 42, 63, 0.06),
    0 0 0 16px rgba(28, 42, 63, 0.035);
}

.article-card__cover.is-grid::before {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1px, transparent 1px);
  background-size: 26px 26px;
}

.article-card__cover.is-wave::before {
  inset: 18% -20% -34%;
  background: repeating-radial-gradient(
    ellipse at 50% 100%,
    rgba(255, 255, 255, 0) 0 18px,
    rgba(255, 255, 255, 0.23) 19px 20px,
    rgba(255, 255, 255, 0) 21px 38px
  );
}

.article-card__cover.is-orbit::before {
  inset: -18% 12% 18% -12%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  box-shadow:
    42px 9px 0 -20px rgba(255, 255, 255, 0.22),
    86px -8px 0 -34px rgba(255, 255, 255, 0.28);
}

.article-card__cover.is-mesh::before {
  background-image:
    linear-gradient(36deg, transparent 47%, rgba(255, 255, 255, 0.18) 48% 50%, transparent 51%),
    linear-gradient(-36deg, transparent 47%, rgba(255, 255, 255, 0.18) 48% 50%, transparent 51%);
  background-size: 30px 24px;
}

.article-card__code {
  position: absolute;
  z-index: 1;
  top: 10px;
  left: 11px;
  color: rgba(255, 255, 255, 0.78);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  letter-spacing: 1px;
}

.article-card__edit {
  position: absolute;
  z-index: 3;
  top: 9px;
  right: 9px;
  border-radius: 999px;
  padding: 3px 7px;
  background: rgba(34, 35, 47, 0.72);
  color: rgba(255, 255, 255, 0.86);
  font-family: var(--vp-font-family-mono);
  font-size: 8px;
  letter-spacing: 0.4px;
}

.article-card__mark {
  position: absolute;
  right: 14px;
  bottom: 12px;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 50%;
  box-shadow:
    0 0 0 8px rgba(255, 255, 255, 0.06),
    0 0 0 16px rgba(255, 255, 255, 0.04);
}

.article-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px 17px 18px;
}

.article-card__body h3 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 18px;
  line-height: 1.48;
  letter-spacing: -0.2px;
}

.article-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  color: var(--vp-c-text-3);
  font-size: 11px;
}

.article-card__meta i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}

.article-card__body p {
  margin: 12px 0 15px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.75;
}

.article-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
}

.article-card__tags span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(116, 105, 120, 0.075);
  color: var(--vp-c-text-3);
  font-size: 10px;
}

.article-feed__pager {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
}

.article-feed__pager button {
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

.article-feed__pager button:hover:not(:disabled),
.article-feed__pager button.is-active {
  border-color: rgba(47, 109, 246, 0.34);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.article-feed__pager button:disabled {
  cursor: default;
  opacity: 0.4;
}

.dark .article-feed__filters {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(22, 24, 36, 0.56);
}

.dark .article-feed__filters button,
.dark .article-feed__pager button {
  border-color: rgba(255, 255, 255, 0.11);
  background: rgba(30, 32, 45, 0.6);
}

.dark .article-card {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(23, 25, 37, 0.72);
  box-shadow: 0 18px 44px -36px rgba(0, 0, 0, 0.75);
}

.dark .article-card__tags span {
  background: rgba(255, 255, 255, 0.07);
}

@media (max-width: 1050px) {
  .article-feed__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .article-feed__grid {
    grid-template-columns: 1fr;
  }

  .article-feed__head h2 {
    font-size: 26px;
  }
}
</style>
