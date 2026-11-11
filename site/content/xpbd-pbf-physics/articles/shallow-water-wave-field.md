---
title: "基于二维波动方程的浅水波场"
outline: [2, 3]
aside: true
---

# 基于二维波动方程的浅水波场
&emsp;&emsp;PBF 粒子的自由表面由离散点集构成，直接从中提取大尺度涟漪时会受到粒子间距和采样噪声影响。落叶入水、角色踩水或武器扫过水面所产生的事件，需要一圈圈能够持续传播的波，而不仅是局部粒子起伏。

&emsp;&emsp;项目实际维护两层高度信息。`FluidHeightField` 从 PBF 粒子中提取平滑自由表面，提供实测水位、空洞判定和浮力采样，`FluidWaveField` 则在水池内腔的规则二维网格上单独求解浅水波动方程 [1]。后者不替代粒子的三维流场，而是在基础水位之上叠加传播中的涟漪。

&emsp;&emsp;浅水波场输出相对静止水面的高度 $h$ 与两个水平方向的斜率。物理侧使用实测自由表面、波场高度和顺坡漂移处理漂浮物体，渲染侧使用 $h$ 抬升几何水面，并用坡度扰动逐像素法线。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/波场.gif" alt="浅水波场驱动水面叶片漂移与聚散" style="width: 100%; max-width: 720px; height: auto;">
</p>

## 参考文献
1. Kass, M., & Miller, G. Rapid, Stable Fluid Dynamics for Computer Graphics. *Proceedings of SIGGRAPH '90*, 1990: 49–57. [DOI](https://doi.org/10.1145/97880.97894)

## 1、浅水方程
&emsp;&emsp;设水面相对静水高度为 $h(x,z,t)$，波速为 $c$，速度阻尼系数为 $\gamma$，外部注入项为 $S$，则波动方程为：
$$
\frac{\partial^2h}{\partial t^2}
=c^2\nabla^2h
-\gamma\frac{\partial h}{\partial t}
+S
$$
对于浅水重力波，理论上波速可由水深 $H$ 给出：
$$
c=\sqrt{gH}
$$
其中 $g$ 为重力加速度。当前工程没有根据逐点水深反算 $c$，而是直接使用场景参数 `waveSpeed`，它承担传播速度与稳定性的调节作用。高度场只描述竖直方向的低成本表面扰动，不替代 PBF 对三维流场和体积的求解。

## 2、显式中心差分
&emsp;&emsp;在离散公式中，下标 $i$ 表示规则网格上的目标节点，其平面坐标为 $(x,z)$，上标 $n$ 表示当前波场帧。每个波场帧按固定时长 $\Delta t_s$ 推进，一个显示帧可以包含多个波场帧。$\Delta x$ 与 $\Delta z$ 是相邻网格节点在 $x$、$z$ 方向上的间距。

&emsp;&emsp;$h_i^n$ 表示节点 $i$ 在当前波场帧相对静水面的高度，$h_i^*$ 表示只完成波动方程预测，尚未施加阻尼的候选高度，$h_i^{\prime}$ 表示再经过速度阻尼后的候选高度。$\gamma$ 为速度阻尼系数，$\lambda$ 为全局指数耗散系数，$H$ 为高度钳位上限，$\overline{h^{n+1}}$ 为下一波场帧高度的空间平均值。

