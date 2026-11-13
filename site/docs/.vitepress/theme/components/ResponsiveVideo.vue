<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{
  desktopSrc: string
  mobileSrc?: string
  poster?: string
  label?: string
}>()

const mobile = ref(false)
let query: MediaQueryList | undefined

const activeSrc = computed(() =>
  withBase((mobile.value && props.mobileSrc) || props.desktopSrc),
)

function syncViewport(event?: MediaQueryListEvent) {
  mobile.value = event?.matches ?? query?.matches ?? false
}

onMounted(() => {
  query = window.matchMedia('(max-width: 820px)')
  syncViewport()
  query.addEventListener?.('change', syncViewport)
})

onBeforeUnmount(() => {
  query?.removeEventListener?.('change', syncViewport)
})
</script>

<template>
  <video
    :key="activeSrc"
    class="responsive-video"
    controls
    playsinline
    preload="none"
    :poster="poster ? withBase(poster) : undefined"
    :aria-label="label"
  >
    <source :src="activeSrc" type="video/mp4">
    当前浏览器不支持 HTML5 视频播放。
  </video>
</template>

<style scoped>
.responsive-video {
  display: block;
  width: 100%;
  max-width: 900px;
  height: auto;
  margin: 18px auto;
  border-radius: 12px;
  background: #000;
}
</style>
