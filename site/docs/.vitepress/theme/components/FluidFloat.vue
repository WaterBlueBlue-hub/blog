<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import FluidTank from './FluidTank.vue'

const tank = ref<{ refresh: () => void } | null>(null)
const spinning = ref(false)
let spinTimer: number | undefined

function refresh() {
  tank.value?.refresh()
  spinning.value = true
  window.clearTimeout(spinTimer)
  spinTimer = window.setTimeout(() => (spinning.value = false), 520)
}

onBeforeUnmount(() => window.clearTimeout(spinTimer))
</script>

<template>
  <aside class="fluid-float" aria-label="XPBD 流体演示">
    <div class="fluid-float__tools">
      <button
        class="fluid-float__refresh"
        :class="{ 'is-spinning': spinning }"
        type="button"
        aria-label="随机换一批小人"
        @click="refresh"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
          <path d="M20.5 4.5V10H15" />
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

.fluid-float__refresh {
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

.fluid-float__refresh:hover {
  background: #fff;
  transform: rotate(24deg);
}

.fluid-float__refresh:active {
  transform: scale(0.9);
}

.fluid-float__refresh:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.fluid-float__refresh svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
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

.dark .fluid-float__refresh {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(26, 30, 46, 0.78);
  color: #e6edf9;
}

.dark .fluid-float__refresh:hover {
  background: rgba(42, 48, 70, 0.92);
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
