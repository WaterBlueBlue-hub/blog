# 线性混合蒙皮（LBS）
## 1、参考文献
&emsp;&emsp;Alec Jacobson, Zhigang Deng, Ladislav Kavan, J. P. Lewis：《Skinning: Real-time Shape Deformation》，ACM SIGGRAPH 2014 Courses，ACM，2014，https://skinning.org/。

&emsp;&emsp;Libin Liu：《GAMES105: Fundamentals of Character Animation》第 7 讲“Skinning”，Peking University，2023，https://games-105.github.io/ppt/07%20-%20Skinning.pdf。

&emsp;&emsp;Ladislav Kavan, Steven Collins, Jiří Žára, Carol O'Sullivan：《Geometric Skinning with Approximate Dual Quaternion Blending》，ACM Transactions on Graphics，27(4)，2008，https://doi.org/10.1145/1409625.1409627。

## 2、概念
&emsp;&emsp;设顶点 $i$ 在 Bind Pose 中的世界坐标为 $\mathbf{x}_i$，骨骼 $j$ 的骨骼坐标系在 Bind Pose 下相对世界坐标系的旋转矩阵和原点分别为 $\mathbf{Q}_j$、$\mathbf{o}_j$，当前姿态下的对应量为 $\mathbf{Q}'_j$、$\mathbf{o}'_j$。顶点相对骨骼 $j$ 的绑定局部坐标为：
$$
\mathbf{r}_{ij}
=\mathbf{Q}_j^T\left(\mathbf{x}_i-\mathbf{o}_j\right)
$$
只由骨骼 $j$ 驱动时，该顶点得到的候选位置为：
$$
\mathbf{x}'_{ij}
=\mathbf{Q}'_j\mathbf{r}_{ij}+\mathbf{o}'_j
$$
最终位置由所有相关骨骼的候选位置按权重混合：
$$
\mathbf{x}'_i
=\sum_{j=1}^{m}w_{ij}\mathbf{x}'_{ij}
=\sum_{j=1}^{m}w_{ij}
\left(\mathbf{Q}'_j\mathbf{r}_{ij}+\mathbf{o}'_j\right)
$$
其中 $w_{ij}$ 是骨骼 $j$ 对顶点 $i$ 的蒙皮权重，满足 $w_{ij}\ge 0$ 且 $\sum_j w_{ij}=1$。工程上通常只保留少数非零权重，常见上限为 4。

![GAMES105 第 7 讲：绑定姿态、蒙皮权重与多骨骼共同变形](<素材/线性混合蒙皮（LBS）/GAMES105-07-蒙皮权重与绑定姿态.png>)
*图源：GAMES105 Lecture 07 “Skinning”，Libin Liu，Peking University，第 29 页。*

## 3、仿射不变性
&emsp;&emsp;单位分解条件 $\sum_j w_{ij}=1$ 保证 LBS 能保持全局仿射变换。假设整个角色受到同一个全局刚体变换，即对任意顶点都有：
$$
\mathcal{T}(\mathbf{x})=\mathbf{R}\mathbf{x}+\mathbf{t}
$$
则每根骨骼满足 $\mathbf{Q}'_j=\mathbf{R}\mathbf{Q}_j$ 且 $\mathbf{o}'_j=\mathbf{R}\mathbf{o}_j+\mathbf{t}$。代入候选位置得到：
$$
\mathbf{x}'_{ij}
=\mathbf{R}\mathbf{Q}_j\mathbf{Q}_j^T(\mathbf{x}_i-\mathbf{o}_j)
+\mathbf{R}\mathbf{o}_j+\mathbf{t}
=\mathbf{R}\mathbf{x}_i+\mathbf{t}
$$
因此所有候选位置都相同，加权后仍然得到：
$$
\mathbf{x}'_i=\mathcal{T}(\mathbf{x}_i)
$$

若权重和不为 1，整体运动会被额外缩放或塌缩，因此权重需要归一化。

<a id="lbs-geometric-limitations"></a>
## 4、几何局限性
&emsp;&emsp;LBS 可以理解为先让每根骨骼独立带动顶点，得到若干候选位置，再对这些位置做线性加权。骨骼姿态接近时，候选位置彼此接近，混合结果通常正常，骨骼旋转差异较大时，候选位置会明显分离，加权平均可能落入肢体内部，造成表面塌陷。

![GAMES105 第 7 讲：两根骨骼产生候选位置后按权重混合](<素材/线性混合蒙皮（LBS）/GAMES105-07-两骨骼候选位置混合.png>)
*图源：GAMES105 Lecture 07 “Skinning”，Libin Liu，Peking University，第 23 页。*

&emsp;&emsp;令骨骼 $j$ 相对 Bind Pose 的旋转部分为：
$$
\mathbf{A}_j=\mathbf{Q}'_j\mathbf{Q}_j^T
$$
则 LBS 的线性部分等于这些旋转矩阵的加权和：
$$
\mathbf{A}_i=\sum_{j=1}^{m}w_{ij}\mathbf{A}_j
$$
$\mathbf{A}_j\in SO(3)$，但 $SO(3)$ 只对矩阵乘法封闭，不对线性加法封闭。该群的完整定义见：[李群基础中的特殊正交群](../../../数学/代数学/抽象代数/群论/李群基础.md#special-orthogonal-group)，旋转矩阵的坐标轴形式和齐次表示见：[齐次坐标与 MVP 变换矩阵中的旋转](<../../渲染/齐次坐标与 MVP 变换矩阵推导.md#rotation-matrices>)。  
&emsp;&emsp;因此 $\mathbf{A}_i$ 一般不再正交，可能伴随体积压缩。取 $\mathbf{A}_1=\mathbf{I}$、$\mathbf{A}_2=\mathrm{diag}(1,-1,-1)$，等权混合得到：
$$
\frac{1}{2}\left(\mathbf{A}_1+\mathbf{A}_2\right)
=\mathrm{diag}(1,0,0)
$$
该矩阵秩为 1：垂直于 $x$ 轴的整个平面被压成一点，三维空间被压成 $x$ 轴这条线。一般情况下，非负且和为 1 的权重使 $\mathbf{A}_i$ 的最大奇异值不超过 1，因此混合只会压缩某些方向，极端时直接压到 0，表现为关节内侧的体积塌陷，通常称为糖纸效应。

![GAMES105 第 7 讲：LBS 的 Rest Pose 与糖纸效应对比](<素材/线性混合蒙皮（LBS）/GAMES105-07-糖纸效应.png>)
*图源：GAMES105 Lecture 07 “Skinning”，Libin Liu，Peking University，第 39 页。*

&emsp;&emsp;问题源于在线性空间中混合旋转。改用在旋转空间或刚体变换空间中插值的蒙皮方法，例如双四元数蒙皮，可以避免旋转矩阵线性平均造成的塌缩，多线性和非线性蒙皮则是另一类改进方向。

## 5、延伸阅读
- 作品：[Unity 实时柔性体与粒子流体系统](<../../../../作品/计算机图形学/物理/Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟.md>)
- 文章：[基于 LBS 的裙摆防穿模工具](../../../../文章/计算机图形学/动画/蒙皮/基于%20LBS%20的裙摆防穿模工具.md)
- 笔记：[基于位置的扩展动力学（XPBD）](<../../物理/XPBD/基于位置的扩展动力学（XPBD）.md>)
