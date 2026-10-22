<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  OPEN_CARD_EDITOR_EVENT,
  cardEditorState,
  exportCardOverrides,
  initializeCardEditor,
  resetAllCardOverrides,
  resetCardOverride,
  setCardEditorActive,
  updateCardOverride,
  type EditableCardPayload,
} from '../composables/cardEditor'
import {
  heroSceneSettings,
  initializeHeroSceneSettings,
  resetHeroSceneSettings,
  saveHeroSceneSettings,
} from '../composables/heroSceneSettings'

const editingCard = ref<EditableCardPayload | null>(null)
const heroSettingsOpen = ref(false)
const draftImage = ref('')
const uploadError = ref('')
const cropStage = ref<HTMLElement | null>(null)
const cropImageElement = ref<HTMLImageElement | null>(null)
const cropSourceUrl = ref('')
const cropZoom = ref(1)
const cropOffset = reactive({ x: 0, y: 0 })
const cropNatural = reactive({ width: 1, height: 1 })
const cropSize = reactive({ width: 1, height: 1 })
const isCropping = ref(false)
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
  if (/^(data:|https?:)/.test(draftImage.value)) return draftImage.value
  return withBase(draftImage.value)
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

function saveEditor() {
  if (!editingCard.value) return

  updateCardOverride(editingCard.value.kind, editingCard.value.id, {
    title: form.title.trim(),
    date: form.date.trim(),
    topic: form.topic.trim(),
    excerpt: form.excerpt.trim(),
    tags: form.tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    image: draftImage.value,
  })
  closeEditor()
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
  cropZoom.value = 1
  cropOffset.x = 0
  cropOffset.y = 0
  revokeCropObjectUrl()
}

async function loadCropSource(source: string) {
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
    cropZoom.value = 1
    cropOffset.x = 0
    cropOffset.y = 0
    cropSourceUrl.value = source
    isCropping.value = true
    await nextTick()
    measureCropStage()
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

  if (!file.type.startsWith('image/')) {
    uploadError.value = '请选择图片文件'
    return
  }

  revokeCropObjectUrl()
  cropObjectUrl = URL.createObjectURL(file)
  await loadCropSource(cropObjectUrl)
}

function cropCurrentCover() {
  if (imagePreview.value) {
    loadCropSource(imagePreview.value)
  }
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
  setCardEditorActive(!cardEditorState.active)
  if (!cardEditorState.active) {
    closeEditor()
    heroSettingsOpen.value = false
  }
}

onMounted(() => {
  initializeCardEditor()
  initializeHeroSceneSettings()
  window.addEventListener(OPEN_CARD_EDITOR_EVENT, openEditor)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_CARD_EDITOR_EVENT, openEditor)
  revokeCropObjectUrl()
})
</script>

<template>
  <div class="developer-mode">
    <div v-if="cardEditorState.active" class="developer-mode__hint">
      <span>开发模式：点击任意文章或笔记卡片编辑</span>
      <button
        type="button"
        :class="{ 'is-active': heroSettingsOpen }"
        @click="heroSettingsOpen = !heroSettingsOpen"
      >
        水池设置
      </button>
      <button type="button" @click="downloadOverrides">导出 JSON</button>
      <button type="button" @click="clearAllOverrides">清除全部</button>
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

  <section
    v-if="cardEditorState.active && heroSettingsOpen"
    class="hero-settings"
    aria-label="首页水池自定义设置"
  >
    <header class="hero-settings__head">
      <div>
        <span>HERO SCENE</span>
        <h2>首页水池</h2>
      </div>
      <button type="button" aria-label="关闭水池设置" @click="heroSettingsOpen = false">
        ×
      </button>
    </header>

    <label class="hero-settings__control">
      <span>水池宽度 <output>{{ heroSceneSettings.tankWidth }} px</output></span>
      <input
        v-model.number="heroSceneSettings.tankWidth"
        type="range"
        min="240"
        max="480"
        step="1"
        @input="saveHeroSceneSettings"
      />
    </label>

    <label class="hero-settings__control">
      <span>水池高度 <output>{{ heroSceneSettings.tankHeight }} px</output></span>
      <input
        v-model.number="heroSceneSettings.tankHeight"
        type="range"
        min="150"
        max="340"
        step="1"
        @input="saveHeroSceneSettings"
      />
    </label>

    <label class="hero-settings__control">
      <span>角色大小 <output>{{ heroSceneSettings.characterWidth }} px</output></span>
      <input
        v-model.number="heroSceneSettings.characterWidth"
        type="range"
        min="160"
        max="380"
        step="1"
        @input="saveHeroSceneSettings"
      />
    </label>

    <label class="hero-settings__control">
      <span>角色水平位置 <output>{{ heroSceneSettings.characterX }} px</output></span>
      <input
        v-model.number="heroSceneSettings.characterX"
        type="range"
        min="-320"
        max="40"
        step="1"
        @input="saveHeroSceneSettings"
      />
    </label>

    <label class="hero-settings__control">
      <span>角色垂直位置 <output>{{ heroSceneSettings.characterY }} px</output></span>
      <input
        v-model.number="heroSceneSettings.characterY"
        type="range"
        min="-100"
        max="140"
        step="1"
        @input="saveHeroSceneSettings"
      />
    </label>

    <footer class="hero-settings__actions">
      <small>调整会实时预览并自动保存</small>
      <button type="button" @click="resetHeroSceneSettings">恢复默认</button>
    </footer>
  </section>

  <div v-if="editingCard" class="card-editor" role="dialog" aria-modal="true" @click.self="closeEditor">
    <form class="card-editor__panel" @submit.prevent="saveEditor">
      <header class="card-editor__head">
        <div>
          <span>{{ editingCard.kind === 'article' ? 'ARTICLE' : 'NOTE' }} CARD</span>
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
          <img v-if="imagePreview" :src="imagePreview" alt="" />
          <span v-else>暂无封面</span>
        </div>
        <div class="card-editor__cover-actions">
          <span>封面</span>
          <label class="card-editor__upload">
            选择图片
            <input type="file" accept="image/*" @change="updateCover" />
          </label>
          <button v-if="imagePreview" type="button" @click="cropCurrentCover">裁剪当前封面</button>
          <button v-if="draftImage" type="button" @click="draftImage = ''">清除封面</button>
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
          <input v-model.number="cropZoom" type="range" min="1" max="3" step="0.01" @input="clampCropOffset" />
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