&emsp;&emsp;对波动方程的时间二阶导数做中心差分：
$$
\frac{\partial^2h}{\partial t^2}
\approx
\frac{h_i^{n+1}-2h_i^n+h_i^{n-1}}{\Delta t_s^2}
$$
规则网格上的正交五点拉普拉斯项由上下左右四个邻居给出：
$$
L_{\mathrm{axis}}
=
\frac{h^n(x-\Delta x,z)-2h_i^n+h^n(x+\Delta x,z)}{\Delta x^2}
+
\frac{h^n(x,z-\Delta z)-2h_i^n+h^n(x,z+\Delta z)}{\Delta z^2}
$$
为降低网格轴向与斜向之间的相速度差异，项目还对旋转 $45^\circ$ 的四个对角邻居计算第二个五点模板，并取两者平均：
$$
L_{\mathrm{diag}}
=
\frac{
h_{\mathrm{DL}}+h_{\mathrm{DR}}+h_{\mathrm{UL}}+h_{\mathrm{UR}}-4h_i^n
}{
2\left(\Delta x^2+\Delta z^2\right)
}
$$
$$
\nabla_d^2h_i^n
=\frac{1}{2}\left(L_{\mathrm{axis}}+L_{\mathrm{diag}}\right)
$$
暂时忽略阻尼和外部注入，把两个离散算子代入连续方程 $h_{tt}=c^2\nabla^2h$：
$$
\frac{h_i^{n+1}-2h_i^n+h_i^{n-1}}{\Delta t_s^2}
=
c^2\nabla_d^2h_i^n
$$
两边乘以 $\Delta t_s^2$ 并移项，可得：
$$
h_i^{n+1}
=2h_i^n-h_i^{n-1}
+c^2\Delta t_s^2\nabla_d^2h_i^n
$$
代码没有直接写入 $h_i^{n+1}$，而是先把等号右侧记为未阻尼候选值 $h_i^*$：
$$
\begin{aligned}
h_i^{*}
&=2h_i^n-h_i^{n-1} \\
&+c^2\Delta t_s^2
\left(
\frac{h^n(x-\Delta x,z)-2h_i^n+h^n(x+\Delta x,z)}{\Delta x^2}
\right. \\
&\left.
+\frac{h^n(x,z-\Delta z)-2h_i^n+h^n(x,z+\Delta z)}{\Delta z^2}
\right)
\end{aligned}
$$
&emsp;&emsp;记未阻尼预测带来的单步高度变化为：
$$
\Delta h_i^n=h_i^*-h_i^n
$$
&emsp;&emsp;如果直接把 $h_i^*$ 乘上阻尼系数，会把当前水面整体压向零高度，等同于改变静水基准。项目只衰减这一步产生的增量，因此有：
$$
h_i^{\prime}
=h_i^n+\left(1-\gamma\Delta t_s\right)\Delta h_i^n
$$
&emsp;&emsp;当 $\gamma>0$ 时，这一步的速度贡献被缩小，但已经存在的水面高度不会被直接压低。随后执行高度钳位：
$$
\widetilde h_i^{n+1}
=\operatorname{clamp}\left(h_i^{\prime},-H,H\right)
$$
其中 $H$ 是允许的最大单点波幅。钳位用于阻止数值发散和极端冲击把高度无限放大，是一种安全边界。

&emsp;&emsp;全局指数耗散再对场中每个高度偏移施加统一衰减：
$$
h_i^{n+1}
=\left(1-\lambda\Delta t_s\right)
\widetilde h_i^{n+1}
$$

这种全局衰减主要用于防止持续注入和数值误差让水面长期不能恢复平静。

&emsp;&emsp;最后计算整张高度场的平均值：
$$
\overline{h^{n+1}}
=\frac{1}{N}\sum_j h_j^{n+1}
$$
再从每个格子的高度中减去该均值：
$$
h_i^{n+1}\leftarrow h_i^{n+1}-\overline{h^{n+1}}
$$
这样处理后，波场的平均高度恒为零，正负波峰在整体上互相抵消。冲击注入、钳位和耗散都可能留下很小的非零均值，如果不去除，这些误差会逐帧累积成整池缓慢升高或降低。去均值只修正浅水波场的相对扰动，真正的全局水位仍由 PBF 粒子自由表面单独维护。

对应 `FluidWaveField.IntegrateOnce` 的核心实现为：

