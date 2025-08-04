// 最美诗词 - 前端应用
// 重构版本，专注于个人使用的简洁体验

class PoemApp {
    constructor() {
        this.currentView = 'generate';
        this.currentMode = 'poetry'; // 'poetry' or 'baokuan'
        this.currentArticle = null;
        this.articles = [];
        this.config = {};
        this.prompts = this.getDefaultPrompts();
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkServiceStatus();
        await this.loadConfig();
        await this.loadRecentArticles();
        await this.initializePrompts();
    }

    getDefaultPrompts() {
        return {
            poetry_structured: `请为{author}的《{title}》创作一篇既有深度又有传播力的诗词赏析爆文，要求1000-1300字。

## 核心要求：
1. **诗词原文准确性**：必须提供完整准确的诗词原文，如果用户未提供，请根据知识库查找正确版本
2. **写作风格**：{style}
3. **传播目标**：既要有学术深度，更要有爆款传播力，让读者忍不住转发收藏

## 写作流程指导（生成时严格按顺序，但绝对不要显示这些指导标记）：

**第一部分**：用反转冲击开头（150字，分2段），必须颠覆常见认知。如"你以为这首诗写的是...其实真正要表达的是..."，立即抓住注意力，与标题呼应。

**第二部分**：展示诗词原文（单独成段，可用引用格式），配一句感叹点评。

**第三部分**：用故事化语言介绍创作背景（200字，分3段），包括诗人境遇、创作缘由、时代背景，要有画面感和戏剧性。

**第四部分**：深度解读（500字，分4段），必须用数字化表达增强说服力。如"仅仅8个字就说透了人生真相"、"这3个细节让99%的人都想错了"，每段要有收藏级金句。

**第五部分**：现代强关联（250字，分3段），每个古诗元素都要对应具体的现代生活场景，设计情感暴击点，让读者产生"说的就是我"的强烈共鸣。

**第六部分**：收藏转发结尾（150字，分2段），强调文章的珍贵价值，暗示收藏转发，设置互动话题。要与开头反转形成呼应。

## 100万+爆文写作技巧：
- **开头反转冲击**：立即颠覆读者认知，"你以为...其实..."
- **数字化表达**：用具体数字增强说服力，"3000万人、99%、第1次"
- **收藏价值强化**：反复暗示文章珍贵，值得收藏转发
- **现代强关联**：每个古诗元素都要对应现代生活场景
- **情感暴击点**：设计让人瞬间共鸣的扎心内容
- **权威背书**：引用名人、专家、成功人士来增强可信度
- **标题呼应**：文章内容必须与生成的标题完美呼应

## 💎 爆款排版优化要求（确保100万+传播效果）：

### 📱 移动端阅读优化：
- **段落精控**：每段严格2-4句话，50-100字，避免文字墙
- **句子节奏**：单句不超过25字，用句号分割长句
- **视觉呼吸**：段落间必须空行，关键内容前后留白
- **重点突出**：关键信息用**加粗**，数字用阿拉伯数字

### 🔥 爆款传播结构：
- **开头冲击**：第1段必须短小精悍，立即抓住注意力
- **金句分布**：每2-3段就有一句适合摘抄转发的金句
- **情感高潮**：关键情感爆点单独成段，增强冲击力
- **收藏暗示**：适时出现"值得收藏"、"建议保存"等提示

### 📖 专业排版技巧：
- **诗词展示**：原文用引用格式 > ，前后留白突出
- **数字强化**：用3000万、99%等具体数字增强说服力
- **节奏控制**：长短段落交替，保持阅读韵律感
- **互动设计**：结尾设置引发评论的开放性问题

### ✨ 社交友好格式：
- **朋友圈适配**：确保每段都有转发价值
- **标题呼应**：内容与生成的标题完美呼应
- **话题性**：设置能引发讨论的观点或争议点
- **完整闭环**：开头反转与结尾升华形成呼应

## 具体内容：
{keywords}
{content}

## 【绝对禁止！！！】格式要求：
**严格警告：绝对禁止任何形式的小标题、段落标记、提示词！**

**禁止清单（任何一个都不能出现）：**
❌ "那时候" ❌ "诗人心境" ❌ "时代背景" ❌ "细读" ❌ "深意" ❌ "情感密码" 
❌ "背后故事" ❌ "说的是我们" ❌ "现在的你" ❌ "人生感悟" ❌ "想说的话" ❌ "留给你"
❌ "那一刻" ❌ "这首诗" ❌ "当时" ❌ "此时" ❌ "如今" ❌ "今天" ❌ "现在"
❌ 任何两个字或三个字的段落开头标记
❌ "---" ❌ "##" ❌ "###" ❌ 任何分隔符号

**正确写法**：
每段直接开始写内容，像这样：
"王勃站在秋风中，感受着..."
"风吹过林间，带来一阵清香..."
"你是否也曾在某个夜晚..."

**文章必须像一篇连贯的散文，没有任何结构提示！**
如果你生成了任何上述禁止的标记，用户会非常愤怒！
请确保每一段都是自然流畅的文字，绝对不要任何标题式开头！

## 🎯 最终执行要求：
**请严格按照以上排版要求生成文章，确保：**
1. 每段50-100字，短小精悍，适合手机阅读
2. 诗词原文用 > 引用格式突出显示
3. 关键信息加粗，数字用阿拉伯数字
4. 金句分布均匀，具有转发价值
5. 开头反转冲击，结尾收藏引导
6. 无任何小标题，纯文本流畅散文风格

**这是100万+爆文，每个细节都关系到传播效果！！！**`,


            poetry: `请为{author}的《{title}》创作一篇深度诗词赏析文章，要求1000-1300字。

## 核心要求：
1. **诗词原文准确性**：必须提供完整准确的诗词原文，如果用户未提供，请根据知识库查找正确版本
2. **写作风格**：{style}
3. **目标读者**：微信公众号读者，需要通俗易懂但有深度

## 文章结构框架：

### 开头（150字，分2段）
- 用引人入胜的故事或场景开头，不要直接介绍诗词
- 可以是历史典故、现代联想、或者诗人轶事

每段控制在2-3句话，约75字左右，自然引出要分析的诗词

### 诗词原文展示
- 完整准确的诗词原文（单独成段）
- 只显示诗词原文，不要添加创作时间和地点信息

### 创作背景（200字，分3段）
**第一段**：诗人当时的人生境遇（约70字）
**第二段**：创作这首诗的具体缘由（约70字）  
**第三段**：时代背景对诗词的影响（约60字）

用故事化的语言，避免枯燥的史料堆砌，每段2-3句话

### 深度赏析（500字，分4段）
**第一段**：首句或前两句的深层含义分析（约125字）
**第二段**：核心意象的象征意义解读（约125字）
**第三段**：情感递进关系和表达技巧（约125字）
**第四段**：艺术手法的通俗解释和效果（约125字）

每段重点突出，不要堆砌过多内容

### 当代共鸣（250字，分3段）
**第一段**：这首诗触动现代人的情感共鸣（约80字）
**第二段**：联系具体的当下生活场景（约85字）
**第三段**：给读者的人生感悟（约85字）

避免空洞的大道理，要有贴近生活的例子

### 余韵悠长（150字，分2段）
**第一段**：回扣开头，形成呼应（约75字）
**第二段**：用诗意语言升华主题（约75字）

注意：结尾要自然收束，不要使用"愿你我..."、"希望我们..."等祝福式表达，让读者意犹未尽

## 写作技巧要求：
- **语言生动**：多用比喻、排比等修辞手法
- **故事化表达**：把枯燥的知识点包装成有趣的故事
- **情感共鸣**：连接古今，让读者产生情感共鸣
- **节奏感**：长短句结合，避免句式单调
- **金句提炼**：每个段落都要有1-2句精彩的表达

## 手机排版要求：
- **段落长度**：每段严格控制在60-130字之间，超过则必须分段
- **句子长度**：单句不超过30字，复句不超过50字
- **分段原则**：一个观点一段，不要混合多个要点
- **空行使用**：段落间保持空行，提升阅读体验
- **标点节奏**：多用句号分隔，减少逗号长句
- **视觉呼吸**：避免大段文字墙，让版面有呼吸感

## 具体内容：
{keywords}
{content}

请按照以上要求创作，确保文章既有学术深度又有可读性，让普通读者也能感受到诗词的美好。`,
            
            baokuan: {
                extractTitle: `请从以下内容中提取出原文的标题，如果没有明确标题，请根据内容概括一个简洁的标题：

{content}

请只返回标题，不要解释。`,

                extractTopic: `请从以下内容中提取出适合做爆款文章的核心选题（一句话概括这篇文章的核心亮点或吸引点）：

{content}

请只返回选题概括，不要解释。`,
                
                extract: `请深度分析以下爆款文章，提取其成功的爆点要素和写作技巧：

文章内容：{content}

请从以下维度进行分析：
1. 爆款标题技巧（为什么这个标题吸引人？用了什么套路？）
2. 开头抓人技巧（如何在前3句话抓住读者？）
3. 情感触点分析（触动了读者什么情感？恐惧/焦虑/好奇/共鸣？）
4. 内容结构特点（用了什么逻辑结构？对比/反转/递进？）
5. 表达方式特色（语言风格、修辞手法、互动元素）
6. 传播引爆点（什么地方最容易被转发/讨论？）

输出格式：
标题技巧：xxx
开头套路：xxx  
情感触点：xxx
结构特点：xxx
表达特色：xxx
引爆点：xxx`,
                
                generate: `请严格仿写以下爆款文章的写作套路和风格，但内容要在相同主题领域内创作：

原文内容：
{content}

仿写要求：
1. **严格模仿标题套路**：学习原文的标题技巧、数字使用、吸引力公式
2. **复制开头套路**：完全模仿原文的开头方式和抓人技巧
3. **保持相同结构**：使用相同的段落组织、逻辑展开和表达方式
4. **复制传播引爆点**：保持原文最容易被转发/讨论的元素和表达
5. **保持相同主题领域**：绝对不能改变主题（诗词→诗词，职场→职场，情感→情感）
6. **模仿语言风格**：学习原文的语气、用词、修辞手法
7. **保持底部引导**：如果原文有收藏、转发、关注等引导语，也要模仿使用
8. **字数控制在800-1200字**

**文章格式要求**：
- **必须是连贯完整的文章**，不要出现"第一段"、"第二段"、"结尾"等标记
- **不要使用段落标题**，直接写正文内容  
- **保持文字流畅自然**，像一篇正常的微信爆款文章
- **严格保持原文的互动性和传播性**

**重要：这是爆款文仿写，要学习套路但绝对不能改变主题领域！**

请开始仿写：`,

                format: `请对以下文章进行排版优化，提升阅读体验：

{content}

排版优化要求：
1. **段落结构优化**：合理分段，每段2-4句话，避免大段文字
2. **重点内容突出**：对关键信息使用**加粗**标记
3. **添加适当的分隔符**：在不同主题之间添加 --- 分隔线
4. **优化开头结尾**：确保开头抓人眼球，结尾呼吁行动
5. **保持原文内容不变**：只调整排版格式，不修改文字内容
6. **适合移动端阅读**：考虑手机屏幕的阅读习惯

**格式要求**：
- 使用markdown格式
- 保持文章的完整性和流畅性
- 确保排版美观易读

请开始排版优化：`
            },
            
            poetry_title: `请为{author}的《{title}》生成一个10万+阅读量的爆文标题！

## 爆文标题要求：
1. **字数控制**：20-30字，要足够有冲击力
2. **包含元素**：必须包含{author}和《{title}》
3. **阿拉伯数字强制要求**：标题中必须包含阿拉伯数字（如1、3、7、20、99、1000等）
4. **传播目标**：朋友圈疯传、微博热议、收藏转发的10万+爆文标题

## 10万+爆文标题技巧（学会精髓，打造传播炸弹）：

**数字爆炸技巧**（必杀技，数字制造强冲击）：
- 大数字：1000年、3000万人、99%的人、第一次、仅仅20个字
- 小数字：3个字、1句话、5分钟、7个细节
- 对比数字：从0到爆红、1首诗改变命运

**好奇心引爆技巧**（让人忍不住点开）：
- 秘密系列：藏着什么秘密、背后真相、不为人知的
- 反常系列：你绝对想不到、居然是因为、原来不是
- 悬念系列：为什么能火1000年、到底发生了什么

**情感共鸣炸弹**（直击人心，疯狂转发）：
- 代入感：说的就是你、每个人都会懂、看完沉默了
- 时空穿越：古人早就看透现代人、1000年前的预言
- 人生感悟：一句话点醒无数人、看懂了人生

**争议话题技巧**（引发讨论，病毒传播）：
- 颠覆认知：你一直理解错了、真相让人震惊
- 对立观点：为什么有人说、网友吵翻了
- 热点关联：像极了现在的我们、说透了当代人

**收藏转发技巧**（让人舍不得划走）：
- 价值感：必须收藏、值得一读再读、受益终生
- 稀缺感：很少有人知道、第一次公开、失传已久
- 实用感：学会了、懂得了、终于明白

## 避免的标题类型：
❌ 过度标题党："震惊！{author}《{title}》竟然..."
❌ 毫无新意："{author}《{title}》赏析"
❌ 过于学术："论{author}《{title}》的艺术特色"
❌ 过度煽情："看哭了！{author}《{title}》..."

## 10万+爆文创作要求：
- **作者信息准确**：必须使用正确的{author}，绝对不能出错（如王勃的诗不能写成李白）
- **阿拉伯数字强制**：标题中必须包含阿拉伯数字，没有数字的标题一律不合格！
- **传播炸弹**：标题要有强烈的点击冲动，让人看到就想点开、想转发
- **情感引爆**：要触发强烈情感反应：震惊、好奇、共鸣、争议
- **朋友圈测试**：想象这个标题在朋友圈能不能引发大量点赞评论转发
- **收藏价值**：让人觉得"这个必须收藏"、"太有道理了"
- **话题性**：要有讨论价值，能引发评论区热议

## 重要提醒：
**作者姓名绝对不能错！{author}是谁就写谁，不要混淆！**

## 最终检验标准：
想象你的标题能不能做到：
✅ 让人忍不住点开（好奇心爆棚）
✅ 看完想立刻转发（传播价值）
✅ 引发热烈讨论（话题性强）
✅ 产生收藏冲动（价值感）
✅ 数字吸睛（视觉冲击）

**目标：打造真正的10万+阅读量爆文标题！**

请直接返回标题，不要解释过程。`
        };
    }

