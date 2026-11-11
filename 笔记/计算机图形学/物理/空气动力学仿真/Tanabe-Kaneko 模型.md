# Tanabe-Kaneko 模型
## 1、参考文献
&emsp;&emsp;Tanabe, Y., & Kaneko, K. Behavior of a Falling Paper. *Physical Review Letters*, 1994, 73(10): 1372–1375. [DOI](https://doi.org/10.1103/PhysRevLett.73.1372)

## 2、概念
&emsp;&emsp;纸片或树叶自由下落时，会周期性地翻转、持续旋转、左右摇摆，也可能在看似规则的轨迹中突然改变运动方向。直接求解带运动边界的 Navier-Stokes 方程可以描述这些现象，但计算成本很高。Tanabe 与 Kaneko 在 1994 年提出了一个二维准定常薄板模型，只保留升力、与速度成正比的摩擦以及重力，用少量状态量定性复现纸片下落时的多种运动模式 [1]。

&emsp;&emsp;论文的核心问题不是定量预测某种真实纸片的轨迹，而是验证少量状态量组成的运动系统是否已经足以产生复杂、不重复的下落运动。模型通过改变摩擦系数观察到周期旋转、不规则旋转、不规则颤振、周期颤振和简单垂直下落五种模式，并用运动轨迹和下落路径描述这些状态。

<p align="center">
  <img src="素材/Tanabe-Kaneko 模型/图片/纸片受力示意图.png" alt="论文中的纸片、速度、升力、摩擦力和重力示意图" style="width: 50%; max-width: 480px; height: auto;">
</p>
图 1：Tanabe-Kaneko 模型中的纸片受力示意图，原图裁自论文 [1]。

### 2.1、二维刚体
&emsp;&emsp;模型把纸片限制在二维 $X$-$Y$ 平面内运动，并假设纸片是厚度为零的刚体。几何形状只需要长度 $l$ 描述，质量记为 $m_p$。纸片的位置用质心坐标 $(x,y)$ 表示，姿态用它与 $X$ 轴的夹角 $\theta$ 表示，速度与角速度分别为：
$$
u=\dot{x}, \qquad v=\dot{y}, \qquad \omega=\dot{\theta}
$$

&emsp;&emsp;因此，纸片的平动与转动状态可以写成 $(x,y,\theta,u,v,\omega)$。其中 $x,y$ 只通过速度积分得到，真正决定运动模式的动力学状态为 $(\theta,u,v,\omega)$。

### 2.2、力的组成
&emsp;&emsp;纸片只受三种力：
- 重力，方向沿 $-Y$；
- 由 Kutta-Joukowski 定理得到的升力；
- 为模拟真实黏性流体而加入的唯象摩擦力。

&emsp;&emsp;升力计算假设流体不可压缩、无黏且流动准定常。理想流体本身不产生阻力，因此论文额外引入与纸片速度成正比的摩擦力。垂直于纸面与平行于纸面的摩擦系数分别记为 $k_\perp$ 和 $k_\parallel$。

## 3、摩擦力
### 3.1、平动摩擦
&emsp;&emsp;设纸片相对 $X$ 轴的倾角为 $\theta$。把速度 $(u,v)$ 投影到纸面的法向与切向后，两个摩擦力分量分别为：
$$
\begin{aligned}
F_\perp
&=-m_pk_\perp\left(v\cos\theta-u\sin\theta\right) \\
F_\parallel
&=-m_pk_\parallel\left(v\sin\theta+u\cos\theta\right)
\end{aligned}
\tag{1}
$$
其中 $F_\perp$ 垂直于纸面，$F_\parallel$ 平行于纸面。

&emsp;&emsp;把式 (1) 中的两个分量重新投影到全局 $X$-$Y$ 坐标，得到质心所受的摩擦力：
$$
\begin{aligned}
F_x
&=-F_\perp\sin\theta+F_\parallel\cos\theta \\
&=m_p\left[
-\left(k_\perp\sin^2\theta+k_\parallel\cos^2\theta\right)u
+\left(k_\perp-k_\parallel\right)\sin\theta\cos\theta\,v
\right] \\
F_y
&=F_\perp\cos\theta+F_\parallel\sin\theta \\
&=m_p\left[
\left(k_\perp-k_\parallel\right)\sin\theta\cos\theta\,u
-\left(k_\perp\cos^2\theta+k_\parallel\sin^2\theta\right)v
\right]
\end{aligned}
\tag{2}
$$

### 3.2、转动摩擦
&emsp;&emsp;除平动摩擦外，论文还加入与角速度成正比的转动摩擦：
$$
F_\theta
=-m_pk_\perp\frac{l^2}{12}\omega
\tag{3}
$$
这一项对应纸片绕质心旋转时受到的阻力矩。其系数使用 $k_\perp$，而不是单独引入第三个摩擦参数。

## 4、Kutta-Joukowski 升力
&emsp;&emsp;在长度为 $l$ 的平板模型中，若流体密度为 $\rho_f$、相对来流速度为 $U$、叶面外法线与相对来流的夹角为 $\phi$，升力与升力矩分别为：
$$
\begin{aligned}
L&=l\rho_f\pi U^2\cos\phi \\
M&=-\frac{1}{4}Ll\sin\phi
\end{aligned}
\tag{4}
$$

&emsp;&emsp;通过 Galilean 变换，把式 (4) 中静止纸片受到均匀来流的结果转换到纸片运动、流体远场静止的参考系。设总速度与速度方向角分别为：
$$
V=\sqrt{u^2+v^2}, \qquad
\alpha=\arctan\left(\frac{u}{v}\right)
\tag{5}
$$
式 (5) 中的 $\alpha$ 是论文运动方程采用的纸片速度方向角。下一节局部薄板推导会使用另一个符号 $\alpha_U$，表示远场来流相对弦线的角度，二者不能混用。将式 (4) 按 Galilean 变换分解到 $X$、$Y$ 方向，得到：
$$
\begin{aligned}
L_x
&=\mp l\rho_f\pi V^2
\cos\left(\alpha+\theta\right)\cos\alpha \\
L_y
&=\pm l\rho_f\pi V^2
\cos\left(\alpha+\theta\right)\sin\alpha \\
M
&=-\frac{l^2\rho_f\pi V^2}{4}
\cos\left(\alpha+\theta\right)
\sin\left(\alpha+\theta\right)
\end{aligned}
\tag{6}
$$

式 (6) 中的上、下两套符号由纸片朝向决定：
当 $(v<0,\ 0<\alpha+\theta<\pi)$ 或
$(v>0,\ -\pi<\alpha+\theta<0)$ 时取第一套；
当 $(v<0,\ -\pi<\alpha+\theta<0)$ 或
$(v>0,\ 0<\alpha+\theta<\pi)$ 时取第二套。
在该运动坐标系中，记决定升力大小的有效夹角为 $\phi_T$，它由 $\alpha+\theta$ 给出，对应式 (4) 中静止参考系下的 $\phi$。

<a id="thin-plate-circulation"></a>
## 5、薄板环量推导
### 5.1、升力
&emsp;&emsp;本节使用局部来流速度 $U$、局部来流角 $\alpha_U$ 和局部法线—来流夹角 $\phi_U$；它们与式 (5) 中由纸片速度定义的 $V,\alpha$ 属于不同坐标系，不使用同一套角度定义。

&emsp;&emsp;在二维不可压缩、无黏、无旋流中，物体周围的速度环量定义为：
$$
\Gamma=\oint_C\mathbf{V}\cdot\mathrm{d}\mathbf{l}
\tag{7}
$$
其中 $C$ 是围绕物体的闭合积分回路，$\mathbf{V}$ 是回路上的局部流体速度，$\mathrm{d}\mathbf{l}$ 是沿回路方向取得的一小段有向线段。点积 $\mathbf{V}\cdot\mathrm{d}\mathbf{l}$ 只取速度沿回路切线方向的分量，沿整条闭合回路累加后，得到绕物体的净环量 $\Gamma$。

&emsp;&emsp;Kutta-Joukowski 定理在式 (7) 的环量定义下给出单位展长上的升力：
$$
L'=\rho_fU\Gamma
\tag{8}
$$
其中 $\rho_f$ 为流体密度，$U$ 为远场来流速度，$\Gamma$ 为绕过物体的净环量。升力方向垂直于远场来流，正负号由环量方向决定。该式只给出了升力与环量之间的关系，薄板自身会产生多大的环量，还需要由无穿透条件和 Kutta 后缘条件共同确定。

&emsp;&emsp;将弦长为 $l$ 的零厚度薄板视为一条连续涡片。设弦上位置 $x$ 处单位长度的环量密度为 $\gamma(x)$，对式 (7) 沿弦积分得到总环量：
$$
\Gamma=\int_0^l\gamma(x)\,\mathrm{d}x
\tag{9}
$$
&emsp;&emsp;取弦线方向为 $x$ 轴、板面外法向为 $z$ 轴、翼展方向为 $y$ 轴，并把正环量方向取为 $+y$。弦上位置 $\xi$ 处长度为 $\mathrm{d}\xi$ 的微元具有环量：
$$
\mathrm{d}\Gamma=\gamma(\xi)\,\mathrm{d}\xi
$$

<p align="center">
  <img src="素材/Tanabe-Kaneko 模型/图片/涡片微元与诱导速度示意图_标注版.png" alt="左图为薄板涡片微元，右图为沿弦线的 x-z 截面及微元两侧相反的诱导速度方向" style="width: 100%; max-width: 900px; height: auto;">
</p>

&emsp;&emsp;左图对应 $\mathrm{d}\Gamma=\gamma(\xi)\mathrm{d}\xi$；右图表示沿弦线截取的 $x$–$z$ 平面，说明距离 $r=\left|x-\xi\right|$ 以及 $x$ 位于 $\xi$ 两侧时诱导速度方向的翻转。

&emsp;&emsp;把微元环量代入二维 Biot-Savart 定律，可以得到涡线在距离 $r$ 处诱导的切向速度：
$$
v_{\tau}=\frac{\mathrm{d}\Gamma}{2\pi r}
=\frac{\gamma(\xi)\,\mathrm{d}\xi}{2\pi r}
\tag{10}
$$
对于板面上的观测点 $x$，涡片微元到该点的距离为：
$$
r=\left|x-\xi\right|
$$
正环量方向取为 $+y$ 时，$x>\xi$ 处的诱导速度指向板面下方，$x<\xi$ 处则指向上方。因此可以用带符号的核 $1/(x-\xi)$ 同时表示大小和方向，该微元贡献的法向速度增量为：
$$
\mathrm{d}w(x;\xi)
=\frac{\gamma(\xi)}{2\pi(x-\xi)}\,\mathrm{d}\xi
$$
其中 $w$ 以板面下方为正。把所有微元按式 (10) 沿弦积分，得到位置 $x$ 处的总诱导速度：
$$
w(x)=\frac{1}{2\pi}\int_0^l
\frac{\gamma(\xi)}{x-\xi}\,\mathrm{d}\xi
\tag{11}
$$
式 (11) 在 $\xi=x$ 处出现奇点，但奇异项在左右两侧符号相反。计算时先在对 $x$ 对称的区间内挖去 $[x-\varepsilon,x+\varepsilon]$，再令 $\varepsilon\to0$：
$$
\operatorname{PV}\int_0^l
\frac{\gamma(\xi)}{x-\xi}\,\mathrm{d}\xi
=\lim_{\varepsilon\to0}\left[
\int_0^{x-\varepsilon}
\frac{\gamma(\xi)}{x-\xi}\,\mathrm{d}\xi
+\int_{x+\varepsilon}^l
\frac{\gamma(\xi)}{x-\xi}\,\mathrm{d}\xi
\right]
$$
这就是积分方程中柯西主值的来源。接下来需要让总速度满足板面不可穿透条件。设局部来流相对弦线的角度为 $\alpha_U$，远场速度表示为：
$$
\mathbf{U}_{\infty}
=U\left(\cos\alpha_U\,\mathbf{e}_x
+\sin\alpha_U\,\mathbf{e}_z\right)
\tag{12}
$$
其中 $\mathbf{e}_x=(1,0)$ 与 $\mathbf{e}_z=(0,1)$ 分别是沿弦向 $x$ 和法向 $z$ 的单位基向量。来流沿弦向的分量为 $U\cos\alpha_U$，沿法向的分量为 $U\sin\alpha_U$。

&emsp;&emsp;薄板中弧线可以参数化为：
$$
\mathbf{X}(x)=\left(x,z_c(x)\right)
$$
对 $x$ 求导，得到沿曲线方向的切向量：
$$
\frac{\mathrm{d}\mathbf{X}}{\mathrm{d}x}
=\left(1,\frac{\mathrm{d}z_c}{\mathrm{d}x}\right)
$$
与它垂直的法向量为 $(-z_c',1)$，因为二者点积为零：
$$
\left(1,\frac{\mathrm{d}z_c}{\mathrm{d}x}\right)
\cdot\left(-\frac{\mathrm{d}z_c}{\mathrm{d}x},1\right)=0
$$
精确的单位切向量与单位法向量还需要分别除以它们的长度：
$$
\hat{\mathbf{t}}
=\frac{\left(1,z_c'\right)}
{\sqrt{1+\left(z_c'\right)^2}}, \qquad
\hat{\mathbf{n}}
=\frac{\left(-z_c',1\right)}
{\sqrt{1+\left(z_c'\right)^2}}
\tag{13}
$$
其中 $z_c'=\mathrm{d}z_c/\mathrm{d}x$。薄翼理论假设中弧线斜率很小，即 $\left|z_c'\right|\ll1$，因此：
$$
\sqrt{1+\left(z_c'\right)^2}\approx1
$$
略去斜率的高阶项后，切向量与局部外法向量可近似写成：
$$
\mathbf{t}=\left(1,\frac{\mathrm{d}z_c}{\mathrm{d}x}\right), \qquad
\mathbf{n}=\left(-\frac{\mathrm{d}z_c}{\mathrm{d}x},1\right)
$$
$w$ 以板面下方为正，因此诱导速度可以写成 $-w\mathbf{n}$。无穿透条件要求总速度在局部法向上的分量为零，即：
$$
\left(\mathbf{U}_{\infty}-w\mathbf{n}\right)\cdot\mathbf{n}=0
\tag{14}
$$

<p align="center">
  <img src="素材/Tanabe-Kaneko 模型/图片/薄板局部无穿透示意图.png" alt="薄板局部切向、法向、远场来流与诱导速度的方向关系" style="width: 100%; max-width: 900px; height: auto;">
</p>

&emsp;&emsp;把式 (12) 与式 (13) 中的局部法向量代入式 (14)，先拆成两项：
$$
\left(\mathbf{U}_{\infty}-w\mathbf{n}\right)\cdot\mathbf{n}
=\mathbf{U}_{\infty}\cdot\mathbf{n}
-w\left(\mathbf{n}\cdot\mathbf{n}\right)
$$
记 $m=\dfrac{\mathrm{d}z_c}{\mathrm{d}x}$，并代入 $\mathbf{n}=(-m,1)$：
$$
\begin{aligned}
\mathbf{U}_{\infty}\cdot\mathbf{n}
&=U\left(\cos\alpha_U,\sin\alpha_U\right)\cdot\left(-m,1\right) \\
&=U\left(\sin\alpha_U-m\cos\alpha_U\right) \\
\mathbf{n}\cdot\mathbf{n}
&=(-m)^2+1^2=1+m^2
\end{aligned}
$$
因此未近似前的法向分量为：
$$
\left(\mathbf{U}_{\infty}-w\mathbf{n}\right)\cdot\mathbf{n}
=U\left(\sin\alpha_U-m\cos\alpha_U\right)
-w\left(1+m^2\right)
$$
薄翼同时满足小攻角 $|\alpha_U|\ll1$ 与小斜率 $|m|\ll1$，因此 $\sin\alpha_U\approx\alpha_U$、$\cos\alpha_U\approx1$、$1+m^2\approx1$。将式 (14) 保留一阶小量后：
$$
\left(\mathbf{U}_{\infty}-w\mathbf{n}\right)\cdot\mathbf{n}
\approx U\left(\alpha_U-\frac{\mathrm{d}z_c}{\mathrm{d}x}\right)-w
=0
$$
整理式 (14) 后得到所需的法向速度：
$$
w(x)=U\left(\alpha_U-\frac{\mathrm{d}z_c}{\mathrm{d}x}\right)
\tag{15}
$$
联立式 (11) 与式 (15)：
$$
\frac{1}{2\pi}\int_0^l
\frac{\gamma(\xi)}{x-\xi}\,\mathrm{d}\xi
=U\left(\alpha_U-\frac{\mathrm{d}z_c}{\mathrm{d}x}\right)
\tag{16}
$$
左端是由全部涡片微元产生的诱导法向速度，右端是为了抵消来流法向分量所必须提供的速度。该条件仍不足以唯一确定 $\gamma(x)$。实际有黏流体经过尖锐后缘时会通过边界层和启动涡调整绕流环量，使上下表面的气流在后缘平滑汇合。理想流模型将这一现象表示为 Kutta 条件：
$$
\gamma(l)=0
\tag{17}
$$
式 (17) 就是 Kutta 条件，也就是后缘处不允许存在由环量密度突变产生的速度奇性。

&emsp;&emsp;为求解式 (16) 中的柯西型积分方程，引入 Glauert 变换。为避免与纸片姿态角 $\theta$ 混淆，这里把 Glauert 参数记为 $\vartheta$：
$$
x=\frac{l}{2}\left(1-\cos\vartheta\right), \qquad
\mathrm{d}x=\frac{l}{2}\sin\vartheta\,\mathrm{d}\vartheta
\tag{18}
$$
该变换把弦区间 $x\in[0,l]$ 映射到参数区间 $\vartheta\in[0,\pi]$，前缘对应 $\vartheta=0$，后缘对应 $\vartheta=\pi$。把积分变量 $\xi$ 对应的角度记为 $\vartheta'$，则：
$$
\xi=\frac{l}{2}\left(1-\cos\vartheta'\right), \qquad
\mathrm{d}\xi=\frac{l}{2}\sin\vartheta'\,\mathrm{d}\vartheta'
$$
无穿透积分中的核可以写成：
$$
x-\xi=\frac{l}{2}\left(\cos\vartheta'-\cos\vartheta\right)
$$
在式 (18) 的变量替换下，$\mathrm{d}\xi$ 与分母中的 $l/2$ 抵消，积分方程变为：
$$
\frac{1}{2\pi}\operatorname{PV}
\int_0^\pi
\frac{\gamma(\vartheta')\sin\vartheta'}
{\cos\vartheta'-\cos\vartheta}\,\mathrm{d}\vartheta'
=U\left(\alpha_U-\frac{\mathrm{d}z_c}{\mathrm{d}x}\right)
\tag{19}
$$

&emsp;&emsp;定义右端函数：
$$
f(\vartheta)=\alpha_U-\frac{\mathrm{d}z_c}{\mathrm{d}x}
$$
其中 $z_c'$ 应理解为 $z_c'(x(\vartheta))$。为了在 $[0,\pi]$ 上使用标准傅里叶级数，先把 $f(\vartheta)$ 偶延拓到 $[-\pi,\pi]$：
$$
F_e(-\vartheta)=F_e(\vartheta)=f(\vartheta)
$$
再把 $F_e$ 以 $2\pi$ 为周期重复。由于偶函数的傅里叶级数中所有正弦项都为零，只剩常数项和余弦项，因此 $f(\vartheta)$ 可以展开为傅里叶余弦级数，即式 (20)：
$$
f(\vartheta)=A_0+\sum_{n\ge1}A_n\cos n\vartheta
\tag{20}
$$
这一步把函数投影到基函数 $\{1,\cos n\vartheta\}$ 上。

&emsp;&emsp;式 (20) 的系数由余弦函数的正交性确定。首先有：
$$
\int_0^\pi\cos n\vartheta\,\mathrm{d}\vartheta=0,
\qquad n\ge1
$$
并且当 $m,n\ge1$ 时：
$$
\int_0^\pi
\cos m\vartheta\cos n\vartheta\,\mathrm{d}\vartheta
=
\begin{cases}
0, & m\ne n \\
\dfrac{\pi}{2}, & m=n
\end{cases}
$$
对级数两边直接积分：
$$
\int_0^\pi f(\vartheta)\,\mathrm{d}\vartheta
=\int_0^\pi A_0\,\mathrm{d}\vartheta
+\sum_{n\ge1}A_n
\int_0^\pi\cos n\vartheta\,\mathrm{d}\vartheta
=\pi A_0
$$
所以由常数项投影得到：
$$
A_0=\frac{1}{\pi}\int_0^\pi f(\vartheta)\,\mathrm{d}\vartheta
\tag{21}
$$

&emsp;&emsp;再在级数两边乘以 $\cos m\vartheta$ 并从 $0$ 到 $\pi$ 积分。除 $n=m$ 外，其余余弦积分全部为零，因此：
$$
\int_0^\pi
f(\vartheta)\cos m\vartheta\,\mathrm{d}\vartheta
=
A_m\frac{\pi}{2}
$$
由一次余弦项投影得到：
$$
A_m=\frac{2}{\pi}\int_0^\pi
f(\vartheta)\cos m\vartheta\,\mathrm{d}\vartheta
$$
把指标 $m$ 换回 $n$，得到式 (22)。
$$
A_n=\frac{2}{\pi}\int_0^\pi
f(\vartheta)\cos n\vartheta\,\mathrm{d}\vartheta,
\qquad n\ge1
\tag{22}
$$

&emsp;&emsp;将 $f(\vartheta)=\alpha_U-z_c'$ 代入式 (21)，得到具体的常数项：
$$
A_0
=\frac{1}{\pi}\int_0^\pi\alpha_U\,\mathrm{d}\vartheta
-\frac{1}{\pi}\int_0^\pi
\frac{\mathrm{d}z_c}{\mathrm{d}x}\,\mathrm{d}\vartheta
=\alpha_U-\frac{1}{\pi}\int_0^\pi
\frac{\mathrm{d}z_c}{\mathrm{d}x}\,\mathrm{d}\vartheta
\tag{23}
$$
对于 $n\ge1$，将同一函数代入式 (22)；由于 $\int_0^\pi\cos n\vartheta\,\mathrm{d}\vartheta=0$，常数 $\alpha_U$ 没有贡献，只剩：
$$
A_n
=-\frac{2}{\pi}\int_0^\pi
\frac{\mathrm{d}z_c}{\mathrm{d}x}\cos n\vartheta\,\mathrm{d}\vartheta
\tag{24}
$$
为从式 (19) 反解 $\gamma(\vartheta)$，需要以下三角积分恒等式：
$$
\begin{aligned}
&\int_0^\pi\frac{\mathrm{d}\vartheta'}
{\cos\vartheta'-\cos\vartheta}=0 \\
&\int_0^\pi\frac{\cos\vartheta'}
{\cos\vartheta'-\cos\vartheta}\,\mathrm{d}\vartheta'=\pi \\
&\frac{1}{\pi}\int_0^\pi
\frac{\sin n\vartheta'\sin\vartheta'}
{\cos\vartheta'-\cos\vartheta}\,\mathrm{d}\vartheta'
=\cos n\vartheta
\end{aligned}
\tag{25}
$$
利用 $\cot(\vartheta'/2)=(1+\cos\vartheta')/\sin\vartheta'$，前两条恒等式对应 $\cot(\vartheta'/2)$ 项，第三条恒等式对应 $\sin n\vartheta'$ 项。因此，将式 (20) 与式 (25) 代入式 (19)，环量密度可写成：
$$
\gamma(\vartheta)=2U\left[
A_0\cot\frac{\vartheta}{2}
+\sum_{n\ge1}A_n\sin n\vartheta
\right]
\tag{26}
$$
$\cot(\vartheta/2)$ 项允许前缘出现 $1/\sqrt{x}$ 型吸力奇点；所有项在 $\vartheta=\pi$ 处都为零，因此自动满足 Kutta 后缘条件。

&emsp;&emsp;Tanabe-Kaneko 模型采用零弯度平板，因此由式 (23)、(24) 得到：
$$
z_c(x)\equiv0, \qquad A_0=\alpha_U, \qquad A_n=0
$$
将上述系数代回式 (26)，并利用 $\cot(\vartheta/2)=(1+\cos\vartheta)/\sin\vartheta$，得到：
$$
\gamma(\vartheta)
=2U\alpha_U\frac{1+\cos\vartheta}{\sin\vartheta}
\tag{27}
$$
式 (27) 在 $\vartheta\to0$ 时趋于无穷，对应前缘吸力奇点；在 $\vartheta=\pi$ 时为零，满足 Kutta 后缘条件。沿弦积分并恢复小角度线性化前的 $\sin\alpha_U$，得到总环量：
$$
\begin{aligned}
\Gamma
&=\int_0^l\gamma(x)\,\mathrm{d}x \\
&=\int_0^\pi
\gamma(\vartheta)\frac{l}{2}\sin\vartheta\,\mathrm{d}\vartheta \\
&=2U\alpha_U\frac{l}{2}
\int_0^\pi\left(1+\cos\vartheta\right)\mathrm{d}\vartheta \\
&=\pi Ul\,\alpha_U
\end{aligned}
$$
上式来自小攻角线性化。把系数中的 $\alpha_U$ 恢复为原始几何角度，可以写成：
$$
\Gamma=\pi Ul\sin\alpha_U
\tag{28}
$$
将式 (28) 代回式 (8)：
$$
L'=\rho_fU\Gamma
=\rho_f\pi U^2l\sin\alpha_U
$$
论文再按薄板尺度 $l$ 将单位展长结果换算为薄板升力：
$$
L=lL'=l\rho_f\pi U^2\sin\alpha_U
$$
Tanabe-Kaneko 模型使用叶面法线与来流方向的夹角 $\phi_U$ 描述姿态。局部攻角 $\alpha_U$ 与 $\phi_U$ 互余：
$$
\phi_U=\frac{\pi}{2}-\alpha_U, \qquad \sin\alpha_U=\cos\phi_U
$$
因此最终得到：
$$
L=l\rho_f\pi U^2\cos\phi_U
\tag{29}
$$

<a id="thin-plate-moment"></a>
### 5.2、升力矩
&emsp;&emsp;薄板的理想压心位于距前缘 $l/4$ 处，而质心位于弦中点 $l/2$ 处。升力作用线与质心之间的距离为：
$$
r_p=\frac{l}{2}-\frac{l}{4}=\frac{l}{4}
$$
该偏移在垂直于升力方向上的投影为：
$$
r_{\perp}=\frac{l}{4}\cos\alpha_U
$$
由于 $\cos\alpha_U=\sin\phi_U$，式 (29) 中的升力对质心产生的力矩为：
$$
M=-\frac{1}{4}Ll\sin\phi_U
\tag{30}
$$
负号表示力矩把叶面法线拧向更接近来流的方向。纸片绕质心的转动惯量为：
$$
I=\frac{1}{12}m_pl^2
$$
将式 (30) 的力矩除以转动惯量，得到恢复角加速度：
$$
\dot{\omega}_M
=\frac{M}{I}
=-\frac{3\pi\rho_fU^2}{m_p}
\cos\phi_U\sin\phi_U
$$
若定义等效密度参数：
$$
\rho=\frac{\rho_fl}{m_p}
$$
则恢复角加速度可以写成：
$$
\dot{\omega}_M
=-\frac{3\pi\rho U^2}{l}
\cos\phi_U\sin\phi_U
\tag{31}
$$
当叶面平面与来流平行时，法线垂直于来流，$\phi_U=90^\circ$，$\cos\phi_U\sin\phi_U$ 达到最大值；当叶面平面垂直于来流，叶面法线与来流同向或反向时，$\phi_U$ 分别为 $0^\circ$ 或 $180^\circ$，恢复力矩重新趋近于零。

## 6、运动方程
### 6.1、组合参数
&emsp;&emsp;论文使用以下两个参数控制摩擦各向异性与流固惯性比：
$$
f\equiv\frac{k_\parallel}{k_\perp}, \qquad
\rho\equiv\frac{\rho_fl}{m_p}
\tag{32}
$$
其中 $f$ 描述平行摩擦与垂直摩擦的比例，$\rho$ 由流体密度、纸片长度与质量共同决定。

### 6.2、常微分方程组
&emsp;&emsp;将式 (2) 的平动摩擦、式 (3) 的转动摩擦、式 (6) 的升力分量、式 (31) 的恢复角加速度和重力合并，并使用式 (32) 的组合参数，得到支配纸片运动的四维常微分方程组：
$$
\begin{aligned}
\dot{u}
&=-\left(k_\perp\sin^2\theta+k_\parallel\cos^2\theta\right)u
+\left(k_\perp-k_\parallel\right)\sin\theta\cos\theta\,v
\mp\pi\rho V^2\cos\left(\alpha+\theta\right)\cos\alpha \\
\dot{v}
&=\left(k_\perp-k_\parallel\right)\sin\theta\cos\theta\,u
-\left(k_\perp\cos^2\theta+k_\parallel\sin^2\theta\right)v
\pm\pi\rho V^2\cos\left(\alpha+\theta\right)\sin\alpha-g \\
\dot{\omega}
&=-k_\perp\omega
-\frac{3\pi\rho V^2}{l}
\cos\left(\alpha+\theta\right)
\sin\left(\alpha+\theta\right) \\
\dot{\theta}
&=\omega
\end{aligned}
\tag{33}
$$
其中 $g$ 为重力加速度。

&emsp;&emsp;该系统的非线性来自两方面：摩擦项依赖纸片姿态 $\theta$，升力与力矩依赖速度和姿态的组合角 $\alpha+\theta$。一旦改变 $k_\perp$、$f$、$\rho$ 或 $l$，纸片的运动方式就可能从规则旋转变成不规则摆动，或者反过来变为垂直下落。

### 6.3、数值求解
&emsp;&emsp;论文使用四阶自适应 Runge-Kutta 方法数值积分上述方程。计算时先让起始阶段的影响逐渐消失，再记录速度 $(u,v)$ 的变化轨迹和质心 $(x,y)$ 的下落路径；同时比较初始状态非常接近的两条轨迹，观察它们最终是否逐渐分开。

## 7、五种下落模式
&emsp;&emsp;论文在 $\rho=0.1$、$l=1.0\ \mathrm{m}$ 时，通过改变 $k_\perp$ 和 $f=k_\parallel/k_\perp$ 得到五种基本模式，并绘制了各模式在参数平面上的分布。

<p align="center">
  <img src="素材/Tanabe-Kaneko 模型/图片/五种下落模式分布图.png" alt="Tanabe-Kaneko 论文中 PR、CR、CF、PF 与 SPF 五种模式的分布" style="width: 100%; max-width: 900px; height: auto;">
</p>

图 2：论文中的五种下落模式分布图，横轴为 $k_\perp$，纵轴为 $f$，原图裁自论文 [1]。

### 7.1、周期旋转（PR）
&emsp;&emsp;$k_\perp$ 较小时，纸片在起始阶段的摆动逐渐消失后，会稳定地向某一侧下落，并一直朝同一方向旋转。若初始条件不同，纸片可能向左侧或右侧下落，旋转方向也可能为顺时针或逆时针。

### 7.2、不规则旋转（CR）
&emsp;&emsp;略高于 PR 区域的 $k_\perp$ 时，纸片速度 $(u,v)$ 的变化不会再稳定重复，轨迹会变得复杂；但它整体仍然是一边旋转、一边向某一侧下落，所以宏观下落路径与周期旋转相似。两个非常接近的初始状态，最终也可能逐渐分离成不同的运动轨迹。

### 7.3、不规则颤振（CF）
&emsp;&emsp;继续增大 $k_\perp$，纸片会一边下落，一边无规则地左右摆动。与 PR、CR 中左右方向的不对称不同，CF 恢复左右统计对称：单次轨迹没有固定偏向，但长时间的水平位移可以用随机游走近似。

&emsp;&emsp;论文指出，在 $k_\perp=6.0$ 附近，水平位移 $\delta x(t)$ 的分布可以由高斯扩散形式拟合：
$$
P\left(\delta x\right)\propto
\exp\left[-\frac{\left(\delta x\right)^2}{4Dt}\right]
$$
对应扩散常数约为 $D=13.8\ \mathrm{m^2/s}$。

### 7.4、周期颤振（PF）
&emsp;&emsp;当摩擦进一步增大，运动重新变得规则。纸片会交替向左右摆动，质心轨迹呈“之”字形，而 $(u,v)$ 平面上的轨道近似为“8”字。随着 $k_\perp$ 继续增大，颤振振幅逐渐减小。

### 7.5、简单垂直下落（SPF）
&emsp;&emsp;当摩擦足够强时，横向运动与旋转最终消失：
$$
u=\omega=\theta=0, \qquad
v=-\frac{g}{k_\perp}
$$
纸片最终沿竖直方向匀速下落。较大的 $k_\perp$ 表示较强的黏性阻力。

## 8、结论
&emsp;&emsp;Tanabe-Kaneko 模型说明，不需要完整求解 Navier-Stokes 方程，仅依赖升力、各向异性线性摩擦和重力，就可以生成周期旋转、周期颤振以及看似随机、不会稳定重复的运动。模型还能描述纸片向左或向右下落的选择、运动周期逐级改变，以及规则与不规则运动交替出现的现象。

&emsp;&emsp;这一结论是定性的。模型将纸片视为二维零厚度刚体，不描述真实纸片的面外弯曲、翅曲和局部变形，也没有显式求解涡街脱落。升力部分采用完美流体的准定常近似，摩擦则是人为加入的线性项。因此，它适合揭示下落纸片的低维动力学结构，不能直接用于定量预测真实纸片或树叶的完整三维运动。

&emsp;&emsp;论文也指出，只有在 $k_\perp>k_\parallel$ 时才会出现丰富的下落模式；当 $f=k_\parallel/k_\perp$ 接近 $1$ 时，不规则运动出现的参数范围逐渐缩小并消失。

## 9、延伸阅读
- 作品：[Unity 实时柔性体与粒子流体系统](<../../../../作品/计算机图形学/物理/Unity 实时柔性体与粒子流体系统：基于 XPBD 与 PBF 的物理模拟.md>)
- 文章：[基于 Tanabe-Kaneko 模型的落叶模拟](<../../../../文章/计算机图形学/物理/空气动力学仿真/基于 Tanabe-Kaneko 模型的落叶模拟.md>)
- 笔记：[空气动力学的一些基础定理](../../../物理/流体力学/空气动力学/空气动力学的一些基础定理.md)
