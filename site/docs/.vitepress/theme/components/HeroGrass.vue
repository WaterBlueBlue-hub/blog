<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

type Point = { x: number; y: number }
type Shock = { x: number; startedAt: number; power: number }
type Blade = {
  rootX: number
  phase: number
  segments: number
  length: number
  width: number
  stiffness: number
  damping: number
  windScale: number
  color: string
  highlight: string
  angles: number[]
  velocities: number[]
  rest: number[]
  points: Point[]
}

const root = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let dispose: (() => void) | null = null

onMounted(async () => {
  await nextTick()
  if (!root.value || !canvasEl.value) return
  dispose = setup(canvasEl.value, root.value)
})

onBeforeUnmount(() => {
  dispose?.()
  dispose = null
})

function setup(canvas: HTMLCanvasElement, host: HTMLDivElement) {
  const ctx = canvas.getContext('2d')!
  let W = 0
  let H = 0
  let dpr = 1
  let blades: Blade[] = []
  let raf = 0
  let last = performance.now()
  let acc = 0
  let visible = true
  let running = !document.hidden
  let placementFrame = 0
  const shocks: Shock[] = []
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pointer = {
    x: 0,
    y: 0,
    vx: 0,
    active: false,
    lastMove: 0,
  }

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  const rand = (min: number, max: number) => min + Math.random() * (max - min)

  function layout() {
    const hero = host.closest('.VPHero') as HTMLElement | null
    const container = hero?.querySelector('.container') as HTMLElement | null
    const main = host.parentElement
    if (!hero || !container || !main) return
    const heroRect = hero.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const mainRect = main.getBoundingClientRect()
    const height = clamp(window.innerWidth * 0.05, 46, 72)

    host.style.left = `${containerRect.left - mainRect.left}px`
    host.style.top = `${heroRect.bottom - mainRect.top - height * 1.5 + 4}px`
    host.style.width = `${containerRect.width}px`
    host.style.height = `${height}px`

    W = Math.max(1, Math.round(containerRect.width))
    H = Math.max(1, Math.round(height))
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    buildBlades()
  }

  function buildBlades() {
    blades = []
    const density = reducedMotion ? 44 : 28
    const backCount = clamp(Math.round(W / density), 20, 52)
    const frontCount = clamp(Math.round(W / (density - 4)), 24, 60)
    addRow(backCount, 0, 0.56, 0.78, 1.25)
    addRow(frontCount, 1, 0.74, 1, 2.15)
    blades.sort((a, b) => a.rootX - b.rootX)
  }

  function addRow(count: number, depth: number, minHeight: number, maxHeight: number, width: number) {
    const margin = 10
    const usable = Math.max(1, W - margin * 2)
    for (let i = 0; i < count; i++) {
      const segments = 5 + ((Math.random() * 3) | 0)
      const height = H * rand(minHeight, maxHeight)
      const rootX = margin + (usable * (i + 0.5)) / count + rand(-4, 4)
      const restAngle = rand(-0.075, 0.075)
      const curl = rand(-0.07, 0.07)
      const angles = new Array<number>(segments)
      const velocities = new Array<number>(segments)
      const rest = new Array<number>(segments)
      for (let s = 0; s < segments; s++) {
        angles[s] = restAngle + rand(-0.025, 0.025)
        velocities[s] = 0
        rest[s] = restAngle + (s / segments) * curl + rand(-0.025, 0.025)
      }
      blades.push({
        rootX,
        phase: rand(0, Math.PI * 2),
        segments,
        length: height / segments,
        width: width * rand(0.75, 1.18),
        stiffness: (depth ? 47 : 55) * rand(0.9, 1.08),
        damping: depth ? 4.5 : 3.8,
        windScale: depth ? 1 : 0.72,
        color: depth ? 'rgba(44, 102, 76, 0.74)' : 'rgba(43, 88, 70, 0.46)',
        highlight: depth ? 'rgba(177, 218, 158, 0.3)' : 'rgba(174, 207, 160, 0.16)',
        angles,
        velocities,
        rest,
        points: [],
      })
    }
  }

  function stepBlade(blade: Blade, dt: number, time: number) {
    const gust = Math.pow(Math.max(0, Math.sin(time * 0.34 + 1.3)), 8) * 0.24
    const wind =
      (Math.sin(time * 0.72 + blade.phase) * 0.16 +
        Math.sin(time * 1.63 + blade.rootX * 0.011 + blade.phase * 0.6) * 0.085 +
        gust) *
      blade.windScale *
      (reducedMotion ? 0.25 : 1)

    for (let s = 0; s < blade.segments; s++) {
      const heightFactor = (s + 1) / blade.segments
      let target = blade.rest[s] + wind * (0.35 + heightFactor * 0.95)

      const pointerLife = pointer.active
        ? Math.max(0, 1 - (performance.now() - pointer.lastMove) / 620)
        : 0
      if (pointerLife > 0) {
        const p = blade.points[s] ?? { x: blade.rootX, y: H }
        const distance = Math.hypot(p.x - pointer.x, p.y - pointer.y)
        const proximity = Math.max(0, 1 - distance / 128)
        if (proximity > 0) {
          const push = clamp(pointer.vx * 0.0015, -0.9, 0.9)
          target += push * proximity * heightFactor * pointerLife * 1.25
          target +=
            Math.sign(p.x - pointer.x || 1) * proximity * 0.11 * heightFactor * pointerLife
        }
      }

      for (const shock of shocks) {
        const age = (time * 1000 - shock.startedAt) / 1000
        const delay = Math.abs(blade.rootX - shock.x) / 230
        const local = age - delay
        if (local < 0 || local > 0.58) continue
        const envelope = Math.sin(local * 20) * Math.exp(-local * 8)
        const side = blade.rootX < shock.x ? -1 : 1
        target += side * envelope * shock.power * 0.72 * heightFactor
      }

      const stiffness = blade.stiffness * (1 - heightFactor * 0.35)
      blade.velocities[s] += (target - blade.angles[s]) * stiffness * dt
      blade.velocities[s] *= Math.exp(-blade.damping * dt)
      blade.angles[s] = clamp(blade.angles[s] + blade.velocities[s] * dt, -1.3, 1.3)
    }

    let x = blade.rootX
    let y = H + 1
    blade.points.length = 0
    for (let s = 0; s < blade.segments; s++) {
      x += Math.sin(blade.angles[s]) * blade.length
      y -= Math.cos(blade.angles[s]) * blade.length
      blade.points.push({ x, y })
    }
  }

  function drawBlade(blade: Blade) {
    const points = blade.points
    if (points.length < 2) return
    const left: Point[] = [{ x: blade.rootX - blade.width, y: H + 1 }]
    const right: Point[] = [{ x: blade.rootX + blade.width, y: H + 1 }]
    const all = [{ x: blade.rootX, y: H + 1 }, ...points]

    for (let i = 1; i < all.length; i++) {
      const prev = all[i - 1]
      const next = all[Math.min(all.length - 1, i + 1)]
      const px = next.x - prev.x
      const py = next.y - prev.y
      const len = Math.hypot(px, py) || 1
      const nx = -py / len
      const ny = px / len
      const taper = 1 - (i / (all.length - 1)) * 0.82
      const halfWidth = blade.width * taper
      left.push({ x: all[i].x + nx * halfWidth, y: all[i].y + ny * halfWidth })
      right.push({ x: all[i].x - nx * halfWidth, y: all[i].y - ny * halfWidth })
    }

    ctx.beginPath()
    ctx.moveTo(left[0].x, left[0].y)
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y)
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
    ctx.closePath()
    ctx.fillStyle = blade.color
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(blade.rootX, H)
    for (const p of points) ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = blade.highlight
    ctx.lineWidth = 0.65
    ctx.stroke()
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    const haze = ctx.createLinearGradient(0, H - 28, 0, H)
    haze.addColorStop(0, 'rgba(24, 70, 53, 0)')
    haze.addColorStop(1, 'rgba(24, 70, 53, 0.16)')
    ctx.fillStyle = haze
    ctx.fillRect(0, H - 28, W, 28)
    for (const blade of blades) drawBlade(blade)
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    if (!visible || !running) {
      last = now
      return
    }
    const dtReal = Math.min(0.05, (now - last) / 1000)
    last = now
    acc += dtReal
    let steps = 0
    while (acc >= 1 / 60 && steps < 3) {
      const time = now / 1000
      for (const blade of blades) stepBlade(blade, 1 / 60, time)
      acc -= 1 / 60
      steps++
    }
    draw()
  }

  function localX(clientX: number) {
    const rect = canvas.getBoundingClientRect()
    return ((clientX - rect.left) / Math.max(1, rect.width)) * W
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    const rect = canvas.getBoundingClientRect()
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top - 30 &&
      e.clientY <= rect.bottom + 18
    if (!inside) {
      pointer.active = false
      return
    }
    const nextX = localX(e.clientX)
    const now = performance.now()
    const dt = Math.max(8, now - pointer.lastMove)
    pointer.vx = clamp(((nextX - pointer.x) / dt) * 1000, -900, 900)
    pointer.x = nextX
    pointer.y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * H
    pointer.lastMove = now
    pointer.active = true
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    const target = e.target as Element | null
    if (target?.closest('a, button, input, textarea')) return
    const rect = canvas.getBoundingClientRect()
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom + 18) {
      return
    }
    shocks.push({ x: localX(e.clientX), startedAt: performance.now(), power: 0.85 })
    if (shocks.length > 4) shocks.shift()
  }

  function onVisibility() {
    running = !document.hidden
  }

  function scheduleLayout() {
    cancelAnimationFrame(placementFrame)
    placementFrame = requestAnimationFrame(layout)
  }

  layout()
  const hero = host.closest('.VPHero') as HTMLElement | null
  const resizeObserver = new ResizeObserver(scheduleLayout)
  if (hero) resizeObserver.observe(hero)
  if (hero?.querySelector('.container')) resizeObserver.observe(hero.querySelector('.container')!)
  window.addEventListener('resize', scheduleLayout)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible) last = performance.now()
    },
    { threshold: 0.01 },
  )
  io.observe(host)
  raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    cancelAnimationFrame(placementFrame)
    resizeObserver.disconnect()
    io.disconnect()
    window.removeEventListener('resize', scheduleLayout)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
</script>

<template>
  <div ref="root" class="hero-grass" aria-hidden="true">
    <canvas ref="canvasEl"></canvas>
  </div>
</template>

<style scoped>
.hero-grass {
  position: absolute;
  z-index: -1;
  display: block;
  pointer-events: none;
  overflow: visible;
}

.hero-grass canvas {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 959px) {
  .hero-grass {
    z-index: 0;
  }
}
</style>
