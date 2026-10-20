import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle, Arc
from matplotlib.path import Path

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
    'math_font': {'fontstyle': 'italic', 'fontweight': 'bold', 'fontsize': 15},
    'label_font': {'color': '#666666', 'fontsize': 11}
}


def setup_canvas(ax, title):
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(title, pad=15, fontsize=14, fontweight='bold', color='#333')
    ax.set_xlim(-2, 2)
    ax.set_ylim(-2, 2)


def draw_math_node(ax, pos, label, offset=(0.1, 0.1)):
    """绘制带防重叠偏移的数学节点"""
    ax.plot(*pos, marker='o', markersize=STYLE['node_size'],
            markerfacecolor=STYLE['node_bg'], markeredgecolor=STYLE['node_edge'],
            markeredgewidth=STYLE['edge_width'], zorder=6)
    if label:
        ax.text(pos[0] + offset[0], pos[1] + offset[1], label,
                color=STYLE['text_color'], zorder=7, **STYLE['math_font'])


# ==========================================
# 独立几何体绘制
# ==========================================

def plot_plane(ax):
    setup_canvas(ax, "Plane")

    plane_pts = np.array([[-1.6, -0.3], [1.1, -0.1], [1.5, 0.5], [-1.2, 0.3]])
    plane = Polygon(plane_pts, closed=True, facecolor=STYLE['fill_color'],
                    edgecolor=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=1)
    ax.add_patch(plane)

    # 平面 SDF 是唯一需要点 p 和法线 n 参与建模的 (SDF = dot(x-p, n))
    p_pos = np.array([0.0, 0.1])
    n_dir = np.array([0.0, 1.0])
    x_pos = np.array([-0.6, 0.9])

    draw_math_node(ax, x_pos, 'x', offset=(-0.3, 0.0))
    draw_math_node(ax, p_pos, 'p', offset=(0.15, -0.2))

    ax.plot([x_pos[0], p_pos[0]], [x_pos[1], p_pos[1]],
            color=STYLE['edge_color'], linestyle='--', linewidth=1.5, zorder=5)

    n_end = p_pos + n_dir * 0.7
    ax.annotate('', xy=n_end, xytext=p_pos,
                arrowprops=dict(arrowstyle='->', color=STYLE['edge_color'], lw=1.8), zorder=5)
    ax.text(n_end[0] + 0.05, n_end[1] + 0.05, 'n', color=STYLE['text_color'], **STYLE['math_font'])


def plot_sphere(ax):
    setup_canvas(ax, "Sphere")

    center = np.array([0, 0])
    radius = 1.3
    sphere = Circle(center, radius, facecolor=STYLE['fill_color'],
                    edgecolor=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=1)
    ax.add_patch(sphere)

    # 球 SDF 核心：点 x 到 球心 c 的距离
    draw_math_node(ax, center, 'c', offset=(-0.15, -0.25))
    x_pos = np.array([-1.2, 1.4])
    draw_math_node(ax, x_pos, 'x', offset=(-0.3, 0.0))

    ax.plot([center[0], x_pos[0]], [center[1], x_pos[1]],
            color=STYLE['edge_color'], linestyle='--', linewidth=1.5, zorder=2)

    r_end = center + np.array([np.cos(-0.4), np.sin(-0.4)]) * radius
    ax.plot([center[0], r_end[0]], [center[1], r_end[1]],
            color=STYLE['edge_color'], linestyle='--', lw=1.5, zorder=2)
    mid_x, mid_y = (center[0] + r_end[0]) / 2, (center[1] + r_end[1]) / 2
    ax.text(mid_x - 0.05, mid_y + 0.1, 'r', **STYLE['math_font'])


def plot_capsule(ax):
    setup_canvas(ax, "Capsule")

    p1 = np.array([-0.8, -0.4])
    p2 = np.array([0.8, 0.4])
    radius = 0.65

    d = p2 - p1
    L = np.linalg.norm(d)
    u = d / L
    n = np.array([-u[1], u[0]])

    c1, c2 = p1 + n * radius, p2 + n * radius
    c3, c4 = p2 - n * radius, p1 - n * radius

    ax.add_patch(Circle(p1, radius, facecolor=STYLE['fill_color'], edgecolor='none', zorder=1))
    ax.add_patch(Circle(p2, radius, facecolor=STYLE['fill_color'], edgecolor='none', zorder=1))
    ax.add_patch(Polygon([c1, c2, c3, c4], facecolor=STYLE['fill_color'], edgecolor='none', zorder=1))

    angle_deg = np.degrees(np.arctan2(u[1], u[0]))
    ax.add_patch(Arc(p2, radius * 2, radius * 2, angle=angle_deg, theta1=-90, theta2=90,
                     edgecolor=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2))
    ax.add_patch(Arc(p1, radius * 2, radius * 2, angle=angle_deg, theta1=90, theta2=270,
                     edgecolor=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2))
    ax.plot([c1[0], c2[0]], [c1[1], c2[1]], color=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2)
    ax.plot([c3[0], c4[0]], [c3[1], c4[1]], color=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=2)

    # 内部骨骼线段 (Capsule SDF 核心)
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#888', linestyle='--', lw=1.2, zorder=2)

    # 绘制 SDF 建模关键参数：端点A, B，外部点x，及到骨骼的最短距离
    draw_math_node(ax, p1, 'A', offset=(-0.3, -0.1))
    draw_math_node(ax, p2, 'B', offset=(0.15, -0.1))

    x_pos = np.array([-0.6, 1.2])
    draw_math_node(ax, x_pos, 'x', offset=(-0.25, 0.0))

    # 计算 x 到骨骼线段的最短投影点 (并非表面 p)
    t = np.clip(np.dot(x_pos - p1, u), 0, L)
    closest_on_core = p1 + t * u

    # 画出 x 到核心线段的最短距离探测线
    ax.plot([x_pos[0], closest_on_core[0]], [x_pos[1], closest_on_core[1]],
            color=STYLE['edge_color'], linestyle='--', linewidth=1.5, zorder=5)
    # 核心线段上的投影点标记一个小圆点
    ax.plot(*closest_on_core, marker='o', markersize=5, color=STYLE['edge_color'], zorder=5)

    # 单独标注半径 r
    r_end = p2 + n * radius
    ax.plot([p2[0], r_end[0]], [p2[1], r_end[1]], color=STYLE['edge_color'], linestyle='--', lw=1.5, zorder=4)
    ax.text((p2[0] + r_end[0]) / 2 + 0.1, (p2[1] + r_end[1]) / 2 - 0.1, 'r', **STYLE['math_font'])