    async initializePrompts() {
        // 优先从服务器加载用户自定义提示词
        try {
            const response = await fetch('/api/prompts');
            const data = await response.json();
            
            if (data.success && Object.keys(data.data).length > 0) {
                // 完全使用服务器端的自定义提示词，不合并默认值
                this.prompts = data.data;
                console.log('✅ 从服务器加载自定义提示词，忽略默认模板');
            } else {
                // 只有服务器没有数据时，才使用默认值
                console.log('⚠️ 服务器无自定义提示词，使用默认模板');
                // 尝试从本地存储迁移
                await this.migrateLocalPrompts();
            }
        } catch (error) {
            console.warn('从服务器加载提示词失败，使用默认模板:', error);
            // 服务器加载失败时，使用默认模板
            this.prompts = this.getDefaultPrompts();
        }
        
        // 初始化设置页面的提示词内容
        this.updatePromptTextareas();
    }

    async migrateLocalPrompts() {
        // 从本地存储迁移提示词到服务器
        const savedPrompts = localStorage.getItem('custom-prompts');
        if (savedPrompts) {
            try {
                const localPrompts = JSON.parse(savedPrompts);
                
                // 尝试迁移到服务器
                await this.savePromptsToServer(localPrompts);
                
                // 迁移成功后，使用迁移的数据并清除本地存储
                this.prompts = localPrompts;
                localStorage.removeItem('custom-prompts');
                console.log('✅ 本地提示词已迁移到服务器');
            } catch (error) {
                console.error('迁移本地提示词失败，使用默认模板:', error);
                this.prompts = this.getDefaultPrompts();
            }
        } else {
            // 没有本地数据，使用默认模板
            this.prompts = this.getDefaultPrompts();
        }
    }

    updatePromptTextareas() {
        // 更新诗词赏析提示词 - 结构化风格
        const poetryStructuredTextarea = document.getElementById('poetryStructuredTemplate');
        if (poetryStructuredTextarea) {
            poetryStructuredTextarea.value = this.prompts.poetry_structured;
        }
        
        
        // 更新诗词标题生成提示词
        const poetryTitleTextarea = document.getElementById('poetryTitleTemplate');
        if (poetryTitleTextarea) {
            poetryTitleTextarea.value = this.prompts.poetry_title;
        }
        
        // 更新爆款文提示词
        const baokuanExtractTitleTextarea = document.getElementById('baokuanExtractTitleTemplate');
        if (baokuanExtractTitleTextarea) {
            baokuanExtractTitleTextarea.value = this.prompts.baokuan.extractTitle;
        }
        
        const baokuanExtractTopicTextarea = document.getElementById('baokuanExtractTopicTemplate');
        if (baokuanExtractTopicTextarea) {
            baokuanExtractTopicTextarea.value = this.prompts.baokuan.extractTopic;
        }
        
        const baokuanExtractTextarea = document.getElementById('baokuanExtractTemplate');
        if (baokuanExtractTextarea) {
            baokuanExtractTextarea.value = this.prompts.baokuan.extract;
        }
        
        const baokuanGenerateTextarea = document.getElementById('baokuanGenerateTemplate');
        if (baokuanGenerateTextarea) {
            baokuanGenerateTextarea.value = this.prompts.baokuan.generate;
        }
        
        const baokuanFormatTextarea = document.getElementById('baokuanFormatTemplate');
        if (baokuanFormatTextarea) {
            baokuanFormatTextarea.value = this.prompts.baokuan.format;
        }
    }

