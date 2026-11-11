<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  OPEN_CARD_EDITOR_EVENT,
  cardEditorState,
  clearPublishingToken,
  coverCropStyle,
  exportCardOverrides,
  fileToCoverDataUrl,
  getPublishingToken,
  initializeCardEditor,
  isGifCover,
  resolveCoverImage,
  resetAllCardOverrides,
  resetCardOverride,
  setCardEditorActive,
  setPublishingToken,
  storeCoverDataUrl,
  updateCardOverride,
  type CoverCrop,
  type EditableCardPayload,
} from '../composables/cardEditor'
import {
  publishCardOverrides,
  validatePublishingToken,
} from '../composables/cardPublisher'
const editingCard = ref<EditableCardPayload | null>(null)
const draftImage = ref('')
const draftImageCrop = ref<CoverCrop>()
const uploadError = ref('')
const isSaving = ref(false)
const cropStage = ref<HTMLElement | null>(null)
const cropImageElement = ref<HTMLImageElement | null>(null)
const cropSourceUrl = ref('')
const CROP_ZOOM_MIN = 1
const CROP_ZOOM_MAX = 2
const CROP_ZOOM_DEFAULT = 1.5
const cropZoom = ref(CROP_ZOOM_DEFAULT)
const cropOffset = reactive({ x: 0, y: 0 })
const cropNatural = reactive({ width: 1, height: 1 })
const cropSize = reactive({ width: 1, height: 1 })
const isCropping = ref(false)
const setupOpen = ref(false)
const setupToken = ref('')
const setupError = ref('')
const isCheckingToken = ref(false)
const isPublishing = ref(false)
const publishMessage = ref('')
const form = reactive({
  title: '',
  date: '',
  topic: '',
  excerpt: '',
  tags: '',
})
let cropObjectUrl = ''
let dragOrigin: { pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null = null

const imagePreview = computed(() => {
  if (!draftImage.value) return ''
  if (draftImage.value.startsWith('idb://') && editingCard.value) {
    return resolveCoverImage(
      editingCard.value.kind,
      editingCard.value.id,
      draftImage.value,
    )
  }
  if (/^(data:|https?:)/.test(draftImage.value)) return draftImage.value
  return withBase(draftImage.value)
})
const coverIsGif = computed(() => isGifCover(draftImage.value))
const imagePreviewStyle = computed(() => coverCropStyle(draftImageCrop.value))
const editorKindLabel = computed(() => {
  if (!editingCard.value) return ''
  return {
    article: 'ARTICLE',
    note: 'NOTE',
    project: 'PROJECT',
  }[editingCard.value.kind]
})

const cropImageStyle = computed(() => {
  const scale = Math.max(cropSize.width / cropNatural.width, cropSize.height / cropNatural.height) *
    cropZoom.value
  return {
    width: `${cropNatural.width * scale}px`,
    height: `${cropNatural.height * scale}px`,
    transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
  }
})

function openEditor(event: Event) {
  const payload = (event as CustomEvent<EditableCardPayload>).detail
  if (!payload || !cardEditorState.active) return

  editingCard.value = payload
  uploadError.value = ''
  draftImage.value = payload.image ?? ''
  draftImageCrop.value = payload.imageCrop ? { ...payload.imageCrop } : undefined
  Object.assign(form, {
    title: payload.title,
    date: payload.date,
    topic: payload.topic,
    excerpt: payload.excerpt,
    tags: payload.tags.join(', '),
  })
}

function closeEditor() {
  cancelCrop()
  editingCard.value = null
  uploadError.value = ''
}

async function saveEditor() {
  if (!editingCard.value || isSaving.value) return

  isSaving.value = true
  try {
    let image = draftImage.value
    if (image.startsWith('data:image/gif')) {
      image = await storeCoverDataUrl(editingCard.value.kind, editingCard.value.id, image)
    }

    updateCardOverride(editingCard.value.kind, editingCard.value.id, {
      title: form.title.trim(),
      date: form.date.trim(),
      topic: form.topic.trim(),
      excerpt: form.excerpt.trim(),
      tags: form.tags
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      image,
      imageCrop: draftImageCrop.value,
    })
    closeEditor()
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : '卡片保存失败'
  } finally {
    isSaving.value = false
  }
}

function restoreDefault() {
  if (!editingCard.value) return
  resetCardOverride(editingCard.value.kind, editingCard.value.id)
  closeEditor()
}

function revokeCropObjectUrl() {
  if (cropObjectUrl) {
    URL.revokeObjectURL(cropObjectUrl)
    cropObjectUrl = ''
  }
}

function cancelCrop() {
  isCropping.value = false
  cropSourceUrl.value = ''
  cropZoom.value = CROP_ZOOM_DEFAULT
  cropOffset.x = 0
  cropOffset.y = 0
  revokeCropObjectUrl()
}

async function loadCropSource(source: string, initialCrop?: CoverCrop) {
  uploadError.value = ''
  const probe = new Image()
  probe.crossOrigin = /^https?:/.test(source) ? 'anonymous' : ''

  try {
    await new Promise<void>((resolve, reject) => {
      probe.addEventListener('load', () => resolve())
      probe.addEventListener('error', () => reject(new Error('封面图片无法读取')))
      probe.src = source
    })

    cropNatural.width = probe.naturalWidth
    cropNatural.height = probe.naturalHeight
    cropZoom.value = initialCrop?.zoom ?? CROP_ZOOM_DEFAULT
    cropOffset.x = 0
    cropOffset.y = 0
    cropSourceUrl.value = source
    isCropping.value = true
    await nextTick()
    measureCropStage()
    if (initialCrop) {
      const scale =
        Math.max(cropSize.width / cropNatural.width, cropSize.height / cropNatural.height) *
        cropZoom.value
      cropOffset.x = (0.5 - initialCrop.focusX) * cropNatural.width * scale
      cropOffset.y = (0.5 - initialCrop.focusY) * cropNatural.height * scale
      clampCropOffset()
    }
  } catch (error) {
    cancelCrop()
    uploadError.value = error instanceof Error ? error.message : '封面处理失败'
  }
}

async function updateCover(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const isGif = file.type === 'image/gif' || /\.gif$/i.test(file.name)
  if (!file.type.startsWith('image/') && !isGif) {
    uploadError.value = '请选择图片文件'
    return
  }

  revokeCropObjectUrl()
  if (isGif) {
    cancelCrop()
    try {
      draftImage.value = await fileToCoverDataUrl(file)
      draftImageCrop.value = undefined
      uploadError.value = ''
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : 'GIF 封面读取失败'
    }
    return
  }

  draftImageCrop.value = undefined
  cropObjectUrl = URL.createObjectURL(file)
  await loadCropSource(cropObjectUrl)
}

function cropCurrentCover() {
  if (imagePreview.value) {
    loadCropSource(imagePreview.value, coverIsGif.value ? draftImageCrop.value : undefined)
  }
}

function clearCover() {
  draftImage.value = ''
  draftImageCrop.value = undefined
  cancelCrop()
}

function measureCropStage() {
  if (!cropStage.value) return
  const rect = cropStage.value.getBoundingClientRect()
  cropSize.width = Math.max(1, rect.width)
  cropSize.height = Math.max(1, rect.height)
  clampCropOffset()
}

function clampCropOffset() {
  const scale = Math.max(cropSize.width / cropNatural.width, cropSize.height / cropNatural.height) *
    cropZoom.value
  const maxX = Math.max(0, (cropNatural.width * scale - cropSize.width) / 2)
  const maxY = Math.max(0, (cropNatural.height * scale - cropSize.height) / 2)
  cropOffset.x = Math.max(-maxX, Math.min(maxX, cropOffset.x))
  cropOffset.y = Math.max(-maxY, Math.min(maxY, cropOffset.y))
}

function startCropDrag(event: PointerEvent) {
  if (!cropStage.value) return
  cropStage.value.setPointerCapture(event.pointerId)
  dragOrigin = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    offsetX: cropOffset.x,
    offsetY: cropOffset.y,
  }
}

