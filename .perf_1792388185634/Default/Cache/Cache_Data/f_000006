/* =========================================================================
 * 知识图谱 · 种子数据（示例：人工智能知识体系）
 * 数据格式说明见 README.md「数据格式」一节；导入/导出均使用本结构。
 * 每个节点固定字段：id / name / aliases / category / tags / summary / content / links
 * ========================================================================= */
window.KG_SEED = {
  version: 1,
  title: "人工智能知识图谱",
  subtitle: "48 个知识点 · 点击圆点展开下一级关系",
  categories: [
    { name: "数学基础",     color: "#F0B429" },
    { name: "机器学习",     color: "#38BDF8" },
    { name: "深度学习",     color: "#A78BFA" },
    { name: "计算机视觉",   color: "#34D399" },
    { name: "自然语言处理", color: "#FB7185" },
    { name: "强化学习",     color: "#FB923C" },
    { name: "工程实践",     color: "#22D3EE" },
    { name: "应用",         color: "#A3E635" }
  ],
  relationTypes: [
    { name: "包含", color: "#7DD3FC", directed: true,  inverse: "属于" },
    { name: "前置", color: "#F0B429", directed: true,  inverse: "后续" },
    { name: "依赖", color: "#A78BFA", directed: true,  inverse: "被依赖" },
    { name: "相关", color: "#94A3B8", directed: false, inverse: "相关" },
    { name: "对比", color: "#FB7185", directed: false, inverse: "对比" },
    { name: "应用", color: "#34D399", directed: true,  inverse: "应用于" }
  ],
  nodes: [
    /* ---------------- 数学基础 ---------------- */
    {
      id: "linear-algebra", name: "线性代数", aliases: ["Linear Algebra"],
      category: "数学基础", tags: ["矩阵", "向量空间", "特征值"],
      summary: "研究向量、矩阵与线性变换的数学分支，是几乎所有模型的底层语言。",
      content: "神经网络的一层，本质就是「矩阵乘法 + 非线性激活」；PCA、SVD、注意力打分、卷积展开，全都可以写成矩阵运算。掌握矩阵乘法、秩、特征值分解与正交变换，就能读懂大部分论文里的公式推导。",
      links: [
        { type: "前置", to: "ml", note: "特征、权重与损失都以矩阵形式表达" },
        { type: "前置", to: "pca", note: "特征值分解是 PCA 的核心步骤" },
        { type: "前置", to: "dl", note: "张量运算的直觉来自线性代数" }
      ]
    },
    {
      id: "probability", name: "概率论与统计", aliases: ["Probability", "Statistics"],
      category: "数学基础", tags: ["分布", "贝叶斯", "假设检验"],
      summary: "用分布描述不确定性，是机器学习推断与评估的理论基础。",
      content: "从贝叶斯公式到最大似然估计，从置信区间到假设检验，概率论把「数据」翻译成「信念的更新」。生成模型、变分推断、A/B 实验的效果判定，都建立在这套语言之上。",
      links: [
        { type: "前置", to: "ml", note: "损失函数常等价于某种似然" },
        { type: "前置", to: "rl", note: "状态转移与回报都是随机变量" },
        { type: "相关", to: "information-theory", note: "熵与 KL 散度连接了两者" }
      ]
    },
    {
      id: "calculus", name: "微积分与优化", aliases: ["Calculus", "Optimization"],
      category: "数学基础", tags: ["梯度", "凸优化", "链式法则"],
      summary: "研究变化率与极值，梯度下降家族由此而来。",
      content: "反向传播是链式法则的工程化实现；动量、Adam、学习率调度，则是沿着损失曲面找低点的策略。理解凸性、拉格朗日乘子与泰勒展开，能帮你判断模型为什么训不动。",
      links: [
        { type: "前置", to: "ml", note: "训练即最优化" },
        { type: "前置", to: "backprop", note: "链式法则的逐层展开" }
      ]
    },
    {
      id: "information-theory", name: "信息论", aliases: ["Information Theory"],
      category: "数学基础", tags: ["熵", "KL 散度", "互信息"],
      summary: "量化不确定性与信息量，交叉熵损失的来源。",
      content: "熵刻画分布的不确定度，KL 散度度量两个分布的差异，交叉熵则是分类任务最常用的损失。VAE、知识蒸馏、对比学习的损失设计，都能从信息论视角解释。",
      links: [
        { type: "前置", to: "ml", note: "交叉熵是分类的默认损失" },
        { type: "相关", to: "attention", note: "注意力可视为信息瓶颈的一种实现" }
      ]
    },

    /* ---------------- 机器学习 ---------------- */
    {
      id: "ml", name: "机器学习", aliases: ["Machine Learning", "ML"],
      category: "机器学习", tags: ["统计学习", "泛化", "建模"],
      summary: "让程序从数据中自动发现规律，并对新样本做出预测的方法论总称。",
      content: "机器学习的核心问题永远是「泛化」：模型在没见过的数据上表现如何。围绕它，产生了监督/无监督/强化三大范式，也产生了偏差-方差权衡、正则化、交叉验证等一整套工程纪律。",
      links: [
        { type: "包含", to: "supervised", note: "有标签数据上的学习" },
        { type: "包含", to: "unsupervised", note: "无标签数据上的结构发现" },
        { type: "包含", to: "feature-engineering", note: "特征决定传统模型的上限" },
        { type: "前置", to: "dl", note: "深度学习是它的一个分支" },
        { type: "应用", to: "recsys", note: "推荐是机器学习最成熟的落地场景之一" }
      ]
    },
    {
      id: "supervised", name: "监督学习", aliases: ["Supervised Learning"],
      category: "机器学习", tags: ["分类", "回归", "标签"],
      summary: "用带标签的样本学习输入到输出的映射。",
      content: "给定 (x, y) 样本对，学习一个函数 f(x)≈y；y 离散即分类，连续即回归。它是工业界使用最广的范式，也是理解损失函数、过拟合与评估指标的入口。",
      links: [
        { type: "包含", to: "svm", note: "最大间隔分类器" },
        { type: "包含", to: "decision-tree", note: "基于特征划分的树模型" },
        { type: "依赖", to: "feature-engineering", note: "特征质量直接决定效果" },
        { type: "相关", to: "overfitting", note: "监督学习最典型的失败模式" },
        { type: "前置", to: "model-eval", note: "需要独立验证集衡量泛化" }
      ]
    },
    {
      id: "unsupervised", name: "无监督学习", aliases: ["Unsupervised Learning"],
      category: "机器学习", tags: ["聚类", "降维", "结构发现"],
      summary: "在没有标签的数据中寻找隐藏结构与分组。",
      content: "没有标准答案，因此目标函数需要人为设计：距离、密度、重构误差或似然。聚类、降维、密度估计是三大经典任务，也是探索性数据分析的第一站。",
      links: [
        { type: "包含", to: "clustering", note: "把相似样本归为一组" },
        { type: "包含", to: "pca", note: "线性降维的经典方法" },
        { type: "对比", to: "supervised", note: "没有标签，评估更依赖人工判断" }
      ]
    },
    {
      id: "svm", name: "支持向量机", aliases: ["SVM", "Support Vector Machine"],
      category: "机器学习", tags: ["最大间隔", "核方法", "凸优化"],
      summary: "寻找间隔最大的分界面，并用核函数处理非线性。",
      content: "SVM 的美感在于凸优化带来的全局最优与稀疏解：只有支持向量影响决策边界。核技巧把低维不可分问题映射到高维，是 2012 年之前最强的通用分类器之一。",
      links: [
        { type: "对比", to: "decision-tree", note: "几何间隔 vs 特征划分" },
        { type: "相关", to: "regularization", note: "软间隔的 C 参数即正则强度" }
      ]
    },
    {
      id: "decision-tree", name: "决策树", aliases: ["Decision Tree"],
      category: "机器学习", tags: ["信息增益", "可解释", "分裂"],
      summary: "用一系列 if-else 划分特征空间，天然可解释。",
      content: "每次选择让纯度提升最大的特征与阈值进行分裂，常用信息增益或基尼指数衡量。单棵树容易过拟合，但它是随机森林与梯度提升树的基石。",
      links: [
        { type: "前置", to: "ensemble", note: "集成模型的基学习器" },
        { type: "对比", to: "svm", note: "轴对齐划分 vs 最大间隔" },
        { type: "相关", to: "overfitting", note: "树越深越容易记住噪声" }
      ]
    },
    {
      id: "ensemble", name: "集成学习", aliases: ["Ensemble Learning"],
      category: "机器学习", tags: ["Bagging", "Boosting", "投票"],
      summary: "组合多个弱模型，得到更稳健的强模型。",
      content: "Bagging 通过并行训练降低方差，Boosting 通过串行纠错降低偏差。随机森林与梯度提升树（GBDT/XGBoost/LightGBM）在表格数据上至今仍是不可忽视的强基线。",
      links: [
        { type: "相关", to: "decision-tree", note: "以决策树为基学习器" },
        { type: "应用", to: "recsys", note: "点击率预估的主力模型族" },
        { type: "相关", to: "overfitting", note: "平均与正则化可抑制过拟合" }
      ]
    },
    {
      id: "clustering", name: "聚类", aliases: ["Clustering", "K-Means"],
      category: "机器学习", tags: ["K-Means", "层次聚类", "DBSCAN"],
      summary: "把相似样本自动划分成若干组，无需预先标注。",
      content: "K-Means 优化簇内平方误差，DBSCAN 按密度连通，层次聚类产出树状结构。难点在于簇数选择与距离度量，结果通常需要结合业务解释。",
      links: [
        { type: "相关", to: "pca", note: "先降维再聚类往往更稳定" },
        { type: "应用", to: "recsys", note: "用户分群与冷启动" },
        { type: "对比", to: "supervised", note: "无标签、无标准答案" }
      ]
    },
    {
      id: "pca", name: "主成分分析", aliases: ["PCA", "Principal Component Analysis"],
      category: "机器学习", tags: ["降维", "方差最大化", "特征值"],
      summary: "把高维数据投影到方差最大的若干正交方向上。",
      content: "对协方差矩阵做特征值分解，取最大特征值对应的方向。它既是降维与可视化工具，也是理解「信息集中在少数方向」这一直觉的入口。",
      links: [
        { type: "相关", to: "clustering", note: "降维后聚类更稳定" },
        { type: "前置", to: "word-embedding", note: "降维可视化词向量的常用手段" }
      ]
    },
    {
      id: "regularization", name: "正则化", aliases: ["Regularization", "L1/L2"],
      category: "机器学习", tags: ["L1", "L2", "权重衰减"],
      summary: "在损失中加入对模型复杂度的惩罚，抑制过拟合。",
      content: "L2 让权重整体变小，L1 产生稀疏解；Dropout、早停、数据增强、批归一化都可视为不同形式的正则化。它体现了「限制假设空间换取泛化」的取舍。",
      links: [
        { type: "相关", to: "overfitting", note: "最直接的对抗手段" },
        { type: "相关", to: "dropout", note: "Dropout 可视为一种随机正则化" }
      ]
    },
    {
      id: "overfitting", name: "过拟合", aliases: ["Overfitting"],
      category: "机器学习", tags: ["泛化", "偏差方差", "早停"],
      summary: "模型记住了训练集的噪声，在新数据上表现变差。",
      content: "典型信号是训练损失持续下降而验证损失回升。应对方式包括增加数据、简化模型、正则化、早停与交叉验证。它与欠拟合共同构成偏差-方差权衡的两端。",
      links: [
        { type: "相关", to: "regularization", note: "用惩罚约束模型复杂度" },
        { type: "相关", to: "model-eval", note: "用验证集尽早发现" }
      ]
    },
    {
      id: "feature-engineering", name: "特征工程", aliases: ["Feature Engineering"],
      category: "机器学习", tags: ["特征交叉", "归一化", "分箱"],
      summary: "从原始数据中构造出对模型友好的输入特征。",
      content: "包括缺失值处理、标准化、分箱、独热编码、特征交叉与目标编码。深度学习的表示学习在某种程度上替代了它，但在表格数据与工业系统中，特征工程依然决定效果上限。",
      links: [
        { type: "相关", to: "data-pipeline", note: "特征加工是数据管道的一环" },
        { type: "前置", to: "ml", note: "特征是模型的输入语言" }
      ]
    },
    {
      id: "model-eval", name: "模型评估", aliases: ["Model Evaluation"],
      category: "机器学习", tags: ["交叉验证", "AUC", "F1"],
      summary: "用独立数据与合适指标衡量模型真实表现。",
      content: "分类看准确率、精确率/召回率、F1 与 AUC；回归看 MAE、RMSE、R²。类别不平衡时准确率会严重误导。划分训练/验证/测试集，并做交叉验证，是避免自欺的基本纪律。",
      links: [
        { type: "依赖", to: "data-pipeline", note: "评估依赖清洗后的一致数据" },
        { type: "相关", to: "deployment", note: "上线后需要持续监控指标漂移" },
        { type: "相关", to: "overfitting", note: "验证集是过拟合的照妖镜" }
      ]
    },

    /* ---------------- 深度学习 ---------------- */
    {
      id: "dl", name: "深度学习", aliases: ["Deep Learning", "DL"],
      category: "深度学习", tags: ["表示学习", "端到端", "GPU"],
      summary: "用多层神经网络自动学习分层特征表示的机器学习分支。",
      content: "浅层学边缘与纹理，深层学部件与语义，端到端训练替代了手工特征。算力、数据与算法（ReLU、BatchNorm、残差连接）三者的成熟，共同引爆了 2012 年之后的深度学习浪潮。",
      links: [
        { type: "包含", to: "nn", note: "基本结构单元" },
        { type: "包含", to: "cnn", note: "处理图像的主力架构" },
        { type: "包含", to: "rnn", note: "处理序列的经典架构" },
        { type: "包含", to: "transformer", note: "当代的通用架构" },
        { type: "包含", to: "gan", note: "生成式建模" },
        { type: "包含", to: "diffusion", note: "新一代生成范式" },
        { type: "依赖", to: "backprop", note: "训练完全依赖反向传播" }
      ]
    },
    {
      id: "nn", name: "神经网络", aliases: ["Neural Network", "MLP"],
      category: "深度学习", tags: ["感知机", "激活函数", "全连接"],
      summary: "由加权求和与非线性激活堆叠而成的函数近似器。",
      content: "单个神经元是「线性变换 + 激活」，多层堆叠获得万能逼近能力。万能逼近定理保证了表达能力，却不保证可训练性——这才有了初始化、归一化、残差连接等工程技巧。",
      links: [
        { type: "依赖", to: "backprop", note: "梯度逐层回传" },
        { type: "相关", to: "dropout", note: "训练时的随机失活" },
        { type: "相关", to: "ml", note: "属于机器学习的一个分支" }
      ]
    },
    {
      id: "cnn", name: "卷积神经网络", aliases: ["CNN", "ConvNet"],
      category: "深度学习", tags: ["卷积", "池化", "感受野"],
      summary: "用局部连接与权重共享提取图像的空间特征。",
      content: "卷积核在图上滑动，天然具备平移等变性；池化扩大感受野并带来一定不变性。ResNet 的残差连接让上百层网络可训练，至今仍是视觉任务的强力骨干。",
      links: [
        { type: "应用", to: "image-classification", note: "ImageNet 时代的起点" },
        { type: "对比", to: "rnn", note: "空间局部性 vs 时间依赖性" },
        { type: "应用", to: "object-detection", note: "检测器的特征骨干" }
      ]
    },
    {
      id: "rnn", name: "循环神经网络", aliases: ["RNN", "LSTM", "GRU"],
      category: "深度学习", tags: ["序列", "隐状态", "长依赖"],
      summary: "按时间步复用同一组参数，处理变长序列。",
      content: "隐状态在时间轴上传递信息，LSTM/GRU 用门控缓解梯度消失。它曾是机器翻译与语音识别的主力，如今大多被 Transformer 取代，但流式与低延迟场景仍有价值。",
      links: [
        { type: "对比", to: "transformer", note: "串行依赖 vs 全并行注意力" },
        { type: "前置", to: "nlp", note: "早期序列建模的基础" }
      ]
    },
    {
      id: "transformer", name: "Transformer", aliases: ["Transformer", "Self-Attention"],
      category: "深度学习", tags: ["自注意力", "并行", "位置编码"],
      summary: "完全基于注意力机制的架构，当代大模型的统一底座。",
      content: "自注意力让任意两个位置直接交互，训练可完全并行；多头机制提供多子空间视角，位置编码补回顺序信息。从 BERT 到 GPT，几乎所有大模型都是它的变体。",
      links: [
        { type: "包含", to: "attention", note: "核心组件" },
        { type: "应用", to: "nlp", note: "机器翻译起家，全面统治 NLP" },
        { type: "应用", to: "llm", note: "大语言模型的骨架" },
        { type: "应用", to: "cv", note: "ViT 把图像切成 patch 处理" }
      ]
    },
    {
      id: "attention", name: "注意力机制", aliases: ["Attention"],
      category: "深度学习", tags: ["QKV", "权重", "对齐"],
      summary: "让模型对输入的不同部分分配不同权重。",
      content: "查询、键、值三者做相似度打分并归一化，得到加权求和。它既是「软检索」，也是一种可解释的中间产物：注意力热图能部分反映模型在看哪里。",
      links: [
        { type: "前置", to: "transformer", note: "Transformer 的核心运算" },
        { type: "相关", to: "information-theory", note: "信息瓶颈视角的解释" }
      ]
    },
    {
      id: "gan", name: "生成对抗网络", aliases: ["GAN"],
      category: "深度学习", tags: ["生成器", "判别器", "对抗"],
      summary: "生成器与判别器互相对抗，逼出以假乱真的样本。",
      content: "生成器负责造假，判别器负责鉴别，二者在极小极大博弈中共同进步。训练不稳定与模式坍塌是老大难，StyleGAN 系列曾在人脸生成上达到惊人效果。",
      links: [
        { type: "对比", to: "diffusion", note: "两类主流生成范式" },
        { type: "应用", to: "aigc", note: "图像生成的第一波浪潮" }
      ]
    },
    {
      id: "diffusion", name: "扩散模型", aliases: ["Diffusion Model", "DDPM"],
      category: "深度学习", tags: ["去噪", "加噪", "Stable Diffusion"],
      summary: "学习从噪声中逐步去噪，从而生成数据。",
      content: "前向过程不断加噪直至纯高斯，反向过程学习每一步去噪。训练目标简洁稳定，生成质量极高，Stable Diffusion、Midjourney 与视频生成模型都基于它。",
      links: [
        { type: "对比", to: "gan", note: "似然驱动 vs 对抗博弈" },
        { type: "应用", to: "aigc", note: "文生图与视频生成的主力" }
      ]
    },
    {
      id: "backprop", name: "反向传播", aliases: ["Backpropagation", "BP"],
      category: "深度学习", tags: ["链式法则", "梯度", "计算图"],
      summary: "利用链式法则从输出向输入逐层计算梯度。",
      content: "前向计算保存中间结果，反向按计算图求导，复杂度与一次前向同阶。自动微分框架把这件事变成一行 loss.backward()，但梯度消失/爆炸、梯度裁剪等问题仍需理解原理才能排查。",
      links: [
        { type: "依赖", to: "calculus", note: "本质是链式法则" },
        { type: "相关", to: "nn", note: "神经网络的训练引擎" }
      ]
    },
    {
      id: "dropout", name: "Dropout", aliases: ["Dropout", "随机失活"],
      category: "深度学习", tags: ["正则化", "随机性", "集成"],
      summary: "训练时随机丢弃部分神经元，防止共适应。",
      content: "每次迭代随机让一部分神经元失活，迫使网络学习冗余表示；推理时关闭并按比例缩放。可理解为对指数级子网络的隐式集成，是最简单有效的正则化手段之一。",
      links: [
        { type: "相关", to: "regularization", note: "一种随机正则化" },
        { type: "相关", to: "overfitting", note: "缓解过拟合的常用技巧" }
      ]
    },

    /* ---------------- 计算机视觉 ---------------- */
    {
      id: "cv", name: "计算机视觉", aliases: ["Computer Vision", "CV"],
      category: "计算机视觉", tags: ["图像", "感知", "像素"],
      summary: "让机器理解图像与视频内容的研究领域。",
      content: "从像素到语义，任务包括分类、检测、分割、跟踪、深度估计与三维重建。深度学习把它从手工特征时代带入了端到端时代，也是自动驾驶与医学影像的基础能力。",
      links: [
        { type: "包含", to: "image-classification", note: "图像级理解" },
        { type: "包含", to: "object-detection", note: "定位与识别" },
        { type: "包含", to: "segmentation", note: "像素级理解" },
        { type: "依赖", to: "cnn", note: "卷积网络是主流骨干" }
      ]
    },
    {
      id: "image-classification", name: "图像分类", aliases: ["Image Classification"],
      category: "计算机视觉", tags: ["ImageNet", "Top-5", "骨干"],
      summary: "判断一张图属于哪个类别，视觉任务的入门基准。",
      content: "AlexNet 在 ImageNet 上的突破开启了深度学习时代。分类网络常被迁移到检测、分割与检索任务中作为预训练骨干，是视觉领域最通用的「基础模型」。",
      links: [
        { type: "相关", to: "object-detection", note: "检测 = 分类 + 定位" },
        { type: "相关", to: "segmentation", note: "分割 = 逐像素分类" },
        { type: "应用", to: "medical-imaging", note: "病灶良恶性判断" }
      ]
    },
    {
      id: "object-detection", name: "目标检测", aliases: ["Object Detection", "YOLO"],
      category: "计算机视觉", tags: ["边框", "YOLO", "anchor"],
      summary: "找出图中每个物体的位置与类别。",
      content: "两阶段方法（Faster R-CNN）先提候选再分类，单阶段方法（YOLO、SSD）直接回归边框与类别。评价用 IoU 与 mAP，实时性与精度之间的取舍是工程核心。",
      links: [
        { type: "相关", to: "segmentation", note: "同属稠密预测任务" },
        { type: "依赖", to: "cnn", note: "依赖卷积特征金字塔" },
        { type: "应用", to: "autonomous-driving", note: "车辆与行人感知" }
      ]
    },
    {
      id: "segmentation", name: "图像分割", aliases: ["Segmentation", "U-Net"],
      category: "计算机视觉", tags: ["语义分割", "实例分割", "掩码"],
      summary: "为图像中的每个像素分配类别或实例。",
      content: "语义分割不区分个体，实例分割区分，全景分割二者兼顾。U-Net 的编解码与跳跃连接成为医学影像的标配，SAM 则把「可提示分割」推向通用。",
      links: [
        { type: "相关", to: "object-detection", note: "边框 vs 掩码" },
        { type: "应用", to: "medical-imaging", note: "器官与病灶勾画" },
        { type: "应用", to: "autonomous-driving", note: "可行驶区域与车道线" }
      ]
    },

    /* ---------------- 自然语言处理 ---------------- */
    {
      id: "nlp", name: "自然语言处理", aliases: ["Natural Language Processing", "NLP"],
      category: "自然语言处理", tags: ["语言", "序列", "语义"],
      summary: "让机器理解与生成人类语言的研究领域。",
      content: "从分词、词性标注、句法分析，到机器翻译、问答、对话与生成。预训练语言模型的出现，把 NLP 从「一任务一模型」推向了「一个底座适配所有任务」。",
      links: [
        { type: "包含", to: "word-embedding", note: "把词映射为向量" },
        { type: "包含", to: "llm", note: "当代的核心形态" },
        { type: "依赖", to: "transformer", note: "主流架构底座" }
      ]
    },
    {
      id: "word-embedding", name: "词向量", aliases: ["Word Embedding", "Word2Vec"],
      category: "自然语言处理", tags: ["分布式表示", "相似度", "语义"],
      summary: "把词映射到低维稠密向量，使语义相近的词距离更近。",
      content: "Word2Vec 用上下文预测目标词（或反之），GloVe 用共现统计。著名的「国王 - 男人 + 女人 ≈ 女王」展示了向量空间中的语义线性结构，也为后来的上下文相关表示铺路。",
      links: [
        { type: "前置", to: "llm", note: "语言建模的起点" },
        { type: "应用", to: "rag", note: "检索阶段的语义向量基础" }
      ]
    },
    {
      id: "llm", name: "大语言模型", aliases: ["LLM", "GPT", "大模型"],
      category: "自然语言处理", tags: ["预训练", "缩放定律", "对齐"],
      summary: "在海量语料上预训练、参数量巨大的通用语言模型。",
      content: "缩放定律揭示了参数、数据与算力的幂律关系；指令微调与 RLHF 让基座模型变成可对话的助手。上下文长度、推理成本与幻觉，是落地时绕不开的三个约束。",
      links: [
        { type: "依赖", to: "transformer", note: "几乎全部基于 Transformer" },
        { type: "应用", to: "prompt-engineering", note: "用提示引导模型行为" },
        { type: "应用", to: "rag", note: "外挂知识库缓解幻觉" },
        { type: "相关", to: "quantization", note: "量化是降本推理的关键" }
      ]
    },
    {
      id: "prompt-engineering", name: "提示工程", aliases: ["Prompt Engineering"],
      category: "自然语言处理", tags: ["Few-shot", "CoT", "角色设定"],
      summary: "通过设计输入文本，引导大模型产出期望结果。",
      content: "少样本示例、思维链、角色设定、输出格式约束是四大常用手段。它成本极低、见效快，但上限受模型能力限制，复杂任务仍需微调或工具调用配合。",
      links: [
        { type: "依赖", to: "llm", note: "以模型能力为前提" },
        { type: "相关", to: "rag", note: "检索结果通常拼进提示词" }
      ]
    },
    {
      id: "rag", name: "检索增强生成", aliases: ["RAG", "Retrieval-Augmented Generation"],
      category: "自然语言处理", tags: ["向量检索", "知识库", "引用"],
      summary: "先检索外部知识，再把结果交给模型生成答案。",
      content: "把文档切片、向量化存入索引，提问时召回最相关的片段作为上下文。它能缓解幻觉、支持私有知识并给出引用，是当前企业级问答系统的主流架构。",
      links: [
        { type: "依赖", to: "llm", note: "生成环节由模型完成" },
        { type: "依赖", to: "word-embedding", note: "语义检索依赖向量表示" },
        { type: "相关", to: "prompt-engineering", note: "召回内容需精心组织进提示" }
      ]
    },

    /* ---------------- 强化学习 ---------------- */
    {
      id: "rl", name: "强化学习", aliases: ["Reinforcement Learning", "RL"],
      category: "强化学习", tags: ["智能体", "奖励", "试错"],
      summary: "智能体通过与环境交互、最大化长期回报来学习策略。",
      content: "没有标准答案，只有延迟的奖励信号；探索与利用的权衡是永恒主题。它在游戏、机器人控制、推荐与 RLHF 中大放异彩，也因样本效率低而难以直接用于现实系统。",
      links: [
        { type: "包含", to: "mdp", note: "问题的数学形式" },
        { type: "包含", to: "q-learning", note: "基于值函数的方法" },
        { type: "包含", to: "policy-gradient", note: "直接优化策略的方法" },
        { type: "依赖", to: "probability", note: "转移与回报均为随机变量" }
      ]
    },
    {
      id: "mdp", name: "马尔可夫决策过程", aliases: ["MDP"],
      category: "强化学习", tags: ["状态", "动作", "贝尔曼方程"],
      summary: "用状态、动作、转移概率与奖励描述序贯决策问题。",
      content: "马尔可夫性假设未来只依赖当前状态，由此得到贝尔曼方程，把长期回报拆成「即时奖励 + 折扣后的未来」。值迭代与策略迭代都建立在它之上。",
      links: [
        { type: "前置", to: "q-learning", note: "Q 学习求解的正是 MDP" },
        { type: "前置", to: "policy-gradient", note: "策略优化的形式化基础" }
      ]
    },
    {
      id: "q-learning", name: "Q 学习", aliases: ["Q-Learning", "DQN"],
      category: "强化学习", tags: ["值函数", "TD", "离线策略"],
      summary: "学习状态-动作价值函数，据此选择最优动作。",
      content: "用时序差分更新 Q 值，无需环境模型，属于离线策略方法。DQN 用神经网络近似 Q 函数，并借助经验回放与目标网络稳定训练，是深度强化学习的里程碑。",
      links: [
        { type: "对比", to: "policy-gradient", note: "学价值 vs 直接学策略" },
        { type: "前置", to: "mdp", note: "以 MDP 为问题框架" }
      ]
    },
    {
      id: "policy-gradient", name: "策略梯度", aliases: ["Policy Gradient", "Actor-Critic"],
      category: "强化学习", tags: ["策略优化", "REINFORCE", "Actor-Critic"],
      summary: "直接对策略参数求梯度，按回报提升动作概率。",
      content: "REINFORCE 用蒙特卡洛回报估计梯度，方差大；Actor-Critic 引入价值函数作为基线，显著降低方差。它天然支持连续动作空间，是机器人控制的首选。",
      links: [
        { type: "包含", to: "ppo", note: "最常用的工程实现" },
        { type: "对比", to: "q-learning", note: "策略空间直接搜索" }
      ]
    },
    {
      id: "ppo", name: "PPO", aliases: ["Proximal Policy Optimization"],
      category: "强化学习", tags: ["裁剪", "稳定", "RLHF"],
      summary: "用裁剪的替代目标限制策略更新幅度，训练稳定。",
      content: "通过重要性采样比率裁剪，避免一步更新把策略带偏。实现简单、调参友好，既是游戏 AI 的常客，也是 ChatGPT 时代 RLHF 的默认算法。",
      links: [
        { type: "应用", to: "llm", note: "RLHF 阶段的核心算法" },
        { type: "前置", to: "policy-gradient", note: "策略梯度的稳定化改进" }
      ]
    },

    /* ---------------- 工程实践 ---------------- */
    {
      id: "pytorch", name: "PyTorch", aliases: ["PyTorch", "torch"],
      category: "工程实践", tags: ["动态图", "自动微分", "生态"],
      summary: "以动态计算图为核心的深度学习框架，学术界事实标准。",
      content: "张量与自动微分是它的两块基石，Pythonic 的写法让调试像写普通代码。TorchVision、HuggingFace、Lightning 等生态，让从研究到部署的路径更短。",
      links: [
        { type: "相关", to: "dl", note: "实现深度学习的主要工具" },
        { type: "相关", to: "transformer", note: "大量官方与社区实现" },
        { type: "应用", to: "llm", note: "训练与微调的常用框架" }
      ]
    },
    {
      id: "data-pipeline", name: "数据管道", aliases: ["Data Pipeline", "ETL"],
      category: "工程实践", tags: ["采集", "清洗", "特征存储"],
      summary: "把原始数据加工成可训练、可服务的数据流。",
      content: "包含采集、清洗、标注、切分、特征计算与版本管理。数据质量决定模型上限，「垃圾进垃圾出」在工业界是铁律；离线训练与在线服务的一致性更是常见事故源。",
      links: [
        { type: "相关", to: "feature-engineering", note: "特征加工发生在管道中" },
        { type: "前置", to: "model-eval", note: "评估需要干净一致的数据" }
      ]
    },
    {
      id: "deployment", name: "模型部署", aliases: ["Model Serving", "MLOps"],
      category: "工程实践", tags: ["推理", "延迟", "监控"],
      summary: "把训练好的模型变成稳定、低延迟的在线服务。",
      content: "涉及模型导出（ONNX/TensorRT）、批处理与并发、GPU 显存管理、灰度发布与回滚。上线只是开始，数据漂移监控与定期重训才是长期工作。",
      links: [
        { type: "依赖", to: "quantization", note: "压缩后推理成本更低" },
        { type: "前置", to: "model-eval", note: "先离线达标再上线" }
      ]
    },
    {
      id: "quantization", name: "模型量化", aliases: ["Quantization", "INT8"],
      category: "工程实践", tags: ["INT8", "压缩", "加速"],
      summary: "用低精度表示权重与激活，降低显存与延迟。",
      content: "从 FP32 到 FP16/INT8/INT4，精度损失需要校准与量化感知训练来控制。它是大模型端侧部署与推理降本的关键手段，常与蒸馏、剪枝配合使用。",
      links: [
        { type: "相关", to: "deployment", note: "部署阶段的常规优化" },
        { type: "相关", to: "llm", note: "大模型推理降本的核心" }
      ]
    },

    /* ---------------- 应用 ---------------- */
    {
      id: "recsys", name: "推荐系统", aliases: ["Recommender System", "RecSys"],
      category: "应用", tags: ["召回", "排序", "CTR"],
      summary: "从海量内容中预测用户最可能感兴趣的对象。",
      content: "典型架构是「召回 → 粗排 → 精排 → 重排」，精排常用 CTR 预估模型。冷启动、多样性、实时性与生态健康，是算法之外的业务约束。",
      links: [
        { type: "相关", to: "feature-engineering", note: "用户与物品特征是核心" },
        { type: "相关", to: "llm", note: "生成式推荐是新兴方向" },
        { type: "依赖", to: "deployment", note: "在线服务对延迟极敏感" }
      ]
    },
    {
      id: "aigc", name: "AIGC", aliases: ["AI Generated Content"],
      category: "应用", tags: ["文生图", "文生视频", "创作"],
      summary: "用生成模型自动产出文本、图像、音频与视频内容。",
      content: "扩散模型负责视觉，大语言模型负责文本，二者结合催生了文生图、文生视频与多模态创作工具。版权、可控性与内容安全，是它走向生产的三道门槛。",
      links: [
        { type: "依赖", to: "diffusion", note: "图像与视频生成主力" },
        { type: "依赖", to: "llm", note: "文本与多模态理解主力" },
        { type: "相关", to: "gan", note: "上一代生成范式" }
      ]
    },
    {
      id: "autonomous-driving", name: "自动驾驶", aliases: ["Autonomous Driving"],
      category: "应用", tags: ["感知", "规划", "控制"],
      summary: "让车辆自主感知环境并完成驾驶决策。",
      content: "感知层用视觉与激光雷达做检测、分割与跟踪；预测层估计他车意图；规划控制层生成轨迹。端到端大模型正在重构传统分模块架构。",
      links: [
        { type: "应用", to: "cv", note: "感知的核心能力" },
        { type: "应用", to: "segmentation", note: "可行驶区域与车道线" },
        { type: "相关", to: "rl", note: "决策规划中的序贯决策" }
      ]
    },
    {
      id: "medical-imaging", name: "医学影像分析", aliases: ["Medical Imaging"],
      category: "应用", tags: ["CT", "MRI", "辅助诊断"],
      summary: "用视觉算法辅助医生完成病灶检出与定量分析。",
      content: "数据稀缺、标注昂贵、可解释性要求高，是这个领域与通用视觉最大的差别。U-Net 系列在分割上长期占优，联邦学习与自监督预训练正在缓解数据孤岛问题。",
      links: [
        { type: "应用", to: "cv", note: "视觉算法的典型落地" },
        { type: "应用", to: "segmentation", note: "器官与病灶勾画" },
        { type: "应用", to: "image-classification", note: "病灶良恶性分类" }
      ]
    }
  ]
};
