<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FluidTank from './FluidTank.vue'
import HeroCharacterRig from './HeroCharacterRig.vue'
import {
  heroSceneSettings,
  initializeHeroSceneSettings,
} from '../composables/heroSceneSettings'

const tank = ref<{
  refresh: () => void
  setDebug: (on: boolean) => void
} | null>(null)
const characterRig = ref<{
  setDebug: (on: boolean) => void
  kick: () => void
} | null>(null)
const spinning = ref(false)
const debugOn = ref(false)
let spinTimer: number | undefined

const sceneStyle = computed(() => ({
  '--hero-tank-width': `${heroSceneSettings.tankWidth}px`,
  '--hero-tank-height': `${heroSceneSettings.tankHeight}px`,
  '--hero-character-width': `${heroSceneSettings.characterWidth}px`,
  '--hero-character-x': `${heroSceneSettings.characterX}px`,
  '--hero-character-y': `${heroSceneSettings.characterY}px`,
}))

function refresh() {
  tank.value?.refresh()
  characterRig.value?.kick()
  spinning.value = true
  window.clearTimeout(spinTimer)
  spinTimer = window.setTimeout(() => (spinning.value = false), 520)
}

function toggleDebug() {
  debugOn.value = !debugOn.value
  tank.value?.setDebug(debugOn.value)
  characterRig.value?.setDebug(debugOn.value)
}

onBeforeUnmount(() => {
  window.clearTimeout(spinTimer)
})

onMounted(initializeHeroSceneSettings)
</script>

<template>
  <aside class="fluid-float" :style="sceneStyle" aria-label="XPBD 流体演示">
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
          aria-label="显示流体粒子、胶囊碰撞体、角色骨骼与裙摆约束线框"
          title="粒子 / 胶囊 / 骨骼 / 裙摆线框"
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
    <HeroCharacterRig ref="characterRig" :debug="debugOn" />
  </aside>
</template>

<style scoped>
.fluid-float {
  position: relative;
  isolation: isolate;
  width: min(480px, 100%);
  margin-right: 0;
  margin-left: auto;
  align-self: flex-start;
  margin-top: 32px;
  left: auto;
  right: -32px;
}

.fluid-float__stage {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  min-width: 0;
  width: var(--hero-tank-width);
  height: var(--hero-tank-height);
  margin-left: auto;
  padding: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  background:
    linear-gradient(145deg, rgba(255, 252, 252, 0.42), rgba(247, 235, 241, 0.24)),
    rgba(255, 255, 255, 0.2);
  box-shadow:
    0 24px 58px -42px rgba(74, 43, 64, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.58);
  -webkit-backdrop-filter: blur(12px) saturate(1.08);
  backdrop-filter: blur(12px) saturate(1.08);
}

.fluid-float__stage::after {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 8px;
  pointer-events: none;
  border-radius: 13px;
  background:
    linear-gradient(155deg, rgba(255, 244, 248, 0.08), transparent 38%),
    radial-gradient(110% 80% at 50% 100%, rgba(18, 27, 61, 0.16), transparent 58%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 18px 34px -24px rgba(255, 255, 255, 0.35);
}

.fluid-float__stage :deep(.fluid-tank) {
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(14, 32, 61, 0.42);
  box-shadow:
    0 14px 34px -25px rgba(27, 43, 92, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.fluid-float__stage :deep(.fluid-tank--compact) {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 328px;
  height: 200px;
  max-width: none;
  aspect-ratio: auto;
}

.fluid-float__stage :deep(.fluid-tank__canvas) {
  opacity: 0.8;
  filter: saturate(0.88) contrast(0.95) brightness(0.97);
}

.fluid-float__tools {
  position: absolute;
  z-index: 5;
  top: 17px;
  right: 17px;
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
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 50%;
  background: rgba(252, 248, 250, 0.62);
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

.dark .fluid-float__stage {
  border-color: rgba(255, 255, 255, 0.13);
  background:
    linear-gradient(145deg, rgba(34, 32, 45, 0.68), rgba(25, 25, 39, 0.46)),
    rgba(20, 22, 34, 0.34);
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
    width: 100%;
  }

  .fluid-float :deep(.hero-rig__layer),
  .fluid-float :deep(.hero-rig__debug) {
    display: none;
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
