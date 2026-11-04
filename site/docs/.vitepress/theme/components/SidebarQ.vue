<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const root = ref<HTMLDivElement | null>(null)
const selected = ref<string[]>([])
const gridStyle = ref<Record<string, string>>({})

let ready = false
let resizeFrame = 0
let resizeObserver: ResizeObserver | undefined

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function fillSidebar() {
  const element = root.value
  const sidebar = element?.closest('.VPSidebar') as HTMLElement | null
  if (!element || !sidebar) return

  const rootRect = element.getBoundingClientRect()
  const sidebarRect = sidebar.getBoundingClientRect()
  const available = Math.floor(sidebarRect.bottom - rootRect.top - 60)
  const width = Math.floor(rootRect.width)

  if (available < 48 || width < 100) {
    selected.value = []
    return
  }

  const gap = 5
  const columns = width >= 180 ? 3 : 2
  const cell = Math.floor((width - gap * (columns - 1)) / columns)
  const rows = Math.max(1, Math.min(6, Math.floor((available + gap) / (cell + gap))))
  const visibleHeight = rows * cell + gap * (rows - 1)
  const count = columns * rows

  selected.value = shuffle(assets).slice(0, count)
  gridStyle.value = {
    '--q-columns': String(columns),
    '--q-rows': String(rows),
    '--q-height': `${Math.min(available, visibleHeight)}px`,
  }
}

function scheduleFill() {
  if (resizeFrame) return
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0
    fillSidebar()
  })
}

onMounted(async () => {
  ready = true
  await nextTick()
  fillSidebar()
  const sidebar = root.value?.closest('.VPSidebar')
  if (sidebar) {
    resizeObserver = new ResizeObserver(scheduleFill)
    resizeObserver.observe(sidebar)
  }
  window.addEventListener('resize', scheduleFill)
})

watch(
  () => route.path,
  () => {
    if (ready) nextTick(fillSidebar)
  },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(resizeFrame)
  window.removeEventListener('resize', scheduleFill)
})
</script>

<template>
  <div ref="root" class="sidebar-q" aria-hidden="true">
    <div v-if="selected.length" class="sidebar-q__grid" :style="gridStyle">
      <span v-for="asset in selected" :key="asset" class="sidebar-q__cell">
        <img :src="asset" alt="" decoding="async" draggable="false" />
      </span>
    </div>
  </div>
</template>

<style scoped>
.sidebar-q {
  box-sizing: border-box;
  width: 100%;
  margin: 14px auto 8px;
  padding: 0 8px;
  pointer-events: none;
  user-select: none;
}

.sidebar-q__grid {
  height: var(--q-height, 0);
  display: grid;
  grid-template-columns: repeat(var(--q-columns, 3), minmax(0, 1fr));
  grid-template-rows: repeat(var(--q-rows, 1), minmax(0, 1fr));
  gap: 5px;
}

.sidebar-q__cell {
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.16);
}

.sidebar-q__cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: auto;
  filter: drop-shadow(0 5px 5px rgba(55, 45, 70, 0.16));
}

.dark .sidebar-q__cell {
  background: rgba(255, 255, 255, 0.04);
}

@media (max-width: 959px) {
  .sidebar-q {
    margin-top: 16px;
  }
}
</style>
