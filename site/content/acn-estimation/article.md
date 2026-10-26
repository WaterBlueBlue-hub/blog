# ACN-Estimation：基于纹理—几何耦合的自然材质法线估计
&emsp;&emsp;法线贴图是实时渲染中表现微观表面细节的重要数据。传统流程通常依赖高模烘焙或专业材质制作软件，而自然纹理的颜色变化又经常与表面起伏存在相关性。ACN-Estimation 由此出发，尝试直接从 Albedo 估计切线空间法线。

<table>
  <thead>
    <tr>
      <th>Original<br>标配法线贴图</th>
      <th>Original<br>Unity 渲染结果</th>
      <th>ACN-Estimation<br>生成法线贴图</th>
      <th>ACN-Estimation<br>Unity 渲染结果</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="素材/ACN/图片/anisotropic-metal-original-normal.webp" alt="各向异性金属 Original 标配法线贴图" width="150"></td>
      <td><img src="素材/ACN/图片/anisotropic-metal-original-unity.webp" alt="各向异性金属 Original Unity 渲染结果" width="150"></td>
      <td><img src="素材/ACN/图片/anisotropic-metal-generated-normal.webp" alt="各向异性金属工具生成的法线贴图" width="150"></td>
      <td><img src="素材/ACN/图片/anisotropic-metal-generated-unity.webp" alt="各向异性金属工具生成的 Unity 渲染结果" width="150"></td>
    </tr>
  </tbody>
</table>

&emsp;&emsp;上图为各向异性金属在同一 Unity 光照环境下的对照：前两列是标配法线贴图与渲染结果，后两列是使用 ACN-Estimation 生成的法线贴图的结果。

<table>
  <thead>
    <tr>
      <th>Original<br>标配法线贴图</th>
      <th>Original<br>Unity 渲染结果</th>
      <th>ACN-Estimation<br>生成法线贴图</th>
      <th>ACN-Estimation<br>Unity 渲染结果</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="素材/ACN/图片/isotropic-wood-original-normal.webp" alt="各向同性木头 Original 标配法线贴图" width="150"></td>
      <td><img src="素材/ACN/图片/isotropic-wood-original-unity.webp" alt="各向同性木头 Original Unity 渲染结果" width="150"></td>
      <td><img src="素材/ACN/图片/isotropic-wood-generated-normal.webp" alt="各向同性木头工具生成的法线贴图" width="150"></td>
      <td><img src="素材/ACN/图片/isotropic-wood-generated-unity.webp" alt="各向同性木头工具生成的 Unity 渲染结果" width="150"></td>
    </tr>
  </tbody>
</table>

&emsp;&emsp;上图为各向同性木头在同一 Unity 光照环境下的对照：前两列是 Original 的标配法线贴图与渲染结果，后两列是 ACN-Estimation 生成的法线贴图的结果。

## 1、基本假设
### 1.1、把灰度图视为参数曲面
&emsp;&emsp;ACN-Estimation 并不认为一张 Albedo 真的保存了物体几何。它采用一个有限定条件的近似：先使用 OpenCV 的 `cv2.COLOR_BGR2GRAY` 把彩色 Albedo 压缩成单通道灰度场：
$$
I(x,y)=0.299R(x,y)+0.587G(x,y)+0.114B(x,y)
$$
随后再把 $I(x,y)$ 从 $[0,255]$ 归一化到 $[0,1]$，作为本次估计中使用的高度场 $f(x,y)$：
$$
f(x,y)=\frac{I(x,y)}{255}
$$
这样，二维图像坐标就能映射成一张参数曲面：
$$
\mathbf P(x,y)=\left(x,y,f(x,y)\right)
$$

&emsp;&emsp;固定 $x=x_0$，只让 $y$ 从 $y$ 变化到 $y+\Delta y$，曲面上两点的差向量为：
$$
\mathbf P(x_0,y+\Delta y)-\mathbf P(x_0,y)
=
\left(0,\Delta y,f(x_0,y+\Delta y)-f(x_0,y)\right)
$$

