import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle, Arc

# ==========================================
# 样式配置 (Textbook Style Configuration)
# ==========================================
STYLE = {
    'fill_color': '#DEE6F0',  # 几何体内部浅蓝灰色
    'edge_color': '#333333',  # 几何体轮廓深灰色
    'edge_width': 1.5,
    'node_bg': 'white',  # 节点圆圈底色
    'node_edge': '#333333',
    'node_size': 8,
    'text_color': '#222222',
    'math_font': {'fontstyle': 'italic', 'fontweight': 'bold', 'fontsize': 14},
    'hit_color': '#E53935',  # 命中点和运动轨迹的高亮红色
    'vec_color': '#1E88E5'  # 辅助推导向量(如m)的蓝色
}


def setup_canvas(ax, title):
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(title, pad=15, fontsize=16, fontweight='bold', color='#333')
    ax.set_xlim(-2.5, 2.5)
    ax.set_ylim(-1.5, 2.5)


def draw_math_node(ax, pos, label, offset=(0.1, 0.1), color=STYLE['node_edge'], text_color=STYLE['text_color']):
    """绘制带防重叠偏移的数学节点"""
    ax.plot(*pos, marker='o', markersize=STYLE['node_size'],
            markerfacecolor=STYLE['node_bg'], markeredgecolor=color,
            markeredgewidth=STYLE['edge_width'], zorder=7)
    if label:
        ax.text(pos[0] + offset[0], pos[1] + offset[1], label,
                color=text_color, zorder=8, **STYLE['math_font'])


# ==========================================
# CCD 扫掠求交可视化核心逻辑
# ==========================================
def plot_ccd_capsule(ax):
    setup_canvas(ax, "Continuous Collision Detection (Sweep Test)")

    # 1. 胶囊体基础几何构建
    pA = np.array([-1.0, -0.6])
    pB = np.array([1.2, 0.4])
    radius = 0.65

    # 轴线向量与法向
    d_cap = pB - pA
    L_cap = np.linalg.norm(d_cap)
    u = d_cap / L_cap  # 单位方向 u
    n = np.array([-u[1], u[0]])

    c1, c2 = pA + n * radius, pB + n * radius
    c3, c4 = pB - n * radius, pA - n * radius

    # 绘制胶囊体底色与轮廓
    ax.add_patch(Circle(pA, radius, facecolor=STYLE['fill_color'], edgecolor='none', zorder=1))
    ax.add_patch(Circle(pB, radius, facecolor=STYLE['fill_color'], edgecolor='none', zorder=1))
    ax.add_patch(Polygon([c1, c2, c3, c4], facecolor=STYLE['fill_color'], edgecolor='none', zorder=1))

    angle_deg = np.degrees(np.arctan2(u[1], u[0]))
    ax.add_patch(Arc(pB, radius * 2, radius * 2, angle=angle_deg, theta1=-90, theta2=90,
                     edgecolor=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2))
    ax.add_patch(Arc(pA, radius * 2, radius * 2, angle=angle_deg, theta1=90, theta2=270,
                     edgecolor=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2))
    ax.plot([c1[0], c2[0]], [c1[1], c2[1]], color=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2)
    ax.plot([c3[0], c4[0]], [c3[1], c4[1]], color=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2)

    # 2. CCD 数学建模：计算射线与命中点
    # 设定射线命中圆柱体的位置 (距离 pA 约 45% 的位置)
    hit_t = L_cap * 0.45
    hit_proj = pA + hit_t * u
    p_hit = hit_proj + n * radius  # 表面命中点

    # 设定运动射线 d 的方向与起止点
    d_ray = np.array([0.9, -1.2])
    d_ray = d_ray / np.linalg.norm(d_ray)

    # 根据命中点逆推起点 p_start 和虚拟终点 p_end
    p_start = p_hit - d_ray * 1.8
    p_end = p_start + d_ray * 2.8

    # 总运动向量 d
    d_vec = p_end - p_start

    # 3. 绘制元素与标注
    # --- 胶囊体内部轴线与参数 ---
    ax.plot([pA[0], pB[0]], [pA[1], pB[1]], color='#888', linestyle='--', lw=1.2, zorder=3)
    draw_math_node(ax, pA, '$p_A$', offset=(-0.35, -0.2))
    draw_math_node(ax, pB, '$p_B$', offset=(0.15, -0.1))

    # u 向量箭头
    u_arrow_end = pA + u * 0.8
    ax.annotate('', xy=u_arrow_end, xytext=pA,
                arrowprops=dict(arrowstyle='->', color=STYLE['edge_color'], lw=2), zorder=4)
    ax.text(u_arrow_end[0] - 0.1, u_arrow_end[1] + 0.15, '$u$', **STYLE['math_font'])

    # --- 轨迹线与起点/终点 ---
    ax.plot([p_start[0], p_end[0]], [p_start[1], p_end[1]],
            color=STYLE['hit_color'], linestyle='--', lw=1.5, zorder=3)
    draw_math_node(ax, p_start, '$p_{start}$', offset=(-0.4, 0.15))

    # 整个轨迹向量 d 的箭头
    d_arrow_end = p_start + d_vec * 0.3
    ax.annotate('', xy=d_arrow_end, xytext=p_start,
                arrowprops=dict(arrowstyle='->', color=STYLE['hit_color'], lw=2), zorder=4)
    ax.text(d_arrow_end[0] + 0.1, d_arrow_end[1] + 0.1, '$d$', color=STYLE['hit_color'], **STYLE['math_font'])

    # --- 数学推导辅助向量 m ---
    ax.plot([pA[0], p_start[0]], [pA[1], p_start[1]],
            color=STYLE['vec_color'], linestyle=':', lw=2, zorder=3)
    ax.annotate('', xy=p_start, xytext=pA,
                arrowprops=dict(arrowstyle='->', color=STYLE['vec_color'], lw=1.5), zorder=4)
    mid_m = (pA + p_start) / 2
    ax.text(mid_m[0] - 0.25, mid_m[1] + 0.05, '$m$', color=STYLE['vec_color'], **STYLE['math_font'])

    # --- 碰撞拦截点 ---
    draw_math_node(ax, p_hit, '$p(s_{hit})$', offset=(0.1, 0.1), color=STYLE['hit_color'],
                   text_color=STYLE['hit_color'])

    # 命中点到轴线的垂线 (R)
    ax.plot([p_hit[0], hit_proj[0]], [p_hit[1], hit_proj[1]],
            color=STYLE['edge_color'], linestyle='-', lw=1.5, zorder=4)
    ax.plot(*hit_proj, marker='s', markersize=4, color=STYLE['edge_color'], zorder=5)  # 垂足标记

    mid_R = (p_hit + hit_proj) / 2
    ax.text(mid_R[0] + 0.1, mid_R[1] - 0.1, '$R$', **STYLE['math_font'])


# ==========================================
# 执行渲染
# ==========================================
fig, ax = plt.subplots(figsize=(8, 7))
fig.patch.set_facecolor('white')

plot_ccd_capsule(ax)

plt.tight_layout()
plt.show()