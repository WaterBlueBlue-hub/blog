---
title: 文献库
pageClass: papers-page
aside: false
---

# 文献库

读过的 29 篇论文，共 66 份 PDF：英文原版、机翻，以及我自己逐段对照翻译的中文版。站上只做索引——原文是出版社 / 会议的版权材料，不放在公开站点里；本地留了全文，按主题归档。

同一篇如果出现在多个主题下（比如 XPBD 既在「解算器」也在「对照版」），这里合并成一条。

## 解算器

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **ElasticModels**<br><span class="paper-en">Elastically Deformable Models</span> | 1987 | 中译 · 英文 | 连续介质弹性体进入图形学的起点：能量 + 有限差分。 |
| **LargeSteps**<br><span class="paper-en">Large Steps in Cloth Simulation</span> | 1998 | 机翻 · 英文 | 隐式积分 + 大时间步的布料仿真奠基作。 |
| **MDSM**<br><span class="paper-en">Meshless Deformations Based on Shape Matching</span> | 2005 | 机翻 · 英文 | 用形状匹配做无网格形变，稳定且不依赖拓扑。 |
| **PBD**<br><span class="paper-en">Position Based Dynamics</span> | 2007 | 中译 · 机翻 · 英文 | 位置级约束投影的起点：直接修正顶点位置，无条件稳定。 |
| **PD**<br><span class="paper-en">Projective Dynamics: Fusing Constraint Projections for Fast Simulation</span> | 2014 | 机翻 · 英文 | 把约束投影写成全局线性系统 + 局部投影，收敛快、易并行。 |
| **XPBD**<br><span class="paper-en">XPBD: Position-Based Simulation of Compliant Constrained Dynamics</span> | 2016 | 中译 · 机翻 · 英文 | 引入柔度 α 与 λ 乘子，把 PBD 的刚度从迭代次数里解耦——整套解算器的地基。 |
| **MGPBD**<br><span class="paper-en">MGPBD: A Multigrid Accelerated Global XPBD Solver</span> | 2025 | 机翻 · 英文 | 多重网格加速的全局 XPBD（arXiv 2025）：把每帧的全局求解放到粗网格上迭代，百万级四面体也能跑。 |

## 碰撞

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **Provot**<br><span class="paper-en">Collision and Self-Collision Handling in Cloth Model Dedicated to Design Garments</span> | 1997 | 机翻 · 英文 | 布料的碰撞与自碰撞处理。 |
| **Bridson**<br><span class="paper-en">Robust Treatment of Collisions, Contact and Friction for Cloth Animation</span> | 2002 | 机翻 · 英文 | CCD + 碰撞 / 接触 / 摩擦的标准处理，穿模问题的答案。 |
| **UnifiedParticles**<br><span class="paper-en">Unified Particle Physics for Real-Time Applications</span> | 2014 | 中译 · 英文 | 用统一粒子表示刚性体、流体与布料，共用一套约束。 |

## 流体

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **SPH**<br><span class="paper-en">Smoothed Particle Hydrodynamics</span> | 1977 | 中译 · 英文 | 核函数加权求和的最初形式。 |
| **KassMiller**<br><span class="paper-en">Rapid, Stable Fluid Dynamics for Computer Graphics</span> | 1990 | 中译 · 英文 | 浅水方程做水面，稳定且快——涟漪那套的源头。 |
| **SPHReview**<br><span class="paper-en">Smoothed Particle Hydrodynamics (review)</span> | 1992 | 中译 · 英文 | SPH 经典综述：核函数、连续性、边界处理。 |
| **SPHFreeSurface**<br><span class="paper-en">Simulating Free Surface Flows with SPH</span> | 1994 | 中译 | 自由表面与边界条件的具体做法。 |
| **MullerSPH**<br><span class="paper-en">Particle-Based Fluid Simulation for Interactive Applications</span> | 2003 | 中译 · 英文 | 交互式 SPH 的工程化：邻居搜索、粘性与表面张力。 |
| **ScreenSpaceFluid**<br><span class="paper-en">Screen Space Fluid Rendering for Games</span> | 2009 | 中译 · 英文 | SSFR：屏幕空间深度平滑 + 法线重建，水面渲染走这条路线。 |
| **PBF**<br><span class="paper-en">Position Based Fluids</span> | 2013 | 中译 · 英文 | 把不可压缩性写成密度约束，用位置修正代替压力求解——流体部分照这个实现。 |

## 有限元

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **FEMGuide**<br><span class="paper-en">FEM Simulation of 3D Deformable Solids: A Practitioner's Guide (SIGGRAPH 2012 Course)</span> | 2012 | 中译 · 英文 | 有限元的实践指南：从弹性理论到离散化，看连续介质力学时的配套材料。 |

## 蒙皮

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **PSD**<br><span class="paper-en">Pose Space Deformation: A Unified Approach to Shape Interpolation and Skeleton-Driven Deformation</span> | 2000 | 机翻 · 英文 | 把形状插值与骨骼驱动统一到姿势空间里。 |
| **DQS**<br><span class="paper-en">Skinning with Dual Quaternions</span> | 2007 | 英文 | 对偶四元数蒙皮，消除 LBS 的糖纸效应。 |
| **SkinningCourse1**<br><span class="paper-en">Skinning: Real-time Shape Deformation (SIGGRAPH 2014 Course, Part I)</span> | 2014 | 机翻 · 英文 | 实时蒙皮技术的系统综述。 |

## 加速算法

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **Chebyshev**<br><span class="paper-en">A Chebyshev Semi-Iterative Approach for Accelerating Projective and Position-Based Dynamics</span> | 2015 | 机翻 · 英文 | 切比雪夫半迭代加速 PBD / PD 的收敛。 |
| **AMG**<br><span class="paper-en">A Fast Unsmoothed Aggregation Algebraic Multigrid Framework for Large-Scale Incompressible Flow</span> | 2022 | 英文 | 非光滑聚合代数多重网格，加速不可压流的压力泊松求解。 |

## 可微求解器

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **DiffXPBD**<br><span class="paper-en">DiffXPBD: Differentiable Position-Based Simulation of Compliant Constraint Dynamics</span> | 2023 | 机翻 · 英文 | 可微 XPBD，用于反解材料参数。 |

## 叶片下落

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **TanabeKaneko** | 1994 | 中译 · 英文 | 叶片的准定常气动模型：升力 / 阻力随攻角变化（库塔-儒可夫斯基），叶片气动层的依据。 |

## 其它

| 论文 | 年份 | 材料 | 要点 |
| --- | --- | --- | --- |
| **Provot**<br><span class="paper-en">Deformation Constraints in a Mass-Spring Model to Describe Rigid Cloth Behavior</span> | 1995 | 机翻 · 英文 | 弹簧质点布料的拉伸 / 剪切 / 弯曲约束与超弹性限制。 |
| **DiscreteShells**<br><span class="paper-en">Discrete Shells</span> | 2003 | 机翻 · 英文 | 二面角弯曲能量的离散壳模型——弯曲约束的来源。 |
| **DER**<br><span class="paper-en">Discrete Elastic Rods</span> | 2008 | 英文 | 离散弹性杆，辫发、绳索这类细长体的建模基础。 |
| **PBSM**<br><span class="paper-en">Physically Based Shape Matching</span> | 2022 | 英文 | 把形状匹配写成一种约束，和 PBD 的约束投影统一到一个框架里。 |
