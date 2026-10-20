import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'

# ================= 1. 创建画布 =================
fig = plt.figure(figsize=(10, 8), dpi=150)
ax = fig.add_subplot(111, projection='3d')

# ================= 2. 空间顶点设置 =================
p1 = np.array([-0.5, -0.8, -0.2])
p2 = np.array([ 0.5,  0.8, -0.2])
p3 = np.array([-2.4, -1.2,  1.0])
p4 = np.array([ 2.2,  1.4,  0.8])

# ================= 3. 绘制三角形面片 =================
color1 = '#5DADE2'  # 蓝色
color2 = '#58D68D'  # 绿色
tri1 = Poly3DCollection([[p1, p3, p2]], alpha=0.5, facecolor=color1, edgecolor='#2980B9', linewidths=1.8)
tri2 = Poly3DCollection([[p1, p2, p4]], alpha=0.5, facecolor=color2, edgecolor='#27AE60', linewidths=1.8)

ax.add_collection3d(tri1)
ax.add_collection3d(tri2)

# 计算两个面颜色的平均混合值
rgb1 = np.array([93, 173, 226])
rgb2 = np.array([88, 214, 141])
avg_rgb = (rgb1 + rgb2) / 2
avg_hex = '#{:02x}{:02x}{:02x}'.format(int(avg_rgb[0]), int(avg_rgb[1]), int(avg_rgb[2]))

# 公用边用虚线表示，颜色为两面颜色的平均混合
ax.plot([p1[0], p2[0]], [p1[1], p2[1]], [p1[2], p2[2]], color=avg_hex, linestyle='--', linewidth=3.5, zorder=10)

# ================= 4. 计算并反向绘制法线向量 =================
v12 = p2 - p1
v13 = p3 - p1
n1 = np.cross(v13, v12)
n1 = n1 / np.linalg.norm(n1)

v14 = p4 - p1
n2 = np.cross(v12, v14)
n2 = n2 / np.linalg.norm(n2)

# 【修改】将两个法向量的方向进行反向（乘以 -1）
n1_rev = -n1
n2_rev = n2

kw_norm = dict(color='#D35400', linewidth=3.0, arrow_length_ratio=0.2)

c1 = (p1 + p2 + p3) / 3
c2 = (p1 + p2 + p4) / 3
ax.quiver(*c1, *(n1_rev*1.2), **kw_norm)
ax.quiver(*c2, *(n2_rev*1.2), **kw_norm)

# ================= 5. 绘制黑点与质点标注 =================
for p in [p1, p2, p3, p4]:
    ax.scatter(*p, color='black', s=70, zorder=15)

fs = 17

ax.text(p1[0]-0.5, p1[1]-0.4, p1[2]-0.2, r'$\mathbf{p}_1(m)$', fontsize=fs)
ax.text(p2[0]+0.1, p2[1]+0.2, p2[2]-0.2, r'$\mathbf{p}_2(m)$', fontsize=fs)
ax.text(p3[0]-0.3, p3[1]-0.3, p3[2]+0.2, r'$\mathbf{p}_3(m)$', fontsize=fs)
ax.text(p4[0]+0.2, p4[1]+0.3, p4[2]+0.2, r'$\mathbf{p}_4(m)$', fontsize=fs)

# 法线标签（根据反向后的位置微调标签防止贴太近）
ax.text(c1[0]+n1_rev[0]*1.4-0.1, c1[1]+n1_rev[1]*1.4, c1[2]+n1_rev[2]*1.4, r'$\mathbf{n}_1$', fontsize=fs+2, color='#D35400', fontweight='bold')
ax.text(c2[0]+n2_rev[0]*1.4+0.1, c2[1]+n2_rev[1]*1.4, c2[2]+n2_rev[2]*1.4, r'$\mathbf{n}_2$', fontsize=fs+2, color='#D35400', fontweight='bold')

# 将 \phi (\phi_0) 符号紧密移动到公用边附近
mid_edge = (p1 + p2) / 2
ax.text(mid_edge[0] + 0.3, mid_edge[1] + 0.3, mid_edge[2] + 0.3, r'$\phi \ (\phi_0)$', fontsize=fs+2, color='#2C3E50', fontweight='bold',
        horizontalalignment='center')

# ================= 6. 视角设定 =================
ax.set_xlim([-3.0, 3.0])
ax.set_ylim([-3.0, 3.0])
ax.set_zlim([-1.5, 2.5])

ax.view_init(elev=28, azim=-50)
ax.axis('off')
ax.set_title(r'Dihedral Angle Constraint', fontsize=16, pad=15)

plt.tight_layout()
plt.savefig('dihedral_angle_reversed_normals.pdf', format='pdf', bbox_inches='tight')
plt.show()