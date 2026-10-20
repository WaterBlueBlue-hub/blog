<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const el = ref<HTMLCanvasElement | null>(null)
let dispose: (() => void) | null = null

onMounted(() => {
  if (el.value) dispose = setup(el.value)
})

onBeforeUnmount(() => {
  dispose?.()
  dispose = null
})

type Petal = {
  x: number
  y: number
  r: number // 花瓣半径
  fall: number // 下落速度 px/s
  drift: number // 水平漂移 px/s
  rot: number
  spin: number
  sway: number // 左右摆动的幅度
  swayPhase: number
  swaySpeed: number
  alpha: number
  tone: number // 0–1，决定粉色深浅
}

/** 全屏樱花：固定画布，位于背景遮罩之上、正文之下 */
function setup(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const rnd = (a: number, b: number) => a + Math.random() * (b - a)

  let W = 0
  let H = 0
  let dpr = 1
  let petals: Petal[] = []
  let raf = 0
  let running = !document.hidden
  let last = performance.now()

  function makePetal(seeded: boolean): Petal {
    const r = rnd(6, 11.5)
    return {
      x: rnd(-40, W + 40),
      // 初始化时铺满全屏，避免一进来上空空的、过几秒才落下来
      y: seeded ? rnd(-H * 0.2, H) : rnd(-80, -10),
      r,
      fall: rnd(26, 64) * (r * 0.12),
      drift: rnd(5, 28),
      rot: rnd(0, Math.PI * 2),
      spin: rnd(-1.1, 1.1),
      sway: rnd(10, 30),
      swayPhase: rnd(0, Math.PI * 2),
      swaySpeed: rnd(0.5, 1.3),
      alpha: rnd(0.62, 0.96),
      tone: Math.random(),
    }
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (reduce.matches) {
      petals = []
      return
    }
    const target = W < 720 ? 24 : W < 1200 ? 34 : 50
    petals = Array.from({ length: target }, (_, i) => makePetal(i < target * 0.75))
  }

  /** 一片花瓣：带顶端缺口的花瓣轮廓，翻转时靠横向缩放表现 */
  function drawPetal(p: Petal) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    // 下落时的"翻面"：横向缩放随时间变，模拟花瓣翻转
    const flip = 0.35 + 0.65 * Math.abs(Math.cos(p.swayPhase * 0.6))
    ctx.scale(flip, 1)
    const hue = 340 + p.tone * 14
    const light = 86 - p.tone * 9
    ctx.beginPath()
    ctx.moveTo(0, -p.r)
    ctx.bezierCurveTo(p.r * 0.92, -p.r * 0.52, p.r * 0.98, p.r * 0.55, p.r * 0.22, p.r * 0.96)
    ctx.quadraticCurveTo(0, p.r * 0.72, -p.r * 0.22, p.r * 0.96)
    ctx.bezierCurveTo(-p.r * 0.98, p.r * 0.55, -p.r * 0.92, -p.r * 0.52, 0, -p.r)
    ctx.closePath()
    ctx.fillStyle = `hsla(${hue}, 78%, ${light}%, ${p.alpha})`
    ctx.fill()
    // 一点高光，让它在水彩背景上不至于糊成一片
    ctx.beginPath()
    ctx.ellipse(-p.r * 0.2, -p.r * 0.18, p.r * 0.24, p.r * 0.5, 0.4, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue + 6}, 92%, 96%, ${p.alpha * 0.62})`
    ctx.fill()
    ctx.restore()
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!running || !W) return
    ctx.clearRect(0, 0, W, H)
    for (const p of petals) {
      p.swayPhase += p.swaySpeed * dt
      p.y += p.fall * dt
      p.x += (p.drift + Math.sin(p.swayPhase) * p.sway) * dt
      p.rot += p.spin * dt
      if (p.y > H + 40 || p.x > W + 60) {
        Object.assign(p, makePetal(false))
        if (p.x > W + 60) p.x = -40
      }
      drawPetal(p)
    }
  }

  const onVisibility = () => {
    running = !document.hidden
    last = performance.now()
  }
  const onReduce = () => resize()

  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onVisibility)
  reduce.addEventListener?.('change', onReduce)
  resize()
  raf = requestAnimationFrame(frame)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
    reduce.removeEventListener?.('change', onReduce)
  }
}
</script>

<template>
  <canvas ref="el" class="sakura-layer" aria-hidden="true"></canvas>
</template>

<style scoped>
.sakura-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
