import numpy as np
import matplotlib.pyplot as plt

# ================= 0. 全局样式配置 =================
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['mathtext.fontset'] = 'cm' # 使用 Computer Modern 字体渲染数学符号

# ================= 1. 定义约束函数 (以距离约束为例: x^2 + y^2 - R^2 = 0) =================
R = 1.0
def C(x, y):
    return x**2 + y**2 - R**2

def grad_C(x, y):
    return np.array([2*x, 2*y])

# ================= 2. 生成背景等值线 (标量场) =================
x_val = np.linspace(-0.2, 1.8, 400)
y_val = np.linspace(-0.2, 1.8, 400)
X, Y = np.meshgrid(x_val, y_val)
Z = C(X, Y)

fig, ax = plt.subplots(figsize=(7, 7), dpi=150)

# 画等值线 (虚线，表示偏离流形后的 C(q) > 0 的各个层级)
contours = ax.contour(X, Y, Z, levels=[0.5, 1.0, 1.5, 2.0], colors='lightgray', linestyles='dashed', alpha=0.7)

# 画约束流形 C(q) = 0 (粗实线)
manifold = ax.contour(X, Y, Z, levels=[0.0], colors='#2980B9', linewidths=2.5)

# ================= 3. 核心物理过程演示 =================
# 3.1 初始合法状态 q_n (在流形上)
theta_n = np.pi / 6  # 30度
q_n = np.array([R * np.cos(theta_n), R * np.sin(theta_n)])

# 3.2 惯性预测状态 q_pred (飞出流形)
# 假设沿着切线方向的惯性速度
velocity = np.array([-np.sin(theta_n), np.cos(theta_n)]) * 0.8
q_pred = q_n + velocity

# 3.3 计算预测点处的梯度和修正向量
g = grad_C(q_pred[0], q_pred[1])
g_norm = g / np.linalg.norm(g) # 单位化用于画图展示

# 找到拉回流形的最近点 q_new
q_new = q_pred / np.linalg.norm(q_pred) * R
correction_vec = q_new - q_pred

# ================= 4. 绘制点和向量箭头 =================
# 画 q_n
ax.plot(q_n[0], q_n[1], 'ko', markersize=7)
ax.text(q_n[0]+0.05, q_n[1]-0.05, r'$\mathbf{q}_n$', fontsize=14)

# 画惯性运动箭头 (q_n -> q_pred)
ax.annotate('', xy=q_pred, xytext=q_n, arrowprops=dict(facecolor='gray', edgecolor='gray', arrowstyle='->', lw=2))
ax.text((q_n[0]+q_pred[0])/2 - 0.15, (q_n[1]+q_pred[1])/2 + 0.05, r'Inertial', fontsize=12, color='gray', rotation=0)

# 画 q_pred
ax.plot(q_pred[0], q_pred[1], 'ro', markersize=7)
ax.text(q_pred[0]+0.05, q_pred[1]+0.05, r'$\mathbf{q}_{\text{pred}}$', fontsize=14, color='#E74C3C')

# 画梯度方向 (向外)
ax.annotate('', xy=q_pred + g_norm*0.3, xytext=q_pred, arrowprops=dict(facecolor='#E67E22', edgecolor='#E67E22', arrowstyle='->', lw=2))
ax.text(q_pred[0] + g_norm[0]*0.35, q_pred[1] + g_norm[1]*0.35, r'$\nabla C(\mathbf{q}_{\text{pred}})$', fontsize=14, color='#E67E22')

# 画约束投影修正箭头 (向内，沿着负梯度)
ax.annotate('', xy=q_new, xytext=q_pred, arrowprops=dict(facecolor='#27AE60', edgecolor='#27AE60', arrowstyle='->', lw=2.5))
ax.text((q_pred[0]+q_new[0])/2 + 0.05, (q_pred[1]+q_new[1])/2, r'$\Delta\mathbf{q} \propto -\nabla C$', fontsize=13, color='#27AE60')

# 画 q_new
ax.plot(q_new[0], q_new[1], 'go', markersize=7)
ax.text(q_new[0]-0.15, q_new[1]-0.1, r'$\mathbf{q}_{\text{new}}$', fontsize=14, color='#27AE60')

# ================= 5. 坐标轴与排版美化 =================
ax.text(0.9, 0.35, r'$C(\mathbf{q}) = 0$', fontsize=14, color='#2980B9', rotation=0)
ax.text(1.2, 0.75, r'$C(\mathbf{q}) > 0$', fontsize=12, color='gray')

ax.set_aspect('equal')
ax.set_xlim([0, 1.6])
ax.set_ylim([0, 1.6])
ax.set_xticks([]) # 隐藏坐标轴刻度，更纯粹的几何展示
ax.set_yticks([])
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.spines['bottom'].set_visible(False)
ax.spines['left'].set_visible(False)

plt.tight_layout()
plt.savefig('manifold_projection.pdf', format='pdf', bbox_inches='tight')
plt.show()