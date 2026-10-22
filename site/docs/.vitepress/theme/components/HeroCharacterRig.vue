<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{ debug?: boolean }>()

type Point = { x: number; y: number }
type BoneState = {
  root: Point
  spine: Point
  chest: Point
  head: Point
  shoulder: Point
  hand: Point
}

type Mesh = {
  cols: number
  rows: number
  count: number
  rest: Float32Array
  positions: Float32Array
  uvs: Float32Array
  indices: Uint16Array
}

type Renderer = {
  draw: (positions: Float32Array) => void
  dispose: () => void
}

type DistanceConstraint = {
  a: number
  b: number
  rest: number
  compliance: number
  lambda: number
}

type RigApi = {
  setDebug: (on: boolean) => void
  kick: () => void
  dispose: () => void
}

const bodyCanvas = ref<HTMLCanvasElement | null>(null)
const skirtCanvas = ref<HTMLCanvasElement | null>(null)
const debugCanvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)

let rigApi: RigApi | null = null

const bodySource = withBase('/hero-character/character-body.webp')
const skirtSource = withBase('/hero-character/character-skirt.webp')

onMounted(async () => {
  if (!bodyCanvas.value || !skirtCanvas.value || !debugCanvas.value) return

  try {
    rigApi = await setupRig({
      bodyCanvas: bodyCanvas.value,
      skirtCanvas: skirtCanvas.value,
      debugCanvas: debugCanvas.value,
      onReady: () => {
        ready.value = true
      },
    })
    rigApi.setDebug(!!props.debug)
  } catch (error) {
    console.warn('[HeroCharacterRig] WebGL rig unavailable, using static artwork.', error)
  }
})

onBeforeUnmount(() => {
  rigApi?.dispose()
  rigApi = null
})

watch(
  () => props.debug,
  (value) => rigApi?.setDebug(!!value),
)

defineExpose({
  setDebug: (on: boolean) => rigApi?.setDebug(on),
  kick: () => rigApi?.kick(),
})

