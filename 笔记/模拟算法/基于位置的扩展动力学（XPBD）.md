# 基于位置的扩展动力学（XPBD）
## 约束流形
&emsp;&emsp;在物理的仿真中，约束从根本上限制了系统的运动自由度。考虑一个被离散化为 $n$ 个节点的复杂力学系统，若每个节点具备 $d$ 个自由度，则整个系统总共拥有 $N = dn$ 个自由度。系统在任意时刻的几何位形，均可以由高维状态空间中的广义坐标 $\mathbf{q} \in \mathbb{R}^N$ 来完整描述。   
&emsp;&emsp;在这一高维空间中，系统所受的 $m$ 个约束可抽象为映射函数 $\mathbf{C}: \mathbb{R}^N \times \mathbb{R} \rightarrow \mathbb{R}^m$。其中，仅限制系统位置及其显式时间依赖的约束被称为完整约束，其数学表达为：
$$
\mathbf{C}(\mathbf{q}, t) = \mathbf{0}
$$
&emsp;&emsp;在实时物理仿真中，为兼顾计算效率与无条件稳定性，工业界普遍采用位置级约束方法以替代开销高昂的速度与加速度级求解。在该框架下，约束通常被简化为不显含时间的纯几何形式：
$$
\mathbf{C}(\mathbf{q}) = \mathbf{0}
$$
&emsp;&emsp;几何视角下，假设这 $m$ 个约束相互独立，它们在 $N$ 维构型空间中共同隐式定义了一个 $N-m$ 维的曲面，这便是代表所有合法位置的约束流形。  
&emsp;&emsp;由于约束流形多为高度非线性的弯曲表面，而数值积分的预测步仅作局部的线性切向外推。这种近似必然产生截断误差，导致构型点随惯性切出流形，引发约束漂移（即产生 $\mathbf{C}(\mathbf{q}) \neq \mathbf{0}$ 的误差）。因此，约束求解的本质，就是以尽可能小的代价将偏离的非法点重新投影回流形表面上。  
&emsp;&emsp;为寻找回归流形的最短路径，需利用约束的雅可比矩阵 $\mathbf{J}$。在几何上，$\mathbf{J}$ 的行向量（即各约束梯度）共同张成了约束流形的法向空间。由于沿流形切向的位移均落在 $\mathbf{J}$ 的零空间内，对消除误差 $\Delta \mathbf{C}$ 无效，因此严格沿着法向空间施加修正位移，便成为了回归流形的最优路径。
![alt text](约束流形.png) 
## PBD
### 算法框架
&emsp;&emsp;PBD 改变了（受力分析 $\rightarrow$ 加速度 $\rightarrow$ 速度 $\rightarrow$ 位置）的积分链路，选择直接对顶点坐标施加几何修正。其核心仿真循环如下：  
&emsp;&emsp;(1) For every vertex $i$  
&emsp;&emsp;(2) &emsp;&emsp;initialize $(\mathbf{x}_i, \mathbf{v}_i, w_i) \leftarrow (\mathbf{x}_i^0, \mathbf{v}_i^0, 1/m_i)$  
&emsp;&emsp;(3) Loop  
&emsp;&emsp;(4) &emsp;&emsp;For every vertex $i$  
&emsp;&emsp;(5) &emsp;&emsp;&emsp;&emsp;$\mathbf{v}_i \leftarrow \mathbf{v}_i + \Delta t w_i \mathbf{f}_{ext}(\mathbf{x}_i)$ // 显式积分更新速度  
&emsp;&emsp;(6) &emsp;&emsp;dampVelocities $(\mathbf{v}_1, \dots, \mathbf{v}_N)$  
&emsp;&emsp;(7) &emsp;&emsp;For every vertex $i$  
&emsp;&emsp;(8) &emsp;&emsp;&emsp;&emsp;$\mathbf{p}_i \leftarrow \mathbf{x}_i + \Delta t \mathbf{v}_i$ // 隐式预测新位置  
&emsp;&emsp;(9) &emsp;&emsp;For every vertex $i$  
&emsp;&emsp;(10)&emsp;&emsp;&emsp;&emsp;generateCollisionConstraints $(\mathbf{x}_i \rightarrow \mathbf{p}_i)$  
&emsp;&emsp;(11)&emsp;&emsp;Loop solverIterations times  
&emsp;&emsp;(12)&emsp;&emsp;&emsp;&emsp;projectConstraints $(\{\mathbf{C}\}, \{\mathbf{p}\})$ // 约束投影  
&emsp;&emsp;(13)&emsp;&emsp;For every vertex $i$  
&emsp;&emsp;(14)&emsp;&emsp;&emsp;&emsp;$\mathbf{v}_i \leftarrow (\mathbf{p}_i - \mathbf{x}_i) / \Delta t$ // 隐式更新速度  
&emsp;&emsp;(15)&emsp;&emsp;&emsp;&emsp;$\mathbf{x}_i \leftarrow \mathbf{p}_i$  
&emsp;&emsp;(16)&emsp;&emsp;velocityUpdate $(\mathbf{v}_1, \dots, \mathbf{v}_N)$ // 速度修正  
&emsp;&emsp;上述 PBD 管线具备两大特性。其一，通过逆质量加权投影（第 10 行）自然保证了系统的动量守恒；其二，几何投影机制会导致宏观刚度与时间步长 $\Delta t$ 及迭代次数强耦合。这种帧率依赖性会引发不可预测的材料弹性变化，改缺陷直接催生了后续的 XPBD 算法。
### 约束投影求解
&emsp;&emsp;当预测位置偏离约束流形时，PBD 会沿着约束梯度 $\nabla C(\mathbf{p})$ 的方向，将顶点强行拉回流形表面。为维持动量守恒，单顶点的位移量 $\Delta \mathbf{p}_i$ 由逆质量 $w_i$ 进行加权：
$$
\Delta \mathbf{p}_i = \lambda w_i \nabla_{\mathbf{p}_i} C
$$
&emsp;&emsp;为了求解标量乘子 $\lambda$，PBD 对非线性的约束流形方程进行了线性化近似：
$$
C(\mathbf{p} + \Delta \mathbf{p}) \approx C(\mathbf{p}) + \sum_j \nabla_{\mathbf{p}_j} C(\mathbf{p}) \cdot \Delta \mathbf{p}_j = 0
$$
&emsp;&emsp;将加权后的位移代入该线性化等式，可推导出 PBD 核心的位置更新公式：
$$
\Delta \mathbf{p}_i = -s w_i \nabla_{\mathbf{p}_i} C(\mathbf{p}_1, \dots, \mathbf{p}_n)
$$
&emsp;&emsp;其中，缩放因子 $s$（即标量乘子 $\lambda$）的具体计算公式为：
$$
s = \frac{C(\mathbf{p}_1, \dots, \mathbf{p}_n)}{\sum_j w_j \|\nabla_{\mathbf{p}_j} C(\mathbf{p}_1, \dots, \mathbf{p}_n)\|^2}
$$
## XPBD
&emsp;&emsp;为了彻底解决传统 PBD 刚度耦合于时间步长 $\Delta t$ 与迭代次数的痛点，XPBD 从底层的能量出发，引入了物理柔度的概念。其核心仿真循环伪代码如下（设 $k$ 为迭代计数器）：
&emsp;&emsp;(1) For every vertex $i$  
&emsp;&emsp;(2) &emsp;&emsp;$\tilde{\mathbf{x}}_i \leftarrow \mathbf{x}_i^n + \Delta t \mathbf{v}_i^n + \Delta t^2 \mathbf{M}^{-1} \mathbf{f}_{ext}(\mathbf{x}_i^n)$  
&emsp;&emsp;(3) initialize solve $\mathbf{x}^0 \leftarrow \tilde{\mathbf{x}}$  
&emsp;&emsp;(4) initialize multipliers $\lambda^0 \leftarrow \mathbf{0}$  
&emsp;&emsp;(5) Loop solverIterations times  
&emsp;&emsp;(6) &emsp;&emsp;For every constraint  
&emsp;&emsp;(7) &emsp;&emsp;&emsp;&emsp;compute $\Delta\lambda$  
&emsp;&emsp;(8) &emsp;&emsp;&emsp;&emsp;compute $\Delta\mathbf{x}$  
&emsp;&emsp;(9) &emsp;&emsp;&emsp;&emsp;update $\lambda^{k+1} \leftarrow \lambda^k + \Delta \lambda$  
&emsp;&emsp;(10)&emsp;&emsp;&emsp;&emsp;update $\mathbf{x}^{k+1} \leftarrow \mathbf{x}^k + \Delta \mathbf{x}$  
&emsp;&emsp;(11) update positions $\mathbf{x}^{n+1} \leftarrow \mathbf{x}^k$  
&emsp;&emsp;(12) update velocities $\mathbf{v}^{n+1} \leftarrow (\mathbf{x}^{n+1} - \mathbf{x}^n) / \Delta t$  
&emsp;&emsp;上述 XPBD 管线不仅继承了 PBD 无条件稳定的特性，有效避免了显式积分的数值爆炸。更通过拉格朗日乘子引入柔度 $\alpha$，彻底实现了宏观刚度与时间步长及迭代次数的解耦。然而，其仍未能消除系统宏观形变对网格拓扑分辨率的依赖。
## 约束投影求解
&emsp;&emsp;传统 PBD 的数学局限在于，纯几何方程 $C(\mathbf{p}) = 0$ 在物理上等价于无限刚度的硬约束。XPBD 通过引入对应于真实物理材质刚度倒数的柔度参数 $\alpha$，在数学上重构了约束流形的边界定义：
$$
C(\mathbf{p}) = -\alpha \frac{\lambda}{\Delta t^2}
$$
&emsp;&emsp;基于该软化后的约束方程，XPBD 推导出了拉格朗日乘子的迭代更新增量：
$$
\Delta \lambda = \frac{-C(\mathbf{p}) - \tilde{\alpha} \lambda}{\nabla C(\mathbf{p}) \mathbf{M}^{-1} \nabla C(\mathbf{p})^T + \tilde{\alpha}}
$$
&emsp;&emsp;其中，归一化柔度 $\tilde{\alpha} = \alpha / \Delta t^2$。系统顶点的最终位置修正量则通过乘子增量精确求得，从而允许约束在受力时产生符合物理规律的合法形变：
$$
\Delta \mathbf{x} = \mathbf{M}^{-1}\nabla C(\mathbf{p})^T \Delta \lambda
$$
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;