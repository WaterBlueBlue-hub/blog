---
title: "基于 Tanabe-Kaneko 模型的落叶模拟"
outline: [2, 3]
aside: true
---

# 基于 Tanabe-Kaneko 模型的落叶模拟
&emsp;&emsp;纸片或树叶自由下落时，会在翻转、摇摆和横向漂移之间不断切换。若直接求解带运动边界的 Navier-Stokes 方程，计算成本会远高于实时渲染所能承受的预算。Tanabe 与 Kaneko 在 1994 年提出了一种准定常薄板模型，将复杂流固耦合压缩为 Kutta-Joukowski 升力、速度阻尼与转动阻尼，用少量状态量复现纸片下落的多种姿态 [1]。

&emsp;&emsp;项目中的叶片并非刚性薄板，而是由距离约束与二面角约束维持形状的柔性粒子薄壳。因此实现没有直接照搬刚体方程，而是把它作为独立的姿态气动层：每帧从叶片质点提取等效质心、叶面法线与角速度，计算整片叶子的平动加速度和角加速度，再逐质点写回速度。叶片的局部弯曲与褶皱仍由 PBD 与 XPBD 约束系统负责 [2][3]。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片三种下落模式.gif" alt="叶片恢复转平、持续翻滚和左右摇摆三种下落模式" style="width: 100%; max-width: 900px; height: auto;">
</p>

