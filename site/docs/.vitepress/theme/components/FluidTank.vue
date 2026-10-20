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
    relaxation: 0.65, // 位置修正松弛
    viscosity: 0.08, // XSPH 粘性
    wallDamp: 0.35, // 撞墙速度保留
    scrollInertia: 0.85, // 滚动惯性强度
    dragStiffness: 75, // 拖拽弹簧刚度（越大跟手越快）
    dragDamping: 4, // 拖拽阻尼（越小越轻）
    bodyCount: 5,
    bodyHeightRatio: 0.42, // 小人高度 / 水槽高度
    waterFill: 0.76, // 水面初始高度（从顶部算）：水占三分之一左右
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
  let surface = new Float32Array(64)
  let rawSurface = new Float32Array(64)
  let binMin = new Float32Array(64)
  let binCnt = new Int32Array(64)
  let surfaceInit = false
  const BINS = 48

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
    squash: number
  }
  let bodies: Body[] = []
  let sprite: HTMLImageElement | null = null
  let spriteReady = false
  let bg: HTMLImageElement | null = null
  let bgReady = false
  let bgIsSmall = false

  /* ---------------- 交互状态 ---------------- */
  const pointer = { x: 0, y: 0, down: false, id: -1 }
  let grabbed: Body | null = null
  let grabOx = 0
  let grabOy = 0
  const splashes: { x: number; y: number; vx: number; vy: number; life: number; r: number }[] = []

  /* ---------------- 滚动惯性 ---------------- */
  let lastScroll = window.scrollY
  let scrollV = 0
  let scrollA = 0
  let inertia = 0
  let camOffset = 0
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
    surfaceInit = false
  }

  function buildParticles() {
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
        // 从水面上方一点点落下，冲击别太猛
        y: waterY - charH * 0.55 - i * 16,
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
        squash: 1,
      })
    }
  }

  /* ---------------- 核函数 ---------------- */
  function poly6(r2: number) {
    const d = h * h - r2
    return d <= 0 ? 0 : (4 / (Math.PI * Math.pow(h, 8))) * d * d * d
  }
  function spikyGrad(r: number, dx: number, dy: number) {
    if (r <= 0 || r >= h) return [0, 0]
    const k = (-30 / (Math.PI * Math.pow(h, 5))) * (h - r) * (h - r) / r
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
    if (rawSurface.length !== BINS) rawSurface = new Float32Array(BINS)
    if (binMin.length !== BINS) {
      binMin = new Float32Array(BINS)
      binCnt = new Int32Array(BINS)
    }
    binMin.fill(H)
    binCnt.fill(0)
    for (let i = 0; i < count; i++) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      if (py[i] < binMin[bin]) binMin[bin] = py[i]
      binCnt[bin]++
    }
    // 平均水位只用粒子算（把刚体排水算进来会和水面形成反馈，导致来回跳）
    const level = H - (count * CFG.spacing * CFG.spacing) / W
    // 每格取最低点，但限制在平均水位附近，飞溅粒子不会把水面抬到顶
    for (let b = 0; b < BINS; b++) {
      const v = binCnt[b] > 3 ? binMin[b] : level
      rawSurface[b] = Math.min(level + 30, Math.max(level - 25, v))
    }
    // 宽一点的平滑：水面整体要平，只留缓的起伏
    const tmp = rawSurface.slice()
    for (let b = 0; b < BINS; b++) {
      let s = 0
      let w = 0
      for (let k = -3; k <= 3; k++) {
        const idx = Math.min(BINS - 1, Math.max(0, b + k))
        const wk = 4 - Math.abs(k)
        s += tmp[idx] * wk
        w += wk
      }
      const smooth = s / w
      // 时间上也做一次平滑：帧间跳动会让人看到水面闪
      surface[b] = surfaceInit ? surface[b] + (smooth - surface[b]) * 0.25 : smooth
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
        const surf = surfaceAt(sx)
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
    b.frac += (fracSum / N - b.frac) * 0.3
      const area = 4 * b.r * b.hl + Math.PI * b.r * b.r
      const weight = b.m * CFG.gravity
      const buoy = area * b.frac * RHO_AREA * CFG.gravity
      b.vy += ((weight - buoy) / b.m) * dt
      b.vy -= inertia * dt
      // 水的阻力 + 姿态回正（阻尼够大才不会上下弹）
      const drag = Math.min(1, b.frac * 6)
      b.vx *= 1 - Math.min(0.5, drag * 3.2 * dt)
      b.vy *= 1 - Math.min(0.5, drag * 2.8 * dt)
      // 姿态：入水后被水压着回正，离水后几乎不转
      b.av *= 1 - Math.min(0.9, 1.2 + b.frac * 5) * dt
      if (b.frac > 0.02) b.av += (-b.a * 6 - b.av * 4) * b.frac * dt
      b.av = Math.max(-6, Math.min(6, b.av))
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.a += b.av * dt
      b.a = Math.max(-0.5, Math.min(0.5, b.a))
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
      vy[i] -= inertia * dt
      // 轻微阻尼，避免能量堆积
      vx[i] *= 0.999
      vy[i] *= 0.999
      qx[i] = px[i] + vx[i] * dt
      qy[i] = py[i] + vy[i] * dt
      lam[i] = 0
    }

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
          const push = Math.min(3, b.r - d + 0.3)
          const nx = dx / d
          const ny = dy / d
          qx[i] += nx * push
          qy[i] += ny * push
          // 速度也做一次分离，避免粒子粘在表面
          const vn = vx[i] * nx + vy[i] * ny - (b.vx * nx + b.vy * ny)
          if (vn < 0) {
            vx[i] -= nx * vn * 1.1
            vy[i] -= ny * vn * 1.1
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
        const maxStep = h * 0.3
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
      grabbed.vx += (tx - grabbed.x) * CFG.dragStiffness * dt
      grabbed.vy += (ty - grabbed.y) * CFG.dragStiffness * dt
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
      const s = Math.max(W / bg.width, H / bg.height)
      const dw = bg.width * s
      const dh = bg.height * s
      ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh)
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
    ctx.lineTo(W, H)
    ctx.lineTo(0, H)
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

    // 小人
    for (const b of bodies) {
      const submerged = b.frac > 0.25
      ctx.save()
      ctx.translate(b.x, b.y + b.r * 0.55)
      ctx.rotate(b.a)
      const sy = 1 + Math.max(-0.18, Math.min(0.18, b.vy * 0.00035))
      const sx = 1 / sy
      ctx.scale(b.flip * sx, sy)
      if (submerged) ctx.filter = 'brightness(0.86) saturate(0.92)'
      if (spriteReady && sprite) {
        const sw = 274 * b.scale
        const sh = 512 * b.scale
        ctx.drawImage(sprite, -sw / 2, -sh * 0.55, sw, sh)
      } else {
        ctx.fillStyle = 'rgba(200,220,255,0.5)'
        ctx.fillRect(-b.r, -b.hl - b.r, b.r * 2, (b.hl + b.r) * 2)
      }
      ctx.filter = 'none'
      ctx.restore()
    }

    // 溅射
    for (let i = splashes.length - 1; i >= 0; i--) {
      const p = splashes[i]
      p.life -= 1 / 60
      if (p.life <= 0) {
        splashes.splice(i, 1)
        continue
      }
      p.vy += CFG.gravity * 0.55 / 60
      p.x += p.vx / 60
      p.y += p.vy / 60
      ctx.globalAlpha = Math.min(1, p.life * 2)
      ctx.fillStyle = '#dff0ff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
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
    const R = 70
    for (let i = 0; i < count; i++) {
      const dx = px[i] - x
      const dy = py[i] - y
      const d2 = dx * dx + dy * dy
      if (d2 > R * R) continue
      const d = Math.sqrt(d2) || 1
      const f = (1 - d / R) * 260 * power
      vx[i] += (dx / d) * f
      vy[i] += (dy / d) * f - 120 * power
    }
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * Math.PI * 2
      const sp = 60 + Math.random() * 220
      splashes.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 140,
        life: 0.5 + Math.random() * 0.4,
        r: 1 + Math.random() * 1.8,
      })
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
    const v = (sy - lastScroll) / Math.max(0.004, dtReal)
    const a = (v - scrollV) / Math.max(0.004, dtReal)
    lastScroll = sy
    scrollV = scrollV * 0.7 + v * 0.3
    scrollA = scrollA * 0.82 + a * 0.18
    const target = Math.max(-9000, Math.min(9000, scrollA)) * CFG.scrollInertia
    inertia = inertia * 0.8 + target * 0.2
    const camTarget = Math.max(-16, Math.min(16, -scrollV * 0.02))
    camOffset = camOffset * 0.9 + camTarget * 0.1

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
    if (W > 0 && H > 0) render()
  }
  sprite.src = withBase('/sprites/hongshexin.png')

  // 背景图：手机用 1100px 那张，桌面用 1600px 的
  function loadBg(force = false) {
    const small = W <= 800
    if (!force && bgReady && small === bgIsSmall) return
    bgIsSmall = small
    if (force) bgReady = false
    const img = new Image()
    img.onload = () => {
      bg = img
      bgReady = true
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
      const ys: number[] = []
      for (let i = 0; i < count; i++) {
        if (py[i] < minY) minY = py[i]
        if (py[i] > maxY) maxY = py[i]
        rhoSum += rho[i]
        if (py[i] < H * 0.3) topCount++
        if (i % 17 === 0) ys.push(py[i])
      }
      ys.sort((a, b) => a - b)
      return {
        count,
        fps,
        spriteOk: spriteReady,
        size: [Math.round(W), Math.round(H)],
        minY: Math.round(minY),
        maxY: Math.round(maxY),
        avgC: +(rhoSum / Math.max(1, count) / rho0 - 1).toFixed(3),
        topCount,
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
  background: #07101f;
  border: 1px solid rgba(120, 170, 255, 0.18);
  box-shadow: 0 24px 60px -40px rgba(20, 70, 180, 0.9);
  touch-action: none;
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
