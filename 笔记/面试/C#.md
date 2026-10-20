# C#
## C# 多态虚函数的底层原理
&emsp;&emsp;C# 多态虚函数的底层机制是基于方法表的。它类似于 C++ 的虚函数表，每个类在内存中只有一份方法表。表中记录了该类的所有方法。当调用 virtual 或 override 方法时，CLR 会通过对象实例的 TypeHandle 找到其方法表，然后根据方法槽位的偏移量，跳转到正确的机器码地址执行。  
## 不实现虚函数会报错吗？报什么错？
&emsp;&emsp;使用 virtual 关键字但未提供方法体。  
&emsp;&emsp;使用 abstract 关键字在子类未实现。  
## 构建对象的内存空间是否连续？
&emsp;&emsp;内存是否连续取决于使用的是值类型还是引用类型。       
&emsp;&emsp;引用类型自身连续，但数据可能离散。当 new 一个类实例时，该对象本身在托管堆上占据的是一块连续的内存。如果你的类里面包含了其他类的引用，这块连续内存里存的仅仅是内存地址。真正的数据分散在托管堆的各个角落。容易导致 CPU 缓存未命中。    
&emsp;&emsp;值类型绝对连续且内联，当创建一个 struct 数组时，所有数据在内存中是紧密排列的，没有任何指针跳转。  
## 构造函数
&emsp;&emsp;构造函数用于在 new 实例化对象时初始化内存数据。  
&emsp;&emsp;静态构造函数：C# 特有。在这个类第一次被使用之前由 CLR 自动调用，且保证只执行一次，绝对线程安全。常用于初始化全局单例或静态查找表。  
## 析构函数
&emsp;&emsp;C# 的析构函数不是在对象不被使用时立刻调用的。它完全依赖于垃圾回收器（GC）。C# 析构代替方案的标准做法是实现 IDisposable 接口，显式调用 Dispose() 方法。
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
&emsp;&emsp; 
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp;
&emsp;&emsp; 
&emsp;&emsp;