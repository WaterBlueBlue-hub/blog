---
title: "Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟"
outline: [2, 3]
---

# Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟
## 基于 XPBD 与 PBF 的物理模拟
&emsp;&emsp;这是一个以 XPBD 约束求解为核心的 Unity 实时物理模拟项目。项目实现了一套可复用的位置约束求解框架，并在此基础上完成了布料、骨骼链、落片和 PBF 流体的实时模拟。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/流体双视图演示.gif" alt="角色交互效果，以及叶片碰撞体、约束与流体粒子的物理调试视图" style="width: 100%; max-width: 900px; height: auto;">
</p>

## 作品概览
| 作品 | 内容 |
| --- | --- |
| 开发环境 | Unity 2022.3.62f3c1、URP 14.0.12 |
| 核心算法 | XPBD、PBF、Tanabe-Kaneko 气动模型、高度场水面几何重建、基础水体着色与折射焦散 |
| 工程能力 | C#、Burst、Unity Job System、HLSL、编辑器工具 |
| 输出形式 | 可运行 Unity 工程、演示视频、技术报告 |

## 演示视频
<ResponsiveVideo
  desktop-src="/xpbd-pbf-physics/media/项目完整演示.mp4"
  mobile-src="/xpbd-pbf-physics/media/项目完整演示-mobile.mp4"
  poster="/xpbd-pbf-physics/media/片头封面.webp"
  label="Unity 实时柔性体与粒子流体系统完整演示"
/>

## 求解架构
&emsp;&emsp;XPBD 主求解器以 `XPBD_Solver.LateUpdate` 作为唯一入口，每帧依次完成旧位置记录、动画混合与风场施加、位置预测、约束投影、碰撞修正、速度回推和渲染同步。约束按距离、系链、弯曲、姿态、扭转和体积分组，组间串行、组内并行，以在保持 Gauss-Seidel 式收敛特性的同时获得有限的并行度。

![Unity 实时柔性体与粒子流体系统的求解架构](/xpbd-pbf-physics/media/求解架构.webp)

&emsp;&emsp;布料、骨骼与叶片共享主求解框架，但针对数据规模和更新方式采用不同的后端。叶片进入 Burst/Job 批处理路径，骨骼和布料保留更灵活的托管约束实现；流体使用独立的 PBF 粒子管线，不强行并入 XPBD Body 列表。

## XPBD 求解流程
&emsp;&emsp;XPBD 主循环只保留决定位置演化的核心步骤，帧步长夹取、性能计时和局部缓存不计入伪代码。主流程如下：

