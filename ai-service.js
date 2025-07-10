const axios = require('axios');

class AIService {
    constructor() {
        // 支持多个AI服务提供商
        this.providers = {
            qwen: {
                url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                key: process.env.QWEN_API_KEY || 'sk-4b37b09662a44a90bb62a953d0f22aed',
                model: 'qwen-plus'
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
        
        // 默认使用通义千问
        this.currentProvider = 'qwen';
    }

    /**
     * 生成诗词赏析文章
     */
    async generatePoetryAnalysis({ title, author, content, style = '通俗' }) {
        try {
            const prompt = this.buildPrompt({ title, author, content, style });
            
            console.log('开始生成诗词赏析...', { title, author, style });
            
            const result = await this.callAI(prompt);
            
            if (result.success) {
                // 添加封面图片
                const contentWithCover = `![封面图片](https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop)\n\n${result.content}`;
                
                return {
                    success: true,
                    content: contentWithCover,
                    usage: result.usage || {},
                    source: this.currentProvider
                };
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('AI生成失败:', error.message);
            
            // 返回备用内容
            return {
                success: true,
                content: this.generateFallbackContent({ title, author, content }),
                error: error.message,
                source: 'fallback'
            };
        }
    }

    /**
     * 构建优化的提示词
     */
    buildPrompt({ title, author, content, style }) {
        const stylePrompts = {
            '通俗': '语言简单易懂，贴近大众，用现代人容易理解的方式解读古典诗词',
            '文雅': '用词典雅，引经据典，体现深厚的文学底蕴和古典美感',
            '情感': '注重情感共鸣，感人至深，能够触动读者内心深处的情感',
            '学术': '严谨客观，深度分析，具有学术价值和研究深度'
        };

        const basePrompt = `你是一位资深的古典文学专家和优秀的公众号写作者，对中国古典诗词有深入研究，特别了解各个朝代的诗人和他们的代表作品。你擅长将深奥的古典诗词用${stylePrompts[style] || stylePrompts['通俗']}的方式呈现给读者。

请为以下诗词创作一篇深度赏析文章：

**诗词信息：**
- 标题：${title}
- 作者：${author}
- 内容：${content || '（请根据标题和作者补充完整的诗词原文）'}

**重要提示：**
请确保你对"${author}"这位诗人和"${title}"这首诗有准确的了解。如果这是一首著名的古典诗词，请基于真实的历史背景、创作背景和文学价值进行分析。如果你不确定具体内容，请在分析中保持客观，避免编造不实信息。

**文章要求：**

1. **标题要求**：
   - 创作一个吸引人的公众号标题（20-30字）
   - 体现${author}和${title}的文学价值
   - 能引起读者的点击欲望
   - 可以参考格式：「千古名篇！${author}《${title}》的深层含义，读懂的人都被震撼了」

2. **结构要求**：
   文章总字数控制在900-1200字，包含以下部分：
   
   ## 📖 诗词原文
   - 完整展示${title}的诗词原文
   - 标注作者${author}和所属朝代
   - 如果有特殊格式（如词牌名），请正确标注
   
   ## 🌟 创作背景
   - ${title}的创作历史背景
   - ${author}创作此诗时的人生境遇和心境
   - 当时的时代环境对创作的影响
   - 这首诗在${author}作品中的地位
   
   ## 🎯 逐句赏析
   - 逐句分析${title}的含义和意境
   - 解读重要意象、典故和词汇
   - 分析${author}运用的修辞手法和表达技巧
   - 结合${author}的创作风格进行分析
   
   ## 🌸 艺术特色
   - 分析${title}的艺术手法和表现技巧
   - ${author}在这首诗中体现的语言特色
   - 这首诗在文学史上的地位和影响
   - 与${author}其他作品的比较
   
   ## 👨‍🎨 作者简介
   - ${author}的生平简介和历史地位
   - ${author}的主要文学成就和代表作品
   - ${author}的创作风格特点和文学贡献
   - ${author}在文学史上的重要性
   
   ## 💭 情感主题
   - ${title}表达的核心情感和思想
   - ${author}通过这首诗传达的人生感悟
   - 主题思想的深度解读
   - 与现代人的情感共鸣点
   
   ## 🎨 现代意义
   - ${title}在当代的文学价值和现实意义
   - 这首诗对现代人的启发和教育意义
   - ${author}的人文精神在当代的体现
   - 古典诗词的永恒魅力

3. **写作风格**：
   - 采用${style}的表达方式
   - 适当使用emoji表情符号增加可读性
   - 语言生动有趣，避免枯燥说教
   - 结合现代人的理解方式和审美习惯
   - 体现对${author}和${title}的深度理解

4. **格式要求**：
   - 使用markdown格式
   - 标题层级清晰，便于阅读
   - 段落分明，逻辑清晰
   - 在文末加上引导关注的内容
   - 适当使用引用格式突出重点诗句

5. **内容准确性**：
   - 确保对${author}生平和${title}内容的准确性
   - 避免与历史事实不符的内容
   - 如有不确定的信息，请用"据传"、"相传"等词汇
   - 重点突出${title}的独特价值和${author}的文学贡献

请按照以上要求，创作一篇完整的诗词赏析文章。文章要有深度但不晦涩，要能让普通读者也能理解和欣赏${author}《${title}》的文学之美。`;

        return basePrompt;
    }

    /**
     * 调用AI接口
     */
    async callAI(prompt) {
        const provider = this.providers[this.currentProvider];
        
        if (!provider || !provider.key) {
            throw new Error(`${this.currentProvider} API配置不完整`);
        }

        try {
            let response;
            
            if (this.currentProvider === 'qwen') {
                // 通义千问API格式
                response = await axios.post(provider.url, {
                    model: provider.model,
                    input: {
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ]
                    },
                    parameters: {
                        result_format: 'message',
                        max_tokens: 2000,
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
                    return {
                        success: true,
                        content: response.data.output.choices[0].message.content,
                        usage: response.data.usage
                    };
                } else {
                    throw new Error('API返回格式异常');
                }
                
            } else {
                // OpenAI格式 (适用于OpenAI、DeepSeek等)
                response = await axios.post(provider.url, {
                    model: provider.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${provider.key}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                if (response.data.choices && response.data.choices.length > 0) {
                    return {
                        success: true,
                        content: response.data.choices[0].message.content,
                        usage: response.data.usage
                    };
                } else {
                    throw new Error('API返回格式异常');
                }
            }
            
        } catch (error) {
            console.error(`${this.currentProvider} API调用失败:`, error.message);
            throw error;
        }
    }

    /**
     * 切换AI服务提供商
     */
    switchProvider(providerName) {
        if (this.providers[providerName]) {
            this.currentProvider = providerName;
            console.log(`已切换到 ${providerName} 服务`);
        } else {
            throw new Error(`不支持的AI服务提供商: ${providerName}`);
        }
    }

    /**
     * 生成备用内容
     */
    generateFallbackContent({ title, author, content }) {
        return `# 千古绝唱！${author}《${title}》背后的深意，读懂的人都哭了

当我们谈论中国古典诗词的璀璨明珠时，${author}的《${title}》无疑是其中最耀眼的一颗。这首诗不仅仅是文字的组合，更是情感的结晶，是中华文化的瑰宝。今天，让我们一起走进这首诗的世界，感受其中蕴含的深刻内涵。

## 📖 诗词原文

**《${title}》**  
*${author}*

${content || '（此处应插入具体诗词内容）'}

## 🌟 创作背景与时代意义

${author}创作《${title}》的时代背景极为重要。当时的社会环境、政治氛围以及诗人的个人经历，都深深影响着这首诗的创作。通过了解这些背景，我们能够更好地理解诗人的内心世界和创作动机。

这首诗诞生于一个特殊的历史时期，那时的文人墨客们面临着种种人生际遇。${author}作为其中的佼佼者，用他独特的视角和深刻的洞察力，为我们留下了这样一首传世佳作。

![配图1](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop)

## 🎯 逐句深度赏析

每一句诗都是诗人情感的体现，每一个字都承载着深刻的含义。让我们逐句来品味这首诗的精妙之处：

**第一句的妙处在于**其开门见山的表达方式，直接将读者带入到诗人所营造的意境之中。这种写法看似简单，实则蕴含着高超的艺术技巧。

**第二句则进一步深化了主题**，通过具体的意象描绘，让抽象的情感变得具体可感。这种由浅入深的表达方式，正是古典诗词的魅力所在。

## 🌸 重点词语与意象解析

在这首诗中，几个关键词语的运用尤为精妙，它们不仅仅是简单的景物描写，更是情感的载体和精神的寄托。

## 👨‍🎨 诗人生平与创作风格

${author}作为中国古代文学史上的重要人物，其生平经历和创作风格都值得我们深入了解。他的诗歌创作不仅数量丰富，而且质量上乘，在文学史上占有重要地位。

![配图2](https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop)

## 🎨 艺术手法与表现技巧

这首诗在艺术表现上有许多值得我们学习和欣赏的地方：

**1. 意境营造**：诗人通过精心选择的意象和巧妙的组合，营造出了一个独特的艺术境界。

**2. 语言运用**：诗中的每一个字都经过精心推敲，既保持了语言的优美，又确保了意思的准确传达。

**3. 情感表达**：诗人通过含蓄而深刻的表达方式，将复杂的情感融入到简洁的诗句中。

## 💭 情感主题与现代意义

《${title}》所表达的情感主题具有永恒的价值，它不仅仅属于那个时代，更属于我们每一个人。在现代社会中，这首诗仍然能够引起我们的共鸣，给我们以启发和思考。

![配图3](https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=600&h=400&fit=crop)

## 结语

${author}的《${title}》是一首永远读不厌的诗，每一次重读都会有新的感悟和收获。它像一面镜子，映照着我们的内心世界；它像一位老师，教导着我们人生的道理。

让我们在繁忙的现代生活中，偶尔停下脚步，重温这些经典之作，让古典诗词的美好继续滋养我们的心灵。

---

*如果这篇文章让你有所感悟，请点赞转发，让更多人感受到古典诗词的魅力！*

**关注「最美诗词」，每天为你推送最美的诗词赏析！**`;
    }

    /**
     * 测试AI连接
     */
    async testConnection() {
        try {
            const testPrompt = "请简单回复：AI服务连接正常";
            const result = await this.callAI(testPrompt);
            
            return {
                success: true,
                message: `${this.currentProvider} AI服务连接正常`,
                response: result.content
            };
        } catch (error) {
            return {
                success: false,
                message: `${this.currentProvider} AI服务连接失败: ${error.message}`
            };
        }
    }
}

module.exports = AIService; 