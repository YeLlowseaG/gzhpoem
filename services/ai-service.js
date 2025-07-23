const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const TitleGenerator = require('./title-generator');
const CoverGenerator = require('./cover-generator');

class AIService {
    constructor() {
        this.providers = {
            qwen: {
                url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                key: process.env.QWEN_API_KEY,
                model: 'qwen-turbo'
            },
            qwen_image: {
                url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
                key: process.env.QWEN_API_KEY,
                model: 'wanx-v1'
            },
            openai: {
                url: 'https://api.openai.com/v1/chat/completions',
                key: process.env.OPENAI_API_KEY,
                model: 'gpt-3.5-turbo'
            },
            deepseek: {
                url: 'https://api.deepseek.com/v1/chat/completions',
                key: process.env.DEEPSEEK_API_KEY,
                model: 'deepseek-chat'
            }
        };
        
        // 优先使用通义千问
        this.currentProvider = this.findAvailableProvider();
        
        // 初始化辅助服务
        this.titleGenerator = new TitleGenerator();
        this.coverGenerator = new CoverGenerator();
        
        // 加载本地模板
        this.loadTemplates();
    }

    /**
     * 检查服务是否已配置
     */
    isConfigured() {
        return this.currentProvider !== null;
    }

    /**
     * 寻找可用的AI服务
     */
    findAvailableProvider() {
        for (const [name, provider] of Object.entries(this.providers)) {
            if (provider.key && provider.key.length > 10) {
                console.log(`✅ 找到可用的AI服务: ${name}`);
                return name;
            }
        }
        console.log('⚠️  未配置任何AI服务，将使用本地模板');
        return null;
    }

    /**
     * 加载文章模板
     */
    async loadTemplates() {
        try {
            const templatePath = path.join(__dirname, '../templates');
            this.templates = {
                popular: await this.loadTemplate(templatePath, 'popular.md'),
                literary: await this.loadTemplate(templatePath, 'literary.md'),
                emotional: await this.loadTemplate(templatePath, 'emotional.md'),
                academic: await this.loadTemplate(templatePath, 'academic.md')
            };
        } catch (error) {
            console.log('📝 模板文件不存在，使用内置模板');
            this.templates = this.getBuiltinTemplates();
        }
    }

    /**
     * 加载单个模板
     */
    async loadTemplate(templatePath, filename) {
        try {
            const content = await fs.readFile(path.join(templatePath, filename), 'utf-8');
            return content;
        } catch (error) {
            return null;
        }
    }

    /**
     * 获取内置模板
     */
    getBuiltinTemplates() {
        return {
            popular: `# {{title}} - {{author}}的千古名作解读

当我们提到中国古典诗词的璀璨明珠时，{{author}}的《{{title}}》无疑是其中最耀眼的一颗。这首诗不仅仅是文字的艺术，更是情感的结晶，承载着深厚的文化底蕴。

## 📖 诗词原文

**《{{title}}》**
*{{author}}*

{{content}}

## 🌟 创作背景

{{author}}创作这首诗时，正值{{dynasty}}时期...

## 🎯 逐句赏析

让我们一起走进这首诗的世界，感受每一句话背后的深意...

## 💭 情感主题

这首诗表达的核心情感是...

## 🎨 现代启示

在今天这个快节奏的时代，{{author}}的这首诗依然能够给我们带来深刻的启发...

---
*关注「最美诗词」，每天为你推送最美的诗词赏析！*`,
            
            literary: `# 千古绝唱：{{author}}《{{title}}》的文学价值解析

## 题引
{{author}}之《{{title}}》，乃{{dynasty}}诗坛之瑰宝，其辞藻之精美，意境之深远，历代文人墨客莫不为之倾倒。

## 诗词原文
{{content}}

## 文学价值分析
此诗在文学史上之地位...

## 艺术手法探析
{{author}}运用之修辞手法...

## 文化内涵阐释
诗中所蕴含之文化意象...

## 后世影响
此诗对后世文学之影响...`,
            
            emotional: `# 读懂《{{title}}》，读懂{{author}}的内心世界

每次读到{{author}}的《{{title}}》，我的心总是会被深深触动。这首诗不仅仅是文字的组合，更是一个人内心情感的真实写照。

## 诗词欣赏
{{content}}

## 情感解读
当我们静下心来品读这首诗时...

## 心灵共鸣
{{author}}在诗中表达的情感...

## 人生感悟
这首诗让我们明白...`,
            
            academic: `# {{author}}《{{title}}》文本分析与研究

## 摘要
本文从文本分析的角度，深入研究{{author}}《{{title}}》的创作背景、艺术特色和文学价值。

## 文本原貌
{{content}}

## 创作语境分析
基于史料记载，{{author}}创作此诗时...

## 修辞手法研究
从语言学角度分析...

## 文学史地位
在中国古典文学发展史中...

## 学术价值评估
该作品在学术研究中的意义...`
        };
    }

