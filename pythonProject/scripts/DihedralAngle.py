import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, ConnectionPatch  # 关键！

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'
colors = ['#2980B9', '#C0392B', '#27AE60']  # 蓝、绿、红

# 创建 1x3 的子图布局
fig, axes = plt.subplots(1, 3, figsize=(16, 5), dpi=150)
titles = [
    '1. Square Combination',
    '2. Parallelogram Combination',
    '3. Triangle Combination'

]

for ax_idx, ax in enumerate(axes):
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_xlim(-0.5, 3.5)
    ax.set_ylim(-0.5, 3.5)
    ax.set_title(titles[ax_idx], fontsize=13, pad=15, fontweight='bold')

    # 统一绘制 4x4 的背景网格点
    for x in range(4):
        for z in range(4):
            ax.scatter(x, z, color='#BDC3C7', s=50, zorder=3)

    # ---------------- 1. 标准正方形组合 ----------------
    if ax_idx == 0:
        p3 = np.array([1, 1])  # 左下
        p1 = np.array([2, 1])  # 右下
        p2 = np.array([1, 2])  # 左上
        p4 = np.array([2, 2])  # 右上

        ax.add_patch(Polygon([p3, p2, p1], color='#3498DB', alpha=0.3, zorder=1))
        ax.add_patch(Polygon([p1, p2, p4], color='#2980B9', alpha=0.5, zorder=1))

        ax.plot([p3[0], p1[0]], [p3[1], p1[1]], color='black', lw=2, zorder=2)
        ax.plot([p3[0], p2[0]], [p3[1], p2[1]], color='black', lw=2, zorder=2)
        ax.plot([p1[0], p4[0]], [p1[1], p4[1]], color='black', lw=2, zorder=2)
        ax.plot([p2[0], p4[0]], [p2[1], p4[1]], color='black', lw=2, zorder=2)

        # 共享转轴
        ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#E74C3C', lw=3, ls='--', zorder=4, label='Hinge Axis')

        ax.text(p3[0] - 0.12, p3[1] - 0.12, r'$p_3$', fontsize=11, ha='right')
        ax.text(p1[0] + 0.12, p1[1] - 0.12, r'$p_1$', fontsize=11, ha='left')
        ax.text(p2[0] - 0.12, p2[1] + 0.12, r'$p_2$', fontsize=11, ha='right')
        ax.text(p4[0] + 0.12, p4[1] + 0.12, r'$p_4$', fontsize=11, ha='left')

        con = ConnectionPatch(
            xyA=p3,
            xyB=p4,
            coordsA="data",
            coordsB="data",
            axesA=ax,
            axesB=ax,
            color=colors[ax_idx],
            lw=2.5,
            ls=':',
            connectionstyle="arc3,rad=0.3"
        )
        ax.add_artist(con)

        # ---------------- 2. 大等腰直角三角形组合（p1-p2为公共边） ----------------
    elif ax_idx == 2:
        p3 = np.array([1, 1])
        p4 = np.array([3, 1])
        p1 = np.array([2, 1])
        p2 = np.array([2, 2])

        ax.add_patch(Polygon([p4, p1, p2], color='#2ECC71', alpha=0.5, zorder=1))
        ax.add_patch(Polygon([p3, p2, p1], color='#27AE60', alpha=0.3, zorder=1))

        ax.plot([p3[0], p4[0]], [p3[1], p4[1]], color='black', lw=2, zorder=2)
        ax.plot([p3[0], p1[0]], [p3[1], p1[1]], color='black', lw=2, zorder=2)
        ax.plot([p4[0], p2[0]], [p4[1], p2[1]], color='black', lw=2, zorder=2)
        ax.plot([p3[0], p2[0]], [p3[1], p2[1]], color='black', lw=2, zorder=2)

        # 共享转轴 (p1 - p2)
        ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#E74C3C', lw=3, ls='--', zorder=4)

        ax.text(p3[0] - 0.12, p3[1] - 0.12, r'$p_3$', fontsize=11, ha='right')
        ax.text(p4[0] + 0.12, p4[1] - 0.12, r'$p_4$', fontsize=11, ha='left')
        ax.text(p1[0] - 0.12, p1[1] + 0.12, r'$p_1$', fontsize=11, ha='right')
        ax.text(p2[0] + 0.12, p2[1], r'$p_2$', fontsize=11, ha='left')

        con = ConnectionPatch(
            xyA=p3,
            xyB=p4,
            coordsA="data",
            coordsB="data",
            axesA=ax,
            axesB=ax,
            color=colors[ax_idx],
            lw=2.5,
            ls=':',
            connectionstyle="arc3,rad=0.3"
        )
        ax.add_artist(con)

    # ---------------- 3. 平行四边形组合（p1-p2为公共边） ----------------
    elif ax_idx == 1:
        p3 = np.array([1, 1])  # 左下
        p4 = np.array([3, 2])  # 右上
        p1 = np.array([2, 1])  # 转轴端点 1（原 v2）
        p2 = np.array([2, 2])  # 转轴端点 2（原 v4）
        p5 = np.array([3, 1])
        # 补齐另外两个外围顶点：左上顶点 (1,2)，右下顶点对应其他
        # 按照原本的平行四边形结构：v1=(1,1), v2=(2,1), v3=(3,2), v4=(2,2)
        # 此时公共边是 v2 到 v4，我们把它重新命名为 p1 和 p2
        v1 = np.array([1, 1])
        p1 = np.array([2, 1])
        v3 = np.array([3, 2])
        p2 = np.array([2, 2])

        ax.add_patch(Polygon([v1, p1, p2], color='#E74C3C', alpha=0.3, zorder=1))
        ax.add_patch(Polygon([p1, v3, p2], color='#C0392B', alpha=0.5, zorder=1))

        ax.plot([v1[0], p1[0]], [v1[1], p1[1]], color='black', lw=2, zorder=2)
        ax.plot([p1[0], v3[0]], [p1[1], v3[1]], color='black', lw=2, zorder=2)
        ax.plot([v3[0], p2[0]], [v3[1], p2[1]], color='black', lw=2, zorder=2)
        ax.plot([p2[0], v1[0]], [p2[1], v1[1]], color='black', lw=2, zorder=2)

        # 共享转轴 (p1 - p2)
        ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#E74C3C', lw=3, ls='--', zorder=4)

        ax.text(v1[0] - 0.12, v1[1] - 0.12, r'$p_3$', fontsize=11, ha='right')
        ax.text(v3[0] + 0.12, v3[1] + 0.12, r'$p_4$', fontsize=11, ha='left')
        ax.text(p1[0] + 0.12, p1[1] - 0.12, r'$p_1$', fontsize=11, ha='left')
        ax.text(p2[0] - 0.12, p2[1] + 0.12, r'$p_2$', fontsize=11, ha='right')
        ax.text(p5[0] + 0.12, p5[1] - 0.12, r'$p_5$', fontsize=11, ha='left')

        # ========== 修复：p3 <-> p5 弧线连接 ==========
        # ConnectionPatch：两点弧线，rad>0向上弯，rad<0向下弯
        con = ConnectionPatch(
            xyA=p3,
            xyB=p5,
            coordsA="data",
            coordsB="data",
            axesA=ax,
            axesB=ax,
            color=colors[ax_idx],
            lw=2.5,
            ls=':',
            connectionstyle="arc3,rad=0.3"
        )
        ax.add_artist(con)

    if ax_idx == 0:
        ax.legend(loc='upper right', frameon=True, fontsize=9)

plt.tight_layout()
plt.savefig('bending_combinations_final.pdf', format='pdf', bbox_inches='tight')
plt.show()