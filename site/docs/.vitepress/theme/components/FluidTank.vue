<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const root = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let dispose: (() => void) | null = null

onMounted(() => {
  if (!root.value || !canvasEl.value) return
  dispose = setup(canvasEl.value, root.value)
})

onBeforeUnmount(() => {
  dispose?.()
  dispose = null
})

function setup(canvas: HTMLCanvasElement, host: HTMLElement) {
  const ctx = canvas.getContext('2d')!

  /* ---------------- 可调参数 ---------------- */
  const CFG = {
    gravity: 1500, // px/s²
    spacing: 10, // 粒子间距（px）
    hFactor: 2.0, // 核半径 / 间距（太小邻居不足，密度估计会抖）
    iterations: 2, // 密度约束迭代次数
    relaxation: 0.62, // 位置修正松弛
    viscosity: 0.08, // XSPH 粘性
    wallDamp: 0.35, // 撞墙速度保留
    scrollLag: 2.4, // 滚动时水"滞空"的冲量系数（px 滚动 → px/s）
    dragStiffness: 75, // 拖拽弹簧刚度（越大跟手越快）
    dragDamping: 4, // 拖拽阻尼（越小越轻）
    bodyCount: 5,
    bodyHeightRatio: 0.36, // 小人高度 / 水槽高度（太大会踩到底就浮不起来）
    waterFill: 0.7, // 水面初始高度（从顶部算）：水占三分之一
  }

  const FIXED = 1 / 60
  let W = 0
  let H = 0
  let dpr = 1
  let h = CFG.hFactor * CFG.spacing
  let rho0 = 1
  const RHO_AREA = 1 / (CFG.spacing * CFG.spacing) // 每个像素面积的"水质量"

  /* ---------------- 粒子 ---------------- */
  let capacity = 4000
  let count = 0
  let px = new Float32Array(capacity)
  let py = new Float32Array(capacity)
  let vx = new Float32Array(capacity)
  let vy = new Float32Array(capacity)
  let qx = new Float32Array(capacity) // 预测位置
  let qy = new Float32Array(capacity)
  let lam = new Float32Array(capacity)
  let rho = new Float32Array(capacity)

  // 均匀网格（计数排序）
  let cols = 1
  let rows = 1
  let cellStart = new Int32Array(2)
  let cellItems = new Int32Array(capacity)
  let cellCount = new Int32Array(2)
  let surface = new Float32Array(96)
  let bottom = new Float32Array(96)
  let rawBottom = new Float32Array(96)
  let binMax = new Float32Array(96)
  let rawSurface = new Float32Array(96)
  let binMin = new Float32Array(96)
  let binMin2 = new Float32Array(96)
  let refBuf = new Float32Array(96)
  let smoothBuf = new Float32Array(96)
  let binCnt = new Int32Array(96)
  let surfaceInit = false
  let surfaceRefPrev = 0 // 上一帧水面基准（用来判断整片水是不是在快速移动）
  let waterLevel = 0 // 平滑后的平均水位，浮力只认它（不跟局部波峰联动）
  const BINS = 96

  /* ---------------- 刚体 ---------------- */
  type Body = {
    x: number
    y: number
    vx: number
    vy: number
    a: number
    av: number
    r: number
    hl: number
    m: number
    invM: number
    rot: number
    flip: number
    scale: number
    frac: number
    rawPrev: number
    inWater: boolean
    squash: number
  }
  let bodies: Body[] = []
  let sprite: HTMLImageElement | null = null
  let spriteReady = false
  let bg: HTMLImageElement | null = null
  let bgReady = false
  let bgIsSmall = false
  let bgCache: HTMLCanvasElement | null = null
  let spriteDim: HTMLCanvasElement | null = null

  /* ---------------- 交互状态 ---------------- */
  const pointer = { x: 0, y: 0, down: false, id: -1 }
  let grabbed: Body | null = null
  let grabOx = 0
  let grabOy = 0
  let splashTotal = 0
  let entryEvents = 0
  const trail: string[] = []

  /* ---------------- 滚动惯性 ---------------- */
  let lastScroll = window.scrollY
  let scrollV = 0
  let scrollKick = 0 // 待施加的竖直冲量（px/s），正数=向下
  let camOffset = 0
  let scrollSpinCd = 0
  let fps = 0
  let fpsFrames = 0
  let fpsTime = 0

  /* ---------------- 初始化 ---------------- */
  function layout() {
    W = host.clientWidth
    H = host.clientHeight
    dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    waterGrad = null
    bgCache = null
    surfaceInit = false
  }

  function buildParticles() {
    refreshKernels()
    const top = H * CFG.waterFill
    const sp = CFG.spacing
    let i = 0
    for (let y = top, row = 0; y < H - sp * 0.5; y += sp * 0.87, row++) {
      const off = row % 2 ? sp * 0.5 : 0
      for (let x = sp * 0.6 + off; x < W - sp * 0.6; x += sp) {
        if (i >= capacity) break
        px[i] = qx[i] = x
        py[i] = qy[i] = y
        vx[i] = vy[i] = 0
        lam[i] = 0
        i++
      }
    }
    count = i
    // 用初始晶格估一个静止密度
    const mid = Math.floor(count / 2)
    let d = 0
    for (let j = 0; j < count; j++) {
      const dx = px[mid] - px[j]
      const dy = py[mid] - py[j]
      const r2 = dx * dx + dy * dy
      if (r2 < h * h) d += poly6(r2)
    }
    rho0 = Math.max(1e-6, d)
    cols = Math.ceil(W / h) + 1
    rows = Math.ceil(H / h) + 1
    cellStart = new Int32Array(cols * rows + 1)
    cellCount = new Int32Array(cols * rows + 1)
    cellItems = new Int32Array(Math.max(1, count))
  }

  function buildBodies() {
    bodies = []
    const charH = H * CFG.bodyHeightRatio
    const charW = charH * (274 / 512)
    const r = charW * 0.22
    const hl = charH * 0.3
    const area = 4 * r * hl + Math.PI * r * r
    const m = 0.55 * area * RHO_AREA
    const waterY = H * CFG.waterFill
    for (let i = 0; i < CFG.bodyCount; i++) {
      const t = (i + 0.5) / CFG.bodyCount
      bodies.push({
        x: W * (0.1 + 0.8 * t) + (Math.random() - 0.5) * 20,
        // 从水面上方落下来，落水才有明显的水花
        y: waterY - charH * 0.85 - i * 14,
        vx: (Math.random() - 0.5) * 40,
        vy: 80 + i * 20,
        a: (Math.random() - 0.5) * 0.12,
        av: (Math.random() - 0.5) * 0.3,
        r,
        hl,
        m,
        invM: 1 / m,
        rot: 0,
        flip: i % 2 === 1 ? -1 : 1,
        scale: charH / 501,
        frac: 0,
        rawPrev: 0,
        inWater: false,
        squash: 1,
      })
    }
  }

  /* ---------------- 核函数 ---------------- */
  // 系数提到外面：每帧上万次调用，别在里面算 pow
  let poly6K = 1
  let spikyK = 1
  function refreshKernels() {
    poly6K = 4 / (Math.PI * Math.pow(h, 8))
    spikyK = -30 / (Math.PI * Math.pow(h, 5))
  }
  function poly6(r2: number) {
    const d = h * h - r2
    return d <= 0 ? 0 : poly6K * d * d * d
  }
  function spikyGrad(r: number, dx: number, dy: number) {
    if (r <= 0 || r >= h) return [0, 0]
    const k = (spikyK * (h - r) * (h - r)) / r
    return [k * dx, k * dy]
  }

  /* ---------------- 网格 ---------------- */
  function buildGrid() {
    cellCount.fill(0)
    for (let i = 0; i < count; i++) {
      const cx = Math.min(cols - 1, Math.max(0, (qx[i] / h) | 0))
      const cy = Math.min(rows - 1, Math.max(0, (qy[i] / h) | 0))
      cellCount[cy * cols + cx]++
    }
    let sum = 0
    for (let c = 0; c < cols * rows; c++) {
      cellStart[c] = sum
      sum += cellCount[c]
    }
    cellStart[cols * rows] = sum
    cellCount.fill(0)
    for (let i = 0; i < count; i++) {
      const cx = Math.min(cols - 1, Math.max(0, (qx[i] / h) | 0))
      const cy = Math.min(rows - 1, Math.max(0, (qy[i] / h) | 0))
      const c = cy * cols + cx
      cellItems[cellStart[c] + cellCount[c]++] = i
    }
  }

  /* ---------------- 刚体几何 ---------------- */
  function bodySegment(b: Body) {
    const dx = Math.sin(b.a) * b.hl
    const dy = Math.cos(b.a) * b.hl
    return [b.x - dx, b.y - dy, b.x + dx, b.y + dy] as const
  }

  function capsuleDistance(b: Body, x: number, y: number) {
    const [ax, ay, bx, by] = bodySegment(b)
    const ex = bx - ax
    const ey = by - ay
    const len2 = ex * ex + ey * ey || 1
    let t = ((x - ax) * ex + (y - ay) * ey) / len2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const cx = ax + ex * t
    const cy = ay + ey * t
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy) || 1e-4
    return [d - b.r, dx / d, dy / d] as const
  }

  /* ---------------- 水面高度场（给浮力用） ---------------- */
  function updateSurface() {
    if (surface.length !== BINS) surface = new Float32Array(BINS)
    if (bottom.length !== BINS) bottom = new Float32Array(BINS)
    if (rawSurface.length !== BINS) rawSurface = new Float32Array(BINS)
    if (binMin.length !== BINS) {
      binMin = new Float32Array(BINS)
      binMin2 = new Float32Array(BINS)
      refBuf = new Float32Array(BINS)
      smoothBuf = new Float32Array(BINS)
      binMax = new Float32Array(BINS)
      binCnt = new Int32Array(BINS)
    }
    binMin.fill(H)
    binMin2.fill(H)
    binMax.fill(0)
    binCnt.fill(0)
    for (let i = 0; i < count; i++) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      // 记最小的两个 y：水面取最高粒子，第二低的用来判断是不是孤立水滴
      if (py[i] < binMin[bin]) {
        binMin2[bin] = binMin[bin]
        binMin[bin] = py[i]
      } else if (py[i] < binMin2[bin]) {
        binMin2[bin] = py[i]
      }
      if (py[i] > binMax[bin]) binMax[bin] = py[i]
      binCnt[bin]++
    }
    // 水位只由"粒子数 × 每颗占的面积"决定 —— 总量恒定，滚动/晃动不会改变整体水位
    const level = H - (count * CFG.spacing * CFG.spacing * 0.9) / W
    waterLevel = level

    // 1) 每格的水面候选：最高的粒子（粒子太少说明这格被刚体占了，先留空）
    let valid = 0
    for (let b = 0; b < BINS; b++) {
      if (binCnt[b] >= 8) {
        rawSurface[b] = binMin[b]
        valid++
      } else {
        rawSurface[b] = NaN
      }
    }
    // 2) 孤立水滴去掉：一格只有一两颗粒子飞得高，就把它拉回左右邻域的中位数。
    //    整片水一起抬起来时邻域一起抬，所以滞空不会被削掉。
    for (let b = 0; b < BINS; b++) {
      if (Number.isNaN(rawSurface[b])) continue
      let m = 0
      for (let k = -2; k <= 2; k++) {
        const idx = Math.min(BINS - 1, Math.max(0, b + k))
        const v = rawSurface[idx]
        if (!Number.isNaN(v)) refBuf[m++] = v
      }
      const med = refBuf.subarray(0, m).sort()[m >> 1]
      rawSurface[b] = Math.min(med + 20, Math.max(med - 20, rawSurface[b]))
    }
    // 3) 全局基准取"所有有效格的中位数"。
    //    以前这个基准是静止水位 level，一旦整片水被甩起来（滞空），线就被
    //    level - 120 卡住，落到水体中间；现在基准跟着水体现在的位置走。
    let ref = level
    if (valid > 0) {
      let n = 0
      for (let b = 0; b < BINS; b++) if (!Number.isNaN(rawSurface[b])) refBuf[n++] = rawSurface[b]
      const sorted = refBuf.subarray(0, n)
      sorted.sort()
      ref = sorted[n >> 1]
    }
    // 每格相对基准的偏离限制在 ±48px：水柱/水花能抬起个别格，但拽不走整条线
    for (let b = 0; b < BINS; b++) {
      const v = rawSurface[b]
      rawSurface[b] = Number.isNaN(v) ? ref : Math.min(ref + 48, Math.max(ref - 48, v))
    }
    // 3) 空间平滑：水面整体要平，只留缓的起伏
    smoothBuf.set(rawSurface)
    // 整片水在快速上下移动（滞空 / 落回）时基准每帧会跳好几像素，
    // 这时时间平滑要几乎等于直接跟随，否则线会拖在水体后面
    const moving = Math.abs(ref - surfaceRefPrev) > 3
    for (let b = 0; b < BINS; b++) {
      let s = 0
      let w = 0
      for (let k = -3; k <= 3; k++) {
        const idx = Math.min(BINS - 1, Math.max(0, b + k))
        const wk = 4 - Math.abs(k)
        s += smoothBuf[idx] * wk
        w += wk
      }
      const smooth = s / w
      // 4) 时间平滑：静止时压抖动，动得越快跟得越快。
      //    固定 0.14 会在快甩时严重滞后 —— 水已经飞上去了，线还留在原地。
      const err = smooth - surface[b]
      const k = moving ? 0.9 : Math.min(0.6, 0.12 + Math.abs(err) / 120)
      surface[b] = surfaceInit ? surface[b] + err * k : smooth
    }
    surfaceRefPrev = ref
    // 5) 下边界：平时贴着池底；整片水滞空时抬起来，露出下面的空隙
    let validB = 0
    for (let b = 0; b < BINS; b++) {
      if (binCnt[b] >= 4) {
        rawBottom[b] = Math.min(H, binMax[b])
        refBuf[validB++] = rawBottom[b]
      } else {
        rawBottom[b] = NaN
      }
    }
    let refB = H
    if (validB > 0) {
      const sorted = refBuf.subarray(0, validB)
      sorted.sort()
      refB = sorted[validB >> 1]
    }
    for (let b = 0; b < BINS; b++) {
      const v = rawBottom[b]
      rawBottom[b] = Number.isNaN(v) ? refB : Math.min(refB + 60, Math.max(refB - 60, v))
    }
    smoothBuf.set(rawBottom)
    for (let b = 0; b < BINS; b++) {
      let s = 0
      let w = 0
      for (let k = -4; k <= 4; k++) {
        const idx = Math.min(BINS - 1, Math.max(0, b + k))
        const wk = 5 - Math.abs(k)
        s += smoothBuf[idx] * wk
        w += wk
      }
      const smooth = s / w
      const err = smooth - bottom[b]
      const k = moving ? 0.9 : Math.min(0.6, 0.16 + Math.abs(err) / 120)
      bottom[b] = surfaceInit ? bottom[b] + err * k : smooth
    }
    surfaceInit = true
  }

  function surfaceAt(x: number) {
    const t = Math.min(BINS - 1, Math.max(0, (x / W) * (BINS - 1)))
    const i = t | 0
    const f = t - i
    return surface[i] * (1 - f) + surface[Math.min(BINS - 1, i + 1)] * f
  }

  /* ---------------- 步进 ---------------- */
  function step(dt: number) {
    updateSurface()

    /* 1. 刚体：重力 + 浮力 + 阻力 */
    for (const b of bodies) {
      const [ax, ay, bx, by] = bodySegment(b)
      let fracSum = 0
      const N = 9
      let cxs = 0
      let cys = 0
      let nSub = 0
      for (let k = 0; k < N; k++) {
        const t = k / (N - 1)
        const sx = ax + (bx - ax) * t
        const sy = ay + (by - ay) * t
        // 浮力用平均水位，不用局部水面：否则刚体排水 → 水面升高 → 浮力变大 → 又弹起来
        const surf = waterLevel
        // 圆的哪一部分在水面以下：y 向下，所以是 (圆心 + 半径 - 水面) / 直径
        const f = Math.min(1, Math.max(0, (sy + b.r - surf) / (2 * b.r)))
        fracSum += f
        if (f > 0) {
          cxs += sx
          cys += sy
          nSub++
        }
      }
      // 浸没比例做时间平滑，浮力才不会一帧一帧地抖
      const prevFrac = b.frac
      const fracRaw = fracSum / N
      b.frac += (fracRaw - b.frac) * 0.25
      const area = 4 * b.r * b.hl + Math.PI * b.r * b.r
      const weight = b.m * CFG.gravity
      const buoy = area * b.frac * RHO_AREA * CFG.gravity
      b.vy += ((weight - buoy) / b.m) * dt
      b.vy -= scrollKick * 0.55
      // 水的阻力 + 姿态回正（阻尼够大才不会上下弹）
      const drag = Math.min(1, b.frac * 6)
      b.vx *= 1 - Math.min(0.5, drag * 3.2 * dt)
      b.vy *= 1 - Math.min(0.6, drag * 4.2 * dt)
      // 姿态：允许自由旋转，只保留很弱的回正和水阻（不然会一直挺着不动）
      b.av *= 1 - Math.min(0.8, 0.35 + b.frac * 1.6) * dt
      if (b.frac > 0.02) b.av += (-b.a * 2.6 - b.av * 1.5) * b.frac * dt
      b.av = Math.max(-7, Math.min(7, b.av))
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.a += b.av * dt

      // 入水那一瞬间：溅水 + 给水面一个冲击
      // 入水判定用"是否在水里"的状态切换（逐帧比值更稳，不会被渐变跨过）
      const nowIn = fracRaw > 0.1
      if (!b.inWater && nowIn && b.vy > 90) {
        entryEvents++
        const power = Math.min(1.9, 0.35 + b.vy / 650)
        splash(b.x, Math.max(0, waterLevel), power)
      }
      b.inWater = nowIn
      b.rawPrev = fracRaw
      if (trail.length < 80 && b === bodies[0]) trail.push(`${Math.round(b.vy)}|${fracRaw.toFixed(2)}|${Math.round(b.y)}`)
      // 落地/撞墙
      const lim = b.hl + b.r
      if (b.x < lim) {
        b.x = lim
        b.vx = Math.abs(b.vx) * 0.3
      }
      if (b.x > W - lim) {
        b.x = W - lim
        b.vx = -Math.abs(b.vx) * 0.3
      }
      if (b.y > H - lim) {
        b.y = H - lim
        b.vy = -Math.abs(b.vy) * 0.25
        b.av *= 0.9
      }
      if (b.y < lim) {
        b.y = lim
        b.vy = Math.abs(b.vy) * 0.2
      }
    }

    /* 2. 刚体-刚体碰撞（胶囊用线段近似） */
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const A = bodies[i]
        const B = bodies[j]
        const [ax, ay, bx2, by2] = bodySegment(A)
        const [cx2, cy2, dx2, dy2] = bodySegment(B)
        const p = closestSegSeg(ax, ay, bx2, by2, cx2, cy2, dx2, dy2)
        const dx = p[2] - p[0]
        const dy = p[3] - p[1]
        const dist = Math.hypot(dx, dy) || 1e-4
        const overlap = A.r + B.r - dist
        if (overlap > 0) {
          const nx = dx / dist
          const ny = dy / dist
          const total = A.invM + B.invM
          A.x -= nx * overlap * (A.invM / total) * 0.6
          A.y -= ny * overlap * (A.invM / total) * 0.6
          B.x += nx * overlap * (B.invM / total) * 0.6
          B.y += ny * overlap * (B.invM / total) * 0.6
          const rvx = B.vx - A.vx
          const rvy = B.vy - A.vy
          const vn = rvx * nx + rvy * ny
          if (vn < 0) {
            const imp = (-vn * 1.2) / total
            A.vx -= nx * imp * A.invM
            A.vy -= ny * imp * A.invM
            B.vx += nx * imp * B.invM
            B.vy += ny * imp * B.invM
          }
        }
      }
    }

    /* 3. 粒子预测 */
    for (let i = 0; i < count; i++) {
      vy[i] += CFG.gravity * dt
      vy[i] -= scrollKick
      // 轻微阻尼，避免能量堆积
      vx[i] *= 0.999
      vy[i] *= 0.999
      qx[i] = px[i] + vx[i] * dt
      qy[i] = py[i] + vy[i] * dt
      lam[i] = 0
    }
    scrollKick = 0

    /* 4. 刚体把粒子顶出去（双向的动量反作用） */
    for (const b of bodies) {
      const [ax, ay, bx2, by2] = bodySegment(b)
      const ex = bx2 - ax
      const ey = by2 - ay
      const len2 = ex * ex + ey * ey || 1
      const minX = Math.min(ax, bx2) - b.r - h
      const maxX = Math.max(ax, bx2) + b.r + h
      const minY = Math.min(ay, by2) - b.r - h
      const maxY = Math.max(ay, by2) + b.r + h
      for (let i = 0; i < count; i++) {
        if (qx[i] < minX || qx[i] > maxX || qy[i] < minY || qy[i] > maxY) continue
        let t = ((qx[i] - ax) * ex + (qy[i] - ay) * ey) / len2
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const cxp = ax + ex * t
        const cyp = ay + ey * t
        let dx = qx[i] - cxp
        let dy = qy[i] - cyp
        let d = Math.hypot(dx, dy)
        if (d < b.r) {
          if (d < 1e-4) {
            dx = 0
            dy = -1
            d = 1
          }
          // 单帧最多推 3px，剩下的靠后续帧慢慢分开，避免把水打飞
          const push = Math.min(6, b.r - d + 0.3)
          const nx = dx / d
          const ny = dy / d
          qx[i] += nx * push
          qy[i] += ny * push
          // 速度也做一次分离，避免粒子粘在表面
          // 刚体表面速度（含转动）
          const bxv = b.vx - b.av * (cyp - b.y)
          const byv = b.vy + b.av * (cxp - b.x)
          const vn = (vx[i] - bxv) * nx + (vy[i] - byv) * ny
          if (vn < 0) {
            // 把压进去的相对速度推回去，再加一点跟穿透深度相关的冲量 → 水被明显推开
            const kick = -vn * 1.25 + push * 7
            vx[i] += nx * kick
            vy[i] += ny * kick
            // 反作用：水推刚体，并产生力矩
            const imp = Math.min(1.4, push * 0.06) * b.invM * 8
            b.vx -= nx * imp
            b.vy -= ny * imp
            b.av += ((cxp - b.x) * -ny - (cyp - b.y) * -nx) * imp * 0.0006
          }
        }
      }
    }

    /* 5. 密度约束（PBF） */
    for (let it = 0; it < CFG.iterations; it++) {
      buildGrid()
      for (let i = 0; i < count; i++) {
        const cx = Math.min(cols - 1, Math.max(0, (qx[i] / h) | 0))
        const cy = Math.min(rows - 1, Math.max(0, (qy[i] / h) | 0))
        let d = 0
        let gx = 0
        let gy = 0
        let sumG2 = 0
        for (let oy = -1; oy <= 1; oy++) {
          const yy = cy + oy
          if (yy < 0 || yy >= rows) continue
          for (let ox = -1; ox <= 1; ox++) {
            const xx = cx + ox
            if (xx < 0 || xx >= cols) continue
            const c = yy * cols + xx
            const s = cellStart[c]
            const e = s + cellCount[c]
            for (let k = s; k < e; k++) {
              const j = cellItems[k]
              if (j === i) continue
              const dx = qx[i] - qx[j]
              const dy = qy[i] - qy[j]
              const r2 = dx * dx + dy * dy
              if (r2 >= h * h) continue
              d += poly6(r2)
              const r = Math.sqrt(r2)
              const g = spikyGrad(r, dx, dy)
              gx += g[0]
              gy += g[1]
              sumG2 += (g[0] * g[0] + g[1] * g[1]) / (rho0 * rho0)
            }
          }
        }
        rho[i] = d + poly6(0)
        const C = rho[i] / rho0 - 1
        // 分母是 Σ|∇C_j|²（逐邻居累加），不是 |Σ∇C|²
        lam[i] = -C / (sumG2 + 1e-4)
      }
      for (let i = 0; i < count; i++) {
        const cx = Math.min(cols - 1, Math.max(0, (qx[i] / h) | 0))
        const cy = Math.min(rows - 1, Math.max(0, (qy[i] / h) | 0))
        let dxSum = 0
        let dySum = 0
        for (let oy = -1; oy <= 1; oy++) {
          const yy = cy + oy
          if (yy < 0 || yy >= rows) continue
          for (let ox = -1; ox <= 1; ox++) {
            const xx = cx + ox
            if (xx < 0 || xx >= cols) continue
            const c = yy * cols + xx
            const s = cellStart[c]
            const e = s + cellCount[c]
            for (let k = s; k < e; k++) {
              const j = cellItems[k]
              if (j === i) continue
              const dx = qx[i] - qx[j]
              const dy = qy[i] - qy[j]
              const r2 = dx * dx + dy * dy
              if (r2 >= h * h || r2 < 1e-8) continue
              const r = Math.sqrt(r2)
              const g = spikyGrad(r, dx, dy)
              const w = (lam[i] + lam[j]) / rho0
              dxSum += g[0] * w
              dySum += g[1] * w
            }
          }
        }
        const maxStep = h * 0.15
        qx[i] += Math.max(-maxStep, Math.min(maxStep, dxSum * CFG.relaxation))
        qy[i] += Math.max(-maxStep, Math.min(maxStep, dySum * CFG.relaxation))
      }
    }

    /* 6. 边界 + 速度回写 + 粘性 */
    for (let i = 0; i < count; i++) {
      if (qx[i] < 4) {
        qx[i] = 4
        vx[i] = Math.abs(vx[i]) * CFG.wallDamp
      }
      if (qx[i] > W - 4) {
        qx[i] = W - 4
        vx[i] = -Math.abs(vx[i]) * CFG.wallDamp
      }
      if (qy[i] > H - 4) {
        qy[i] = H - 4
        vy[i] = -Math.abs(vy[i]) * CFG.wallDamp
        vx[i] *= 0.9
      }
      if (qy[i] < 4) {
        qy[i] = 4
        vy[i] = Math.abs(vy[i]) * 0.2
      }
      vx[i] = (qx[i] - px[i]) / dt
      vy[i] = (qy[i] - py[i]) / dt
      const speed = Math.hypot(vx[i], vy[i])
      if (speed > 2600) {
        vx[i] *= 2600 / speed
        vy[i] *= 2600 / speed
      }
      px[i] = qx[i]
      py[i] = qy[i]
    }

    // XSPH 粘性
    if (CFG.viscosity > 0) {
      buildGrid()
      for (let i = 0; i < count; i++) {
        const cx = Math.min(cols - 1, Math.max(0, (px[i] / h) | 0))
        const cy = Math.min(rows - 1, Math.max(0, (py[i] / h) | 0))
        let ax = 0
        let ay = 0
        for (let oy = -1; oy <= 1; oy++) {
          const yy = cy + oy
          if (yy < 0 || yy >= rows) continue
          for (let ox = -1; ox <= 1; ox++) {
            const xx = cx + ox
            if (xx < 0 || xx >= cols) continue
            const c = yy * cols + xx
            const s = cellStart[c]
            const e = s + cellCount[c]
            for (let k = s; k < e; k++) {
              const j = cellItems[k]
              if (j === i) continue
              const dx = px[i] - px[j]
              const dy = py[i] - py[j]
              const r2 = dx * dx + dy * dy
              if (r2 >= h * h) continue
              const w = poly6(r2) / rho0
              ax += (vx[j] - vx[i]) * w
              ay += (vy[j] - vy[i]) * w
            }
          }
        }
        vx[i] += ax * CFG.viscosity
        vy[i] += ay * CFG.viscosity
      }
    }

    /* 7. 拖拽弹簧 */
    if (grabbed && pointer.down) {
      const tx = pointer.x + grabOx
      const ty = pointer.y + grabOy
      const fx = (tx - grabbed.x) * CFG.dragStiffness
      const fy = (ty - grabbed.y) * CFG.dragStiffness
      grabbed.vx += fx * dt
      grabbed.vy += fy * dt
      // 抓的点不在质心 → 有力矩，拖着会转
      const armX = -grabOx
      const armY = -grabOy
      const inertia = grabbed.r * grabbed.r + grabbed.hl * grabbed.hl
      grabbed.av += ((armX * fy - armY * fx) / inertia) * 0.06
      grabbed.vx *= 1 - CFG.dragDamping * dt
      grabbed.vy *= 1 - CFG.dragDamping * dt
      grabbed.av *= 1 - 8 * dt
      const gs = Math.hypot(grabbed.vx, grabbed.vy)
      if (gs > 2400) {
        grabbed.vx *= 2400 / gs
        grabbed.vy *= 2400 / gs
      }
    }
  }

  function closestSegSeg(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number,
  ) {
    const ux = bx - ax
    const uy = by - ay
    const vx2 = dx - cx
    const vy2 = dy - cy
    const wx = ax - cx
    const wy = ay - cy
    const a = ux * ux + uy * uy
    const b = ux * vx2 + uy * vy2
    const c = vx2 * vx2 + vy2 * vy2
    const d = ux * wx + uy * wy
    const e = vx2 * wx + vy2 * wy
    const den = a * c - b * b
    let s = den !== 0 ? (b * e - c * d) / den : 0
    let t = den !== 0 ? (a * e - b * d) / den : 0
    s = Math.max(0, Math.min(1, s))
    t = Math.max(0, Math.min(1, t))
    return [ax + ux * s, ay + uy * s, cx + vx2 * t, cy + vy2 * t] as const
  }

  /* ---------------- 渲染 ---------------- */
  let waterGrad: CanvasGradient | null = null

  /** 用水面高度场画一条平滑的水线 */
  function traceSurface() {
    const pts: [number, number][] = []
    for (let i = 0; i < BINS; i++) pts.push([(i / (BINS - 1)) * W, surface[i]])
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i][0] + pts[i + 1][0]) / 2
      const yc = (pts[i][1] + pts[i + 1][1]) / 2
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], xc, yc)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last[0], last[1])
  }

  function render() {
    // 背景：融合背景图（cover 自适应），没加载好时退回深色渐变
    ctx.clearRect(0, 0, W, H)
    if (bgReady && bg) {
      // 背景提前缩放到水槽尺寸缓存起来，每帧只做一次 1:1 贴图
      if (!bgCache) buildBgCache()
      if (bgCache) {
        ctx.globalAlpha = 0.96
        ctx.drawImage(bgCache, 0, 0, W, H)
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fillRect(0, 0, W, H)
      const shade = ctx.createLinearGradient(0, H * 0.4, 0, H)
      shade.addColorStop(0, 'rgba(4, 10, 26, 0)')
      shade.addColorStop(1, 'rgba(4, 10, 26, 0.6)')
      ctx.fillStyle = shade
      ctx.fillRect(0, H * 0.4, W, H * 0.6)
    } else {
      const fallback = ctx.createLinearGradient(0, 0, 0, H)
      fallback.addColorStop(0, '#0a1730')
      fallback.addColorStop(1, '#050b18')
      ctx.fillStyle = fallback
      ctx.fillRect(0, 0, W, H)
    }

    ctx.save()
    ctx.translate(0, camOffset)

    // 水面：高度场 → 平滑曲线 → 填充
    if (!waterGrad) {
      waterGrad = ctx.createLinearGradient(0, H * 0.25, 0, H)
      waterGrad.addColorStop(0, 'rgba(120, 196, 255, 0.4)')
      waterGrad.addColorStop(0.35, 'rgba(48, 120, 232, 0.52)')
      waterGrad.addColorStop(1, 'rgba(10, 36, 118, 0.68)')
    }
    traceSurface()
    // 沿水体下边界回来：平时就是池底，整片水"滞空"时会露出下面的空隙
    ctx.lineTo(W, bottom[BINS - 1])
    // 下边界也用二次曲线连，避免折线锯齿
    for (let i = BINS - 1; i >= 1; i--) {
      const x0 = (i / (BINS - 1)) * W
      const x1 = ((i - 1) / (BINS - 1)) * W
      const xm = (x0 + x1) / 2
      const ym = (bottom[i] + bottom[i - 1]) / 2
      ctx.quadraticCurveTo(x0, bottom[i], xm, ym)
    }
    ctx.lineTo(0, bottom[0])
    ctx.closePath()
    ctx.fillStyle = waterGrad
    ctx.fill()

    // 水线高光
    traceSurface()
    ctx.strokeStyle = 'rgba(200, 235, 255, 0.75)'
    ctx.lineWidth = 1.6
    ctx.stroke()

    // 水面附近的泡沫点
    ctx.fillStyle = 'rgba(225, 242, 255, 0.5)'
    for (let i = 0; i < count; i += 3) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      const d = py[i] - surface[bin]
      if (d > -1 && d < 6) {
        ctx.fillRect(px[i], py[i], 1.6, 1.6)
      }
    }

    // 飞溅：直接把"飞到水面以上"的模拟粒子画成短水线（不是额外特效）
    ctx.lineCap = 'round'
    for (let i = 0; i < count; i++) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      const above = surface[bin] - py[i]
      // 水面取的就是最高粒子，正常贴在水面的粒子几乎不会高于它；
      // 这里留 4px 余量，只把真正飞离水面的画成水线
      if (above <= 4) continue
      const sp = Math.hypot(vx[i], vy[i])
      const len = Math.min(7, Math.max(1.4, sp * 0.01))
      const nx = sp > 1 ? vx[i] / sp : 0
      const ny = sp > 1 ? vy[i] / sp : 1
      ctx.globalAlpha = Math.min(0.9, 0.25 + above / 70)
      ctx.strokeStyle = above > 40 ? '#f2fbff' : '#cfe8ff'
      ctx.lineWidth = above > 30 ? 1.8 : 1.4
      ctx.beginPath()
      ctx.moveTo(px[i], py[i])
      ctx.lineTo(px[i] - nx * len, py[i] - ny * len)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // 小人
    for (const b of bodies) {
      const submerged = b.frac > 0.25
      ctx.save()
      ctx.translate(b.x, b.y + b.r * 0.55)
      ctx.rotate(b.a)
      const sy = 1 + Math.max(-0.18, Math.min(0.18, b.vy * 0.00035))
      const sx = 1 / sy
      ctx.scale(b.flip * sx, sy)
      if (spriteReady && sprite) {
        const sw = 274 * b.scale
        const sh = 512 * b.scale
        const img = submerged && spriteDim ? spriteDim : sprite
        ctx.drawImage(img, -sw / 2, -sh * 0.55, sw, sh)
      } else {
        ctx.fillStyle = 'rgba(200,220,255,0.5)'
        ctx.fillRect(-b.r, -b.hl - b.r, b.r * 2, (b.hl + b.r) * 2)
      }
      ctx.restore()
    }

    ctx.restore()
  }

  /* ---------------- 输入 ---------------- */
  function toLocal(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top] as const
  }

  function onDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId)
    const [x, y] = toLocal(e)
    pointer.down = true
    pointer.x = x
    pointer.y = y
    pointer.id = e.pointerId
    let best: Body | null = null
    let bestD = Infinity
    for (const b of bodies) {
      const [d] = capsuleDistance(b, x, y)
      const pick = Math.max(0, d) + Math.abs(y - b.y) * 0.001
      if (d < 18 && pick < bestD) {
        best = b
        bestD = pick
      }
    }
    if (best) {
      grabbed = best
      grabOx = best.x - x
      grabOy = best.y - y
      canvas.style.cursor = 'grabbing'
    } else {
      splash(x, y, 1)
    }
  }

  function onMove(e: PointerEvent) {
    const [x, y] = toLocal(e)
    pointer.x = x
    pointer.y = y
    if (!pointer.down) {
      let over = false
      for (const b of bodies) {
        if (capsuleDistance(b, x, y)[0] < 18) {
          over = true
          break
        }
      }
      canvas.style.cursor = over ? 'grab' : 'crosshair'
    }
  }

  function onUp(e: PointerEvent) {
    pointer.down = false
    if (grabbed) {
      grabbed.av += (Math.random() - 0.5) * 0.6
      grabbed = null
    }
    canvas.style.cursor = 'crosshair'
    try {
      canvas.releasePointerCapture(e.pointerId)
    } catch {}
  }

  function splash(x: number, y: number, power: number) {
    splashTotal++
    const R = 84
    for (let i = 0; i < count; i++) {
      const dx = px[i] - x
      const dy = py[i] - y
      const d2 = dx * dx + dy * dy
      if (d2 > R * R) continue
      const d = Math.sqrt(d2) || 1
      const fall = 1 - d / R
      const f = fall * 430 * power
      vx[i] += (dx / d) * f * 0.9
      // 向上抛，形成真实的水柱（这些就是模拟粒子，会自己落回去）
      vy[i] += (dy / d) * f - 390 * power * fall
    }
  }

  /* ---------------- 主循环 ---------------- */
  let raf = 0
  let last = performance.now()
  let acc = 0
  let visible = true
  let running = true

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    // 布局还没量到尺寸时别画，否则会留下一帧错误画面
    if (!running || !visible || !W || !H) {
      last = now
      return
    }
    const dtReal = Math.min(0.05, (now - last) / 1000)
    last = now
    fpsTime += dtReal
    fpsFrames++
    if (fpsTime > 0.5) {
      fps = Math.round(fpsFrames / fpsTime)
      fpsTime = 0
      fpsFrames = 0
    }

    // 滚动 → 惯性力
    const sy = window.scrollY
    const dScroll = sy - lastScroll
    lastScroll = sy
    scrollV = scrollV * 0.7 + (dScroll / Math.max(0.004, dtReal)) * 0.3
    if (Math.abs(dScroll) > 0.2) {
      // 页面往下滚 ≈ 水槽整体向下位移；水没被带走，相对水槽就是往上"滞空"，
      // 下一帧开始由重力把它拉回去。这里给的是速度冲量，不是持续加速度。
      scrollKick += dScroll * CFG.scrollLag
      scrollKick = Math.max(-520, Math.min(520, scrollKick))
    }
    const camTarget = Math.max(-16, Math.min(16, -scrollV * 0.02))
    camOffset = camOffset * 0.9 + camTarget * 0.1

    // 滚动时给每个小人一个随机方向的力矩：只有平动太假
    scrollSpinCd -= dtReal
    if (Math.abs(scrollV) > 240 && scrollSpinCd <= 0) {
      scrollSpinCd = 0.26
      for (const b of bodies) b.av += (Math.random() - 0.5) * 5.6
    }

    acc += dtReal
    let steps = 0
    while (acc >= FIXED && steps < 2) {
      step(FIXED)
      acc -= FIXED
      steps++
    }
    if (steps === 0) {
      // 仍然刷新一次画面（例如刚恢复）
    }
    render()
  }

  /* ---------------- 生命周期 ---------------- */
  layout()
  buildParticles()
  buildBodies()
  sprite = new Image()
  sprite.onload = () => {
    spriteReady = true
    buildSpriteDim()
    if (W > 0 && H > 0) render()
  }
  sprite.src = withBase('/sprites/hongshexin.png')

  // 背景图：手机用 1100px 那张，桌面用 1600px 的
  function buildBgCache() {
    if (!bg || W <= 0 || H <= 0) return
    const c = document.createElement('canvas')
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    const s = Math.max(W / bg.width, H / bg.height)
    g.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s)
    bgCache = c
  }

  // 浸泡状态用一张预先压暗的贴图，避免每帧用 ctx.filter（很慢）
  function buildSpriteDim() {
    if (!sprite) return
    const c = document.createElement('canvas')
    c.width = sprite.naturalWidth || 274
    c.height = sprite.naturalHeight || 512
    const g = c.getContext('2d')!
    g.drawImage(sprite, 0, 0)
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = 'rgba(10, 38, 92, 0.34)'
    g.fillRect(0, 0, c.width, c.height)
    spriteDim = c
  }

  function loadBg(force = false) {
    const small = W <= 800
    if (!force && bgReady && small === bgIsSmall) return
    bgIsSmall = small
    if (force) bgReady = false
    const img = new Image()
    img.onload = () => {
      bg = img
      bgReady = true
      bgCache = null
      buildBgCache()
      if (W > 0 && H > 0) render()
    }
    img.src = withBase(small ? '/bg/tank-bg-sm.webp' : '/bg/tank-bg.webp')
  }
  loadBg(true)

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onUp)

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible) {
        // 从屏外回来时尺寸可能变了（比如旋屏），补一次布局
        if (host.clientWidth !== W || host.clientHeight !== H) {
          layout()
          buildParticles()
          buildBodies()
        }
        last = performance.now()
      }
    },
    { threshold: 0.05 },
  )
  io.observe(host)

  const onVisibility = () => {
    running = !document.hidden
  }
  document.addEventListener('visibilitychange', onVisibility)

  let resizeTimer = 0
  const onResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      // 尺寸没变就别重建：手机地址栏收起/展开、窗口小幅抖动都会触发 resize，
      // 一重建粒子数就变了，水面也会跟着跳一下
      if (host.clientWidth === W && host.clientHeight === H) return
      layout()
      buildParticles()
      buildBodies()
      loadBg()
    }, 180)
  }
  window.addEventListener('resize', onResize)

  raf = requestAnimationFrame(frame)

  // 调试出口：控制台里 __tank.state() 看粒子与刚体状态
  ;(window as any).__tank = {
    state: () => {
      let minY = H
      let maxY = 0
      let rhoSum = 0
      let topCount = 0
      let flying = 0
      const ys: number[] = []
      for (let i = 0; i < count; i++) {
        if (py[i] < minY) minY = py[i]
        if (py[i] > maxY) maxY = py[i]
        rhoSum += rho[i]
        if (py[i] < H * 0.3) topCount++
        const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
        if (surface[bin] - py[i] > 5) flying++
        if (i % 17 === 0) ys.push(py[i])
      }
      ys.sort((a, b) => a - b)
      return {
        count,
        fps,
        spriteOk: spriteReady,
        size: [Math.round(W), Math.round(H)],
        splashTotal,
        entryEvents,
        trail,
        dbg0: { vy: Math.round(bodies[0]?.vy ?? 0), raw: +(bodies[0]?.rawPrev ?? 0).toFixed(2) },
        minY: Math.round(minY),
        maxY: Math.round(maxY),
        avgC: +(rhoSum / Math.max(1, count) / rho0 - 1).toFixed(3),
        topCount,
        flying,
        level: Math.round(waterLevel),
        p10y: Math.round(ys[Math.floor(ys.length * 0.1)] || 0),
        p50y: Math.round(ys[Math.floor(ys.length * 0.5)] || 0),
        surfaceTop: Math.round(Math.min(...surface)),
        surfaceBottom: Math.round(Math.max(...surface)),
        bodies: bodies.map((b) => ({
          x: Math.round(b.x),
          y: Math.round(b.y),
          frac: +b.frac.toFixed(2),
          vy: Math.round(b.vy),
          a: +b.a.toFixed(2),
        })),
      }
    },
  }

  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('resize', onResize)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('pointerleave', onUp)
  }
}
</script>

