# LaTeX 数学公式速查
&emsp;&emsp;本文整理 Markdown 笔记中最常用的 LaTeX 数学语法，重点覆盖 KaTeX 与 MathJax 共同支持的基础写法。除独立公式、多行对齐和矩阵等环境外，大部分命令也可以直接用于行内公式。

## 1、基本写法
&emsp;&emsp;Markdown 中的行内公式使用 `$...$`，独立公式使用独占一行的 `$$...$$`。行内公式适合变量、短表达式和简短关系式；独立公式适合较长、需要居中展示或包含多行结构的内容。

```markdown
行内公式：$E = mc^2$

独立公式：
$$
E = mc^2
$$
```

&emsp;&emsp;上面的行内公式会显示为 $E = mc^2$，独立公式会显示为：
$$
E = mc^2
$$

&emsp;&emsp;命令中的反斜杠用于区分普通字符和 LaTeX 命令，例如 `\alpha`、`\frac`。在数学环境中直接写 `\alpha`，不需要写成 `\\alpha`；只有在公式内表示换行时，才使用 `\\`。

## 2、希腊字母
&emsp;&emsp;希腊字母由反斜杠加英文名称表示，大小写通过首字母区分。需要注意的是，只有部分大写希腊字母拥有独立的 LaTeX 命令，例如 $\Gamma$、$\Delta$、$\Theta$、$\Lambda$、$\Xi$、$\Pi$、$\Sigma$、$\Upsilon$、$\Phi$、$\Psi$、$\Omega$；其余大写形式通常直接使用对应的拉丁字母。

```latex
\alpha,\ \beta,\ \gamma,\ \delta,\ \epsilon,\ \varepsilon
\theta,\ \vartheta,\ \lambda,\ \mu,\ \pi,\ \rho
\sigma,\ \phi,\ \varphi,\ \omega

\Gamma,\ \Delta,\ \Theta,\ \Lambda,\ \Xi,\ \Pi
\Sigma,\ \Upsilon,\ \Phi,\ \Psi,\ \Omega
```

$$
\alpha,\ \beta,\ \gamma,\ \delta,\ \epsilon,\ \varepsilon,\
\theta,\ \vartheta,\ \lambda,\ \mu,\ \pi,\ \rho,\
\sigma,\ \phi,\ \varphi,\ \omega
$$

$$
\Gamma,\ \Delta,\ \Theta,\ \Lambda,\ \Xi,\ \Pi,\
\Sigma,\ \Upsilon,\ \Phi,\ \Psi,\ \Omega
$$

## 3、上下标与字体
&emsp;&emsp;下划线 `_` 表示下标，尖号 `^` 表示上标。当上下标包含多个字符，或本身带有命令时，需要用花括号把它们作为一个整体包裹起来。

```latex
x_i^2,\quad x_{ij},\quad x^{y+z},\quad e^{-x^2}
```

$$
x_i^2,\quad x_{ij},\quad x^{y+z},\quad e^{-x^2}
$$

&emsp;&emsp;变量和函数名通常保持数学斜体；描述性多字母标记、单位和数字应使用直立体。需要加粗向量或矩阵时，优先使用 `\mathbf`；希腊字母的粗体则应使用 `\boldsymbol`。

```latex
\mathrm{d}x,\quad \mathrm{SNR},\quad \mathbf{x}
\quad \boldsymbol{\theta},\quad \mathcal{L},\quad \mathbb{R}
```

$$
\mathrm{d}x,\quad \mathrm{SNR},\quad \mathbf{x}
\quad \boldsymbol{\theta},\quad \mathcal{L},\quad \mathbb{R}
$$

&emsp;&emsp;常用字体命令包括 `\mathrm`、`\mathbf`、`\mathit`、`\mathcal`、`\mathbb` 和 `\boldsymbol`。`\mathscr` 也可用于花体字母，但不同渲染器对其支持并不完全一致，发布前应确认网站能否正常显示。

## 4、分式与根式
&emsp;&emsp;`\frac{分子}{分母}` 用于生成分式。行内公式中如果希望分式保持较大的字号，可以使用 `\dfrac`；嵌套分式过长时，可改用指数或斜线形式以减少行高。

```latex
\frac{1}{2},\quad \frac{a+b}{c+d}
\frac{\partial f}{\partial x},\quad \dfrac{1}{x}
```

$$
\frac{1}{2},\quad \frac{a+b}{c+d},
\quad \frac{\partial f}{\partial x},\quad \dfrac{1}{x}
$$