def plot_box(ax):
    setup_canvas(ax, "Box")

    O = np.array([0.0, -0.5])
    U = np.array([1.2, 0.3])
    V = np.array([0.0, 1.1])
    W = np.array([-1.0, 0.5])

    p_front_bot = O
    p_right_bot = O + U
    p_left_bot = O + W
    p_back_bot = O + U + W

    p_front_top = p_front_bot + V
    p_right_top = p_right_bot + V
    p_left_top = p_left_bot + V
    p_back_top = p_back_bot + V

    ax.plot([p_back_bot[0], p_left_bot[0]], [p_back_bot[1], p_left_bot[1]], color=STYLE['edge_color'], ls='--', lw=1.2,
            zorder=1)
    ax.plot([p_back_bot[0], p_right_bot[0]], [p_back_bot[1], p_right_bot[1]], color=STYLE['edge_color'], ls='--',
            lw=1.2, zorder=1)
    ax.plot([p_back_bot[0], p_back_top[0]], [p_back_bot[1], p_back_top[1]], color=STYLE['edge_color'], ls='--', lw=1.2,
            zorder=1)

    face_alpha = 0.85
    top_face = Polygon([p_front_top, p_right_top, p_back_top, p_left_top], closed=True, facecolor='#EAEDF4',
                       alpha=face_alpha, zorder=2)
    right_face = Polygon([p_front_bot, p_right_bot, p_right_top, p_front_top], closed=True, facecolor='#C0C9D8',
                         alpha=face_alpha, zorder=2)
    left_face = Polygon([p_front_bot, p_left_bot, p_left_top, p_front_top], closed=True, facecolor='#D3DBE8',
                        alpha=face_alpha, zorder=2)
    ax.add_patch(top_face)
    ax.add_patch(right_face)
    ax.add_patch(left_face)

    edges = [
        (p_front_top, p_right_top), (p_right_top, p_back_top), (p_back_top, p_left_top), (p_left_top, p_front_top),
        (p_front_bot, p_front_top), (p_right_bot, p_right_top), (p_left_bot, p_left_top),
        (p_front_bot, p_right_bot), (p_front_bot, p_left_bot)
    ]
    for p_a, p_b in edges:
        ax.plot([p_a[0], p_b[0]], [p_a[1], p_b[1]], color=STYLE['edge_color'], lw=STYLE['edge_width'], zorder=3)

    # ================= SDF 建模核心参数可视化 =================
    # 1. Box 的几何中心 c
    c_pos = O + (U + V + W) / 2.0
    draw_math_node(ax, c_pos, 'c', offset=(-0.1, -0.25))

    # 2. 外部点 x
    x_pos = np.array([-0.6, 1.4])
    draw_math_node(ax, x_pos, 'x', offset=(-0.25, 0.0))

    # 3. 直连 x 和 c，代表 SDF 公式运算基准 abs(x - c)
    ax.plot([x_pos[0], c_pos[0]], [x_pos[1], c_pos[1]],
            color=STYLE['edge_color'], linestyle='--', linewidth=1.5, zorder=5)

    # 4. 可视化 Box 沿局部坐标系的三个半尺寸 (Half-extents)
    hx_end = c_pos + U / 2.0
    ax.annotate('', xy=hx_end, xytext=c_pos, arrowprops=dict(arrowstyle='->', color='#555', lw=1.5), zorder=4)
    ax.text(hx_end[0] + 0.05, hx_end[1] - 0.1, '$h_x$', color='#444', fontsize=14, fontweight='bold')

    hy_end = c_pos + V / 2.0
    ax.annotate('', xy=hy_end, xytext=c_pos, arrowprops=dict(arrowstyle='->', color='#555', lw=1.5), zorder=4)
    ax.text(hy_end[0] + 0.05, hy_end[1] - 0.05, '$h_y$', color='#444', fontsize=14, fontweight='bold')

    hz_end = c_pos + W / 2.0
    ax.annotate('', xy=hz_end, xytext=c_pos, arrowprops=dict(arrowstyle='->', color='#555', lw=1.5), zorder=4)
    ax.text(hz_end[0] - 0.25, hz_end[1] + 0.05, '$h_z$', color='#444', fontsize=14, fontweight='bold')


# ==========================================
# 执行渲染
# ==========================================
fig, axs = plt.subplots(2, 2, figsize=(10, 10))
fig.patch.set_facecolor('white')

plot_plane(axs[0, 0])
plot_sphere(axs[0, 1])
plot_capsule(axs[1, 0])
plot_box(axs[1, 1])

plt.tight_layout(pad=4.0)
plt.show()