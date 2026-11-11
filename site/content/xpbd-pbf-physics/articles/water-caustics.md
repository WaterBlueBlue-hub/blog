---
title: "焦散"
outline: [2, 3]
aside: true
---

# 焦散
&emsp;&emsp;焦散是水面把入射光折射并汇聚到池底后形成的亮纹。它不直接改变水面本身的颜色，而是改变水下表面收到的辐照度。光照是否汇聚由相邻光线在池底的落点是否相互靠近决定。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/项目焦散预览.webp" alt="项目水池的扩散涟漪在池底形成动态折射焦散" style="width: 100%; max-width: 900px; height: auto;">
</p>
<p align="center"><sub>项目实拍：扩散涟漪通过折射在池底形成环形焦散。</sub></p>

## 1、渲染管线
&emsp;&emsp;`FluidCausticsRenderer` 使用当帧波场、太阳方向、池底深度和水体吸收参数生成一张焦散纹理，再把纹理作为叠加层绘制到池底。与屏幕空间折射不同，焦散只影响水下表面收到的光，不改变水面当前像素的反射或折射颜色。

<p align="center">
  <img loading="lazy" src="/xpbd-pbf-physics/media/项目焦散.gif" alt="项目浅水池中随涟漪移动的折射焦散" style="width: 100%; max-width: 720px; height: auto;">
</p>
<p align="center"><sub>项目实拍：焦散亮纹随扩散涟漪连续改变形状和位置。</sub></p>

## 2、从池底像素反求水面点
&emsp;&emsp;对池底像素，计算器先假设一个水面采样位置，按 Snell 定律把太阳入射方向折射到水下：
$$
\mathbf{r}_{\mathrm{refract}}
=\operatorname{refract}
\left(
\mathbf{i},
\mathbf{n},
\frac{1}{\eta}
\right)
$$
再从水面点沿折射方向投影到池底。若投影落点与该池底像素不一致，就修正水面采样位置并迭代。项目使用 3 次固定迭代，使水面波纹带来的视线偏移得到近似反解。

## 3、面积雅可比
&emsp;&emsp;得到水面采样点后，再取周围一小步的水面点投影到池底。设两个方向的投影差为 $\mathbf{q}_u$ 与 $\mathbf{q}_v$，面积放缩倍率为：
$$
M
=\frac{4\Delta u\Delta v}
{\left|\det\left(\mathbf{q}_u,\mathbf{q}_v\right)\right|}
$$
当 $M>1$ 时，相邻光线在池底汇聚，亮度增加；当 $M<1$ 时，光线发散，亮度降低。亮暗带因此直接由水面法线和真实折射方向决定。

## 4、RGB 色散
&emsp;&emsp;项目对红、绿、蓝分别使用略有差异的折射率，使三种颜色在池底的投影位置产生细微分离：
$$
\eta_g=\frac{1}{1.333},
\qquad
\eta_r=\eta_g+\delta,
\qquad
\eta_b=\eta_g-\delta
$$
最终焦散颜色还会乘以水体透射率与太阳亮度。`causticDispersion` 控制物理光路分离，`causticChromaticOffset` 只补偿最终显示中可能不足一个像素的色散。

## 5、启用条件与边界
&emsp;&emsp;只有启用 `enableRefractionCaustics`、浅水波场有效、水面高于池底且主光向下照射时才会生成焦散。池底越深、浊度越大，焦散越弱。

&emsp;&emsp;当前实现使用二维高度场和解析池底，因此适合浅水池、水面和河床之间没有复杂多层遮挡的场景。焦散贴图采用乘性叠加，只提亮池底原本可接收光的区域，避免绕过池底底色和阴影。

## 6、延伸阅读
- 作品：[Unity 实时柔性体与粒子流体系统](/projects/xpbd-pbf-physics/)
- 文章：[基础水体着色](/articles/graphics/water-shading/)、[基于二维波动方程的浅水波场](/articles/graphics/shallow-water-wave-field/)
- 笔记：[水体着色概览](/notes/graphics-rendering/water-shading-overview.html)