&emsp;&emsp;根式使用 `\sqrt{...}`，任意次根则把次数写在方括号中。

```latex
\sqrt{2},\quad \sqrt{x+y},\quad \sqrt[3]{x+y}
```

$$
\sqrt{2},\quad \sqrt{x+y},\quad \sqrt[3]{x+y}
$$

## 5、关系符与集合符号
&emsp;&emsp;常见关系符和集合符号如下。

```latex
\pm,\ \mp,\ \times,\ \cdot,\ \div
\ne,\ \approx,\ \equiv,\ \le,\ \ge,\ \ll,\ \gg
\propto,\ \sim

x\in A,\quad x\notin A
\quad A\subset B,\quad A\subseteq B,\quad A\subsetneq B
\quad A\cap B,\quad A\cup B
\quad A\setminus B

\forall x\in A,\quad \exists x\in A,\quad \nexists x\in A
\quad \varnothing,\quad \because,\quad \therefore
```

$$
\pm,\ \mp,\ \times,\ \cdot,\ \div,\
\ne,\ \approx,\ \equiv,\ \le,\ \ge,\ \ll,\ \gg,\
\propto,\ \sim
$$

$$
x\in A,\quad x\notin A,\quad A\subset B,\quad A\subseteq B,\quad A\subsetneq B,
\quad A\cap B,\quad A\cup B,\quad A\setminus B
$$

$$
\forall x\in A,\quad \exists x\in A,\quad \nexists x\in A,
\quad \varnothing,\quad \because,\quad \therefore
$$

```latex
\infty,\quad \partial,\quad \nabla
```

$$
\infty,\quad \partial,\quad \nabla
$$

&emsp;&emsp;常见数集可写为 $\mathbb{N}$、$\mathbb{Z}$、$\mathbb{Q}$、$\mathbb{R}$ 和 $\mathbb{C}$。当符号右侧包含多个字符时，同样要用花括号包裹，例如 $\mathbb{R}_{+}$。

## 6、函数与大型运算符
&emsp;&emsp;正弦、对数、极限等标准函数应使用对应的命令，而不是直接输入字母。这样函数名会以直立体显示，并与变量之间保留正确的间距。

```latex
\sin x,\quad \cos x,\quad \tan x
\quad \sec x,\quad \cosh x,\quad \exp x
\quad \ln x,\quad \lg x,\quad \log_2 x

\lim_{x\to 0}\frac{\sin x}{x}
\quad \max_{x\in A} f(x)
\quad \min_{x\in A} f(x)
```

$$
\sin x,\quad \cos x,\quad \tan x,\quad \sec x,
\quad \cosh x,\quad \exp x,\quad \ln x,\quad \lg x,\quad \log_2 x
$$

$$
\lim_{x\to 0}\frac{\sin x}{x},\quad
\max_{x\in A} f(x),\quad
\min_{x\in A} f(x)
$$

&emsp;&emsp;求和、连乘和积分使用大型运算符。上下限中的复杂内容要放在花括号中；积分末尾的微分号通常使用直立体 `\mathrm{d}`，并在前面加入 `\,` 留出细小间距。

```latex
\sum_{i=1}^{n}a_i,\quad
\prod_{i=1}^{n}x_i

\int_{a}^{b}f(x)\,\mathrm{d}x,\quad
\iint_{D}f(x,y)\,\mathrm{d}x\,\mathrm{d}y,\quad
\iiint_{V}f(x,y,z)\,\mathrm{d}V,\quad
\oint_{C}\mathbf{F}\cdot\mathrm{d}\mathbf{r}
```

$$
\sum_{i=1}^{n}a_i,\quad
\prod_{i=1}^{n}x_i
$$

$$
\int_{a}^{b}f(x)\,\mathrm{d}x,\quad
\iint_{D}f(x,y)\,\mathrm{d}x\,\mathrm{d}y,\quad
\iiint_{V}f(x,y,z)\,\mathrm{d}V,\quad
\oint_{C}\mathbf{F}\cdot\mathrm{d}\mathbf{r}
$$

## 7、标注符号与箭头
&emsp;&emsp;向量、导数点、估计量和线段常用等宽标注符号。单字符可以省略花括号，多字符则应使用花括号。

```latex
\vec{v},\quad \hat{x},\quad \bar{x},\quad \tilde{x}
\quad \dot{x},\quad \ddot{x},\quad \mathring{a}

\overrightarrow{AB},\quad \overline{AB}
```

