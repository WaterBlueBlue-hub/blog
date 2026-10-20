#  Job System
## 概念
&emsp;&emsp;它是一套并行执行模型，用来描述一帧里几十万次重复计算应该怎么分给多个 CPU 核心。一个job system 通过创建 jobs 而不是线程来管理多线程的代码。  
&emsp;&emsp;实时物理模拟的计算具有一个非常鲜明的特征：指令少，重复多。以 XPBD 求解器为例，一帧里真正干的事情只有五六种，比如记录旧位置、预测位置、算约束误差、投影约束、碰撞投影、由位置反推速度，但每一种都可能要在几万到几十万个粒子上各执行一次。  
&emsp;&emsp;这类问题在计算机体系结构里被称为数据并行。它的最优解不是让单个核心跑得更快，而是把同一套指令同时分发给多个核心。
## job
&emsp;&emsp;一个 job 是小单位的工作，通常包含一个特定的任务。一个 job 接受参数并根据数据进行操作，接近于一个方法的工作方式。job 可以是独立的，或者他们可以依赖于其他 jobs 完成后再执行。
## NativeContainer
&emsp;&emsp;NativeContainer 是一种托管的数据类型，为原生内存提供一种相对安全的 C# 封装。它包括一个指向非托管分配内存的指针。当和 Unity C# Job System 一起使用时，一个 NativeContainer 使得一个 Job 可以访问和主线程共享的数据，而不是在一份拷贝数据上工作。  
## NativeArray
&emsp;&emsp;NativeArray<T> 是 Unity 的一个 C# 值类型，代表一块连续的非托管内存加上一个长度。用起来像数组，但它自己不装数据，数据在它指向的那块原生内存里。  
```csharp
private NativeArray<float3> _x, _oldX;
private NativeArray<float> _invMass;
...
_x = new NativeArray<float3>(_particleCount, Allocator.Persistent);
```
&emsp;&emsp;一处声明两个容器、构造时指定长度和分配器、Job 结构体里用 [ReadOnly] public NativeArray<float3> X, oldX; 接收、最后在 Dispose() 里逐个 if (_x.IsCreated) _x.Dispose()。这五步就是 NativeArray<T> 从生到死的完整生命周期。IsCreated 那个判断不是多余的：当 _particleCount 为 0 时根本没分配过，对着一个空容器调 Dispose 同样会报错。
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;


## 一、它要解决的三个问题
### 1.1 线程由谁管
&emsp;&emsp;朴素的做法是直接开 `Thread` 或往 `ThreadPool` 里塞任务，但这样等于把线程数量、亲和性、负载均衡、上下文切换、异常传播全部揽到自己身上；而且线程池里的长任务会拖住其他任务，容易出现"任务已经发出去，但有的核心闲着、有的核心排队"。
&emsp;&emsp;Job System 的做法是把工作拆成**作业**提交给运行时的 worker 线程池，由它按**工作窃取（work stealing）**策略分配：先领到活的线程如果先做完，会去别的线程的任务队列尾部"偷"任务，从而自动实现负载均衡。
### 1.2 数据竞争怎么防
&emsp;&emsp;这是整套框架最有价值的部分。调度时运行时会做**别名分析（aliasing analysis）**：每个 `NativeContainer` 字段的读写权限被显式声明，如果两个并行作业会写同一块内存，或者一个读一个写却没有依赖关系，运行时会直接报错而不是默默算错。
&emsp;&emsp;`[ReadOnly]` 标记只读输入，不标记则默认为可写且独占。这个约束对物理模拟尤其重要，因为物理里最典型的并行陷阱就是"同一个顶点被多条约束同时读写"（见 §3.2）。
&emsp;&emsp;之所以能做到这一点，是因为安全检查把"数据结构上的访问模式"变成了可以静态验证的信息——这是托管语言里少见的、能提前抓住并行 bug 的机制。
### 1.3 依赖关系怎么表达
&emsp;&emsp;通过 `JobHandle`。每次 `Schedule` 时把上游作业的 handle 作为参数传进去，就形成了一条依赖链；这条链本质上就是一份**数据流图**。
&emsp;&emsp;主线程因此可以一直不阻塞地往下发作业，直到真正需要用到结果的那一刻才调用 `Complete()`。**把 `Complete()` 尽量往后推，是这套框架最重要的性能纪律**：`Complete()` 会让主线程在这一点上等待整条依赖链跑完，早调用等于白白浪费掉主线程本可以去干别的时间。