&emsp;&emsp;(1) XPBD_FRAME() // XPBD 主物理步入口  
&emsp;&emsp;(2) &emsp;&emsp;refreshAirFields `(\Delta t)`; solveLeafAero `(\Delta t)` // 在预测前统一更新风场与叶片气动力  
&emsp;&emsp;(3) &emsp;&emsp;**for each** active body `B` **do** // 逐解算体执行预测阶段  
&emsp;&emsp;(4) &emsp;&emsp;&emsp;&emsp; `\mathbf{x}_{\mathrm{old}}[B] \leftarrow \mathbf{x}[B]`; resetConstraintMultipliers `(B)` // 保存帧初位置并清零 XPBD 乘子  
&emsp;&emsp;(5) &emsp;&emsp;&emsp;&emsp;applyAnimationBlend `(B)`; applyExternalForces `(B, \Delta t)` // 混合角色动画并施加风场与空气阻力  
&emsp;&emsp;(6) &emsp;&emsp;&emsp;&emsp; `\mathbf{v}[B] \leftarrow (\mathbf{v}[B]+\Delta t\mathbf{g})d` // 半隐式欧拉更新速度并施加阻尼  
&emsp;&emsp;(7) &emsp;&emsp;&emsp;&emsp; `\mathbf{x}[B] \leftarrow \mathbf{x}[B]+\Delta t\mathbf{v}[B]` // 使用更新后的速度预测位置  
&emsp;&emsp;(8) &emsp;&emsp;&emsp;&emsp;fixEndpoints `(B)` // 将固定点重新贴合到动画锚点  
&emsp;&emsp;(9) &emsp;&emsp;**for each** collidable body `B` **do** // 逐碰撞体执行位置预稳定化  
&emsp;&emsp;(10) &emsp;&emsp;&emsp;&emsp;**for** `s \leftarrow 0` **to** stabilizationIterations `-1` **do** // 迭代消除初始穿插  
&emsp;&emsp;(11) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;preStabilizeCollisions `(B)`; applyStabilization `(B)` // 累加并应用碰撞修正  
&emsp;&emsp;(12) &emsp;&emsp;solveLeafConstraintsWithJobs `(\Delta t)` // 将叶片约束整批提交给 Burst/Job 后端  
&emsp;&emsp;(13) &emsp;&emsp;**for each** active body `B` **do** // 逐体执行约束投影与碰撞响应  
&emsp;&emsp;(14) &emsp;&emsp;&emsp;&emsp;**if** `B` is leaf **then** resolveCollisions `(B)`; **continue** // 叶片约束已在 Job 中完成，只补碰撞  
&emsp;&emsp;(15) &emsp;&emsp;&emsp;&emsp;**if** collisionBeforeConstraints `(B)` **then** resolveCollisions `(B)`; solveConstraints `(B, \Delta t)` // 先碰撞后约束  
&emsp;&emsp;(16) &emsp;&emsp;&emsp;&emsp;**else** solveConstraints `(B, \Delta t)`; resolveCollisions `(B)` // 先约束后碰撞  
&emsp;&emsp;(17) &emsp;&emsp;**if** selfCollisionEnabled **then** resolveSelfCollision `()`; applySelfCollisionBack `()` // 在场景碰撞后统一修正并写回布料自穿插  
&emsp;&emsp;(18) &emsp;&emsp;**for each** active body `B` **do** // 逐体完成速度回推与表现同步  
&emsp;&emsp;(19) &emsp;&emsp;&emsp;&emsp; `\mathbf{v}[B] \leftarrow (\mathbf{x}[B]-\mathbf{x}_{\mathrm{old}}[B])/\Delta t` // 由位置变化反推最终速度  
&emsp;&emsp;(20) &emsp;&emsp;&emsp;&emsp;clampVelocity `(B)`; applyContactFriction `(B, \Delta t)`; syncVisuals `(B)` // 限速、摩擦并同步渲染  

&emsp;&emsp;XPBD 约束按组依次投影。同一组先使用相同位置快照累加雅可比修正，再统一以 SOR 松弛写回顶点：

&emsp;&emsp;(1) SOLVE_CONSTRAINTS `(B, \Delta t)` // 单解算体 XPBD 约束入口  
&emsp;&emsp;(2) &emsp;&emsp; `\mathbf{w}_{\mathrm{eff}} \leftarrow \mathbf{w}\odot f(\mathbf{friction})` // 根据摩擦计算有效逆质量  
&emsp;&emsp;(3) &emsp;&emsp;**for** `k \leftarrow 0` **to** solverIterations `-1` **do** // 固定次数迭代约束流形  
&emsp;&emsp;(4) &emsp;&emsp;&emsp;&emsp;**for each** constraint group `G` of `B` **do** // 约束组之间按求解顺序串行执行  
&emsp;&emsp;(5) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;clear `(\Delta\mathbf{x}[B], \mathbf{c}[B])` // 清空当前组的修正累加量与计数  
&emsp;&emsp;(6) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**for each** constraint `C \in G` **do** accumulateJacobian `(C,\Delta\mathbf{x}[B],\mathbf{c}[B])` // 求解乘子增量并累加顶点修正  
&emsp;&emsp;(7) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**for each** dynamic particle `i` **do** `\mathbf{x}_i \leftarrow \mathbf{x}_i+\omega_{\mathrm{SOR}}\Delta\mathbf{x}_i/c_i` // 按平均修正量和 SOR 松弛写回位置  

## 风场
&emsp;&emsp;风场用于在位置预测前提供统一的外部气动力。系统以基准风向与风速为主干，叠加 Perlin 湍流、周期性阵风和包围盒软衰减，让气流在空间与时间上保持连续变化。

![风场作用下的布料、布气球与骨骼链驱动布料](/xpbd-pbf-physics/media/风场布料演示.gif)

&emsp;&emsp;风场模型的实现细节见：[基于 Perlin 噪声的实时风场模拟](/articles/graphics/perlin-real-time-wind/)

