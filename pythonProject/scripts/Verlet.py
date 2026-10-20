import numpy as np
import matplotlib.pyplot as plt

# ================= 0. 全局样式配置 =================
# 移除中文字体配置，使用默认的纯英文标签，彻底解决乱码问题
plt.style.use('default')
plt.rcParams['axes.unicode_minus'] = False  # 确保坐标轴负号正常显示

# ================= 1. 参数设置 =================
t_end = 25  # 仿真总时长

# Case 1: 稳定区间 (dt < 2)
dt_stable = 0.5
t_stable = np.arange(0, t_end + dt_stable, dt_stable)
x_stable = np.zeros_like(t_stable)

# Case 2: 发散区间 (dt > 2)
dt_unstable = 2.05
# 发散极快，计算到 t=20 即可，避免纵轴比例失控
t_unstable = np.arange(0, 20 + dt_unstable, dt_unstable)
x_unstable = np.zeros_like(t_unstable)

# ================= 2. 初始状态设定 =================
# 假设 x0 = 1, v0 = 0。由于弹簧振子 a = -x，所以 a0 = -1
# Verlet 需要两个历史位置 x0 和 x1 来启动，我们利用泰勒展开计算出高精度的 x1：
# x1 = x0 + v0*dt + 0.5*a0*dt^2
x_stable[0] = 1.0
x_stable[1] = 1.0 - 0.5 * dt_stable**2

x_unstable[0] = 1.0
x_unstable[1] = 1.0 - 0.5 * dt_unstable**2

# ================= 3. 核心 Verlet 积分迭代 =================
# 经典位置更新公式：x(t+dt) = (2 - dt^2)*x(t) - x(t-dt)
for i in range(1, len(t_stable) - 1):
    x_stable[i+1] = (2 - dt_stable**2) * x_stable[i] - x_stable[i-1]

for i in range(1, len(t_unstable) - 1):
    x_unstable[i+1] = (2 - dt_unstable**2) * x_unstable[i] - x_unstable[i-1]

# ================= 4. 解析解（参考基准） =================
t_exact = np.linspace(0, t_end, 1000)
x_exact = np.cos(t_exact)

# ================= 5. 学术级图表排版 =================
fig, axs = plt.subplots(1, 2, figsize=(12, 5), dpi=150)

# 子图1：稳定区间 (Stable Region)
axs[0].plot(t_exact, x_exact, color='gray', linestyle='--', linewidth=1.5, alpha=0.8, label='Exact Solution')
axs[0].plot(t_stable, x_stable, marker='o', color='#2ECC71', linewidth=1.5, markersize=5, label='Verlet Integration')
axs[0].set_title(f'Case 1: Stable Region ($\\Delta t = {dt_stable} < 2$)', fontsize=14, pad=10)
axs[0].set_xlabel('Time t', fontsize=12)
axs[0].set_ylabel('Position x', fontsize=12)
axs[0].legend(loc='upper right', fontsize=11, framealpha=0.9, edgecolor='black')
axs[0].grid(True, linestyle=':', alpha=0.6)
axs[0].set_ylim([-1.5, 1.5])

# 子图2：发散区间 (Unstable Region)
axs[1].plot(t_unstable, x_unstable, marker='o', color='#E74C3C', linewidth=1.5, markersize=5, label='Verlet (Explosion)')
axs[1].set_title(f'Case 2: Unstable Region ($\\Delta t = {dt_unstable} > 2$)', fontsize=14, pad=10)
axs[1].set_xlabel('Time t', fontsize=12)
axs[1].set_ylabel('Position x', fontsize=12)
axs[1].legend(loc='upper left', fontsize=11, framealpha=0.9, edgecolor='black')
axs[1].grid(True, linestyle=':', alpha=0.6)

# 自动调整子图间距
plt.tight_layout()

# ================= 6. 保存高质量矢量图 =================
plt.savefig('verlet_stability_english.pdf', format='pdf', bbox_inches='tight')
plt.show()