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

let ready = false
let scatterFrame = 0
let observer: MutationObserver | undefined

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function clearScatter() {
  document.querySelectorAll('.sidebar-q-canvas').forEach((node) => node.remove())
}

function scatterQ() {
  const sidebar = root.value?.closest('.VPSidebar') as HTMLElement | null
  const nav = sidebar?.querySelector<HTMLElement>('.nav')
  if (!sidebar || !nav) return

  clearScatter()
  const sidebarRect = sidebar.getBoundingClientRect()
  const navRect = nav.getBoundingClientRect()
  const gutter = Math.floor(navRect.left - sidebarRect.left)
  const height = Math.floor(nav.scrollHeight)
  if (gutter < 100 || height < 180) return

  const layer = document.createElement('div')
  layer.className = 'sidebar-q-canvas'
  layer.style.left = '6px'
  layer.style.top = `${Math.max(0, Math.floor(navRect.top - sidebarRect.top + sidebar.scrollTop))}px`
  layer.style.width = `${gutter - 12}px`
  layer.style.height = `${height}px`

  const count = Math.max(18, Math.min(28, Math.round(height / 38)))
  const bandHeight = height / count
  const picked = shuffle(assets)
  const maxSize = Math.min(50, gutter * 0.38)
  const minSize = Math.max(24, maxSize - 14)
  const contentWidth = gutter - 12
  const columns = contentWidth >= 150 ? 3 : 2
  const columnWidth = contentWidth / columns

  for (let index = 0; index < count; index++) {
    const size = minSize + Math.random() * (maxSize - minSize)
    const column = index % columns
    const maxX = Math.max(0, columnWidth - size)
    const bandTop = index * bandHeight
    const maxY = Math.max(0, bandHeight - size)
    const centerY = bandTop + bandHeight / 2
    const jitterY = (Math.random() - 0.5) * Math.min(9, bandHeight * 0.24)
    const image = document.createElement('img')

    image.className = 'sidebar-q-scatter'
    image.src = picked[index % picked.length]
    image.alt = ''
    image.decoding = 'async'
    image.draggable = false
    image.style.left = `${column * columnWidth + Math.random() * maxX}px`
    image.style.top = `${Math.max(
      bandTop,
      Math.min(bandTop + maxY, centerY - size / 2 + jitterY),
    ).toFixed(1)}px`
    image.style.width = `${size.toFixed(1)}px`
    image.style.height = `${size.toFixed(1)}px`
    image.style.transform = `rotate(${(-12 + Math.random() * 24).toFixed(1)}deg)`
    layer.appendChild(image)
  }

  sidebar.appendChild(layer)
}

function scheduleScatter() {
  if (scatterFrame) return
  scatterFrame = requestAnimationFrame(() => {
    scatterFrame = 0
    scatterQ()
  })
}

onMounted(async () => {
  ready = true
  await nextTick()
  scatterQ()

  const nav = root.value?.closest('.VPSidebar')?.querySelector('.nav')
  if (nav) {
    observer = new MutationObserver(scheduleScatter)
    observer.observe(nav, { childList: true, subtree: true })
  }
  window.addEventListener('resize', scheduleScatter)
})

watch(
  () => route.path,
  () => {
    if (ready) nextTick(scheduleScatter)
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(scatterFrame)
  clearScatter()
  window.removeEventListener('resize', scheduleScatter)
})
</script>

<template>
  <div ref="root" class="sidebar-q-hook" aria-hidden="true" />
</template>

<style scoped>
.sidebar-q-hook {
  display: none;
}

:global(.sidebar-q-canvas) {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  user-select: none;
}

:global(.sidebar-q-scatter) {
  position: absolute;
  display: block;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 4px 4px rgba(55, 45, 70, 0.18));
}

:global(.dark .sidebar-q-scatter) {
  filter: drop-shadow(0 4px 5px rgba(0, 0, 0, 0.34));
}
</style>
