import { reactive } from 'vue'

export type CardKind = 'article' | 'note'

export type CardOverride = {
  title?: string
  date?: string
  topic?: string
  excerpt?: string
  tags?: string[]
  image?: string
}

export type EditableCardPayload = {
  kind: CardKind
  id: number
  title: string
  date: string
  topic: string
  excerpt: string
  tags: string[]
  image?: string
}

type EditorState = {
  active: boolean
  overrides: Record<string, CardOverride>
  revision: number
}

const STORAGE_KEY = 'waterblue-card-overrides-v1'
const MODE_KEY = 'waterblue-developer-mode-v1'
export const OPEN_CARD_EDITOR_EVENT = 'waterblue:open-card-editor'

export const cardEditorState = reactive<EditorState>({
  active: false,
  overrides: {},
  revision: 0,
})

let initialized = false

function storageKey(kind: CardKind, id: number) {
  return `${kind}:${id}`
}

function readOverrides(): Record<string, CardOverride> {
  if (typeof window === 'undefined') return {}

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistOverrides() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cardEditorState.overrides))
}

function syncFromStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) {
    cardEditorState.overrides = readOverrides()
    cardEditorState.revision += 1
  }
  if (event.key === MODE_KEY) {
    cardEditorState.active = event.newValue === '1'
  }
}

export function initializeCardEditor() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  cardEditorState.overrides = readOverrides()
  const devQuery = new URLSearchParams(window.location.search).get('dev')
  cardEditorState.active = devQuery === '1' || window.localStorage.getItem(MODE_KEY) === '1'
  cardEditorState.revision += 1
  window.addEventListener('storage', syncFromStorage)
}

export function setCardEditorActive(active: boolean) {
  cardEditorState.active = active
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MODE_KEY, active ? '1' : '0')
  }
}

export function getCardOverride(kind: CardKind, id: number) {
  return cardEditorState.overrides[storageKey(kind, id)]
}

export function updateCardOverride(
  kind: CardKind,
  id: number,
  patch: Partial<CardOverride>,
) {
  const key = storageKey(kind, id)
  const next = { ...cardEditorState.overrides[key], ...patch }

  if (next.title === '') delete next.title
  if (next.date === '') delete next.date
  if (next.topic === '') delete next.topic
  if (next.excerpt === '') delete next.excerpt
  if (next.image === '') delete next.image
  if (!next.tags?.length) delete next.tags

  cardEditorState.overrides = {
    ...cardEditorState.overrides,
    [key]: next,
  }
  cardEditorState.revision += 1
  persistOverrides()
}

export function resetCardOverride(kind: CardKind, id: number) {
  const next = { ...cardEditorState.overrides }
  delete next[storageKey(kind, id)]
  cardEditorState.overrides = next
  cardEditorState.revision += 1
  persistOverrides()
}

export function resetAllCardOverrides() {
  cardEditorState.overrides = {}
  cardEditorState.revision += 1
  persistOverrides()
}

export function exportCardOverrides() {
  return JSON.stringify(cardEditorState.overrides, null, 2)
}

export function openCardEditor(card: EditableCardPayload) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_CARD_EDITOR_EVENT, { detail: card }))
}

export async function fileToCoverDataUrl(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.addEventListener('load', () => resolve(element))
    element.addEventListener('error', () => reject(new Error('封面图片无法读取')))
    element.src = dataUrl
  })

  const maxSide = 720
  const scale = Math.min(1, maxSide / image.naturalWidth, maxSide / image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法处理封面图片')

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/webp', 0.82)
}
