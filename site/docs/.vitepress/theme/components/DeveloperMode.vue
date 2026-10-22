<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { withBase } from 'vitepress'
import {
  OPEN_CARD_EDITOR_EVENT,
  cardEditorState,
  exportCardOverrides,
  fileToCoverDataUrl,
  initializeCardEditor,
  resetAllCardOverrides,
  resetCardOverride,
  setCardEditorActive,
  updateCardOverride,
  type EditableCardPayload,
} from '../composables/cardEditor'

const editingCard = ref<EditableCardPayload | null>(null)
const draftImage = ref('')
const uploadError = ref('')
const form = reactive({
  title: '',
  date: '',
  topic: '',
  excerpt: '',
  tags: '',
})

const imagePreview = computed(() => {
  if (!draftImage.value) return ''
  if (/^(data:|https?:)/.test(draftImage.value)) return draftImage.value
  return withBase(draftImage.value)
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

async function updateCover(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploadError.value = ''
  try {
    draftImage.value = await fileToCoverDataUrl(file)
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : '封面处理失败'
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
  if (!cardEditorState.active) closeEditor()
}

onMounted(() => {
  initializeCardEditor()
  window.addEventListener(OPEN_CARD_EDITOR_EVENT, openEditor)
})

onBeforeUnmount(() => {
  window.removeEventListener(OPEN_CARD_EDITOR_EVENT, openEditor)
})
</script>

<template>
  <div class="developer-mode">
    <div v-if="cardEditorState.active" class="developer-mode__hint">
      <span>开发模式：点击任意文章或笔记卡片编辑</span>
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
          <button v-if="draftImage" type="button" @click="draftImage = ''">清除封面</button>
          <small v-if="uploadError">{{ uploadError }}</small>
        </div>
      </div>

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

  .card-editor__panel {
    width: 100%;
    padding: 18px;
  }
}
</style>
