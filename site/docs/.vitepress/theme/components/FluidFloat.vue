<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import FluidTank from './FluidTank.vue'

const tank = ref<{ refresh: () => void; setDebug: (on: boolean) => void } | null>(null)
const spinning = ref(false)
const debugOn = ref(false)
let spinTimer: number | undefined

function refresh() {
  tank.value?.refresh()
  spinning.value = true
  window.clearTimeout(spinTimer)
  spinTimer = window.setTimeout(() => (spinning.value = false), 520)
}

function toggleDebug() {
  debugOn.value = !debugOn.value
  tank.value?.setDebug(debugOn.value)
}

onBeforeUnmount(() => window.clearTimeout(spinTimer))
</script>

<template>
  <aside class="fluid-float" aria-label="XPBD 流体演示">
    <div class="fluid-float__tools">
      <button
        class="fluid-float__tool fluid-float__refresh"
        :class="{ 'is-spinning': spinning }"
        type="button"
        aria-label="随机换一批小人"
        title="随机换一批小人"
        @click="refresh"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
          <path d="M20.5 4.5V10H15" />
        </svg>
      </button>
      <button
        class="fluid-float__tool fluid-float__debug"
        :class="{ 'is-active': debugOn }"
        type="button"
        :aria-pressed="debugOn"
        aria-label="显示流体粒子与胶囊碰撞体线框"
        title="粒子 / 胶囊线框"
        @click="toggleDebug"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      </button>
    </div>
    <FluidTank ref="tank" compact />
  </aside>
</template>

<style scoped>
.fluid-float {
  position: relative;
  width: min(340px, 100%);
  padding: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 24px 70px -36px rgba(24, 40, 80, 0.55);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
  backdrop-filter: blur(16px) saturate(1.15);
}

.fluid-float__tools {
  position: absolute;
  top: 17px;
  right: 17px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fluid-float__tool {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  color: #2b3a55;
  cursor: pointer;
  box-shadow: 0 4px 12px -6px rgba(20, 40, 80, 0.6);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  transition:
    background 0.18s ease,
    transform 0.18s ease;
}

.fluid-float__tool:hover {
  background: #fff;
}

.fluid-float__refresh:hover {
  transform: rotate(24deg);
}

.fluid-float__tool:active {
  transform: scale(0.9);
}

.fluid-float__tool:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.fluid-float__tool svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fluid-float__debug.is-active {
  background: #2f6df6;
  border-color: rgba(255, 255, 255, 0.9);
  color: #fff;
  box-shadow: 0 0 0 3px rgba(47, 109, 246, 0.2);
}

.fluid-float__debug.is-active:hover {
  background: #2a5fd8;
}

.fluid-float__refresh.is-spinning svg {
  animation: fluid-refresh-spin 0.5s ease;
}

@keyframes fluid-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

.dark .fluid-float {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(18, 20, 32, 0.62);
}

.dark .fluid-float__tool {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(26, 30, 46, 0.78);
  color: #e6edf9;
}

.dark .fluid-float__tool:hover {
  background: rgba(42, 48, 70, 0.92);
}

.dark .fluid-float__debug.is-active {
  background: #4b83ff;
  color: #fff;
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
