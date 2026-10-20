# AGENTS.md

> 本文件记录本仓库的定位、目录结构、技术栈、核心实现与协作约定，供后续 AI 协作者 / 开发者快速上手。
> 内容基于仓库现状通读整理，标注了「已验证事实」与「需注意的现状」两类信息。
> 最后整理时间：2026-09-22。

---

## 1. 项目定位

本仓库是一个**实时物理模拟方向的技术作品集**（工程目录名 `腾讯_动画仿真_游戏引擎物理骨骼`），核心主题是：

**在 Unity 中从零自研 XPBD（Extended Position-Based Dynamics，基于位置的合规约束动力学）解算器**，并把它做成一整套可调、可视、可用于角色动画的物理系统。

作品集的能力覆盖范围：

- **解算器**：从 PBD / XPBD 论文出发手写积分器、约束投影、拉格朗日乘子、合规度（compliance）参数体系，不依赖 Unity 内置 Cloth，也不使用第三方布料求解器。
- **解算体**：布料、绳索、布气球（体积约束）、骨骼链（头发 / 裙摆 / 飘带等角色附件）、PBF 流体。
- **交互与表现**：解析几何碰撞（球 / 盒 / 胶囊）+ CCD、风场气动、有效逆质量摩擦、PBD 动量守恒阻尼、粒子休眠；自碰撞（空间哈希）有代码但尚未启用。
- **DCC / 工具链**：织物 PCG（折痕烘焙 + 柔度权重贴图与画笔）、LBS 蒙皮权重工具（平面蒙皮、裙摆-大腿影响权重绑定）、Play Mode 帧序列截屏与视频合成。
- **理论沉淀**：20 篇理论笔记（数值积分器、迭代法、分析力学、连续介质力学、物理模拟线性代数、PBD / XPBD 解读、约束函数推导、阻尼算法）+ 37 篇论文资料 + Matplotlib 数学可视化脚本。

**主交付物有两件**：

1. **系统实现**：Unity 工程 `MagicaCloth2_Text/`（自研 XPBD 管线与工具链的完整代码、场景与资产）。
2. **配套论文**：根目录《基于 XPBD 的实时物理模拟》（30 页，LaTeX 排版 2026-08-07），是该系统最完整的自述：理论推导、模块架构、各子系统设计与效果演示。详见 **§10**。

其余目录是学习资料、理论笔记与辅助脚本。

---

## 2. 目录总览

| 路径 | 类型 | 说明 |
| --- | --- | --- |
| `MagicaCloth2_Text/` | **主工程**（Unity 2022.3.62f3c1，URP） | 自研 XPBD 系统的全部实现、场景与美术资产，本作品集主体。目录内**另有独立 git 仓库** |
| `工具/` | 辅助脚本 | `论文对照/scripts/extract_layout.py`：从 TeX 排版的学术 PDF 中按阅读顺序抽取文本（重建 dvipdfm 缺失的字间空格、按栏切分双栏页并处理跨栏块），供论文对照阅读使用 |
| `笔记/` | 理论笔记（20 篇 Markdown + 配图） | 数值积分器、迭代法、分析力学、连续介质力学、物理模拟线性代数、PBD / XPBD 解读、约束函数推导、阻尼算法；多数带「（精简版）」 |
| `论文/` | 参考文献 PDF（37 篇，7 个子目录） | 解算器 / 可微求解器 / 碰撞 / 流体 / 蒙皮 / 加速算法 / 其它，文件名统一为「标题（年份）_英文原版 / _中文机翻」 |
| `pythonProject/` | 数学可视化脚本 | Matplotlib / NumPy 脚本，用于生成笔记与论文配图；`.venv` 内直接存放脚本 |
| `图片/` | 空目录 | 预留素材目录 |
| `基于_XPBD_的实时物理模拟.pdf` | **主交付物之一**：配套论文（根目录，30 页，约 12 MB） | 《基于 XPBD 的实时物理模拟》：系统的理论推导、架构设计、各子系统与效果展示，是理解工程的最佳入口，详见 **§10** |
| `AGENTS.md` | 本文件 | 项目速查与协作约定 |

> 注意：仓库**根目录不是 git 仓库**；只有 `MagicaCloth2_Text/` 内部有 `.git`。

---

## 3. 主工程 `MagicaCloth2_Text/`

### 3.1 环境与依赖

- Unity 版本：**2022.3.62f3c1**（`ProjectSettings/ProjectVersion.txt`）
- 渲染管线：**URP 14.0.12**
- 关键包：Burst 1.8.29、Collections 2.6.5、Mathematics 1.3.3、Cinemachine 2.10.3、Alembic、Animation Rigging、ProBuilder、TextMeshPro、Test Framework
- 序列化：**ForceText**（`m_SerializationMode: 2`），线性色彩空间（`m_ActiveColorSpace: 1`）
- 自定义包：`Packages/com.farlocus.locus`（Locus —— Unity 编辑器与 AI 协作的桥接包，GPL-3.0）
- `EditorBuildSettings` 的 `m_Scenes` 为空（没有配置 Build 场景列表，场景靠手动打开）

### 3.2 场景（`Assets/XPBD/Scenes/`）

| 场景 | 内容 |
| --- | --- |
| `XPBD.unity` | 主场景：角色（Avatar / 三月七）+ 布料 + 窗帘 + 布气球 + 绳索，含 `XPBD_GlobalSolver`。场景内已有挂接的 `Cloth_System/Cloth`、`Curtain_System/Curtain`、`ClothBalloon_System/ClothBalloon`、`Rope_System/Rope` |
| `XPBD 1.unity` | 与 `XPBD.unity` 高度相似的副本场景（约 594 KB，按命名与体量推断为对照 / 备份实验用） |
| `Cloth.unity` | 纯布料实验场景：`Cloth_System/Cloth`、`Curtain_System/Curtain`、`Flag_System（有折痕）/Flag`、`Flag_System（无折痕） /Flag`（根物体名带尾随空格）、`ClothBalloon_System/ClothBalloon`、骨骼链（`Bone00..Bone04`、`Chain01..Chain04`）、地面 Terrain、`WindField` |
| `Water.unity` | PBF 流体场景：`WaterPool`（含四壁 `Wall_X±`/`Wall_Z±` 与 `Floor`）+ `FluidBody` |

`CaptureOutput/布气球_1..5.png` 是布气球效果的序列帧输出样例。

### 3.3 XPBD 系统代码结构（`Assets/XPBD/Scripts/`）

