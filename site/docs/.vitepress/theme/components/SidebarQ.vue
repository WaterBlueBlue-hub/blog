<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, withBase } from 'vitepress'

const groups = [
  { prefix: 'lok', count: 6 },
  { prefix: 'star', count: 69 },
  { prefix: 'mujica', count: 14 },
  { prefix: 'mygo', count: 9 },
]

const assets = groups.flatMap(({ prefix, count }) =>
  Array.from({ length: count }, (_, index) =>
    withBase(`/sidebar-q/${prefix}-${String(index + 1).padStart(2, '0')}.webp`),
  ),
)

const route = useRoute()
const selected = ref('')
const spriteStyle = ref<Record<string, string>>({})

let ready = false
let previous = ''

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function pickQ() {
  let next = randomItem(assets)
  if (assets.length > 1) {
    while (next === previous) next = randomItem(assets)
  }

  const duration = 5.4 + Math.random() * 2.6
  const phase = Math.random() * duration
  const scale = 0.92 + Math.random() * 0.1
  const drift = 4 + Math.random() * 5

  previous = next
  selected.value = next
  spriteStyle.value = {
    '--q-duration': `${duration.toFixed(2)}s`,
    '--q-delay': `${(-phase).toFixed(2)}s`,
    '--q-scale': scale.toFixed(3),
    '--q-drift': `${drift.toFixed(1)}px`,
  }
}

onMounted(() => {
  ready = true
  pickQ()
})

watch(
  () => route.path,
  () => {
    if (ready) pickQ()
  },
)
</script>

<template>
  <div v-if="selected" class="sidebar-q" aria-hidden="true">
    <img
      class="sidebar-q__sprite"
      :src="selected"
      :style="spriteStyle"
      alt=""
      decoding="async"
      draggable="false"
    />
  </div>
</template>

<style scoped>
.sidebar-q {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 14px auto 8px;
  padding: 0 8px 0 40px;
  pointer-events: none;
  user-select: none;
}

.sidebar-q__sprite {
  display: block;
  width: auto;
  max-width: min(140px, 100%);
  max-height: 126px;
  object-fit: contain;
  image-rendering: auto;
  transform-origin: 50% 82%;
  filter: drop-shadow(0 12px 13px rgba(55, 45, 70, 0.2));
  animation: sidebar-q-float var(--q-duration, 6s) ease-in-out infinite;
  animation-delay: var(--q-delay, 0s);
  will-change: transform;
}

@keyframes sidebar-q-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(-1deg) scale(var(--q-scale, 1));
  }

  50% {
    transform: translate3d(var(--q-drift, 6px), -9px, 0) rotate(1.2deg)
      scale(var(--q-scale, 1));
  }
}

.dark .sidebar-q__sprite {
  filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.35));
}

@media (max-width: 959px) {
  .sidebar-q {
    margin-top: 16px;
  }

  .sidebar-q__sprite {
    max-width: 132px;
    max-height: 118px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-q__sprite {
    animation: none;
    transform: scale(var(--q-scale, 1));
  }
}
</style>
