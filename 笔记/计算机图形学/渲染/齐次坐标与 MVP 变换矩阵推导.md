# 齐次坐标与 MVP 变换矩阵推导
## 1、参考文献与约定
&emsp;&emsp;三维变换、观察矩阵与透视投影部分参考：Lingqi Yan：《GAMES101: Introduction to Computer Graphics》第 4 讲 “Transformation Cont.”，University of California, Santa Barbara，2020，https://sites.cs.ucsb.edu/~lingqi/teaching/resources/GAMES101_Lecture_04.pdf。

&emsp;&emsp;本文采用 OpenGL 的右手系约定：观察空间中摄像机位于原点并朝向 $-Z$。

<a id="coordinate-transformations"></a>
## 2、齐次坐标与仿射变换
### 2.1、齐次坐标
&emsp;&emsp;三维仿射变换的一般形式为：
$$\mathbf{p}' = A\mathbf{p} + \mathbf{t}$$
其中 $A$ 是 $3 \times 3$ 线性变换矩阵，$\mathbf{t}$ 是平移向量。为了把线性部分和平移统一写成一次矩阵乘法，引入四维齐次坐标：
$$\tilde{\mathbf{p}} = \begin{bmatrix}x\\y\\z\\w\end{bmatrix}$$

&emsp;&emsp;在仿射变换的常用表示中，点取 $w=1$，方向向量取 $w=0$。这样平移只作用于点，而不改变方向向量。相应的 $4 \times 4$ 仿射矩阵为：
$$M = \begin{bmatrix}
A_{11} & A_{12} & A_{13} & t_x \\
A_{21} & A_{22} & A_{23} & t_y \\
A_{31} & A_{32} & A_{33} & t_z \\
0 & 0 & 0 & 1
\end{bmatrix}$$
左上角的 $3 \times 3$ 子矩阵包含一般线性变换，右上角的 $3 \times 1$ 列向量表示平移。右下角的 $1$ 保证仿射变换后的点仍满足齐次坐标最后一维为 $1$。

### 2.2、平移
&emsp;&emsp;沿 $X,Y,Z$ 轴分别平移 $t_x,t_y,t_z$ 的齐次矩阵为：
$$T = \begin{bmatrix}
1 & 0 & 0 & t_x \\
0 & 1 & 0 & t_y \\
0 & 0 & 1 & t_z \\
0 & 0 & 0 & 1
\end{bmatrix}$$
对点 $(x,y,z,1)^T$ 作用后得到 $(x+t_x,y+t_y,z+t_z,1)^T$。

<a id="rotation-matrices"></a>
### 2.3、旋转
&emsp;&emsp;以下矩阵表示右手坐标系中绕坐标轴正向旋转 $\theta$ 角的主动旋转。

&emsp;&emsp;绕 $X$ 轴：
$$R_x(\theta) = \begin{bmatrix}
1 & 0 & 0 & 0 \\
0 & \cos\theta & -\sin\theta & 0 \\
0 & \sin\theta & \cos\theta & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}$$

&emsp;&emsp;绕 $Y$ 轴：
$$R_y(\theta) = \begin{bmatrix}
\cos\theta & 0 & \sin\theta & 0 \\
0 & 1 & 0 & 0 \\
-\sin\theta & 0 & \cos\theta & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}$$

&emsp;&emsp;绕 $Z$ 轴：
$$R_z(\theta) = \begin{bmatrix}
\cos\theta & -\sin\theta & 0 & 0 \\
\sin\theta & \cos\theta & 0 & 0 \\
0 & 0 & 1 & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}$$

