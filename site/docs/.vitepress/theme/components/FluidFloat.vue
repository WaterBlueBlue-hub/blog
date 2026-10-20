<script setup lang="ts">
import { withBase } from 'vitepress'
import FluidTank from './FluidTank.vue'
</script>

<template>
  <aside class="fluid-float" aria-label="XPBD 流体演示">
    <header class="fluid-float__head">
      <span class="fluid-float__live"><i aria-hidden="true"></i>LIVE</span>
      <span class="fluid-float__title">XPBD FLUID</span>
      <img class="fluid-float__avatar" :src="withBase('/avatar.png')" alt="" />
    </header>
    <FluidTank compact />
    <footer class="fluid-float__foot">
      <span>拖一拖水面 · 10 位小人</span>
      <a :href="withBase('/notes/fluid/')">PBF 笔记 →</a>
    </footer>
  </aside>
</template>

<style scoped>
.fluid-float {
  --fluid-tank-height: 200px;
  position: relative;
  width: min(340px, 100%);
  padding: 10px 10px 8px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 24px 70px -36px rgba(24, 40, 80, 0.55);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
  backdrop-filter: blur(16px) saturate(1.15);
}

.fluid-float__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 9px;
}

.fluid-float__live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #2f855a;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.fluid-float__live i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #48bb78;
  box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.16);
}

.fluid-float__title {
  color: var(--vp-c-text-1);
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.18em;
}

.fluid-float__avatar {
  width: 26px;
  height: 26px;
  margin-left: auto;
  border-radius: 50%;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.7),
    0 6px 14px -8px rgba(30, 60, 120, 0.5);
}

.fluid-float__foot {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  padding: 7px 5px 1px;
  color: var(--vp-c-text-2);
  font-size: 10.5px;
}

.fluid-float__foot a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
}

.fluid-float__foot a:hover {
  text-decoration: underline;
}

.dark .fluid-float {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(18, 20, 32, 0.62);
}

.dark .fluid-float__avatar {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.18),
    0 6px 14px -8px rgba(0, 0, 0, 0.8);
}

@media (max-width: 1200px) {
  .fluid-float {
    --fluid-tank-height: 178px;
  }
}

@media (max-width: 959px) {
  .fluid-float {
    display: none;
  }
}

@media print {
  .fluid-float {
    display: none;
  }
}
</style>