```
Scripts/
├── XPBD_Solver.cs                    全局解算器（唯一入口 MonoBehaviour）
├── Body/
│   ├── XPBD_Body.cs                  抽象基类（粒子数据 / 锚点 / 可视化 / 抽象接口）
│   ├── XPBD_ClothBody.cs             布料（网格、拓扑策略、折痕）
│   ├── XPBD_ClothBalloonBody.cs      布气球（在布料基础上 + 体积约束）
│   ├── XPBD_RopeBody.cs              绳索
│   ├── XPBD_BoneBody.cs              骨骼链（头发 / 裙摆 / 飘带，动画跟随）
│   ├── XPBD_FluidBody.cs             PBF 流体
│   ├── FluidPBFJobs.cs               PBF 的 Burst / Job 核函数
│   └── Editor/                       Body 的 CustomEditor（Body / BoneBody / ClothBody）
├── Constraints/
│   ├── Core/XPBD_Constraint.cs       约束基类（alpha / beta / lambda）
│   ├── Structural/                   距离、系链、弯曲、骨骼弯曲、姿态维持、扭转、折叠方向、体积
│   ├── Interaction/                  解析碰撞、碰撞基类、碰撞管理器、厚度覆盖、碰撞体 Gizmo
│   ├── SelfCollisionConstraint.cs    自碰撞约束
│   └── SpatialHasher.cs              空间哈希（自碰撞用）
├── Cloth/
│   ├── FabricProfile.cs              织物 PCG 数据资产（ScriptableObject）
│   └── Editor/                       权重刷工具、Profile 检视器扩展
├── Skin/                             LBS 蒙皮工具（含 Editor/）
├── WindField/                        风场（含 Editor/）
└── CameraCapture/                    Play Mode 帧序列截屏（含 Editor/）
```

### 3.4 解算器主流程（`XPBD_Solver.cs`）

解算器挂在场景中的 **`XPBD_GlobalSolver`** 节点上，**在 `LateUpdate` 中驱动**（保证角色 Animator 先更新骨骼，再由物理接管）：

1. **预处理**（逐个 Body）：记录旧位置 → 动画混合 `ApplyAnimationBlend` → 风场 `ApplyTo` → 局部空气阻力 → **预测位置**（重力 + 阻尼 + PBD 动量守恒阻尼）→ 固定点 `FixEndpoints` → 重置拉格朗日乘子并同步约束参数。
2. **预稳定化**：用当前帧所有碰撞几何体与地面计算修正量并做加权平均位移，抑制初始穿插。
3. **求解与碰撞**：按 `collisionBeforeConstraints` 决定顺序：
   - `false`（默认）：先约束投影，后碰撞（保证不穿模）
   - `true`：先碰撞再结构约束（裙摆等绕肢体布料防卷绕）
4. **帧末**：缓存当前碰撞体变换，供下一帧 CCD 使用。
5. **后处理**：`UpdateStates`（由位置差反推速度）→ 速度限幅 `ClampVelocity` → 粒子休眠 → `SyncVisuals` 回写网格 / 骨骼。

**约束分组与求解顺序**（`ConstraintGroupOrder`，组间串行、组内并行、全部使用 SOR 松弛 `sorRelaxation`）：

```
0 DistanceConstraint
1 TetherConstraint
2 BendingConstraint / BoneBendingConstraint
3 RestPoseConstraint
4 TwistConstraint / FoldDirectionConstraint
5 VolumeConstraint
```

> 现状提示：`GetGroupIndex` 对 `SelfCollisionConstraint` 与未知类型返回索引 `6`，但 `ConstraintGroupOrder` 只有 6 组（索引 0–5）。当前没有任何 Body 生成自碰撞约束，因此未触发；**若将来启用自碰撞，必须先补齐分组表，否则 `BuildGroups` 会数组越界**。

> 例外：**`XPBD_FluidBody` 不走这条管线**。它是自包含的 PBF 实现（自带 `Awake` / `LateUpdate` / `StepFluid` / `RenderFluid`），拓扑与约束接口全部为空实现，因此不应把它挂进 `XPBD_Solver.bodies`（`Water.unity` 中没有 `XPBD_GlobalSolver`）。

### 3.5 求解器全局参数（面板语义）

| 参数 | 含义 |
| --- | --- |
| `gravity` / `damping` | 重力；全局速度衰减（模拟空气阻力，默认 0.99） |
| `pbdDamping` | **PBD 动量守恒阻尼**：把速度正交分解为平动 / 转动 / 形变三部分，只衰减形变分量，因此不影响整体抛物线与旋转姿态 |
| `particleSpeedLimit` | 粒子速度上限（防爆） |
| `floor` | 地面高度（解析平面约束） |
| `collisionObjects` | 参与碰撞的碰撞体列表（球 / 盒 / 胶囊，解析几何） |
| `collisionThickness` | 全局碰撞厚度缓冲（可被 `ColliderThicknessOverride` 逐体覆盖） |
| `collisionSubsteps` | CCD 子步数 |
| `stabilizationIterations` | 预稳定化迭代次数 |
| `iterations` / `sorRelaxation` | 约束投影迭代次数 / SOR 松弛系数 |
| `maxTimeStep` | 最大物理步长（限制 `Time.deltaTime`） |
| `enableParticleSleeping` + `sleepVelocityThreshold` / `sleepPositionThreshold` | 粒子休眠（低速 + 小位移时冻结到休眠锚点，抑制漂移） |
| `bodies` / `windFields` | 参与解算的物体与风场列表 |

### 3.6 关键参数语义：柔度映射（Compliance）

美术可调参数（0–1）不直接作为物理量，而是**映射**为 XPBD 的合规度 `alpha` / 阻尼 `beta`。各 Body 内使用 `MAP_RATIO = 100`：

| Body | 映射（节选） |
| --- | --- |
| 布料 | `stretch → 0.0001·100^s`；`bendCompliance → 0.1·100^b`；`tetherCompliance → ×0.1`；折痕方向 `0.0001·100^f` |
| 绳索 / 布气球 | `stretch → 0.0001·100^s`；`max_dis → ×10`（绳索）/ `×0.1`（气球）；布气球体积 `0.00001·100^v` |
| 骨骼 | `restPoseCompliance → 0.1·c²`；`stretch → 0.0001·100^s`；`bending → ×10`；`airDrag → ×20` |

阻尼：`beta = 参数 × 系数`（布料拉伸 ×10000、弯曲 ×10 等，各 Body 不同）。

> 已知设计问题（记录在笔记中）：柔度参数目前用线性映射压到 0–1，**不符合美术调参直觉**；且 `beta` 变大会间接放大系统合规度（静态下变软变长）。

### 3.7 约束实现要素

