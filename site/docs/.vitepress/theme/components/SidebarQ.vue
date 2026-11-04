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
let decorateFrame = 0
let observer: MutationObserver | undefined

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function clearAvatars() {
  document.querySelectorAll('.sidebar-q-avatar').forEach((node) => node.remove())
  document.querySelectorAll('.sidebar-q-with-avatar').forEach((node) => {
    node.classList.remove('sidebar-q-with-avatar')
  })
}

function decorateSidebar() {
  const sidebar = root.value?.closest('.VPSidebar')
  if (!sidebar) return

  clearAvatars()
  const items = Array.from(
    sidebar.querySelectorAll<HTMLElement>('.VPSidebarItem.level-0 > .item'),
  ).filter((item) => item.querySelector('.text'))
  if (!items.length) return

  const picked = shuffle(assets)
  items.forEach((item, index) => {
    const size = 32 + Math.random() * 13
    const offsetX = -27 + Math.random() * 10
    const offsetY = -5 + Math.random() * 10
    const rotation = -9 + Math.random() * 18
    const image = document.createElement('img')

    image.className = 'sidebar-q-avatar'
    image.src = picked[index % picked.length]
    image.alt = ''
    image.decoding = 'async'
    image.draggable = false
    image.style.width = `${size.toFixed(1)}px`
    image.style.height = `${size.toFixed(1)}px`
    image.style.left = `${offsetX.toFixed(1)}px`
    image.style.top = `calc(50% + ${offsetY.toFixed(1)}px)`
    image.style.transform = `translateY(-50%) rotate(${rotation.toFixed(1)}deg)`

    item.classList.add('sidebar-q-with-avatar')
    item.prepend(image)
  })
}

function scheduleDecorate() {
  if (decorateFrame) return
  decorateFrame = requestAnimationFrame(() => {
    decorateFrame = 0
    decorateSidebar()
  })
}

onMounted(async () => {
  ready = true
  await nextTick()
  decorateSidebar()

  const sidebar = root.value?.closest('.VPSidebar')
  if (sidebar) {
    observer = new MutationObserver((mutations) => {
      const externalChange = mutations.some((mutation) =>
        [...mutation.addedNodes, ...mutation.removedNodes].some(
          (node) =>
            node.nodeType === 1 &&
            !(node as Element).classList.contains('sidebar-q-avatar'),
        ),
      )
      if (externalChange) scheduleDecorate()
    })
    observer.observe(sidebar, { childList: true, subtree: true })
  }
})

watch(
  () => route.path,
  () => {
    if (ready) nextTick(scheduleDecorate)
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(decorateFrame)
  clearAvatars()
})
</script>

<template>
  <div ref="root" class="sidebar-q-hook" aria-hidden="true" />
</template>

<style scoped>
.sidebar-q-hook {
  display: none;
}

:global(.sidebar-q-with-avatar) {
  box-sizing: border-box;
  padding-left: 20px;
}

:global(.sidebar-q-avatar) {
  position: absolute;
  z-index: 2;
  display: block;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 3px 3px rgba(55, 45, 70, 0.18));
}

:global(.dark) :global(.sidebar-q-avatar) {
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.32));
}
</style>