.developer-mode__hint button.is-active {
  border-color: rgba(101, 174, 255, 0.72);
  background: rgba(47, 109, 246, 0.76);
  color: #fff;
}

.hero-settings {
  position: fixed;
  z-index: 79;
  bottom: 76px;
  left: 20px;
  display: grid;
  width: min(310px, calc(100vw - 40px));
  gap: 13px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(242, 244, 250, 0.86)),
    rgba(255, 255, 255, 0.9);
  color: #302e38;
  box-shadow: 0 24px 52px -28px rgba(27, 28, 44, 0.7);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
  backdrop-filter: blur(18px) saturate(1.12);
}

.hero-settings__head,
.hero-settings__actions,
.hero-settings__control > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hero-settings__head span {
  display: block;
  margin-bottom: 2px;
  color: #807b89;
  font-family: var(--vp-font-family-mono);
  font-size: 9px;
  letter-spacing: 0.9px;
}

.hero-settings__head h2 {
  margin: 0;
  border: 0;
  padding: 0;
  color: #26232d;
  font-size: 18px;
  line-height: 1.25;
}

.hero-settings__head button {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(67, 62, 77, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.65);
  color: #5e5865;
  font-size: 19px;
  line-height: 1;
  cursor: pointer;
}

.hero-settings__control {
  display: grid;
  gap: 6px;
}

.hero-settings__control > span {
  color: #5f5967;
  font-size: 11px;
}

.hero-settings__control output {
  color: #2f6df6;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.hero-settings__control input {
  width: 100%;
  height: 18px;
  margin: 0;
  accent-color: #2f6df6;
  cursor: pointer;
}

.hero-settings__actions {
  padding-top: 2px;
}

.hero-settings__actions small {
  color: #8a8490;
  font-size: 9px;
}

.hero-settings__actions button {
  border: 1px solid rgba(47, 109, 246, 0.24);
  border-radius: 8px;
  padding: 6px 9px;
  background: rgba(47, 109, 246, 0.08);
  color: #2f61c9;
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.dark .hero-settings {
  border-color: rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(145deg, rgba(35, 37, 50, 0.96), rgba(24, 26, 38, 0.92)),
    rgba(24, 26, 38, 0.94);
  color: #ece9f1;
  box-shadow: 0 24px 54px -28px rgba(0, 0, 0, 0.86);
}

.dark .hero-settings__head h2 {
  color: #f2eff6;
}

.dark .hero-settings__control > span {
  color: #c5bfcc;
}

.dark .hero-settings__actions small {
  color: #928c9c;
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

  .hero-settings {
    bottom: 68px;
    left: 12px;
    width: min(310px, calc(100vw - 24px));
  }

  .card-editor__panel {
    width: 100%;
    padding: 18px;
  }
}
</style>