## 网格布料

&emsp;&emsp;网格布料部分实现了距离、系链、二面角弯曲、折叠方向与体积等约束。距离约束负责基础拉伸，系链限制最大伸长，弯曲和二面角约束控制褶皱与柔软度，单向折叠约束则用于建立可预期的人工折痕。

&emsp;&emsp;窗帘进一步展示了网格驱动布料的各向异性控制。经向和纬向的弯曲柔度被分别写入一张与布料拓扑对应的权重图，权重较大的纵向列几乎没有抗弯能力，布料在重力和单向折叠约束下形成稳定褶皱，而另一个方向仍保留默认刚度。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/网格窗帘演示.gif" alt="网格驱动窗帘在重力与单向折叠约束下的动态形变" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;网格布料的实现细节见：[基于 XPBD 的网格布料仿真](/articles/graphics/xpbd-cloth/)

## 落叶模拟

&emsp;&emsp;从左到右依次为恢复转平、持续翻滚和左右摇摆三种下落姿态。气动力矩与阻尼强度的不同配比，使同一叶片约束网络表现出不同的运动模式。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片三模式对照_方形.gif" alt="叶片恢复转平、持续翻滚和左右摇摆三种运动模式" style="width: 100%; max-width: 900px; height: auto;">
</p>

&emsp;&emsp;叶片使用轻量网格拓扑与 XPBD 约束描述弯曲和形变，外部气动力根据 Tanabe-Kaneko 模型计算。与简单给每片叶子加随机旋转不同，叶片的翻面、摇摆、横滚和侧移来自姿态、相对来流与气动力矩之间的耦合，因此能够形成更接近纸片或树叶自由下落的运动层次。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/叶片-骨骼耦合.gif" alt="角色挥剑时骨骼与武器产生的近场气流卷起和拨开周围叶片" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;角色挥剑时，绑定在骨骼与武器上的球形和胶囊气动源会随动作产生近场气流。叶片进入影响范围后，按距离衰减获得局部风速和受力倍率，因此会被刀风卷起、翻转或被刀身拨开。

&emsp;&emsp;落叶模拟的实现细节见：[基于 Tanabe-Kaneko 模型的落叶模拟](/articles/graphics/tanabe-kaneko-leaf-fall/)

## 骨骼飘带

&emsp;&emsp;角色在头发、袖子、裙摆、裙带和胸部周围布置了 9 条 XPBD 骨骼链。链上的粒子由距离与三点弯曲约束维持基本形状，系链约束限制最大拉伸，扭转安全角避免局部翻转，姿态维持约束则按骨骼深度衰减地拉回美术设计姿态。

<table>
  <tr>
    <td style="width: 50%; padding-right: 6px;">
      <img loading="lazy" src="/xpbd-pbf-physics/media/骨骼链动作演示_4x3.gif" alt="角色运动时的柔性骨骼链动作展示" style="width: 100%; height: auto;" />
    </td>
    <td style="width: 50%; padding-left: 6px;">
      <img loading="lazy" src="/xpbd-pbf-physics/media/骨骼链动作演示2_4x3.gif" alt="角色运动时的柔性骨骼链动作展示" style="width: 100%; height: auto;" />
    </td>
  </tr>
</table>

&emsp;&emsp;骨骼链约束的实现细节见：[基于 XPBD 的柔性骨骼仿真](/articles/graphics/xpbd-rig/)

## 蒙皮
&emsp;&emsp;角色服饰网格通过 LBS 跟随骨骼动画。若裙摆顶点只保留原始服饰骨骼权重，角色迈步时容易穿过腿部。项目提供离线蒙皮工具，为裙摆补充左右大腿与膝部骨骼影响，使其随腿部运动以减少穿模；该工具只修改蒙皮权重，不接入 XPBD 碰撞求解。

<table>
  <tr>
    <td style="width: 50%; padding-right: 6px;">
      <img loading="lazy" src="/xpbd-pbf-physics/media/蒙皮走路演示.gif" alt="角色行走时身体、裙摆与柔性骨骼链的蒙皮结果" style="width: 100%; height: auto;">
    </td>
    <td style="width: 50%; padding-left: 6px;">
      <img loading="lazy" src="/xpbd-pbf-physics/media/裙摆蒙皮工具演示.webp" alt="裙摆顶点与大腿骨骼的权重绑定和穿模诊断过程" style="width: 100%; height: auto;">
    </td>
  </tr>