&emsp;&emsp;将差向量除以 $\Delta y$，就得到一条割线向量。令 $\Delta y\to0$，割线趋近曲面在该点沿 $y$ 方向的切线：
$$
T_y
=
\lim_{\Delta y\to0}
\frac{\mathbf P(x_0,y+\Delta y)-\mathbf P(x_0,y)}{\Delta y}
=
\left(0,1,\frac{\partial f}{\partial y}\right)
$$
同理，固定 $y$ 并让 $x$ 发生变化，可以得到沿 $x$ 方向的切向量：
$$
T_x=\left(1,0,\frac{\partial f}{\partial x}\right),\quad
T_y=\left(0,1,\frac{\partial f}{\partial y}\right)
$$

### 1.2、由切向量计算法线
&emsp;&emsp;将 $T_x$ 与 $T_y$ 叉乘，可以得到垂直于切平面的法线：
$$
\begin{aligned}
N(x,y)
&=T_x\times T_y\\
&=\left(1,0,\frac{\partial f}{\partial x}\right)
\times
\left(0,1,\frac{\partial f}{\partial y}\right)\\
&=\left(
-\frac{\partial f}{\partial x},
-\frac{\partial f}{\partial y},
1
\right)\\
&=\left(-\nabla f,1\right)
\end{aligned}
$$
上式得到的只是一个方向与法线相同的向量，它的长度通常不为 1。因此还必须进行单位化：
$$
\hat{\mathbf n}
=
\frac{N}{\left\|N\right\|}
=
\frac{
\left(-f_x,-f_y,1\right)
}{
\sqrt{f_x^2+f_y^2+1}
}
$$

### 1.3、Sobel 离散实现与法线编码
&emsp;&emsp;图像是离散像素，无法直接求连续偏导，因此使用 $3\times3$ Sobel 算子近似 $x$ 与 $y$ 方向梯度。实现时先把灰度归一化到 $[0,1]$，再计算 $dx$ 和 $dy$：

```python
gray_f = gray.astype(np.float32) / 255.0
dx = cv2.Sobel(gray_f, cv2.CV_32F, 1, 0, ksize=3)
dy = cv2.Sobel(gray_f, cv2.CV_32F, 0, 1, ksize=3)
```

&emsp;&emsp;把离散梯度代入法线公式，并为两个方向分别增加强度系数 $s_x$、$s_y$ 以实现经纬向解耦：
$$
N_d(x,y)=
\left(
-dx\cdot s_x,
-dy\cdot s_y,
1
\right)
$$
随后将向量归一化，并映射到纹理可存储的 $[0,255]$：
$$
\hat{\mathbf n}=\frac{N_d}{\left\|N_d\right\|+\varepsilon},
\qquad
\mathbf C=
\operatorname{round}
\left(255\left(0.5\hat{\mathbf n}+0.5\right)\right)
$$

```python
h, w = gray_f.shape
normal = np.zeros((h, w, 3), dtype=np.float32)
normal[..., 0] = -dx * intensity_x
normal[..., 1] = -dy * intensity_y
normal[..., 2] = 1.0

normal /= np.linalg.norm(normal, axis=2, keepdims=True) + 1e-6
normal_rgb = ((normal * 0.5 + 0.5) * 255).astype(np.uint8)
```

&emsp;&emsp;编码后的 RGB 不再表示表面颜色，而是保存三个方向分量。中性平坦区域接近 `RGB(128, 128, 255)`；R、G 通道的偏移越大，说明局部法线越偏向 $x$ 或 $y$ 方向。

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 50%; padding: 8px;">
      <img src="素材/ACN/图片/anisotropic-metal-y40-normal.webp" alt="各向异性金属高强度 Y 梯度法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px; word-wrap: break-word;">各向异性金属<br><b>Sobel_intensity_y=40</b></div>
    </td>
    <td align="center" valign="top" style="width: 50%; padding: 8px;">
      <img src="素材/ACN/图片/anisotropic-metal-y40-unity.webp" alt="各向异性金属高强度 Y 梯度 Unity 渲染结果" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px; word-wrap: break-word;">各向异性金属 Unity 渲染结果<br><b>Sobel_intensity_y=40</b></div>
    </td>
  </tr>