async function setupRig(options: {
  bodyCanvas: HTMLCanvasElement
  skirtCanvas: HTMLCanvasElement
  debugCanvas: HTMLCanvasElement
  onReady: () => void
}): Promise<RigApi> {
  const W = 1050
  const H = 1105
  const FIXED_DT = 1 / 60
  const SKIRT_BOX = { x: 20, y: 170, w: 1030, h: 911 }
  const bodyImage = await loadImage(bodySource)
  const skirtImage = await loadImage(skirtSource)

  options.bodyCanvas.width = W
  options.bodyCanvas.height = H
  options.skirtCanvas.width = W
  options.skirtCanvas.height = H
  options.debugCanvas.width = W
  options.debugCanvas.height = H

  const bodyMesh = createMesh(24, 30, 0, 0, W, H)
  const skirtMesh = createMesh(22, 17, SKIRT_BOX.x, SKIRT_BOX.y, SKIRT_BOX.w, SKIRT_BOX.h)
  const bodyRenderer = createRenderer(options.bodyCanvas, bodyImage, bodyMesh)
  const skirtRenderer = createRenderer(options.skirtCanvas, skirtImage, skirtMesh)

  if (!bodyRenderer || !skirtRenderer) {
    throw new Error('WebGL renderer creation failed')
  }

  const debugCtx = options.debugCanvas.getContext('2d')
  const skirtAlpha = readAlpha(skirtImage)
  const skirtActive = new Uint8Array(skirtMesh.count)
  const skirtVisible = new Uint8Array(skirtMesh.count)
  const skirtAttach = new Float32Array(skirtMesh.count)
  const skirtInvMass = new Float32Array(skirtMesh.count)
  const skirtPrev = new Float32Array(skirtMesh.positions.length)
  const skirtSwayOffset = new Float32Array(skirtMesh.positions.length)

  for (let i = 0; i < skirtMesh.count; i++) {
    const ix = i * 2
    const x = skirtMesh.rest[ix]
    const y = skirtMesh.rest[ix + 1]
    skirtVisible[i] = alphaNear(skirtAlpha, W, H, x, y, 24) > 4 ? 1 : 0
    skirtActive[i] = 1
    skirtInvMass[i] = 1
    skirtPrev[ix] = skirtMesh.positions[ix]
    skirtPrev[ix + 1] = skirtMesh.positions[ix + 1]
  }

  const skirtAnchor = { x: 958, y: 286 }
  for (let i = 0; i < skirtMesh.count; i++) {
    if (!skirtActive[i]) continue
    const ix = i * 2
    const dx = skirtMesh.rest[ix] - skirtAnchor.x
    const dy = skirtMesh.rest[ix + 1] - skirtAnchor.y
    skirtAttach[i] = 1 - smoothstep(58, 180, Math.hypot(dx, dy))
  }

  const constraints = buildConstraints(skirtMesh, skirtActive)
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const pointer = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastAt: 0,
    active: false,
    down: false,
    id: -1,
    grabbed: -1,
  }
  const debug = { enabled: false }
  let visible = true
  let disposed = false
  let running = false
  let raf = 0
  let lastTime = 0
  let time = 0
  let accumulator = 0
  let kickImpulse = 0
  let bones: BoneState = {
    root: { x: 700, y: 420 },
    spine: { x: 760, y: 300 },
    chest: { x: 800, y: 238 },
    head: { x: 860, y: 150 },
    shoulder: { x: 735, y: 282 },
    hand: { x: 665, y: 385 },
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = !!entry?.isIntersecting
      if (visible) start()
      else stop()
    },
    { threshold: 0.01 },
  )
  observer.observe(options.bodyCanvas)

  function start() {
    if (disposed || running || !visible || document.hidden || motionQuery.matches) return
    running = true
    lastTime = 0
    raf = requestAnimationFrame(frame)
  }

  function stop() {
    running = false
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  function frame(now: number) {
    if (disposed || !visible || document.hidden || motionQuery.matches) {
      running = false
      raf = 0
      return
    }

    if (!lastTime) lastTime = now
    const elapsed = Math.min(0.05, (now - lastTime) / 1000)
    lastTime = now
    time += elapsed
    accumulator = Math.min(accumulator + elapsed, FIXED_DT * 3)

    while (accumulator >= FIXED_DT) {
      stepSkirt(FIXED_DT)
      accumulator -= FIXED_DT
    }

    updateBody(time)
    bodyRenderer.draw(bodyMesh.positions)
    skirtRenderer.draw(skirtMesh.positions)
    if (debug.enabled) drawDebug()
    raf = requestAnimationFrame(frame)
  }

  function updateBody(t: number) {
    const rootDx = Math.sin(t * 0.74) * 1.7 + Math.sin(t * 0.31) * 0.65
    const rootDy = Math.sin(t * 1.48 + 0.4) * 1.15
    const spineAngle = Math.sin(t * 0.74) * 0.022 + Math.sin(t * 0.37 + 0.9) * 0.006
    const chestAngle = Math.sin(t * 0.74 + 0.55) * 0.016
    const headAngle = Math.sin(t * 0.74 + 1.05) * 0.013
    const armAngle = Math.sin(t * 1.45 + 0.55) * 0.14 + Math.sin(t * 2.35 + 0.2) * 0.04
    const root = { x: 700 + rootDx, y: 420 + rootDy }
    const spineBase = { x: 760 + rootDx, y: 300 + rootDy }
    const chestBase = { x: 800 + rootDx, y: 238 + rootDy }
    const headBase = { x: 860 + rootDx, y: 150 + rootDy }
    const shoulderBase = { x: 735 + rootDx, y: 282 + rootDy }
    const handBase = { x: 645 + rootDx, y: 398 + rootDy }
    const spine = rotatePoint(spineBase, root, spineAngle)
    const chest = rotatePoint(rotatePoint(chestBase, root, spineAngle), spine, chestAngle)
    const head = rotatePoint(rotatePoint(rotatePoint(headBase, root, spineAngle), spine, chestAngle), chest, headAngle)
    head.y += Math.sin(t * 1.48 + 0.4) * 1.1
    const shoulder = rotatePoint(
      rotatePoint(shoulderBase, root, spineAngle),
      spine,
      chestAngle * 0.7,
    )
    const hand = rotatePoint(handBase, shoulder, armAngle)
    const handShiftX = hand.x - handBase.x
    const handShiftY = hand.y - handBase.y
    const weaponAngle = armAngle * 0.28
    bones = { root, spine, chest, head, shoulder, hand }

    const positions = bodyMesh.positions
    const rest = bodyMesh.rest
    for (let i = 0; i < bodyMesh.count; i++) {
      const ix = i * 2
      const x = rest[ix]
      const y = rest[ix + 1]
      const base = { x: x + rootDx, y: y + rootDy }
      const spinePoint = rotatePoint(base, root, spineAngle)
      const chestPoint = rotatePoint(spinePoint, spine, chestAngle)
      const headPoint = rotatePoint(chestPoint, chest, headAngle)
      headPoint.y += head.y - (headBase.y + Math.sin(t * 1.48 + 0.4) * 1.1)

      const upper = clamp((660 - y) / 280, 0, 1)
      const side = 0.22 + 0.78 * smoothstep(455, 690, x)
      const vertical = 0.24 + 0.76 * clamp((520 - y) / 330, 0, 1)
      const wSpine = upper * side * vertical
      const wChest = wSpine * smoothstep(345, 205, y)
      const wHead = wChest * smoothstep(245, 90, y)

      let px = lerp(base.x, spinePoint.x, wSpine)
      let py = lerp(base.y, spinePoint.y, wSpine)
      px = lerp(px, chestPoint.x, wChest)
      py = lerp(py, chestPoint.y, wChest)
      px = lerp(px, headPoint.x, wHead)
      py = lerp(py, headPoint.y, wHead)

      const armDistance = distanceToSegment(x, y, 735, 282, 645, 398)
      const armCore = 1 - smoothstep(44, 128, armDistance)
      const armVertical = smoothstep(250, 286, y) * (1 - smoothstep(430, 500, y))
      const armHorizontal = 1 - smoothstep(735, 820, x)
      const armWeight = armCore * armVertical * armHorizontal * 0.9
      const weaponDistance = distanceToSegment(x, y, 645, 398, 330, 990)
      const weaponCore = 1 - smoothstep(78, 200, weaponDistance)
      const weaponVertical = smoothstep(360, 410, y)
      const weaponHorizontal = 1 - smoothstep(675, 770, x)
      const weaponRight = lerp(700, 520, smoothstep(430, 980, y))
      const weaponField = smoothstep(360, 430, y) * (1 - smoothstep(weaponRight - 70, weaponRight + 20, x))
      const weaponWeight = Math.max(weaponCore * weaponVertical * weaponHorizontal, weaponField)
      const limbWeight = Math.max(armWeight, weaponWeight)
      if (limbWeight > 0.001) {
        const armPoint = rotatePoint({ x: px, y: py }, shoulder, armAngle)
        const weaponPoint = rotatePoint(
          { x: px + handShiftX, y: py + handShiftY },
          hand,
          weaponAngle,
        )
        const target = weaponWeight > armWeight ? weaponPoint : armPoint
        px = lerp(px, target.x, limbWeight)
        py = lerp(py, target.y, limbWeight)
      }
      positions[ix] = px
      positions[ix + 1] = py
    }
  }

  function stepSkirt(dt: number) {
    const t = time
    const rootDx = Math.sin(t * 0.74) * 1.7
    const rootDy = Math.sin(t * 1.48 + 0.4) * 1.15
    const anchorAngle = Math.sin(t * 0.58) * 0.018 + Math.sin(t * 0.27 + 0.9) * 0.005
    const windX =
      Math.sin(t * 0.58) * 12.5 +
      Math.sin(t * 0.27 + 0.9) * 4.2 +
      Math.sin(t * 1.37 + 1.2) * 1.5 +
      kickImpulse
    const windY = Math.sin(t * 0.91 + 0.6) * 3.2
    kickImpulse *= 0.82

    for (let i = 0; i < skirtMesh.count; i++) {
      const ix = i * 2
      if (!skirtActive[i]) {
        skirtMesh.positions[ix] = skirtMesh.rest[ix] + rootDx
        skirtMesh.positions[ix + 1] = skirtMesh.rest[ix + 1] + rootDy
        continue
      }
      skirtMesh.positions[ix] -= skirtSwayOffset[ix]
      skirtSwayOffset[ix] = 0

      const vx = (skirtMesh.positions[ix] - skirtPrev[ix]) * 0.975
      const vy = (skirtMesh.positions[ix + 1] - skirtPrev[ix + 1]) * 0.975
      const rowFactor = clamp((skirtMesh.rest[ix + 1] - SKIRT_BOX.y) / SKIRT_BOX.h, 0, 1)
      skirtPrev[ix] = skirtMesh.positions[ix]
      skirtPrev[ix + 1] = skirtMesh.positions[ix + 1]
      skirtMesh.positions[ix] +=
        vx + (windX * (0.42 + rowFactor * 0.78) + Math.sin(t * 1.9 + i) * 1.4) * dt * dt
      skirtMesh.positions[ix + 1] += vy + (18 + windY) * dt * dt
    }

    for (const constraint of constraints) constraint.lambda = 0
    for (let iteration = 0; iteration < 5; iteration++) solveConstraints(dt)
    const hipSwayX = Math.sin(t * 0.82) * 4 + Math.sin(t * 0.43 + 1.15) * 1.5
    for (let i = 0; i < skirtMesh.count; i++) {
      if (!skirtActive[i] || skirtAttach[i] <= 0.001) continue
      const ix = i * 2
      const target = rotatePoint(
        {
          x: skirtMesh.rest[ix] + rootDx + hipSwayX,
          y: skirtMesh.rest[ix + 1] + rootDy,
        },
        { x: 700 + rootDx + hipSwayX, y: 420 + rootDy },
        anchorAngle,
      )
      const pull = skirtAttach[i] * 0.42
      skirtMesh.positions[ix] = lerp(skirtMesh.positions[ix], target.x, pull)
      skirtMesh.positions[ix + 1] = lerp(skirtMesh.positions[ix + 1], target.y, pull)
    }
    applyPointerInteraction()
    pointer.vx *= 0.82
    pointer.vy *= 0.84

    for (let i = 0; i < skirtMesh.count; i++) {
      const ix = i * 2
      if (!skirtActive[i]) continue
      skirtMesh.positions[ix] = clamp(
        skirtMesh.positions[ix],
        skirtMesh.rest[ix] - 150,
        skirtMesh.rest[ix] + 150,
      )
      skirtMesh.positions[ix + 1] = clamp(
        skirtMesh.positions[ix + 1],
        skirtMesh.rest[ix + 1] - 120,
        skirtMesh.rest[ix + 1] + 150,
      )
    }

    const swayX = Math.sin(t * 0.82) * 18 + Math.sin(t * 0.43 + 1.15) * 7
    for (let i = 0; i < skirtMesh.count; i++) {
      if (!skirtActive[i]) continue
      const ix = i * 2
      const rowFactor = clamp((skirtMesh.rest[ix + 1] - SKIRT_BOX.y) / SKIRT_BOX.h, 0, 1)
      const swayWeight = 0.45 + 0.55 * smoothstep(0.04, 0.76, rowFactor)
      const offset = swayX * swayWeight
      skirtMesh.positions[ix] += offset
      skirtSwayOffset[ix] = offset
    }
  }

  function solveConstraints(dt: number) {
    for (const constraint of constraints) {
      const ia = constraint.a * 2
      const ib = constraint.b * 2
      const wa = skirtInvMass[constraint.a]
      const wb = skirtInvMass[constraint.b]
      const denominator = wa + wb
      if (denominator <= 0) continue

      const dx = skirtMesh.positions[ib] - skirtMesh.positions[ia]
      const dy = skirtMesh.positions[ib + 1] - skirtMesh.positions[ia + 1]
      const length = Math.hypot(dx, dy)
      if (length < 1e-5) continue

      const alpha = constraint.compliance / (dt * dt)
      const deltaLambda =
        (-(length - constraint.rest) - alpha * constraint.lambda) / (denominator + alpha)
      constraint.lambda += deltaLambda
      const correction = deltaLambda / length
      skirtMesh.positions[ia] -= dx * correction * wa
      skirtMesh.positions[ia + 1] -= dy * correction * wa
      skirtMesh.positions[ib] += dx * correction * wb
      skirtMesh.positions[ib + 1] += dy * correction * wb
    }
  }

  function applyPointerInteraction() {
    if (!pointer.active) return

    if (pointer.down && pointer.grabbed >= 0) {
      const ix = pointer.grabbed * 2
      skirtMesh.positions[ix] = lerp(skirtMesh.positions[ix], pointer.x, 0.34)
      skirtMesh.positions[ix + 1] = lerp(skirtMesh.positions[ix + 1], pointer.y, 0.34)
      return
    }

    const speed = Math.hypot(pointer.vx, pointer.vy)
    if (speed < 8) return
    const radius = 108 + Math.min(34, speed * 0.012)
    const impulseX = clamp(pointer.vx * 0.00125, -8, 8)
    const impulseY = clamp(pointer.vy * 0.0011, -6, 6)
    for (let i = 0; i < skirtMesh.count; i++) {
      if (!skirtVisible[i]) continue
      const ix = i * 2
      const dx = skirtMesh.positions[ix] - pointer.x
      const dy = skirtMesh.positions[ix + 1] - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance >= radius) continue
      const influence = (1 - distance / radius) ** 2
      skirtMesh.positions[ix] += impulseX * influence
      skirtMesh.positions[ix + 1] += impulseY * influence
    }
  }

  function drawDebug() {
    if (!debugCtx) return
    const ctx = debugCtx
    ctx.clearRect(0, 0, W, H)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.strokeStyle = 'rgba(49, 112, 173, 0.86)'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(bones.root.x, bones.root.y)
    ctx.lineTo(bones.spine.x, bones.spine.y)
    ctx.lineTo(bones.chest.x, bones.chest.y)
    ctx.lineTo(bones.head.x, bones.head.y)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(30, 24, 35, 0.72)'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(bones.shoulder.x, bones.shoulder.y)
    ctx.lineTo(bones.hand.x, bones.hand.y)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 178, 73, 0.96)'
    ctx.lineWidth = 7
    ctx.stroke()
    for (const joint of [bones.root, bones.spine, bones.chest, bones.head, bones.shoulder, bones.hand]) {
      ctx.fillStyle = 'rgba(255, 239, 188, 0.95)'
      ctx.beginPath()
      ctx.arc(joint.x, joint.y, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(231, 132, 46, 0.96)'
      ctx.lineWidth = 5
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(79, 181, 255, 0.34)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < constraints.length; i += 2) {
      const constraint = constraints[i]
      const ia = constraint.a * 2
      const ib = constraint.b * 2
      ctx.moveTo(skirtMesh.positions[ia], skirtMesh.positions[ia + 1])
      ctx.lineTo(skirtMesh.positions[ib], skirtMesh.positions[ib + 1])
    }
    ctx.stroke()

    for (let i = 0; i < skirtMesh.count; i++) {
      if (!skirtVisible[i]) continue
      const ix = i * 2
      ctx.fillStyle = 'rgba(93, 199, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(skirtMesh.positions[ix], skirtMesh.positions[ix + 1], 4.5, 0, Math.PI * 2)
      ctx.fill()
    }

    if (pointer.active) {
      ctx.strokeStyle = pointer.down ? 'rgba(255, 112, 145, 0.95)' : 'rgba(92, 204, 255, 0.9)'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(pointer.x, pointer.y, pointer.down ? 125 : 92, 0, Math.PI * 2)
      ctx.stroke()
      if (!pointer.down) {
        const speed = Math.hypot(pointer.vx, pointer.vy)
        if (speed > 8) {
          const scale = Math.min(42, speed * 0.024) / speed
          ctx.strokeStyle = 'rgba(255, 239, 188, 0.95)'
          ctx.lineWidth = 7
          ctx.beginPath()
          ctx.moveTo(pointer.x, pointer.y)
          ctx.lineTo(pointer.x + pointer.vx * scale, pointer.y + pointer.vy * scale)
          ctx.stroke()
        }
      }
    }
  }

  function eventPoint(event: PointerEvent) {
    const rect = options.skirtCanvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    }
  }

  function updatePointer(event: PointerEvent) {
    const point = eventPoint(event)
    const now = performance.now()
    const elapsed = pointer.lastAt ? clamp((now - pointer.lastAt) / 1000, 1 / 120, 0.05) : 1 / 60
    const velocityX = (point.x - pointer.x) / elapsed
    const velocityY = (point.y - pointer.y) / elapsed
    pointer.vx = lerp(pointer.vx, velocityX, 0.42)
    pointer.vy = lerp(pointer.vy, velocityY, 0.42)
    pointer.x = point.x
    pointer.y = point.y
    pointer.lastAt = now
    pointer.active = alphaAt(skirtAlpha, W, H, point.x, point.y) > 8
    options.skirtCanvas.style.cursor = pointer.down ? 'grabbing' : pointer.active ? 'grab' : 'default'
  }

  function nearestVertex(point: Point) {
    let best = -1
    let bestDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < skirtMesh.count; i++) {
      if (!skirtVisible[i]) continue
      const ix = i * 2
      const distance = Math.hypot(
        skirtMesh.positions[ix] - point.x,
        skirtMesh.positions[ix + 1] - point.y,
      )
      if (distance < bestDistance) {
        best = i
        bestDistance = distance
      }
    }
    return bestDistance < 165 ? best : -1
  }

  function onPointerDown(event: PointerEvent) {
    updatePointer(event)
    if (!pointer.active) return
    pointer.down = true
    pointer.id = event.pointerId
    pointer.grabbed = nearestVertex({ x: pointer.x, y: pointer.y })
    options.skirtCanvas.setPointerCapture(event.pointerId)
    options.skirtCanvas.style.cursor = 'grabbing'
    kick()
  }

  function onPointerMove(event: PointerEvent) {
    updatePointer(event)
    if (pointer.down) kick()
  }

  function onPointerUp(event: PointerEvent) {
    if (pointer.id !== event.pointerId && !pointer.down) return
    pointer.down = false
    pointer.id = -1
    pointer.grabbed = -1
    options.skirtCanvas.style.cursor = pointer.active ? 'grab' : 'default'
    if (options.skirtCanvas.hasPointerCapture(event.pointerId)) {
      options.skirtCanvas.releasePointerCapture(event.pointerId)
    }
  }

  function onPointerLeave(event: PointerEvent) {
    if (!pointer.down) {
      pointer.active = false
      pointer.vx = 0
      pointer.vy = 0
      options.skirtCanvas.style.cursor = 'default'
    }
    onPointerUp(event)
  }

  function kick() {
    kickImpulse = Math.max(kickImpulse, 8)
    start()
  }

  function onVisibility() {
    if (document.hidden) stop()
    else start()
  }

  options.skirtCanvas.addEventListener('pointerdown', onPointerDown)
  options.skirtCanvas.addEventListener('pointermove', onPointerMove)
  options.skirtCanvas.addEventListener('pointerup', onPointerUp)
  options.skirtCanvas.addEventListener('pointercancel', onPointerUp)
  options.skirtCanvas.addEventListener('pointerleave', onPointerLeave)
  document.addEventListener('visibilitychange', onVisibility)

  updateBody(0)
  bodyRenderer.draw(bodyMesh.positions)
  skirtRenderer.draw(skirtMesh.positions)
  if (debug.enabled) drawDebug()
  options.onReady()
  start()

  return {
    setDebug(on) {
      debug.enabled = on
      if (on) drawDebug()
      else debugCtx?.clearRect(0, 0, W, H)
    },
    kick,
    dispose() {
      disposed = true
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      options.skirtCanvas.removeEventListener('pointerdown', onPointerDown)
      options.skirtCanvas.removeEventListener('pointermove', onPointerMove)
      options.skirtCanvas.removeEventListener('pointerup', onPointerUp)
      options.skirtCanvas.removeEventListener('pointercancel', onPointerUp)
      options.skirtCanvas.removeEventListener('pointerleave', onPointerLeave)
      bodyRenderer.dispose()
      skirtRenderer.dispose()
    },
  }
}