</table>

&emsp;&emsp;蒙皮工具的实现细节见：[基于 LBS 的裙摆防穿模工具](/articles/graphics/lbs-skirt-clipping-tool/)。

## 碰撞
&emsp;&emsp;碰撞位于 XPBD 位置预测与最终网格表现之间。系统先通过对象级 AABB 排除不可能接触的碰撞体，再对球体、胶囊体和立方体执行解析 SDF 投影。高速质点继续进入 CCD，在旧位置到当前位置的时间区间内寻找最早命中点。碰撞修正和约束投影共同更新位置，之后才执行速度回推与渲染同步。

<table>
  <tr>
    <td style="width: 50%; padding-right: 6px; vertical-align: middle;">
      <img loading="lazy" src="/xpbd-pbf-physics/media/胶囊体碰撞.png" alt="网格布料与胶囊碰撞体的解析碰撞结果" style="display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: contain;">
    </td>
    <td style="width: 50%; padding-left: 6px; vertical-align: middle;">
      <img loading="lazy" src="/xpbd-pbf-physics/media/碰撞体绑定.png" alt="角色骨骼上的球体和胶囊碰撞代理" style="display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: contain;">
    </td>
  </tr>
</table>

&emsp;&emsp;碰撞的实现细节见：[实时柔性体的碰撞检测与响应](/articles/graphics/xpbd-collision/)。

## PBF 求解流程
&emsp;&emsp;PBF 流体由独立后端推进，不进入 XPBD 主求解器。核心流程只保留粒子求解、表面数据和渲染之间的主链路：

&emsp;&emsp;(1) FLUID_FRAME `(\Delta t)` // 单个流体的完整帧入口  
&emsp;&emsp;(2) &emsp;&emsp;**if** simulate **then** applyVoidFill `(\Delta t)`; solvePBF `(\Delta t)` // 先补空洞，再推进 PBF 子步  
&emsp;&emsp;(3) &emsp;&emsp;updateHeightField `()`; updateVelocityField `()` // 由最新粒子位置更新高度场与速度场  
&emsp;&emsp;(4) &emsp;&emsp;**if** waveFieldEnabled **then** injectImpactWaves `(\Delta t)`; waveField.step `(\Delta t)` // 注入冲击并推进浅水波场  
&emsp;&emsp;(5) &emsp;&emsp;renderSurface `()` // 提交高度场主体水面及其基础着色  

&emsp;&emsp;PBF 每个子步依次完成位置预测、邻域重建、密度约束和边界投影：