    bindEvents() {
        // 表单提交防止页面刷新
        document.addEventListener('submit', (e) => e.preventDefault());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        if (this.currentView === 'generate') {
                            e.preventDefault();
                            this.generateArticle();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveCurrentArticle();
                        break;
                }
            }
        });

        // 自动保存
        setInterval(() => {
            this.autoSave();
        }, 30000); // 30秒自动保存一次
    }

    // ==================== 服务状态检查 ====================
    async checkServiceStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.updateServiceStatus('connected', '服务正常');
            } else {
                this.updateServiceStatus('disconnected', '服务异常');
            }
        } catch (error) {
            this.updateServiceStatus('disconnected', '服务离线');
        }
    }

    updateServiceStatus(status, message) {
        const statusElement = document.getElementById('serviceStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        dot.className = `status-dot ${status}`;
        text.textContent = message;
    }

    // ==================== 配置管理 ====================
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            
            if (data.success) {
                this.config = data.data;
                this.updateUI();
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async saveConfig() {
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
            
            const data = await response.json();
            if (data.success) {
                this.showToast('success', '配置保存成功');
            }
        } catch (error) {
            this.showToast('error', '配置保存失败');
        }
    }

    updateUI() {
        // 更新微信配置显示
        const wechatAppId = document.getElementById('wechatAppId');
        const wechatAppSecret = document.getElementById('wechatAppSecret');
        
        if (wechatAppId && this.config.wechat) {
            wechatAppId.value = this.config.wechat.appId || '';
        }
        
        if (wechatAppSecret && this.config.wechat) {
            wechatAppSecret.value = this.config.wechat.appSecret === '***已配置***' ? '' : this.config.wechat.appSecret || '';
        }
    }

    // ==================== 视图切换 ====================
    switchView(viewName) {
        // 隐藏所有视图
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // 移除所有导航激活状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 显示目标视图
        const targetView = document.getElementById(viewName + 'View');
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // 激活对应导航
        const navItem = document.querySelector(`[onclick="switchView('${viewName}')"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        this.currentView = viewName;
        
        // 加载视图数据
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch(viewName) {
            case 'history':
                await this.loadArticles();
                break;
            case 'stats':
                await this.loadStats();
                break;
            case 'wechat':
                await this.loadWechatStatus();
                break;
        }
    }

    // ==================== 模式切换 ====================
    switchMode(modeName) {
        this.currentMode = modeName;
        
        // 更新模式切换按钮状态
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(modeName + 'Tab').classList.add('active');
        
        // 切换表单显示
        document.querySelectorAll('.form-mode').forEach(form => {
            form.classList.remove('active');
            form.style.display = 'none';
        });
        
        const targetForm = document.getElementById(modeName + 'Form');
        if (targetForm) {
            targetForm.classList.add('active');
            targetForm.style.display = 'block';
        }
        
        // 更新页面标题和描述
        if (modeName === 'poetry') {
            document.getElementById('generateTitle').textContent = '生成诗词赏析文章';
            document.getElementById('generateDescription').textContent = '输入诗词信息，AI将为您生成深度赏析文章';
        } else if (modeName === 'baokuan') {
            document.getElementById('generateTitle').textContent = '仿写爆款文';
            document.getElementById('generateDescription').textContent = '输入爆款文章链接或内容，AI将分析其爆款套路并仿写全新文章';
        } else if (modeName === 'xiaolvshu') {
            document.getElementById('generateTitle').textContent = '生成小绿书图片';
            document.getElementById('generateDescription').textContent = '输入任意文本内容，AI将智能分段并生成精美图片';
        }
        
        // 清空当前文章和输出
        this.currentArticle = null;
        this.hideOutput();
        
        const modeNames = {
            'poetry': '诗词赏析',
            'baokuan': '爆款文',
            'xiaolvshu': '小绿书'
        };
        this.showToast('info', `已切换到${modeNames[modeName] || modeName}模式`);
    }

    hideOutput() {
        document.getElementById('output').style.display = 'none';
        document.getElementById('outputPlaceholder').style.display = 'flex';
        document.getElementById('outputActions').style.display = 'none';
    }

    // ==================== 文章生成 ====================
    async generateArticle() {
        const author = document.getElementById('author').value.trim();
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        const style = document.getElementById('style').value;
        const keywords = document.getElementById('keywords').value.trim();
        
        if (!author || !title) {
            this.showToast('error', '请输入作者和诗词名称');
            return;
        }
        
        this.showLoading();
        
        // 使用优化后的诗词赏析提示词（结构化版本）
        const selectedPrompt = this.prompts.poetry_structured;
        
        try {
            const response = await fetch('/api/articles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author,
                    title,
                    content,
                    style,
                    keywords,
                    customPrompt: selectedPrompt
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayArticle(data);
                this.currentArticle = data;
                this.showToast('success', '文章生成成功');
                
                // 自动滚动到结果区域
                document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error(data.error || '生成失败');
            }
        } catch (error) {
            this.showToast('error', '生成失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async generateBaokuan() {
        const url = document.getElementById('baokuanUrl').value.trim();
        const manualContent = document.getElementById('baokuanContent').value.trim();
        
        if (!url && !manualContent) {
            this.showToast('error', '请输入爆款文章链接或粘贴正文内容');
            return;
        }
        
        this.showBaokuanLoading();
        
        try {
            const response = await fetch('/api/baokuan/generate-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    manualContent,
                    customPrompts: this.prompts.baokuan
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayBaokuanArticle(data);
                this.currentArticle = data;
                this.showToast('success', '爆款文生成成功');
                
                // 自动滚动到结果区域
                document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error(data.error || '生成失败');
            }
        } catch (error) {
            this.showToast('error', '生成失败: ' + error.message);
        } finally {
            this.hideBaokuanLoading();
        }
    }

    displayBaokuanArticle(result) {
        const outputElement = document.getElementById('output');
        const placeholderElement = document.getElementById('outputPlaceholder');
        const actionsElement = document.getElementById('outputActions');
        
        let html = '';
        
        // 显示生成的标题选项（如果有多个）
        console.log('检查标题数据:', result.titles);
        if (result.titles && result.titles.length > 0) {
            html += `<div class="generated-titles">
                <div class="titles-header">
                    <h4>🎯 生成的爆款标题：</h4>
                    <button class="btn btn-sm btn-outline regenerate-btn" onclick="app.regenerateTitles()" title="重新生成标题">
                        🔄 重新生成
                    </button>
                </div>`;
            result.titles.forEach((title, index) => {
                const isSelected = index === 0;
                html += `
                    <div class="title-option ${isSelected ? 'selected' : ''}" data-title="${title.replace(/"/g, '&quot;')}">
                        ${title}
                    </div>
                `;
            });
            html += '</div>';
        } else {
            console.log('标题数据为空或不存在');
        }
        
        // 显示封面预览（如果有）
        if (result.cover && result.cover.success) {
            html += '<div class="cover-preview"><h4>🎨 生成的封面：</h4>';
            if (result.cover.html) {
                html += `<div class="cover-preview-container">${result.cover.html}</div>`;
            } else if (result.cover.imageUrl) {
                html += `<div class="cover-preview-container"><img src="${result.cover.imageUrl}" alt="封面图" style="max-width: 200px; border-radius: 8px;"></div>`;
            }
            html += '</div>';
        }
        
        if (result.originTitle) {
            html += `<div class="baokuan-metadata"><strong>原文标题：</strong>${result.originTitle}</div>`;
        }
        
        
        if (result.topic) {
            html += `<div class="baokuan-metadata"><strong>爆款选题：</strong>${result.topic}</div>`;
        }
        
        if (result.keywords && result.keywords.length) {
            html += `<div class="baokuan-metadata"><strong>关键词：</strong>${result.keywords.join('、')}</div>`;
        }
        
        if (result.explosiveElements) {
            html += `<div class="baokuan-metadata"><strong>爆款要素分析：</strong><br><pre style="white-space: pre-wrap; font-size: 0.8em; line-height: 1.4;">${result.explosiveElements}</pre></div>`;
        }
        
        if (result.content) {
            html += '<div class="article-content"><h4>📝 仿写的爆款文：</h4>' + this.renderMarkdown(result.content) + '</div>';
        }
        
        outputElement.innerHTML = html;
        outputElement.style.display = 'block';
        placeholderElement.style.display = 'none';
        actionsElement.style.display = 'flex';
        
        // 添加文章元数据
        this.addBaokuanMetadata(result);
        
        // 保存当前选择的标题（使用第一个生成的标题或爆款选题）
        this.selectedTitle = (result.titles && result.titles.length > 0) ? result.titles[0] : result.topic || null;
        
        // 绑定标题选择事件
        this.bindTitleSelectionEvents();
    }

    addBaokuanMetadata(articleData) {
        const metaElement = document.createElement('div');
        metaElement.className = 'article-metadata';
        metaElement.innerHTML = `
            <small style="color: var(--text-muted); margin-top: 1rem; display: block;">
                📊 来源: 爆款文生成器 | 
                ⏰ 生成时间: ${new Date().toLocaleString()} |
                📝 字数: ${articleData.content ? articleData.content.length : 0}
            </small>
        `;
        
        document.getElementById('output').appendChild(metaElement);
    }

    showBaokuanLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading').querySelector('p').textContent = 'AI正在抓取和生成爆款文，请稍候...';
        document.getElementById('output').style.display = 'none';
        document.getElementById('outputPlaceholder').style.display = 'none';
        document.getElementById('generateBaokuanBtn').disabled = true;
        document.getElementById('generateBaokuanBtn').textContent = '生成中...';
    }

    hideBaokuanLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('generateBaokuanBtn').disabled = false;
        document.getElementById('generateBaokuanBtn').textContent = '🚀 生成爆款文';
    }

    displayArticle(articleData) {
        const outputElement = document.getElementById('output');
        const placeholderElement = document.getElementById('outputPlaceholder');
        const actionsElement = document.getElementById('outputActions');
        
        // 创建完整的显示内容
        let displayContent = '';
        
        // 显示生成的标题选项
        if (articleData.titles && articleData.titles.length > 0) {
            displayContent += `<div class="generated-titles">
                <div class="titles-header">
                    <h4>🎯 生成的爆款标题：</h4>
                    <button class="btn btn-sm btn-outline regenerate-btn" onclick="app.regenerateTitles()" title="重新生成标题">
                        🔄 重新生成
                    </button>
                </div>`;
            articleData.titles.forEach((title, index) => {
                const isSelected = index === 0;
                displayContent += `
                    <div class="title-option ${isSelected ? 'selected' : ''}" data-title="${title.replace(/"/g, '&quot;')}">
                        ${title}
                    </div>
                `;
            });
            displayContent += '</div><hr>';
        }
        
        // 显示封面预览
        if (articleData.cover && articleData.cover.success) {
            displayContent += '<div class="cover-preview"><h4>🖼️ 文字封面预览：</h4>';
            if (articleData.cover.html) {
                displayContent += `<div class="cover-preview-container">${articleData.cover.html}</div>`;
            } else {
                // 如果HTML封面未生成，显示高级诗词风格封面
                const coverStyle = this.generatePoetryCoverStyle(articleData.metadata?.author, articleData.metadata?.title);
                displayContent += `<div class="cover-preview-container">
                    <div style="${coverStyle.containerStyle}">
                        <!-- 装饰性边框 -->
                        <div style="${coverStyle.borderStyle}"></div>
                        
                        <!-- 印章装饰 -->
                        <div style="${coverStyle.sealStyle}">诗</div>
                        
                        <!-- 主要内容 -->
                        <div style="${coverStyle.contentStyle}">
                            <div style="${coverStyle.authorStyle}">${articleData.metadata?.author || '诗词'}</div>
                            <div style="${coverStyle.titleStyle}">${articleData.metadata?.title || '经典诗词赏析'}</div>
                        </div>
                        
                        <!-- 底部装饰 -->
                        <div style="${coverStyle.footerStyle}">最美诗词</div>
                    </div>
                </div>`;
            }
            
            // 添加封面选择选项
            displayContent += '<div class="cover-options">';
            displayContent += '<h4>📋 选择封面类型：</h4>';
            displayContent += '<div class="cover-option-group">';
            displayContent += `
                <label class="cover-option">
                    <input type="radio" name="coverType" value="random" checked>
                    <span>1. 线上随机图片</span>
                </label>
                <label class="cover-option">
                    <input type="radio" name="coverType" value="default">
                    <span>2. 系统默认图片 (cover-1.jpg/cover-2.jpg)</span>
                </label>
                <label class="cover-option">
                    <input type="radio" name="coverType" value="generated">
                    <span>3. 生成的CSS封面图片 ⭐</span>
                </label>
            `;
            displayContent += '</div></div>';
            displayContent += '</div><hr>';
        }
        
        // 显示文章内容
        displayContent += '<div class="article-content"><h4>📝 文章内容：</h4>';
        displayContent += this.renderMarkdown(articleData.content);
        displayContent += '</div>';
        
        outputElement.innerHTML = displayContent;
        
        // 显示结果区域
        outputElement.style.display = 'block';
        placeholderElement.style.display = 'none';
        actionsElement.style.display = 'flex';
        
        // 添加文章元数据
        this.addArticleMetadata(articleData);
        
        // 保存当前选择的标题（默认第一个）
        this.selectedTitle = articleData.titles && articleData.titles.length > 0 ? articleData.titles[0] : null;
        
        // 绑定标题选择事件
        this.bindTitleSelectionEvents();
    }

    /**
     * 生成高级诗词风格封面样式
     */
    generatePoetryCoverStyle(author, title) {
        // 你提供的高级配色方案
        const colorPalette = [
            '#b9bc74', '#3a480e', '#6c7926', '#f0f2d7', '#7e8c3f', '#e0e3af', '#ebe588', '#5c5420', '#8c844a',
            '#d4b373', '#5d583d', '#ae9363', '#8f7d55', '#935832', '#a88255', '#987036', '#e3d1af', '#ebd490'
        ];

        // 随机选择颜色组合创建更好看的主题
        const getRandomTheme = () => {
            const shuffle = [...colorPalette].sort(() => Math.random() - 0.5);
            return {
                background: shuffle[0],
                primaryColor: '#ffffff',
                accentColor: shuffle[1],
                borderColor: shuffle[2],
                sealColor: shuffle[3]
            };
        };

        // 根据诗人选择主题配色 - 更好看的设计
        const themes = {
            '李白': {
                name: '太白仙韵',
                ...getRandomTheme()
            },
            '杜甫': {
                name: '子美沉郁', 
                ...getRandomTheme()
            },
            '苏轼': {
                name: '东坡豪情',
                ...getRandomTheme()
            },
            '李清照': {
                name: '易安婉约',
                ...getRandomTheme()
            },
            '王维': {
                name: '摩诘禅意',
                ...getRandomTheme()
            },
            '白居易': {
                name: '乐天淡泊',
                ...getRandomTheme()
            }
        };

        // 选择主题，默认也使用随机主题
        const theme = themes[author] || {
            name: '诗韵雅致',
            ...getRandomTheme()
        };

        return {
            containerStyle: `
                position: relative;
                width: 200px; 
                height: 280px; 
                background: ${theme.background};
                border-radius: 12px;
                padding: 30px; 
                box-sizing: border-box;
                box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                overflow: hidden;
            `,
            
            borderStyle: `
                position: absolute;
                top: 15px;
                left: 15px;
                right: 15px;
                bottom: 15px;
                border: 1px solid ${theme.borderColor};
                border-radius: 6px;
                opacity: 0.5;
                pointer-events: none;
            `,
            
            sealStyle: `
                position: absolute;
                top: 20px;
                right: 20px;
                width: 24px;
                height: 24px;
                background: ${theme.sealColor};
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                font-family: '华文行楷', serif;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            `,
            
            contentStyle: `
                position: relative;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                z-index: 2;
            `,
            
            authorStyle: `
                font-size: 26px;
                font-weight: 500;
                color: ${theme.primaryColor};
                margin-bottom: 20px;
                font-family: '华文行楷', '楷体', serif;
                letter-spacing: 3px;
            `,
            
            titleStyle: `
                font-size: 14px;
                color: ${theme.accentColor};
                line-height: 1.7;
                font-family: '华文行楷', '楷体', serif;
                font-weight: 400;
                letter-spacing: 2px;
                max-width: 130px;
                opacity: 0.9;
            `,
            
            footerStyle: `
                position: absolute;
                bottom: 18px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 10px;
                color: ${theme.accentColor};
                opacity: 0.7;
                font-family: '华文行楷', serif;
                letter-spacing: 3px;
            `
        };
    }

    /**
     * 获取选中的封面类型
     */
    getSelectedCoverType() {
        const selected = document.querySelector('input[name="coverType"]:checked');
        return selected ? selected.value : 'random';
    }

    /**
     * 将CSS封面转换为图片
     */
    async convertCSSCoverToImage() {
        const coverContainer = document.querySelector('.cover-preview-container');
        if (!coverContainer) {
            throw new Error('封面容器未找到');
        }

        // 动态引入html2canvas
        if (!window.html2canvas) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        try {
            const canvas = await html2canvas(coverContainer, {
                backgroundColor: null,
                scale: 2, // 提高清晰度
                useCORS: true,
                allowTaint: true
            });
            
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('转换封面为图片失败:', error);
            throw error;
        }
    }

    selectTitle(title, element) {
        this.selectedTitle = title;
        
        // 更新UI显示选中状态
        document.querySelectorAll('.title-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // 如果传入了具体的元素，直接选中它
        if (element) {
            element.classList.add('selected');
        } else {
            // 否则通过文本内容查找
            document.querySelectorAll('.title-option').forEach(option => {
                if (option.textContent.trim() === title.trim()) {
                    option.classList.add('selected');
                }
            });
        }
        
        this.showToast('success', '标题已选择: ' + title);
    }

    bindTitleSelectionEvents() {
        // 使用事件委托来处理标题选择
        const outputElement = document.getElementById('output');
        if (outputElement) {
            // 移除之前的事件监听器（如果存在）
            outputElement.removeEventListener('click', this.titleSelectionHandler);
            
            // 创建新的事件处理器
            this.titleSelectionHandler = (event) => {
                if (event.target.classList.contains('title-option')) {
                    const title = event.target.getAttribute('data-title') || event.target.textContent.trim();
                    this.selectTitle(title, event.target);
                }
            };
            
            // 添加事件监听器
            outputElement.addEventListener('click', this.titleSelectionHandler);
        }
    }

    async regenerateTitles() {
        try {
            // 禁用按钮，防止重复点击
            const regenerateBtn = document.querySelector('.regenerate-btn');
            if (regenerateBtn) {
                regenerateBtn.disabled = true;
                regenerateBtn.textContent = '🔄 生成中...';
            }

            // 获取当前的输入参数
            const author = document.getElementById('author').value;
            const title = document.getElementById('title').value;
            const style = document.getElementById('style').value;

            if (!author || !title) {
                this.showToast('error', '请先填写作者和标题信息');
                return;
            }

            // 调用标题生成API
            const response = await fetch('/api/titles/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    author: author,
                    title: title,
                    style: style,
                    count: 3  // 生成3个标题
                })
            });

            const result = await response.json();

            if (result.success && result.titles) {
                // 更新标题显示
                this.updateTitlesDisplay(result.titles);
                // 自动选择第一个标题
                this.selectTitle(result.titles[0], null);
                this.showToast('success', '标题重新生成成功！');
            } else {
                throw new Error(result.error || '标题生成失败');
            }

        } catch (error) {
            console.error('重新生成标题失败:', error);
            this.showToast('error', '重新生成标题失败: ' + error.message);
        } finally {
            // 恢复按钮状态
            const regenerateBtn = document.querySelector('.regenerate-btn');
            if (regenerateBtn) {
                regenerateBtn.disabled = false;
                regenerateBtn.textContent = '🔄 重新生成';
            }
        }
    }

    updateTitlesDisplay(titles) {
        // 找到标题容器
        const titlesContainer = document.querySelector('.generated-titles');
        if (!titlesContainer) return;

        // 重新生成标题选项的HTML
        let titlesHTML = `<div class="titles-header">
            <h4>🎯 生成的爆款标题：</h4>
            <button class="btn btn-sm btn-outline regenerate-btn" onclick="app.regenerateTitles()" title="重新生成标题">
                🔄 重新生成
            </button>
        </div>`;

        titles.forEach((title, index) => {
            const isSelected = index === 0;
            titlesHTML += `
                <div class="title-option ${isSelected ? 'selected' : ''}" data-title="${title.replace(/"/g, '&quot;')}">
                    ${title}
                </div>
            `;
        });

        titlesContainer.innerHTML = titlesHTML;
    }

    renderMarkdown(content) {
        // 简单的markdown渲染
        return content
            // 先移除占位符图片（如封面图片的占位符）
            .replace(/!\[封面图片\]\([^)]+\)/g, '')
            .replace(/!\[.*?\]\(https:\/\/images\.unsplash\.com[^)]*\)/g, '')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // 渲染真实图片（排除已移除的占位符图片）
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 1rem 0;">')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/gm, '<p>$1</p>')
            .replace(/<p><h([1-6])>/g, '<h$1>')
            .replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    }

    addArticleMetadata(articleData) {
        const metaElement = document.createElement('div');
        metaElement.className = 'article-metadata';
        metaElement.innerHTML = `
            <small style="color: var(--text-muted); margin-top: 1rem; display: block;">
                📊 来源: ${articleData.source || 'AI'} | 
                ⏰ 生成时间: ${new Date().toLocaleString()} |
                📝 字数: ${articleData.content.length}
            </small>
        `;
        
        document.getElementById('output').appendChild(metaElement);
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('output').style.display = 'none';
        document.getElementById('outputPlaceholder').style.display = 'none';
        document.getElementById('generateBtn').disabled = true;
        document.getElementById('generateBtn').textContent = '生成中...';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('generateBtn').textContent = '✨ 生成文章';
    }

    // ==================== 复制功能 ====================
    async copyToClipboard() {
        if (!this.currentArticle) return;
        
        try {
            await navigator.clipboard.writeText(this.currentArticle.content);
            this.showToast('success', '内容已复制到剪贴板');
        } catch (error) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = this.currentArticle.content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('success', '内容已复制到剪贴板');
        }
    }

    // ==================== 微信功能 ====================
    async testWechatConnection() {
        const appId = document.getElementById('wechatAppId').value.trim();
        const appSecret = document.getElementById('wechatAppSecret').value.trim();
        
        if (!appId || !appSecret) {
            this.showToast('error', '请输入AppID和AppSecret');
            return;
        }
        
        try {
            const response = await fetch('/api/wechat/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId, appSecret })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateWechatStatus(true);
                this.showToast('success', '微信连接测试成功');
                
                // 保存配置
                this.config.wechat = { appId, appSecret };
                await this.saveConfig();
            } else {
                this.updateWechatStatus(false);
                this.showToast('error', '微信连接失败: ' + data.error);
            }
        } catch (error) {
            this.updateWechatStatus(false);
            this.showToast('error', '连接测试失败: ' + error.message);
        }
    }

    updateWechatStatus(connected) {
        const statusElement = document.getElementById('wechatStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span:last-child');
        
        if (connected) {
            dot.className = 'status-dot connected';
            text.textContent = '已连接';
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = '未连接';
        }
    }

    async uploadToWechat() {
        if (!this.currentArticle) {
            this.showToast('error', `请先生成${this.currentMode === 'poetry' ? '文章' : '爆款文'}`);
            return;
        }
        
        console.log('开始上传到微信...', this.currentArticle);
        
        try {
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.disabled = true;
            uploadBtn.textContent = '🚀 上传中...';
            
            // 先保存文章到存储系统（如果还没有ID的话）
            let articleToUpload = this.currentArticle;
            if (!articleToUpload.id) {
                articleToUpload = await this.saveArticleBeforeUpload();
            }
            
            // 获取选中的封面类型
            const coverType = this.getSelectedCoverType();
            let coverData = null;
            
            // 根据封面类型处理封面数据
            if (coverType === 'generated') {
                try {
                    const generatedImage = await this.convertCSSCoverToImage();
                    coverData = {
                        type: 'generated',
                        imageData: generatedImage
                    };
                    console.log('✅ CSS封面转换成功');
                } catch (error) {
                    console.error('❌ CSS封面转换失败:', error);
                    this.showToast('warning', 'CSS封面转换失败，将使用默认封面');
                    coverData = { type: 'default' };
                }
            } else {
                coverData = { type: coverType };
            }

            // 构建上传数据
            const uploadData = {
                articleId: articleToUpload.id,
                selectedTitle: this.selectedTitle || null,
                article: articleToUpload, // 传递完整的文章数据
                coverData: coverData // 添加封面数据
            };
            
            console.log('上传数据:', uploadData);
            
            const response = await fetch('/api/wechat/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                const contentType = this.currentMode === 'poetry' ? '文章' : '爆款文';
                this.showToast('success', `${contentType}已上传到微信草稿箱！\n标题: ${data.data.title}`);
                
                // 显示上传详情
                this.showUploadSuccess(data.data);
            } else {
                this.showToast('error', '上传失败: ' + data.error);
            }
        } catch (error) {
            this.showToast('error', '上传失败: ' + error.message);
        } finally {
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.disabled = false;
            uploadBtn.textContent = '🚀 上传微信';
        }
    }

    async saveArticleBeforeUpload() {
        try {
            let saveData;
            let saveEndpoint;
            
            if (this.currentMode === 'baokuan') {
                // 保存爆款文
                saveData = {
                    ...this.currentArticle,
                    metadata: {
                        title: this.currentArticle.topic || '爆款文',
                        author: '爆款文生成器',
                        style: 'baokuan',
                        keywords: this.currentArticle.keywords ? this.currentArticle.keywords.join(',') : '',
                        createdAt: new Date().toISOString(),
                        type: 'baokuan'
                    }
                };
                saveEndpoint = '/api/baokuan/save';
            } else {
                // 保存诗词文章（使用原有逻辑）
                return this.currentArticle;
            }
            
            const response = await fetch(saveEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentArticle.id = data.id;
                return { ...this.currentArticle, id: data.id };
            } else {
                throw new Error(data.error || '保存失败');
            }
        } catch (error) {
            console.error('保存文章失败:', error);
            // 如果保存失败，仍然尝试上传，但没有ID
            return this.currentArticle;
        }
    }

    showUploadSuccess(uploadData) {
        const successMessage = `
            <div class="upload-success">
                <h4>✅ 上传成功！</h4>
                <p><strong>标题:</strong> ${uploadData.title}</p>
                <p><strong>草稿ID:</strong> ${uploadData.media_id}</p>
                <p><strong>封面:</strong> ${uploadData.hasCustomCover ? '✅ 已上传自定义封面' : '⚠️ 使用默认封面'}</p>
                <p><strong>排版:</strong> ✅ 已优化微信排版</p>
                <small>请到微信公众平台查看草稿并发布</small>
            </div>
        `;
        
        // 临时显示成功信息
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = successMessage;
        tempDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); z-index: 1000; max-width: 400px;';
        document.body.appendChild(tempDiv);
        
        setTimeout(() => {
            document.body.removeChild(tempDiv);
        }, 5000);
    }

    // ==================== 历史记录 ====================
    async loadArticles(page = 1) {
        try {
            const response = await fetch(`/api/articles/history?page=${page}&limit=10`);
            const data = await response.json();
            
            if (data.success) {
                this.articles = data.data.articles;
                this.displayArticles(data.data);
            }
        } catch (error) {
            console.error('加载文章失败:', error);
            this.showToast('error', '加载历史记录失败');
        }
    }

    async loadRecentArticles() {
        try {
            const response = await fetch('/api/articles/history?limit=5');
            const data = await response.json();
            
            if (data.success) {
                this.articles = data.data.articles;
            }
        } catch (error) {
            console.error('加载最近文章失败:', error);
        }
    }

    displayArticles(articlesData) {
        const listElement = document.getElementById('articleList');
        const { articles, pagination } = articlesData;
        
        if (articles.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <div class="placeholder-icon">📝</div>
                    <p>还没有生成过文章，去创作第一篇吧！</p>
                    <button class="btn btn-primary" onclick="app.switchView('generate')">开始创作</button>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = articles.map(article => `
            <div class="article-item">
                <div class="article-meta">
                    <h4 class="article-title">${this.getDisplayTitle(article)}</h4>
                    <div class="article-info">
                        ${new Date(article.createdAt).toLocaleDateString()} | 
                        ${article.metadata.style} | 
                        ${article.content.length}字
                    </div>
                </div>
                <div class="article-actions">
                    <button class="btn btn-sm btn-outline" onclick="app.viewArticle('${article.id}')">
                        👁️ 查看
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.copyArticle('${article.id}')">
                        📋 复制
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="app.uploadArticle('${article.id}')">
                        🚀 上传
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.deleteArticle('${article.id}')">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        this.displayPagination(pagination);
    }

    getDisplayTitle(article) {
        // 优先显示AI生成的爆款标题
        if (article.titles && article.titles.length > 0) {
            // 诗词赏析：显示第一个生成的爆款标题
            return article.titles[0];
        } else if (article.topic) {
            // 爆款文：显示提炼的选题
            return article.topic;
        } else if (article.metadata?.type === 'baokuan') {
            // 爆款文但没有topic的情况
            return '爆款文：' + (article.metadata.title || '未知标题');
        } else {
            // 默认情况：显示传统格式
            return `${article.metadata?.author || '未知作者'} - ${article.metadata?.title || '未知标题'}`;
        }
    }

    displayPagination(pagination) {
        const paginationElement = document.getElementById('pagination');
        const { current, total } = pagination;
        
        if (total <= 1) {
            paginationElement.innerHTML = '';
            return;
        }
        
        let html = '';
        
        if (current > 1) {
            html += `<button class="btn btn-outline" onclick="app.loadArticles(${current - 1})">上一页</button>`;
        }
        
        for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
            if (i === current) {
                html += `<button class="btn btn-primary">${i}</button>`;
            } else {
                html += `<button class="btn btn-outline" onclick="app.loadArticles(${i})">${i}</button>`;
            }
        }
        
        if (current < total) {
            html += `<button class="btn btn-outline" onclick="app.loadArticles(${current + 1})">下一页</button>`;
        }
        
        paginationElement.innerHTML = html;
    }

    async viewArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`);
            const data = await response.json();
            
            if (data.success) {
                // 显示文章详情模态框
                this.showArticleModal(data.data);
            } else {
                this.showToast('error', '获取文章失败: ' + data.error);
            }
        } catch (error) {
            this.showToast('error', '获取文章失败: ' + error.message);
        }
    }

    async copyArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`);
            const data = await response.json();
            
            if (data.success && data.data.content) {
                await navigator.clipboard.writeText(data.data.content);
                this.showToast('success', '文章内容已复制到剪贴板');
            } else {
                this.showToast('error', '获取文章内容失败');
            }
        } catch (error) {
            this.showToast('error', '复制失败: ' + error.message);
        }
    }

    async uploadArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`);
            const data = await response.json();
            
            if (!data.success) {
                this.showToast('error', '获取文章失败: ' + data.error);
                return;
            }
            
            const article = data.data;
            
            // 构建上传数据
            const uploadData = {
                articleId: id,
                selectedTitle: article.titles && article.titles.length > 0 ? article.titles[0] : null,
                article: article
            };
            
            console.log('历史文章上传数据:', uploadData);
            
            const uploadResponse = await fetch('/api/wechat/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
                this.showToast('success', `文章已上传到微信草稿箱！\n标题: ${uploadResult.data.title}`);
                this.showUploadSuccess(uploadResult.data);
            } else {
                this.showToast('error', '上传失败: ' + uploadResult.error);
            }
        } catch (error) {
            this.showToast('error', '上传失败: ' + error.message);
        }
    }

    showArticleModal(article) {
        // 创建文章查看模态框
        const modalHtml = `
            <div id="articleModal" class="modal active">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>${article.metadata?.author || '未知'} - ${article.metadata?.title || '未知标题'}</h3>
                        <button class="modal-close" onclick="closeArticleModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="article-info-bar">
                            <span>📅 ${new Date(article.createdAt).toLocaleString()}</span>
                            <span>🎨 ${article.metadata?.style || '未知风格'}</span>
                            <span>📝 ${article.content?.length || 0}字</span>
                        </div>
                        <div class="article-content-preview">
                            ${this.renderMarkdown(article.content || '无内容')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="copyArticleContent('${article.id}')">📋 复制</button>
                        <button class="btn btn-primary" onclick="uploadArticleFromModal('${article.id}')">🚀 上传微信</button>
                        <button class="btn btn-outline" onclick="closeArticleModal()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('articleModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async deleteArticle(id) {
        if (!confirm('确定要删除这篇文章吗？')) return;
        
        try {
            const response = await fetch(`/api/articles/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('success', '文章删除成功');
                await this.loadArticles();
            } else {
                this.showToast('error', '删除失败: ' + data.error);
            }
        } catch (error) {
            this.showToast('error', '删除失败: ' + error.message);
        }
    }

    // ==================== 统计功能 ====================
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.success) {
                this.displayStats(data.data);
            }
        } catch (error) {
            console.error('加载统计失败:', error);
        }
    }

    displayStats(stats) {
        const statsElement = document.getElementById('statsContent');
        
        statsElement.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.currentArticles || 0}</div>
                <div class="stat-label">总文章数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.recentArticles || 0}</div>
                <div class="stat-label">本周新增</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalGenerations || 0}</div>
                <div class="stat-label">总生成次数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalWechatUploads || 0}</div>
                <div class="stat-label">微信上传次数</div>
            </div>
        `;
    }

    // ==================== 快速操作 ====================
    async testAIService() {
        try {
            const response = await fetch('/api/ai/test');
            const data = await response.json();
            
            if (data.success) {
                this.showToast('success', 'AI服务连接正常');
            } else {
                this.showToast('error', 'AI服务连接失败: ' + data.message);
            }
        } catch (error) {
            this.showToast('error', '测试失败: ' + error.message);
        }
    }

    async testWechatService() {
        if (!this.config.wechat?.appId || !this.config.wechat?.appSecret) {
            this.showToast('error', '请先配置微信公众号信息');
            return;
        }
        
        await this.testWechatConnection();
    }

    async exportData() {
        try {
            const response = await fetch('/api/articles/history?limit=1000');
            const data = await response.json();
            
            if (data.success) {
                const exportData = {
                    articles: data.data.articles,
                    exportedAt: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `poetry-articles-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.showToast('success', '数据导出成功');
            }
        } catch (error) {
            this.showToast('error', '数据导出失败: ' + error.message);
        }
    }

    // ==================== 设置功能 ====================
    showSettings() {
        document.getElementById('settingsModal').classList.add('active');
        // 确保提示词内容已更新
        this.updatePromptTextareas();
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    switchSettingsTab(tabName) {
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tabName + 'Settings').classList.add('active');
        document.querySelector(`[onclick="switchSettingsTab('${tabName}')"]`).classList.add('active');
    }

    // ==================== 自动保存 ====================
    autoSave() {
        const author = document.getElementById('author').value.trim();
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        
        if (author || title || content) {
            const draftData = { author, title, content };
            localStorage.setItem('poem-draft', JSON.stringify(draftData));
        }
    }

    loadDraft() {
        const draftData = localStorage.getItem('poem-draft');
        if (draftData) {
            const draft = JSON.parse(draftData);
            document.getElementById('author').value = draft.author || '';
            document.getElementById('title').value = draft.title || '';
            document.getElementById('content').value = draft.content || '';
        }
    }

    // ==================== 提示系统 ====================
    showToast(type, message) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageElement = toast.querySelector('.toast-message');
        
        // 设置图标
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        icon.textContent = icons[type] || icons.info;
        messageElement.textContent = message;
        
        // 设置样式
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ==================== 搜索功能 ====================
    async searchArticles() {
        const query = document.getElementById('searchInput').value.trim();
        
        if (!query) {
            await this.loadArticles();
            return;
        }
        
        try {
            const response = await fetch(`/api/articles/history?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayArticles(data.data);
            }
        } catch (error) {
            this.showToast('error', '搜索失败: ' + error.message);
        }
    }
}

// 全局变量和函数
let app;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new PoemApp();
    
    // 加载草稿
    app.loadDraft();
    
    console.log('🌸 最美诗词应用已启动');
});