&emsp;&emsp;上述纯旋转矩阵左上角的 $3 \times 3$ 子矩阵均属于三维旋转群 $SO(3)$，因此一定满足正交性 $\mathbf{R}^T\mathbf{R}=\mathbf{I}$ 和特殊性 $\det(\mathbf{R})=1$。$SO(n)$ 的一般定义与群结构见：[李群基础中的特殊正交群](../../数学/代数学/抽象代数/群论/李群基础.md#special-orthogonal-group)。

&emsp;&emsp;在骨骼动画中，这些旋转矩阵会参与线性混合蒙皮：如果直接对多个骨骼旋转矩阵做线性加权，结果可能不再属于 $SO(3)$，从而产生关节塌陷。具体推导和糖纸效应见：[线性混合蒙皮中的旋转混合](../动画/蒙皮/线性混合蒙皮（LBS）.md#lbs-geometric-limitations)。

### 2.4、缩放
&emsp;&emsp;分别沿三个坐标轴缩放 $s_x,s_y,s_z$ 倍的矩阵为：
$$S = \begin{bmatrix}
s_x & 0 & 0 & 0 \\
0 & s_y & 0 & 0 \\
0 & 0 & s_z & 0 \\
0 & 0 & 0 & 1
\end{bmatrix}$$

### 2.5、复合变换
&emsp;&emsp;三维模型的常见复合顺序是先缩放、再旋转、最后平移：
$$\mathbf{v}_{\mathrm{world}} = TRS\,\mathbf{v}_{\mathrm{local}}$$
由于矩阵乘法一般不满足交换律，改变 $T,R,S$ 的顺序通常会得到不同结果。

## 3、模型矩阵
&emsp;&emsp;模型矩阵负责把物体自身的局部坐标变换到世界坐标。建模软件导出的顶点通常以物体坐标系为初始参考，模型文件中记录的只是局部顶点位置，物体最终出现在场景中的位置、朝向和大小，需要由模型矩阵决定。

&emsp;&emsp;若一个物体在场景中的变换由平移 $T$、旋转 $R$ 和缩放 $S$ 组成，则其模型矩阵为：
$$M_{\mathrm{model}} = TRS$$

&emsp;&emsp;局部空间中的顶点 $\mathbf{p}_{\mathrm{local}}$ 经模型矩阵变换后得到世界空间坐标：
$$\mathbf{p}_{\mathrm{world}} = M_{\mathrm{model}}\mathbf{p}_{\mathrm{local}}$$

&emsp;&emsp;因此，观察矩阵的输入应当是已经经过模型矩阵变换的世界坐标。若对象具有父节点，还要把父节点的世界变换纳入模型矩阵：
$$M_{\mathrm{world}} = M_{\mathrm{parent,world}}TRS$$

## 4、观察矩阵
### 4.1、摄像机坐标系
&emsp;&emsp;设摄像机位置为 $\mathbf{e}$，观察目标为 $\mathbf{c}$，世界坐标系的上方向为 $\mathbf{t}$。摄像机的三个正交基向量定义为：
$$\begin{aligned}
\mathbf{f} &= \frac{\mathbf{c}-\mathbf{e}}{\lVert\mathbf{c}-\mathbf{e}\rVert}\\
\mathbf{w} &= -\mathbf{f}\\
\mathbf{u} &= \frac{\mathbf{t}\times\mathbf{w}}{\lVert\mathbf{t}\times\mathbf{w}\rVert}\\
\mathbf{v} &= \mathbf{w}\times\mathbf{u}
\end{aligned}$$
其中 $\mathbf{f}$ 是摄像机的前向方向，$\mathbf{w}$ 指向摄像机的后方，$\mathbf{u}$ 和 $\mathbf{v}$ 分别对应当前屏幕的右方向和上方向。

### 4.2、LookAt 矩阵
&emsp;&emsp;观察变换将摄像机移动到原点，并把摄像机坐标系旋转到与世界坐标系对齐。对于世界空间点 $\mathbf{p}$，其在观察空间中的坐标为：
$$\mathbf{p}_{\mathrm{view}} =
\begin{bmatrix}
\mathbf{u}^T(\mathbf{p}-\mathbf{e})\\
\mathbf{v}^T(\mathbf{p}-\mathbf{e})\\
\mathbf{w}^T(\mathbf{p}-\mathbf{e})
\end{bmatrix}$$
写成齐次矩阵形式：
$$V = \begin{bmatrix}
u_x & u_y & u_z & -\mathbf{u}\cdot\mathbf{e}\\
v_x & v_y & v_z & -\mathbf{v}\cdot\mathbf{e}\\
w_x & w_y & w_z & -\mathbf{w}\cdot\mathbf{e}\\
0 & 0 & 0 & 1
\end{bmatrix}$$

## 5、透视投影矩阵
### 5.1、视锥与裁剪空间
&emsp;&emsp;透视投影把观察空间中的视锥体映射到裁剪空间。近平面距离摄像机为 $n$，远平面距离为 $f$，其边界分别为左 $l$、右 $r$、下 $b$、上 $t$。

&emsp;&emsp;GAMES101 将透视投影拆成两个步骤：先把视锥体压缩为一个长方体，再通过正交投影把该长方体映射到规范立方体。长方体两端仍分别位于 $n$ 和 $f$，但原本随深度扩张的横截面已被压缩到相同大小。

![GAMES101 第 4 讲：将视锥体压缩为长方体](<素材/齐次坐标与 MVP 变换矩阵推导/GAMES101-04-透视投影-视锥压平.png>)
*图源：GAMES101 Lecture 04，Lingqi Yan，UC Santa Barbara，第 29 页。*

&emsp;&emsp;在透视除法前，裁剪空间中的点 $(x_c,y_c,z_c,w_c)$ 还需要满足：
$$-w_c \le x_c,y_c,z_c \le w_c$$
位于该区域外的图元会在裁剪阶段被处理。完成裁剪后，硬件执行透视除法：
$$(x_{\mathrm{ndc}},y_{\mathrm{ndc}},z_{\mathrm{ndc}}) =
\left(\frac{x_c}{w_c},\frac{y_c}{w_c},\frac{z_c}{w_c}\right)$$

### 5.2、近平面上的坐标
&emsp;&emsp;设观察空间中的点为 $P(x,y,z)$，由于摄像机朝向 $-Z$，视锥内部的点满足 $z<0$。定义正向前向距离：
$$d=-z$$
从原点出发的投影射线在近平面 $z=-n$ 上的交点为 $P'(x',y',-n)$。

![GAMES101 第 4 讲：利用相似三角形推导透视投影](<素材/齐次坐标与 MVP 变换矩阵推导/GAMES101-04-透视投影-相似三角形.png>)
*图源：GAMES101 Lecture 04，Lingqi Yan，UC Santa Barbara，第 30 页。*

&emsp;&emsp;由俯视截面中的相似三角形可得：
$$\frac{x'}{n}=\frac{x}{d}
\quad\Longrightarrow\quad
x'=\frac{n}{d}x$$
由侧视截面同理可得：
$$\frac{y'}{n}=\frac{y}{d}
\quad\Longrightarrow\quad
y'=\frac{n}{d}y$$

### 5.3、映射到 NDC
&emsp;&emsp;近平面上的 $x'$ 和 $y'$ 分别位于区间 $[l,r]$ 与 $[b,t]$。将 $x'$ 线性映射到 $[-1,1]$：
$$x_{\mathrm{ndc}} = \frac{2(x'-l)}{r-l}-1
= \frac{2x'-(r+l)}{r-l}$$
代入 $x'=nx/(-z)$：
$$x_{\mathrm{ndc}} =
\frac{\dfrac{2n}{r-l}x+\dfrac{r+l}{r-l}z}{-z}$$
同理：
$$y_{\mathrm{ndc}} =
\frac{\dfrac{2n}{t-b}y+\dfrac{t+b}{t-b}z}{-z}$$

### 5.4、深度映射
&emsp;&emsp;为了保留深度测试所需的相对距离，设：
$$z_{\mathrm{ndc}} = \frac{Az+B}{-z}$$
近平面上的点需要映射到 $z_{\mathrm{ndc}}=-1$，远平面上的点需要映射到 $z_{\mathrm{ndc}}=1$，因此：
$$\frac{-An+B}{n}=-1, \qquad \frac{-Af+B}{f}=1$$
解得：
$$A=-\frac{f+n}{f-n}, \qquad B=-\frac{2fn}{f-n}$$
所以：
$$z_{\mathrm{ndc}} = \frac{-\dfrac{f+n}{f-n}z-\dfrac{2fn}{f-n}}{-z}$$

&emsp;&emsp;深度映射不是仿射映射。它与 $-z$ 的倒数相关，近处深度变化对应更大的 NDC 深度变化，因此近平面附近的深度精度通常高于远平面。

### 5.5、组装投影矩阵
&emsp;&emsp;将 $x_{\mathrm{ndc}},y_{\mathrm{ndc}},z_{\mathrm{ndc}}$ 的分母都保留为 $-z$，得到裁剪空间坐标：
$$\begin{aligned}
x_c &= \frac{2n}{r-l}x+\frac{r+l}{r-l}z\\
y_c &= \frac{2n}{t-b}y+\frac{t+b}{t-b}z\\
z_c &= -\frac{f+n}{f-n}z-\frac{2fn}{f-n}w\\
w_c &= -z
\end{aligned}$$
其中输入点通常取 $w=1$。最终透视投影矩阵为：
$$P = \begin{bmatrix}
\dfrac{2n}{r-l} & 0 & \dfrac{r+l}{r-l} & 0 \\
0 & \dfrac{2n}{t-b} & \dfrac{t+b}{t-b} & 0 \\
0 & 0 & -\dfrac{f+n}{f-n} & -\dfrac{2fn}{f-n} \\
0 & 0 & -1 & 0
\end{bmatrix}$$

&emsp;&emsp;矩阵最后一行的作用是把观察空间的前向距离 $-z$ 写入 $w_c$。裁剪完成并执行透视除法后，$w_c$ 才作为分母参与 NDC 计算。

### 5.6、基于视场角的常见形式
&emsp;&emsp;当视锥上下、左右对称时，令：
$$r=-l, \qquad t=-b$$
并用垂直视场角 $\theta$ 和宽高比 $a$ 表示，则透视投影矩阵可写为：
$$P = \begin{bmatrix}
\dfrac{1}{a\tan(\theta/2)} & 0 & 0 & 0\\
0 & \dfrac{1}{\tan(\theta/2)} & 0 & 0\\
0 & 0 & -\dfrac{f+n}{f-n} & -\dfrac{2fn}{f-n}\\
0 & 0 & -1 & 0
\end{bmatrix}$$

&emsp;&emsp;以上推导给出了从局部坐标到裁剪空间的完整 MVP 变换链。若回到图形管线中查看这一步的位置，见：[图形渲染管线中的坐标变换](<图形渲染管线.md#coordinate-transformation-stage>)。