<template>
  <div ref="root" class="fluid-tank">
    <canvas ref="canvasEl" class="fluid-tank__canvas"></canvas>
    <div class="fluid-tank__credit">立绘素材仅作技术演示，版权归原作者</div>
  </div>
</template>

<style scoped>
.fluid-tank {
  position: relative;
  height: 420px;
  margin: 18px 0 8px;
  border-radius: 18px;
  overflow: hidden;
  background: #0a1a34;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow:
    0 26px 60px -34px rgba(24, 64, 150, 0.45),
    0 0 0 6px rgba(255, 255, 255, 0.45),
    inset 0 20px 44px -28px rgba(255, 255, 255, 0.55),
    inset 0 -26px 54px -32px rgba(6, 16, 40, 0.55);
  touch-action: none;
}

/* 亚克力表面的那层斜光 */
.fluid-tank::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background:
    linear-gradient(
      155deg,
      rgba(255, 255, 255, 0.24) 0%,
      rgba(255, 255, 255, 0.06) 26%,
      rgba(255, 255, 255, 0) 44%
    ),
    radial-gradient(
      120% 90% at 15% -25%,
      rgba(255, 255, 255, 0.16),
      rgba(255, 255, 255, 0) 62%
    );
}

.fluid-tank__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.fluid-tank__credit {
  position: absolute;
  color: rgba(220, 235, 255, 0.62);
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
  user-select: none;
}

.fluid-tank__credit {
  right: 16px;
  bottom: 14px;
  opacity: 0.5;
  font-size: 11px;
}

@media (max-width: 640px) {
  .fluid-tank {
    height: 300px;
  }
  .fluid-tank__credit {
    display: none;
  }
}
</style>
