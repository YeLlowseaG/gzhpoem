const axios = require('axios');

class TitleGenerator {
    constructor() {
        this.templates = [
            '千古名篇！{author}《{title}》背后的深意，读懂的人都哭了',
            '震撼！{author}的《{title}》竟然隐藏着这样的秘密',
            '太美了！{author}《{title}》的真正含义，99%的人都理解错了',
            '绝了！{author}这首《{title}》，每一个字都是人生智慧',
            '泪目！{author}《{title}》中的这句话，道尽了人生真谛',
            '惊艳！{author}《{title}》的意境之美，让人如痴如醉',
            '深度解析！{author}《{title}》为什么能传诵千年？',
            '必读！{author}《{title}》中的人生哲学，值得收藏一生',
            '震撼心灵！{author}《{title}》的情感力量，让人久久难忘',
            '经典永流传！{author}《{title}》的艺术魅力究竟在哪里？'
        ];
    }

    /**
     * 生成爆款标题（使用自定义提示词）
     */
    async generateTitle(author, title, style = 'emotional', customPrompt = null) {
        try {
            // 尝试AI生成
            const aiTitle = await this.generateWithAI(author, title, style, customPrompt);
            if (aiTitle) {
                return aiTitle;
            }
        } catch (error) {
            console.log('AI生成标题失败，使用模板生成');
        }
        
        // 模板生成
        return this.generateWithTemplate(author, title, style);
    }