- `XPBD_Constraint` 基类只暴露 `alpha` / `beta` / `lambda` 与 `AccumulateJacobian`（雅可比累积）/ `ResetLambda`。
- 求解形式：`Δλ = (-C - α̃λ) / (∇C·M⁻¹·∇Cᵀ + α̃)`（高斯-赛德尔形式的 XPBD 乘子更新）。
- 结构性约束：距离、系链（限制最大拉伸）、二面角弯曲、骨骼三点弯曲、姿态维持（RestPose，含权重曲线 `weightCurve` 按骨深衰减）、扭转关节安全角、折叠方向（单向折痕）、体积（布气球）。
- 二面角绕序有严格约定：`restAngle` 的绕序必须与求解器一致，**平展四边形的 `restAngle = π` 是该绕序的固有约定，不是 bug**（详见第 6 节）。

### 3.8 碰撞系统

- `CollisionManager` 统一调度：解算前先做**预稳定化**，之后按 **CCD → 离散最近点投影 → 地面** 的顺序处理；支持 `ignoredColliders` 忽略集合。
- `AnalyticCollisionConstraint` 支持 `SphereCollider` / `BoxCollider` / `CapsuleCollider` 的解析求交，**胶囊体走缓存路径**（循环外解析一次 `TransformPoint` / `lossyScale`，避免逐粒子重算导致的开销）。
- CCD：离散最近点投影 + 子步扫掠（点 / 边 / 面三套），采用新旧位置与旋转补偿。
- `ColliderThicknessOverride`：逐碰撞体覆盖碰撞厚度（`-1` 表示沿用全局），用于细肢体（手臂、肩膀）避免顶起袖子 / 裙摆。
- `CollisionShapeGizmo`：挂在 `XPBD_GlobalSolver` 上，自绘碰撞体线框（内置 Collider 线框不可改色、不可关闭）。
- `SelfCollisionConstraint` + `SpatialHasher`：自碰撞初版实现，**穿透（遂穿）问题严重，尚未启用**（见 3.4 的分组越界提示）。

### 3.9 风场（`XPBD_WindField.cs`）

- 风速场：基准风向 + 风速 + 湍流（强度 / 空间频率）+ 阵风（频率 / 幅度）。
- 气动系数：法向阻力 `dragCoefficient`（兜风 / 鼓包）、切向摩擦 `tangentialDragCoefficient`、粒子线性拖拽、骨骼网格法向阻力。
- 区域限定：世界轴对齐包围盒 + 边缘软衰减，盒外不受风。
- 可视化：包围盒、基准风向箭头、区域内实际流场箭头网格（可随时间摆动）。

### 3.10 织物 PCG（`Scripts/Cloth/`）

**`FabricProfile`（ScriptableObject）**：网格 / 拓扑 / 折痕 / 解算参数 + 两张柔度权重贴图。引用到 `XPBD_ClothBody` 后，Play 时在 `Awake` 覆盖 Body 参数；**不引用则行为完全不变**。

- 柔度语义：权重 `w ∈ 0..1` → 倍率 `weightMaxRatio^w`（默认 10000），**只作用于弯曲约束**（距离约束不采样贴图）。
- 双通道：纬向贴图（weft）控制纵向折痕（竖向折叠线），经向贴图（warp）控制横向折痕（水平折叠线）。
- 采样用 `GetPixel` **整数像素精确读取**（禁用会滤波的 `GetPixelBilinear`），像素 (x, z) 与网格顶点一一对应。
- 折痕配置六栏：`enableProceduralAnchors`（窗帘挂钩）、`anchorStep`、`foldDirectionCompliance`、`enableSideAnchors`（侧挂 / 海盗旗）、`sideAnchorStep`、`fixPoleEdge`（固定杆模式）。
- 折痕判定与拓扑生成**共用静态函数**（唯一事实源）：`XPBD_ClothBody.IsWeftCreaseColumn` / `IsSideAnchorRow`；不要另写一份。

**编辑器工具**：

- `FabricProfilePainterWindow`（菜单 `Window/XPBD/Fabric Weight Painter`）：独立权重刷窗口，画笔 / 橡皮擦、目标权重取样、新建贴图、填充 0/1、一键清除；画笔吸附顶点网格。
- `FabricProfileEditor`：底部三个按钮（打开柔度权重刷 / 重建折痕列 / 重建折痕行）。

**现成测试资产**（均在 `Assets/XPBD/Data/ClothData/`）：

| 资产 | 用途 |
| --- | --- |
| `Cloth_Test.asset` | 普通布料预设（无挂钩、无侧挂） |
| `CurtainPreset_Test.asset` | 窗帘预设（Anisotropism、挂钩 step 4、`weightMaxRatio=10000`、固定杆） |
| `Flag_Test（有折痕）.asset` / `Flag_Test（无折痕）.asset` | 旗帜预设（侧挂、sideAnchorStep 4、固定杆） |
| `*_WeftSoftness.asset` / `*_WarpSoftness.asset` | 对应的纬向 / 经向柔度贴图（Point 滤波，像素与顶点一一对应） |

蒙皮网格资产在 `Assets/XPBD/Data/Skin/`（`Body_Influence.asset`、`Plane_SkinMesh.asset`、`Plane (1)_SkinMesh.asset`、`r_SkinMesh.asset`）。

### 3.11 LBS 蒙皮工具（`Scripts/Skin/`）

- `LBSSkinTool`（`Window/Skin/LBS 平面蒙皮工具`）：`LBSSkinBinder`，把网格绑定到骨骼链并生成蒙皮网格资产（`Assets/XPBD/Data/Skin/`）。
- `LBSSkinInfluenceTool`（`Window/Skin/LBS 裙摆-大腿绑定`）：`LBSSkinInfluenceBinder`，把目标骨影响按距离衰减混入受影响顶点，用于**用蒙皮权重替代碰撞体做裙摆防穿模**。
- `LBSBoneGizmo`：每根骨骼画锥形骨骼（根绿 / 尖红 / 中青），由 `LBSSkinTool` 在生成骨骼链时 `Undo.AddComponent` 挂到骨上；`XPBD_BoneBody.showBoneSpheres` 单独控制物理粒子球的可视化。
- `LBSAssetUtility` / `LBSMathUtility`：网格资产克隆与落盘、几何距离工具（`SkinVertex` / `Projection` / `DistanceToSegment` / `DistanceFalloff`）。
- 算法脚本依赖 `AssetDatabase` / `EditorUtility` 等编辑器 API，**不能搬出 Editor 目录**（整个 Editor 目录已被排除出 Player 构建）。

### 3.12 摄像机截屏（`Assets/XPBD/CameraCapture/`）

