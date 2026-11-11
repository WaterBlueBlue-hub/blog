import { reactive } from 'vue'

export type CardKind = 'article' | 'note'

export type CoverCrop = {
  zoom: number
  focusX: number
  focusY: number
}

export type CardOverride = {
  title?: string
  date?: string
  topic?: string
  excerpt?: string
  tags?: string[]
  image?: string
  imageCrop?: CoverCrop
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
  imageCrop?: CoverCrop
}

type EditorState = {
  active: boolean
  overrides: Record<string, CardOverride>
  revision: number
}

const STORAGE_KEY = 'waterblue-card-overrides-v1'
const MODE_KEY = 'waterblue-developer-mode-v1'
const COVER_DB_NAME = 'waterblue-card-covers-v1'
const COVER_STORE_NAME = 'covers'
export const OPEN_CARD_EDITOR_EVENT = 'waterblue:open-card-editor'

export const cardEditorState = reactive<EditorState>({
  active: false,
  overrides: {},
  revision: 0,
})

let initialized = false
let coverDbPromise: Promise<IDBDatabase> | undefined
const coverObjectUrls = reactive<
  Record<string, { url?: string; loading?: boolean; failed?: boolean }>
>({})

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

function persistOverrides(overrides = cardEditorState.overrides) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    throw new Error('浏览器本地存储空间不足，请选择更小的 GIF 或清除不用的封面')
  }
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
  void migrateEmbeddedCoverImages()
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
  if (next.image === '') {
    delete next.image
    delete next.imageCrop
  }
  if (!next.imageCrop) delete next.imageCrop
  if (!next.tags?.length) delete next.tags

  const nextOverrides = {
    ...cardEditorState.overrides,
    [key]: next,
  }
  persistOverrides(nextOverrides)
  cardEditorState.overrides = nextOverrides
  cardEditorState.revision += 1
}

export function resetCardOverride(kind: CardKind, id: number) {
  const next = { ...cardEditorState.overrides }
  delete next[storageKey(kind, id)]
  persistOverrides(next)
  cardEditorState.overrides = next
  cardEditorState.revision += 1
}

export function resetAllCardOverrides() {
  persistOverrides({})
  cardEditorState.overrides = {}
  cardEditorState.revision += 1
}

export function exportCardOverrides() {
  return JSON.stringify(cardEditorState.overrides, null, 2)
}

export function openCardEditor(card: EditableCardPayload) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_CARD_EDITOR_EVENT, { detail: card }))
}

export function isGifCover(source?: string) {
  if (!source) return false
  return (
    source.startsWith('idb://') ||
    /^data:image\/gif(?:;|,)/i.test(source) ||
    /\.gif(?:[?#]|$)/i.test(source)
  )
}

export function coverCropStyle(crop?: CoverCrop) {
  if (!crop) return undefined
  return {
    '--cover-crop-zoom': String(crop.zoom),
    '--cover-crop-x': `${crop.focusX * 100}%`,
    '--cover-crop-y': `${crop.focusY * 100}%`,
  }
}

function openCoverDatabase() {
  if (coverDbPromise) return coverDbPromise
  coverDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(COVER_DB_NAME, 1)
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(COVER_STORE_NAME)) {
        request.result.createObjectStore(COVER_STORE_NAME)
      }
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
  return coverDbPromise
}

async function getStoredCover(key: string) {
  const database = await openCoverDatabase()
  return new Promise<Blob | undefined>((resolve, reject) => {
    const request = database
      .transaction(COVER_STORE_NAME, 'readonly')
      .objectStore(COVER_STORE_NAME)
      .get(key) as IDBRequest<Blob | undefined>
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(',', 2)
  const mimeType = header.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

export async function storeCoverDataUrl(kind: CardKind, id: number, dataUrl: string) {
  const key = storageKey(kind, id)
  const blob = dataUrlToBlob(dataUrl)
  const database = await openCoverDatabase()
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(COVER_STORE_NAME, 'readwrite')
      .objectStore(COVER_STORE_NAME)
      .put(blob, key)
    request.addEventListener('success', () => resolve())
    request.addEventListener('error', () => reject(request.error))
  })

  const previous = coverObjectUrls[key]?.url
  if (previous) URL.revokeObjectURL(previous)
  coverObjectUrls[key] = { url: URL.createObjectURL(blob) }
  return `idb://${key}`
}

export function resolveCoverImage(kind: CardKind, id: number, image?: string) {
  if (!image || !image.startsWith('idb://') || typeof window === 'undefined') return image || ''

  const key = storageKey(kind, id)
  const cached = coverObjectUrls[key]
  if (cached?.url) return cached.url
  if (cached?.loading || cached?.failed) return ''

  coverObjectUrls[key] = { loading: true }
  void getStoredCover(key)
    .then((blob) => {
      coverObjectUrls[key] = blob
        ? { url: URL.createObjectURL(blob) }
        : { failed: true }
    })
    .catch(() => {
      coverObjectUrls[key] = { failed: true }
    })
  return ''
}

async function migrateEmbeddedCoverImages() {
  const migrated = { ...cardEditorState.overrides }
  let changed = false

  for (const [key, override] of Object.entries(migrated)) {
    if (!override.image?.startsWith('data:image/gif')) continue

    const [kind, idText] = key.split(':')
    const id = Number(idText)
    if (!id || (kind !== 'article' && kind !== 'note')) continue

    try {
      const image = await storeCoverDataUrl(kind, id, override.image)
      migrated[key] = { ...override, image }
      changed = true
    } catch {
      // Keep the existing cover when IndexedDB is unavailable.
    }
  }

  if (!changed) return

  try {
    persistOverrides(migrated)
    cardEditorState.overrides = migrated
    cardEditorState.revision += 1
  } catch {
    // The blob still resolves for this session even if the slim config cannot be written.
  }
}

export async function fileToCoverDataUrl(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })

  if (file.type === 'image/gif' || /\.gif$/i.test(file.name)) {
    const commaIndex = dataUrl.indexOf(',')
    return commaIndex >= 0
      ? `data:image/gif;base64,${dataUrl.slice(commaIndex + 1)}`
      : dataUrl
  }

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
