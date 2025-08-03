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
                // 第1个标题：百万级神秘震撼风格
                `请为${author}的《${title}》生成一个100万+阅读量的震撼爆文标题！

## 100万+标题核心要求：
- 包含${author}和《${title}》
- 必须有阿拉伯数字（1000年、99%、3个字等）
- 震撼程度：让人看到立刻想点开、想转发

## 震撼爆款套路：
**反转震撼**：你以为...其实、真相竟然是、原来我们都错了、颠覆了、没想到
**数字冲击**：1000年来、99.9%的人、3000万人、第1次、仅仅3个字、只用了8个字
**收藏推荐**：必须收藏、强烈推荐、值得珍藏、赶紧收藏、建议收藏
**权威震撼**：专家都震惊、学者沉默了、史学家都承认、央视都报道了

示例100万+标题：
"你以为李白《静夜思》写思乡？真相竟然是这个！3000万人看完都收藏了"
"原来我们都被骗了1200年！王勃《滕王阁序》的3个惊天秘密，必须收藏"

请直接返回一个100万+震撼标题。`,

                // 第2个标题：百万级人生逆袭风格  
                `请为${author}的《${title}》生成一个100万+阅读量的人生逆袭爆文标题！

## 100万+标题核心要求：
- 包含${author}和《${title}》
- 必须有阿拉伯数字
- 逆袭感：让人觉得看了能改变人生

## 逆袭爆款套路：
**反转逆袭**：你以为是穷书生，其实是成功密码、原来古人早就知道、没想到竟然是
**数字成功**：5条定律、3个秘诀、第1法则、仅仅7个字、只需要8分钟
**收藏必备**：必须收藏、强烈推荐、值得珍藏一生、建议收藏转发、赶紧保存
**权威认可**：富豪都在读、精英必备、马云都背诵、成功人士都知道

示例100万+标题：
"你以为杜甫《登高》是穷酸诗？其实藏着5条逆袭秘诀，建议收藏！"
"原来马云天天背诵李白《将进酒》！7个成功密码终于曝光，必须收藏"

请直接返回一个100万+逆袭标题。`,

                // 第3个标题：百万级情感暴击风格
                `请为${author}的《${title}》生成一个100万+阅读量的情感暴击爆文标题！

## 100万+标题核心要求：
- 包含${author}和《${title}》
- 必须有阿拉伯数字
- 情感暴击：瞬间击中内心，引发强烈共鸣

## 情感暴击套路：
**反转扎心**：你以为是古诗，其实说的就是你、原来我们都被骗了、没想到这么扎心
**数字共鸣**：3000万人看哭、99%的人都沉默、仅仅5个字就破防、第1次看懂就流泪
**收藏转发**：必须收藏、建议收藏、值得转发、赶紧保存给孩子看、推荐给所有人
**全网现象**：全网刷屏、朋友圈炸了、评论区沦陷、网友都哭了

示例100万+标题：
"你以为王勃《咏风》写风景？其实说的就是你！3000万打工人看完都收藏了"
"原来古人5个字就说透的道理，现代人花500万都买不到！必须收藏转发"

请直接返回一个100万+情感暴击标题。`
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