// 全局函数，供HTML调用
function switchView(viewName) {
    app.switchView(viewName);
}

function generateArticle() {
    app.generateArticle();
}

function generateBaokuan() {
    app.generateBaokuan();
}

function switchMode(modeName) {
    app.switchMode(modeName);
}

function copyToClipboard() {
    app.copyToClipboard();
}

function uploadToWechat() {
    app.uploadToWechat();
}

function testWechatConnection() {
    app.testWechatConnection();
}

function showSettings() {
    app.showSettings();
}

function hideSettings() {
    app.hideSettings();
}

function switchSettingsTab(tabName) {
    app.switchSettingsTab(tabName);
}

function testAIService() {
    app.testAIService();
}

function testWechatService() {
    app.testWechatService();
}

function exportData() {
    app.exportData();
}

function searchArticles() {
    app.searchArticles();
}

function saveSettings() {
    // 保存设置逻辑
    app.hideSettings();
    app.showToast('success', '设置保存成功');
}

function refreshServerIp() {
    app.refreshServerIp();
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.remove();
    }
}

function copyArticleContent(id) {
    app.copyArticle(id);
}

function uploadArticleFromModal(id) {
    app.uploadArticle(id);
    closeArticleModal();
}

// 提示词管理相关函数
function switchPromptTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.prompt-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchPromptTab('${tabName}')"]`).classList.add('active');
    
    // 切换内容
    document.querySelectorAll('.prompt-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Prompt').classList.add('active');
}

