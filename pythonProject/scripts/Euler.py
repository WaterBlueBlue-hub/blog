import numpy as np
import matplotlib.pyplot as plt

# ================= 1. 参数设置 =================
dt = 0.2  # 时间步长
steps = 150  # 模拟的总步数
x0, v0 = 1.0, 0.0  # 初始状态

# ================= 2. 数据初始化 =================
x_exp, v_exp = np.zeros(steps), np.zeros(steps)
x_imp, v_imp = np.zeros(steps), np.zeros(steps)
x_semi, v_semi = np.zeros(steps), np.zeros(steps)

x_exp[0], v_exp[0] = x0, v0
x_imp[0], v_imp[0] = x0, v0
x_semi[0], v_semi[0] = x0, v0

# ================= 3. 核心数值积分 =================
for i in range(steps - 1):
    # 1. 显式欧拉 (Explicit Euler) - 能量发散
    x_exp[i + 1] = x_exp[i] + dt * v_exp[i]
    v_exp[i + 1] = v_exp[i] - dt * x_exp[i]

    # 2. 隐式欧拉 (Implicit Euler) - 能量耗散
    factor = 1.0 / (1.0 + dt ** 2)
    x_imp[i + 1] = (x_imp[i] + dt * v_imp[i]) * factor
    v_imp[i + 1] = (v_imp[i] - dt * x_imp[i]) * factor

    # 3. 半隐式欧拉 (Semi-implicit Euler / Symplectic) - 辛特征，能量守恒
    v_semi[i + 1] = v_semi[i] - dt * x_semi[i]
    x_semi[i + 1] = x_semi[i] + dt * v_semi[i + 1]

# 解析解（理想圆）
t_exact = np.linspace(0, steps * dt, 1000)
x_exact = np.cos(t_exact)
v_exact = -np.sin(t_exact)

# ================= 4. 学术级图表排版 (1x3 子图) =================
plt.style.use('default')
# 创建 1行3列 的画布，宽度稍宽以容纳三个图
fig, axs = plt.subplots(1, 3, figsize=(18, 6), dpi=150)

# 定义各个子图的数据和样式参数
plots_info = [
    {
        'ax': axs[0], 'x': x_exp, 'v': v_exp,
        'color': '#E74C3C', 'title': 'Explicit Euler\n(Energy Explodes)', 'label': 'Explicit Euler'
    },
    {
        'ax': axs[1], 'x': x_imp, 'v': v_imp,
        'color': '#3498DB', 'title': 'Implicit Euler\n(Energy Dissipates)', 'label': 'Implicit Euler'
    },
    {
        'ax': axs[2], 'x': x_semi, 'v': v_semi,
        'color': '#2ECC71', 'title': 'Semi-implicit Euler\n(Symplectic)', 'label': 'Semi-implicit Euler'
    }
]

# ================= 5. 循环绘制并统一坐标轴样式 =================
for info in plots_info:
    ax = info['ax']

    # 绘制解析解参考线
    ax.plot(x_exact, v_exact, color='gray', linestyle='--', linewidth=1.5, alpha=0.7, label='Exact Solution')

    # 绘制当前数值方法的轨迹
    ax.plot(info['x'], info['v'], color=info['color'], linewidth=1.8, label=info['label'])

    # 标记起点
    ax.plot(x0, v0, 'ko', markersize=6, label='Initial State')

    # 标题与标签
    ax.set_title(info['title'], fontsize=14, pad=15)
    ax.set_xlabel('Position x', fontsize=12)
    ax.set_ylabel('Velocity v', fontsize=12)

    # 移除右上边框，十字交叉坐标系
    ax.spines['left'].set_position('zero')
    ax.spines['bottom'].set_position('zero')
    ax.spines['right'].set_color('none')
    ax.spines['top'].set_color('none')

    # 图例、比例与网格
    ax.legend(loc='upper right', fontsize=10, framealpha=0.9, edgecolor='black')
    ax.set_aspect('equal', adjustable='box')
    ax.grid(True, linestyle=':', alpha=0.6)

# 自动调整子图间距
plt.tight_layout()

# ================= 6. 保存高质量矢量图 =================
plt.savefig('phase_space_separated.pdf', format='pdf', bbox_inches='tight')
plt.show()