```csharp
// 正交五点模板与旋转 45° 的五点模板，两者的尺度均已预先归一化
float axisLap = (hL + hR - 2f * hC) * invDx2
              + (hD + hU - 2f * hC) * invDz2;
float diagLap = (hDL + hDR + hUL + hUR - 4f * hC) * invDiag2;
float lap = 0.5f * (axisLap + diagLap);

// 未阻尼预测：2h_n - h_(n-1) + c²Δt²∇²h_n
float hStar = 2f * hC - _hPrev[i] + c2 * dt * dt * lap;

// 只衰减本步新增位移；边界吸收带进一步降低局部阻尼系数
float localDamp = damp * Mathf.Clamp01(
    1f - BoundaryMaxDamping * dt * _boundaryRamp[i]);
float hPrime = hC + (hStar - hC) * localDamp;

// 钳位后施加一次全局指数耗散，再写入第三个缓冲
_scratch[i] = Mathf.Clamp(hPrime, -clampH, clampH) * leakF;

...

// 三缓冲轮转，让本步结果成为新的当前高度
var tmp = _hPrev; _hPrev = _h; _h = _scratch; _scratch = tmp;

// 减去空间均值，防止整池高度累积漂移
double mean = 0.0;
for (int i = 0; i < _h.Length; i++) mean += _h[i];
float meanF = (float)(mean / _h.Length);
for (int i = 0; i < _h.Length; i++) _h[i] -= meanF;
```

&emsp;&emsp;边界格使用自身作为缺失邻居，形成零法向导数的反射边界。显式中心差分的 CFL 条件要求时间步与网格尺寸、波速共同匹配。项目直接使用：
$$
\Delta t_s=0.5\frac{\min(\Delta x,\Delta z)}{c}
$$
时间步通过累加器拆成固定长度的子步，单帧最多推进 8 个子步，不足一个子步的余量留到下一帧，避免帧率变化改变波速和稳定性。

## 3、冲击注入
&emsp;&emsp;如果只在落点向上增加高度，注入会成为一个持续抬高水面的体积源，并产生显著整体位移。事件冲击使用平滑径向权重 $w=(1-r^2/R^2)^2$，再在落点邻域减去局部均值，使单次注入的总高度保持不变：
$$
\sum_{\mathbf{x}\in\Omega}S(\mathbf{x})=0
$$
&emsp;&emsp;冲击注入负责把入水、撞击等离散事件转换成局部的初始高度和速度扰动。扰动产生之后，向外传播、叠加和衰减都由第 2 节的波动方程完成。关闭事件源只会让波场失去这次输入，并不会停止波场求解。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/冲击注入.gif" alt="开启与关闭冲击注入时物体周围水面涟漪的左右动态对比" style="width: 100%; max-width: 900px; height: auto;">
</p>
<p align="center"><sub>左：开启刚体入水的冲击注入；右：关闭事件源，因缺少初始扰动而没有可见环形波。</sub></p>

`FluidWaveField.AddImpulse` 的核心实现如下：

```csharp
// 把事件强度转换为受预算约束的实际注入速度
float speed = LimitInjection(S.injectionBurst * strength, kind);
if (speed <= 0f) return;

float radius = Mathf.Max(_dx, S.impulseRadius);
int span = Mathf.CeilToInt(radius / _dx);
float invR2 = 1f / (radius * radius);
float dt = Mathf.Min(Time.deltaTime, MaxStepDt);

int side = span * 2 + 1;
float sumW = 0f;
int nW = 0;

// 建立平滑径向权重，方向性冲击会在此基础上叠加偶极倾斜
for (int dz = -span; dz <= span; dz++)
for (int dx = -span; dx <= span; dx++)
{
    int slot = (dz + span) * side + (dx + span);
    int iz = cz + dz;
    int ix = cx + dx;
    ...
    float r2 = (dx * _dx) * (dx * _dx) + (dz * _dz) * (dz * _dz);
    float w = 0f;
    if (r2 <= radius * radius)
    {
        float t = 1f - r2 * invR2;
        w = t * t;
    }
    if (tilt > 0f && w != 0f)
    {
        float along = (dx * _dx * ux + dz * _dz * uz) / radius;
        w *= 1f + tilt * Mathf.Clamp(along, -1f, 1f);
    }
    _injectW[slot] = w;
    sumW += w;
    nW++;
}

// 减去局部均值，使单次注入不改变高度场总量
float wMean = nW > 0 ? sumW / nW : 0f;
for (int dz = -span; dz <= span; dz++)
for (int dx = -span; dx <= span; dx++)
{
    int slot = (dz + span) * side + (dx + span);
    int iz = cz + dz;
    int ix = cx + dx;
    ...
    float w = _injectW[slot] - wMean;

    // 写入上一帧高度等价于注入竖直初速度，下一步积分会将其转换为位移
    _hPrev[iz * _n + ix] -= speed * w * dt;
}
```

