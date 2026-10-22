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
  characterX: -120,
  characterY: 0,
}

const STORAGE_KEY = 'waterblue-hero-scene-v1'
const LIMITS: Record<keyof HeroSceneSettings, [number, number]> = {
  tankWidth: [240, 480],
  tankHeight: [150, 340],
  characterWidth: [160, 380],
  characterX: [-320, 40],
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
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    for (const key of Object.keys(HERO_SCENE_DEFAULTS) as (keyof HeroSceneSettings)[]) {
      Object.assign(heroSceneSettings, { [key]: clampSetting(key, parsed?.[key]) })
    }
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
