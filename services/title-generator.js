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
            const aiTitle = await this.generateWithAI(author, title, style, customPrompt, 0);
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
    async generateWithAI(author, title, style, customPrompt = null, styleIndex = 0) {
        let prompt;
        
        if (customPrompt) {
            // 使用自定义提示词并替换变量
            prompt = customPrompt
                .replace(/\{author\}/g, author)
                .replace(/\{title\}/g, title)
                .replace(/\{style === 'emotional' \? '情感共鸣型，触动内心' : '文艺深度型，有思辨性'\}/g, 
                    style === 'emotional' ? '情感共鸣型，触动内心' : '文艺深度型，有思辨性');
        } else {
            // 根据生成次数使用不同风格的标题，确保多样性
            const titleStyles = [
                // 第1个标题：秘密/未解之谜风格
                `请为${author}的《${title}》生成一个"秘密未解"风格的10万+爆文标题！
                
要求：包含${author}和《${title}》，必须有阿拉伯数字，强调神秘感和未解之谜。
套路：秘密、真相、未解、隐藏、99%的人不知道
示例思路："王勃《静夜思》隐藏的3个千年秘密，学者都震惊了！"
请直接返回标题。`,

                // 第2个标题：人生智慧/哲理风格  
                `请为${author}的《${title}》生成一个"人生智慧"风格的10万+爆文标题！
                
要求：包含${author}和《${title}》，必须有阿拉伯数字，强调人生感悟和智慧。
套路：人生智慧、改变命运、看懂的人、值得收藏、一生受益
示例思路："李白《将进酒》藏着的5条人生智慧，看懂受益一生！"
请直接返回标题。`,

                // 第3个标题：情感共鸣/现代启示风格
                `请为${author}的《${title}》生成一个"情感共鸣"风格的10万+爆文标题！
                
要求：包含${author}和《${title}》，必须有阿拉伯数字，强调现代人的情感共鸣。
套路：说的就是你、现代启示、看哭了、扎心了、引发深思
示例思路："杜甫《春望》的7个细节，让1000万现代人看哭了！"
请直接返回标题。`
            ];
            
            // 循环使用不同风格，确保多样性
            prompt = titleStyles[styleIndex % titleStyles.length];
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
        
        // 生成多个AI标题，每个使用不同风格
        for (let i = 0; i < count; i++) {
            try {
                const aiTitle = await this.generateWithAI(author, title, style, customPrompt, i);
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
        
        // 如果AI生成的标题不够，用多样化模板补充
        if (titles.length < count) {
            const fallbackTitles = [
                // 神秘风格
                `${author}《${title}》背后隐藏的10个惊天秘密，99%的人不知道！`,
                `震撼！${author}《${title}》竟然预言了1000年后的今天`,
                
                // 智慧风格  
                `${author}《${title}》：3句话改变命运，看懂受益一生！`,
                `读懂${author}《${title}》的5个智慧，你就读懂了人生`,
                
                // 情感风格
                `${author}《${title}》的7个细节，让现代人看哭了`,
                `为什么${author}《${title}》让千万人深夜沉思？`,
                
                // 对比风格
                `古人写诗vs现代人发朋友圈：${author}《${title}》告诉你差距在哪`,
                `${author}写了8个字，现代人用了800字都说不清楚！`
            ];
            
            // 按顺序添加不同风格的标题
            let titleIndex = 0;
            while (titles.length < count && titleIndex < fallbackTitles.length) {
                const fallbackTitle = fallbackTitles[titleIndex];
                if (!titles.includes(fallbackTitle)) {
                    titles.push(fallbackTitle);
                }
                titleIndex++;
            }
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