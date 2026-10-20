<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const props = defineProps<{ compact?: boolean }>()
const root = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
let dispose: (() => void) | null = null
let refreshImpl: (() => void) | null = null
let debugImpl: ((on: boolean) => void) | null = null
let statsImpl: (() => {
  fps: number
  particles: number
  iterations: number
  densityError: number
  waterAmount: number
  colliders: number
}) | null = null

onMounted(() => {
  if (!root.value || !canvasEl.value) return
  const api = setup(canvasEl.value, root.value, !!props.compact)
  dispose = api.dispose
  refreshImpl = api.refresh
  debugImpl = api.setDebug
  statsImpl = api.stats
})

onBeforeUnmount(() => {
  dispose?.()
  dispose = null
  refreshImpl = null
  debugImpl = null
  statsImpl = null
})

defineExpose({
  refresh: () => refreshImpl?.(),
  setDebug: (on: boolean) => debugImpl?.(on),
  stats: () => statsImpl?.(),
})

function setup(canvas: HTMLCanvasElement, host: HTMLElement, compactMode: boolean) {
  const ctx = canvas.getContext('2d')!
  // 分步重建渲染时的隔离开关：?fluidRender=1 只画物理，默认页面不受影响。
  const fluidRenderParam =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fluidRender') : null
  // 默认直接使用第 5 步的最终渲染；带 ?fluidRender=1..5 时仍可回看分步。
  const renderStage = fluidRenderParam ? Number(fluidRenderParam) : 5
  const showStageBadge = !!fluidRenderParam

  /* ---------------- 可调参数 ---------------- */
  const CFG = {
    gravity: 1500, // px/s²
    spacing: 10, // 粒子间距（px）
    hFactor: 2.0, // 核半径 / 间距（太小邻居不足，密度估计会抖）
    iterations: 2, // 密度约束迭代次数
    relaxation: 0.55, // 位置修正松弛
    viscosity: 0.42, // XSPH 粘性：低速保持流动，高速粒子额外增强耗散
    wallDamp: 0.35, // 撞墙速度保留
    floorDamp: 0.08, // 池底几乎不回弹：水砸下来应该"停住"，不是弹起来
    ceilDamp: 0.12,
    scrollLag: 2.4, // 滚动时水"滞空"的冲量系数（px 滚动 → px/s）
    kickMaxUp: 520, // 单帧最多给水多少向上的速度
    kickMaxDown: 320, // 向下（压进池底）的冲量小一些，压缩太狠会抖
    maxLift: 110, // 水最多比静止水位抬多高，再滚也不给冲量
    dragStiffness: 75, // 拖拽弹簧刚度（越大跟手越快）
    dragDamping: 4, // 拖拽阻尼（越小越轻）
    bodyCount: 8,
    bodyHeightRatio: 0.26, // 小人高度 / 水槽高度（太大会踩到底就浮不起来）
    bodyDensity: 0.25, // 人偶质量 / 同体积水质量；平衡时约 25% 浸没
    waterFill: 2 / 3, // 水面初始高度：水只占水池下方约 1/3
  }

  const FIXED = 1 / 60
  // 物理固定在 390×240 的逻辑分辨率里跑：卡片无论怎么缩放，都只是把这幅画面拉伸，
  // 粒子间距、重力、人偶尺寸都不会跟着 CSS 尺寸变，缩放后物理表现保持一致。
  const SIM_W = 390
  const SIM_H = 240
  // 首屏小卡片不再吃页面滚动惯性：滚动网页时不应该把水和小人一起甩起来
  const scrollEffects = !compactMode
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
  let drawSurface = new Float32Array(96)
  let particleSurface = new Float32Array(96)
  let particleSurfaceSmooth = new Float32Array(96)
  let bottom = new Float32Array(96)
  let rawBottom = new Float32Array(96)
  let binMax = new Float32Array(96)
  let rawSurface = new Float32Array(96)
  let binMin = new Float32Array(96)
  let binMin2 = new Float32Array(96)
  let binVySum = new Float32Array(96)
  let binMeanVy = new Float32Array(96)
  let binKept = new Int32Array(96)
  let refBuf = new Float32Array(96)
  let smoothBuf = new Float32Array(96)
  let binCnt = new Int32Array(96)
  let surfaceInit = false
  let surfaceRefPrev = 0 // 上一帧水面基准（用来判断整片水是不是在快速移动）
  let surfaceRefVel = 0 // 水面基准的平滑速度：避免在阈值上来回切
  let surfaceRef = 0 // 当前水面基准（整片水的平均高度）
  let waterLevel = 0 // 平滑后的平均水位，浮力只认它（不跟局部波峰联动）
  let restLevel = 0 // 启动静置后实测的静止水位：水面归一化 / 滚动判断的参考
  let waterBaseArea = 0 // 校准后的"水本身"面积（px²），不含人偶排开的部分
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
    spriteIndex: number
    frac: number
    rawPrev: number
    inWater: boolean
    entered: boolean
    squash: number
  }
  let bodies: Body[] = []
  const SPRITE_SOURCES = [
    '/sprites/limbus/01-shanfu.webp',
    '/sprites/limbus/02-tufu.webp',
    '/sprites/limbus/03-souschef.webp',
    '/sprites/limbus/04-puyi.webp',
    '/sprites/limbus/05-xichun.webp',
    '/sprites/limbus/06-sancho.webp',
    '/sprites/limbus/07-vergilius.webp',
    '/sprites/limbus/08-vespa.webp',
    '/sprites/limbus/09-luo.webp',
    '/sprites/limbus/10-jiaqiu.webp',
  ]
  // 每张立绘的绘制高度系数：带长武器/特效的稍微缩小，避免压住旁边的人
  const SPRITE_ZOOM = [1, 0.92, 0.9, 1, 0.95, 1, 1, 0.95, 0.9, 0.92]
  let sprites: HTMLImageElement[] = []
  let spritesLoaded = 0
  let charH = 0
  let bg: HTMLImageElement | null = null
  let bgReady = false
  let bgCache: HTMLCanvasElement | null = null

  /* ---------------- 交互状态 ---------------- */
  const pointer = { x: 0, y: 0, down: false, id: -1 }
  let grabbed: Body | null = null
  let grabOx = 0
  let grabOy = 0
  let splashTotal = 0
  let entryEvents = 0
  const trail: string[] = []
  let debugView = false

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
    W = SIM_W
    H = SIM_H
    dpr = Math.min(1.5, window.devicePixelRatio || 1)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    waterGrad = null
    if (!waterMaskCanvas) waterMaskCanvas = document.createElement('canvas')
    waterMaskCanvas.width = W * 2
    waterMaskCanvas.height = H * 2
    waterMaskCtx = waterMaskCanvas.getContext('2d')
    waterMaskCtx?.setTransform(2, 0, 0, 2, 0, 0)
    bgCache = null
    surfaceInit = false
  }

  // 只同步像素密度，不重建粒子 / 人偶：卡片缩放不打断正在跑的物理
  function syncDpr() {
    const next = Math.min(1.5, window.devicePixelRatio || 1)
    if (next === dpr) return
    dpr = next
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bgCache = null
    waterGrad = null
    render()
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
    // 先按体积估一个静止水位；settleWater 会再用静置后的实测自由表面修正一次。
    restLevel = H - (count * CFG.spacing * CFG.spacing * 0.9) / W
    waterLevel = restLevel
    waterBaseArea = (H - restLevel) * W
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

  // 从小人库里随机抽一批，洗牌后取前 bodyCount 个，避免同一个人重复出现
  function pickSprites() {
    const pool = SPRITE_SOURCES.map((_, i) => i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      const t = pool[i]
      pool[i] = pool[j]
      pool[j] = t
    }
    return pool.slice(0, Math.min(CFG.bodyCount, pool.length))
  }

  function buildBodies(spritesForRun?: number[], dropFromAbove = true) {
    bodies = []
    charH = H * CFG.bodyHeightRatio
    const charW = charH * (274 / 512)
    const r = charW * 0.22
    const hl = charH * 0.3
    const area = 4 * r * hl + Math.PI * r * r
    const m = CFG.bodyDensity * area * RHO_AREA
    const picks = spritesForRun ?? pickSprites()
    // 立绘宽度随原图比例变化，站到最边上会被水槽裁掉；按最高角色的半宽留边
    const side = Math.min(W * 0.2, charH * 0.62)
    // 每条泳道里随机一个位置：人物横向铺开，但不会挤成一堆
    const laneW = (W - 2 * side) / CFG.bodyCount
    for (let i = 0; i < CFG.bodyCount; i++) {
      bodies.push({
        x: side + laneW * (i + 0.5 + (Math.random() - 0.5) * 0.2),
        // 首屏直接站在水里；点刷新才从池子上方落下来
        y: dropFromAbove
          ? -charH * (0.1 + Math.random() * 0.2) - i * charH * 0.2
          : H * CFG.waterFill - charH * 0.25 - i * 6,
        vx: (Math.random() - 0.5) * 30,
        vy: dropFromAbove ? 60 + Math.random() * 50 : 0,
        a: (Math.random() - 0.5) * 0.12,
        av: (Math.random() - 0.5) * 0.3,
        r,
        hl,
        m,
        invM: 1 / m,
        rot: 0,
        flip: i % 2 === 1 ? -1 : 1,
        spriteIndex: picks[i % picks.length],
        frac: 0,
        rawPrev: 0,
        inWater: false,
        entered: false,
        squash: 1,
      })
    }
  }

  // 启动时先让水自己静置一小段，再用实测自由表面当浮力基准。
  // 不能等运行时再校准：0.6 s 时水还在第一波晃动里，校准值会飘，
  // 不同次打开页面甚至能差 30 px（人偶一会儿半沉、一会儿站在水面上）。
  function settleWater() {
    const saved = bodies
    bodies = []
    for (let i = 0; i < 75; i++) step(FIXED)
    updateSurface()
    const sorted = Array.from(surface).sort((a, b) => a - b)
    restLevel = sorted[BINS >> 1]
    waterLevel = restLevel
    waterBaseArea = (H - restLevel) * W
    surfaceInit = true
    bodies = saved
  }

  // 建好全部人偶后再跑一小段，让初始排水和浮力平衡在首帧之前完成。
  // 否则页面刚打开的前几帧会看到水被一群人偶顶成尖峰。
  function settleBodies() {
    for (let i = 0; i < 45; i++) step(FIXED)
    splashTotal = 0
    entryEvents = 0
    trail.length = 0
  }

  // 换一批：重新抽人、从池子上方重新落下
  function refreshBodies() {
    grabbed = null
    pointer.down = false
    buildBodies()
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
    // 这里返回胶囊的轴线段；b.r 会在 capsuleDistance 和刚体碰撞里作为
    // 半径参与计算，所以真正的形状是 2D 胶囊，不是零厚度线段。
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
    const d = Math.hypot(dx, dy)
    // 粒子正好落在胶囊中心线上时没有法线方向，固定往上推，避免除零后原地卡住
    if (d < 1e-4) return [-b.r, 0, -1] as const
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
      binVySum = new Float32Array(BINS)
      binMeanVy = new Float32Array(BINS)
      binKept = new Int32Array(BINS)
      refBuf = new Float32Array(BINS)
      smoothBuf = new Float32Array(BINS)
      binMax = new Float32Array(BINS)
      binCnt = new Int32Array(BINS)
    }
    binMin.fill(H)
    binMin2.fill(H)
    binMax.fill(0)
    binCnt.fill(0)
    binVySum.fill(0)
    binKept.fill(0)
    for (let i = 0; i < count; i++) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      binVySum[bin] += vy[i]
      if (py[i] > binMax[bin]) binMax[bin] = py[i]
      binCnt[bin]++
    }
    for (let b = 0; b < BINS; b++) binMeanVy[b] = binCnt[b] > 0 ? binVySum[b] / binCnt[b] : 0
    for (let i = 0; i < count; i++) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      // 比同格平均速度还快 300px/s 的，是飞出去的水滴/水柱，不参与"水面在哪"的判断；
      // 整片水一起滞空时同格平均同样很快，所以不会把整片水排除掉
      if (vy[i] < binMeanVy[bin] - 300) continue
      binKept[bin]++
      // 记最小的两个 y：水面取最高粒子，第二低的用来判断是不是孤立水滴
      if (py[i] < binMin[bin]) {
        binMin2[bin] = binMin[bin]
        binMin[bin] = py[i]
      } else if (py[i] < binMin2[bin]) {
        binMin2[bin] = py[i]
      }
    }
    // 水位只由"粒子数 × 每颗占的面积"决定 —— 总量恒定，滚动/晃动不会改变整体水位
    const level = restLevel

    // 1) 每格的水面候选：最高的粒子（粒子太少说明这格被刚体占了，先留空）
    let valid = 0
    for (let b = 0; b < BINS; b++) {
      if (binKept[b] >= 8) {
        // 只有"下面紧跟着一颗"才算水面；孤零零飞起来的颗粒用第二低的顶替
        rawSurface[b] = binMin2[b] - binMin[b] < CFG.spacing * 1.4 ? binMin[b] : binMin2[b]
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
    // 3) 空间平滑：三遍 5 点二项平滑（[1,4,6,4,1]/16）。
    //    一遍压不住逐格锯齿，两遍后静止时还留一层 40~60px 的小波纹；
    //    三遍把它们削到看不见，200px 量级的大波浪只掉几个百分点
    for (let pass = 0; pass < 3; pass++) {
      smoothBuf.set(rawSurface)
      for (let b = 0; b < BINS; b++) {
        const l2 = smoothBuf[Math.max(0, b - 2)]
        const l1 = smoothBuf[Math.max(0, b - 1)]
        const c = smoothBuf[b]
        const r1 = smoothBuf[Math.min(BINS - 1, b + 1)]
        const r2 = smoothBuf[Math.min(BINS - 1, b + 2)]
        rawSurface[b] = (l2 + 4 * l1 + 6 * c + 4 * r1 + r2) / 16
      }
    }
    // 整片水在快速上下移动（滞空 / 落回）时基准每帧会跳好几像素，
    // 这时时间平滑要几乎等于直接跟随，否则线会拖在水体后面
    surfaceRefVel = surfaceRefVel * 0.72 + (ref - surfaceRefPrev) * 0.28
    const moving = Math.abs(surfaceRefVel) > 1.1
    for (let b = 0; b < BINS; b++) {
      const smooth = rawSurface[b]
      // 4) 时间平滑：静止时压抖动，动得越快跟得越快。
      //    固定 0.14 会在快甩时严重滞后 —— 水已经飞上去了，线还留在原地。
      const err = smooth - surface[b]
      const k = moving ? 0.9 : Math.min(0.6, 0.12 + Math.abs(err) / 120)
      surface[b] = surfaceInit ? surface[b] + err * k : smooth
    }
    surfaceRefPrev = ref
    surfaceRef = ref
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
    for (let pass = 0; pass < 2; pass++) {
      smoothBuf.set(rawBottom)
      for (let b = 0; b < BINS; b++) {
        const l2 = smoothBuf[Math.max(0, b - 2)]
        const l1 = smoothBuf[Math.max(0, b - 1)]
        const c = smoothBuf[b]
        const r1 = smoothBuf[Math.min(BINS - 1, b + 1)]
        const r2 = smoothBuf[Math.min(BINS - 1, b + 2)]
        rawBottom[b] = (l2 + 4 * l1 + 6 * c + 4 * r1 + r2) / 16
      }
    }
    for (let b = 0; b < BINS; b++) {
      const smooth = rawBottom[b]
      const err = smooth - bottom[b]
      const k = moving ? 0.9 : Math.min(0.6, 0.16 + Math.abs(err) / 120)
      bottom[b] = surfaceInit ? bottom[b] + err * k : smooth
    }
    // 浮力用的水位 = 静水压水位：水量 + 人偶排开的水。waterBaseArea 是
    // 启动静置后实测的水面积，人偶的浸没面积按上一帧的 frac 加进去。
    // 逐帧水面只用于渲染，不把波峰喂回浮力 —— 否则会形成
    // "人偶排水 → 水面升高 → 浮力变大 → 人偶上浮"的自激振荡。
    let displaced = 0
    for (const b of bodies) {
      displaced += b.frac * (4 * b.r * b.hl + Math.PI * b.r * b.r)
    }
    const targetLevel = H - (waterBaseArea + displaced) / W
    waterLevel = surfaceInit ? waterLevel + (targetLevel - waterLevel) * 0.25 : targetLevel
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
        // 浮力用"体积水位 + 一点局部水面"：完全用局部水面会让刚体排水
        // → 水面升高 → 浮力变大 → 又弹起来，形成自激振荡。
        const local = surfaceAt(sx) - waterLevel
        const surf = waterLevel + Math.max(-4, Math.min(4, local)) * 0.12
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
      // 水面附近是临界阻尼：浮力弹簧的固有频率约 15 rad/s，阻尼系数给到
      // 2ω 左右，落水后 0.3~0.5 s 就稳住，而不是像以前那样一直上下弹。
      const sub = Math.max(0, Math.min(1, b.frac))
      b.vx *= Math.exp(-(0.5 + 7 * sub) * dt)
      b.vy *= Math.exp(-(1.0 + 60 * sub) * dt)
      // 入水后限速：从画布上方落下来时速度很高，会把浅水一下压扁
      if (b.frac > 0.1) {
        if (b.vy > 150) b.vy = 150
        if (b.vy < -150) b.vy = -150
      }
      // 姿态：人在水里会自己站直。回正力矩 + 角阻尼都随浸没比例增强，
      // 只剩很小的侧倾，避免被水一推就横躺。
      b.av *= Math.exp(-(1.2 + 9 * sub) * dt)
      if (sub > 0.02) b.av += (-b.a * 11 - b.av * 3.4) * sub * dt
      b.av = Math.max(-4, Math.min(4, b.av))
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.a += b.av * dt
      // 只允许轻微侧倾；拖拽/落水的力矩不能把人偶转成横躺
      b.a = Math.max(-0.22, Math.min(0.22, b.a))

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
      const xMargin = Math.max(lim, charH * 0.45)
      const yMargin = Math.max(lim, charH * 0.5)
      if (!b.entered && b.y > 0) b.entered = true
      if (b.x < xMargin) {
        b.x = xMargin
        b.vx = Math.abs(b.vx) * 0.3
      }
      if (b.x > W - xMargin) {
        b.x = W - xMargin
        b.vx = -Math.abs(b.vx) * 0.3
      }
      if (b.y > H - yMargin) {
        b.y = H - yMargin
        b.vy = -Math.abs(b.vy) * 0.25
        b.av *= 0.9
      }
      // 刷新时从画布上方落进来（entered=false）；进水后不允许再被甩出顶部
      if (b.entered && b.y < yMargin) {
        b.y = yMargin
        b.vy = Math.max(0, b.vy)
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
          A.x -= nx * overlap * (A.invM / total) * 0.5
          A.y -= ny * overlap * (A.invM / total) * 0.5
          B.x += nx * overlap * (B.invM / total) * 0.5
          B.y += ny * overlap * (B.invM / total) * 0.5
          const rvx = B.vx - A.vx
          const rvy = B.vy - A.vy
          const vn = rvx * nx + rvy * ny
          if (vn < 0) {
            // 水里的碰撞几乎是完全非弹性的：恢复系数 0.1，避免两个人偶
            // 互相弹来弹去把水也一起搅动。
            const imp = (-vn * 0.1) / total
            A.vx -= nx * imp * A.invM
            A.vy -= ny * imp * A.invM
            B.vx += nx * imp * B.invM
            B.vy += ny * imp * B.invM
          }
        }
      }
    }

    /* 3. 粒子预测 */
    // 滚动冲量按"已经抬了多高"衰减：连续滚轮以前每帧都叠 520px/s，
    // 水会被一路顶到天花板、在顶边横着弹，恢复过程就一直在抖
    let kick = 0
    if (scrollKick !== 0) {
      if (scrollKick > 0) {
        const lift = Math.max(0, waterLevel - surfaceRef)
        kick = Math.min(scrollKick, CFG.kickMaxUp) * Math.max(0, 1 - lift / CFG.maxLift)
      } else {
        kick = Math.max(scrollKick, -CFG.kickMaxDown)
      }
    }
    for (let i = 0; i < count; i++) {
      vy[i] += CFG.gravity * dt
      vy[i] -= kick
      // 轻微阻尼，避免能量堆积
      // 整体阻尼：0.999 太弱，整片水会晃三四秒才停；0.996 大约一秒半收住
      vx[i] *= 0.996
      vy[i] *= 0.996
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
            // 把相对法向速度直接设成"一个封顶的小分离速度"。
            // 旧写法 -vn*1.25 + push*7 是每帧往上叠的：粒子被刚体和密度约束
            // 来回挤时，一帧攒一点，最后攒到速度上限，恢复过程就一直在抖。
            const sep = Math.min(90, 30 + push * 9)
            // 只把相对法向速度补到 +sep，不额外叠加冲量：
            // 以前每帧都往上加，被两个人偶夹住的粒子几帧就能冲到速度上限飞出去
            const dv = Math.min(sep, -vn)
            vx[i] += nx * dv
            vy[i] += ny * dv
            // 反作用：水推刚体，并产生一点力矩。
            // 这里最多给每颗粒子 0.12 px/s 的速度增量，乘上接触粒子数后
            // 仍只有每秒几十像素的加速度；浮力负责把人托住，接触反作用
            // 只负责"水被推开时人也退一点"。旧系数大 30 倍，多个人偶
            // 会被自己排开的水柱顶到天上。
            const contact = Math.max(0, Math.min(1, b.frac))
            const imp = Math.min(0.12, push * 0.008) * b.invM * contact
            b.vx -= nx * imp * 0.8
            b.vy -= ny * imp * 0.8
            b.av += ((cxp - b.x) * -ny - (cyp - b.y) * -nx) * imp * 0.0008
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
        // 自由表面的密度天然低于静止密度。λ 允许为正时，表面粒子会互相吸引，
        // 整片水被慢慢压扁、表面自己泛波。只保留抗压缩的一半（λ ≤ 0）。
        lam[i] = Math.min(0, -C / (sumG2 + 1e-4))
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
        // 单次迭代最多挪 0.08h：0.15h 虽然收敛快，但位置修正会直接变成速度，
        // 压缩区里每帧都能灌 360px/s，水会一直"沸腾"
        const maxStep = h * 0.08
        qx[i] += Math.max(-maxStep, Math.min(maxStep, dxSum * CFG.relaxation))
        qy[i] += Math.max(-maxStep, Math.min(maxStep, dySum * CFG.relaxation))
      }
    }

    /* 5b. 密度投影后再分离一次：前面那次推出发生在投影之前，
          投影会把粒子重新挤进人偶里，水就会从身体中间穿过去。 */
    for (let pass = 0; pass < 2; pass++) {
      for (const b of bodies) {
        for (let i = 0; i < count; i++) {
          const [d, nx, ny] = capsuleDistance(b, qx[i], qy[i])
          if (d >= 0) continue
          qx[i] -= nx * d
          qy[i] -= ny * d
        }
      }
    }

    /* 6. 边界 + 速度回写 + 粘性 */
    for (let i = 0; i < count; i++) {
      // 先把位置夹回槽内
      if (qx[i] < 4) qx[i] = 4
      else if (qx[i] > W - 4) qx[i] = W - 4
      if (qy[i] > H - 4) qy[i] = H - 4
      else if (qy[i] < 4) qy[i] = 4
      // 再由位置差反推速度（PBD 的标准做法）
      let nvx = (qx[i] - px[i]) / dt
      let nvy = (qy[i] - py[i]) / dt
      // 位置修正会把能量灌进速度：限制单步速度变化量，尖峰就不会一帧帧越滚越大
      const dvx = nvx - vx[i]
      const dvy = nvy - vy[i]
      const dv = Math.hypot(dvx, dvy)
      const dvMax = 500
      if (dv > dvMax) {
        const s = dvMax / dv
        nvx = vx[i] + dvx * s
        nvy = vy[i] + dvy * s
      }
      vx[i] = nvx
      vy[i] = nvy
      // 贴着墙、还朝墙里走的速度必须在这里反射掉：
      // 之前把反射写在反推之前，会被 (q-p)/dt 覆盖，粒子就沿着顶边一直加速
      if (qx[i] <= 4.001 && vx[i] < 0) vx[i] = -vx[i] * CFG.wallDamp
      if (qx[i] >= W - 4.001 && vx[i] > 0) vx[i] = -vx[i] * CFG.wallDamp
      if (qy[i] >= H - 4.001 && vy[i] > 0) {
        vy[i] = -vy[i] * CFG.floorDamp
        vx[i] *= 0.9
      }
      if (qy[i] <= 4.001 && vy[i] < 0) vy[i] = -vy[i] * CFG.ceilDamp
      const speed = Math.hypot(vx[i], vy[i])
      // 120px≈1m，800px/s 已经是 6.7m/s；再高就只是被挤住的粒子在墙边乱弹
      if (speed > 800) {
        vx[i] *= 800 / speed
        vy[i] *= 800 / speed
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
        const speed = Math.hypot(vx[i], vy[i])
        // 小人在刷新时砸入水面，会把局部速度瞬间拉到数百 px/s。
        // 给高速粒子更高的局部粘性，只抑制飞散，不把整池水做成胶体。
        const localViscosity = Math.min(0.82, CFG.viscosity * (1 + speed / 360))
        let ax = 0
        let ay = 0
        let neighbors = 0
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
              neighbors++
              const w = poly6(r2) / rho0
              ax += (vx[j] - vx[i]) * w
              ay += (vy[j] - vy[i]) * w
            }
          }
        }
        vx[i] += ax * localViscosity
        vy[i] += ay * localViscosity
        const resolvedSpeed = Math.hypot(vx[i], vy[i])
        if (resolvedSpeed > 220) {
          // 脱离邻居的粒子无法通过 XSPH 交换动量；额外衰减这类孤立飞滴，
          // 避免刷新落水后单颗粒子冲顶并拉出虚假的尖峰。
          const isolation = 1 - Math.min(1, neighbors / 5)
          const excess = Math.min(1, (resolvedSpeed - 220) / 500)
          const damping = 1 - (0.08 + isolation * 0.38) * excess
          vx[i] *= damping
          vy[i] *= damping
        }
      }
    }

    /* 7. 拖拽弹簧 */
    if (grabbed && pointer.down) {
      // 拖拽目标也夹在池内：不能把人偶拖出卡片后再让它飘在外面
      const mx = Math.max(grabbed.hl + grabbed.r, charH * 0.45)
      const my = Math.max(grabbed.hl + grabbed.r, charH * 0.5)
      const tx = Math.min(W - mx, Math.max(mx, pointer.x + grabOx))
      const ty = Math.min(H - my, Math.max(my, pointer.y + grabOy))
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
  let waterMaskCanvas: HTMLCanvasElement | null = null
  let waterMaskCtx: CanvasRenderingContext2D | null = null

  // 渲染水面 = 物理水位 + 局部水面起伏。
  // waterLevel 是人偶浮力真正用的水位；rawSurface 提供每列相对起伏。
  // 这样水线不会整体跑到粒子顶部（水花），也不会被平滑结果的整体偏移
  // 带到人偶脚下；局部凹坑/波峰仍然来自这一帧的粒子。
  function updateDrawSurface() {
    const sorted = Array.from(rawSurface).sort((a, b) => a - b)
    const med = sorted[BINS >> 1]
    for (let b = 0; b < BINS; b++) {
      const dev = Math.max(-10, Math.min(10, rawSurface[b] - med))
      drawSurface[b] = waterLevel + dev
    }
  }

  /** 用水面高度场画一条平滑的水线 */
  function traceSurface() {
    const pts: [number, number][] = []
    for (let i = 0; i < BINS; i++) pts.push([(i / (BINS - 1)) * W, drawSurface[i]])
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

  // 人偶先画、水后画：这样水面以下的身体会被水体染色，水线也会盖在
  // 身体上。之前先画水再画人，整个人偶都浮在水线之上，看起来像站在水面上。
  function drawBodies() {
    for (const b of bodies) {
      ctx.save()
      // 立绘中心与胶囊体中心严格对齐；不要再加视觉偏移或速度形变，
      // 否则调试线框正确、正常画面却偏离物理体。
      ctx.translate(b.x, b.y)
      // bodySegment 的轴角是"从竖直方向量、正角让顶端向左"；
      // Canvas 的 rotate 正角是顺时针，所以这里取反，立绘才会跟胶囊同向倾斜。
      ctx.rotate(-b.a)
      ctx.scale(b.flip, 1)
      const img = sprites[b.spriteIndex]
      if (img && img.complete && img.naturalWidth > 0) {
        const sh = charH * SPRITE_ZOOM[b.spriteIndex % SPRITE_ZOOM.length]
        const sw = (img.naturalWidth / img.naturalHeight) * sh
        // 立绘中心对准刚体中心：半浸没时水线落在腰附近，而不是脚底
        ctx.drawImage(img, -sw / 2, -sh * 0.5, sw, sh)
      } else {
        // 立绘还没加载时也不要显示一个灰色矩形；先画一个胶囊占位。
        traceCapsule(b.r, b.hl)
        ctx.fillStyle = 'rgba(200, 220, 255, 0.22)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.55)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  // 以原点为中心、沿局部 y 轴画一个真正的胶囊轮廓。
  function traceCapsule(r: number, hl: number) {
    ctx.beginPath()
    ctx.arc(0, -hl, r, Math.PI, Math.PI * 2, false)
    ctx.lineTo(r, hl)
    ctx.arc(0, hl, r, 0, Math.PI, false)
    ctx.closePath()
  }

  // Stage 3 的水体：把这一帧所有粒子当作半径约 0.78·spacing 的圆，
  // 先在一次路径里取并集，再整体半透明贴回主画布。
  // 没有高度场、没有水线，水体轮廓完全由粒子位置决定。
  function drawParticleWater(alpha = 0.58) {
    const wc = waterMaskCtx
    if (!wc || !waterMaskCanvas) return
    wc.clearRect(0, 0, W, H)
    const grad = wc.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#51b4ff')
    grad.addColorStop(0.45, '#2b78e8')
    grad.addColorStop(1, '#0a2f84')
    const r = CFG.spacing * 0.78
    wc.beginPath()
    for (let i = 0; i < count; i++) {
      wc.moveTo(px[i] + r, py[i])
      wc.arc(px[i], py[i], r, 0, Math.PI * 2)
    }
    wc.filter = 'blur(0.8px)'
    wc.fillStyle = grad
    wc.fill()
    wc.filter = 'none'

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(waterMaskCanvas, 0, 0, W, H)
    ctx.restore()
  }

  // 最终合成时的水体底色：只填粒子轮廓以下的区域，用一层很淡的渐变
  // 让粒子之间的微小空隙看起来仍是连续水体；顶边仍由粒子轮廓决定。
  function drawWaterBaseFill() {
    const grad = ctx.createLinearGradient(0, waterLevel - 20, 0, H)
    grad.addColorStop(0, 'rgba(70, 160, 240, 0.26)')
    grad.addColorStop(0.45, 'rgba(30, 95, 205, 0.3)')
    grad.addColorStop(1, 'rgba(6, 26, 90, 0.44)')
    ctx.beginPath()
    ctx.moveTo(0, particleSurfaceSmooth[0])
    for (let b = 1; b < BINS - 1; b++) {
      const x0 = (b / (BINS - 1)) * W
      const x1 = ((b + 1) / (BINS - 1)) * W
      ctx.quadraticCurveTo(
        x0,
        particleSurfaceSmooth[b],
        (x0 + x1) / 2,
        (particleSurfaceSmooth[b] + particleSurfaceSmooth[b + 1]) / 2,
      )
    }
    ctx.lineTo(W, particleSurfaceSmooth[BINS - 1])
    ctx.lineTo(W, H)
    ctx.lineTo(0, H)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  }

  // 从粒子圆的并集上边缘提取水线。这里没有高度场：每个 x 列取所有
  // 覆盖该列的粒子圆顶部 y 的最小值，再做一遍 3 点平滑。
  function computeParticleSurface() {
    const r = CFG.spacing * 0.78
    particleSurface.fill(H)
    for (let i = 0; i < count; i++) {
      const left = Math.max(0, Math.floor(((px[i] - r) / W) * (BINS - 1)))
      const right = Math.min(BINS - 1, Math.ceil(((px[i] + r) / W) * (BINS - 1)))
      for (let b = left; b <= right; b++) {
        const x = (b / (BINS - 1)) * W
        const dx = x - px[i]
        const q = r * r - dx * dx
        if (q < 0) continue
        const y = py[i] - Math.sqrt(q)
        if (y < particleSurface[b]) particleSurface[b] = y
      }
    }

    // 极端情况下某一列没有被任何粒子圆覆盖，用左右有效列补。
    let prev = -1
    for (let b = 0; b < BINS; b++) {
      if (particleSurface[b] >= H) continue
      if (prev < 0) {
        for (let k = 0; k <= b; k++) particleSurface[k] = particleSurface[b]
      } else {
        const v0 = particleSurface[prev]
        const v1 = particleSurface[b]
        for (let k = prev + 1; k < b; k++) {
          const t = (k - prev) / (b - prev)
          particleSurface[k] = v0 + (v1 - v0) * t
        }
      }
      prev = b
    }
    if (prev < 0) particleSurface.fill(waterLevel)
    else for (let k = prev + 1; k < BINS; k++) particleSurface[k] = particleSurface[prev]

    particleSurfaceSmooth.set(particleSurface)
    for (let b = 0; b < BINS; b++) {
      const l = particleSurface[Math.max(0, b - 1)]
      const c = particleSurface[b]
      const r1 = particleSurface[Math.min(BINS - 1, b + 1)]
      particleSurfaceSmooth[b] = (l + 2 * c + r1) / 4
    }
    const firstPass = particleSurfaceSmooth.slice()
    for (let b = 0; b < BINS; b++) {
      const l = firstPass[Math.max(0, b - 1)]
      const c = firstPass[b]
      const r1 = firstPass[Math.min(BINS - 1, b + 1)]
      particleSurfaceSmooth[b] = (l + 2 * c + r1) / 4
    }
  }

  function drawParticleSurfaceFx(compute = true) {
    if (compute) computeParticleSurface()

    // 水线：直接经过粒子并集的顶部，不再额外套高度场。
    const traceLine = () => {
      ctx.beginPath()
      ctx.moveTo(0, particleSurfaceSmooth[0])
      for (let b = 1; b < BINS - 1; b++) {
        const x0 = (b / (BINS - 1)) * W
        const x1 = ((b + 1) / (BINS - 1)) * W
        ctx.quadraticCurveTo(
          x0,
          particleSurfaceSmooth[b],
          (x0 + x1) / 2,
          (particleSurfaceSmooth[b] + particleSurfaceSmooth[b + 1]) / 2,
        )
      }
      ctx.lineTo(W, particleSurfaceSmooth[BINS - 1])
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    traceLine()
    ctx.strokeStyle = 'rgba(4, 20, 60, 0.38)'
    ctx.lineWidth = 3
    ctx.stroke()
    traceLine()
    ctx.strokeStyle = 'rgba(210, 244, 255, 0.92)'
    ctx.lineWidth = 1.45
    ctx.stroke()

    // 泡沫：贴着粒子轮廓的粒子点。
    ctx.fillStyle = 'rgba(235, 250, 255, 0.7)'
    for (let i = 0; i < count; i++) {
      const b = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      const d = py[i] - particleSurfaceSmooth[b]
      if (d > -1 && d < 5) {
        const rr = 0.9 + ((i * 37) % 3) * 0.25
        ctx.beginPath()
        ctx.arc(px[i], py[i], rr, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 飞溅：粒子圆本身已经画在水体里，这里只补运动方向的短水线。
    ctx.lineCap = 'round'
    for (let i = 0; i < count; i++) {
      const b = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      const above = particleSurfaceSmooth[b] - py[i]
      if (above <= 8) continue
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
  }

  // 调试视图：PBF 粒子 + 人偶的胶囊碰撞体。只在按钮打开时画，
  // 用来核对"水线到底穿在哪里"和"粒子有没有穿透胶囊"。
  function drawDebug(showSurface = true, showParticles = true) {
    ctx.save()
    ctx.lineCap = 'round'

    if (showParticles) {
      for (let i = 0; i < count; i++) {
        const sp = Math.hypot(vx[i], vy[i])
        const hue = 195 - Math.min(120, sp * 0.16)
        ctx.fillStyle = `hsla(${hue}, 92%, 68%, 0.92)`
        ctx.beginPath()
        ctx.arc(px[i], py[i], 1.55, 0, Math.PI * 2)
        ctx.fill()
        if (i % 9 === 0 && sp > 12) {
          ctx.strokeStyle = `hsla(${hue}, 92%, 74%, 0.5)`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(px[i], py[i])
          ctx.lineTo(px[i] + vx[i] * 0.035, py[i] + vy[i] * 0.035)
          ctx.stroke()
        }
      }
    }

    ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]
      // 画真正的胶囊轮廓：中间是半径 r 的实体，不是两根圆加一根线。
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(-b.a)
      traceCapsule(b.r, b.hl)
      ctx.fillStyle = 'rgba(255, 209, 102, 0.08)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.95)'
      ctx.lineWidth = 1.4
      ctx.stroke()
      ctx.restore()
      // 质心十字
      ctx.beginPath()
      ctx.moveTo(b.x - 3, b.y)
      ctx.lineTo(b.x + 3, b.y)
      ctx.moveTo(b.x, b.y - 3)
      ctx.lineTo(b.x, b.y + 3)
      ctx.stroke()
      const label = `#${i + 1} ${b.frac.toFixed(2).slice(1)}`
      const tw = ctx.measureText(label).width + 6
      const labelY = b.y - 32 - (i % 2) * 13
      ctx.fillStyle = 'rgba(6, 12, 24, 0.72)'
      ctx.fillRect(b.x - tw / 2, labelY - 5.5, tw, 11)
      ctx.fillStyle = '#ffe08a'
      ctx.fillText(label, b.x, labelY)
    }

    if (showSurface) {
      // 水面高度场的采样点：看线的形状与粒子分布是否一致
      ctx.fillStyle = 'rgba(130, 238, 255, 0.55)'
      for (let i = 0; i < BINS; i += 2) {
        ctx.fillRect((i / (BINS - 1)) * W - 0.6, drawSurface[i] - 0.6, 1.2, 1.2)
      }
    }

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(6, 12, 24, 0.7)'
    ctx.fillRect(6, 6, 112, 28)
    ctx.fillStyle = '#bdefff'
    ctx.fillText(`PBF 粒子 ${count}`, 11, 10)
    ctx.fillStyle = '#ffe08a'
    ctx.fillText(`胶囊体 ${bodies.length} · 青→红=速度`, 11, 21)
    ctx.restore()
  }

  // 分步重建的隔离舞台：第 1 步只画物理，第 2 步加回立绘。
  // 两种阶段都不画背景图、水体和任何水面特效。
  function drawPhysicsStage(stage: 1 | 2 | 3 | 4) {
    ctx.clearRect(0, 0, W, H)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#08172f')
    bg.addColorStop(1, '#040b18')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // 坐标参考网格：方便看粒子整体是否在移动、胶囊是否跟着走。
    ctx.strokeStyle = 'rgba(120, 180, 255, 0.1)'
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += 30) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, H)
      ctx.stroke()
    }
    for (let y = 0; y <= H; y += 30) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(W, y + 0.5)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(0, camOffset)
    if (stage >= 2) drawBodies()
    if (stage >= 3) drawParticleWater()
    if (stage === 4) drawParticleSurfaceFx()
    drawDebug(false, stage < 4)
    ctx.restore()

    ctx.strokeStyle = 'rgba(170, 215, 255, 0.35)'
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
    ctx.fillStyle = 'rgba(4, 12, 26, 0.82)'
    ctx.fillRect(6, 38, stage === 4 ? 224 : stage >= 2 ? 184 : 146, 17)
    ctx.fillStyle = '#dff4ff'
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      stage === 4
        ? 'STAGE 4 · 水线 / 泡沫 / 飞溅'
        : stage === 3
          ? 'STAGE 3 · 粒子水体'
          : stage === 2
            ? 'STAGE 2 · 立绘跟随胶囊'
            : 'STAGE 1 · 只画物理',
      11,
      47,
    )
  }

  // Stage 5：把粒子水体、粒子轮廓水线和背景合成到最终画面。
  function drawFinalStage(showBadge = false) {
    ctx.clearRect(0, 0, W, H)
    if (bgReady && bg) {
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
    drawBodies()
    computeParticleSurface()
    drawWaterBaseFill()
    drawParticleWater(0.5)
    drawParticleSurfaceFx(false)
    if (debugView) drawDebug(false, true)
    ctx.restore()

    if (showBadge) {
      ctx.fillStyle = 'rgba(4, 12, 26, 0.72)'
      ctx.fillRect(6, 6, 168, 17)
      ctx.fillStyle = '#dff4ff'
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('STAGE 5 · 最终预览', 11, 15)
    }
  }

  function render() {
    if (renderStage === 5) {
      drawFinalStage(showStageBadge)
      return
    }
    if (renderStage === 1 || renderStage === 2 || renderStage === 3 || renderStage === 4) {
      drawPhysicsStage(renderStage as 1 | 2 | 3 | 4)
      return
    }

    // 背景：融合背景图（cover 自适应），没加载好时退回深色渐变
    ctx.clearRect(0, 0, W, H)
    updateDrawSurface()
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

    drawBodies()

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
      const d = py[i] - drawSurface[bin]
      if (d > -1 && d < 6) {
        ctx.fillRect(px[i], py[i], 1.6, 1.6)
      }
    }

    // 飞溅：直接把"飞到水面以上"的模拟粒子画成短水线（不是额外特效）
    ctx.lineCap = 'round'
    for (let i = 0; i < count; i++) {
      const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
      const above = drawSurface[bin] - py[i]
      // 正常贴在水面的粒子不会高于水面线，留一格间距的余量（8px），
      // 只把真正飞离水面的画成水线，水面上沿就不会有一层细白点。
      // （不要用"密度低"当判据：水柱是一团一起飞的，密度并不低）
      if (above <= 8) continue
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

    if (debugView) drawDebug()

    ctx.restore()
  }

  /* ---------------- 输入 ---------------- */
  function toLocal(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    // canvas 的 CSS 尺寸跟逻辑尺寸不一致，指针坐标要换算回 390×240 的模拟空间
    return [
      ((e.clientX - rect.left) * W) / Math.max(1, rect.width),
      ((e.clientY - rect.top) * H) / Math.max(1, rect.height),
    ] as const
  }

  function onDown(e: PointerEvent) {
    // 合成事件 / 某些触控笔没有活动指针时 capture 会抛错，不能让它中断拖拽
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {}
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
  let lastRender = 0
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
    if (scrollEffects && Math.abs(dScroll) > 0.2) {
      // 页面往下滚 ≈ 水槽整体向下位移；水没被带走，相对水槽就是往上"滞空"，
      // 下一帧开始由重力把它拉回去。这里给的是速度冲量，不是持续加速度。
      scrollKick += dScroll * CFG.scrollLag
      scrollKick = Math.max(-520, Math.min(520, scrollKick))
    }
    const camTarget = scrollEffects ? Math.max(-16, Math.min(16, -scrollV * 0.02)) : 0
    camOffset = camOffset * 0.9 + camTarget * 0.1

    // 滚动时给每个小人一个随机方向的力矩：只有平动太假
    scrollSpinCd -= dtReal
    if (scrollEffects && Math.abs(scrollV) > 240 && scrollSpinCd <= 0) {
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
    if (now - lastRender >= 1000 / 45) {
      lastRender = now
      render()
      fpsFrames++
    }
  }

  /* ---------------- 生命周期 ---------------- */
  layout()
  buildParticles()
  settleWater()
  buildBodies(undefined, false)
  settleBodies()
  sprites = SPRITE_SOURCES.map((src) => {
    const img = new Image()
    img.onload = () => {
      spritesLoaded++
      if (W > 0 && H > 0) render()
    }
    img.src = withBase(src)
    return img
  })

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

  function loadBg(force = false) {
    if (!force && bgReady) return
    if (force) bgReady = false
    const img = new Image()
    img.onload = () => {
      bg = img
      bgReady = true
      bgCache = null
      buildBgCache()
      if (W > 0 && H > 0) render()
    }
    img.src = withBase('/bg/tank-bg-sm.webp')
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
        // 物理尺寸是固定的；从屏外回来只补一次像素密度
        syncDpr()
        last = performance.now()
        lastRender = 0
      }
    },
    { threshold: 0.05 },
  )
  io.observe(host)

  const onVisibility = () => {
    running = !document.hidden
    if (running) {
      last = performance.now()
      lastRender = 0
    }
  }
  document.addEventListener('visibilitychange', onVisibility)

  let resizeTimer = 0
  const onResize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      // 卡片 / 窗口缩放只换画布像素密度，不重置粒子与人偶
      syncDpr()
    }, 180)
  }
  window.addEventListener('resize', onResize)

  raf = requestAnimationFrame(frame)

  // 调试出口：控制台里 __tank.state() 看粒子与刚体状态
  ;(window as any).__tank = {
    // 水面高度场本身（96 格），排查锯齿用
    surface: () => Array.from(surface, (v) => Math.round(v)),
    // 最深的穿透量（负值 = 粒子陷进人偶多深），用来验收刚体分离
    penetration: () => {
      let worst = 0
      let nan = 0
      for (let i = 0; i < count; i++) {
        for (const b of bodies) {
          const [d] = capsuleDistance(b, px[i], py[i])
          if (!Number.isFinite(d)) {
            nan++
            continue
          }
          if (d < worst) worst = d
        }
      }
      return { worst: +worst.toFixed(2), nan }
    },
    // 最快的几颗粒子：位置 / 速度 / 相对密度 / 离最近刚体多远
    probe: (n = 8) => {
      const idx: number[] = []
      for (let i = 0; i < count; i++) idx.push(i)
      idx.sort((a, b) => Math.hypot(vx[b], vy[b]) - Math.hypot(vx[a], vy[a]))
      return idx.slice(0, n).map((i) => {
        let bd = 1e9
        for (const b of bodies) {
          const [d] = capsuleDistance(b, px[i], py[i])
          if (d < bd) bd = d
        }
        return {
          x: Math.round(px[i]),
          y: Math.round(py[i]),
          vx: Math.round(vx[i]),
          vy: Math.round(vy[i]),
          rho: +(rho[i] / rho0).toFixed(2),
          body: Math.round(bd),
        }
      })
    },
    state: () => {
      let minY = H
      let maxY = 0
      let rhoSum = 0
      let topCount = 0
      let flying = 0
      let drawn = 0
      let vy2 = 0
      let vmax = 0
      const ys: number[] = []
      for (let i = 0; i < count; i++) {
        if (py[i] < minY) minY = py[i]
        if (py[i] > maxY) maxY = py[i]
        rhoSum += rho[i]
        vy2 += vy[i] * vy[i]
        const sp = Math.hypot(vx[i], vy[i])
        if (sp > vmax) vmax = sp
        if (py[i] < H * 0.3) topCount++
        const bin = Math.min(BINS - 1, Math.max(0, ((px[i] / W) * BINS) | 0))
        if (drawSurface[bin] - py[i] > 5) flying++
        if (drawSurface[bin] - py[i] > 8) drawn++
        if (i % 17 === 0) ys.push(py[i])
      }
      ys.sort((a, b) => a - b)
      return {
        count,
        fps,
        spritesOk: spritesLoaded,
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
        drawn,
        vyRms: Math.round(Math.sqrt(vy2 / Math.max(1, count))),
        vmax: Math.round(vmax),
        level: Math.round(waterLevel),
        p10y: Math.round(ys[Math.floor(ys.length * 0.1)] || 0),
        p50y: Math.round(ys[Math.floor(ys.length * 0.5)] || 0),
        surfaceTop: Math.round(Math.min(...drawSurface)),
        surfaceBottom: Math.round(Math.max(...drawSurface)),
        physicsTop: Math.round(Math.min(...surface)),
        physicsBottom: Math.round(Math.max(...surface)),
        bodies: bodies.map((b) => ({
          x: Math.round(b.x),
          y: Math.round(b.y),
          sprite: b.spriteIndex,
          frac: +b.frac.toFixed(2),
          vy: Math.round(b.vy),
          a: +b.a.toFixed(2),
        })),
      }
    },
  }

  return {
    refresh: refreshBodies,
    setDebug: (on: boolean) => {
      debugView = !!on
      render()
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onUp)
    },
    stats: () => {
      let densityError = 0
      const sampleStep = count > 1200 ? 4 : 1
      let sampled = 0
      for (let i = 0; i < count; i += sampleStep) {
        densityError += rho[i] / rho0 - 1
        sampled++
      }
      return {
        fps,
        particles: count,
        iterations: CFG.iterations,
        densityError: densityError / Math.max(1, sampled),
        waterAmount: (count * CFG.spacing * CFG.spacing * 100) / (W * H),
        colliders: bodies.length,
      }
    },
  }
}
</script>

<template>
  <div ref="root" class="fluid-tank" :class="{ 'fluid-tank--compact': compact }">
    <canvas ref="canvasEl" class="fluid-tank__canvas"></canvas>
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

.fluid-tank--compact {
  height: auto;
  aspect-ratio: 390 / 240;
  margin: 0;
  border-radius: 14px;
  box-shadow: 0 12px 30px -22px rgba(10, 20, 50, 0.6);
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

@media (max-width: 640px) {
  .fluid-tank {
    height: 300px;
  }

  .fluid-tank--compact {
    height: auto;
  }
}
</style>
