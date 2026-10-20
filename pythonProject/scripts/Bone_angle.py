import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Arc, Polygon

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'

# 辅助函数：绘制 3D 软件风格的多边形骨骼
def draw_bone(ax, p_start, p_end, facecolor='#E0E0E0', edgecolor='#555555', zorder=2):
    v = p_end - p_start
    L = np.linalg.norm(v)
    u = v / L
    perp = np.array([-u[1], u[0]])
    widest_pt = p_start + u * (L * 0.2)
    half_width = L * 0.075
    side1 = widest_pt + perp * half_width
    side2 = widest_pt - perp * half_width
    poly = Polygon([p_start, side1, p_end, side2], closed=True,
                   facecolor=facecolor, edgecolor=edgecolor, linewidth=2, zorder=zorder)
    ax.add_patch(poly)

# ================= 1. 定义质点与物理状态 =================
p1 = np.array([2.0, 3.0])
p2 = np.array([6.0, 3.0])
p3 = np.array([3.5, 6.5])

# 计算顺延向量
v1 = p2 - p1
v2 = p3 - p2
L1 = np.linalg.norm(v1)
L2 = np.linalg.norm(v2)
u1 = v1 / L1
u2 = v2 / L2
cos_theta = np.dot(u1, u2)

# ================= 2. 计算 XPBD 约束梯度与修正量 =================
dcdv1 = (u2 - cos_theta * u1) / L1
dcdv2 = (u1 - cos_theta * u2) / L2

q1 = -dcdv1
q3 = dcdv2
q2 = dcdv1 - dcdv2

scale = 3.5
dp1 = q1 * scale
dp2 = q2 * scale
dp3 = q3 * scale

# ================= 3. 创建画布 =================
fig, ax = plt.subplots(figsize=(10, 6), dpi=150)

# ================= 4. 绘制核心几何元素 =================
# 4.1 绘制多边形骨骼
draw_bone(ax, p1, p2)
draw_bone(ax, p2, p3)

# 绘制 v1 和 v2 的红色向量箭头
ax.annotate('', xy=p2, xytext=p1,
            arrowprops=dict(facecolor='#E74C3C', edgecolor='#E74C3C', width=2.5, headwidth=9, shrink=0.05), zorder=3)
ax.annotate('', xy=p3, xytext=p2,
            arrowprops=dict(facecolor='#E74C3C', edgecolor='#E74C3C', width=2.5, headwidth=9, shrink=0.05), zorder=3)

# 向量文字标注
ax.text(4.0, 2.5, r'$\mathbf{v}_1$', fontsize=16, color='#E74C3C', zorder=4)
ax.text(4.9, 4.8, r'$\mathbf{v}_2$', fontsize=16, color='#E74C3C', zorder=4)

# 4.2 绘制内角弧线
vec_p2_to_p1 = p1 - p2
vec_p2_to_p3 = p3 - p2
angle_p2_to_p1 = np.degrees(np.arctan2(vec_p2_to_p1[1], vec_p2_to_p1[0]))
angle_p2_to_p3 = np.degrees(np.arctan2(vec_p2_to_p3[1], vec_p2_to_p3[0]))

arc_phi = Arc(p2, 1.8, 1.8, angle=0, theta1=angle_p2_to_p3, theta2=angle_p2_to_p1,
              color='#E67E22', linewidth=2.5, zorder=1)
ax.add_patch(arc_phi)
ax.text(p2[0] - 1.2, p2[1] + 0.35, r'$\phi$ (Interior)', fontsize=14, color='#E67E22', fontweight='bold')

# 4.3 绘制质点
ax.plot(p1[0], p1[1], 'ko', markersize=9, zorder=5)
ax.plot(p2[0], p2[1], 'ko', markersize=9, zorder=5)
ax.plot(p3[0], p3[1], 'ko', markersize=9, zorder=5)

# 将 p1 文本移至左上方，避免与向下指的梯度箭头重叠
ax.text(p1[0] - 1.2, p1[1] + 0.2, r'$\mathbf{p}_1 (\omega_1)$', fontsize=15)
ax.text(p2[0] + 0.2, p2[1] - 0.4, r'$\mathbf{p}_2 (\omega_2)$', fontsize=15)
ax.text(p3[0] - 0.7, p3[1] + 0.2, r'$\mathbf{p}_3 (\omega_3)$', fontsize=15)

# ================= 5. 绘制位置修正向量 (梯度方向) =================
# \Delta p1 标签跟随箭头尖端放置在左下方
ax.annotate('', xy=p1 + dp1, xytext=p1,
            arrowprops=dict(facecolor='#27AE60', edgecolor='#27AE60', width=2.5, headwidth=9))
ax.text(p1[0] + dp1[0] - 0.3, p1[1] + dp1[1] - 0.4, r'$\Delta\mathbf{p}_1$', fontsize=15, color='#27AE60')

# \Delta p2
ax.annotate('', xy=p2 + dp2, xytext=p2,
            arrowprops=dict(facecolor='#27AE60', edgecolor='#27AE60', width=2.5, headwidth=9))
ax.text(p2[0] + dp2[0]/1.5 + 0.2, p2[1] + dp2[1]/1.5 - 0.2, r'$\Delta\mathbf{p}_2$', fontsize=15, color='#27AE60')

# \Delta p3
ax.annotate('', xy=p3 + dp3, xytext=p3,
            arrowprops=dict(facecolor='#27AE60', edgecolor='#27AE60', width=2.5, headwidth=9))
ax.text(p3[0] + dp3[0]/1.5 + 0.1, p3[1] + dp3[1]/1.5 + 0.2, r'$\Delta\mathbf{p}_3$', fontsize=15, color='#27AE60')

# ================= 6. 画布排版 =================
ax.set_aspect('equal')
ax.set_xlim([-1.0, 9.0])
ax.set_ylim([1.75, 7.75])
ax.axis('off')
ax.set_title('Bone Angle Constraint Projection', fontsize=16, pad=15)

plt.tight_layout()
plt.savefig('bone_angle_constraint_interior_fixed.pdf', format='pdf', bbox_inches='tight')
plt.show()