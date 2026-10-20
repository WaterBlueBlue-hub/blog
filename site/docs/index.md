---
layout: home
titleTemplate: false

hero:
  name: WaterBlueBlue
  text: 从约束流形到 PBF 流体
  tagline: 把 XPBD 解算器从零写一遍之后，顺手记下的推导、实现细节与踩坑。
  image:
    src: /avatar.png
    alt: WaterBlueBlue
  actions:
    - theme: brand
      text: 浏览笔记
      link: /notes/
    - theme: alt
      text: 关于我
      link: /about.html

features:
  - title: 推导从零开始
    details: 约束流形、雅可比、λ 乘子——每个式子都自己推过一遍，而不是抄一个结论。
  - title: 对着代码写
    details: 笔记里的每一条结论，都能在工程里找到对应的那一行实现。
  - title: 踩过的坑
    details: 阻尼调不出来、裙摆绕体、波场噪声……失败的过程也一并记下来。
  - title: 持续更新
    details: 目前 28 篇，按主题分成 7 组，跟着项目继续补。
---

<FluidTank />

<div class="home-panel">

<p class="home-section-title">常读的几篇</p>
<p class="home-section-desc">如果只看一篇，从这里开始。</p>

<div class="topic-grid">
  <a class="topic-card" href="/notes/simulation/xpbd.html">
    <h3>基于位置的扩展动力学（XPBD）</h3>
    <p>从约束流形讲到 λ 乘子：PBD 为什么会被迭代次数绑架，XPBD 又是怎么解开的。</p>
  </a>
  <a class="topic-card" href="/notes/constraints/bending.html">
    <h3>弯曲约束</h3>
    <p>二面角约束的梯度推导，以及约束对整体平移不变所隐含的那条关系。</p>
  </a>
  <a class="topic-card" href="/notes/numerics/integrators.html">
    <h3>数值积分器与迭代法</h3>
    <p>显式/隐式欧拉、Verlet、Gauss-Seidel 与 Jacobi：稳定性从哪里来。</p>
  </a>
  <a class="topic-card" href="/notes/fluid/kernels.html">
    <h3>SPH 核函数</h3>
    <p>Poly6、Spiky、粘性核的形状、归一化与梯度，PBF 密度约束的地基。</p>
  </a>
  <a class="topic-card" href="/notes/cs/job-system.html">
    <h3>Job System</h3>
    <p>指令少、重复多——数据并行在实时物理里该怎么落地，以及 NativeContainer 的生命周期。</p>
  </a>
  <a class="topic-card" href="/notes/math-mechanics/continuum-mechanics.html">
    <h3>连续介质力学</h3>
    <p>应变、应力与本构关系：为什么"弹簧质点"能近似一块布。</p>
  </a>
</div>

<p class="home-section-title">关于这个站</p>

这些笔记起初只是写给自己看的：想不清楚的地方就停下来推一遍，踩过的坑就顺手记一笔。
现在把它们整理出来——如果你也在做实时物理模拟，希望其中某一篇能让你少绕一点路。

全部内容用 Markdown 维护、公式是 LaTeX，侧边栏与搜索都从笔记目录自动生成。
想按主题翻，去 [笔记总览](/notes/)；想找某个关键词，按右上角的搜索（或 <kbd>Ctrl</kbd> + <kbd>K</kbd>）。

</div>