</table>

&emsp;&emsp;上图为各向异性金属增强 $y$ 方向梯度后的初步结果。左侧法线贴图中已经恢复出横向沟槽，右侧 Unity 渲染也表现出了对应的方向性凹凸，说明仅依靠 Albedo 梯度可以得到可辨识的法线效果。与此同时，高强度梯度也放大了噪声，因此后续还需要对随机噪声进行滤除。

## 2、横向与纵向平均
### 2.1、横向平均
&emsp;&emsp;对于一些特例，抑制噪声可以使用一个带有明显材质先验的取巧方法：当纹理在某个方向上近似平移不变，而结构主要沿另一个方向变化时，就沿不变方向对 Sobel 梯度取均值，再把这一均值复制回整行或整列。这样做相当于把该方向上的随机波动平均掉，同时保留另一个方向上的结构差异。

&emsp;&emsp;横向平均固定图像中的每一行，对整行范围内 $x$ 方向的梯度取均值。设图像宽度为 $W$、Sobel 梯度为 $dx(x,y)$ 与 $dy(x,y)$，则第 $y$ 行的平均梯度为：
$$
\overline{dx}(y)=\frac{1}{W}\sum_{x=0}^{W-1}dx(x,y),
\qquad
\overline{dy}(y)=\frac{1}{W}\sum_{x=0}^{W-1}dy(x,y)
$$
随后把这一行的所有梯度都替换为对应均值：
$$
dx(x,y)\leftarrow\overline{dx}(y),
\qquad
dy(x,y)\leftarrow\overline{dy}(y)
$$

&emsp;&emsp;横向平均保留了不同行之间的变化，只消除同一行内部的随机波动，因此适合沿横向连续延伸的条纹结构。纵向平均同理，只是改为保留不同列之间的变化，并消除同一列内部的随机波动。

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 50%; padding: 8px;">
      <img src="素材/ACN/图片/anisotropic-metal-generated-normal.webp" alt="各向异性金属横向平均后的法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px; word-wrap: break-word;">各向异性金属<br><b>Sobel_intensity_y=40_avg</b></div>
    </td>
    <td align="center" valign="top" style="width: 50%; padding: 8px;">
      <img src="素材/ACN/图片/anisotropic-metal-generated-unity.webp" alt="各向异性金属横向平均后的 Unity 渲染结果" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px; word-wrap: break-word;">各向异性金属 Unity 渲染结果<br><b>Sobel_intensity_y=40_avg</b></div>
    </td>
  </tr>
</table>

&emsp;&emsp;上图为各向异性金属应用横向平均后的结果。

## 3、形态学滤波去噪
&emsp;&emsp;双边滤波、中值滤波等直接作用在灰度或梯度上的方法，主要根据局部振幅和邻域关系处理像素，难以判断哪些高频变化属于有效条纹、哪些属于孤立噪声。当材质具有稳定的方向结构时，还可以进一步利用法线贴图的通道约束和条纹的几何形状，对编码后的法线贴图进行筛选与清理。

### 3.1、法线通道分析
&emsp;&emsp;还是按之前的例子，将生成的法线贴图拆分为 R、G、B 三个通道后，各通道承担的信息和噪声来源会更清楚：