`CameraFrameCapture`：Play Mode 下的任意分辨率 / 帧间隔 / 张数序列帧截屏（`WaitForEndOfFrame` + 离屏 `RenderTexture` 渲染，不污染 Game 视图），编辑器面板可开始 / 停止 / 打开输出目录 / 用 ffmpeg 合成 MP4。

### 3.13 角色与动画资产（与物理系统的耦合点）

- `Assets/Models/Avatar/三月七/`：角色 FBX、材质、贴图与 Animator Controller。
- `Assets/Animation/`：自研动画库，38 个文件 —— 位移（Walk / Run / Sprint / Jump / TurnBack）、攻击（Attack A–H、拔刀 / 收刀）、闪避（Dodge / Avoid / Slide / Retreat）、闲置（Idle）。
  - **当前只有 8 个 clip 真正接入了 `三月七.controller`**：`Idle`、`Walk`、`Run`、`RunEnd`、`Sprint`、`SprintEnd`、`To Sprint`、`Retreat`（对应状态：Idle / Move / MoveEnd / Sprint / Retreat 等）。
  - 控制器里已存在但 **motion 为空的占位状态**：`Attack`、`AttackB`、`Dodge（闪避状态）`、`Dash（猛冲）`；对应的攻击 / 闪避 / 跳跃 clip 属于「待接入」而非废弃 —— **不要因为"没被引用"就删除 `Assets/Animation/` 里的这些文件**（2026-09-22 清理时已据此保留）。
- `Assets/Scripts/AnimationStateMachine/`：玩家动画状态机（状态组件 + ScriptableObject 数据 + InputActions + 音频 / 相机子系统）。
- 物理与动画的时序约定：**Animator 在 `Update` 改骨骼，XPBD 在 `LateUpdate` 接管**；因此验证物理结果时不能用「冻结 Animator」的方式读 Transform（会读到动画姿势）。

### 3.14 第三方资产

| 目录 | 说明 |
| --- | --- |
| `Assets/MagicaCloth2/` | 商业布料插件（Magica Soft）的**运行时本体**（`Scripts/` + `Res/` + asmdef），作为参考实现保留；自研 XPBD 与它无关 |
| `Assets/StarRenderingStyle/` | 角色渲染风格（Shader / 材质） |

> **2026-09-22 清理（两轮，共约 580 MB）**
>
> ① 示例 / 素材类（约 453 MB）：`Assets/MagicaCloth2/Example (Can be deleted)/`（插件自带 UnityChan 示例，作者标注可删）、`Assets/Third Parts/Lucy/`（Lucy 动作素材包）、`Assets/QFX/ProjectilesFX/Demo/` + `ProjectileFX_Demo.unity`（特效包演示场景）、`Assets/Models/Avatar/三月七/三月七双剑.fbx`（未引用的角色变体）。
>
> ② 特效类（约 128 MB）：整个 `Assets/QFX/` 弹道特效包，以及角色上依赖它的两个特效预制体 `Assets/Models/Avatar/拖尾.prefab`（拖尾）与 `提示特效.prefab`（提示光效）——这两个是 QFX 在工程里唯一的落脚点，删除时必须同步清理 `XPBD.unity` / `XPBD 1.unity` 中的引用（见 §8.2）。
>
> 删除前均已核验：这些资产**没有被删除范围之外的任何文件引用**；文件移入回收站且 git 有记录，场景改动前也已备份，均可还原。

---

## 4. 已删除：早期练手工程 `刚体动力学/`

2026-09-22 删除（约 1.9 GB，其中 1.77 GB 是 Unity 的 `Library/` 缓存），用于精简作品集体积。

它曾是同版本 Unity（2022.3.62f3c1）的入门工程，内容为：PBD 布料（`PBD_model.cs` / `PBD_modelA.cs`，21×21 网格 + 结构弹簧）、隐式欧拉 + 梯度下降弹簧系统（`implicit_model*.cs`）、刚体兔子与 Shape Matching（`Rigid_Bunny.cs` / `Rigid_Bunny_by_Shape_Matching.cs`）、鼠标拖动交互（`sphere_motion.cs`），场景 `bunny.unity` / `cloth.unity`，以及内嵌的 MagicaCloth2 完整源码。

- **`bunny.obj` 与材质已提前迁出**到主工程 `Assets/XPBD/Models/Bunny/`（见 §3.13、§8.2），未随工程删除。
- 该工程**没有纳入任何 git 仓库**，因此只有回收站可还原；删除前已把其中 7 个手写脚本与 3 个场景（共约 80 KB）单独备份，需要时向维护者索取。

---

## 5. 资料与笔记

### 5.1 `笔记/`

共 20 篇 Markdown，按主题分目录。命名规律的「**（精简版）**」保留公式与结论、略去推导，作速查用。

**根目录（跨主题基础篇）**

| 文件 | 内容 |
| --- | --- |
| `常见的数值积分器.md` / `（精简版）` | 显式 / 隐式 / 半隐式欧拉的能量增长分析（如 `E_n = E_0(1+Δt²)^n`）、Verlet 推导与谱半径稳定性分析 |
| `迭代法.md` / `（精简版）` | 迭代法概念与矩阵分解、雅可比迭代 / 高斯-塞德尔迭代（矩阵推导 + 分量公式）、收敛性法则、**约束投影的雅可比与高斯-塞德尔迭代**；末尾讨论「约束集不存在可行解」时两者的差异（高斯-塞德尔在约束之间振荡，雅可比取平均后收敛） |
| `连续介质力学.md` | 动量守恒方程（欧拉描述）→ 变形梯度 → 柯西应变（无法区分拉伸与纯旋转）与格林应变（消除假形变）→ 本构模型：线性弹性、St. Venant-Kirchhoff、Neo-Hookean |
| `物理模拟中的线性代数.md` | 矩阵奇异性 / 正定性 / 海森矩阵的代数定义 + **物理模拟视角**（零能模式、能量曲面凸性、切线刚度矩阵、牛顿法、倒错时的正定投影） |
| `流形视角的约束投影.md` | 把约束视为状态空间中的流形 `C(q)=0`，说明「修正方向必须沿梯度 ∇C（法向），切向位移不改变约束误差」 |
| `阻尼算法.md` / `（精简版）` | 传统衰减系数阻尼 / PBD 全局动量守恒阻尼 / XPBD 约束阻尼三类对比，含动量守恒与数值稳定性推导、XPBD 约束阻尼的理论推导与效果分析 |
| `1.md` | 草稿：AI 协作工作流提示词（README → spec.md → task.md → 逐 Task 验收），与物理内容无关 |

**子目录（专门主题）**

