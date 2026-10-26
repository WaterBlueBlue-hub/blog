<script setup lang="ts">
const repository = 'https://github.com/WaterBlueBlue-hub/paper-chinese-edition'

const features = ['PDF 解析', '双栏重排', '公式与插图裁切', '缺字形检查']
</script>

<template>
  <section class="skill-showcase" aria-labelledby="skill-showcase-title">
    <header class="skill-showcase__head">
      <div>
        <span class="skill-showcase__eyebrow">TOOLS / CODEX SKILL</span>
        <h2 id="skill-showcase-title">工具</h2>
      </div>
      <span class="skill-showcase__total">1 个 Skill</span>
    </header>

    <article class="skill-card">
      <div class="skill-card__icon" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <path d="M11 8h20l7 7v25H11V8Z" />
          <path d="M30 8v8h8M17 23h15M17 29h15M17 35h9" />
        </svg>
        <span>中</span>
      </div>

      <div class="skill-card__body">
        <div class="skill-card__title-row">
          <span class="skill-card__kind">Codex Skill</span>
          <h3>论文中译本</h3>
        </div>
        <p class="skill-card__summary">
          把英文论文 PDF 转成中文译本，保留原版双栏版式；公式、插图和算法列表直接从原版裁切，并为译文提供字形覆盖、段落完整性与逐页渲染检查。
        </p>
        <div class="skill-card__features" aria-label="Skill 能力">
          <span v-for="feature in features" :key="feature">{{ feature }}</span>
        </div>
        <div class="skill-card__footer">
          <a :href="repository" target="_blank" rel="noopener noreferrer">
            GitHub 仓库
            <span aria-hidden="true">↗</span>
          </a>
          <span>面向 Codex 的本地 PDF 翻译工作流</span>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.skill-showcase {
  margin: 36px 0 22px;
}

.skill-showcase__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.skill-showcase__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 1.3px;
}

.skill-showcase__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 30px;
  line-height: 1.25;
}

.skill-showcase__total {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

.skill-card {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 22px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 19px;
  background:
    radial-gradient(circle at 9% 16%, rgba(91, 134, 255, 0.16), transparent 24%),
    rgba(255, 255, 255, 0.72);
  box-shadow:
    0 18px 44px -36px rgba(71, 43, 62, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.76);
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  backdrop-filter: blur(14px) saturate(1.08);
}

.skill-card__icon {
  position: relative;
  width: 104px;
  height: 104px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 24px;
  background: linear-gradient(145deg, #346fdf, #77b8e9 58%, #364e9f);
  box-shadow: 0 16px 32px -20px rgba(40, 77, 172, 0.72);
}

.skill-card__icon svg {
  width: 54px;
  height: 54px;
  fill: none;
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.skill-card__icon > span {
  position: absolute;
  right: 12px;
  bottom: 9px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 700;
}

.skill-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.skill-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.skill-card__kind {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(47, 109, 246, 0.1);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  letter-spacing: 0.5px;
}

.skill-card h3 {
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--vp-c-text-1);
  font-size: 21px;
  line-height: 1.35;
}

.skill-card__summary {
  max-width: 820px;
  margin: 11px 0 14px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.8;
}

.skill-card__features {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.skill-card__features span {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(116, 105, 120, 0.075);
  color: var(--vp-c-text-3);
  font-size: 10px;
}

.skill-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-top: auto;
  padding-top: 16px;
  color: var(--vp-c-text-3);
  font-size: 10px;
}

.skill-card__footer a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 650;
  text-decoration: none;
}

.skill-card__footer a:hover {
  color: var(--vp-c-brand-2);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dark .skill-card {
  border-color: rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at 9% 16%, rgba(84, 130, 255, 0.12), transparent 24%),
    rgba(23, 25, 37, 0.8);
  box-shadow: 0 18px 44px -36px rgba(0, 0, 0, 0.75);
}

.dark .skill-card__features span {
  background: rgba(255, 255, 255, 0.07);
}

@media (max-width: 680px) {
  .skill-showcase {
    margin-top: 30px;
  }

  .skill-showcase__head h2 {
    font-size: 26px;
  }

  .skill-card {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 14px;
    padding: 16px;
  }

  .skill-card__icon {
    width: 72px;
    height: 72px;
    border-radius: 18px;
  }

  .skill-card__icon svg {
    width: 40px;
    height: 40px;
  }

  .skill-card__icon > span {
    right: 8px;
    bottom: 6px;
    font-size: 10px;
  }

  .skill-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 440px) {
  .skill-card {
    grid-template-columns: 1fr;
  }
}
</style>