## 4、纹理输出
&emsp;&emsp;波场每步输出一张 `RGBAHalf` 浮点贴图，当前只使用 R/G/B 三个通道：

| 通道 | 内容 | 用途 |
| --- | --- | --- |
| R | $h$ | 几何位移、波峰与调试高度 |
| G | $\partial h/\partial x$ | 沿 $x$ 方向的坡度 |
| B | $\partial h/\partial z$ | 沿 $z$ 方向的坡度 |
| A | $0$ | 保留未使用 |

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/浅水波场RGB通道.png" alt="同一帧浅水波场的高度、x 坡度与 z 坡度通道" style="width: 100%; max-width: 900px; height: auto;">
</p>
<p align="center"><sub>同一帧 201×201 波场纹理。R/G/B 为有符号浮点数据，图中各通道分别以零为中心独立归一化显示；A 通道当前保留未用。</sub></p>

&emsp;&emsp;R 通道直接显示中心冲击形成的波峰与外围波谷；G、B 通道的符号表示坡度朝向，适合转换为法线扰动。高度与斜率都使用同一份显示平滑后的波场，避免几何波形与法线来自不同的数值口径。

## 5、外部耦合
&emsp;&emsp;外部耦合连接两套独立求解器：叶片由 XPBD 维护粒子、距离与弯曲约束；水面由 PBF 粒子和浅水波场维护。两者不合并为同一个全局约束系统，而是在叶片速度、波场高度与离散事件之间交换信息。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/波场.gif" alt="浅水波场驱动大量水面叶片漂移，同时叶片运动反作用于水面的外部耦合演示" style="width: 100%; max-width: 720px; height: auto;">
</p>
<p align="center"><sub>当前 Wave 场景中，水面波场与漂浮叶片的双向外部耦合。</sub></p>

### 5.1、执行顺序
&emsp;&emsp;`XPBD_FluidBody.coupledBodies` 保存参与耦合的根节点。耦合器会读取根节点自身及其直接子物体上的 `XPBD_Body`。每片软体保存中心、速度、最大浸没深度、当前干湿状态、入水冷却与水面停留时间等跨帧状态。

&emsp;&emsp;`FluidSoftBodyCoupling.Step` 在流体的 `Update` 中执行，早于 PBF 与 XPBD 的正式求解。这样，水对叶片写入的速度增量能够参与当前帧的叶片约束求解。叶片对水产生的波场和粒子冲量也能参与当前帧的流体更新。

### 5.2、叶片对水的作用
&emsp;&emsp;叶片对水的响应分为离散入水事件和持续滑行尾迹。入水与出水使用滞回状态：最深质点达到正浸没阈值时记为湿，升到水面以上一定距离后才重新记为干，从而避免叶片在水线附近抖动时反复触发冲击。

&emsp;&emsp;入水强度由最深浸没深度的增长率决定：
$$
S=S_{\mathrm{scale}}
\operatorname{clamp}
\left(
\frac{\dot d_{\max}}{v_{\mathrm{ref}}},
S_{\min},S_{\max}
\right)
$$
只有增长率超过门限且冷却结束时才会触发。事件会同时向波场注入带方向的局部冲击、向落点附近的 PBF 粒子施加向下冲量，并按附加质量比例降低叶片入水后的剩余速度。

