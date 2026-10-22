import { reactive } from 'vue'

export type HeroSceneSettings = {
  tankWidth: number
  tankHeight: number
  characterWidth: number
  characterX: number
  characterY: number
}

export const HERO_SCENE_DEFAULTS: HeroSceneSettings = {
  tankWidth: 344,
  tankHeight: 216,
  characterWidth: 265,
  characterX: 16,
  characterY: 0,
}

const STORAGE_KEY = 'waterblue-hero-scene-v2'
const LEGACY_STORAGE_KEY = 'waterblue-hero-scene-v1'
const LEGACY_X_OFFSET = 136
const LIMITS: Record<keyof HeroSceneSettings, [number, number]> = {
  tankWidth: [240, 480],
  tankHeight: [150, 340],
  characterWidth: [160, 380],
  characterX: [-220, 240],
  characterY: [-100, 140],
}

export const heroSceneSettings = reactive<HeroSceneSettings>({ ...HERO_SCENE_DEFAULTS })

let initialized = false

function clampSetting(key: keyof HeroSceneSettings, value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return HERO_SCENE_DEFAULTS[key]
  const [min, max] = LIMITS[key]
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

function readSettings() {
  if (typeof window === 'undefined') return

  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    const parsed = JSON.parse(current ?? legacy ?? '{}')
    if (!current && legacy) {
      parsed.characterX = Number(parsed.characterX ?? HERO_SCENE_DEFAULTS.characterX) + LEGACY_X_OFFSET
    }
    for (const key of Object.keys(HERO_SCENE_DEFAULTS) as (keyof HeroSceneSettings)[]) {
      Object.assign(heroSceneSettings, { [key]: clampSetting(key, parsed?.[key]) })
    }
    if (!current && legacy) saveHeroSceneSettings()
  } catch {
    Object.assign(heroSceneSettings, HERO_SCENE_DEFAULTS)
  }
}

function syncFromStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return
  readSettings()
}

export function initializeHeroSceneSettings() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  readSettings()
  window.addEventListener('storage', syncFromStorage)
}

export function saveHeroSceneSettings() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(heroSceneSettings))
}

export function resetHeroSceneSettings() {
  Object.assign(heroSceneSettings, HERO_SCENE_DEFAULTS)
  saveHeroSceneSettings()
}