## 参考文献
1. Tanabe, Y., & Kaneko, K. Behavior of a Falling Paper. *Physical Review Letters*, 1994, 73(10): 1372–1375. [DOI](https://doi.org/10.1103/PhysRevLett.73.1372)
2. Müller, M., Heidelberger, B., Hennix, M., & Ratcliff, J. Position Based Dynamics. *Journal of Visual Communication and Image Representation*, 2007, 18(2): 109–118. [DOI](https://doi.org/10.1016/j.jvcir.2007.01.005)
3. Macklin, M., Müller, M., & Chentanez, N. XPBD: Position-Based Simulation of Compliant Constrained Dynamics. *Proceedings of the 9th International Conference on Motion in Games*, 2016: 49–54. [DOI](https://doi.org/10.1145/2994258.2994272)

## 1、准定常薄板模型
### 1.1、模型来源
&emsp;&emsp;Tanabe-Kaneko 模型把下落纸片视为长度 $l$、质量 $m_p$ 的零厚度刚体。原模型提出了三部分作用，垂直于板面的速度阻尼、沿板面的速度阻尼，以及绕质心的转动阻尼：
$$
\begin{aligned}
F_{\perp} &= -m_pk_{\perp}v_n, \qquad F_{\parallel} = -m_pk_{\parallel}v_t \\
F_{\theta} &= -m_pk_{\perp}\frac{l^2}{12}\omega
\end{aligned}
$$
其中 $v_n$ 与 $v_t$ 分别为法向、切向速度，$\omega$ 为绕质心的角速度，$k_{\perp}$、$k_{\parallel}$ 为对应阻尼系数。

&emsp;&emsp;项目保留该模型对整体姿态的描述能力，但没有直接沿用上述一次速度阻尼。逐质点速度衰减改由二次阻力模型承担。

&emsp;&emsp;除阻尼外，模型还为薄板计算 Kutta-Joukowski 升力及其相对于质心的力矩：
$$
L=l\rho_f\pi U^2\cos\phi, \qquad M=-\frac{1}{4}Ll\sin\phi
$$
其中 $\rho_f$ 为流体密度，$U$ 为来流速度，$\phi$ 为叶面法线与来流方向的夹角。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/薄板气动模型示意图_phi修正版_无留白.png" alt="薄板的相对来流 U、法线 n、升力 L、恢复力矩 M 与夹角 ϕ 的关系" style="width: 50%; max-width: 480px; height: auto;">
</p>

### 1.2、升力
&emsp;&emsp;在二维不可压缩理想流中，Kutta-Joukowski 定理给出单位展长升力 $L'=\rho_fU\Gamma$。薄板周围的环量由无穿透条件、Kutta 后缘条件和涡片诱导速度共同确定。

&emsp;&emsp;完整推导见：[Tanabe-Kaneko 模型](/notes/graphics-physics/tanabe-kaneko-model.html#thin-plate-circulation)。

### 1.3、升力矩
&emsp;&emsp;升力作用线与质心存在偏移，因此会产生把叶面法线拧向来流方向的恢复力矩：
$$
M=-\frac{1}{4}Ll\sin\phi
$$

&emsp;&emsp;将力矩除以绕质心的转动惯量，得到恢复角加速度：
$$
\dot{\omega}_M
=-\frac{3\pi\rho U^2}{l}
\cos\phi\sin\phi,
\qquad
\rho=\frac{\rho_fl}{m_p}
$$

&emsp;&emsp;当 $\phi=90^\circ$ 时，帮助叶片转平的力矩最大；当 $\phi=0^\circ$ 或 $180^\circ$ 时，恢复力矩趋近于零。

&emsp;&emsp;完整推导见：[Tanabe-Kaneko 模型](/notes/graphics-physics/tanabe-kaneko-model.html#thin-plate-moment)。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶面示意图.png" alt="叶面法线、相对来流、升力与恢复力矩的几何关系" style="width: 50%; max-width: 480px; height: auto;">
</p>

&emsp;&emsp;图中 $\mathbf{n}$ 为叶面法线，$\hat{\mathbf{v}}$ 为相对来流方向。升力位于 $\mathbf{n}$ 与 $\hat{\mathbf{v}}$ 张成的俯仰平面内，并垂直于来流，恢复力矩则绕 $\mathbf{n}\times\hat{\mathbf{v}}$ 改变攻角。

## 2、等效刚体量
&emsp;&emsp;Tanabe-Kaneko 原模型针对二维平面内运动的刚性薄板，而本项目处理的是三维空间中的 XPBD 柔性叶片。叶片会弯曲、扭转并产生局部速度差，不能直接套用固定刚体参数。实现改为在每个时间步从粒子状态提取瞬时等效刚体量，包括等效质心、整体速度、面积加权平均法线、角速度和惯量张量，再把它们作为气动姿态层的输入。

### 2.1、等效质心
&emsp;&emsp;一片叶子包含 $N$ 个质点，位置和速度分别为 $\mathbf{x}_i$、$\mathbf{v}_i$。姿态气动层不逐个计算整片叶子的升力，而是先把质点状态压缩成等效刚体量：
$$
\mathbf{x}_c=\frac{1}{N}\sum_{i=1}^{N}\mathbf{x}_i, \qquad
\mathbf{v}_c=\frac{1}{N}\sum_{i=1}^{N}\mathbf{v}_i
$$
质心用于计算力臂，平均速度用于构造相对来流。叶片内部的速度差不会被丢弃，而是通过后续的角速度反解转化为整体转动。

### 2.2、叶面法线
&emsp;&emsp;叶面姿态由所有三角面片的面积加权平均法线描述。每个三角形先通过叉乘得到面积为权重、方向为法线的向量，再统一朝向并求和归一化：
$$
\mathbf{n}=\frac{\displaystyle\sum_t A_t\mathbf{n}_t}
{\left\|\displaystyle\sum_t A_t\mathbf{n}_t\right\|}
$$
面积越大的面片对整体朝向影响越大。实现中会检查相邻面片的朝向，使叶片翻转后仍能维持一致的平均法线。

### 2.3、角速度与惯量张量
&emsp;&emsp;对每个质点构造相对质心的位置 $\mathbf{r}_i=\mathbf{x}_i-\mathbf{x}_c$ 与相对速度 $\mathbf{v}_i-\mathbf{v}_c$，先求总角动量，再由惯量张量反解角速度：
$$
\begin{aligned}
\boldsymbol{\omega}
&=\mathbf{I}^{-1}\sum_{i=1}^{N}
\mathbf{r}_i\times\left(\mathbf{v}_i-\mathbf{v}_c\right) \\
\mathbf{I}
&=\sum_{i=1}^{N}
\left(\left\|\mathbf{r}_i\right\|^2\mathbf{E}
-\mathbf{r}_i\mathbf{r}_i^{\mathsf{T}}\right)
\end{aligned}
$$
其中 $\mathbf{E}$ 为单位张量。惯量矩阵只有 $3\times3$，实现可以使用伴随矩阵法直接求逆。

```csharp
Vector3 angMom = Vector3.zero;

// 对称惯性张量 I 的六个独立分量
float ixx = 0f, iyy = 0f, izz = 0f;
float ixy = 0f, ixz = 0f, iyz = 0f;

for (int i = 0; i < X.Length; i++)
{
    // 转成相对质心坐标
    Vector3 r = X[i] - xc;
    Vector3 vLocal = V[i] - vc;

    // 角动量 L = Σ r × v_local
    angMom += Vector3.Cross(r, vLocal);

    // I = Σ(|r|² E - r rᵀ)
    // 对角线项 Ixx = Σ(y² + z²)，其余分量同理
    float r2 = r.sqrMagnitude;
    ixx += r2 - r.x * r.x;
    iyy += r2 - r.y * r.y;
    izz += r2 - r.z * r.z;

    // 非对角线项 Ixy = -Σxy，其余分量同理
    ixy -= r.x * r.y;
    ixz -= r.x * r.z;
    iyz -= r.y * r.z;
}

// 柔性叶片接近平面分布时，法向厚度贡献很小，
// 惯性张量接近奇异，直接求逆会放大数值误差。
// 因此沿三个主方向加入与平均惯量成比例的正则项。
float reg = Mathf.Max(
    1e-8f, 1e-4f * (ixx + iyy + izz) / 3f);

// 求解正则化后的对称线性系统：
// (I + reg·E) ω = L
return SolveSymmetric(
    ixx + reg, ixy, ixz,
    iyy + reg, iyz,
    izz + reg, angMom);
```

## 3、姿态气动分量
### 3.1、相对来流
&emsp;&emsp;设叶片质心附近的近场气流为 $\mathbf{u}$，气流影响权重为 $w\in[0,1]$，则相对来流、速度和方向分别为：
$$
\begin{aligned}
\mathbf{v}_{rel}&=\mathbf{v}_c-w\mathbf{u} \\
V&=\left\|\mathbf{v}_{rel}\right\| \\
\hat{\mathbf{v}}&=\frac{\mathbf{v}_{rel}}{V}
\end{aligned}
$$
叶面法线与来流夹角满足：
$$
\cos\phi=\mathbf{n}\cdot\hat{\mathbf{v}}
$$

### 3.2、升力、恢复、阻尼与尾流自激
&emsp;&emsp;项目在原模型基础上把姿态气动拆成四个矢量分量：
$$
\begin{aligned}
\mathbf{a}_L
&=2c_LV^2\cos\phi
\left(\mathbf{n}-\cos\phi\,\hat{\mathbf{v}}\right) \\
\dot{\boldsymbol{\omega}}_M
&=2c_RV^2\cos\phi
\left(\mathbf{n}\times\hat{\mathbf{v}}\right) \\
\dot{\boldsymbol{\omega}}_d
&=-c_d\boldsymbol{\omega} \\
\dot{\boldsymbol{\omega}}_f
&=c_wV\left(\boldsymbol{\omega}\cdot\hat{\mathbf{a}}\right)
\left[1-\left(\frac{\boldsymbol{\omega}\cdot\hat{\mathbf{a}}}{\omega_s}\right)^2\right]\hat{\mathbf{a}}
\end{aligned}
$$
其中：
$$
\hat{\mathbf{a}}
=\frac{\mathbf{n}\times\hat{\mathbf{v}}}
{\left\|\mathbf{n}\times\hat{\mathbf{v}}\right\|}
$$
为改变攻角的单位转轴。$c_L$、$c_R$、$c_d$、$c_w$ 吸收了原模型中的密度、尺度、质量与调参系数。

&emsp;&emsp;升力 $\mathbf{a}_L$ 位于叶面法线与来流张成的平面内，负责托举叶片并产生横向位移。恢复角加速度 $\dot{\boldsymbol{\omega}}_M$ 把叶面法线拧向或背向来流，是“转平”的来源。角阻尼 $\dot{\boldsymbol{\omega}}_d$ 吸收残余旋转。尾流自激 $\dot{\boldsymbol{\omega}}_f$ 则是一个带饱和的负阻尼项：转速较低时向同一方向补充能量，接近上限 $\omega_s$ 时自动衰减，因此能够形成有稳定振幅的极限环。

```csharp
// LeafFallAero.Step
float cc = Vector3.Dot(normal, vhat);          // cos φ
Vector3 perp = normal - vhat * cc;             // 垂直于来流的分量
Vector3 axis = Vector3.Cross(normal, vhat);    // 恢复力矩转轴
float speedSq = speed * speed;

// 升力：保留叶片的不同下落姿态带来的方向差异
Vector3 aLift =
    (2f * cc * p.liftAccel * speedSq) * perp;

// 恢复力矩与角阻尼
Vector3 omegaDot =
    (2f * cc * p.restoreAccel * speedSq) * axis;
omegaDot += -p.angularDamping * omega;

// 尾流自激：转速越高推力越大，但接近上限时饱和
float axisMag = axis.magnitude;
if (p.flutterGain > 0f &&
    p.flutterOmega > 0f &&
    axisMag > 1e-3f)
{
    Vector3 rockAxis = axis / axisMag;
    float rockRate = Vector3.Dot(omega, rockAxis);
    float ratio = rockRate / p.flutterOmega;
    float saturation = Mathf.Max(0f, 1f - ratio * ratio);

    omegaDot += rockAxis
        * (p.flutterGain * speed * rockRate * saturation);
}
```

### 3.3、侧向摆动扩展
&emsp;&emsp;原始 Tanabe-Kaneko 模型只有竖直平面内的翻转自由度，没有描述纸片一边下落、一边向左右漂移的运动。为此，项目为每片叶子分配一根固定的水平轴 $\hat{\mathbf{s}}$ 和一个缓慢演化的初相位 $\psi$，先定义目标横向速度，再用固定跟踪速率把它转换为横向加速度：
$$
v_{target}=c_sV\sin\psi
$$
$$
\mathbf{a}_{sw}
=k_s\left(v_{target}-\mathbf{v}_c\cdot\hat{\mathbf{s}}\right)
\hat{\mathbf{s}}, \qquad k_s=12\ \mathrm{s^{-1}}
$$
这里没有直接沿某个瞬时方向施力，而是追踪沿固定轴的目标速度。若力始终垂直于来流，它不会改变速度大小，只会在每帧重新扭转方向。若摆动轴跟随来流旋转，叶片获得横向速度后又会立刻改变推力方向，形成额外阻尼。固定轴与目标速度的组合能让侧向摆动在叶片持续下落时保持稳定。

```csharp
// LeafFallAero.Step：侧向摆动分支
Vector3 swayAxis = p.sideSwayAxis;
float vTarget = p.sideSwayGain
    * speed * Mathf.Sin(p.sideSwayPhase);
float vSide = Vector3.Dot(vc, swayAxis);

// 12 s^-1 的软约束跟踪，而不是直接设置速度
Vector3 aSway = swayAxis
    * (12f * (vTarget - vSide));
```

## 4、逐质点写回
&emsp;&emsp;姿态气动层只产生一个平动加速度和一组角加速度。二者需要写回叶片的每个质点：平动项对全部质点相同，转动项则按质点到质心的位置产生线速度增量：
$$
\Delta\mathbf{v}_i
=\left(\mathbf{a}_L+\mathbf{a}_{sw}\right)\Delta t
+\left[
\left(
\dot{\boldsymbol{\omega}}_M
+\dot{\boldsymbol{\omega}}_d
+\dot{\boldsymbol{\omega}}_f
\right)\Delta t
\right]\times\mathbf{r}_i
$$
这样，叶片一侧获得向下的速度，另一侧获得向上的速度，整片叶子开始翻转。随后 XPBD 的位置预测会把速度积分成新位置，距离约束与二面角约束再把柔性薄壳拉回可接受的形变范围。

```csharp
// LeafFallAero.ApplyVelocityDeltas
Vector3 dTrans =
    (aLift + aSway) * dt;
Vector3 dSpin =
    omegaDot * dt;

for (int i = 0; i < X.Length; i++)
{
    Vector3 r = X[i] - xc;
    Vector3 dv = dTrans + Vector3.Cross(dSpin, r);

    // 限制单帧速度增量，避免低帧率下数值突变
    if (cap > 0f)
        dv = Vector3.ClampMagnitude(dv, cap);

    V[i] += dv;
}
```

## 5、三种落叶行为
&emsp;&emsp;恢复力矩、角阻尼和尾流自激的强弱配比，决定叶片最终收敛到哪一种运动。

### 5.1、恢复转平
&emsp;&emsp;当尾流自激上限较低、角阻尼较强时，姿态方程主要由恢复力矩与阻尼决定。叶面法线逐渐转向来流方向，$\phi$ 收敛到 $0^\circ$ 或 $180^\circ$，残余转动随之衰减。此时升力也因 $\cos\phi\sin\phi\to0$ 而减小，叶片主要依靠自身阻力与重力平衡，缓慢垂直下落。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片转平演示.gif" alt="恢复转平模式下叶面逐渐对齐来流并垂直下落" style="width: 50%; max-width: 480px; height: auto;">
</p>

### 5.2、持续翻滚
&emsp;&emsp;继续提高尾流自激上限，叶面摆幅可以越过 $90^\circ$。越过垂直位置后，恢复力矩的方向发生改变，转而把叶面继续推向另一侧，于是叶片每摆一次就翻过一面，形成连续翻转。该模式对应原论文中的周期旋转与混沌旋转分支。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片翻滚演示.gif" alt="持续翻滚模式下叶片连续翻面下落" style="width: 50%; max-width: 480px; height: auto;">
</p>

### 5.3、左右摇摆
&emsp;&emsp;当自激增益与角阻尼处于同一量级，尾流自激会在摆幅较小时持续补充能量，在摆幅接近上限时自动减弱。二者与恢复力矩共同形成类似范德波尔振子的极限环，叶片因此保持近似等幅摆动。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片摇摆演示.gif" alt="左右摇摆模式下叶片呈之字形下落" style="width: 50%; max-width: 480px; height: auto;">
</p>

## 6、叶片-骨骼耦合
&emsp;&emsp;Tanabe-Kaneko 模型描述静空气中的自由下落，但现实世界挥剑时，武器会推动周围空气，使附近叶片被卷起或拨开。为了模拟落叶与骨骼动画的真实交互，在 Tanabe-Kaneko 模型的基础上为角色添加近场气动源，绑定单根骨骼的球形源负责脚、尾巴等局部位移，沿骨骼到武器末端的胶囊源负责挥砍产生的大范围刀风。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片-骨骼耦合.gif" alt="角色挥剑时骨骼气动源卷起并拨开周围叶片" style="width: 100%; max-width: 720px; height: auto;">
</p>

### 6.1、扰动源
&emsp;&emsp;两类源都统一表示为带半径的线段，线段两端为 $\mathbf{A}$、$\mathbf{B}$，速度分别为 $\mathbf{v}_A$、$\mathbf{v}_B$。球形源可以看作 $\mathbf{A}\approx\mathbf{B}$ 的退化段源，胶囊源保留完整端点，使靠近武器末端的叶片获得更大的线速度。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/骨骼气动扰动源示意图.png" alt="胶囊形气动扰动源的端点、半径、投影位置、距离与速度插值关系" style="width: 100%; max-width: 900px; height: auto;">
</p>

&emsp;&emsp;骨骼端点速度不直接读取动画属性，而是用相邻两帧位置差分得到。设叶片质点位置为 $\mathbf{x}$，其在线段上的投影参数为：
$$
t=\operatorname{clamp}\left(
\frac{\left(\mathbf{x}-\mathbf{A}\right)\cdot\left(\mathbf{B}-\mathbf{A}\right)}
{\left\|\mathbf{B}-\mathbf{A}\right\|^2},0,1
\right)
$$
源上对应位置与速度为：
$$
\mathbf{x}_s=\mathbf{A}+t\left(\mathbf{B}-\mathbf{A}\right),\qquad
\mathbf{v}_s=\operatorname{Lerp}\left(\mathbf{v}_A,\mathbf{v}_B,t\right)
$$

```csharp
float3 ab = so.segB - so.segA;
float len2 = math.lengthsq(ab);

// 将叶片质点投影到胶囊轴线上
float t = len2 > 1e-9f
    ? math.saturate(math.dot(pos - so.segA, ab) / len2)
    : 0f;

// 轴线上最近的源位置，以及按 t 插值得到的速度
float3 xs = so.segA + ab * t;
float3 vs = math.lerp(so.velA, so.velB, t);
```

### 6.2、权重
&emsp;&emsp;设源的影响半径为 $R$，质点到源线段的距离为 $d=\|\mathbf{x}-\mathbf{x}_s\|$，几何衰减使用二次核：
$$
f=\max\left(0,1-\frac{d}{R}\right)
$$
其中 $f\in[0,1]$ 表示顶点与源的距离接近程度：位于源轴线上时 $f=1$，到达影响半径时 $f=0$。平方后得到 $f^2$，它使权重更集中在源附近，并平滑衰减到影响边界。

&emsp;&emsp;源几乎静止时不应持续推动叶片，因此再定义运动激活因子：
$$
a_s=\operatorname{clamp}\left(
\frac{\left\|\mathbf{v}_s\right\|-v_{min}}{\Delta v},0,1
\right)
$$
其中 $v_{min}$ 为速度阈值，$\Delta v$ 为淡入宽度。源速低于 $v_{min}$ 时 $a_s=0$，越过阈值后在 $\Delta v$ 范围内平滑升到 $1$。最终混合权重为：
$$
w_s=f^2g(t)a_s\rho_s
$$
其中 $g(t)$ 是沿源线段的强度曲线，用于控制刀根到刀尖的变化，例如让刀尖产生更强的气流，$\rho_s$ 是该源的人工影响权重。运动激活因子 $a_s$ 会过滤尾巴、耳朵和衣服在待机时产生的毫米级抖动。

```csharp
float d = math.length(pos - xs);
float f = math.max(0f, 1f - d / so.radius);
float fSquared = f * f;

float sourceSpeed = math.length(vs);
// p.speedFade 淡入宽度 Δv
float motionActivation = p.minSourceSpeed > 0f
    ? math.saturate((sourceSpeed - p.minSourceSpeed) / p.speedFade)
    : 1f;

float curve = SampleCurveLut(curveLut, so.curveOffset, CurveLutSamples, t);
float weight = fSquared * curve * motionActivation * so.sourceWeight;
```

### 6.3、多源合成
&emsp;&emsp;多个源同时作用于同一质点时，使用同一组权重合成气流速度与受力倍率：
$$
\mathbf{u}=
\frac{\sum_s w_s\mathbf{v}_s}
{\max\left(1,\sum_s w_s\right)},\qquad
\sigma=
\frac{\sum_s w_s\sigma_s}
{\max\left(1,\sum_s w_s\right)}
$$
其中 $\mathbf{u}$ 为合成后的近场气流速度，$\sigma$ 为该点的受力倍率，$\sigma_s$ 为单个源设置的强度。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/骨骼气动扰动源范围.png" alt="角色骨骼与武器周围多个球形和胶囊气动源的重叠影响范围" style="width: 50%; max-width: 480px; height: auto;">
</p>

&emsp;&emsp;图中各色线框表示同一挥剑时刻多个球形源与胶囊源的影响体积。叶片质点落入一个或多个源的并集时，程序分别计算逐源权重，再合成为统一的气流速度与受力倍率，影响范围交叠处由共享权重平滑过渡。

```csharp
float3 weightedVelocity = float3.zero;
float weightSum = 0f;
float forceWeightSum = 0f;

for (int s = 0; s < srcCount; s++)
{
    Source so = src[s];
    ...
    weightedVelocity += vs * weight;
    weightSum += weight;
    forceWeightSum += weight * so.strength;
}

float3 airVelocity = weightedVelocity / math.max(1f, weightSum);
float forceScale = math.saturate(forceWeightSum / math.max(1f, weightSum));
```

### 6.4、写回叶片速度
&emsp;&emsp;近场气流先与叶片自身二次阻力组合。对每个质点计算相对速度 $\mathbf{v}_i-\mathbf{u}$，再把阻力增量乘以合成受力倍率 $\sigma$：
$$
\Delta\mathbf{v}_i
=\sigma\,\Delta\mathbf{v}_{drag}\left(\mathbf{v}_i-\mathbf{u},\mathbf{n}_i\right)
$$
这样，远离骨骼的叶片只受普通风场和自身阻力控制，进入刀风范围后，叶片获得方向、大小和空间范围都随动作变化的局部推力。

```csharp
// 用相对速度计算二次阻力，再由多源受力倍率缩放
float3 vRel = vi - airVelocity;
float3 dragDelta = AeroMathUtility.DragDelta(vRel, nrm, dragGain, tangGain, dt);
vOut[i] = vi + dragDelta * forceScale;
```

## 7、延伸阅读
- 作品：[Unity 实时柔性体与粒子流体系统](/projects/xpbd-pbf-physics/)
- 文章：[基于 Perlin 噪声的实时风场模拟](/articles/graphics/perlin-real-time-wind/)
- 笔记：[Tanabe-Kaneko 模型](/notes/graphics-physics/tanabe-kaneko-model.html)、[空气动力学的一些基础定理](/notes/graphics-physics/aerodynamics-basics.html)