function savePoetryPrompt() {
    const structuredPromptText = document.getElementById('poetryStructuredTemplate').value.trim();
    const titlePromptText = document.getElementById('poetryTitleTemplate').value.trim();
    
    if (!structuredPromptText || !titlePromptText) {
        app.showToast('error', '所有提示词都不能为空');
        return;
    }
    
    app.prompts.poetry_structured = structuredPromptText;
    app.prompts.poetry_title = titlePromptText;
    app.savePrompts();
    app.showToast('success', '诗词赏析提示词已保存');
}

async function resetPoetryPrompt() {
    if (confirm('确定要恢复默认的诗词赏析提示词吗？')) {
        const defaultPrompts = app.getDefaultPrompts();
        
        // 更新本地数据
        app.prompts.poetry_structured = defaultPrompts.poetry_structured;
        app.prompts.poetry_title = defaultPrompts.poetry_title;
        
        // 更新UI
        document.getElementById('poetryStructuredTemplate').value = defaultPrompts.poetry_structured;
        document.getElementById('poetryTitleTemplate').value = defaultPrompts.poetry_title;
        
        // 保存到服务器
        try {
            await app.savePromptsToServer(app.prompts);
            app.showToast('success', '诗词赏析提示词已重置为默认');
        } catch (error) {
            app.showToast('error', '重置失败: ' + error.message);
        }
    }
}