    /**
     * 生成完整的公众号内容包（文章+标题+封面）
     */
    async generateArticle({ author, title, style, keywords, content, customPrompt }) {
        try {
            console.log(`🎯 开始生成完整内容包: ${author} - ${title}`);
            
            // 并行生成所有内容
            const [articleResult, titleResult, coverResult] = await Promise.allSettled([
                this.generateArticleContent({ author, title, style, keywords, content, customPrompt }),
                this.titleGenerator.generateMultipleTitles(author, title, style, 3),
                this.generateCoverImage({ author, title, content, style })
            ]);
            
            // 处理封面结果
            let finalCover;
            if (coverResult.status === 'fulfilled' && coverResult.value.success) {
                finalCover = coverResult.value;
                console.log('🎨 使用AI生成的封面');
            } else {
                console.log('⚠️ AI封面生成失败，使用默认文字封面');
                // 降级到文字封面
                finalCover = await this.coverGenerator.generateTextCover(author, title, style);
            }

            // 处理结果
            const result = {
                success: true,
                content: articleResult.status === 'fulfilled' ? articleResult.value.content : this.getBackupContent(author, title),
                titles: titleResult.status === 'fulfilled' ? titleResult.value : [this.getBackupTitle(author, title)],
                cover: finalCover,
                source: articleResult.status === 'fulfilled' ? articleResult.value.source : 'template',
                provider: articleResult.status === 'fulfilled' ? articleResult.value.provider : 'local',
                usage: articleResult.status === 'fulfilled' ? articleResult.value.usage : null,
                generatedAt: new Date().toISOString()
            };
            
            console.log('✅ 完整内容包生成成功');
            return result;
            
        } catch (error) {
            console.error('生成完整内容包失败:', error);
            
            // 完全备用方案
            return {
                success: true,
                content: this.getBackupContent(author, title),
                titles: [this.getBackupTitle(author, title)],
                cover: this.getBackupCover(author, title),
                source: 'backup',
                provider: 'local',
                error: error.message
            };
        }
    }

    /**
     * 生成文章内容
     */
    async generateArticleContent({ author, title, style, keywords, content, customPrompt }) {
        try {
            // 如果有AI服务，优先使用AI
            if (this.currentProvider) {
                const aiResult = await this.generateWithAI({ author, title, style, keywords, content, customPrompt });
                if (aiResult.success) {
                    return aiResult;
                }
            }
            
            // 降级到模板生成
            console.log('📝 使用本地模板生成文章');
            return this.generateWithTemplate({ author, title, style, keywords, content });
            
        } catch (error) {
            console.error('生成文章内容失败:', error);
            // 最后的备用方案
            return this.generateWithTemplate({ author, title, style, keywords, content });
        }
    }