| 文件 | 内容 |
| --- | --- |
| `分析力学/最小作用量原理.md` | 拉格朗日量 `L=T−V`、作用量 `S`、`δS=0` 与欧拉-拉格朗日方程推导 |
| `分析力学/拉格朗日力学.md` | 耗散势与瑞利耗散势：`F_diss = −∂D/∂q̇`，由二次型耗散势推出线性粘性阻尼 |
| `模拟算法/PBD.md` / `（精简版）` | PBD(2007) 解读：算法流程、约束投影、刚体运动正交性、线 / 角动量守恒、拉格朗日乘子、牛顿迭代法、优缺点 |
| `模拟算法/XPBD.md` / `（精简版）` | XPBD(2016) 解读：运动方程离散化、胡克定律、弹性力、乘子、线性化与 **Schur 补**推导、与半隐式欧拉的代数等效 |
| `数值分析/伴随方法.md` | 伴随状态法：由平衡方程 `F(x,p)=0` 反解梯度，把「矩阵求逆」转化为解线性方程组，避开 BPTT 式展开中间状态（可微物理的理论基础） |
| `数值分析/松弛.md` | 松弛因子 ω：`x_new = x_old + ωΔx`；ω=1 无松弛、ω>1 过松弛、0<ω<1 欠松弛 |
| `约束函数/距离约束.md` | 距离约束梯度推导 + 状态转移矩阵谱分析，得出合规度稳定下界 `α ≥ -7/4·ωΔt²` |
| `约束函数/弯曲约束.md` | 二面角约束的完整梯度推导：法向量雅可比、`q_i` 表达式与最终位置修正公式 |
| `约束集不存在可行解的情况.png` | 无解约束集下两种迭代行为的示意图 |
| `image.png` / `image-1.png` | 早期配图 |

### 5.2 `论文/`

共 37 个 PDF，按主题分 7 个子目录；多数论文同时存「`_英文原版`」与「`_中文机翻`」两份。

| 子目录 | 收录 |
| --- | --- |
| `解算器/` | PBD（2007）、XPBD（2016）、Large Steps in Cloth Simulation（1998）、PD（2014）、MD Based on SM（2005）、MGPBD（2025） |
| `可微求解器/` | DiffXPBD（2023） |
| `碰撞/` | Bridson's CCD（2002）、Collisions_vetements（1997）、Particle for Real-Time（2014） |
| `流体/` | PBF（2013）等 |
| `蒙皮/` | PSD（2000）、Real-time Shape Deformation（1）、skinning-with-dual-quaternions |
| `加速算法/` | Chebyshev（2015） |
| `其它/` | Deformation Constraints（1995）、Discrete Shells（2003）、Physically_Based_Shape_Matching（SCA 2022） |

> 小提示：`流体/` 下的 `1992ARA&A..30.543M` 实际是 PDF（文件头 `%PDF-1.4`）但缺 `.pdf` 扩展名；该目录还有两份 `PBF（2013）_英文原版 - 副本*`，属重复文件。

### 5.3 `pythonProject/`

`.venv` 目录下直接存放 Matplotlib / NumPy 教学脚本，用于生成笔记与论文配图：`Euler.py`（三种欧拉积分能量曲线）、`Verlet.py`（稳定 / 发散区间）、`Manifold.py`（约束流形与投影）、`Spring.py`（结构 / 剪切 / 弯曲弹簧拓扑）、`Distance.py`、`DihedralAngle.py`、`Bend.py`、`Bone_angle.py`、`volume.py`、`WindField.py` / `WindField_1.py`（气动分解、骨骼网格重构）、`AnalyticCollision.py` / `AnalyticCollision_1.py`（解析碰撞几何）。

> 注意：`.venv` 是**未激活可用的虚拟环境**（`pyvenv.cfg` 指向的基础解释器已不存在），脚本本身是自包含的，需要独立 Python 环境运行。

### 5.4 `工具/`

`论文对照/scripts/extract_layout.py` —— 按**阅读顺序**从学术 PDF 抽取文本，专门解决 TeX 排版 PDF 的两个坑：① dvipdfm 不写空格字符，词间空格需按字形 x 位置重建；② 双栏页面必须按栏读取，且全宽块（标题、摘要）会把页面切成有序的阅读带。

用法：`python extract_layout.py input.pdf segments.json [--debug]`，依赖 `pdfplumber`；脚本内对数学字体（CMMI / CMSY / MSBM 等）有专门识别。

---

## 6. 开发约定与已知坑

以下条目来自项目内的经验记录，**新增或修改 XPBD 系统前请先读**（完整版见 `MagicaCloth2_Text/Locus/knowledge/memory/project-mistake-note.md`）：

**工程环境**

- 项目路径含中文会导致 Unity 反射 `Assembly.GetName()` / `GetCodeBase()` 抛异常；枚举程序集时用 `asm.FullName`。
- Edit Mode 下修改场景（建删 GameObject、改字段、加碰撞体）**必须 `EditorSceneManager.SaveScene` 落盘**，否则进 Play Mode 仍是旧场景。
- 动过编辑器状态（SceneView `drawGizmos`、相机 `LookAt`）要当场还原，否则会出现「可视化坏了」的假象。
- 脚本重命名不能用文件系统 `mv`（会生成新 GUID 导致 missing script），要用 `AssetDatabase.RenameAsset`。
- 序列化字段改名会静默重置场景旧值为默认值 —— 要么加 `[FormerlySerializedAs]`，要么改完立刻检查并恢复场景值。
- 网格资产在 ForceText 下文本膨胀约 3.5 倍；LBS 绑定**不复制表情帧**（本项目 80 帧表情无人使用）。

**物理与拓扑**

- 二面角 `restAngle` 的绕序必须与求解器一致：**平展四边形 `restAngle = π` 是固有约定，不要「修正」为 0**（正确写法参照 `XPBD_ClothBalloonBody`）。
- 布料的轮廓 / 半径回弹由结构约束（距离 / 系链）决定，`RestPoseConstraint` 很软（每迭代只修约 1.5%）；**调「防穿模 / 防卷绕」不要从 rest-pose 目标下手**。
- 硬约束（`alpha≈0`）下角度约束的 `sinθ` 会退化，需要加退化防护与柔度地板，否则乘子爆炸把粒子推飞。
- 碰撞厚度与拦截半径 = 碰撞体 R + `collisionThickness` + `boneSphereRadius`；细肢体用 `ColliderThicknessOverride` 逐体覆盖。
- 布料穿模先查 `ignoredColliders`（角色根节点 Collider 会被自动忽略，需另挂细胶囊）。
- 逐粒子循环内**禁止**调用 `TransformPoint` / `lossyScale` / `GetComponent`（实测占碰撞 pass 的 30% 开销）。

