# ScriptableRendererFeature
## 概念
&emsp;&emsp;在 Unity 的 URP（通用渲染管线）中，ScriptableRendererFeature（可编程渲染特性） 是实现所有自定义渲染效果（如描边、屏幕水滴、SSFR 流体渲染、体积光等）的总入口和调度中心。   
&emsp;&emsp;它的三大核心作用是：   
&emsp;&emsp;提供可视化面板（UI）：将美术和策划需要调整的参数暴露在 Unity 的 Inspector 面板上。  
&emsp;&emsp;管理 Pass 的生命周期：负责在合适的时候 new 出具体的 ScriptableRenderPass，并在不需要时销毁它们。  
&emsp;&emsp;精准调度：决定把创建好的 Pass 插入到 URP 渲染大循环的哪一个确切节点。 
## 核心生命周期与重写方法
### 初始化阶段
&emsp;&emsp;Create()：当 Feature 第一次加载、或者在编辑器 Inspector 面板里修改了任何参数、或者脚本重新编译时，这个方法会被调用。  
### 调度阶段
&emsp;&emsp;AddRenderPasses(ScriptableRenderer renderer, ref RenderingData renderingData)：每一帧，针对每一个启用的摄像机，这个方法都会被调用一次。  
### 清理阶段
&emsp;&emsp;Dispose(bool disposing)：当这个 Feature 被删除、禁用，或者游戏退出时调用。
&emsp;&emsp; 
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp; 
&emsp;&emsp; 