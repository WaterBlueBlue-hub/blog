import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import ConnectionPatch

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'

# 创建 1x3 的子图布局
fig, axes = plt.subplots(1, 3, figsize=(15, 5), dpi=150)
titles = ['Structural Springs',
          'Shear Springs',
          'Bending Springs']
colors = ['#2980B9', '#27AE60', '#C0392B']  # 蓝、绿、红

# 定义网格大小 (4x4)
N = 4

for ax_idx, ax in enumerate(axes):
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(titles[ax_idx], fontsize=16, pad=20, fontweight='bold')

    # 绘制背景的所有顶点 (浅灰色，充当锚点)
    for i in range(N):
        for j in range(N):
            ax.scatter(i, j, color='#7F8C8D', s=80, zorder=5)

    # ---------------- 1. 结构弹簧 (Structural) ----------------
    if ax_idx == 0:
        for i in range(N):
            for j in range(N):
                # 横向相连 (i,j) to (i+1,j)
                if i < N - 1:
                    ax.plot([i, i + 1], [j, j], color=colors[ax_idx], lw=2.5, zorder=2)
                # 纵向相连 (i,j) to (i,j+1)
                if j < N - 1:
                    ax.plot([i, i], [j, j + 1], color=colors[ax_idx], lw=2.5, zorder=2)

    # ---------------- 2. 剪切弹簧 (Shear) ----------------
    elif ax_idx == 1:
        for i in range(N):
            for j in range(N):
                # 对角线相连 (i,j) to (i+1,j+1) 和 (i+1,j) to (i,j+1)
                if i < N - 1 and j < N - 1:
                    ax.plot([i, i + 1], [j, j + 1], color=colors[ax_idx], lw=2.0, ls='--', zorder=2)
                    ax.plot([i + 1, i], [j, j + 1], color=colors[ax_idx], lw=2.0, ls='--', zorder=2)

    # ---------------- 3. 弯曲弹簧 (Bending) ----------------
    elif ax_idx == 2:
        for i in range(N):
            for j in range(N):
                # 跨越一个顶点横向相连 (i,j) to (i+2,j)
                if i < N - 2:
                    # 使用稍微弯曲的弧线来表示“跨越”，视觉上更清晰，避免与结构弹簧混淆
                    con = ConnectionPatch(xyA=(i, j), xyB=(i + 2, j), coordsA="data", coordsB="data",
                                          axesA=ax, axesB=ax, color=colors[ax_idx], lw=2.5, ls=':',
                                          connectionstyle="arc3,rad=0.3")
                    ax.add_artist(con)
                # 跨越一个顶点纵向相连 (i,j) to (i,j+2)
                if j < N - 2:
                    con = ConnectionPatch(xyA=(i, j), xyB=(i, j + 2), coordsA="data", coordsB="data",
                                          axesA=ax, axesB=ax, color=colors[ax_idx], lw=2.5, ls=':',
                                          connectionstyle="arc3,rad=-0.3")
                    ax.add_artist(con)

# 调整布局并导出
plt.tight_layout()
plt.savefig('mass_spring_topology.pdf', format='pdf', bbox_inches='tight')
plt.show()