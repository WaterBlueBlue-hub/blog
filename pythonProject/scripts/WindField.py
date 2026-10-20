import matplotlib.pyplot as plt
import numpy as np
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# 设置全局字体，使其在非 LaTeX 环境下也能渲染出类似学术论文的数学符号风格
plt.rcParams['mathtext.fontset'] = 'stix'
plt.rcParams['font.family'] = 'serif'

fig = plt.figure(figsize=(8, 6))
ax = fig.add_subplot(111, projection='3d')

# 1. 定义三角形面片（模拟布料的局部拓扑）
v1 = np.array([-1.5, -1.0, 0.0])
v2 = np.array([1.5, -0.5, 0.2])
v3 = np.array([0.0, 1.5, -0.1])
vertices = [v1, v2, v3]

# 计算质心
centroid = (v1 + v2 + v3) / 3.0

# 计算法线向量 n
edge1 = v2 - v1
edge2 = v3 - v1
normal = np.cross(edge1, edge2)
normal = normal / np.linalg.norm(normal)

# 绘制三角形面片（半透明青色，带有蓝色线框）
poly = Poly3DCollection([vertices], alpha=0.2, facecolors='cyan', edgecolors='royalblue', linewidths=1.5)
ax.add_collection3d(poly)

# 2. 定义相对速度与分解分量
# 假设一个吹向面片的相对风速 v_rel
v_rel = np.array([0.8, 1.2, 1.8])

# 正交分解：法向分量 v_n 和 切向分量 v_t
v_n_mag = np.dot(v_rel, normal)
v_n = v_n_mag * normal
v_t = v_rel - v_n

# 3. 辅助绘图函数：绘制三维箭头与标签
def draw_vector(ax, start, vec, color, label, text_offset=(0, 0, 0.1)):
    # 绘制箭头
    ax.quiver(start[0], start[1], start[2],
              vec[0], vec[1], vec[2],
              color=color, arrow_length_ratio=0.1, linewidth=2.5)
    # 绘制数学标签
    end = start + vec
    ax.text(end[0] + text_offset[0],
            end[1] + text_offset[1],
            end[2] + text_offset[2],
            label, color=color, fontsize=16)



# 绘制相对速度 v_rel (红色)
draw_vector(ax, centroid, v_rel, 'crimson', r'$\mathbf{v}_{rel}$', text_offset=(0.1, 0, 0.1))

# 绘制法向分量 v_n (蓝色)
draw_vector(ax, centroid, v_n, 'mediumblue', r'$\mathbf{v}_n$', text_offset=(-0.3, 0.1, 0.1))

# 绘制切向分量 v_t (绿色)
draw_vector(ax, centroid, v_t, 'forestgreen', r'$\mathbf{v}_t$', text_offset=(0.1, -0.2, 0.1))

# 4. 绘制投影辅助线（虚线平行四边形）
# 从 v_n 顶点连向 v_rel 顶点
ax.plot([centroid[0] + v_n[0], centroid[0] + v_rel[0]],
        [centroid[1] + v_n[1], centroid[1] + v_rel[1]],
        [centroid[2] + v_n[2], centroid[2] + v_rel[2]],
        color='black', linestyle='--', alpha=0.5, linewidth=1.5)

# 从 v_t 顶点连向 v_rel 顶点
ax.plot([centroid[0] + v_t[0], centroid[0] + v_rel[0]],
        [centroid[1] + v_t[1], centroid[1] + v_rel[1]],
        [centroid[2] + v_t[2], centroid[2] + v_rel[2]],
        color='black', linestyle='--', alpha=0.5, linewidth=1.5)

# 5. 调整视角与显示设置
ax.view_init(elev=20, azim=-55) # 调整观察仰角与方位角
ax.set_xlim([-2, 2])
ax.set_ylim([-2, 2])
ax.set_zlim([-0.5, 2.5])

# 隐藏坐标轴，使其看起来像一张纯净的几何示意图
ax.axis('off')

plt.tight_layout()

# 导出为高精度 PDF 矢量图（推荐在 Overleaf 中使用此格式）
plt.savefig("Aerodynamic_Decomposition.pdf", format='pdf', bbox_inches='tight', transparent=True)
print("矢量图已生成并保存为 Aerodynamic_Decomposition.pdf")

# 在窗口中展示图片
plt.show()