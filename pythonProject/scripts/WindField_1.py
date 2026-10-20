import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import numpy as np


def plot_3d_bone_aerodynamics():
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')

    # --- 1. 还原 LBSBoneGizmo 的 3D 骨骼拓扑 ---
    # 定义缩放比例
    L = 4.0  # 骨骼长度
    R = 0.6  # 根部最大半径

    # 提取脚本中的顶点结构并缩放
    verts = np.array([
        [R, 0, 0], [0, R, 0], [-R, 0, 0], [0, -R, 0],  # 根部 0-3
        [R * 0.45, 0, L * 0.55], [0, R * 0.45, L * 0.55], [-R * 0.45, 0, L * 0.55], [0, -R * 0.45, L * 0.55],  # 过渡区 4-7
        [0, 0, L]  # 尖端 8
    ])

    # 严格按照脚本逻辑重构三角形面片
    tris = [
        # 侧面底段 (quads拆分为2个tri)
        [verts[0], verts[1], verts[5]], [verts[0], verts[5], verts[4]],
        [verts[1], verts[2], verts[6]], [verts[1], verts[6], verts[5]],
        [verts[2], verts[3], verts[7]], [verts[2], verts[7], verts[6]],
        [verts[3], verts[0], verts[4]], [verts[3], verts[4], verts[7]],
        # 侧面尖端
        [verts[4], verts[5], verts[8]], [verts[5], verts[6], verts[8]],
        [verts[6], verts[7], verts[8]], [verts[7], verts[4], verts[8]]
    ]

    # 绘制青色的实心骨骼 (对应脚本中的中间段颜色 Color.cyan)
    bone_mesh = Poly3DCollection(tris, facecolors='cyan', edgecolors='darkcyan', linewidths=0.5, alpha=0.3)
    ax.add_collection3d(bone_mesh)

    # 画底部的关节球 (绿色/青色圆球近似)
    u, v = np.mgrid[0:2 * np.pi:15j, 0:np.pi:10j]
    sphere_r = R * 0.9
    x = sphere_r * np.cos(u) * np.sin(v)
    y = sphere_r * np.sin(u) * np.sin(v)
    z = sphere_r * np.cos(v)
    ax.plot_surface(x, y, z, color='cyan', alpha=0.5, edgecolor='none')

    # --- 2. 在 3D 空间中定义错开的空气动力学矢量 ---
    # 受力质点选在骨骼中部，避免遮挡
    origin = np.array([0, 0, L / 2])
    ax.scatter(*origin, color='k', s=50, zorder=5)

    # 法向量 n_i (倾斜向上)
    n_i = np.array([0, 2.5, 1.5])
    n_unit = n_i / np.linalg.norm(n_i)
    n_i_scaled = n_unit * 3.0

    # 骨骼速度 v_i 和 风场速度 u
    v_i = np.array([2.0, 1.0, 1.5])
    u = np.array([-1.5, -2.0, -1.0])

    # 相对速度 v_rel
    v_rel = v_i - u

    # 相对速度在法线上的投影 v_n * n_i
    v_n_mag = np.dot(v_rel, n_unit)
    v_n_vec = v_n_mag * n_unit

    # 法向阻力 F_bone (反向)
    F_bone = - (v_n_mag * abs(v_n_mag)) * 0.15 * n_unit  # 缩放0.15以适配图表

    # --- 3. 绘制 3D 箭头与辅助线 ---
    def draw_vector(v_start, v_dir, color, label, offset=(0, 0, 0)):
        ax.quiver(*v_start, *v_dir, color=color, length=1.0, arrow_length_ratio=0.15, linewidth=2.5)
        ax.text(*(v_start + v_dir + np.array(offset)), label, color=color, fontsize=14, fontweight='bold')

    # 绘制主要矢量
    draw_vector(origin, n_i_scaled, 'black', r'$n_i$', offset=(0.2, 0.2, 0))
    draw_vector(origin, v_i, 'blue', r'$v_i$', offset=(0.2, -0.2, 0))
    draw_vector(origin, u, 'deepskyblue', r'$u$', offset=(-0.5, 0, 0))
    draw_vector(origin, v_rel, 'purple', r'$v_{rel}$', offset=(0.2, 0.2, 0))

    # 绘制投影矢量与辅助线
    draw_vector(origin, v_n_vec, 'orange', r'$v_n n_i$', offset=(-0.5, 0.5, 0))
    draw_vector(origin, F_bone, 'red', r'$F_{bone}$', offset=(0, 0, -0.5))

    # 相对速度到法线投影的虚线
    ax.plot([origin[0] + v_rel[0], origin[0] + v_n_vec[0]],
            [origin[1] + v_rel[1], origin[1] + v_n_vec[1]],
            [origin[2] + v_rel[2], origin[2] + v_n_vec[2]], 'k--', alpha=0.5)

    # 平行四边形辅助线 (表示 v_i 和 -u 的合成)
    ax.plot([origin[0] + v_i[0], origin[0] + v_rel[0]],
            [origin[1] + v_i[1], origin[1] + v_rel[1]],
            [origin[2] + v_i[2], origin[2] + v_rel[2]], color='deepskyblue', linestyle='--', alpha=0.6)

    # --- 4. 视角与场景设置 ---
    ax.set_xlim([-3, 3])
    ax.set_ylim([-3, 3])
    ax.set_zlim([-1, 5])

    # 隐藏轴线背景框以突出几何体
    ax.xaxis.pane.fill = False
    ax.yaxis.pane.fill = False
    ax.zaxis.pane.fill = False
    ax.grid(False)
    ax.axis('off')

    # 调整到一个能清晰错开所有矢量的倾斜俯视角
    ax.view_init(elev=20, azim=45)
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    plot_3d_bone_aerodynamics()