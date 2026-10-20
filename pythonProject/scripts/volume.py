import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import matplotlib.tri as mtri

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'

fig = plt.figure(figsize=(10, 10), dpi=150)
ax = fig.add_subplot(111, projection='3d')

# ================= 1. 生成低多边形封闭曲面 =================
# 降低网格密度，使得单个三角形足够大，更加显眼
u = np.linspace(0, 2 * np.pi, 16)
v = np.linspace(0, np.pi, 10)
u, v = np.meshgrid(u, v)
u, v = u.flatten(), v.flatten()

# 将球体中心直接放在原点(0,0,0)
R = 2.0
x = R * np.cos(u) * np.sin(v)
y = R * np.sin(u) * np.sin(v)
z = R * np.cos(v)

tri = mtri.Triangulation(u, v)
verts = np.column_stack((x, y, z))
tri_verts = verts[tri.triangles]

# 绘制极度透明的背景球体，仅保留淡淡的轮廓和网格线
ax.plot_trisurf(x, y, z, triangles=tri.triangles, color='#BDC3C7',
                alpha=0.08, edgecolor='#7F8C8D', linewidth=0.3, zorder=1)

# ================= 2. 智能选取目标面片 =================
# 选取一个正对着镜头（右前上方）的大三角形
centers = tri_verts.mean(axis=1)
target = np.array([1.5, -1.5, 1.0])
idx = np.argmin(np.linalg.norm(centers - target, axis=1))
p1, p2, p3 = tri_verts[idx]

# 统一顶点顺序，确保法线朝外
normal = np.cross(p2 - p1, p3 - p1)
if np.dot(normal, centers[idx]) < 0:
    p2, p3 = p3, p2
    normal = np.cross(p2 - p1, p3 - p1)

# ================= 3. 绘制高亮目标面片 (四面体的底面) =================
highlight_tri = Poly3DCollection([[p1, p2, p3]], alpha=0.8, facecolor='#3498DB',
                                 edgecolor='#2980B9', linewidths=2.5, zorder=6)
ax.add_collection3d(highlight_tri)

# ================= 4. 实体化绘制四面体体积 =================
O = np.array([0, 0, 0])
# 构造四面体的三个内部侧面
tet_faces = [
    [O, p1, p2],
    [O, p2, p3],
    [O, p3, p1]
]
# 用半透明的亮橙色填充这个四面体
tet_volume = Poly3DCollection(tet_faces, alpha=0.35, facecolor='#F39C12', edgecolor='none', zorder=4)
ax.add_collection3d(tet_volume)

# 绘制四面体的三条棱（虚线）
kw_lines = dict(color='#D35400', linestyle='--', linewidth=2.0, zorder=5)
ax.plot([O[0], p1[0]], [O[1], p1[1]], [O[2], p1[2]], **kw_lines)
ax.plot([O[0], p2[0]], [O[1], p2[1]], [O[2], p2[2]], **kw_lines)
ax.plot([O[0], p3[0]], [O[1], p3[1]], [O[2], p3[2]], **kw_lines)

# ================= 5. 标注顶点与原点 =================
ax.scatter(*O, color='black', s=90, zorder=10)
ax.text(O[0]-0.2, O[1]+0.2, O[2]-0.3, r'$\mathbf{O}(0,0,0)$', fontsize=18, fontweight='bold')

tri_center = (p1 + p2 + p3) / 3
for p, label in zip([p1, p2, p3], [r'$\mathbf{p}_{t_1}$', r'$\mathbf{p}_{t_2}$', r'$\mathbf{p}_{t_3}$']):
    ax.scatter(*p, color='black', s=50, zorder=15)
    # 动态偏移标签，避免重叠
    offset = (p - tri_center) * 0.4
    ax.text(p[0] + offset[0], p[1] + offset[1], p[2] + offset[2], label, fontsize=18)

# ================= 6. 视角与绝对比例设定 =================
ax.set_xlim([-R, R])
ax.set_ylim([-R, R])
ax.set_zlim([-R, R])

# 强制锁定 3D 坐标轴比例为 1:1:1
ax.set_box_aspect([1, 1, 1])

ax.view_init(elev=25, azim=-45)
ax.axis('off')

# 添加顶部标题
ax.set_title('Volume Constraint Projection', fontsize=16, pad=3)

plt.tight_layout()
plt.savefig('volume_constraint_no_normal.pdf', format='pdf', bbox_inches='tight')
plt.show()