## 二、四个核心概念
### 2.1 Job（作业）
&emsp;&emsp;作业是一个**结构体**而不是类。这一条决定了它的全部特性：值语义、可复制、不产生堆分配、可以被 Burst 编译成原生代码。

| 类型 | 含义 | 典型用途 |
| --- | --- | --- |
| `IJob` | 整个作业只在**一个**线程上跑一次 | 建全局结构（哈希表、前缀和）、写共享状态 |
| `IJobParallelFor` | 按索引 `0..n-1` 切分，并行执行 | 逐粒子的积分、预测、约束误差计算 |
| `IJobParallelForBatch` | 按块切分，一个块内循环 | 减少调度开销，适合"迭代很多次的小内核" |
| `IJobParallelForDefer` | 长度在调度时才知道 | 碰撞对数量、激活列表长度 |

&emsp;&emsp;`Schedule` 时要指定批大小 `batchSize`，它表示"每个 worker 一次领走多少个索引"。这个数不是随便填的，见 §5。
### 2.2 Data（NativeContainer）
&emsp;&emsp;作业之间传递的数据必须是 `NativeArray` / `NativeList` / `NativeQueue` / `NativeHashMap` 这类**非托管内存容器**。原因是托管对象（`class`、`string`、`List<T>`）随时可能被 GC 移动，而 worker 线程上的代码不能安全地持有它们。
&emsp;&emsp;分配器（Allocator）决定生命周期：`Temp` 用于一帧内用完即弃、`TempJob` 用于跨帧的临时数据、`Persistent` 用于贯穿运行期的常驻缓冲。**NativeContainer 不归 GC 管，必须显式 `Dispose`，否则就是内存泄漏**——而且泄漏警告往往在若干帧之后才出现，容易和真正的现场脱节。
&emsp;&emsp;还有一条实践上的约束：数据必须是"平行数组"（SoA）而不是"对象数组"（AoS），理由见 §3.1。
### 2.3 Dependency（JobHandle）
&emsp;&emsp;handle 除了表达依赖，还承担"所有权凭证"的作用：把 handle 传给下一个作业，运行时就知道这两个作业之间有顺序约束，于是可以放心地让它们共享同一块内存而不触发安全检查报警。
### 2.4 Burst 编译器
&emsp;&emsp;Burst 把作业里的 IL 编译成高度优化的原生代码，会自动做 SIMD 向量化、循环展开、边界检查消除、常量折叠。同一份 C# 写法，开不开 Burst 可能有数倍到十几倍的差距。
&emsp;&emsp;代价是它只认识自己认识的东西：不能有 `class`、不能有 GC 分配、不能有异常、不能有虚函数与接口分发；数学库要换成 `Unity.Mathematics`（`float3`、`math.xxx`）而不是 `UnityEngine.Vector3` / `Mathf`。**能不能 Burst，取决于数据布局是否纯粹**——这也是为什么"改成 Job"往往意味着一次彻底的数据重构。