function saveBaokuanPrompts() {
    const extractTitleText = document.getElementById('baokuanExtractTitleTemplate').value.trim();
    const extractTopicText = document.getElementById('baokuanExtractTopicTemplate').value.trim();
    const extractText = document.getElementById('baokuanExtractTemplate').value.trim();
    const generateText = document.getElementById('baokuanGenerateTemplate').value.trim();
    const formatText = document.getElementById('baokuanFormatTemplate').value.trim();
    
    if (!extractTitleText || !extractTopicText || !extractText || !generateText || !formatText) {
        app.showToast('error', '所有提示词不能为空');
        return;
    }
    
    app.prompts.baokuan.extractTitle = extractTitleText;
    app.prompts.baokuan.extractTopic = extractTopicText;
    app.prompts.baokuan.extract = extractText;
    app.prompts.baokuan.generate = generateText;
    app.prompts.baokuan.format = formatText;
    app.savePrompts();
    app.showToast('success', '爆款文提示词已保存');
}

async function resetBaokuanPrompts() {
    if (confirm('确定要恢复默认的爆款文提示词吗？')) {
        const defaultPrompts = app.getDefaultPrompts();
        
        // 更新本地数据
        app.prompts.baokuan = { ...defaultPrompts.baokuan };
        
        // 更新UI
        document.getElementById('baokuanExtractTitleTemplate').value = defaultPrompts.baokuan.extractTitle;
        document.getElementById('baokuanExtractTopicTemplate').value = defaultPrompts.baokuan.extractTopic;
        document.getElementById('baokuanExtractTemplate').value = defaultPrompts.baokuan.extract;
        document.getElementById('baokuanGenerateTemplate').value = defaultPrompts.baokuan.generate;
        document.getElementById('baokuanFormatTemplate').value = defaultPrompts.baokuan.format;
        
        // 保存到服务器
        try {
            await app.savePromptsToServer(app.prompts);
            app.showToast('success', '爆款文提示词已重置为默认');
        } catch (error) {
            app.showToast('error', '重置失败: ' + error.message);
        }
    }
}

// 图片上传和OCR相关函数
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        app.showToast('error', '请上传图片文件');
        return;
    }
    
    // 检查文件大小 (最大10MB)
    if (file.size > 10 * 1024 * 1024) {
        app.showToast('error', '图片文件不能超过10MB');
        return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';
        
        // 存储文件供后续OCR使用
        app.uploadedImageFile = file;
        app.showToast('success', '图片上传成功，点击"提取文字"进行识别');
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    document.getElementById('baokuanImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    app.uploadedImageFile = null;
    app.showToast('info', '已清除图片');
}

// 文件转base64辅助函数
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function extractTextFromImage() {
    if (!app.uploadedImageFile) {
        app.showToast('error', '请先上传图片');
        return;
    }
    
    const extractBtn = document.getElementById('extractBtn');
    const originalText = extractBtn.textContent;
    
    try {
        extractBtn.classList.add('extracting');
        extractBtn.disabled = true;
        extractBtn.textContent = '🔍 识别中...';
        
        // 将文件转换为base64
        const base64Image = await fileToBase64(app.uploadedImageFile);
        
        const response = await fetch('/api/ocr/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 将提取的文字填入文本框
            const contentTextarea = document.getElementById('baokuanContent');
            contentTextarea.value = data.text;
            
            app.showToast('success', `成功识别 ${data.text.length} 个字符`);
            
            // 自动滚动到文本框
            contentTextarea.scrollIntoView({ behavior: 'smooth' });
            contentTextarea.focus();
        } else {
            app.showToast('error', '文字识别失败: ' + data.error);
        }
    } catch (error) {
        app.showToast('error', '文字识别失败: ' + error.message);
    } finally {
        extractBtn.classList.remove('extracting');
        extractBtn.disabled = false;
        extractBtn.textContent = originalText;
    }
}

// ==================== 小绿书功能 ====================

// 显示小绿书生成弹窗
function generateXiaoLvShu() {
    // 获取当前生成的内容
    const outputElement = document.getElementById('output');
    if (!outputElement || !outputElement.textContent.trim()) {
        app.showToast('error', '请先生成文章内容');
        return;
    }
    
    // 自动填充标题和作者信息
    const titleInput = document.getElementById('xiaoLvShuTitle');
    const authorInput = document.getElementById('xiaoLvShuAuthor');
    
    // 尝试从当前文章获取标题
    if (app.currentArticle && app.currentArticle.titles && app.currentArticle.titles.length > 0) {
        titleInput.value = app.currentArticle.titles[0];
    } else if (document.getElementById('title')) {
        titleInput.value = document.getElementById('title').value;
    }
    
    // 尝试获取作者
    if (document.getElementById('author')) {
        authorInput.value = document.getElementById('author').value;
    }
    
    // 显示模态框
    document.getElementById('xiaoLvShuModal').classList.add('active');
}

// 隐藏小绿书模态框
function hideXiaoLvShuModal() {
    document.getElementById('xiaoLvShuModal').classList.remove('active');
    
    // 重置状态
    document.getElementById('xiaoLvShuLoading').style.display = 'none';
    document.getElementById('xiaoLvShuResult').style.display = 'none';
    document.getElementById('xiaoLvShuImages').innerHTML = '';
}

// 开始生成小绿书
async function startGenerateXiaoLvShu() {
    const outputElement = document.getElementById('output');
    const content = outputElement.textContent.trim();
    
    if (!content) {
        app.showToast('error', '没有可用的文章内容');
        return;
    }
    
    const template = document.getElementById('xiaoLvShuTemplate').value;
    const title = document.getElementById('xiaoLvShuTitle').value || '诗词赏析';
    const author = document.getElementById('xiaoLvShuAuthor').value || '';
    
    // 显示加载状态
    document.getElementById('xiaoLvShuLoading').style.display = 'block';
    document.getElementById('xiaoLvShuResult').style.display = 'none';
    
    try {
        console.log('📸 开始生成小绿书图片...');
        
        const response = await fetch('/api/xiaolvshu/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                title: title,
                author: author,
                template: template
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayXiaoLvShuResult(data);
            app.showToast('success', `小绿书生成成功！共 ${data.totalPages} 张图片`);
        } else {
            app.showToast('error', '生成失败: ' + data.error);
        }
        
    } catch (error) {
        console.error('小绿书生成失败:', error);
        app.showToast('error', '生成失败: ' + error.message);
    } finally {
        document.getElementById('xiaoLvShuLoading').style.display = 'none';
    }
}

// 显示小绿书生成结果
function displayXiaoLvShuResult(data) {
    const resultDiv = document.getElementById('xiaoLvShuResult');
    const imagesDiv = document.getElementById('xiaoLvShuImages');
    const countSpan = document.getElementById('xiaoLvShuCount');
    
    // 更新计数
    countSpan.textContent = `共 ${data.totalPages} 张图片 (${data.template})`;
    
    // 清空之前的图片
    imagesDiv.innerHTML = '';
    
    // 显示每张图片
    data.images.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'xiaolvshu-image-item';
        
        imageItem.innerHTML = `
            <div class="xiaolvshu-page-number">${image.pageNumber}</div>
            <img src="${image.dataUrl}" alt="第${image.pageNumber}页" />
            <div class="xiaolvshu-image-overlay">
                <div class="xiaolvshu-image-actions">
                    <button class="btn btn-sm btn-outline" onclick="downloadXiaoLvShuImage(${index})">
                        💾 下载
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="previewXiaoLvShuImage(${index})">
                        👁️ 预览
                    </button>
                </div>
            </div>
        `;
        
        imagesDiv.appendChild(imageItem);
    });
    
    // 存储图片数据供后续使用
    app.currentXiaoLvShuImages = data.images;
    
    // 显示结果
    resultDiv.style.display = 'block';
}

