# C#
## 值类型 (Value Types)
&emsp;&emsp;值类型的核心特征是按值传递（发生赋值时直接拷贝内存数据）。它们通常分配在线程栈（Stack）上，或者作为内联数据直接嵌在其他对象的连续内存中。  
&emsp;&emsp;结构体 (struct)：如 Unity 中的 Vector3、Quaternion、Color。  
&emsp;&emsp;所有基础数据类型：int、float、double、bool、char 等。它们在 C# 底层其实就是结构体。  
&emsp;&emsp;枚举 (enum)： 各种状态机标签，底层默认是 int 类型。  
## 引用类型 (Reference Types) 
&emsp;&emsp;引用类型的核心特征是按引用传递（发生赋值时只拷贝内存地址指针）。它们的数据实体统一分配在托管堆上，生命周期由 GC（垃圾回收器）接管。    
&emsp;&emsp;类 (class)：如 Unity 中的 MonoBehaviour、GameObject、Transform。  
&emsp;&emsp;数组 (Array)：这是面试极易踩坑的点。 所有数组（包括 int[] 或 Vector3[]）本身都是引用类型，都分配在堆上。  
&emsp;&emsp;字符串 (string)：极其特殊的引用类型，具有不可变性。   
&emsp;&emsp;接口 (interface)：接口类型变量本质是一个指针，指向实现了该接口的实例。  
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
&emsp;&emsp;