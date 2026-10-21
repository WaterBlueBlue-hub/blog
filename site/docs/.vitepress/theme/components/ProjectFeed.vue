<script setup lang="ts">
type ProjectTile = {
  id: string
  eyebrow: string
  title: string
  summary: string
  link: string
  image?: string
  colors: [string, string, string]
  pattern: 'grid' | 'wave' | 'orbit' | 'mesh'
}

const tiles: ProjectTile[] = [
  {
    id: 'P01',
    eyebrow: 'FEATURED PROJECT',
    title: 'ACN-Estimation',
    summary: '从自然纹理 Albedo 估计切线空间法线，并以 Unity 渲染验证结果。',
    link: '/projects/acn-estimation/',
    image: '/acn-estimation/images/cover.webp',
    colors: ['#426fd1', '#97d6eb', '#172b55'],
    pattern: 'grid',
  },
  {
    id: 'P02',
    eyebrow: 'METHOD',
    title: '纹理与几何耦合',
    summary: '从灰度高度场、切向量叉乘和 Sobel 梯度构造法线。',
    link: '/articles/graphics/acn-estimation-albedo-to-normal/',
    colors: ['#715ec9', '#d4bee7', '#2a2458'],
    pattern: 'mesh',
  },
  {
    id: 'P03',
    eyebrow: 'DIRECTION',
    title: '方向梯度平均',
    summary: '利用横向或纵向平移对称性，保留结构并降低随机波动。',
    link: '/articles/graphics/acn-estimation-albedo-to-normal/',
    colors: ['#287f88', '#8bd1bd', '#173e48'],
    pattern: 'wave',
  },
  {
    id: 'P04',
    eyebrow: 'CLEANUP',
    title: '形态学滤波去噪',
    summary: '分析法线通道、连通分量与几何属性，清理方向性噪声。',
    link: '/notes/graphics/morphology-components.html',
    colors: ['#b36d8d', '#edb6c5', '#5c3045'],
    pattern: 'orbit',
  },
  {
    id: 'P05',
    eyebrow: 'EVALUATION',
    title: '材质结果测试',
    summary: '对照四类材质在 Sobel、双边滤波与方向平均下的表现。',
    link: '/articles/graphics/acn-estimation-albedo-to-normal/',
    colors: ['#8c6d4c', '#d8bd8c', '#433226'],
    pattern: 'grid',
  },
  {
    id: 'P06',
    eyebrow: 'LIMITS',
    title: '失败边界',
    summary: '检查文字、图案和缺乏结构先验时出现的误判与参数敏感问题。',
    link: '/articles/graphics/acn-estimation-albedo-to-normal/',
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
      <a
        v-for="tile in tiles"
        :key="tile.id"
        class="project-tile"
        :href="tile.link"
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
          <img v-if="tile.image" :src="tile.image" alt="" />
          <span>{{ tile.id }}</span>
        </div>
        <div class="project-tile__body">
          <small>{{ tile.eyebrow }}</small>
          <h3>{{ tile.title }}</h3>
          <p>{{ tile.summary }}</p>
        </div>
      </a>
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

.project-feed__eyebrow,
.project-tile__body small {
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

.project-tile__cover::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.38;
}

.project-tile__cover.is-grid::before {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1px, transparent 1px);
  background-size: 26px 26px;
}

.project-tile__cover.is-wave::before {
  inset: 18% -20% -34%;
  background: repeating-radial-gradient(
    ellipse at 50% 100%,
    rgba(255, 255, 255, 0) 0 18px,
    rgba(255, 255, 255, 0.23) 19px 20px,
    rgba(255, 255, 255, 0) 21px 38px
  );
}

.project-tile__cover.is-orbit::before {
  inset: -18% 12% 18% -12%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  box-shadow:
    42px 9px 0 -20px rgba(255, 255, 255, 0.22),
    86px -8px 0 -34px rgba(255, 255, 255, 0.28);
}

.project-tile__cover.is-mesh::before {
  background-image:
    linear-gradient(36deg, transparent 47%, rgba(255, 255, 255, 0.18) 48% 50%, transparent 51%),
    linear-gradient(-36deg, transparent 47%, rgba(255, 255, 255, 0.18) 48% 50%, transparent 51%);
  background-size: 30px 24px;
}

.project-tile__cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.46;
}

.project-tile__cover span {
  position: absolute;
  z-index: 1;
  top: 10px;
  left: 11px;
  color: rgba(255, 255, 255, 0.82);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.project-tile__body {
  padding: 14px 17px 17px;
}

.project-tile__body h3 {
  margin: 6px 0 0;
  border: 0;
  padding: 0;
  font-size: 18px;
  line-height: 1.45;
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
