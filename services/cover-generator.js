const axios = require('axios');

class CoverGenerator {
    constructor() {
        this.textCoverTemplates = [
            {
                id: 'classic',
                name: '经典风',
                background: '#f4f1e8',
                primaryColor: '#8b4513',
                secondaryColor: '#cd853f',
                font: '楷体',
                style: 'classic'
            },
            {
                id: 'modern',
                name: '现代风',
                background: '#f8f9fa',
                primaryColor: '#495057',
                secondaryColor: '#6c757d',
                font: '微软雅黑',
                style: 'modern'
            },
            {
                id: 'elegant',
                name: '雅致风',
                background: '#fdf6e3',
                primaryColor: '#657b83',
                secondaryColor: '#93a1a1',
                font: '宋体',
                style: 'elegant'
            },
            {
                id: 'poetry',
                name: '诗意风',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                primaryColor: '#ffffff',
                secondaryColor: '#f8f9fa',
                font: '华文行楷',
                style: 'poetry'
            }
        ];
    }

    /**
     * 生成文字封面
     */
    async generateTextCover(author, title, style = 'classic') {
        try {
            // 生成文字封面设计
            const coverDesign = await this.createTextCoverDesign(author, title, style);
            
            // 生成HTML封面
            const htmlCover = this.generateHTMLCover(coverDesign);
            
            // 如果可能，生成图片封面
            const imageCover = await this.generateImageCover(coverDesign);
            
            return {
                success: true,
                design: coverDesign,
                html: htmlCover,
                image: imageCover,
                type: 'text'
            };
        } catch (error) {
            console.error('生成文字封面失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 创建文字封面设计
     */
    async createTextCoverDesign(author, title, style) {
        const template = this.textCoverTemplates.find(t => t.id === style) || this.textCoverTemplates[0];
        
        // 生成装饰元素
        const decorativeElements = this.generateDecorativeElements(author, title);
        
        // 生成AI增强的设计元素
        const aiEnhancement = await this.generateAIEnhancement(author, title, style);
        
        return {
            template,
            author,
            title,
            decorativeElements,
            aiEnhancement,
            layout: this.calculateLayout(author, title),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 生成装饰元素
     */
    generateDecorativeElements(author, title) {
        const elements = [];
        
        // 根据作者添加朝代背景
        const dynasty = this.guessDynasty(author);
        if (dynasty) {
            elements.push({
                type: 'dynasty',
                value: dynasty,
                position: 'top-right',
                style: 'small'
            });
        }
        
        // 添加诗词相关装饰
        const poetrySymbols = ['🌸', '🍃', '🌙', '⭐', '🌿', '🏮', '📜', '🖋️'];
        const randomSymbol = poetrySymbols[Math.floor(Math.random() * poetrySymbols.length)];
        elements.push({
            type: 'symbol',
            value: randomSymbol,
            position: 'decoration',
            style: 'accent'
        });
        
        // 添加边框装饰
        elements.push({
            type: 'border',
            value: 'classical',
            position: 'frame',
            style: 'elegant'
        });
        
        return elements;
    }

    /**
     * 生成AI增强的设计元素
     */
    async generateAIEnhancement(author, title, style) {
        try {
            const prompt = `为${author}的《${title}》设计一个文字封面，请提供以下元素：

1. 一句简短的诗词意境描述（10字以内）
2. 适合的颜色搭配建议（主色调）
3. 排版布局建议

请以JSON格式返回：
{
    "mood": "意境描述",
    "colorScheme": "颜色方案",
    "layout": "布局建议"
}`;

            const qwenKey = process.env.QWEN_API_KEY;
            if (!qwenKey) {
                return this.getDefaultAIEnhancement(author, title);
            }

            const response = await axios.post(
                'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                {
                    model: 'qwen-turbo',
                    input: {
                        messages: [{ role: 'user', content: prompt }]
                    },
                    parameters: {
                        result_format: 'message',
                        max_tokens: 200,
                        temperature: 0.7
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
                const content = response.data.output.choices[0].message.content;
                try {
                    return JSON.parse(content);
                } catch (e) {
                    return this.parseAIResponse(content);
                }
            }
        } catch (error) {
            console.error('AI增强失败:', error.message);
        }
        
        return this.getDefaultAIEnhancement(author, title);
    }

    /**
     * 解析AI响应
     */
    parseAIResponse(content) {
        const lines = content.split('\n');
        const result = {};
        
        lines.forEach(line => {
            if (line.includes('意境') || line.includes('mood')) {
                result.mood = line.replace(/.*[:：]/, '').trim();
            }
            if (line.includes('颜色') || line.includes('color')) {
                result.colorScheme = line.replace(/.*[:：]/, '').trim();
            }
            if (line.includes('布局') || line.includes('layout')) {
                result.layout = line.replace(/.*[:：]/, '').trim();
            }
        });
        
        return result;
    }

    /**
     * 获取默认AI增强
     */
    getDefaultAIEnhancement(author, title) {
        const moodMap = {
            '李白': '飘逸洒脱',
            '杜甫': '沉郁顿挫',
            '王维': '淡雅清新',
            '白居易': '平易近人',
            '苏轼': '豪放旷达',
            '李清照': '婉约细腻'
        };
        
        return {
            mood: moodMap[author] || '诗意盎然',
            colorScheme: '古典雅致',
            layout: '居中对称'
        };
    }

    /**
     * 计算布局
     */
    calculateLayout(author, title) {
        const titleLength = title.length;
        const authorLength = author.length;
        
        return {
            titleFontSize: titleLength > 6 ? '32px' : '36px',
            authorFontSize: authorLength > 3 ? '18px' : '20px',
            spacing: titleLength > 8 ? '20px' : '30px',
            alignment: 'center',
            titlePosition: 'center',
            authorPosition: 'bottom-right'
        };
    }

    /**
     * 生成HTML封面
     */
    generateHTMLCover(design) {
        const { template, author, title, decorativeElements, aiEnhancement, layout } = design;
        
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${author} - ${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: '${template.font}', serif;
            background: ${template.background};
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        .cover-container {
            width: 400px;
            height: 600px;
            background: ${template.background};
            border: 3px solid ${template.primaryColor};
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .title {
            font-size: ${layout.titleFontSize};
            color: ${template.primaryColor};
            text-align: center;
            margin-bottom: ${layout.spacing};
            font-weight: bold;
            line-height: 1.2;
            max-width: 80%;
        }
        
        .author {
            font-size: ${layout.authorFontSize};
            color: ${template.secondaryColor};
            text-align: center;
            margin-top: 20px;
        }
        
        .author::before {
            content: "—— ";
        }
        
        .decoration {
            position: absolute;
            font-size: 24px;
            opacity: 0.3;
        }
        
        .decoration.top-left {
            top: 20px;
            left: 20px;
        }
        
        .decoration.top-right {
            top: 20px;
            right: 20px;
        }
        
        .decoration.bottom-left {
            bottom: 20px;
            left: 20px;
        }
        
        .decoration.bottom-right {
            bottom: 20px;
            right: 20px;
        }
        
        .mood {
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            color: ${template.secondaryColor};
            opacity: 0.8;
        }
        
        .border-decoration {
            position: absolute;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        
        .border-decoration::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 15px;
            right: 15px;
            bottom: 15px;
            border: 1px solid ${template.secondaryColor};
            opacity: 0.5;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="cover-container">
        <div class="border-decoration"></div>
        
        ${decorativeElements.map(elem => 
            elem.type === 'symbol' ? 
            `<div class="decoration top-left">${elem.value}</div>
             <div class="decoration top-right">${elem.value}</div>
             <div class="decoration bottom-left">${elem.value}</div>
             <div class="decoration bottom-right">${elem.value}</div>` : ''
        ).join('')}
        
        <div class="title">${title}</div>
        <div class="author">${author}</div>
        
        ${aiEnhancement && aiEnhancement.mood ? 
            `<div class="mood">${aiEnhancement.mood}</div>` : ''
        }
    </div>
</body>
</html>`;
    }

    /**
     * 生成图片封面（如果有图片生成API）
     */
    async generateImageCover(design) {
        // 这里可以集成图片生成API（如DALL-E、Midjourney等）
        // 目前返回HTML到图片的转换建议
        
        return {
            type: 'html_to_image',
            html: this.generateHTMLCover(design),
            instructions: '可以使用puppeteer或其他工具将HTML转换为图片',
            recommendedSize: '800x1200',
            format: 'png'
        };
    }

    /**
     * 生成多种风格的封面
     */
    async generateMultipleCovers(author, title, styles = ['classic', 'modern', 'elegant']) {
        const covers = [];
        
        for (const style of styles) {
            try {
                const cover = await this.generateTextCover(author, title, style);
                if (cover.success) {
                    covers.push({
                        style,
                        ...cover
                    });
                }
            } catch (error) {
                console.error(`生成${style}风格封面失败:`, error);
            }
        }
        
        return covers;
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
            '欧阳修': '宋',
            '柳永': '宋',
            '周邦彦': '宋'
        };
        
        return dynastyMap[author] || null;
    }

    /**
     * 验证封面质量
     */
    validateCover(cover) {
        const issues = [];
        
        if (!cover.design) {
            issues.push('缺少设计信息');
        }
        
        if (!cover.html) {
            issues.push('缺少HTML代码');
        }
        
        if (cover.design && cover.design.title && cover.design.title.length > 20) {
            issues.push('标题过长，可能影响显示效果');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            score: Math.max(0, 100 - issues.length * 25)
        };
    }
}

module.exports = CoverGenerator;