## 三、物理模拟视角：约束求解如何映射到作业
### 3.1 先改数据布局：从 AoS 到 SoA
&emsp;&emsp;物理内核的瓶颈通常不是算力而是**内存带宽**。CPU 从内存取数据是按缓存行（通常 64 字节）成块搬运的，如果粒子的位置、速度、质量、逆质量被打包成一个结构体，那么一次只需要读到 `invMass` 的计算，也会把整条缓存行里的其他字段一起拉进来，浪费的带宽直接等于浪费的时间。
&emsp;&emsp;因此要把"一个粒子的所有数据放在一起"（Array of Structs）拆成"每种属性各自一个数组"（Structure of Arrays）：
$$
x_0,x_1,\dots,x_n \quad|\quad v_0,v_1,\dots,v_n \quad|\quad w_0,w_1,\dots,w_n
$$
&emsp;&emsp;SoA 还有个附带好处：多个核心各读自己那一段时不会互相争抢同一条缓存行（false sharing），带宽利用率接近线性。
### 3.2 核心矛盾：约束之间会共享顶点
&emsp;&emsp;PBD / XPBD 的约束投影天生是"读两个顶点 → 算出修正量 → 写回两个顶点"的三步式操作。如果直接把所有约束丢进一个 `IJobParallelFor`，那么两条相邻约束会同时写同一个顶点——这是典型的数据竞争。
&emsp;&emsp;这个矛盾其实是**Gauss-Seidel 与 Jacobi 的分野在并行语境下重新出现了一次**：
&emsp;&emsp;**Gauss-Seidel 型**：一条约束投影完立刻把结果给下一条用，收敛快，但天然串行；想并行就必须先证明两条约束不共享顶点。
&emsp;&emsp;**Jacobi 型**：所有约束先各自算出自己的修正量（这一步只读不写，完全可并行），最后再统一累加。收敛慢，但并行度是满的。
&emsp;&emsp;工程上有三条出路：
&emsp;&emsp;（1）**图着色 / 分组**：把"彼此不共享顶点"的约束分进同一组，组内并行、组间串行。这是 Gauss-Seidel 的近似并行版本——本仓库 `XPBD_Solver` 里的 `ConstraintGroupOrder` 分组表，就是这件事的雏形（距离、系链、弯曲、姿态、扭转、体积各组串行、组内并行）。
&emsp;&emsp;（2）**累加-应用两段式**：所有约束并行地把自己的修正量写进各自的缓冲，第二个作业再按粒子把缓冲累加起来。这正是本仓库流体管线里 `FluidDeltaPJob` → `FluidApplyJob` 的结构。
&emsp;&emsp;（3）**在数据布局上直接消灭冲突**：给每个粒子预留一段独占的写入区间，谁也不用抢谁。本仓库 `FluidBuildNeighborsJob` 用一张扁平的邻居数组，第 $i$ 个粒子固定占用 $[i \cdot N_{\max}, (i+1) \cdot N_{\max})$，就是这个手法——它既避开了原子操作，又保证了结果可复现。
&emsp;&emsp;如果确实必须用原子加，要意识到**浮点加法不满足结合律**：多线程下累加顺序不定，同一份输入每次运行都可能得到略有差异的结果，误差逐帧累积后会表现为"每次跑出来的动画不一样"。要做录制回放或数值对比测试，必须让归约顺序固定（例如先分区归约、再按固定顺序合并）。
### 3.3 约束中心与粒子中心
&emsp;&emsp;同样一批计算，按什么切分线程有两种组织方式：
&emsp;&emsp;**约束中心（constraint-centric，scatter）**：一个线程负责一条约束，算完之后向它涉及的多个粒子写修正量。它一轮算完所有约束，但写操作散落在多个粒子上，需要原子写或者分组来避免冲突。
&emsp;&emsp;**粒子中心（particle-centric，gather）**：一个线程负责一个粒子，读它自己的所有约束，算出自己该走多少。每个线程只写自己的粒子，天生没有写冲突；代价是同一条约束会被它两端的粒子各算一遍（多算了一倍，但省掉了冲突处理）。
&emsp;&emsp;经验规律是：约束的**连接度低**（每条约束只涉及两三个粒子、但一个粒子涉及很多约束）时倾向粒子中心；约束影响范围广、彼此独立时倾向约束中心。
### 3.4 迭代次数与调度开销
&emsp;&emsp;约束投影要迭代 $N$ 次，而第 $k$ 次迭代必须等第 $k-1$ 次的结果——这是一条无法打破的数据依赖。于是每帧的调度结构变成"$N$ 条串行的依赖链，每条链内部并行"。
&emsp;&emsp;当 $N$ 很大而每次迭代很短时，**调度本身的开销会成为瓶颈**：每次 `Schedule` 都有固定成本。对策有三种：增大批大小减少领取次数；用 `IJobParallelForBatch` 让一个作业内部循环多次迭代；或者干脆把整条迭代循环写进一个作业内部，用分区而不是用 $N$ 次调度来表达并行。
### 3.5 邻域搜索的三段式
&emsp;&emsp;空间哈希、网格邻域搜索这类"先统计再填表"的操作，在并行语境下有一个通用模板：**计数 → 前缀和 → 散射**。先并行统计每个格子或每个粒子有多少个邻居；再做一次前缀和（exclusive scan），把"数量"转换成"起始地址"；最后并行地把邻居写进各自的位置。
&emsp;&emsp;本仓库流体用链表结构（`cellHead` / `particleNext`）替代了前缀和步骤，代价是查邻居时要顺着链表跳，缓存不友好——这是一个典型的"实现简单 vs 访存友好"的取舍。

## 四、本仓库里的实例：FluidPBFJobs
&emsp;&emsp;`XPBD_FluidBody` + `FluidPBFJobs` 是本仓库唯一一条完整的 Burst/Job 管线，八个作业，恰好覆盖了上面讲的每一条原理：