&emsp;&emsp;出水事件使用独立门限，同时检查向上揭示速率、水面停留时间和水平掠过速度，因此叶片单纯随波上下起伏不会不断触发。滑行尾迹则使用叶片相对水的水平速度作为输入，而不是绝对速度：
$$
\mathbf{v}_{\mathrm{rel}}
=\mathbf{v}_{\mathrm{leaf}}-\mathbf{v}_{\mathrm{water}}
$$
当叶片被涟漪带着一起漂移时，相对速度接近零，尾迹会停止继续向波场供能，避免“波场推叶片、叶片再增强波场”的正反馈。

```csharp
// 首帧只建立状态，不把“本来就在水里”判成入水
if (!state.primed)
{
    state.primed = true;
    state.prevDepth = maxDepth;
    state.wet = maxDepth > SoftEnterDepth;
    return;
}

// 干湿状态使用不同阈值，形成阻止反复切换的滞回区间
if (state.wet)
{
    if (state.maxDepth < -_body.softExitMargin)
    {
        state.wet = false;
        EmitSoftExitDisturbance(state, wave, dt);
    }
    return;
}

// 入水强度取最深浸没深度的增长率，而不是叶片的绝对竖直速度
float penetrationRate =
    (state.maxDepth - state.prevDepth) / Mathf.Max(1e-5f, dt);

if (state.maxDepth <= SoftEnterDepth ||
    penetrationRate < _body.softImpactMinSpeed ||
    state.splashTimer > 0f)
    return;

state.wet = true;
state.splashTimer = SoftSplashCooldown;
{
    float strength = _body.softImpactScale * Mathf.Clamp(
        penetrationRate / SoftImpactSpeedRef, 0.2f, 2.5f);

    // 向波场注水，并沿叶片水平速度方向形成有方向性的波前
    wave.AddImpulse(
        impactPos, strength, SoftHorizontalVelocity(state), SoftExitDirBias);

    // 同一事件也把周围 PBF 粒子向下推开，避免只有表面涟漪而水体没有响应
    float push = SoftPushSpeed * Mathf.Clamp01(
        impactDepth / Mathf.Max(1e-4f, SoftSubmersionDepth));
    _body.AddExternalImpulse(
        impactPos, SoftPushRadius, Vector3.down * push);

    // 附加质量：入水后的叶片保留一半速度
    for (int i = 0; i < state.body.V.Length; i++)
        state.body.V[i] *= SoftEntryRetain;
}

// 水面滑行时按“相对水的位移”注入尾迹；低速时不会持续供能
if (state.wake != null)
{
    Vector3 averageWaterVelocity = wetCount > 0
        ? sumWaterV / wetCount
        : Vector3.zero;
    state.wake.Drive(
        state.center,
        state.velocity - averageWaterVelocity,
        dt);
}
```

&emsp;&emsp;启用 `softWakeSources` 时，叶片滑行还会调用 `WaterInteractionSource.Drive`。它累加的是叶片相对水面的位移，只有相对速度超过造波门限时才向波场和 PBF 粒子注入动量。

```csharp
float relativeDistance = relativeVelocity.magnitude * dt;
if (relativeSpeed < minWakeSpeed) return;

// 每前进 impulseSpacing 距离注入一次局部冲击
_travelImpulse += relativeDistance;
if (_travelImpulse >= impulseSpacing)
{
    _travelImpulse = 0f;
    wave.AddImpulse(
        contactPoint,
        impulseScale * Mathf.Clamp(relativeSpeed * 0.5f, 0f, 2f));
    PushFluidParticles(contactPoint, direction, relativeSpeed);
}

// 可选：按固定行进距离在左右两侧交替注入局部涡核
_travelVortex += relativeDistance;
if (shedVortices &&
    _travelVortex >= FluidWaveField.VortexShedSpacing)
{
    _travelVortex = 0f;
    Vector3 side = Vector3.Cross(Vector3.up, direction);
    Vector3 core = contactPoint +
        side * (FluidWaveField.VortexRadius * 0.8f) * _shedSide;
    wave.AddVortex(core, _shedSide, relativeSpeed * 0.5f);
    _shedSide = -_shedSide;
}
```