$$
\vec{v},\quad \hat{x},\quad \bar{x},\quad \tilde{x},
\quad \dot{x},\quad \ddot{x},\quad \mathring{a},\quad
\overrightarrow{AB},\quad \overline{AB}
$$

&emsp;&emsp;箭头常用于表示映射、极限、推导和等价关系。

```latex
\to,\quad \leftarrow,\quad \leftrightarrow
\quad \Rightarrow,\quad \Leftarrow,\quad \Leftrightarrow

\mapsto,\quad \implies,\quad \iff
\quad \longleftarrow,\quad \longrightarrow,\quad \longleftrightarrow
```

$$
\to,\quad \leftarrow,\quad \leftrightarrow,
\quad \Rightarrow,\quad \Leftarrow,\quad \Leftrightarrow,
\quad \mapsto,\quad \implies,\quad \iff,\quad \longleftarrow
$$

## 8、括号与定界符
&emsp;&emsp;普通括号可以直接输入。当括号内部包含分式、求和或上下标，需要括号随内容自动缩放时，应使用 `\left` 和 `\right`。二者必须成对出现；如果只需要显示一侧，另一侧用点号占位，例如 `\left.` 或 `\right.`。

```latex
\left(\frac{a+b}{c}\right),\quad
\left[\frac{a+b}{c}\right],\quad
\left\{\frac{a+b}{c}\right\}
```

$$
\left(\frac{a+b}{c}\right),\quad
\left[\frac{a+b}{c}\right],\quad
\left\{\frac{a+b}{c}\right\}
$$

&emsp;&emsp;绝对值与范数建议使用 `\lvert ... \rvert` 和 `\lVert ... \rVert`，它们在间距处理上比直接输入竖线更稳定。

```latex
\lvert x\rvert,\quad \lVert\mathbf{x}\rVert,\quad
\lceil x\rceil,\quad \lfloor x\rfloor
```

$$
\lvert x\rvert,\quad \lVert\mathbf{x}\rVert,\quad
\lceil x\rceil,\quad \lfloor x\rfloor
$$

&emsp;&emsp;在公式右侧添加求值条件时，可以先放一个空的左定界符，再用 `\right|` 生成右侧竖线。

```latex
\left.\frac{\partial f}{\partial x}\right|_{x=0}
```

$$
\left.\frac{\partial f}{\partial x}\right|_{x=0}
$$

## 9、多行公式与分段函数
&emsp;&emsp;需要在多行之间对齐等号或关系符时，使用 `aligned` 环境，并在需要对齐的位置写 `&`，用 `\\` 换行。`aligned` 可以嵌入 Markdown 的独立公式中，兼容性通常比完整 LaTeX 文档中的 `align` 环境更好。

```latex
$$
\begin{aligned}
(a+b)^2 &= a^2+2ab+b^2\\
&= b^2+2ab+a^2
\end{aligned}
$$
```

$$
\begin{aligned}
(a+b)^2 &= a^2+2ab+b^2\\
&= b^2+2ab+a^2
\end{aligned}
$$

&emsp;&emsp;分段函数使用 `cases` 环境。每一行先写函数值，再写 `&` 和对应条件，行末用 `\\` 换行。

```latex
$$
f(x)=
\begin{cases}
\sin x, & -\pi\le x\le \pi,\\
0, & \text{其他}.
\end{cases}
$$
```

$$
f(x)=
\begin{cases}
\sin x, & -\pi\le x\le \pi,\\
0, & \text{其他}.
\end{cases}
$$

## 10、矩阵与行列式
&emsp;&emsp;`matrix` 只生成矩阵内容，不添加括号；`pmatrix`、`bmatrix` 和 `Bmatrix` 分别生成圆括号、方括号和花括号，`vmatrix` 与 `Vmatrix` 则用于行列式。矩阵列之间用 `&` 分隔，行末用 `\\` 换行。

```latex
$$
\mathbf{A}=
\begin{bmatrix}
a & b\\
c & d
\end{bmatrix},\qquad
\det\mathbf{A}=
\begin{vmatrix}
a & b\\
c & d
\end{vmatrix}
=ad-bc
$$
```

$$
\mathbf{A}=
\begin{bmatrix}
a & b\\
c & d
\end{bmatrix},\qquad
\det\mathbf{A}=
\begin{vmatrix}
a & b\\
c & d
\end{vmatrix}
=ad-bc
$$