| 作业 | 类型 | 对应原理 |
| --- | --- | --- |
| `FluidPredictJob` | `IJobParallelFor`（批 64） | 纯数据并行：重力 + 预测位置 |
| `FluidBuildHashJob` | `IJob`（单线程） | 要写共享的链表头与 next 指针——**不是每一步都值得并行** |
| `FluidBuildNeighborsJob` | `IJobParallelFor` | 每粒子独占一段扁平数组 → 无原子、结果确定 |
| `FluidDensityJob` | `IJobParallelFor` | 邻域求和，只读输入 |
| `FluidLambdaJob` | `IJobParallelFor` | 由密度误差解拉格朗日乘子 |
| `FluidDeltaPJob` | `IJobParallelFor` | 只算位移修正量，不改位置（Jacobi 式的累加段） |
| `FluidApplyJob` | `IJobParallelFor` | 统一应用修正量并做松弛 |
| `FluidBoundaryJob` / `FluidVelocityJob` / `FluidXSPHJob` | `IJobParallelFor` | 边界投影、速度回写、粘性 |

&emsp;&emsp;几点值得单独记下：
&emsp;&emsp;**依赖链只在最后 `Complete()` 一次。** 整条链靠 `JobHandle` 串起来（`hashHandle → nbrHandle → densityHandle → lambdaHandle → deltaPHandle → ...`），主线程一路往下发，直到 `xsphHandle.Complete()` 才等待。这是 §1.3 那条纪律的直接体现。
&emsp;&emsp;**输入全部标了 `[ReadOnly]`。** 这既是给安全检查的声明，也让调度器知道相邻作业之间可以重叠执行。
&emsp;&emsp;**数据结构是 `float3` + `NativeArray`。** 这是能享受 Burst 收益的前提；只要有一个环节退回 `Vector3` 或托管数组，优化就断在这里。
&emsp;&emsp;**哈希网格的构建留在单线程。** 这个选择很有代表性：一个每次模拟步只跑一次、却要写全局共享结构的阶段，硬并行反而会更慢，"并行化要挑对地方"。

## 五、代价与常见坑
&emsp;&emsp;**`Complete()` 会 stall。** 主线程会在这一点上等到依赖链全部完成，要尽量把它推迟到真正需要数据时。
&emsp;&emsp;**批大小的权衡。** 批太小，每个 worker 频繁领活，调度开销占比高；批太大，负载不均，最后一个 worker 拖尾。常见的做法是让批大小乘以索引总数后，恰好能填满核心数若干倍。
&emsp;&emsp;**分配与泄漏。** NativeContainer 不归 GC 管，每帧分配会带来分配器开销，忘记 `Dispose` 会泄漏。
&emsp;&emsp;**确定性。** 并行归约与原子加的顺序不定，会让浮点结果逐帧漂移；要做回放或对比测试就必须固定归约顺序。
&emsp;&emsp;**调试成本。** Burst 编译后的代码不能打断点，只能用日志或临时关掉 Burst 复现；安全检查（Jobs Debugger、Leak Detection）本身有开销，通常只在编辑器里开。
&emsp;&emsp;**规模太小反而更慢。** 只有几百个元素的问题，调度与同步成本可能超过并行带来的收益，这时候单线程循环才是对的答案。

## 六、和本仓库的关系
&emsp;&emsp;目前只有流体走完整的 Burst/Job 管线；XPBD 主求解器依然是单线程 C#。它的瓶颈恰好落在 §3.2 描述的那个矛盾上——一条约束要写多个顶点——所以想并行化，前提是先引入分组（现有的 `ConstraintGroupOrder` 已经是雏形）或改成累加-应用两段式。
&emsp;&emsp;`MagicaCloth2` 作为参考实现，124 个脚本里有 27 个使用了 `IJobParallelFor` / `IJobParallelForBatch`，可以当作"工业级布料解算器怎么组织并行"的对照读物。
&emsp;&emsp;最后要记住迁移的代价：改成 Job 意味着数据从 `class` 变 `struct`、从 `List<T>` 变 `NativeArray`、从 `Vector3`/`Mathf` 变 `float3`/`math`。这件事要么一开始就按 SoA 设计，要么就得做一次彻底重构——所以它更适合作为**新模块的默认起点**（例如落叶系统），而不是对既有模块的临时补丁。
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