function createMesh(
  cols: number,
  rows: number,
  x: number,
  y: number,
  width: number,
  height: number,
): Mesh {
  const count = cols * rows
  const rest = new Float32Array(count * 2)
  const positions = new Float32Array(count * 2)
  const uvs = new Float32Array(count * 2)
  const indices: number[] = []

  for (let row = 0; row < rows; row++) {
    const v = row / (rows - 1)
    for (let col = 0; col < cols; col++) {
      const u = col / (cols - 1)
      const index = row * cols + col
      const ix = index * 2
      const px = x + width * u
      const py = y + height * v
      rest[ix] = positions[ix] = px
      rest[ix + 1] = positions[ix + 1] = py
      uvs[ix] = (x + width * u) / 1050
      uvs[ix + 1] = 1 - py / 1105
    }
  }

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const a = row * cols + col
      const b = a + 1
      const c = a + cols
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  return {
    cols,
    rows,
    count,
    rest,
    positions,
    uvs,
    indices: new Uint16Array(indices),
  }
}

function createRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement, mesh: Mesh): Renderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
  })
  if (!gl) return null

  const vertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    [
      'attribute vec2 a_position;',
      'attribute vec2 a_uv;',
      'uniform vec2 u_resolution;',
      'varying vec2 v_uv;',
      'void main() {',
      '  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;',
      '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
      '  v_uv = a_uv;',
      '}',
    ].join('\n'),
  )
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    [
      'precision mediump float;',
      'uniform sampler2D u_texture;',
      'varying vec2 v_uv;',
      'void main() {',
      '  gl_FragColor = texture2D(u_texture, v_uv);',
      '}',
    ].join('\n'),
  )
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'WebGL program link failed')
  }

  const positionBuffer = gl.createBuffer()
  const uvBuffer = gl.createBuffer()
  const indexBuffer = gl.createBuffer()
  const texture = gl.createTexture()
  if (!positionBuffer || !uvBuffer || !indexBuffer || !texture) return null

  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW)
  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW)
  const uvLocation = gl.getAttribLocation(program, 'a_uv')
  gl.enableVertexAttribArray(uvLocation)
  gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)

  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height)
  gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.viewport(0, 0, canvas.width, canvas.height)

  return {
    draw(positions) {
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions)
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0)
    },
    dispose() {
      gl.deleteBuffer(positionBuffer)
      gl.deleteBuffer(uvBuffer)
      gl.deleteBuffer(indexBuffer)
      gl.deleteTexture(texture)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    },
  }
}

