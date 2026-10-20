<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FluidTank from './FluidTank.vue'

type TankStats = {
  fps: number
  particles: number
  iterations: number
  densityError: number
  waterAmount: number
  colliders: number
}

const tank = ref<{
  refresh: () => void
  setDebug: (on: boolean) => void
  stats: () => TankStats
} | null>(null)
const spinning = ref(false)
const debugOn = ref(false)
const stats = ref<TankStats>({
  fps: 0,
  particles: 0,
  iterations: 0,
  densityError: 0,
  waterAmount: 0,
  colliders: 0,
})
let spinTimer: number | undefined
let statsTimer: number | undefined

const densityLabel = computed(() => {
  const value = stats.value.densityError
  return `${value >= 0 ? '+' : ''}${value.toFixed(3)}`
})
const waterLabel = computed(() => `${stats.value.waterAmount.toFixed(1)}%`)

function refreshStats() {
  const next = tank.value?.stats()
  if (next) stats.value = next
}

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

onMounted(() => {
  refreshStats()
  statsTimer = window.setInterval(refreshStats, 500)
})

onBeforeUnmount(() => {
  window.clearTimeout(spinTimer)
  window.clearInterval(statsTimer)
})
</script>

<template>
  <aside class="fluid-float" aria-label="XPBD 流体演示">
    <div class="fluid-float__stage">
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
    </div>

    <section class="fluid-hud" aria-label="实时流体技术数据">
      <header class="fluid-hud__head">
        <i aria-hidden="true"></i>
        <span>LIVE HUD</span>
      </header>
      <div class="fluid-hud__rows">
        <div class="fluid-hud__row">
          <small>FPS</small>
          <b>{{ stats.fps || '--' }}</b>
        </div>
        <div class="fluid-hud__row">
          <small>粒子</small>
          <b>{{ stats.particles }}</b>
        </div>
        <div class="fluid-hud__row">
          <small>迭代</small>
          <b>{{ stats.iterations }}</b>
        </div>
        <div class="fluid-hud__row">
          <small>密度误差</small>
          <b>{{ densityLabel }}</b>
        </div>
        <div class="fluid-hud__row">
          <small>水量</small>
          <b>{{ waterLabel }}</b>
        </div>
        <div class="fluid-hud__row">
          <small>碰撞体</small>
          <b>{{ stats.colliders }}</b>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.fluid-float {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 340px) 112px;
  gap: 10px;
  width: min(462px, 100%);
  margin-right: 0;
  margin-left: auto;
  align-items: stretch;
  align-self: flex-start;
  margin-top: 32px;
  left: 32px;
}

.fluid-float__stage {
  position: relative;
  min-width: 0;
  width: 100%;
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

.fluid-hud {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 9px 9px;
  overflow: hidden;
  border: 1px solid rgba(111, 181, 255, 0.34);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(7, 18, 39, 0.96), rgba(4, 10, 25, 0.97)),
    radial-gradient(circle at 100% 0%, rgba(64, 151, 255, 0.18), transparent 48%);
  color: #a8ccef;
  line-height: 1;
  box-shadow:
    0 22px 54px -34px rgba(5, 18, 48, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  font-family: var(--vp-font-family-mono);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  backdrop-filter: blur(16px) saturate(1.2);
}

.fluid-hud__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px 8px;
  color: #6e94bb;
  font-size: 8px;
  line-height: 1;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(111, 181, 255, 0.13);
}

.fluid-hud__head i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #43dfa2;
  box-shadow: 0 0 8px rgba(67, 223, 162, 0.8);
}

.fluid-hud__rows {
  display: grid;
  flex: 1;
  grid-template-rows: repeat(6, minmax(0, 1fr));
  min-height: 0;
}

.fluid-hud__row {
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  border-bottom: 1px solid rgba(111, 181, 255, 0.09);
}

.fluid-hud__row:last-child {
  border-bottom: 0;
}

.fluid-hud__row small {
  overflow: hidden;
  color: #6488ae;
  font-family: var(--vp-font-family-base);
  font-size: 9px;
  line-height: 1.1;
  white-space: nowrap;
}

.fluid-hud__row b {
  overflow: hidden;
  color: #d5efff;
  font-size: 12px;
  line-height: 1.1;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .fluid-float__stage {
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

@media (min-width: 960px) and (max-width: 1180px) {
  .fluid-float {
    grid-template-columns: minmax(0, 1fr) 92px;
    gap: 8px;
    width: 100%;
  }

  .fluid-hud {
    padding-inline: 7px;
  }

  .fluid-hud__row small {
    font-size: 8px;
  }

  .fluid-hud__row b {
    font-size: 10px;
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

@media (prefers-reduced-motion: reduce) {
  .fluid-float__refresh.is-spinning svg {
    animation: none;
  }
}
</style>
