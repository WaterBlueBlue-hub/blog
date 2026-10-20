# ScriptableRenderPass
## 概念
&emsp;&emsp;在 Unity 的可编程渲染管线（如 URP）中，ScriptableRenderPass 是执行实际渲染命令的核心类。 
## 生命周期
&emsp;&emsp;OnCameraSetup(CommandBuffer cmd, ref RenderingData renderingData)：在 Execute 之前调用。用于配置渲染目标。  
&emsp;&emsp;Execute(ScriptableRenderContext context, ref RenderingData renderingData)：这是整个 Pass 的绝对核心。每一帧，管线走到你规定的注入点（renderPassEvent）时，都会调用这个方法。  
&emsp;&emsp;OnCameraCleanup(CommandBuffer cmd)：在相机的渲染循环结束前调用。 
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
