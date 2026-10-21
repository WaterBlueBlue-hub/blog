<script setup lang="ts">
import { computed, ref } from 'vue'

type Paper = {
  id: number
  title: string
  titleZh: string
  authors: string
  year: number
  venue: string
  summary: string
  tags: string[]
  href?: string
  linkNotice?: string
}

const papers: Paper[] = [
  {
    id: 1,
    title: 'Position Based Dynamics',
    titleZh: 'PBD：基于位置的动力学',
    authors: 'Matthias Müller, Bruno Heidelberger, Marcus Hennix, John Ratcliff',
    year: 2006,
    venue: '3rd Workshop in Virtual Reality Interactions and Physical Simulation (VRIPHYS)',
    summary: '通过直接投影几何约束更新粒子位置，在位置层面处理动力学与碰撞，避免传统力积分中的过冲问题，并用于实时布料等可变形物体模拟。',
    tags: ['PBD', '约束投影', '位置更新'],
    href: 'https://matthias-research.github.io/pages/publications/posBasedDyn.pdf',
    linkNotice: '作者官方 PDF',
  },
  {
    id: 3,
    title: 'XPBD: Position-Based Simulation of Compliant Constrained Dynamics',
    titleZh: 'XPBD：基于位置的扩展动力学',
    authors: 'Miles Macklin, Matthias Müller, Nuttapong Chentanez',
    year: 2016,
    venue: 'Proceedings of the 9th International Conference on Motion in Games',
    summary: '将约束乘子与物理柔度关联，使材料刚度不再随迭代次数和时间步长变化，并以隐式方式处理弹性与耗散势能。',
    tags: ['XPBD', '柔度', '拉格朗日乘子'],
    href: 'https://matthias-research.github.io/pages/publications/XPBD.pdf',
    linkNotice: '作者官方 PDF',
  },
  {
    id: 4,
    title: 'Position Based Fluids',
    titleZh: 'PBF：基于位置的流体',
    authors: 'Miles Macklin, Matthias Müller',
    year: 2013,
    venue: 'ACM Transactions on Graphics',
    summary: '把不可压缩密度约束引入位置动力学框架，通过迭代投影修正粒子位置，并结合人工压力与涡量约束改善流体表现。',
    tags: ['PBF', '密度约束', '粒子流体'],
    href: 'https://mmacklin.com/pbf_sig_preprint.pdf',
    linkNotice: '作者官方预印本',
  },
  {
    id: 5,
    title: 'Unified Particle Physics for Real-Time Applications',
    titleZh: 'FleX：面向实时应用的统一粒子物理',
    authors: 'Miles Macklin, Matthias Müller, Nuttapong Chentanez, Tae-Yong Kim',
    year: 2014,
    venue: 'ACM Transactions on Graphics',
    summary: '以统一粒子模型描述流体、可变形体与刚体，并在同一求解框架中处理多种物理现象及其相互作用。',
    tags: ['统一粒子', '多物态', '耦合'],
    href: 'https://mmacklin.com/uppfrta_preprint.pdf',
    linkNotice: '作者官方预印本',
  },
  {
    id: 8,
    title: 'Particle-Based Fluid Simulation for Interactive Applications',
    titleZh: '面向交互式应用的基于粒子的流体模拟',
    authors: 'Matthias Müller, David Charypar, Markus Gross',
    year: 2003,
    venue: 'ACM SIGGRAPH / Eurographics Symposium on Computer Animation (SCA)',
    summary: '基于平滑粒子流体动力学模拟带自由表面的流体，直接从 Navier–Stokes 方程构造力密度场并加入表面张力项，同时使用点绘制与等值面重建显示液面。',
    tags: ['SPH', '粒子流体', '自由表面'],
    href: 'https://matthias-research.github.io/pages/publications/sca03.pdf',
    linkNotice: '作者官方 PDF',
  },
  {
    id: 6,
    title: 'Screen Space Fluid Rendering with Curvature Flow',
    titleZh: 'SSFR：用曲率流做屏幕空间流体渲染',
    authors: 'Wladimir J. van der Laan, Simon Green, Miguel Sainz',
    year: 2009,
    venue: 'Proceedings of the 2009 Symposium on Interactive 3D Graphics and Games',
    summary: '通过平滑粒子深度并重建连续液面，再利用曲率流生成法线，使粒子流体能够在屏幕空间完成连续表面渲染与光照计算。',
    tags: ['SSFR', '曲率流', '深度重建'],
    href: 'https://doi.org/10.1145/1507149.1507164',
    linkNotice: '非公开全文 · 官方摘要页',
  },
  {
    id: 7,
    title: 'Behavior of a Falling Paper',
    titleZh: '下落纸张的行为',
    authors: 'Yoshihiro Tanabe, Kunihiko Kaneko',
    year: 1994,
    venue: 'Physical Review Letters',
    summary: '研究薄纸片在空气中的下落运动，分析其摆动与翻滚模式，并讨论升力、阻力与力矩对姿态变化的影响。',
    tags: ['叶片', '气动', '薄片'],
    href: 'https://doi.org/10.1103/PhysRevLett.73.1372',
    linkNotice: '非公开全文 · 官方摘要页',
  },
]

