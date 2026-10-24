# ACN-Estimation：基于纹理—几何耦合的自然材质法线估计

## 基于纹理—几何耦合的自然材质法线估计

&emsp;&emsp;ACN-Estimation 是一个离线 Windows 工具，尝试直接从自然纹理的 Albedo 估计切线空间法线贴图。它重点关注当颜色明暗与表面起伏存在统计耦合时，能否用轻量、确定性的算法快速生成可用的法线原型。

![ACN-Estimation 界面与 Albedo、法线对照](../素材/ACN-Estimation/图片/cover.webp)

## 项目概览

| 项目 | 内容 |
| --- | --- |
| 版本 | v1.2.0 |
| 平台 | Windows 64 位 |
| 应用技术 | Python、Tkinter、OpenCV、NumPy、Pillow、scikit-image、SciPy |
| 渲染验证 | Unity 2022.3.62f3c1、URP 14.0.12 |
| 核心输入 | 自然纹理 Albedo |
| 核心输出 | 8 位切线空间法线贴图 |
| 源码 | [GitHub 仓库](https://github.com/WaterBlueBlue-hub/ACN-Estimation) |
| 下载 | [v1.2.0 Release](https://github.com/WaterBlueBlue-hub/ACN-Estimation/releases/tag/v1.2.0) |

## 演示视频

<video controls preload="metadata" poster="../素材/ACN-Estimation/视频/acn-estimation-demo-poster.webp">
  <source src="../素材/ACN-Estimation/视频/acn-estimation-demo-1080p.mp4" type="video/mp4">
  <track kind="subtitles" src="../素材/ACN-Estimation/视频/acn-estimation-demo.zh-CN.vtt" srclang="zh-CN" label="简体中文" default>
  当前浏览器不支持 HTML5 视频播放。
</video>

## 要解决的问题

&emsp;&emsp;传统法线贴图通常来自高模烘焙，或者由材质制作软件结合真实高度信息生成。对于游戏原型、风格化材质和快速视觉验证，这条流程有时偏重。自然纹理又常常表现出“明暗变化与凹凸起伏相关”的特征，因此可以先把灰度近似为高度场，再从图像梯度估计法线。
&emsp;&emsp;这个假设不是普遍成立的。木材纤维、拉丝方向和颗粒表面通常具有可利用的相关性；喷漆文字、标识和印刷图案的颜色边缘却与真实高度无关。ACN-Estimation 因而没有把目标设定为“从任意图片恢复真实几何”，而是研究算法在何种材质先验下有效，以及失效时会出现什么结果。

## 处理流程

```text
Albedo
  ↓
灰度化
  ↓
可选双边滤波
  ↓
Sobel 梯度
  ↓
X/Y 强度独立增强
  ↓
可选形态学条纹清理
  ↓
可选横向或纵向平均
  ↓
法线单位化与 RGB 编码
  ↓
预览、差异检查与导出
```

## 主要功能

- Sobel 梯度法线生成，X/Y 强度可分别调整。
- 双边滤波提供轻度、中度、强力三组预设，并支持 8 倍差异预览。
- 横向与纵向平均可独立开关，用于具有稳定方向性的材质。
- 可选的形态学条纹清理，支持横纵方向、R/G 通道和相对长度筛选。
- 支持 PNG、JPEG、BMP、TGA，兼容中文路径和 Alpha。
- 1024 像素防抖预览，导出时按原图分辨率重新计算。
- 原始贴图与生成法线使用等尺寸正方形预览。
- 支持 `Ctrl+Z` 撤销参数修改和图片切换，最多保留 20 步。

## 效果对比

&emsp;&emsp;固定参数下，各向同性木头可以得到较平滑的结果：

![各向同性木头对比](../素材/ACN-Estimation/图片/comparison-isotropic-wood.webp)

&emsp;&emsp;同一组参数应用到各向异性金属时，横向沟槽几乎消失：

![各向异性金属固定参数结果](../素材/ACN-Estimation/图片/comparison-fixed-parameters.webp)

&emsp;&emsp;将 Y 方向强度提高到 `40`，再依次执行形态学清理与横向平均后，条纹结构恢复，随机噪声受到抑制：

![各向异性金属优化结果](../素材/ACN-Estimation/图片/comparison-optimized.webp)

## 失败边界

&emsp;&emsp;集装箱纹理包含强烈的文字和印刷图案。算法会把文字亮度边缘错误解释成凹凸，即使继续调整参数也无法消除这个根本矛盾。

![集装箱文字失败案例](../素材/ACN-Estimation/图片/failure-container.webp)

&emsp;&emsp;因此，Albedo 到 Normal 是一个病态问题：单张颜色图可能对应多种真实几何。该工具适合自然纹理和方向性材质的快速原型，不适合替代高模烘焙，也不适合文字、标识和印刷图案的自动生产。

## 已知限制

- 结果依赖“颜色与高度相关”的材质假设。
- 高强度梯度会同步放大噪声。
- 方向平均只适用于具有平移对称性的纹理。
- 形态学条纹清理是强先验，默认关闭。
- 通用云端聊天模型不适合逐像素执行法线估计；更合理的 AI 方向是使用成对数据训练专用模型，并通过 ONNX Runtime、TorchScript 或 Unity Sentis 本地推理。

## 延伸阅读

- 文章：[ACN-Estimation：基于纹理—几何耦合的自然材质法线估计](../文章/ACN-Estimation：基于纹理—几何耦合的自然材质法线估计.md)
- 笔记：[噪声](../笔记/数字图像处理/噪声.md)、[滤波](../笔记/数字图像处理/滤波.md)、[滤波算子](../笔记/数字图像处理/滤波算子.md)
