<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{
  quality1080Src: string
  quality720Src?: string
  poster?: string
  label?: string
}>()

const mobile = ref(false)
const slowNetwork = ref(false)
const selectedQuality = ref<'auto' | '1080p' | '720p'>('auto')
const videoEl = ref<HTMLVideoElement | null>(null)
let query: MediaQueryList | undefined
let connection: (EventTarget & { saveData?: boolean; effectiveType?: string }) | undefined
let resumeTime = 0
let resumePlaying = false

const activeQuality = computed<'1080p' | '720p'>(() => {
  if (selectedQuality.value !== 'auto') return selectedQuality.value
  return mobile.value || slowNetwork.value ? '720p' : '1080p'
})

const activeSrc = computed(() => {
  const source =
    activeQuality.value === '720p'
      ? props.quality720Src || props.quality1080Src
      : props.quality1080Src
  return withBase(source)
})

function syncViewport(event?: MediaQueryListEvent) {
  mobile.value = event?.matches ?? query?.matches ?? false
}

function syncNetwork() {
  slowNetwork.value =
    Boolean(connection?.saveData) ||
    ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
}

function rememberPlayback() {
  const video = videoEl.value
  if (!video) return
  resumeTime = video.currentTime
  resumePlaying = !video.paused && !video.ended
}

function restorePlayback() {
  const video = videoEl.value
  if (!video) return
  if (resumeTime > 0) video.currentTime = Math.min(resumeTime, video.duration || resumeTime)
  if (resumePlaying) void video.play().catch(() => {})
  resumeTime = 0
  resumePlaying = false
}

onMounted(() => {
  query = window.matchMedia('(max-width: 820px)')
  syncViewport()
  query.addEventListener?.('change', syncViewport)

  connection = (navigator as Navigator & {
    connection?: EventTarget & { saveData?: boolean; effectiveType?: string }
  }).connection
  syncNetwork()
  connection?.addEventListener?.('change', syncNetwork)
})

onBeforeUnmount(() => {
  query?.removeEventListener?.('change', syncViewport)
  connection?.removeEventListener?.('change', syncNetwork)
})

watch(
  activeSrc,
  () => {
    rememberPlayback()
    if (resumePlaying) {
      void nextTick(() => videoEl.value?.load())
    }
  },
  { flush: 'pre' },
)
</script>

<template>
  <div class="responsive-video-shell">
    <div class="responsive-video__quality">
      <span>清晰度</span>
      <select v-model="selectedQuality" aria-label="视频清晰度">
        <option value="auto">自动</option>
        <option value="1080p">1080p</option>
        <option value="720p">720p</option>
      </select>
      <small v-if="selectedQuality === 'auto'">当前 {{ activeQuality }}</small>
    </div>
    <video
      ref="videoEl"
      class="responsive-video"
      controls
      playsinline
      preload="none"
      :src="activeSrc"
      :poster="poster ? withBase(poster) : undefined"
      :aria-label="label"
      @loadedmetadata="restorePlayback"
    >
      当前浏览器不支持 HTML5 视频播放。
    </video>
  </div>
</template>

<style scoped>
.responsive-video-shell {
  width: 100%;
  max-width: 900px;
  margin: 18px auto;
}

.responsive-video__quality {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.responsive-video__quality select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  padding: 4px 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  cursor: pointer;
}

.responsive-video__quality small {
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
}

.responsive-video {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 12px;
  background: #000;
}

@media (max-width: 640px) {
  .responsive-video__quality {
    justify-content: flex-start;
  }
}
</style>