const PAGE_SIZE = 6
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(papers.length / PAGE_SIZE)))
const visiblePapers = computed(() =>
  papers.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

function goToPage(next: number) {
  page.value = Math.min(totalPages.value, Math.max(1, next))
}
</script>

<template>
  <section class="paper-library" aria-labelledby="paper-library-title">
    <header class="paper-library__head">
      <div>
        <span class="paper-library__eyebrow">PAPERS / LITERATURE</span>
        <h2 id="paper-library-title">文献</h2>
      </div>
      <span class="paper-library__total">{{ papers.length }} 篇</span>
    </header>

    <p class="paper-library__note">
      当前为文献栏测试版：作者官方 PDF 与出版社摘要页会分别标注来源类型。
    </p>

    <div class="paper-library__grid">
      <article v-for="paper in visiblePapers" :key="paper.id" class="paper-card">
        <div class="paper-card__heading">
          <h3>{{ paper.titleZh }}</h3>
          <p>{{ paper.title }}</p>
        </div>

        <p class="paper-card__authors">{{ paper.authors }}</p>
        <p class="paper-card__venue">{{ paper.year }} · {{ paper.venue }}</p>
        <p class="paper-card__summary">{{ paper.summary }}</p>

        <div class="paper-card__footer">
          <div class="paper-card__tags" aria-label="论文标签">
            <span v-for="tag in paper.tags" :key="tag">#{{ tag }}</span>
          </div>
          <div v-if="paper.href" class="paper-card__source">
            <span v-if="paper.linkNotice" class="paper-card__link-notice">
              {{ paper.linkNotice }}
            </span>
            <a
              class="paper-card__url"
              :href="paper.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${paper.title}：${paper.linkNotice}`"
            >
              {{ paper.href }}
            </a>
          </div>
        </div>
      </article>
    </div>

    <nav v-if="totalPages > 1" class="paper-library__pager" aria-label="文献分页">
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
.paper-library {
  margin: 52px 0 22px;
}

.paper-library__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.paper-library__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 1.3px;
}

.paper-library__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 30px;
  line-height: 1.25;
}

.paper-library__total {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.paper-library__note {
  margin: 0 0 18px;
  padding: 11px 14px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.52);
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.75;
}

.paper-library__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.paper-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 18px 19px 17px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow:
    0 18px 44px -36px rgba(71, 43, 62, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  transition: border-color 0.2s ease;
}

.paper-card:hover {
  border-color: rgba(255, 255, 255, 0.94);
}

.paper-card__heading {
  margin-top: 0;
}

.paper-card__heading h3 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 18px;
  line-height: 1.45;
}

.paper-card__heading p {
  margin: 3px 0 0;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  line-height: 1.55;
}

.paper-card__authors {
  margin: 11px 0 0;
  color: var(--vp-c-text-2);
  font-size: 11px;
  line-height: 1.6;
}

.paper-card__venue {
  margin: 3px 0 0;
  color: var(--vp-c-text-3);
  font-size: 10px;
  line-height: 1.55;
}

.paper-card__summary {
  margin: 13px 0 16px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.75;
}

.paper-card__footer {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.paper-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.paper-card__tags span {
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(116, 105, 120, 0.075);
  color: var(--vp-c-text-3);
  font-size: 9px;
}

.paper-card__source {
  display: flex;
  max-width: 100%;
  flex-direction: column;
  gap: 4px;
}

.paper-card__link-notice {
  color: var(--vp-c-text-3);
  font-size: 9px;
  line-height: 1.45;
}

.paper-card__url {
  max-width: 100%;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.paper-card__url:hover {
  color: var(--vp-c-brand-2);
}

.paper-library__pager {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
}

.paper-library__pager button {
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

.paper-library__pager button:hover:not(:disabled),
.paper-library__pager button.is-active {
  border-color: rgba(47, 109, 246, 0.34);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.paper-library__pager button:disabled {
  cursor: default;
  opacity: 0.4;
}

.dark .paper-library__note {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(22, 24, 36, 0.64);
}

.dark .paper-card {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(23, 25, 37, 0.8);
  box-shadow: 0 18px 44px -36px rgba(0, 0, 0, 0.75);
}

.dark .paper-card__tags span {
  background: rgba(255, 255, 255, 0.07);
}

.dark .paper-library__pager button {
  border-color: rgba(255, 255, 255, 0.11);
  background: rgba(30, 32, 45, 0.6);
}

@media (max-width: 1050px) {
  .paper-library__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .paper-library {
    margin-top: 42px;
  }

  .paper-library__head h2 {
    font-size: 26px;
  }

  .paper-library__grid {
    grid-template-columns: 1fr;
  }

  .paper-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