    /**
     * 使用AI生成标题（支持自定义提示词）
     */
    async generateWithAI(author, title, style, customPrompt = null) {
        let prompt;
        
        if (customPrompt) {
            // 使用自定义提示词并替换变量
            prompt = customPrompt
                .replace(/\{author\}/g, author)
                .replace(/\{title\}/g, title)
                .replace(/\{style === 'emotional' \? '情感共鸣型，触动内心' : '文艺深度型，有思辨性'\}/g, 
                    style === 'emotional' ? '情感共鸣型，触动内心' : '文艺深度型，有思辨性');
        } else {
            // 使用默认的10万+爆文提示词
            prompt = `请为${author}的《${title}》生成一个10万+阅读量的爆文标题！

## 爆文标题要求：
1. **字数控制**：20-30字，要足够有冲击力
2. **包含元素**：必须包含${author}和《${title}》
3. **阿拉伯数字强制要求**：标题中必须包含阿拉伯数字（如1、3、7、20、99、1000等）
4. **传播目标**：朋友圈疯传、微博热议、收藏转发的10万+爆文标题

## 10万+爆文标题技巧：
**数字爆炸技巧**：1000年、99%、3个字制造强冲击
**好奇心引爆**：秘密、真相、你绝对想不到
**情感共鸣炸弹**：说的就是你、看完沉默了
**争议话题**：颠覆认知、网友吵翻了
**收藏转发**：必须收藏、受益终生

## 重要要求：
- **阿拉伯数字强制**：标题中必须包含阿拉伯数字，没有数字的标题一律不合格！
- **作者信息准确**：必须使用正确的${author}，绝对不能出错
- **传播炸弹**：标题要有强烈的点击冲动，让人看到就想点开、想转发

请直接返回标题，不要解释过程。`;
        }

        try {
            const qwenKey = process.env.QWEN_API_KEY;
            if (!qwenKey) return null;

            const response = await axios.post(
                'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                {
                    model: 'qwen-turbo',
                    input: {
                        messages: [{ role: 'user', content: prompt }]
                    },
                    parameters: {
                        result_format: 'message',
                        max_tokens: 100,
                        temperature: 0.8
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${qwenKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data.output && response.data.output.choices) {
                return response.data.output.choices[0].message.content.trim();
            }
        } catch (error) {
            console.error('AI生成标题失败:', error.message);
        }
        
        return null;
    }

    /**
     * 使用模板生成标题
     */
    generateWithTemplate(author, title, style) {
        // 根据风格选择模板
        const styleTemplates = {
            emotional: [
                '千古名篇！{author}《{title}》背后的深意，读懂的人都哭了',
                '泪目！{author}《{title}》中的这句话，道尽了人生真谛',
                '震撼心灵！{author}《{title}》的情感力量，让人久久难忘',
                '太美了！{author}《{title}》的真正含义，99%的人都理解错了'
            ],
            literary: [
                '绝了！{author}这首《{title}》，每一个字都是人生智慧',
                '惊艳！{author}《{title}》的意境之美，让人如痴如醉',
                '经典永流传！{author}《{title}》的艺术魅力究竟在哪里？',
                '深度解析！{author}《{title}》为什么能传诵千年？'
            ],
            popular: [
                '必读！{author}《{title}》中的人生哲学，值得收藏一生',
                '震撼！{author}的《{title}》竟然隐藏着这样的秘密',
                '涨知识！{author}《{title}》的这个细节，太有意思了',
                '推荐！{author}《{title}》教会我们的人生智慧'
            ]
        };

        const templates = styleTemplates[style] || styleTemplates.emotional;
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        return template
            .replace(/{author}/g, author)
            .replace(/{title}/g, title);
    }

    /**
     * 生成多个标题供选择
     */
    async generateMultipleTitles(author, title, style = 'emotional', count = 3, customPrompt = null) {
        const titles = [];
        
        // 生成多个AI标题
        for (let i = 0; i < count; i++) {
            try {
                const aiTitle = await this.generateWithAI(author, title, style, customPrompt);
                if (aiTitle && !titles.includes(aiTitle)) {
                    titles.push(aiTitle);
                }
            } catch (error) {
                console.log(`AI生成第${i+1}个标题失败`);
            }
        }
        
        // 生成模板标题补充
        const styleTemplates = {
            emotional: [
                '千古绝唱！{author}《{title}》：豪情万丈，一醉解千愁',
                '李白《{title}》：仕途不得志时，诗人如何排解心中苦闷？',
                '读懂{author}《{title}》，你就读懂了古代文人的浪漫情怀',
                '{author}《{title}》深度解析：每一句都藏着人生智慧'
            ],
            literary: [
                '绝了！{author}这首《{title}》，每一个字都是人生智慧',
                '惊艳！{author}《{title}》的意境之美，让人如痴如醉',
                '经典永流传！{author}《{title}》的艺术魅力究竟在哪里？'
            ],
            popular: [
                '必读！{author}《{title}》中的人生哲学，值得收藏一生',
                '震撼！{author}的《{title}》竟然隐藏着这样的秘密',
                '涨知识！{author}《{title}》的这个细节，太有意思了'
            ]
        };

        const templates = styleTemplates[style] || styleTemplates.emotional;
        
        // 如果AI生成的标题不够，用10万+模板补充
        if (titles.length < count) {
            const fallbackTitles = [
                `${author}《${title}》：3个细节，藏着1000年的智慧`,
                `为什么${author}的《${title}》让99%的人沉默了？`,
                `${author}《${title}》里的7个字，说透了人生真相`,
                `震撼！${author}《${title}》隐藏的5个秘密，太惊人了`,
                `${author}《${title}》：1首诗改变命运，看懂的人都收藏了`
            ];
            
            fallbackTitles.forEach(fallbackTitle => {
                if (titles.length < count && !titles.includes(fallbackTitle)) {
                    titles.push(fallbackTitle);
                }
            });
        }
        
        return titles;
    }

    /**
     * 优化标题（检查长度、可读性等）
     */
    optimizeTitle(title, maxLength = 30) {
        if (title.length <= maxLength) {
            return title;
        }
        
        // 如果标题过长，尝试缩短
        const shortened = title.substring(0, maxLength - 3) + '...';
        return shortened;
    }

    /**
     * 验证标题质量
     */
    validateTitle(title) {
        const issues = [];
        
        // 检查长度
        if (title.length < 10) {
            issues.push('标题过短');
        }
        if (title.length > 40) {
            issues.push('标题过长');
        }
        
        // 检查是否包含敏感词
        const sensitiveWords = ['死', '血', '杀', '暴力', '色情'];
        for (const word of sensitiveWords) {
            if (title.includes(word)) {
                issues.push(`包含敏感词: ${word}`);
            }
        }
        
        // 检查是否过度煽情
        const overEmotional = ['震惊', '恐怖', '绝密', '惊天', '内幕'];
        let emotionalCount = 0;
        for (const word of overEmotional) {
            if (title.includes(word)) {
                emotionalCount++;
            }
        }
        
        if (emotionalCount > 2) {
            issues.push('过度煽情');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            score: Math.max(0, 100 - issues.length * 20)
        };
    }
}

module.exports = TitleGenerator;