function buildConstraints(mesh: Mesh, active: Uint8Array): DistanceConstraint[] {
  const constraints: DistanceConstraint[] = []

  function add(a: number, b: number, compliance: number) {
    if (!active[a] || !active[b]) return
    const ia = a * 2
    const ib = b * 2
    const rest = Math.hypot(mesh.rest[ib] - mesh.rest[ia], mesh.rest[ib + 1] - mesh.rest[ia + 1])
    if (rest > 0) constraints.push({ a, b, rest, compliance, lambda: 0 })
  }

  for (let row = 0; row < mesh.rows; row++) {
    for (let col = 0; col < mesh.cols; col++) {
      const index = row * mesh.cols + col
      if (col + 1 < mesh.cols) add(index, index + 1, 2.5e-6)
      if (row + 1 < mesh.rows) add(index, index + mesh.cols, 2.5e-6)
      if (col + 1 < mesh.cols && row + 1 < mesh.rows) {
        add(index, index + mesh.cols + 1, 5e-6)
        add(index + 1, index + mesh.cols, 5e-6)
      }
      if (col + 2 < mesh.cols) add(index, index + 2, 1.2e-5)
      if (row + 2 < mesh.rows) add(index, index + mesh.cols * 2, 1.2e-5)
    }
  }
  return constraints
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create WebGL shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'WebGL shader compilation failed')
  }
  return shader
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to load ${source}`))
    image.src = source
  })
}

function readAlpha(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return new Uint8ClampedArray(image.naturalWidth * image.naturalHeight)
  ctx.drawImage(image, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const alpha = new Uint8ClampedArray(canvas.width * canvas.height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
  return alpha
}

function alphaAt(alpha: Uint8ClampedArray, width: number, height: number, x: number, y: number) {
  const px = Math.max(0, Math.min(width - 1, Math.round(x)))
  const py = Math.max(0, Math.min(height - 1, Math.round(y)))
  return alpha[py * width + px] ?? 0
}

function alphaNear(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
) {
  return Math.max(
    alphaAt(alpha, width, height, x, y),
    alphaAt(alpha, width, height, x - radius, y),
    alphaAt(alpha, width, height, x + radius, y),
    alphaAt(alpha, width, height, x, y - radius),
    alphaAt(alpha, width, height, x, y + radius),
  )
}

function rotatePoint(point: Point, pivot: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - pivot.x
  const dy = point.y - pivot.y
  return {
    x: pivot.x + dx * cos - dy * sin,
    y: pivot.y + dx * sin + dy * cos,
  }
}

function distanceToSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(x - ax, y - ay)
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / lengthSquared, 0, 1)
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t))
}

function smoothstep(edge0: number, edge1: number, value: number) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
</script>

<template>
  <div class="hero-rig fluid-float__rig" aria-hidden="true">
    <div class="hero-rig__layer hero-rig__layer--skirt">
      <img
        class="hero-rig__fallback hero-rig__fallback--skirt"
        :class="{ 'is-ready': ready }"
        :src="skirtSource"
        alt=""
      />
      <canvas
        ref="skirtCanvas"
        class="hero-rig__canvas hero-rig__canvas--skirt"
        :class="{ 'is-ready': ready }"
        @contextmenu.prevent
      />
    </div>
    <div class="hero-rig__layer hero-rig__layer--body">
      <img
        class="hero-rig__fallback"
        :class="{ 'is-ready': ready }"
        :src="bodySource"
        alt=""
      />
      <canvas
        ref="bodyCanvas"
        class="hero-rig__canvas"
        :class="{ 'is-ready': ready }"
      />
    </div>
    <canvas ref="debugCanvas" class="hero-rig__debug" />
  </div>
</template>

<style scoped>
.hero-rig {
  display: contents;
}

.hero-rig__layer {
  position: absolute;
  top: var(--hero-character-y);
  left: var(--hero-character-x);
  width: var(--hero-character-width);
  max-width: none;
  aspect-ratio: 1050 / 1105;
  pointer-events: none;
  user-select: none;
}

.hero-rig__layer--skirt {
  z-index: 1;
}

.hero-rig__layer--body {
  z-index: 4;
}

.hero-rig__canvas,
.hero-rig__fallback {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.hero-rig__canvas,
.hero-rig__fallback {
  filter:
    saturate(0.84)
    contrast(0.92)
    brightness(1.035)
    sepia(0.035)
    drop-shadow(0 12px 18px rgba(77, 65, 101, 0.16));
}

.hero-rig__canvas--skirt,
.hero-rig__fallback--skirt {
  filter:
    saturate(0.82)
    contrast(0.92)
    brightness(1.025)
    sepia(0.025)
    drop-shadow(0 16px 24px rgba(77, 65, 101, 0.14));
}

.hero-rig__canvas--skirt {
  pointer-events: auto;
  touch-action: none;
}

.hero-rig__canvas,
.hero-rig__fallback {
  opacity: 0;
}

.hero-rig__fallback {
  opacity: 1;
  transition: opacity 0.24s ease;
}

.hero-rig__canvas.is-ready {
  opacity: 1;
}

.hero-rig__fallback.is-ready {
  opacity: 0;
}

.hero-rig__debug {
  position: absolute;
  z-index: 6;
  top: var(--hero-character-y);
  left: var(--hero-character-x);
  width: var(--hero-character-width);
  max-width: none;
  height: auto;
  aspect-ratio: 1050 / 1105;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .hero-rig__canvas--skirt {
    pointer-events: none;
  }
}
</style>