**动画耦合**

- Animator 在 `Update` 改骨骼、XPBD 在 `LateUpdate` 接管；`anim.speed=0` 冻结会覆盖物理结果，要观察模拟结果须 `anim.enabled=false`。
- 碰撞体挂骨骼下时，动画位移会造成**时序错位穿模**，修复方式是 solver 的 `LateUpdate` 用最新碰撞体位置做纯位置补偿投影（不改速度）。
- 切动画状态前要先禁用每帧写回参数的输入组件；`Animator.Play` 全路径必须带层名。

**验证方法论**

- 涉及 A/B 的效果评估必须在真实运行状态下做（Animator + 求解器同跑、同帧配对），静态采样会给出相反结论。
- 结论要可复现：用「冻结同一姿态 + 不同 settle 帧数得到相同数值」确认已收敛，避免相位 / 迟滞污染。
- 验证可视化优先用数值比对（自绘线框世界 AABB vs `Collider.bounds`），按颜色阈值统计截图像素容易被场景自身颜色污染。

**代码风格与交付**

- **不要移动 / 重排现有的 `#region` 块。**
- 所有 UI / 编辑器功能**必须先自己验证能跑通再交付**，不要只写文件让用户自己试。
- 同一文件的多处不连续修改要逐条提交并确认，批量 edit 可能只落盘最后一处。

---

## 7. Locus 知识库（AI 协作）

`MagicaCloth2_Text/Locus/` 是 Locus 工具的本地知识库（配置见 `config.json`，工作区 `unity-5678f7a5bec256eac21483ec`），内含按用途分类的记忆文件：

| 路径 | 作用 |
| --- | --- |
| `knowledge/memory/user-preference.md` | 用户长期偏好（代码风格、交付习惯） |
| `knowledge/memory/project-mistake-note.md` | 已验证的问题、返工原因与规避方式（**最重要的踩坑清单**） |
| `knowledge/memory/unity-project-understanding/xpbd-pcg-system.md` | XPBD PCG（FabricProfile / 权重刷 / 折痕烘焙）架构与语义 |
| `knowledge/memory/unity-project-understanding/camera-frame-capture.md` | `CameraFrameCapture` 组件与编辑器面板说明 |
| `knowledge/design.locus-meta` | 需求、方案、约束与阶段性设计结论（仅记录已确认内容） |

**维护约定**：设计类记忆只记录用户与 AI 共同确认的需求 / 方案；记忆类只记录用户明确表达的长期偏好与稳定背景；删除过期、被替代或缺乏依据的记录。

---

## 8. git 现状

- 仓库根目录**不是** git 仓库；`MagicaCloth2_Text/` 是独立 git 仓库，历史仅两个提交：
  - `175c71f` Initial commit: Unity .gitignore + Git LFS
  - `c369aa1` backup: 删除 DiffXPBD 反向过程前的完整快照

### 8.1 可微 XPBD（DiffXPBD）已彻底移除

可微 XPBD 曾被实现过（含可微解算器、雅可比装配、CG 求解、Alembic 目标读取、LOD 布料、真值录制），**现已从工程中完整删除**。2026-09-22 核查结论：

| 项目 | 结论 |
| --- | --- |
| 已删除的文件 | `Assets/XPBD/Scripts/DiffXPBD/`（7 个脚本及 meta）、`Assets/XPBD/Scenes/DiffXPBD.unity`、`Assets/XPBD/Data/Recorded_GT_Cloth_*.asset`（真值数据）、`Locus/knowledge/memory/unity-project-understanding/xpbd-diff-system.md`、空的 `Scripts/Animation.meta` |
| GUID 引用 | 7 个脚本 GUID + 场景 GUID + 真值资产 GUID 在全工程**零引用**（不会出现 missing script） |
| 标识符检索 | 全部 `.cs` / `.unity` / `.asset` / `.prefab` / `.csproj` / `.asmdef` 中无任何 `DiffXPBD` 相关标识符 |
| 资源碎片 | `Assets` 下**无孤立 `.meta`** |
| 编译产物 | `Library/ScriptAssemblies/Assembly-CSharp.dll` 已不含 DiffXPBD 类型（Unity 已重新编译） |

需要回顾实现时，`HEAD` 快照仍保留全套可微代码，例如 `git show c369aa1:Assets/XPBD/Scripts/DiffXPBD/DiffXPBDPass.cs`。

> 已被移除的旧约束文件 `AngleConstraint.cs` / `BoneAngleConstraint.cs`（曾直接依赖 `XPBD.DiffXPBD`）也随之下线，其职责由重写的 `BendingConstraint.cs` / `BoneBendingConstraint.cs` 承担。

### 8.2 当前工作区状态

工作区**不干净**：所有改动已暂存、**尚未提交**。截至 2026-09-22，索引与磁盘完全一致（暂存 143 项，未跟踪 0，未暂存 0；索引中不存在"磁盘上没有的文件"）。

**本批改动的内容**

- 目录改名：`Scripts/ClothPCG/` → `Scripts/Cloth/`（git 识别为 R100 改名）
- 约束重写：`AngleConstraint` / `BoneAngleConstraint` → `BendingConstraint` / `BoneBendingConstraint`（实现重写，相似度仅 36% / 40%，默认按「删除 + 新增」显示；`git diff -M10%` 可看到改名视角。**git 不存储 rename，改名只是展示层的相似度判定**）
- 新增解算体与工具：`XPBD_FluidBody.cs` + `FluidPBFJobs.cs`（PBF 流体）、`Scripts/Skin/`（LBS 工具）、`Scripts/Body/Editor/`、`Constraints/Interaction/` 的碰撞类、`RestPoseConstraint` / `TwistConstraint`、`Data/Skin/` 资产、`Scenes/Water.unity`、`Scenes/XPBD 1.unity`
- 删除：`Assets/Scenes/SampleScene*`、`Assets/Settings/SampleSceneProfile.asset`（URP 模板资产）、`Assets/QFX/ProjectilesFX/` 下 4 个示例脚本（该特效包后来已整体删除，见下）
- 一并暂存、但**提交前值得先确认**的内容：`Packages/com.farlocus.locus/`（Locus 工具包自身更新，含 `.dll` 二进制，17 项）、`CaptureOutput/布气球_*.png`（5 张截图，走 LFS）、`Locus/workspace-trees/`、`Assets/StarRenderingStyle/` 的 Shader / 材质改动。若不想一并提交：`git restore --staged <路径>`

**2026-09-22 追加的清理（尚未暂存）**