&emsp;&emsp;(1) SOLVE_PBF `(B, \Delta t)` // 单个流体的 PBF 求解入口  
&emsp;&emsp;(2) &emsp;&emsp;copyParticlesToNative `(B)`; refreshColliderGeometry `(B)` // 同步原生粒子数据并更新碰撞几何  
&emsp;&emsp;(3) &emsp;&emsp;init `(h,s_p,\Delta\mathbf{x}_{\max},n_s,\Delta t_s)` // 初始化核半径、间距、位移上限和子步长  
&emsp;&emsp;(4) &emsp;&emsp;**for** `s \leftarrow 0` **to** `n_s-1` **do** // 遍历所有 PBF 子步  
&emsp;&emsp;(5) &emsp;&emsp;&emsp;&emsp;predictVelocitiesAndPositions `(\Delta t_s)` // 施加重力、阻尼并预测粒子位置  
&emsp;&emsp;(6) &emsp;&emsp;&emsp;&emsp;buildCellHash `(h)`; buildNeighbors `(h)` // 在预测位置上重建空间哈希与邻域  
&emsp;&emsp;(7) &emsp;&emsp;&emsp;&emsp;**for** `k \leftarrow 0` **to** solverIterations `-1` **do** // 迭代求解密度约束  
&emsp;&emsp;(8) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp; `\rho_i \leftarrow \sum_j mW_{\mathrm{Poly6}}(\|\mathbf{x}_i-\mathbf{x}_j\|,h)` // 使用 Poly6 核估计局部密度  
&emsp;&emsp;(9) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp; `C_i \leftarrow \rho_i/\rho_0-1`; solveLambda `(C_i)` // 计算密度误差和拉格朗日乘子  
&emsp;&emsp;(10) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp;**if** repelOnlyLambda **then** `\lambda_i \leftarrow \min(0,\lambda_i)` // 池水只保留排斥项  
&emsp;&emsp;(11) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp; `\Delta\mathbf{p}_i \leftarrow \frac{1}{\rho_0}\sum_j(\lambda_i+\lambda_j+s_{ij})\nabla W_{\mathrm{Spiky}}` // 沿 Spiky 梯度合成位置修正  
&emsp;&emsp;(12) &emsp;&emsp;&emsp;&emsp;&emsp;&emsp; `\mathbf{x}_i \leftarrow \mathbf{x}_i+\mathrm{clamp}(\omega_{\mathrm{PBF}}\Delta\mathbf{p}_i,\Delta\mathbf{x}_{\max})` // 欠松弛并限制单轮最大位移  
&emsp;&emsp;(13) &emsp;&emsp;&emsp;&emsp;clampPoolBounds `()`; projectOutOfColliders `()` // 执行池壁和场景刚体碰撞  
&emsp;&emsp;(14) &emsp;&emsp;&emsp;&emsp; `\mathbf{v}_i \leftarrow \mathrm{safeVelocity}(\mathbf{x}_i,\mathbf{x}_{\mathrm{old},i},\Delta t_s)` // 反推速度，剔除非有限值并限制最大速度  
&emsp;&emsp;(15) &emsp;&emsp;&emsp;&emsp; `\mathbf{v}_i \leftarrow \mathrm{XSPH}(\mathbf{v}_i)` // 使用邻域速度平滑抑制粒子噪声  
&emsp;&emsp;(16) &emsp;&emsp;copyParticlesToManaged `(B)` // 把最终粒子状态写回托管数组  

&emsp;&emsp;单边密度约束只允许 `lambda <= 0`，用于抵抗粒子压缩而关闭自由表面处的吸引力。池水因此不会把稀疏表面向内聚拢，但刚体压出的局部空间也无法自行回流，所以 `applyVoidFill` 在 PBF 前补充一次低尺度回填速度。每一子步都由位置变化重新计算速度，而不是复用帧初速度，避免后续子步重复累计同一段位移；速度反推同时剔除非有限值并限制在安全上限内。初始化阶段还会执行若干轮静态密度、池壁和碰撞投影，再清零速度，避免首帧重叠修正被误解释为速度。

## 流体粒子模拟
&emsp;&emsp;流体粒子使用 PBF 方法求解。每个物理步拆成多个子步，通过空间哈希构建邻域，以 Poly6 核估计密度、Spiky 核计算梯度，并迭代修正密度约束下的粒子位置。池壁、角色、武器和场景刚体共同参与粒子碰撞，速度由位置变化反推，最后使用 XSPH 粘度平滑速度场。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/流体粒子模拟.webp" alt="角色运动时 PBF 粒子水池的表面形态与局部空洞变化" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;流体粒子模拟见：[PBF 粒子流体模拟](/articles/graphics/pbf-particle-fluid/)。

## 浅水波场模拟
&emsp;&emsp;浅水波场在水池内腔的二维网格上求解波动方程，补充 PBF 粒子难以稳定表达的大尺度传播涟漪。高度场输出高度与斜率，物理侧用于入水判定、浮力和顺坡漂移，渲染侧分别用于顶点高度位移和逐像素法线重建。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/波场.gif" alt="浅水波场驱动水面叶片漂移与聚散" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;波动方程离散见：[基于二维波动方程的浅水波场](/articles/graphics/shallow-water-wave-field/)。

## 水面几何重建
&emsp;&emsp;浅水池的主体连续水面由 `HeightFieldOnly` 路线生成一张覆盖池面内腔的规则四边形网格。网格只在池尺寸或波场分辨率变化时重建，XZ 坐标保持固定，顶点着色器按波场 R 通道抬升世界空间高度，片元着色器再根据 G/B 通道重建逐像素法线。涟漪因此会真实改变水面轮廓、遮挡和视差，而不只表现为贴在平面上的颜色纹理。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/水面几何重建.gif" alt="顶点高度位移贴图生成的连续浅水水面与挥剑扰动" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;规则网格、R 通道位移和 G/B 法线重建见：[基于顶点高度位移贴图的浅水水面几何重建](/articles/graphics/water-heightfield-geometry/)。

