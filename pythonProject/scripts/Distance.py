import numpy as np
import matplotlib.pyplot as plt

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm'

# ================= 1. 定义质点与物理状态 =================
# 初始质点位置 (处于被拉伸的非法状态 L > d)
p1 = np.array([2.0, 4.0])
p2 = np.array([7.0, 6.0])

# 计算相对向量与长度
r = p1 - p2
L = np.linalg.norm(r)
n = r / L  # 内部计算仍需单位方向向量

# 设定原长 d (小于当前长度 L)
d = 3.0

# 模拟修正量 (为了可视化展示，按比例缩放)
# 由于 L > d (C > 0)，使得 \Delta p1 与 n 反向，拉近两点
correction_mag = (L - d) / 2.0
dp1 = -correction_mag * n
dp2 = correction_mag * n

# ================= 2. 创建画布 =================
fig, ax = plt.subplots(figsize=(9, 5), dpi=150)

# ================= 3. 绘制核心几何元素 =================
# 3.1 绘制原始连线 (表示当前长度 L)
ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='lightgray', linestyle='--', linewidth=2, zorder=1)
ax.text((p1[0]+p2[0])/2 - 0.2, (p1[1]+p2[1])/2 + 0.3, f'Current Length $L > d$', color='gray', fontsize=12, rotation=21)

# 3.2 绘制目标原长标尺 (d)
# 找到连线中点，向两边延伸 d/2
mid = (p1 + p2) / 2
d_p1 = mid + (d/2) * n
d_p2 = mid - (d/2) * n

# 绘制原长线段与端点标记
ax.plot([d_p1[0], d_p2[0]], [d_p1[1], d_p2[1]], color='#2980B9', linewidth=3, zorder=2)
ax.plot([d_p1[0], d_p1[0]-n[1]*0.2], [d_p1[1], d_p1[1]+n[0]*0.2], color='#2980B9', linewidth=2) # 左挡板
ax.plot([d_p2[0], d_p2[0]-n[1]*0.2], [d_p2[1], d_p2[1]+n[0]*0.2], color='#2980B9', linewidth=2) # 右挡板
ax.text(mid[0] - 0.2, mid[1] - 0.5, r'Rest Length $d$', color='#2980B9', fontsize=13, rotation=21)

# 3.3 绘制质点及质量标注
ax.plot(p1[0], p1[1], 'ko', markersize=9, zorder=5)
ax.plot(p2[0], p2[1], 'ko', markersize=9, zorder=5)
# 在标签中加入了质量 (m)
ax.text(p1[0] - 0.8, p1[1] + 0.1, r'$\mathbf{p}_1 (m)$', fontsize=16)
ax.text(p2[0] + 0.2, p2[1] + 0.1, r'$\mathbf{p}_2 (m)$', fontsize=16)

# ================= 4. 绘制位置修正向量 =================
# 绘制 \Delta p1
ax.annotate('', xy=p1 + dp1, xytext=p1,
            arrowprops=dict(facecolor='#27AE60', edgecolor='#27AE60', width=2.5, headwidth=9))
ax.text(p1[0] + dp1[0]/2 - 0.3, p1[1] + dp1[1]/2 - 0.4, r'$\Delta\mathbf{p}_1$', fontsize=15, color='#27AE60')

# 绘制 \Delta p2
ax.annotate('', xy=p2 + dp2, xytext=p2,
            arrowprops=dict(facecolor='#27AE60', edgecolor='#27AE60', width=2.5, headwidth=9))
ax.text(p2[0] + dp2[0]/2 + 0.1, p2[1] + dp2[1]/2 - 0.5, r'$\Delta\mathbf{p}_2$', fontsize=15, color='#27AE60')

# ================= 5. 画布排版 =================
ax.set_aspect('equal')
ax.set_xlim([0.5, 8.5])
ax.set_ylim([2.5, 7.5])
ax.axis('off')
ax.set_title('Distance Constraint Projection', fontsize=16, pad=15)

plt.tight_layout()
plt.savefig('distance_constraint.pdf', format='pdf', bbox_inches='tight')
plt.show()