<table border="0" style="width: 100%; table-layout: fixed;">
  <thead>
    <tr>
      <th style="width: 25%;">法线</th>
      <th style="width: 25%;">R 通道</th>
      <th style="width: 25%;">G 通道</th>
      <th style="width: 25%;">B 通道</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center" valign="top" style="width: 25%; padding: 8px;"><img src="素材/ACN/图片/anisotropic-metal-y40-normal.webp" alt="各向异性金属法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;"></td>
      <td align="center" valign="top" style="width: 25%; padding: 8px;"><img src="素材/ACN/图片/normal-red-channel.webp" alt="法线贴图 R 通道" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;"></td>
      <td align="center" valign="top" style="width: 25%; padding: 8px;"><img src="素材/ACN/图片/normal-green-channel.webp" alt="法线贴图 G 通道" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;"></td>
      <td align="center" valign="top" style="width: 25%; padding: 8px;"><img src="素材/ACN/图片/normal-blue-channel.webp" alt="法线贴图 B 通道" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;"></td>
    </tr>
  </tbody>
</table>

&emsp;&emsp;R 通道梯度较均匀，主要保存较低增益下的 $x$ 方向结构；G 通道条纹细节更丰富，但较高的 $y$ 方向增益也同步放大了高频噪声；B 通道没有独立自由度，它与前两个通道共同构成一个单位球壳的约束流形。

&emsp;&emsp;法线贴图存的是单位方向向量。把 8 位通道解码回 $[-1,1]$ 后，三个分量应满足：
$$
n_x^2+n_y^2+n_z^2=1
$$
因此不需要直接处理 B 通道。只要保留较稳定的 R 通道，清理主要携带噪声的 G 通道，就可以根据约束重新计算 B：
$$
n_z=\sqrt{\operatorname{clip}\left(1-n_x^2-n_y^2,0,1\right)}
$$

```python
nz = np.sqrt(np.clip(1.0 - (nx ** 2 + ny ** 2), 0, 1))
b_reconstructed = ((nz + 1.0) * 127.5).astype(np.uint8)
final_normal = cv2.merge([b_reconstructed, final_g, final_r])
```

### 3.2、中值滤波
&emsp;&emsp;G 通道中主要可以看到三类噪声：离散的黑色麻点、沿条纹分布的白色带状异常，以及局部聚集的簇状噪声。中值滤波对孤立的椒盐噪声和短小异常点较有效。它把局部窗口内的像素排序，并取中间值作为中心像素的新值：

![G 通道中的黑色麻点、白色带状和簇状噪声](素材/ACN/图片/normal-noise-types.webp)

```python
smooth = cv2.medianBlur(target_channel, 5)
```

| 中值滤波前的 G 通道 | 中值滤波后的 G 通道 |
| :---: | :---: |
| ![中值滤波前的 G 通道](素材/ACN/图片/normal-green-channel.webp) | ![中值滤波后的 G 通道](素材/ACN/图片/normal-green-median.webp) |

&emsp;&emsp;中值滤波减少了孤立噪点，但长条噪声、成簇异常以及与有效条纹相连的区域仍会保留。后续步骤需要继续从几何形状上判断连通区域是否像真正的长条纹。

### 3.3、二值化与连通分量
&emsp;&emsp;法线贴图的中性灰为 `128`，解码后对应零方向分量。可以设置中性灰带 $[100,155]$，把明显偏离中性灰的像素视为前景：
$$
S=
\left\{
(x,y)\in\Omega
\mid
I_{\mathrm{smooth}}(x,y)\notin(100,155)
\right\}
$$
其中 $\Omega$ 是整张图像。代码使用正向阈值提取高亮区域，使用反向阈值提取暗区，再通过按位或合并两部分：

```python
_, bright = cv2.threshold(
    smooth, 155, 255, cv2.THRESH_BINARY
)
_, dark = cv2.threshold(
    smooth, 100, 255, cv2.THRESH_BINARY_INV
)
fg_mask = cv2.bitwise_or(bright, dark)
```

&emsp;&emsp;随后使用 8 邻域连通分量分析，把前景集合划分为若干个互不相交的连通子集 $C_i$：
$$
S=\bigcup_{i=1}^{n}C_i,
\qquad
C_i\cap C_j=\varnothing\quad(i\ne j)
$$