// 下载单张小绿书图片
function downloadXiaoLvShuImage(index) {
    if (!app.currentXiaoLvShuImages || !app.currentXiaoLvShuImages[index]) {
        app.showToast('error', '图片数据不存在');
        return;
    }
    
    const image = app.currentXiaoLvShuImages[index];
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = `小绿书_第${image.pageNumber}页.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    app.showToast('success', `第${image.pageNumber}页下载完成`);
}

// 预览小绿书图片
function previewXiaoLvShuImage(index) {
    if (!app.currentXiaoLvShuImages || !app.currentXiaoLvShuImages[index]) {
        app.showToast('error', '图片数据不存在');
        return;
    }
    
    const image = app.currentXiaoLvShuImages[index];
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
            <head>
                <title>小绿书预览 - 第${image.pageNumber}页</title>
                <style>
                    body { margin: 0; padding: 20px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    img { max-width: 100%; max-height: 100%; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px; }
                </style>
            </head>
            <body>
                <img src="${image.dataUrl}" alt="第${image.pageNumber}页" />
            </body>
        </html>
    `);
}

// 下载全部小绿书图片
function downloadAllXiaoLvShu() {
    if (!app.currentXiaoLvShuImages || app.currentXiaoLvShuImages.length === 0) {
        app.showToast('error', '没有可下载的图片');
        return;
    }
    
    app.currentXiaoLvShuImages.forEach((image, index) => {
        setTimeout(() => {
            downloadXiaoLvShuImage(index);
        }, index * 500); // 延迟下载避免浏览器限制
    });
}