- 删除与工程无关的示例 / 素材内容，共约 **453 MB**：`Assets/MagicaCloth2/Example (Can be deleted)/`、`Assets/Third Parts/`（Lucy 素材包）、`Assets/QFX/ProjectilesFX/Demo/` + `ProjectileFX_Demo.unity`、`Assets/Models/Avatar/三月七/三月七双剑.fbx`。详见 §3.14。
- 删除整个 `Assets/QFX/` 特效包（约 127 MB）与两个依赖它的特效预制体（`拖尾.prefab`、`提示特效.prefab`），并**编辑了两个主场景**：移除 `拖尾` 的 PrefabInstance 与对应 stripped Transform、把 `PlayerInputContorller.PromptEffect` 置空、清空角色实例里的 `m_AddedGameObjects` 条目。
  - 场景改动的结构校验结果：文档数 1050→1048（XPBD）与 1051→1049（XPBD 1），本地引用未解析数保持 **0**，全工程指向已删资产的引用数为 **0**；改动前已备份原场景。
- 这些删除目前在 git 里是**未暂存**的工作区改动（`git status` 中约 900 条 `D` 条目），索引仍指向旧文件。要让索引跟上：`git add -A`。
- 还原方式：文件已移入**回收站**，且这些路径在 git 里都有记录，可 `git restore -- "Assets/Third Parts" "Assets/MagicaCloth2/Example (Can be deleted)" ...` 取回。
- 新增资产：`Assets/XPBD/Models/Bunny/`（bunny.obj + 材质 + meta，从 `刚体动力学` 工程拷入；该工程本身随后已删除，见 §4）也是未跟踪状态。

**换行符**：`.gitattributes` 设了 `eol=lf`，暂存时部分 CRLF 文件会被规范化为 LF（git 会打印 `CRLF will be replaced by LF` 警告）。这是预期行为，版本库内为 LF。

修改前请先确认这些既有改动属于用户，不要回滚或覆盖。

---

## 9. 快速上手建议

1. 想最快建立全貌，先读论文 `基于_XPBD_的实时物理模拟.pdf`（30 页，结构见 §10）——它是系统最完整的一份自述，正文含架构图与效果对比图。
2. 读论文时对照 `笔记/模拟算法/XPBD.md` + `笔记/模拟算法/PBD.md` 建立理论坐标（赶时间看同目录的「精简版」），再按需补 `笔记/迭代法.md`（求解器为何用高斯-塞德尔）、`笔记/数值分析/松弛.md`（SOR 松弛系数）、`笔记/阻尼算法.md`（三类阻尼的区别）。解算器面板参数语义见本文件 §3.5。
3. 打开 `MagicaCloth2_Text/`，运行 `Assets/XPBD/Scenes/XPBD.unity`（角色 + 全部解算体）或 `Cloth.unity`（纯布料 / 旗帜 / 窗帘）。
4. 代码入口只有一个：`Assets/XPBD/Scripts/XPBD_Solver.cs` 的 `LateUpdate`，顺着它的 5 个阶段读下去即可掌握全貌。
5. 改参数前先读第 6 节与 `project-mistake-note.md`；改完务必在 Play Mode 自测并保存场景。

---

## 10. 主交付物之二：论文《基于 XPBD 的实时物理模拟》

根目录的 `基于_XPBD_的实时物理模拟.pdf` 是与工程配套的论文，二者并列为主交付物：**论文讲"为什么这样做"，工程是"这样做的结果"**。

### 10.1 基本信息

| 项 | 内容 |
| --- | --- |
| 标题 | 基于 XPBD 的实时物理模拟 |
| 作者 | 李晨煜（上海理工大学 出版学院 新媒体技术） |
| 日期 | 2026 年 8 月 7 日 |
| 篇幅 | 30 页；正文 13 章 + 附录 A–G + 参考文献 15 篇 |
| 制作方式 | LaTeX 排版（`Creator: LaTeX with hyperref`），PDF 于 2026-09-22 导出 |
| 关键词 | 扩展基于位置的动力学（XPBD）；实时物理模拟 |

论文提出的核心矛盾是实时仿真的两难：**艺术可控性**（常规几何约束会破坏美术预设的飘带姿态、让服装失去设计美感）与**密集接触下的计算开销**（角色高速跑动时大腿与裙摆的挤压需要极高时域采样率）。全文即围绕这两点展开。

### 10.2 全文结构

> 下表第一列的章节号均为**论文自身的编号**（与本文档的章节号无关，注意别与本文档的 §9 / §10 混淆）。