```python
num, labels, stats, _ = cv2.connectedComponentsWithStats(
    fg_mask,
    connectivity=8,
)
```

### 3.4、属性开运算
&emsp;&emsp;传统形态学开运算依赖固定结构元素，难以适应弯曲或局部断裂的长条纹。这里改为按连通分量的属性进行筛选。对于横向条纹，定义如下判定函数：
$$
\gamma(C_i)=
\begin{cases}
1, &
W(C_i)>T_{\mathrm{width}}
\ \land\
\dfrac{W(C_i)}{H(C_i)}>T_{\mathrm{ar}},\\[6pt]
0, &
\text{otherwise}
\end{cases}
$$
其中 $W(C_i)$ 和 $H(C_i)$ 分别是外接矩形的宽度与高度。只有长度足够大、且长宽比足够高的连通分量会被保留：
$$
\mathrm{Feature\_Mask}=
\bigcup\left\{
C_i\mid\gamma(C_i)=1
\right\}
$$

```python
for i in range(1, num):
    width = stats[i, cv2.CC_STAT_WIDTH]
    height = stats[i, cv2.CC_STAT_HEIGHT]
    aspect_ratio = width / (height + 1e-5)

    if width > min_width and aspect_ratio > min_aspect_ratio:
        feature_mask[labels == i] = 255
    else:
        noise_mask[labels == i] = 255
```

### 3.5、背景同质化
&emsp;&emsp;完成筛选后，保留特征区域中的原始 G 值，把其余区域统一重置为中性灰 `128`：
$$
I_{\mathrm{denoised}}(x,y)=
\begin{cases}
I_{\mathrm{target}}(x,y), &
(x,y)\in\mathrm{Feature\_Mask},\\
128, &
\text{otherwise}
\end{cases}
$$

```python
target_denoised = np.full_like(target_channel, 128)
target_denoised[feature_mask > 0] = target_channel[feature_mask > 0]
```

&emsp;&emsp;这一步把背景中大量零散波动强制归零，使非条纹区域恢复为平坦表面。需要注意的是，这会主动删除未被判定为长条纹的所有细节，因此只适用于方向结构非常明确的材质。

<p align="center">
  <img src="素材/ACN/图片/morphology-cleanup.webp" alt="形态学筛选区域可视化" style="width: 50%; max-width: 480px; height: auto;">
</p>

&emsp;&emsp;可视化中绿色表示通过长度与长宽比筛选的特征区域，红色表示被判定为噪声的连通分量。筛选结果直接决定后续哪些条纹能被写回法线贴图。

### 3.6、球壳约束与法线重构
&emsp;&emsp;清理后的 G 通道仍然是 8 位纹理值，需要先解码为方向分量：
$$
n_x=\frac{R}{127.5}-1,
\qquad
n_y=\frac{G_{\mathrm{denoised}}}{127.5}-1
$$
再根据单位球约束计算 $n_z$，映射回 `[0,255]`，并把 B、G、R 三个通道重新合并。
再根据单位球约束计算 $n_z$，映射回 `[0,255]`，并把 B、G、R 三个通道重新合并。

### 3.7、运行结果与局限
| 去噪后的法线贴图 | 仍无法完全清除的噪声 |
| :---: | :---: |
| ![形态学去噪后的法线贴图](素材/ACN/图片/normal-morphology-result.webp) | ![形态学去噪后残留的局部噪声](素材/ACN/图片/normal-morphology-residual.webp) |

&emsp;&emsp;背景中的短碎噪声被大量清除，主要横向条纹得到保留，法线贴图从密集颗粒状分布变为条理更清晰的方向结构。仍有一部分噪声与有效条纹相连，或在局部聚集成簇。由于它们的外接矩形也可能满足长度与长宽比条件，单纯依靠几何筛选无法彻底去除。

