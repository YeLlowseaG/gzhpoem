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
                // 第1个标题：内容分析 + 神秘震撼风格
                `请为${author}的《${title}》生成一个精准的100万+震撼标题！

## 第一步：深度分析诗词内容
请先分析这首诗的：
1. **核心主题**：这首诗真正要表达什么？（离别/思乡/人生感悟/自然哲理/爱情/友情等）
2. **独特价值**：这首诗有什么与众不同的地方？为什么值得现代人关注？
3. **现代共鸣点**：现代人读这首诗会产生什么情感共鸣？
4. **误解纠正**：大众对这首诗有什么常见误解？

## 第二步：结合分析生成精准标题
基于以上分析，生成包含以下元素的标题：
- 包含${author}和《${title}》
- 体现诗词的真实内容和价值
- 必须有阿拉伯数字增强冲击力
- 使用反转或纠正误解的角度

## 精准爆款技巧：
**内容反转**：针对这首诗的具体误解进行反转
**价值突出**：强调这首诗对现代人的实际意义  
**数字震撼**：用数据强化影响力（但要贴合内容）
**收藏引导**：暗示内容的珍贵价值

请基于具体内容分析，生成一个精准的100万+标题。`,

                // 第2个标题：内容分析 + 人生智慧风格  
                `请为${author}的《${title}》生成一个精准的100万+人生智慧标题！

## 第一步：深度分析诗词的人生价值
请分析这首诗包含的：
1. **人生智慧**：这首诗传达了什么人生哲理？对现代人的生活有什么指导意义？
2. **成功要素**：从这首诗中能提炼出什么成功法则或生活智慧？
3. **现代应用**：这些古代智慧如何应用到现代职场、人际、生活中？
4. **价值转化**：为什么这首诗值得现代人深度学习和收藏？

## 第二步：生成人生智慧型标题
基于分析，生成体现以下价值的标题：
- 包含${author}和《${title}》
- 突出诗词的实用智慧价值
- 必须有阿拉伯数字强化说服力
- 暗示学会后能改变人生

## 智慧爆款技巧：
**价值转化**：将古诗智慧转化为现代成功秘诀
**权威背书**：暗示成功人士都在学习
**数字包装**：几条法则、几个秘诀、几分钟学会
**收藏必备**：强调学会受益终生

请基于具体内容分析，生成一个精准的人生智慧型100万+标题。`,

                // 第3个标题：内容分析 + 情感共鸣风格
                `请为${author}的《${title}》生成一个精准的100万+情感共鸣标题！

## 第一步：深度分析诗词的情感内核
请分析这首诗的：
1. **情感主题**：这首诗的核心情感是什么？（孤独/思念/失意/豪迈/不舍/惆怅等）
2. **现代痛点**：这种情感在现代人身上如何体现？哪些群体最能共鸣？
3. **扎心瞬间**：诗中哪个细节最能触动现代人的内心？
4. **普世价值**：这首诗反映的情感困境对现代人有什么启发？

## 第二步：生成情感共鸣型标题
基于分析，生成能引发强烈共鸣的标题：
- 包含${author}和《${title}》
- 精准戳中现代人的情感痛点
- 必须有阿拉伯数字增强传播力
- 让人看到就想点开、想共鸣

## 情感爆款技巧：
**精准戳心**：针对具体情感群体的痛点
**时代对比**：古人vs现代人的情感对照
**数字共鸣**：多少人有同样感受、多少人被触动
**转发价值**：让人想分享给有同感的朋友

请基于具体情感分析，生成一个精准的情感共鸣型100万+标题。`
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
        
        // 如果AI生成的标题不够，用100万+级别模板补充
        if (titles.length < count) {
            const fallbackTitles = [
                // 100万+神秘震撼风格
                `震撼全网！${author}《${title}》隐藏1000年的惊天真相，3000万人看完都沉默了`,
                `99.9%的人都理解错了！${author}《${title}》背后的5个惊人秘密，专家都震惊`,
                
                // 100万+逆袭成功风格  
                `为什么马云天天背诵${author}《${title}》？7个成功密码终于曝光！`,
                `${author}《${title}》藏着的3条逆袭定律，1000万精英都在偷偷学习`,
                
                // 100万+情感暴击风格
                `${author}《${title}》写的8个字，让2000万社畜看完瞬间辞职！`,
                `古人3句话说透的道理，现代人花3000万都买不到！网友：太扎心了`,
                
                // 100万+社会现象风格
                `全网刷屏！${author}《${title}》引发5000万人深夜沉思，朋友圈都炸了`,
                `${author}一首《${title}》，竟让1000万年轻人重新思考人生！评论区沦陷了`
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