function moveCropDrag(event: PointerEvent) {
  if (!dragOrigin) return
  cropOffset.x = dragOrigin.offsetX + event.clientX - dragOrigin.pointerX
  cropOffset.y = dragOrigin.offsetY + event.clientY - dragOrigin.pointerY
  clampCropOffset()
}

function endCropDrag() {
  dragOrigin = null
}

function applyCrop() {
  if (!cropImageElement.value) return

  const scale = Math.max(cropSize.width / cropNatural.width, cropSize.height / cropNatural.height) *
    cropZoom.value
  const displayWidth = cropNatural.width * scale
  const displayHeight = cropNatural.height * scale
  const imageLeft = (cropSize.width - displayWidth) / 2 + cropOffset.x
  const imageTop = (cropSize.height - displayHeight) / 2 + cropOffset.y
  const sourceX = Math.max(0, -imageLeft / scale)
  const sourceY = Math.max(0, -imageTop / scale)
  const sourceWidth = Math.min(cropNatural.width - sourceX, cropSize.width / scale)
  const sourceHeight = Math.min(cropNatural.height - sourceY, cropSize.height / scale)

  if (coverIsGif.value) {
    draftImageCrop.value = {
      zoom: Number(cropZoom.value.toFixed(3)),
      focusX: Math.min(1, Math.max(0, (sourceX + sourceWidth / 2) / cropNatural.width)),
      focusY: Math.min(1, Math.max(0, (sourceY + sourceHeight / 2) / cropNatural.height)),
    }
    cancelCrop()
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 540
  const context = canvas.getContext('2d')
  if (!context) {
    uploadError.value = '浏览器无法处理封面图片'
    return
  }

  try {
    context.drawImage(
      cropImageElement.value,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    draftImage.value = canvas.toDataURL('image/webp', 0.86)
    draftImageCrop.value = undefined
    cancelCrop()
  } catch {
    uploadError.value = '这张图片受跨域限制，无法裁剪，请先下载后再上传'
  }
}

function downloadOverrides() {
  const blob = new Blob([exportCardOverrides()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'waterblue-card-overrides.json'
  link.click()
  URL.revokeObjectURL(url)
}

function clearAllOverrides() {
  if (!window.confirm('确定清除全部自定义封面和文字吗？')) return
  resetAllCardOverrides()
}

function toggleEditor() {
  if (!cardEditorState.owner) return
  setCardEditorActive(!cardEditorState.active)
  if (!cardEditorState.active) {
    closeEditor()
  }
}

function openPublishingSetup() {
  setupToken.value = ''
  setupError.value = ''
  setupOpen.value = true
}

function closePublishingSetup() {
  if (isCheckingToken.value) return
  setupOpen.value = false
  setupToken.value = ''
  setupError.value = ''
}

async function savePublishingAccess() {
  const token = setupToken.value.trim()
  if (!token || isCheckingToken.value) return

  isCheckingToken.value = true
  setupError.value = ''
  try {
    await validatePublishingToken(token)
    setPublishingToken(token)
    setCardEditorActive(true)
    setupOpen.value = false
    setupToken.value = ''
    publishMessage.value = '此浏览器已获得发布权限'
  } catch (error) {
    setupError.value = error instanceof Error ? error.message : '发布密钥验证失败'
  } finally {
    isCheckingToken.value = false
  }
}

function disconnectPublishingAccess() {
  if (!window.confirm('断开此浏览器的开发与发布权限？线上内容不会被删除。')) return
  closeEditor()
  clearPublishingToken()
  setupOpen.value = false
  publishMessage.value = ''
}

async function publishOverrides() {
  if (!cardEditorState.owner || isPublishing.value) return
  if (!window.confirm('将当前卡片修改发布到线上网站？GitHub Pages 通常会在 1–2 分钟后更新。')) {
    return
  }

  isPublishing.value = true
  publishMessage.value = '正在上传封面并提交修改…'
  try {
    const result = await publishCardOverrides(getPublishingToken())
    publishMessage.value = result.deploymentTriggered
      ? `已发布 ${result.overrideCount} 项修改；页面将在约 1–2 分钟后更新`
      : `已提交 ${result.overrideCount} 项修改，但部署未触发；请给 Token 增加 Actions 读写权限`
    console.info('Card overrides published', result)
  } catch (error) {
    publishMessage.value =
      error instanceof Error ? error.message : '发布失败，请检查 GitHub 密钥'
  } finally {
    isPublishing.value = false
  }
}

onMounted(() => {
  initializeCardEditor()
  setupOpen.value = new URLSearchParams(window.location.search).get('dev-setup') === '1'
  window.addEventListener(OPEN_CARD_EDITOR_EVENT, openEditor)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_CARD_EDITOR_EVENT, openEditor)
  revokeCropObjectUrl()
})
</script>

<template>
  <div v-if="cardEditorState.owner" class="developer-mode">
    <div v-if="cardEditorState.active" class="developer-mode__hint">
      <span>开发模式：点击任意作品、文章或笔记卡片编辑</span>
      <button type="button" :disabled="isPublishing" @click="publishOverrides">
        {{ isPublishing ? '发布中…' : '发布到线上' }}
      </button>
      <button type="button" @click="downloadOverrides">导出 JSON</button>
      <button type="button" @click="clearAllOverrides">清除全部</button>
      <button type="button" @click="openPublishingSetup">发布设置</button>
    </div>

    <button
      type="button"
      class="developer-mode__toggle"
      :class="{ 'is-active': cardEditorState.active }"
      :aria-pressed="cardEditorState.active"
      :title="cardEditorState.active ? '关闭开发模式' : '开启开发模式'"
      @click="toggleEditor"
    >
      DEV
    </button>
  </div>

  <p v-if="cardEditorState.owner && publishMessage" class="developer-mode__status">
    {{ publishMessage }}
  </p>

  <div
    v-if="setupOpen"
    class="publisher-setup"
    role="dialog"
    aria-modal="true"
    aria-labelledby="publisher-setup-title"
    @click.self="closePublishingSetup"
  >
    <form class="publisher-setup__panel" @submit.prevent="savePublishingAccess">
      <header class="publisher-setup__head">
        <div>
          <span>OWNER ACCESS</span>
          <h2 id="publisher-setup-title">开发与发布权限</h2>
        </div>
        <button type="button" aria-label="关闭" @click="closePublishingSetup">×</button>
      </header>

      <p>
        密钥只保存在当前浏览器，不会提交到网站。需要为
        <strong>waterblueblue-hub.github.io</strong> 创建仅含
        <strong>Contents</strong> 与 <strong>Actions: Read and write</strong>
        权限的细粒度 GitHub Token。
      </p>

      <a
        class="publisher-setup__link"
        href="https://github.com/settings/personal-access-tokens/new"
        target="_blank"
        rel="noreferrer"
      >
        打开 GitHub Token 创建页
      </a>

      <label>
        <span>GitHub Token</span>
        <input
          v-model="setupToken"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="github_pat_..."
        />
      </label>

      <p v-if="setupError" class="publisher-setup__error">{{ setupError }}</p>

      <footer>
        <button
          v-if="cardEditorState.owner"
          type="button"
          class="is-danger"
          @click="disconnectPublishingAccess"
        >
          断开此浏览器
        </button>
        <span v-else></span>
        <div>
          <button type="button" @click="closePublishingSetup">取消</button>
          <button type="submit" class="is-primary" :disabled="isCheckingToken">
            {{ isCheckingToken ? '验证中…' : '启用开发模式' }}
          </button>
        </div>
      </footer>
    </form>
  </div>

  <div v-if="editingCard" class="card-editor" role="dialog" aria-modal="true" @click.self="closeEditor">
    <form class="card-editor__panel" @submit.prevent="saveEditor">
      <header class="card-editor__head">
        <div>
          <span>{{ editorKindLabel }} CARD</span>
          <h2>编辑卡片</h2>
        </div>
        <button type="button" class="card-editor__close" aria-label="关闭" @click="closeEditor">
          ×
        </button>
      </header>

      <label>
        <span>标题</span>
        <input v-model="form.title" type="text" maxlength="80" />
      </label>

      <div class="card-editor__row">
        <label>
          <span>日期</span>
          <input v-model="form.date" type="text" maxlength="24" />
        </label>
        <label>
          <span>分类 / 主题</span>
          <input v-model="form.topic" type="text" maxlength="24" />
        </label>
      </div>

      <label>
        <span>摘要</span>
        <textarea v-model="form.excerpt" rows="5" maxlength="260"></textarea>
      </label>

      <label>
        <span>标签</span>
        <input v-model="form.tags" type="text" maxlength="120" placeholder="用逗号分隔" />
      </label>

      <div class="card-editor__cover">
        <div class="card-editor__preview">
          <img v-if="imagePreview" :src="imagePreview" :style="imagePreviewStyle" alt="" />
          <span v-else>暂无封面</span>
        </div>
        <div class="card-editor__cover-actions">
          <span>封面</span>
          <label class="card-editor__upload">
            选择图片 / GIF
            <input type="file" accept="image/*,.gif" @change="updateCover" />
          </label>
          <button v-if="imagePreview" type="button" @click="cropCurrentCover">
            裁剪当前封面
          </button>
          <button v-if="draftImage" type="button" @click="clearCover">清除封面</button>
          <small v-if="coverIsGif">GIF 裁剪会保留循环动画</small>
          <small v-if="uploadError">{{ uploadError }}</small>
        </div>
      </div>

      <section v-if="isCropping" class="card-editor__cropper">
        <div class="card-editor__cropper-head">
          <div>
            <span>COVER CROP</span>
            <strong>拖动图片调整画面位置</strong>
          </div>
          <button type="button" @click="cancelCrop">取消裁剪</button>
        </div>

        <div
          ref="cropStage"
          class="card-editor__crop-stage"
          @pointerdown="startCropDrag"
          @pointermove="moveCropDrag"
          @pointerup="endCropDrag"
          @pointercancel="endCropDrag"
        >
          <img
            ref="cropImageElement"
            :src="cropSourceUrl"
            :style="cropImageStyle"
            alt=""
            draggable="false"
            @load="measureCropStage"
          />
          <span class="card-editor__crop-grid" aria-hidden="true"></span>
          <span class="card-editor__crop-frame" aria-hidden="true"></span>
        </div>

        <label class="card-editor__zoom">
          <span>缩放</span>
          <input
            v-model.number="cropZoom"
            type="range"
            :min="CROP_ZOOM_MIN"
            :max="CROP_ZOOM_MAX"
            step="0.01"
            @input="clampCropOffset"
          />
        </label>

        <button type="button" class="card-editor__crop-apply" @click="applyCrop">应用裁剪</button>
      </section>

      <footer class="card-editor__actions">
        <button type="button" class="is-muted" @click="restoreDefault">恢复默认</button>
        <div>
          <button type="button" class="is-muted" @click="closeEditor">取消</button>
          <button type="submit" class="is-primary">保存</button>
        </div>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.developer-mode {
  position: fixed;
  z-index: 80;
  bottom: 22px;
  left: 20px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.developer-mode__toggle {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: rgba(32, 34, 46, 0.78);
  color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 28px -16px rgba(24, 20, 37, 0.86);
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  cursor: pointer;
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.developer-mode__toggle.is-active {
  border-color: rgba(114, 196, 255, 0.72);
  background: #2f6df6;
  box-shadow:
    0 0 0 5px rgba(47, 109, 246, 0.13),
    0 14px 30px -16px rgba(24, 59, 150, 0.9);
}

.developer-mode__hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px 7px 12px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 12px;
  background: rgba(30, 31, 44, 0.82);
  color: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 30px -18px rgba(20, 20, 32, 0.9);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.developer-mode__hint span {
  font-size: 11px;
}

.developer-mode__hint button {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 7px;
  padding: 4px 7px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.76);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.developer-mode__hint button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.developer-mode__status {
  position: fixed;
  z-index: 81;
  bottom: 74px;
  left: 20px;
  max-width: min(440px, calc(100vw - 40px));
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 9px;
  padding: 7px 10px;
  background: rgba(26, 28, 40, 0.88);
  color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 28px -18px rgba(20, 20, 32, 0.9);
  font-size: 11px;
  line-height: 1.5;
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.publisher-setup {
  position: fixed;
  z-index: 110;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 19, 27, 0.5);
  -webkit-backdrop-filter: blur(7px);
  backdrop-filter: blur(7px);
}

.publisher-setup__panel {
  display: grid;
  width: min(520px, 100%);
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 18px;
  padding: 24px;
  background: #f7f3f7;
  color: #282530;
  box-shadow: 0 30px 90px -36px rgba(20, 18, 30, 0.72);
}

.publisher-setup__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.publisher-setup__head span {
  color: #7d7686;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.8px;
}

.publisher-setup__head h2 {
  margin: 4px 0 0;
  border: 0;
  padding: 0;
  color: #201e27;
  font-size: 24px;
}

.publisher-setup__head button {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(70, 62, 80, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.68);
  color: #544e5b;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.publisher-setup__panel > p {
  margin: 0;
  color: #625c69;
  font-size: 13px;
  line-height: 1.7;
}

.publisher-setup__panel label > span {
  display: block;
  margin-bottom: 6px;
  color: #7d7686;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.7px;
}

.publisher-setup__panel input {
  width: 100%;
  border: 1px solid rgba(70, 62, 80, 0.16);
  border-radius: 9px;
  padding: 10px 11px;
  background: rgba(255, 255, 255, 0.76);
  color: #29252f;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  outline: none;
}

.publisher-setup__panel input:focus {
  border-color: rgba(47, 109, 246, 0.48);
  box-shadow: 0 0 0 3px rgba(47, 109, 246, 0.09);
}

.publisher-setup__link {
  width: fit-content;
  color: #2f6df6;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.publisher-setup__error {
  color: #b83f50 !important;
}

.publisher-setup__panel footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.publisher-setup__panel footer > div {
  display: flex;
  gap: 8px;
}

.publisher-setup__panel footer button {
  border: 1px solid rgba(70, 62, 80, 0.14);
  border-radius: 8px;
  padding: 8px 11px;
  background: rgba(255, 255, 255, 0.72);
  color: #514b59;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.publisher-setup__panel footer .is-primary {
  border-color: #2f6df6;
  background: #2f6df6;
  color: #fff;
}

.publisher-setup__panel footer .is-danger {
  color: #a93648;
}

.publisher-setup__panel footer button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.card-editor {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(26, 24, 33, 0.32);
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
}

.card-editor__panel {
  display: flex;
  width: min(430px, calc(100vw - 24px));
  height: 100%;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding: 24px;
  background: #f7f3f7;
  color: #25232d;
  box-shadow: -18px 0 60px -34px rgba(22, 20, 30, 0.7);
}

.card-editor__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 2px;
}

.card-editor__head span,
.card-editor label > span,
.card-editor__cover-actions > span {
  display: block;
  margin-bottom: 6px;
  color: #7d7686;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  letter-spacing: 0.7px;
}

.card-editor__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
  color: #201e27;
  font-size: 24px;
}

.card-editor__close {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(70, 62, 80, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.68);
  color: #544e5b;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.card-editor label {
  display: block;
}

.card-editor input,
.card-editor textarea {
  width: 100%;
  border: 1px solid rgba(70, 62, 80, 0.15);
  border-radius: 9px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.76);
  color: #29252f;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.card-editor input:focus,
.card-editor textarea:focus {
  border-color: rgba(47, 109, 246, 0.48);
  box-shadow: 0 0 0 3px rgba(47, 109, 246, 0.09);
}

.card-editor textarea {
  resize: vertical;
  line-height: 1.7;
}

.card-editor__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.card-editor__cover {
  display: grid;
  grid-template-columns: 118px 1fr;
  gap: 14px;
  padding: 12px;
  border: 1px solid rgba(70, 62, 80, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.46);
}

.card-editor__preview {
  display: grid;
  min-height: 96px;
  overflow: hidden;
  place-items: center;
  border-radius: 9px;
  background: linear-gradient(135deg, #34333d, #898188);
  color: rgba(255, 255, 255, 0.64);
  font-size: 10px;
}

.card-editor__preview img {
  width: 100%;
  height: 100%;
  max-height: 150px;
  object-fit: cover;
  object-position: var(--cover-crop-x, 50%) var(--cover-crop-y, 50%);
  transform: scale(var(--cover-crop-zoom, 1));
  transform-origin: var(--cover-crop-x, 50%) var(--cover-crop-y, 50%);
}

.card-editor__cover-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.card-editor__cover-actions button,
.card-editor__upload,
.card-editor__actions button {
  border: 1px solid rgba(70, 62, 80, 0.14);
  border-radius: 8px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.72);
  color: #514b59;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.card-editor__upload input {
  display: none;
}

.card-editor__cover-actions small {
  color: #b44758;
  font-size: 10px;
}

.card-editor__cropper {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(47, 109, 246, 0.2);
  border-radius: 12px;
  background: rgba(47, 109, 246, 0.045);
}

.card-editor__cropper-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-editor__cropper-head span {
  display: block;
  margin-bottom: 3px;
  color: #7d7686;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  letter-spacing: 0.8px;
}

.card-editor__cropper-head strong {
  color: #4e4857;
  font-size: 12px;
  font-weight: 500;
}

.card-editor__cropper-head button,
.card-editor__crop-apply {
  border: 1px solid rgba(70, 62, 80, 0.14);
  border-radius: 8px;
  padding: 6px 9px;
  background: rgba(255, 255, 255, 0.72);
  color: #514b59;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.card-editor__crop-stage {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 9px;
  background: #17171e;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.card-editor__crop-stage:active {
  cursor: grabbing;
}

.card-editor__crop-stage > img {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  max-height: none;
  object-fit: fill;
  pointer-events: none;
  transform-origin: center;
  user-select: none;
}

.card-editor__crop-grid,
.card-editor__crop-frame {
  position: absolute;
  pointer-events: none;
}

.card-editor__crop-grid {
  inset: 0;
  background:
    linear-gradient(
      90deg,
      transparent calc(33.333% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(33.333% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(33.333% + 0.5px),
      transparent calc(33.333% + 0.5px),
      transparent calc(66.666% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(66.666% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(66.666% + 0.5px),
      transparent calc(66.666% + 0.5px)
    ),
    linear-gradient(
      transparent calc(33.333% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(33.333% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(33.333% + 0.5px),
      transparent calc(33.333% + 0.5px),
      transparent calc(66.666% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(66.666% - 0.5px),
      rgba(255, 255, 255, 0.36) calc(66.666% + 0.5px),
      transparent calc(66.666% + 0.5px)
    );
}

.card-editor__crop-frame {
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(24, 24, 31, 0.24);
}

.card-editor__zoom {
  display: grid;
  grid-template-columns: 38px 1fr;
  align-items: center;
  gap: 8px;
}

.card-editor__zoom > span {
  margin: 0;
}

.card-editor__zoom input {
  height: 18px;
  padding: 0;
  accent-color: #2f6df6;
}

.card-editor__crop-apply {
  justify-self: end;
  border-color: #2f6df6;
  background: #2f6df6;
  color: #fff;
}

.card-editor__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: auto;
  padding-top: 4px;
}

.card-editor__actions > div {
  display: flex;
  gap: 8px;
}

.card-editor__actions .is-primary {
  border-color: #2f6df6;
  background: #2f6df6;
  color: #fff;
}

.dark .card-editor__panel {
  background: #1c1d28;
  color: #ebe8f0;
}

.dark .publisher-setup__panel {
  background: #1c1d28;
  color: #ebe8f0;
}

.dark .publisher-setup__head h2 {
  color: #f1eef5;
}

.dark .publisher-setup__panel > p,
.dark .publisher-setup__head span,
.dark .publisher-setup__panel label > span {
  color: #aaa4b2;
}

.dark .publisher-setup__panel input,
.dark .publisher-setup__head button,
.dark .publisher-setup__panel footer button:not(.is-primary) {
  border-color: rgba(255, 255, 255, 0.13);
  background: rgba(255, 255, 255, 0.06);
  color: #f1eef5;
}

.dark .card-editor__head h2 {
  color: #f1eef5;
}

.dark .card-editor input,
.dark .card-editor textarea {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #f1eef5;
}

.dark .card-editor__cropper {
  border-color: rgba(112, 164, 255, 0.26);
  background: rgba(75, 124, 219, 0.08);
}

.dark .card-editor__cropper-head strong {
  color: #d7d2df;
}

.dark .card-editor__cropper-head button {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.07);
  color: #e5e0eb;
}

@media (max-width: 760px) {
  .developer-mode {
    bottom: 14px;
    left: 12px;
  }

  .developer-mode__hint {
    max-width: calc(100vw - 72px);
    flex-wrap: wrap;
  }

  .developer-mode__hint span {
    width: 100%;
  }

  .developer-mode__status {
    bottom: 64px;
    left: 12px;
  }

  .publisher-setup__panel {
    padding: 18px;
  }

  .card-editor__panel {
    width: 100%;
    padding: 18px;
  }
}
</style>