| 章节 | 内容 |
| --- | --- |
| 摘要 / 1 引言 | 两大矛盾 + 三项主要工作：二面角拓扑分类的弯曲解耦与单向折叠约束、低分辨率骨骼代理的双向解耦距离约束与姿态维持、CCD 多级碰撞管线与有效逆质量摩擦模型 |
| 2 相关工作 | 隐式积分[1] → PBD[2] → PBF[3] / 统一粒子[4] → PD[5] → XPBD[6] → MGPBD[7] / small steps[8]；质点弹簧[9]、Discrete Shells[10]、Shape Matching[11]；LBS[12]、离散弹性杆[13]；自碰撞[14]、CCD 与摩擦[15] |
| 3 背景 | FEM 与 XPBD 的路线差异；XPBD 软化约束 `C(x) = −α·λ/Δt²`、乘子增量公式、`Δx = M⁻¹∇CᵀΔλ` |
| 4 架构 | 4.1 模块划分（工具链 / 解算体系统 / 约束系统 / 求解器）；4.2 求解管线伪代码 23 行，与工程 `XPBD_Solver.LateUpdate` 一一对应 |
| 5 蒙皮 | 5.1 结构化网格自动蒙皮：AABB 降维 → 双线性插值分配权重 → 逆绑定矩阵与 LBS 公式；5.2 裙摆防穿模：顶点到目标骨段最短距离的 smoothstep 衰减权重（`w_target = W_max·f(d)`，原权重等比压缩后取前 4 并归一化）+ 基于极端帧的自动寻优（代价函数 `C = N + 1.5·ΔL`，百分位候选空间全局遍历） |
| 6 风场 | 6.1 风速场：基准风速 / 风向 + Perlin 湍流 + 阵风 `G(t)=1+A·sin(2πft+φ)` + AABB 边缘软衰减；6.2 风阻模型：网格面片按法向 / 切向正交分解（兜风阻力 + 切向摩擦），骨骼抽象为等效受风面积的质点用二次阻力定律 |
| 7 网格模拟 | 7.1 三种弹簧拓扑（结构 / 剪切 / 弯曲）；7.2 布料：**距离约束的面外奇异性**（由 `∇C·Δx⊥ = 0` 推到 Hessian `H_zz = 0`，严格证明自然状态下面外抗弯刚度为零）、**弯曲约束的面内盲区**（切空间虚功为零）、**二面角拓扑三分类**（正方形 / 平行四边形 / 等腰直角三角形）、各向同性与各向异性控制策略（后者靠 U/V 解耦实现参数化折痕 + 纹理柔度映射）、单向折叠约束（不等式 `S_fold·θ ≥ 0`，仅在反向折叠时激活）；7.3 布气球体积约束（`V_rest = V_0·K_pressure`） |
| 8 骨骼模拟 | 8.1 纵向链轴 / 横向对角距离约束解耦（独立柔度 α）；8.2 系链约束（限制相对锚点最大外展）；8.3 三点骨骼弯曲约束；8.4 扭转约束（抑制关节自穿模）；8.5 姿态维持约束（3D 向量等式约束 + 深度传递函数 `f(t)` 分配柔度）；8.6 动画混合（与姿态维持**严格互斥**，否则数学冲突引发数值震荡） |
| **9 刚体 / 10 流体 / 13 自碰撞** | 论文中均标注 **暂未完成** |
| 11 碰撞 | SDF 解析法（球 / 胶囊 / 立方体，立方体闭式解在穿透时退化为简化 SAT）、Jacobi 预稳定化（只累加几何修正、按次数取均值，避免幽灵力）、CCD（局部坐标射线扫掠，胶囊 = 圆柱侧面 + 两端半球）、**虚拟代理粒子**（边中点 / 面中心代理，按逆质量分配修正量）、后稳定化（SDF 投影 + 隐式速度响应 + 结构边对胶囊的投影，消除迭代末期的边级二次穿透） |
| 12 摩擦 | 接触系数 `f_i = 1 − clamp(d_i/ε)`（多碰撞体共存时取最大）+ **有效逆质量衰减** `w̃_i = w_i/(1+μ·f_i)`：不改速度/位置，而是把摩擦转成局部惯性，避免求解时序冲突 |
| 附录 A | 数值积分器：三种欧拉的能量演化、相空间轨迹对比、Verlet 推导与稳定性分析 |
| 附录 B | 约束求解的数值迭代：迭代法概念与矩阵分解、Jacobi / Gauss-Seidel 推导、二者在 PBD 约束投影中的工程形态、无可行解时的行为差异 |
| 附录 C | 流形视角的约束投影与 (X)PBD：约束流形、PBD 与 XPBD 框架及求解，并指出 XPBD 仍存在宏观形变对拓扑分辨率的依赖 |
| 附录 D | 基础约束：距离、角度弯曲与余弦弯曲（含用几何法绕开 `1/sinφ` 奇异）、骨骼余弦弯曲、体积约束（含散度定理推导与梯度） |
| 附录 E | 其它约束：系链、扭转、姿态维持 |
| 附录 F | 阻尼算法：三类阻尼对比、PBD 阻尼的形变动能衰减证明、XPBD 约束阻尼的 `γ` 推导与效果分析 |
| 附录 G | 线性混合蒙皮：数学模型与「糖纸效应」的几何解释 |

论文的配图基本就是工程的可视化产物：图 1 是总效果展示（上排风场下的布气球 / 各向异性布料 / 各向同性布料 / 骨骼代理布料；下排角色半个跑步循环的 5 个关键帧），图 3、11 是蒙皮与织物柔度权重刷工具截图，图 2 是系统架构图。

> 致谢部分说明了两点背景：本工作萌芽于**腾讯游戏引擎课题实践**期间的课题设想；底层管线设计与实现**深入参考了 MagicaCloth 2**；测试与图例使用了**米哈游**的角色模型资产。

### 10.3 论文 ↔ 工程 对应关系

论文正文基本可逐节映射到代码，读论文时可直接按此表定位实现：

| 论文章节 | 对应实现 |
| --- | --- |
| §4 架构 / §4.2 求解管线 | `XPBD_Solver.cs`（`LateUpdate` 五阶段）、`XPBD_Body.cs` |
| §5 蒙皮 | `Scripts/Skin/`（`LBSSkinTool`、`LBSSkinInfluenceTool`、`LBSBoneGizmo`）+ `Assets/XPBD/Data/Skin/` |
| §6 风场 | `WindField/XPBD_WindField.cs` |
| §7 网格模拟 | `XPBD_ClothBody.cs`、`XPBD_ClothBalloonBody.cs`、`BendingConstraint`、`FoldDirectionConstraint`、`VolumeConstraint`、`Cloth/FabricProfile.cs`（双通道柔度贴图即论文的「纹理柔度映射」） |
| §8 骨骼模拟 | `XPBD_BoneBody.cs`、`TetherConstraint`、`TwistConstraint`、`RestPoseConstraint` |
| §11 碰撞 | `Constraints/Interaction/`（`AnalyticCollisionConstraint`、`CollisionManager`、`ColliderThicknessOverride`）；预 / 后稳定化与速度响应在 `XPBD_Solver.cs` |
| §12 摩擦 | `XPBD_Solver` 的 `effInvMass` + `CalcInverseMass`（`w̃ = w/(1+f·FrictionMass)`，`FrictionMass = 3.0`） |
| 附录 B / C | `笔记/迭代法.md`、`笔记/流形视角的约束投影.md` |
| 附录 D / E | `笔记/约束函数/距离约束.md`、`笔记/约束函数/弯曲约束.md`、`笔记/模拟算法/` |
| 附录 F | `笔记/阻尼算法.md` |
| 附录 G | 仅在论文中，`笔记/` 没有对应的独立文件 |

**三处需要留意的文档—代码漂移**（论文定稿于 2026-08-07，工程此后仍在演进）：

1. 论文图 2 与附录 D 中的约束类名是 `AngleConstraint` / `BoneAngleConstraint`；工程已把这两个类**重写并改名为** `BendingConstraint` / `BoneBendingConstraint`（见 §8.1 与本批未提交改动）。
2. 论文 §9 刚体、§10 流体、§13 自碰撞标注「暂未完成」；工程此后**已新增 PBF 流体实现**（`XPBD_FluidBody.cs` + `FluidPBFJobs.cs` + `Scenes/Water.unity`，目前均为未跟踪新文件），自碰撞则仍是未启用状态（见 §3.4 的分组越界提示）。也就是说：**在流体这一项上代码已跑在论文前面**，论文如需再版应补该章。
3. 论文架构图里有 `XPBD_RopeBody`（Line 线段），但正文没有绳索的独立章节。
