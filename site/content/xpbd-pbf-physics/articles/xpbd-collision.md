---
title: "实时柔性体的碰撞检测与响应"
outline: [2, 3]
aside: true
---

# 实时柔性体的碰撞检测与响应
&emsp;&emsp;XPBD 的约束投影负责维持布料、骨骼链和叶片的内部形状 [1][2]，但这些物体还需要与角色身体与外部场景发生接触。若只在每个时间步检测当前位置，快速运动的质点可能在两次采样之间直接穿过碰撞体；若对每个质点遍历全部场景碰撞体，计算量又会随对象数量迅速增长。

&emsp;&emsp;项目将碰撞分为离散解析投影、连续碰撞检测和接触摩擦三个层次 [3]。球体、胶囊体和立方体统一使用符号距离场（SDF）求穿透深度与投影方向，高速质点使用 CCD 在时间区间内寻找最早命中点，骨骼结构边与其构成的四边形面片则通过虚拟代理粒子补足拓扑分辨率。

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

## 参考文献
1. Müller, M., Heidelberger, B., Hennix, M., & Ratcliff, J. Position Based Dynamics. *Journal of Visual Communication and Image Representation*, 2007, 18(2): 109–118. [DOI](https://doi.org/10.1016/j.jvcir.2007.01.005)
2. Macklin, M., Müller, M., & Chentanez, N. XPBD: Position-Based Simulation of Compliant Constrained Dynamics. *Proceedings of the 9th International Conference on Motion in Games*, 2016: 49–54. [DOI](https://doi.org/10.1145/2994258.2994272)
3. Bridson, R., Fedkiw, R., & Anderson, J. Robust Treatment of Collisions, Contact and Friction for Cloth Animation. *ACM Transactions on Graphics*, 2002, 21(3): 594–603. [DOI](https://doi.org/10.1145/566654.566623)

## 1、碰撞管线
&emsp;&emsp;碰撞并不是一个独立于约束系统的后处理步骤。项目在位置预测后先执行可选的多轮预稳定化，并在对象级 AABB 通过粗筛后累计解析碰撞体的推出量，随后根据 Body 类型选择“碰撞 → 约束”或“约束 → 碰撞”的顺序。

&emsp;&emsp;所有 Body 的碰撞修正都必须在速度反推前完成，这样位置变化才能通过 $(\mathbf{x}-\mathbf{x}_{old})/\Delta t$ 转为速度，避免碰撞位移在下一帧被重复处理。帧末再缓存碰撞体的位姿，为下一帧 CCD 提供运动轨迹。

```csharp
// 先处理一帧内的扫掠轨迹，避免高速质点直接穿过碰撞体
if (body.enableCCD)
{
    collision.AnalyticCollisionCCD(
        body, body.ignoredColliders, collisionSubsteps, collisionThickness);
}

// 再处理当前位置的球、胶囊与立方体 SDF 穿透
collision.AnalyticCollision(
    body, body.ignoredColliders, collisionThickness);

// 最后处理地面
collision.FloorCollision(body, floor, collisionThickness);
```

&emsp;&emsp;在逐粒子检测前，系统先用外扩碰撞厚度的 AABB 做粗筛，Body 包围盒同时包含当前位置 $\mathbf{x}$ 与旧位置 $\mathbf{x}_{old}$。Body AABB 在当前碰撞 pass 内复用，碰撞体的世界几何与 CCD 插值矩阵则按帧缓存供所有 Body 共享，避免重复读取 Transform 和 Collider 属性。

## 2、SDF 解析碰撞
&emsp;&emsp;解析几何体不仅能回答是否相交，还能直接给出穿透深度、接触法线和目标表面点。项目为球体、胶囊体和立方体实现闭式 SDF，并在投影时额外加入 `collisionThickness`，下文统一记为 $\epsilon$，让质点停在碰撞体表面外一层安全距离，而不是恰好贴在表面上。

### 2.1、球体
&emsp;&emsp;设球心为 $\mathbf{c}$、半径为 $r$，空间点 $\mathbf{x}$ 的符号距离为：
$$
\phi_S(\mathbf{x})=\left\|\mathbf{x}-\mathbf{c}\right\|-r
$$
$\phi_S<0$ 表示点在球内。朝外单位法线为：
$$
\hat{\mathbf{n}}=\frac{\mathbf{x}-\mathbf{c}}
{\left\|\mathbf{x}-\mathbf{c}\right\|}
$$
发生穿透时，目标位置投影到球面外侧：
$$
\mathbf{x}_{target}=\mathbf{c}+(r+\epsilon)\hat{\mathbf{n}}
$$

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/球形SDF示意图.png" alt="空间点 x、球心 c 与球体半径 r 的符号距离关系" style="width: 50%; max-width: 480px; height: auto;">
</p>

### 2.2、胶囊体
&emsp;&emsp;胶囊体由核心线段 $\mathbf{A}\mathbf{B}$ 与半径 $r$ 定义。设 $\mathbf{u}=\mathbf{B}-\mathbf{A}$，点 $\mathbf{x}$ 在线段上的最近投影参数为：
$$
t=\operatorname{clamp}\left(
\frac{\left(\mathbf{x}-\mathbf{A}\right)\cdot\mathbf{u}}
{\left\|\mathbf{u}\right\|^2},0,1
\right)
$$
最近点与符号距离分别为：
$$
\mathbf{c}=\mathbf{A}+t\mathbf{u},\qquad
\phi_C(\mathbf{x})=\left\|\mathbf{x}-\mathbf{c}\right\|-r
$$
胶囊两端自然退化为以 $\mathbf{A}$、$\mathbf{B}$ 为球心的半球。最近的接触法线与投影目标为：
$$
\hat{\mathbf{n}}=\frac{\mathbf{x}-\mathbf{c}}
{\left\|\mathbf{x}-\mathbf{c}\right\|},\qquad
\mathbf{x}_{target}=\mathbf{c}+(r+\epsilon)\hat{\mathbf{n}}
$$

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/胶囊体SDF示意图_标注c.png" alt="空间点 x 投影到胶囊轴线 AB，最近点 c 与半径 r 的几何关系" style="width: 50%; max-width: 480px; height: auto;">
</p>

### 2.3、立方体
&emsp;&emsp;设盒体中心为 $\mathbf{c}$、半尺寸为 $\mathbf{h}$。先计算分量绝对偏移：
$$
\mathbf{q}=
\begin{pmatrix}
\left|x_x-c_x\right|\\
\left|x_y-c_y\right|\\
\left|x_z-c_z\right|
\end{pmatrix}
-\mathbf{h}
$$
Box SDF 为：
$$
\phi_B(\mathbf{x})=
\left\|\max(\mathbf{q},\mathbf{0})\right\|
+\min\left(\max(q_x,q_y,q_z),0\right)
$$
第一项给出点在盒外时到最近面、棱或角的距离，第二项在盒内返回负的最浅穿透深度，其最大分量也指示了应沿哪条轴推出。

&emsp;&emsp;实际碰撞查询会先把每个局部轴的半尺寸按碰撞厚度和碰撞体缩放进行外扩，再代入上式，因此质点最终停在原几何体边界外的安全层，而非几何表面上。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/盒体SDF示意图.png" alt="空间点 x、盒体中心 c 与半尺寸 hx、hy、hz 的几何关系" style="width: 50%; max-width: 480px; height: auto;">
</p>

## 3、连续碰撞检测
&emsp;&emsp;离散投影只检查当前时刻。当质点速度较高、碰撞体也在运动时，两者可能在一帧内完成穿越。CCD 把质点从旧位置到当前位置的位移视为参数化线段：
$$
\mathbf{p}(s)=\mathbf{p}_{start}+s\,\mathbf{d},
\qquad s\in[0,1]
$$
其中 $\mathbf{d}=\mathbf{p}_{end}-\mathbf{p}_{start}$，$s$ 表示当前物理步内的归一化时间。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/胶囊体连续碰撞检测.png" alt="局部空间中射线与胶囊体侧面和端部球面的连续碰撞求交" style="width: 50%; max-width: 480px; height: auto;">
</p>

### 3.1、圆柱侧面
&emsp;&emsp;胶囊侧面的命中点必须到中心轴线的垂距等于半径 $R$。设单位轴向量为 $\mathbf{u}$，射线起点到端点 $\mathbf{A}$ 的向量为 $\mathbf{m}=\mathbf{p}_{start}-\mathbf{A}$，则：
$$
\left\|\left(\mathbf{m}+s\mathbf{d}\right)\times\mathbf{u}\right\|^2=R^2
$$
展开后得到关于 $s$ 的一元二次方程：
$$
As^2+Bs+C=0
$$
其中：
$$
\begin{aligned}
A&=\left\|\mathbf{d}\times\mathbf{u}\right\|^2\\
B&=2\left(\mathbf{d}\times\mathbf{u}\right)\cdot
\left(\mathbf{m}\times\mathbf{u}\right)\\
C&=\left\|\mathbf{m}\times\mathbf{u}\right\|^2-R^2
\end{aligned}
$$
取满足 $0\le s\le1$ 且轴向投影落在有效长度内的最小根。

### 3.2、端部球面
&emsp;&emsp;若侧面没有命中，再测试射线与两端球面 $\mathbf{p}_A$、$\mathbf{p}_B$ 的交点：
$$
\left\|\mathbf{p}_{start}+s\mathbf{d}-\mathbf{p}_M\right\|^2=R^2,
\qquad \mathbf{p}_M\in\left\{\mathbf{p}_A,\mathbf{p}_B\right\}
$$
侧面命中和端球命中分别得到有效最小参数，统一取：
$$
s_{hit}=\min\left(s_{capsule},s_{sphere}\right)
$$
命中后把局部交点转换回对应子步的世界坐标，并将质点截停在表面外。

## 4、虚拟代理粒子
&emsp;&emsp;点级 CCD 只能保护离散质点。细长骨骼仍可能从相邻两个质点之间切过布料。项目在连续求交阶段临时构造边代理与面代理：每条结构边取中点，每个四边形面片取中心。代理点只参与 CCD，不参与积分和约束求解。

### 4.1、边代理
&emsp;&emsp;结构边 $(i,j)$ 的中点位置为：
$$
\mathbf{x}_{edge}=\frac{\mathbf{x}_i+\mathbf{x}_j}{2}
$$
若边代理被截停，需要产生位移 $\Delta\mathbf{x}_{hit}$，真实端点的修正量为：
$$
\delta_k=\Delta\mathbf{x}_{hit}
\frac{2w_k}{w_i+w_j},\qquad k\in\{i,j\}
$$

### 4.2、面代理
&emsp;&emsp;四边形面片中心为四个顶点的算术平均：
$$
\mathbf{x}_{face}=\frac{1}{4}\sum_{k=1}^{4}\mathbf{x}_k
$$
面中心命中后的顶点修正为：
$$
\delta_k=4\Delta\mathbf{x}_{hit}
\frac{w_k}{\sum_{m=1}^{4}w_m}
$$

```csharp
Vector3 correction = hitWorld - virtualPosAtHit;

// 边代理：两端共享修正，使中点到目标位置
Vector3 totalEdge = correction * 2f;
if (w1 > 0f) X[i1] += totalEdge * (w1 / (w1 + w2));
if (w2 > 0f) X[i2] += totalEdge * (w2 / (w1 + w2));

// 面代理：四个顶点共同抬升面中心
Vector3 totalFace = correction * 4f;
for (int k = 0; k < 4; k++)
{
    if (wk[k] > 0f) X[ik[k]] += totalFace * (wk[k] / wSum);
}
```

## 5、摩擦
### 5.1、有效逆质量
&emsp;&emsp;对通用 XPBD Body，摩擦不直接修改位置或速度，而是先把接触强度映射到有效逆质量。设点到表面的有符号距离为 $d_i$，摩擦生效厚度为 $\epsilon$，则接触系数为：
$$
f_i=1-\operatorname{clamp}\left(\frac{d_i}{\epsilon},0,1\right)
$$
有效逆质量为：
$$
\tilde{w}_i=\frac{w_i}{1+\mu_s f_i}
$$
接触越深，$f_i$ 越大，$\tilde w_i$ 越小，约束投影越不愿意移动该粒子，这样可以在原有 XPBD 位置迭代内部产生黏着和减滑效果。

```csharp
float CalcInverseMass(float friction)
{
    return 1f / (1f + friction * FrictionMass);
}

for (int i = 0; i < X.Length; i++)
{
    effInvMass[i] = friction[i] > 0f
        ? invMass[i] * CalcInverseMass(friction[i])
        : invMass[i];
}
```

### 5.2、叶片速度级动摩擦
&emsp;&emsp;叶片使用 Burst/Job 约束后端，单独采用速度级动摩擦。设接触强度为 $c_i$、滑动摩擦系数为 $\mu_k$、基础衰减速率为 $k_f$，切向速度衰减因子为：
$$
k=\operatorname{clamp}\left(
1-\mu_kc_ik_f\Delta t,0,1
\right)
$$
速度按接触面速度、法向分量和衰减后的切向分量重组：
$$
\mathbf{v}_i\leftarrow
\mathbf{v}_{surface}+\mathbf{v}_n+k\mathbf{v}_t
$$
这一路径适合落叶在地面、叶片表面或角色武器上滑动的低成本模拟。

## 6、总结
&emsp;&emsp;解析 SDF 适合高频查询的简单凸体，CCD 解决帧内穿越，代理粒子补充布料拓扑间隙，摩擦则让物体在接触后逐渐稳定。预稳定化复用同一个解析碰撞器，不会额外维护一套几何求交，粗筛、按帧缓存和扫掠包围盒主要负责减少不适用的碰撞查询。

&emsp;&emsp;当前碰撞仍然是面向实时美术表现的近似方案。解析体只覆盖球、胶囊与盒，不能直接表示复杂凹形场景。CCD 与虚拟代理会增加额外求交成本，摩擦通过逆质量和速度衰减近似，不等价于严格的库仑摩擦锥，多个接触同时出现时仍可能受求解顺序影响。

## 7、延伸阅读
- 作品：[Unity 实时柔性体与粒子流体系统](/projects/xpbd-pbf-physics/)
- 文章：[基于 XPBD 的柔性骨骼仿真](/articles/graphics/xpbd-rig/)、[基于 XPBD 的网格布料仿真](/articles/graphics/xpbd-cloth/)
- 笔记：[基于位置的扩展动力学（XPBD）](/notes/graphics-physics/xpbd.html)