&emsp;&emsp;这里的涡街只能视为视觉近似。项目在高度场相邻格点写入一对符号相反的扰动，并按左右方向交替触发，形成有节律的交错尾迹，它没有显式求解三维涡量输运，因此不等同于真实的卡门涡街。

### 5.3、水对叶片的作用
&emsp;&emsp;水对叶片同时提供浮力、相对速度阻力、粒子流跟随、顺坡漂移、可选的竖直吸附以及水平钉住。水面高度首先采样浅水波场，但浸没深度优先使用 `TrySampleSurfaceHeight` 返回的粒子自由表面，这样粒子高度场中的局部空洞不会被波场高度掩盖。

&emsp;&emsp;叶片跟随的水平水速由 PBF 粒子真实流速与波场坡度共同构成。前者表示冲击和涡流造成的横向输运，后者由高度梯度近似：
$$
\mathbf{u}_{\mathrm{drift}}
=-\operatorname{clampMagnitude}
\left(g\tau\nabla h,u_{\max}\right)
$$
负号表示沿高度下降方向移动。顺坡漂移只读取当前坡度并改变叶片速度，不会创建新的涟漪。

水向叶片传能的核心计算：

```csharp
// 采样波场高度与坡度，并用实测自由表面修正浸没深度
wave.SampleHeightAndSlope(p, out float h, out Vector2 slope);
float depth = wave.WaterLevel + h - p.y;
if (_body.TrySampleSurfaceHeight(p, out float surfaceY))
    depth = surfaceY - p.y;

// 水面速度由两部分组成：
// 1. PBF 粒子真实横向流速；2. 波场坡度换算出的顺坡漂移
Vector2 particleVelocity = _body.submergeFlowFollow > 0f
    ? _body.SampleWaterVelocity(p) * _body.submergeFlowFollow
    : Vector2.zero;
Vector3 waterVelocity = new Vector3(
    particleVelocity.x, 0f, particleVelocity.y);
if (_body.submergeDrift)
    waterVelocity += SoftWaterVelocity(slope); // 内部计算为 -gτ∇h 并限制最大速度

// 浸没比例控制阻力强度；先向水速靠拢，再施加向上浮力
float submerged = Mathf.Clamp01(depth / SoftSubmersionDepth);
V[i] = Vector3.Lerp(
    V[i], waterVelocity, Mathf.Clamp01(SoftWaterDrag * submerged * dt));
V[i] += Vector3.up * (SoftBuoyancyAccel * submerged * dt);
```

&emsp;&emsp;浸没比例控制各项响应的强度。设质点相对水面的深度为 $d_i$，过渡深度为 $d_s$，则：
$$
r_i=\operatorname{clamp01}\left(\frac{d_i}{d_s}\right)
$$
速度松弛写为：
$$
\mathbf{v}_i\leftarrow
\operatorname{Lerp}
\left(
\mathbf{v}_i,\mathbf{u}_w,
\operatorname{clamp01}\left(k_dr_i\Delta t\right)
\right)
$$
随后施加浮力：
$$
\mathbf{v}_i\leftarrow
\mathbf{v}_i+\mathbf{e}_y a_br_i\Delta t
$$
阻力必须先于浮力计算，若顺序相反，当前帧的浮力增量会被随后的速度松弛再次衰减，叶片可能长期停在池底。

&emsp;&emsp;`submergeAdhesion` 控制可选的竖直吸附，在作用带内把质点沿高度方向拉回水面，并抑制上下弹跳。`submergePin` 控制水平钉住：它以有限减速度把叶片水平速度拉向水速，当相对速度超过挣脱阈值后，钉住权重会快速归零，使叶片可以被风或强流带走。

## 6、延伸阅读
- 作品：[Unity 实时柔性体与粒子流体系统](/projects/xpbd-pbf-physics/)
- 文章：[PBF 粒子流体模拟](/articles/graphics/pbf-particle-fluid/)、[基于顶点高度位移贴图的浅水水面几何重建](/articles/graphics/water-heightfield-geometry/)、[基础水体着色](/articles/graphics/water-shading/)、[焦散](/articles/graphics/water-caustics/)