// 上传小绿书到微信（图片&文字模式）
async function uploadXiaoLvShuToWechat(event) {
    console.log('🚀 uploadXiaoLvShuToWechat函数被调用');
    
    if (!app.currentXiaoLvShuImages || app.currentXiaoLvShuImages.length === 0) {
        app.showToast('error', '没有可上传的图片');
        return;
    }
    
    // 检查图片是否都有dataUrl
    const validImages = app.currentXiaoLvShuImages.filter(img => img.dataUrl);
    if (validImages.length === 0) {
        app.showToast('error', '图片数据不完整，请重新生成');
        return;
    }
    
    if (validImages.length < app.currentXiaoLvShuImages.length) {
        const confirmed = confirm(`有 ${app.currentXiaoLvShuImages.length - validImages.length} 张图片数据不完整，是否只上传 ${validImages.length} 张有效图片？`);
        if (!confirmed) return;
    }
    
    // 获取触发事件的按钮
    const uploadBtn = event ? event.target : document.querySelector('button[onclick*="uploadXiaoLvShuToWechat"]');
    if (!uploadBtn) {
        app.showToast('error', '找不到上传按钮');
        return;
    }
    
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传中...';
    
    try {
        app.showToast('info', '开始上传小绿书到微信草稿...');
        
        // 获取标题（从页面或默认）
        const titleElement = document.getElementById('xiaolvshuTitle');
        const title = titleElement ? titleElement.value.trim() : '图文分享';
        
        const response = await fetch('/api/xiaolvshu/upload-wechat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                images: validImages,
                title: title || '图文分享'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            app.showToast('success', result.message || '小绿书已上传到微信草稿箱');
            console.log('✅ 小绿书上传成功:', result.data);
        } else {
            throw new Error(result.message || result.error || '上传失败');
        }
        
    } catch (error) {
        console.error('小绿书上传失败:', error);
        app.showToast('error', '上传失败: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
}

/**
 * 显示进度容器（避免图片插入页面导致布局拉伸）
 */
function displayProgressContainer(totalPages) {
    const outputElement = document.getElementById('output');
    const outputPlaceholder = document.getElementById('outputPlaceholder');
    const outputActions = document.getElementById('outputActions');
    
    // 显示输出区域
    outputElement.style.display = 'block';
    outputPlaceholder.style.display = 'none';
    outputActions.style.display = 'none';
    
    // 创建进度容器（固定高度，避免布局跳动）
    outputElement.innerHTML = `
        <div class="xiaolvshu-progress-container" style="min-height: 400px;">
            <div class="xiaolvshu-result-info">
                <h4>📸 小绿书生成进度</h4>
                <div class="progress-bar-container" style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; margin: 10px 0;">
                    <div id="progressBar" class="progress-bar" style="width: 0%; height: 100%; background: #4CAF50; border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
                <p id="progressText">准备生成 ${totalPages} 张图片...</p>
            </div>
            
            <div id="progressImagesList" class="xiaolvshu-progress-list" style="max-height: 300px; overflow-y: auto;">
                <!-- 生成进度列表 -->
            </div>
        </div>
    `;
}

/**
 * 更新进度显示
 */
function updateProgressDisplay(generatedImages, totalPages, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const imagesList = document.getElementById('progressImagesList');
    
    if (progressBar) {
        const progress = (generatedImages.length / totalPages) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${message} (${generatedImages.length}/${totalPages})`;
    }
    
    if (imagesList) {
        // 只显示完成的图片列表，不显示实际图片（避免布局问题）
        let listHtml = '';
        
        // 创建已完成的页码映射
        const completedPages = new Set(generatedImages.map(img => img.pageNumber));
        
        for (let i = 1; i <= totalPages; i++) {
            if (completedPages.has(i)) {
                listHtml += `
                    <div class="progress-item" style="padding: 8px; margin: 4px 0; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #4CAF50;">
                        <span style="font-weight: bold;">第 ${i} 页</span>
                        <span style="margin-left: 10px; color: #666; font-size: 14px;">✅ 生成完成</span>
                    </div>
                `;
            } else {
                listHtml += `
                    <div class="progress-item" style="padding: 8px; margin: 4px 0; background: #f0f0f0; border-radius: 4px; border-left: 4px solid #ddd;">
                        <span style="font-weight: bold;">第 ${i} 页</span>
                        <span style="margin-left: 10px; color: #999; font-size: 14px;">⏳ 等待生成...</span>
                    </div>
                `;
            }
        }
        
        imagesList.innerHTML = listHtml;
        
        // 在进度更新时存储生成的图片数据
        if (generatedImages.length > 0 && app) {
            app.currentXiaoLvShuImages = generatedImages;
        }
    }
}

// 独立的小绿书生成函数（直接从表单输入）
async function generateXiaoLvShuDirect() {
    const title = document.getElementById('xiaolvshuTitle').value.trim() || '内容图片';
    const author = document.getElementById('xiaolvshuAuthor').value.trim() || '';
    const content = document.getElementById('xiaolvshuContent').value.trim();
    const template = document.getElementById('xiaolvshuTemplate').value;
    const useAIGeneration = document.getElementById('useAIGeneration').checked;
    
    if (!content) {
        app.showToast('error', '请输入要转换的文本内容');
        return;
    }
    
    const generateBtn = document.getElementById('generateXiaoLvShuBtn');
    const originalText = generateBtn.textContent;
    
    try {
        // 显示加载状态
        generateBtn.disabled = true;
        generateBtn.textContent = useAIGeneration ? '🤖 AI生成中...' : '📸 生成中...';
        
        console.log('📸 开始生成小绿书图片...', useAIGeneration ? '(AI完全生成模式)' : '(SVG模板模式)');
        
        // 改用fetch实现手动流式接收（解决GET长度限制）
        const response = await fetch('/api/xiaolvshu/generate-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                title: title,
                author: author,
                template: template,
                useAIGeneration: useAIGeneration
            })
        });

        if (!response.body) {
            throw new Error('流式响应不支持');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const generatedImages = [];
        let totalPages = 0;
        let isFirstUpdate = true;
        let buffer = '';
        
        // 隐藏loading，显示进度模式
        document.getElementById('loading').style.display = 'none';

        // 手动实现流式读取
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const progressData = JSON.parse(line.substring(6));
                            console.log('📡 收到进度:', progressData);

                            // 处理不同的进度步骤
                            if (progressData.step === 2 && progressData.data?.totalPages) {
                                totalPages = progressData.data.totalPages;
                                // 显示进度容器
                                displayProgressContainer(totalPages);
                                isFirstUpdate = false;
                            }
                            
                            // 单张图片完成
                            if (progressData.data?.image) {
                                generatedImages.push(progressData.data.image);
                                // 更新进度显示（不插入实际图片）
                                updateProgressDisplay(generatedImages, progressData.data.total, progressData.message);
                            }

                            // 全部完成
                            if (progressData.step === 999) {
                                if (progressData.data?.finalResult) {
                                    const finalData = progressData.data.finalResult;
                                    displayXiaoLvShuDirectResult(finalData);
                                    app.showToast('success', `🎉 小绿书生成完成！共 ${finalData.totalPages} 张图片`);
                                } else if (progressData.data?.error) {
                                    app.showToast('error', '生成失败: ' + progressData.data.error);
                                }
                                break;
                            }

                        } catch (parseError) {
                            console.error('解析进度数据失败:', parseError);
                        }
                    }
                }
            }
        } catch (streamError) {
            console.error('流式读取失败:', streamError);
            
            // 如果已经有图片生成成功，显示部分结果
            if (generatedImages.length > 0) {
                app.showToast('warning', `连接中断，已生成${generatedImages.length}张图片`);
                displayXiaoLvShuDirectResult({
                    success: true,
                    images: generatedImages,
                    totalPages: generatedImages.length,
                    template: template,
                    partial: true
                });
            } else {
                app.showToast('error', '生成失败，请重试');
            }
        } finally {
            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
            // loading已经在开始时隐藏了
        }

        return;
        
    } catch (error) {
        console.error('小绿书生成失败:', error);
        app.showToast('error', '生成失败: ' + error.message);
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
        // loading已经在开始时隐藏了
    }
}

// 显示独立小绿书生成结果
function displayXiaoLvShuDirectResult(data) {
    const outputElement = document.getElementById('output');
    const placeholderElement = document.getElementById('outputPlaceholder');
    const actionsElement = document.getElementById('outputActions');
    
    let html = `
        <div class="xiaolvshu-result-info">
            <h4>📸 小绿书生成完成</h4>
            <p>共生成 ${data.totalPages} 张图片，使用模板：${data.template}</p>
        </div>
        
        <div class="xiaolvshu-images-grid">
    `;
    
    // 显示每张图片
    data.images.forEach((image, index) => {
        html += `
            <div class="xiaolvshu-image-card">
                <div class="xiaolvshu-page-number">第 ${image.pageNumber} 页</div>
                ${image.aiGenerated ? 
                    `<img src="${image.imageUrl}" alt="第${image.pageNumber}页" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />` :
                image.frontendCanvas ? 
                    `<div class="canvas-placeholder" data-index="${index}" style="width: 100%; height: 300px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666;">前端生成中...</div>` :
                    `<img src="${image.dataUrl}" alt="第${image.pageNumber}页" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`
                }
                <div class="xiaolvshu-image-actions">
                    <button class="btn btn-sm btn-outline" onclick="downloadXiaoLvShuImage(${index})">
                        💾 下载
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="previewXiaoLvShuImage(${index})">
                        👁️ 预览
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // 批量操作按钮
    html += `
        <div class="xiaolvshu-batch-actions">
            <button class="btn btn-outline" onclick="downloadAllXiaoLvShu()">
                💾 下载全部
            </button>
            <button class="btn btn-primary" onclick="uploadXiaoLvShuToWechat(event)">
                🚀 上传微信
            </button>
        </div>
    `;
    
    outputElement.innerHTML = html;
    outputElement.style.display = 'block';
    placeholderElement.style.display = 'none';
    actionsElement.style.display = 'none'; // 小绿书模式不需要这些按钮
    
    // 存储图片数据供后续使用
    app.currentXiaoLvShuImages = data.images;
    
    // 处理前端Canvas生成的图片
    setTimeout(() => {
        data.images.forEach((image, index) => {
            if (image.frontendCanvas) {
                // 前端生成Canvas图片
                generateCanvasImageFinal(image, index);
            }
        });
    }, 100);
    
    // 滚动到结果区域
    outputElement.scrollIntoView({ behavior: 'smooth' });
}

// 前端Canvas图片生成器
class FrontendCanvasGenerator {
    constructor() {
        this.templates = {
            classic: {
                name: '古典雅致',
                width: 750,
                height: 1334,
                background: '#f8f5f0',
                textColor: '#2c2c2c',
                fontSize: 24,
                lineHeight: 40,
                padding: 80,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            },
            modern: {
                name: '现代简约',
                width: 750,
                height: 1334,
                background: '#ffffff',
                textColor: '#333333',
                fontSize: 26,
                lineHeight: 42,
                padding: 70,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            },
            elegant: {
                name: '优雅文艺',
                width: 750,
                height: 1334,
                background: '#ffecd2',
                textColor: '#444444',
                fontSize: 22,
                lineHeight: 38,
                padding: 75,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            }
        };
    }
    
    generateImage(content, template = 'classic', pageNumber = 1, totalPages = 1) {
        const config = this.templates[template];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = config.width;
        canvas.height = config.height;
        
        // 清理内容，移除markdown语法
        const cleanContent = this.cleanMarkdownContent(content);
        
        // 绘制背景
        ctx.fillStyle = config.background;
        ctx.fillRect(0, 0, config.width, config.height);
        
        // 智能字体大小计算
        const intelligentFontSize = this.calculateIntelligentFontSize(cleanContent, config);
        
        // 绘制文字
        ctx.fillStyle = config.textColor;
        ctx.font = `${intelligentFontSize}px ${config.fontFamily}`;
        ctx.textAlign = 'center'; // 改为居中对齐
        ctx.textBaseline = 'top';
        
        // 文字换行
        const maxWidth = config.width - config.padding * 2;
        const lines = this.wrapText(ctx, cleanContent, maxWidth);
        
        // 计算文字总高度并垂直居中
        const totalTextHeight = lines.length * intelligentFontSize * 1.6; // 使用行高1.6
        const startY = Math.max(config.padding, (config.height - totalTextHeight) / 2);
        
        let y = startY;
        for (const line of lines) {
            if (y + intelligentFontSize * 1.6 > config.height - config.padding) break;
            
            if (line.trim()) {
                ctx.fillText(line, config.width / 2, y); // 居中绘制
            }
            y += intelligentFontSize * 1.6;
        }
        
        // 绘制页码
        if (totalPages > 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.font = `14px ${config.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.fillText(`${pageNumber}/${totalPages}`, config.width / 2, config.height - 30);
        }
        
        return canvas.toDataURL('image/png');
    }
    
    // 清理markdown内容
    cleanMarkdownContent(content) {
        return content
            .replace(/#{1,6}\s/g, '') // 移除标题符号
            .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
            .replace(/\*(.*?)\*/g, '$1') // 移除斜体
            .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片语法
            .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
            .replace(/`(.*?)`/g, '$1') // 移除代码
            .replace(/---+/g, '') // 移除分隔线
            .replace(/\n\s*\n/g, '\n') // 移除多余的空行
            .trim();
    }
    
    // 智能字体大小计算
    calculateIntelligentFontSize(content, config) {
        const length = content.length;
        let fontSize;
        
        if (length <= 100) {
            fontSize = Math.max(28, config.fontSize + 6); // 短文本用大字体
        } else if (length <= 300) {
            fontSize = config.fontSize + 2; // 中等文本稍大
        } else if (length <= 600) {
            fontSize = config.fontSize; // 正常字体
        } else if (length <= 1000) {
            fontSize = Math.max(16, config.fontSize - 4); // 较长文本缩小
        } else {
            fontSize = Math.max(14, config.fontSize - 8); // 很长文本更小
        }
        
        console.log(`📝 智能字体大小: 内容${length}字符 -> ${fontSize}px`);
        return fontSize;
    }
    
    wrapText(ctx, text, maxWidth) {
        const lines = [];
        const paragraphs = text.split('\n');
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push('');
                continue;
            }
            
            const chars = paragraph.split('');
            let currentLine = '';
            
            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    const endPunctuations = ['。', '，', '！', '？', '；', '：', '）', '】', '』', '》', '」', '"', '"', '、'];
                    
                    if (endPunctuations.includes(char)) {
                        currentLine += char;
                    } else {
                        lines.push(currentLine);
                        currentLine = char;
                    }
                } else {
                    currentLine += char;
                }
            }
            
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
        }
        
        return lines;
    }
}

// 创建全局Canvas生成器实例
const frontendCanvasGenerator = new FrontendCanvasGenerator();

// 生成Canvas图片 (通用函数)
function generateCanvasImage(imageData, index) {
    try {
        const dataUrl = frontendCanvasGenerator.generateImage(
            imageData.content, 
            imageData.template || 'classic',
            imageData.pageNumber, 
            imageData.totalPages || 1
        );
        
        // 更新图片数据
        if (app.currentXiaoLvShuImages && app.currentXiaoLvShuImages[index]) {
            app.currentXiaoLvShuImages[index].dataUrl = dataUrl;
            app.currentXiaoLvShuImages[index].frontendCanvas = false; // 标记已生成
        }
        
        // 更新页面显示 - 查找占位符
        const placeholderDiv = document.querySelector(`.canvas-placeholder[data-index="${index}"]`);
        if (placeholderDiv) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = `第${imageData.pageNumber}页`;
            img.style.cssText = 'width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
            placeholderDiv.parentNode.replaceChild(img, placeholderDiv);
            console.log(`📱 页面显示已更新 (第${imageData.pageNumber}页)`);
        } else {
            console.warn(`❌ 找不到占位符: .canvas-placeholder[data-index="${index}"]`);
            // 备用方案：查找所有含有"前端生成中"的div
            const allPlaceholders = document.querySelectorAll('div[style*="前端生成中"]');
            console.log(`🔍 找到 ${allPlaceholders.length} 个占位符`);
            
            // 尝试根据页码匹配
            for (const placeholder of allPlaceholders) {
                const card = placeholder.closest('.xiaolvshu-image-card');
                if (card) {
                    const pageNumberElement = card.querySelector('.xiaolvshu-page-number');
                    if (pageNumberElement && pageNumberElement.textContent.includes(`${imageData.pageNumber}`)) {
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.alt = `第${imageData.pageNumber}页`;
                        img.style.cssText = 'width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
                        placeholder.parentNode.replaceChild(img, placeholder);
                        console.log(`✅ 备用方案更新成功 (第${imageData.pageNumber}页)`);
                        break;
                    }
                }
            }
        }
        
        console.log(`✅ 前端Canvas生成成功 (第${imageData.pageNumber}页)`);
    } catch (error) {
        console.error(`前端Canvas生成失败 (第${imageData.pageNumber}页):`, error);
    }
}

// 最终结果页面的Canvas图片生成
function generateCanvasImageFinal(imageData, index) {
    generateCanvasImage(imageData, index);
}

// 补充缺失的方法
PoemApp.prototype.loadWechatStatus = async function() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (data.services && data.services.wechat !== undefined) {
            this.updateWechatStatus(data.services.wechat);
        }
        
        // 同时加载服务器IP信息
        await this.loadServerIp();
    } catch (error) {
        console.error('加载微信状态失败:', error);
    }
};

PoemApp.prototype.loadServerIp = async function() {
    try {
        const response = await fetch('/api/ip');
        const data = await response.json();
        
        if (data.success) {
            this.updateServerIpDisplay(data.currentIp, data.allResults);
        } else {
            this.updateServerIpDisplay('获取失败', []);
        }
    } catch (error) {
        console.error('获取服务器IP失败:', error);
        this.updateServerIpDisplay('获取失败', []);
    }
};

PoemApp.prototype.updateServerIpDisplay = function(currentIp, allResults) {
    const ipElement = document.getElementById('currentIp');
    if (ipElement) {
        if (currentIp === '获取失败') {
            ipElement.textContent = '获取失败';
            ipElement.style.color = 'var(--error-color)';
        } else {
            ipElement.textContent = currentIp;
            ipElement.style.color = 'var(--success-color)';
            ipElement.style.fontWeight = 'bold';
        }
    }
    
    // 如果有多个IP结果，显示详细信息
    if (allResults && allResults.length > 1) {
        const tooltip = allResults.map(result => 
            `${result.service}: ${result.ip}`
        ).join('\n');
        
        if (ipElement) {
            ipElement.title = `多个检测源结果:\n${tooltip}`;
        }
    }
};

PoemApp.prototype.refreshServerIp = async function() {
    const refreshBtn = document.getElementById('refreshIpBtn');
    const originalText = refreshBtn.textContent;
    
    refreshBtn.disabled = true;
    refreshBtn.textContent = '刷新中...';
    
    try {
        await this.loadServerIp();
        this.showToast('success', 'IP信息已刷新');
    } catch (error) {
        this.showToast('error', '刷新失败: ' + error.message);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
    }
};

PoemApp.prototype.savePrompts = async function() {
    try {
        await this.savePromptsToServer(this.prompts);
        console.log('✅ 提示词已保存到服务器');
    } catch (error) {
        console.error('保存提示词失败:', error);
        this.showToast('error', '保存提示词失败: ' + error.message);
    }
};

PoemApp.prototype.savePromptsToServer = async function(prompts) {
    const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts)
    });
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || '保存失败');
    }
    
    return data;
};