&emsp;&emsp;较大的矩阵常用 `\cdots`、`\vdots` 和 `\ddots` 表示水平、垂直和对角方向的省略项。

```latex
$$
\mathbf{B}=
\begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n}\\
a_{21} & a_{22} & \cdots & a_{2n}\\
\vdots & \vdots & \ddots & \vdots\\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$$
```

$$
\mathbf{B}=
\begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n}\\
a_{21} & a_{22} & \cdots & a_{2n}\\
\vdots & \vdots & \ddots & \vdots\\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$$

## 11、文本、运算符与间距
&emsp;&emsp;公式中的说明文字应放进 `\text{...}`，自定义函数名可以使用 `\operatorname{...}`。这样不仅能保证字母直立，也能让 LaTeX 正确处理函数与变量之间的间距。

```latex
\mathrm{SNR}_{\mathrm{dB}}
=20\log_{10}\left(
\frac{A_{\mathrm{signal}}}{A_{\mathrm{noise}}}
\right)

\operatorname{softmax}(\mathbf{z})_i
=\frac{e^{z_i}}{\sum_{j=1}^{n}e^{z_j}}
```

$$
\mathrm{SNR}_{\mathrm{dB}}
=20\log_{10}\left(
\frac{A_{\mathrm{signal}}}{A_{\mathrm{noise}}}
\right)
$$

$$
\operatorname{softmax}(\mathbf{z})_i
=\frac{e^{z_i}}{\sum_{j=1}^{n}e^{z_j}}
$$

&emsp;&emsp;`\,`、`\quad` 和 `\qquad` 分别表示逐渐增大的水平间距。普通文字与公式之间通常由 Markdown 自动处理，不需要在公式中反复插入空格。

```latex
a\,b,\qquad a\quad b,\qquad a\qquad b
```

$$
a\,b,\qquad a\quad b,\qquad a\qquad b
$$

## 12、综合示例
&emsp;&emsp;下面的高斯概率密度函数同时用到了分式、根式、上下标、指数函数、自动缩放括号和文本命令：

```latex
$$
p(x)
=\frac{1}{\sqrt{2\pi}\sigma}
\exp\left(
-\frac{(x-\mu)^2}{2\sigma^2}
\right),
\qquad x\in\mathbb{R}
$$
```

$$
p(x)
=\frac{1}{\sqrt{2\pi}\sigma}
\exp\left(
-\frac{(x-\mu)^2}{2\sigma^2}
\right),
\qquad x\in\mathbb{R}
$$
其中，$\mu$ 为均值，$\sigma$ 为标准差。书写复杂公式时，可以按“先写出结构，再补局部符号，最后检查括号和环境配对”的顺序组织，避免在一个公式中同时排查语法与数学含义。
其中，$\mu$ 为均值，$\sigma$ 为标准差。书写复杂公式时，可以按“先写出结构，再补局部符号，最后检查括号和环境配对”的顺序组织，避免在一个公式中同时排查语法与数学含义。

## 13、常见错误
&emsp;&emsp;上下标包含多个字符时，必须加花括号。`x_{ij}` 会得到 $x_{ij}$，而 `x_ij` 只会把 `i` 作为下标，后面的 `j` 被当作普通字符。

&emsp;&emsp;`\left` 与 `\right` 必须成对使用。只写出其中一侧时，另一侧应使用 `\left.` 或 `\right.` 占位。

&emsp;&emsp;`aligned`、`cases` 和矩阵环境都依赖 `&` 与 `\\`，且 `\begin{...}` 与 `\end{...}` 中的环境名必须完全一致。修改多行公式后，应重点检查这两类配对。

&emsp;&emsp;变量、单位和说明文字应分别处理。变量通常写成 `x`，单位或缩写使用 `\mathrm{m/s}`、`\mathrm{SNR}`，公式中的自然语言说明使用 `\text{...}`。

&emsp;&emsp;角度符号应写成 `^{\circ}`，例如 $90^{\circ}$。`\degree` 并非 KaTeX 与 MathJax 的通用命令，直接使用可能导致渲染失败。

&emsp;&emsp;`\mathbf` 适合加粗拉丁字母，希腊字母应使用 `\boldsymbol{\theta}`。如果网站对 `\mathscr`、`\oiint` 等扩展命令支持不完整，应优先替换为兼容性更好的写法。