## 4、结果测试
&emsp;&emsp;固定参数测试在相同设置下比较四类材质，先观察常规 Sobel 是否成立，再检查双边滤波能否改善噪声和连续性。使用参数如下：

```text
intensity_x = 2
intensity_y = 2
d = 9
sigmaColor = 75
sigmaSpace = 75
Average_X = 0
Average_Y = 0
```

### 4.1、各向同性木头
![各向同性木头 Unity 渲染对照](素材/ACN/图片/comparison-isotropic-wood.webp)

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-wood-albedo.webp" alt="各向同性木头 Albedo" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性木头<br><b>Albedo</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-wood-original-normal.webp" alt="各向同性木头 Original 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性木头<br><b>Original</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-wood-sobel-normal.webp" alt="各向同性木头 Sobel 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性木头<br><b>Sobel</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-wood-generated-normal.webp" alt="各向同性木头 Sobel 加双边滤波法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性木头<br><b>Sobel + Bilateral</b></div>
    </td>
  </tr>
</table>

### 4.2、各向同性金属
![各向同性金属 Unity 渲染对照](素材/ACN/图片/comparison-isotropic-metal.webp)

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-metal-albedo.webp" alt="各向同性金属 Albedo" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性金属<br><b>Albedo</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-metal-original-normal.webp" alt="各向同性金属 Original 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性金属<br><b>Original</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-metal-sobel-normal.webp" alt="各向同性金属 Sobel 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性金属<br><b>Sobel</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/isotropic-metal-bilateral-normal.webp" alt="各向同性金属 Sobel 加双边滤波法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向同性金属<br><b>Sobel + Bilateral</b></div>
    </td>
  </tr>
</table>

### 4.3、各向异性木头
![各向异性木头 Unity 渲染对照](素材/ACN/图片/comparison-anisotropic-wood.webp)

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-wood-albedo.webp" alt="各向异性木头 Albedo" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性木头<br><b>Albedo</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-wood-original-normal.webp" alt="各向异性木头 Original 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性木头<br><b>Original</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-wood-sobel-normal.webp" alt="各向异性木头 Sobel 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性木头<br><b>Sobel</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-wood-bilateral-normal.webp" alt="各向异性木头 Sobel 加双边滤波法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性木头<br><b>Sobel + Bilateral</b></div>
    </td>
  </tr>
</table>

### 4.4、各向异性金属
![各向异性金属固定参数 Unity 渲染对照](素材/ACN/图片/comparison-fixed-parameters.webp)

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-albedo.webp" alt="各向异性金属 Albedo" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性金属<br><b>Albedo</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-original-normal.webp" alt="各向异性金属 Original 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性金属<br><b>Original</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-sobel-fixed-normal.webp" alt="各向异性金属固定参数 Sobel 法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性金属<br><b>Sobel</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-bilateral-fixed-normal.webp" alt="各向异性金属固定参数 Sobel 加双边滤波法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性金属<br><b>Sobel + Bilateral</b></div>
    </td>
  </tr>
</table>

&emsp;&emsp;为了看清后续调整的作用，下面继续展示增强 $y$ 梯度与加入横向平均后的四张结果：

<table border="0" style="width: 100%; table-layout: fixed;">
  <tr>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-y40-normal.webp" alt="各向异性金属高强度 Y 梯度法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性金属<br><b>Sobel y=40</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-y40-unity.webp" alt="各向异性金属高强度 Y 梯度渲染结果" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">Unity 渲染结果<br><b>Sobel y=40</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-generated-normal.webp" alt="各向异性金属横向平均后的法线贴图" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">各向异性金属<br><b>Sobel y=40 + 横向平均</b></div>
    </td>
    <td align="center" valign="top" style="width: 25%; padding: 5px;">
      <img src="素材/ACN/图片/anisotropic-metal-generated-unity.webp" alt="各向异性金属横向平均后的 Unity 渲染结果" style="width: 100%; aspect-ratio: 1/1; object-fit: contain;">
      <div style="font-size: 12px; margin-top: 8px;">Unity 渲染结果<br><b>Sobel y=40 + 横向平均</b></div>
    </td>
  </tr>