    /**
     * 使用AI生成文章
     */
    async generateWithAI({ author, title, style, keywords, content, customPrompt }) {
        const provider = this.providers[this.currentProvider];
        
        if (!provider || !provider.key) {
            throw new Error('AI服务未配置');
        }

        const prompt = customPrompt ? 
            this.buildCustomPrompt({ author, title, style, keywords, content, customPrompt }) :
            this.buildPrompt({ author, title, style, keywords, content });
        
        try {
            console.log(`🤖 使用 ${this.currentProvider} 生成文章...`);
            
            let response;
            
            if (this.currentProvider === 'qwen') {
                response = await axios.post(provider.url, {
                    model: provider.model,
                    input: {
                        messages: [{ role: 'user', content: prompt }]
                    },
                    parameters: {
                        result_format: 'message',
                        max_tokens: 2500,
                        temperature: 0.7
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${provider.key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                if (response.data.output && response.data.output.choices) {
                    const content = response.data.output.choices[0].message.content;
                    return {
                        success: true,
                        content: this.addCoverImage(content),
                        source: 'ai',
                        provider: this.currentProvider,
                        usage: response.data.usage
                    };
                }
            } else {
                // OpenAI格式
                response = await axios.post(provider.url, {
                    model: provider.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2500,
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${provider.key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                if (response.data.choices && response.data.choices.length > 0) {
                    const content = response.data.choices[0].message.content;
                    return {
                        success: true,
                        content: this.addCoverImage(content),
                        source: 'ai',
                        provider: this.currentProvider,
                        usage: response.data.usage
                    };
                }
            }
            
            throw new Error('AI返回格式异常');
            
        } catch (error) {
            console.error(`${this.currentProvider} 调用失败:`, error.message);
            
            // 尝试切换到其他可用服务
            this.switchToBackupProvider();
            
            throw error;
        }
    }

    /**
     * 使用模板生成文章
     */
    generateWithTemplate({ author, title, style, keywords, content }) {
        const template = this.templates[style] || this.templates.popular;
        
        // 简单的模板替换
        let article = template
            .replace(/\{\{title\}\}/g, title)
            .replace(/\{\{author\}\}/g, author)
            .replace(/\{\{content\}\}/g, content || '（请补充诗词原文）')
            .replace(/\{\{dynasty\}\}/g, this.guessDynasty(author))
            .replace(/\{\{keywords\}\}/g, keywords || '');
        
        // 添加封面图
        article = this.addCoverImage(article);
        
        return {
            success: true,
            content: article,
            source: 'template',
            provider: 'local'
        };
    }

    /**
     * 构建AI提示词
     */
    buildPrompt({ author, title, style, keywords, content }) {
        const styleMap = {
            'popular': '通俗易懂，贴近现代读者',
            'literary': '文雅精致，具有古典美感',
            'emotional': '情感丰富，容易引起共鸣',
            'academic': '严谨客观，具有学术价值'
        };

        const styleDesc = styleMap[style] || styleMap.popular;
        const keywordHint = keywords ? `重点关注：${keywords}` : '';

        return `请为${author}的《${title}》创作一篇900-1200字的诗词赏析文章。

重要要求：
1. 必须先找到这首诗的准确原文，如果用户没有提供原文，请根据你的知识库找到正确的诗词内容
2. 风格：${styleDesc}
3. 文章结构：
   - 吸引人的标题（例如："千古绝唱！李白《静夜思》背后的深意，读懂的人都哭了"）
   - 诗词原文（完整准确）
   - 创作背景
   - 逐句深度赏析
   - 艺术特色
   - 情感主题
   - 现代意义
   - 结语
4. 适合微信公众号发布，要有吸引力
5. 使用markdown格式
6. 字数控制在900-1200字

${keywordHint}

${content ? `用户提供的诗词原文：\n${content}` : '注意：用户未提供原文，请根据你的知识找到正确的诗词原文'}

请确保诗词原文的准确性，这是文章质量的基础。`;
    }

    /**
     * 构建自定义提示词
     */
    buildCustomPrompt({ author, title, style, keywords, content, customPrompt }) {
        const styleMap = {
            'popular': '通俗易懂，贴近现代读者',
            'literary': '文雅精致，具有古典美感',
            'emotional': '情感丰富，容易引起共鸣',
            'academic': '严谨客观，具有学术价值'
        };

        const styleDesc = styleMap[style] || styleMap.popular;
        const keywordHint = keywords ? `重点关注：${keywords}` : '';
        const contentHint = content ? `用户提供的诗词原文：\n${content}` : '注意：用户未提供原文，请根据你的知识找到正确的诗词原文';

        // 替换模板变量
        return customPrompt
            .replace(/\{author\}/g, author)
            .replace(/\{title\}/g, title)
            .replace(/\{style\}/g, styleDesc)
            .replace(/\{keywords\}/g, keywordHint)
            .replace(/\{content\}/g, contentHint);
    }

    /**
     * 添加封面图片
     */
    addCoverImage(content) {
        const coverImage = '![封面图片](https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=400&fit=crop)';
        return `${coverImage}\n\n${content}`;
    }

    /**
     * 推测朝代
     */
    guessDynasty(author) {
        const dynastyMap = {
            '李白': '唐',
            '杜甫': '唐',
            '王维': '唐',
            '白居易': '唐',
            '李商隐': '唐',
            '杜牧': '唐',
            '王昌龄': '唐',
            '孟浩然': '唐',
            '李清照': '宋',
            '苏轼': '宋',
            '辛弃疾': '宋',
            '陆游': '宋',
            '王安石': '宋',
            '欧阳修': '宋'
        };
        return dynastyMap[author] || '古代';
    }

    /**
     * 切换到备用服务
     */
    switchToBackupProvider() {
        const providers = Object.keys(this.providers);
        const currentIndex = providers.indexOf(this.currentProvider);
        
        for (let i = currentIndex + 1; i < providers.length; i++) {
            const provider = providers[i];
            if (this.providers[provider].key) {
                this.currentProvider = provider;
                console.log(`🔄 已切换到备用服务: ${provider}`);
                return;
            }
        }
        
        this.currentProvider = null;
        console.log('❌ 没有可用的AI服务，将使用本地模板');
    }

    /**
     * 获取备用内容（真实有用的内容）
     */
    getBackupContent(author, title) {
        // 获取具体的诗词内容和分析
        const poemData = this.getSpecificPoemData(author, title);
        
        if (poemData) {
            return this.generateSpecificAnalysis(poemData);
        }
        
        return `# ${author}《${title}》深度赏析

![封面图片](https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=400&fit=crop)

## 📖 诗词原文

**《${title}》**  
*${author}*

抱歉，暂时无法获取具体诗词内容。请手动添加诗词原文，或者配置AI服务获得完整分析。

## 🔧 系统提示

当前使用的是备用模板，为获得最佳体验，请：

1. **配置AI服务**：在 .env 文件中配置 QWEN_API_KEY 或其他AI服务密钥
2. **手动输入诗词**：在生成时填入完整的诗词原文
3. **检查网络**：确保能正常访问AI服务

配置完成后，系统将自动生成900+字的专业赏析文章。

---
*「最美诗词」- 让每首诗都有最好的解读*`;
    }

    /**
     * 获取具体诗词数据
     */
    getSpecificPoemData(author, title) {
        const poemDatabase = {
            '李白': {
                '静夜思': {
                    content: '床前明月光，疑是地上霜。\n举头望明月，低头思故乡。',
                    background: '天宝年间，李白离开长安后漂泊各地，常常在夜深人静时思念故乡。',
                    theme: '思乡之情',
                    analysis: {
                        '床前明月光': '开篇点出时间（夜晚）和地点（床前），月光如水，营造出静谧的氛围。',
                        '疑是地上霜': '以"疑"字写出初醒时的恍惚，将月光比作霜花，既写出月光的皎洁，也暗示了秋夜的清冷。',
                        '举头望明月': '动作描写，从低头到抬头的动作变化，展现了诗人情感的起伏。',
                        '低头思故乡': '与上句形成对比，月圆人不圆，自然引发对故乡的思念。'
                    }
                }
            },
            '杜甫': {
                '春夜喜雨': {
                    content: '好雨知时节，当春乃发生。\n随风潜入夜，润物细无声。\n野径云俱黑，江船火独明。\n晓看红湿处，花重锦官城。',
                    background: '杜甫定居成都草堂时期，正值春天，久旱逢甘雨，诗人欣喜之情溢于言表。',
                    theme: '对春雨的喜爱和对自然的感悟',
                    analysis: {
                        '好雨知时节，当春乃发生': '拟人手法，赋予春雨人的品格，懂得在最需要的时候降临。',
                        '随风潜入夜，润物细无声': '春雨的温柔和无私，悄无声息地滋润万物。',
                        '野径云俱黑，江船火独明': '对比手法，黑云与灯火形成鲜明对比，营造出雨夜的独特景象。',
                        '晓看红湿处，花重锦官城': '想象雨后的美景，花朵沾满雨珠，整个成都城花团锦簇。'
                    }
                }
            }
        };

        return poemDatabase[author]?.[title] || null;
    }

    /**
     * 生成具体的分析文章
     */
    generateSpecificAnalysis(poemData) {
        const analysisText = Object.entries(poemData.analysis)
            .map(([line, explanation]) => `**"${line}"** - ${explanation}`)
            .join('\n\n');

        return `# 千古名篇！《${poemData.title || ''}》的深层解读

![封面图片](https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=400&fit=crop)

## 📖 诗词原文

${poemData.content}

## 🌟 创作背景

${poemData.background}

## 🎯 逐句深度赏析

${analysisText}

## 💭 主题思想

这首诗的核心主题是**${poemData.theme}**。诗人通过细腻的笔触，将内心的情感与自然景物完美融合，创造出令人共鸣的艺术境界。

## 🎨 艺术特色

1. **意象丰富**：诗中的每一个意象都精心选择，相互呼应
2. **情景交融**：将个人情感与自然景物巧妙结合
3. **语言精练**：用词准确，每个字都恰到好处
4. **意境深远**：短短几句话营造出深邃的意境

## 现代意义

这首诗至今仍能打动我们，因为其中蕴含的情感是人类共通的。无论时代如何变迁，人们对美好事物的向往、对故乡的思念、对自然的感悟，都是永恒的主题。

---
*真正的好诗，能够跨越时空，直达人心*`;
    }

    /**
     * 获取备用标题
     */
    getBackupTitle(author, title) {
        return `千古名篇！${author}《${title}》背后的深意，读懂的人都哭了`;
    }

    /**
     * 获取备用封面
     */
    getBackupCover(author, title) {
        return {
            success: true,
            design: {
                author,
                title,
                template: {
                    id: 'classic',
                    background: '#f4f1e8',
                    primaryColor: '#8b4513',
                    secondaryColor: '#cd853f'
                }
            },
            html: `<div style="width:400px;height:600px;background:#f4f1e8;border:3px solid #8b4513;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:serif;"><h2 style="color:#8b4513;text-align:center;">${title}</h2><p style="color:#cd853f;">—— ${author}</p></div>`,
            type: 'backup'
        };
    }

    /**
     * 测试AI连接
     */
    async testConnection() {
        if (!this.currentProvider) {
            return {
                success: false,
                message: '未配置AI服务'
            };
        }

        try {
            const testPrompt = '请回复：连接测试成功';
            const result = await this.generateWithAI({
                author: '测试',
                title: '测试',
                style: 'popular',
                content: testPrompt
            });

            return {
                success: true,
                message: `${this.currentProvider} 连接正常`,
                provider: this.currentProvider
            };
        } catch (error) {
            return {
                success: false,
                message: `${this.currentProvider} 连接失败: ${error.message}`
            };
        }
    }

    /**
     * 生成诗词封面图片
     */
    async generateCoverImage({ author, title, content, style }) {
        try {
            console.log(`🎨 开始为${author}《${title}》生成AI封面图片...`);
            
            // 分析诗词意境，生成图片描述
            const imagePrompt = await this.buildImagePrompt({ author, title, content, style });
            console.log('🎨 图片描述prompt:', imagePrompt);
            
            // 调用通义万相生成图片
            const imageResult = await this.generateImageWithQwen(imagePrompt);
            
            if (imageResult.success) {
                console.log('✅ AI封面图片生成成功');
                return {
                    success: true,
                    imageUrl: imageResult.imageUrl,
                    prompt: imagePrompt,
                    provider: 'qwen_image',
                    type: 'ai_generated'
                };
            } else {
                console.warn('⚠️ AI图片生成失败，使用默认封面');
                return {
                    success: false,
                    error: imageResult.error,
                    fallback: true
                };
            }
            
        } catch (error) {
            console.error('❌ 生成AI封面失败:', error.message);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * 构建图片生成提示词
     */
    async buildImagePrompt({ author, title, content, style }) {
        try {
            // 使用AI分析诗词意境
            const analysisPrompt = `请分析${author}的《${title}》的意境和画面感，用于生成封面图片。

诗词内容：
${content || '（暂无具体内容）'}

请提供：
1. 诗词的核心意境（如：思乡、山水、离别等）
2. 主要意象（如：明月、山川、花鸟等）
3. 色彩基调（如：冷色调、暖色调等）
4. 绘画风格建议（如：水墨画、工笔画、油画等）

请用简洁的中文回答，每项不超过10字。`;

            const analysis = await this.generateWithAI({
                author, title, style: 'academic', 
                content: analysisPrompt
            });

            let mood = '诗意宁静';
            let imagery = '明月清风';
            let colorTone = '清雅淡蓝';
            let artStyle = '中国水墨画';

            // 解析AI分析结果
            if (analysis.success && analysis.content) {
                const lines = analysis.content.split('\n');
                lines.forEach(line => {
                    if (line.includes('意境') && !line.includes('：')) mood = line.trim();
                    else if (line.includes('意象') && !line.includes('：')) imagery = line.trim();
                    else if (line.includes('色彩') && !line.includes('：')) colorTone = line.trim();
                    else if (line.includes('风格') && !line.includes('：')) artStyle = line.trim();
                });
            }

            // 根据著名诗词设置特定场景
            const poetryScenes = {
                '静夜思': '夜晚房间窗前，明月高悬，床前月光如霜',
                '春晓': '春日清晨，花瓣飘落，鸟儿啁啾',
                '登鹳雀楼': '高楼远眺，黄河奔流，夕阳西下',
                '望庐山瀑布': '高山瀑布飞流直下，云雾缭绕',
                '春夜喜雨': '春夜细雨，万物复苏，绿意盎然'
            };

            const specificScene = poetryScenes[title] || `${mood}的${imagery}场景`;

            // 构建图片生成prompt
            const imagePrompt = `${specificScene}，${artStyle}风格，${colorTone}色调，诗意美感，高质量，4k分辨率，中国古典美学，意境深远，构图优美`;

            return imagePrompt;

        } catch (error) {
            console.error('构建图片prompt失败:', error);
            // 返回默认prompt
            return `${author}《${title}》诗词意境图，中国水墨画风格，诗意美感，高质量`;
        }
    }

    /**
     * 使用通义万相生成图片
     */
    async generateImageWithQwen(prompt) {
        const provider = this.providers.qwen_image;
        
        if (!provider.key) {
            throw new Error('通义万相API密钥未配置');
        }

        try {
            const response = await axios.post(provider.url, {
                model: provider.model,
                input: {
                    prompt: prompt,
                    negative_prompt: '低质量，模糊，变形，文字，水印，签名',
                    style: '<sketch>',
                    size: '1024*1024',
                    n: 1
                },
                parameters: {
                    style: '<sketch>',
                    size: '1024*1024',
                    n: 1
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${provider.key}`,
                    'Content-Type': 'application/json',
                    'X-DashScope-Async': 'enable'
                },
                timeout: 60000
            });

            console.log('🎨 通义万相响应:', response.data);

            if (response.data.output && response.data.output.results) {
                const imageUrl = response.data.output.results[0].url;
                return {
                    success: true,
                    imageUrl: imageUrl
                };
            } else if (response.data.output && response.data.output.task_id) {
                // 异步任务，需要轮询结果
                console.log('🔄 图片生成中，任务ID:', response.data.output.task_id);
                return await this.pollImageGenerationResult(response.data.output.task_id, provider.key);
            } else {
                throw new Error('通义万相返回格式异常');
            }

        } catch (error) {
            console.error('通义万相调用失败:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 轮询图片生成结果
     */
    async pollImageGenerationResult(taskId, apiKey) {
        const maxAttempts = 10;
        const delay = 3000; // 3秒

        for (let i = 0; i < maxAttempts; i++) {
            try {
                await new Promise(resolve => setTimeout(resolve, delay));

                const response = await axios.get(
                    `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`
                        },
                        timeout: 10000
                    }
                );

                console.log(`🔄 轮询第${i + 1}次，状态:`, response.data.output?.task_status);

                if (response.data.output?.task_status === 'SUCCEEDED') {
                    const imageUrl = response.data.output.results[0].url;
                    console.log('✅ 图片生成完成:', imageUrl);
                    return {
                        success: true,
                        imageUrl: imageUrl
                    };
                } else if (response.data.output?.task_status === 'FAILED') {
                    throw new Error('图片生成失败: ' + response.data.output?.message);
                }

            } catch (error) {
                console.error(`轮询第${i + 1}次失败:`, error.message);
            }
        }

        throw new Error('图片生成超时，请稍后重试');
    }
}

module.exports = AIService;