## 基础水体着色
&emsp;&emsp;`FluidWaterSurface` 负责水面材质的基础着色。它根据菲涅尔项混合环境反射与折射后的水下颜色，使用连续 GGX 和太阳色散高光表现波峰亮斑，再通过场景颜色偏移模拟屏幕空间折射。不透明场景深度与水面深度之差用于估计视线穿水厚度，并据此执行 Beer-Lambert 吸收和散射颜色混合。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/基础水体着色_项目折射.webp" alt="项目水面涟漪使池底棋盘格和池壁条纹发生连续折射偏移" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;菲涅尔、环境反射、GGX 高光、屏幕空间折射和吸收的数学形式见：[基础水体着色](/articles/graphics/water-shading/)。

## 焦散
&emsp;&emsp;`FluidCausticsRenderer` 根据水面折射后的池底落点面积压缩率生成 RGB 色散焦散。压缩表示光线汇聚，拉伸表示光线发散；红、绿、蓝通道使用略有差异的折射率，因此焦散形状会直接跟随同一张波场与真实光路。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/焦散.gif" alt="项目浅水池中随涟漪移动的折射焦散" style="width: 100%; max-width: 720px; height: auto;">
</p>

&emsp;&emsp;池底反求、面积雅可比和 RGB 色散见：[焦散](/articles/graphics/water-caustics/)。

## 延伸阅读
- 笔记：[Tanabe-Kaneko 模型](/notes/graphics-physics/tanabe-kaneko-model.html)、[线性混合蒙皮（LBS）](/notes/graphics-animation/lbs.html)、[空气动力学的一些基础定理](/notes/graphics-physics/aerodynamics-basics.html)

## 参考文献
1. Baraff, D., & Witkin, A. Large Steps in Cloth Simulation. *Proceedings of the 25th Annual Conference on Computer Graphics and Interactive Techniques*, 1998: 43–54.
2. Müller, M., Heidelberger, B., Hennix, M., & Ratcliff, J. Position Based Dynamics. *Journal of Visual Communication and Image Representation*, 2007, 18(2): 109–118.
3. Macklin, M., Müller, M., & Chentanez, N. XPBD: Position-Based Simulation of Compliant Constrained Dynamics. *Proceedings of the 9th International Conference on Motion in Games*, 2016: 49–54.
4. Provot, X. Deformation Constraints in a Mass-Spring Model to Describe Rigid Cloth Behavior. *Proceedings of Graphics Interface '95*, 1995: 147–154.
5. Grinspun, E., Hirani, A. N., Desbrun, M., & Schröder, P. Discrete Shells. *Proceedings of the 2003 ACM SIGGRAPH/Eurographics Symposium on Computer Animation*, 2003: 62–67.
6. Jacobson, A., Deng, Z., Kavan, L., & Lewis, J. P. Skinning: Real-Time Shape Deformation. *ACM SIGGRAPH 2014 Courses*, 2014: 1–22.
7. Tanabe, Y., & Kaneko, K. Behavior of a Falling Paper. *Physical Review Letters*, 1994, 73(10): 1372–1375.
8. Gingold, R. A., & Monaghan, J. J. Smoothed Particle Hydrodynamics: Theory and Application to Non-Spherical Stars. *Monthly Notices of the Royal Astronomical Society*, 1977, 181(3): 375–389.
9. Macklin, M., & Müller, M. Position Based Fluids. *ACM Transactions on Graphics*, 2013, 32(4), Article 104.
10. Macklin, M., Müller, M., Chentanez, N., & Kim, T.-Y. Unified Particle Physics for Real-Time Applications. *ACM Transactions on Graphics*, 2014, 33(4), Article 153.
11. Provot, X. Collision and Self-Collision Handling in Cloth Model Dedicated to Design Garments. *Proceedings of Graphics Interface '97*, 1997: 177–189.
12. Bridson, R., Fedkiw, R., & Anderson, J. Robust Treatment of Collisions, Contact and Friction for Cloth Animation. *ACM Transactions on Graphics*, 2002, 21(3): 594–603.