</table>

## 5、失败边界
&emsp;&emsp;ACN-Estimation 的整套推导都依赖同一个假设：灰度变化与表面几何高度存在相关性。这个假设让方法在木材、拉丝金属和规则沟槽上成立，也决定了它在部分材质上会直接失效。

### 5.1、颜色与几何高度解耦
![集装箱纹理在不同法线条件下的渲染对照](素材/ACN/图片/failure-container.webp)

&emsp;&emsp;集装箱同时包含真实的瓦楞结构、喷漆文字和印刷标识。文字边缘在 Albedo 中表现为强烈亮度变化，但这些变化并不代表表面高度。对于这类输入，灰度与几何相互独立，算法无法只凭颜色判断哪些边缘属于真实凹凸。

![集装箱 Albedo、Original 法线与 Sobel 法线对照](素材/ACN/图片/container-normal-comparison.webp)

&emsp;&emsp;标配法线保存了瓦楞结构，而 Sobel 结果会把文字和图案边缘错误解释成浮雕，同时削弱原本连续的水平沟槽。问题无法通过继续调整强度或滤波参数从根本上解决，因为输入中并不包含区分“文字亮度”和“几何高度”的语义信息。

### 5.2、传统滤波缺少结构感知
![形态学宽度仅变化 5 像素造成的特征与噪声同步消亡](素材/ACN/图片/filter-parameter-sensitivity.webp)

&emsp;&emsp;传统滤波主要依据局部像素统计和固定邻域处理图像。在它看来，有效条纹和随机噪声都属于高频波动，仅靠幅值和连通关系很难稳定地区分两者。

&emsp;&emsp;上图展示了参数敏感性问题：形态学宽度从 `2045` 调整到 `2050`，只变化了 5 个像素，特征区域与噪声区域就同时大面积消失。继续收紧阈值可能只留下极少细节，放宽阈值又会把噪声重新带回。由于传统算子没有建立几何结构先验，很难找到稳定、通用的平滑临界点。

## 6、总结
&emsp;&emsp;ACN-Estimation 从“颜色变化与表面高度存在相关性”这一有限假设出发，将 Albedo 灰度场映射为参数曲面，通过切向量叉乘和 Sobel 离散梯度生成切线空间法线。项目进一步加入 X/Y 强度解耦、横向与纵向平均，以及基于法线通道和连通分量几何属性的形态学清理，尝试处理方向性材质中的结构丢失与随机噪声。

&emsp;&emsp;四类材质的对照结果表明，该方法在木材和规则拉丝金属等自然纹理上能够得到具有辨识度的法线效果，但固定参数无法兼容所有材质。各向异性越强，越需要针对方向结构单独处理；梯度增强在恢复条纹的同时会放大噪声，滤波和几何筛选又依赖明确的材质先验。因此，结果更接近受约束的快速法线原型，而不是从单张 Albedo 恢复真实几何的通用方案。

&emsp;&emsp;它适合快速材质试验、风格化制作和算法验证，边界也同样明确：文字、标识、印刷图案以及灰度与几何解耦的场景会让核心假设失效。后续若希望提升泛化能力，更合理的路径是使用成对 Albedo-Normal 数据训练专用模型，并在本地执行推理，而不是依赖通用聊天模型逐像素生成法线。

## 7、延伸阅读
- 项目：[ACN-Estimation：基于纹理—几何耦合的自然材质法线估计](../../项目/数字图像处理/ACN-Estimation：基于纹理—几何耦合的自然材质法线估计.md)
- 笔记：[噪声](../../笔记/数字图像处理/噪声.md)、[滤波](../../笔记/数字图像处理/滤波.md)、[滤波算子](../../笔记/数字图像处理/滤波算子.md)
