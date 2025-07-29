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
     * 两层封面图策略：Unsplash API + 本地兜底
     */
    async generateWebCover(author, title, style = 'classic') {
        try {
            console.log(`🎨 开始生成封面: ${author} - ${title}`);
            
            // 第一层：根据诗词内容生成搜索关键词，改进在线图片服务
            const searchKeywords = this.generatePoetryKeywords(author, title, style);
            console.log(`🔍 搜索关键词: ${searchKeywords}`);
            
            const imageUrl = await this.fetchFromOnlineServices(searchKeywords, author, title);
            
            if (imageUrl) {
                console.log(`✅ 在线图片获取成功: ${imageUrl}`);
                return {
                    success: true,
                    imageUrl: imageUrl,
                    type: 'web_image',
                    source: 'online_service',
                    keywords: searchKeywords
                };
            }
            
            console.log('⚠️ 在线图片获取失败，切换到本地兜底图片');
            
        } catch (error) {
            console.error('🚨 在线图片服务调用失败:', error.message);
        }
        
        // 第二层：本地兜底封面（你的cover-1.jpg和cover-2.jpg）
        try {
            const localImagePath = await this.getLocalCoverImage();
            if (localImagePath) {
                console.log(`✅ 使用本地兜底封面: ${localImagePath}`);
                return {
                    success: true,
                    imageUrl: localImagePath,
                    type: 'local_image',
                    source: 'local_fallback'
                };
            }
        } catch (error) {
            console.error('🚨 本地封面图片也失败:', error.message);
        }
        
        // 最终保障：返回失败，让系统生成文字封面
        console.log('❌ 所有封面图片获取失败');
        return {
            success: false,
            error: '无法获取封面图片'
        };
    }

    /**
     * 智能生成诗词相关搜索关键词
     */
    generatePoetryKeywords(author, title, style) {
        // 诗人特色关键词映射
        const authorKeywords = {
            '李白': ['mountains', 'moon', 'waterfall', 'river', 'wine', 'ancient china'],
            '杜甫': ['spring flowers', 'autumn leaves', 'traditional house', 'melancholy', 'chinese landscape'],
            '王维': ['bamboo', 'quiet', 'zen', 'meditation', 'peaceful nature'],
            '白居易': ['lake', 'simple life', 'countryside', 'calm water', 'traditional'],
            '苏轼': ['bold landscape', 'magnificent', 'river view', 'heroic', 'vast'],
            '李清照': ['delicate flowers', 'graceful', 'feminine', 'tender', 'elegant'],
            '辛弃疾': ['warrior', 'battlefield', 'heroic', 'strong', 'patriotic'],
            '陆游': ['patriotic', 'hometown', 'dedication', 'loyal', 'chinese culture']
        };

        // 题目关键词提取
        const titleKeywords = this.extractTitleKeywords(title);
        
        // 风格关键词
        const styleKeywords = {
            'classic': ['traditional', 'ancient', 'classical'],
            'modern': ['contemporary', 'artistic', 'minimalist'],
            'elegant': ['elegant', 'refined', 'sophisticated'],
            'poetry': ['poetic', 'lyrical', 'romantic']
        };

        // 组合关键词
        const keywords = [
            ...(authorKeywords[author] || ['chinese poetry', 'ancient', 'traditional']),
            ...titleKeywords,
            ...(styleKeywords[style] || []),
            'chinese culture',
            'artistic'
        ];

        // 随机选择3-4个关键词
        const selectedKeywords = this.shuffleArray(keywords).slice(0, 4);
        return selectedKeywords.join(' ');
    }

    /**
     * 从标题提取关键词
     */
    extractTitleKeywords(title) {
        const keywordMap = {
            '静夜思': ['night', 'moon', 'quiet', 'contemplation'],
            '望庐山瀑布': ['waterfall', 'mountain', 'magnificent'],
            '春晓': ['spring', 'morning', 'flowers', 'birds'],
            '登鹳雀楼': ['tower', 'river', 'sunset', 'vast view'],
            '相思': ['love', 'longing', 'red beans', 'romance'],
            '枫桥夜泊': ['bridge', 'night', 'boat', 'temple'],
            '黄鹤楼': ['tower', 'river', 'yellow crane', 'ancient'],
            '将进酒': ['wine', 'celebration', 'joy', 'feast'],
            '水调歌头': ['moon', 'Mid-Autumn', 'reunion', 'family'],
            '念奴娇': ['river', 'historical', 'heroic', 'reflection'],
            '虞美人': ['flowers', 'beauty', 'melancholy', 'palace'],
            '青玉案': ['lantern festival', 'crowd', 'search', 'night']
        };

        // 直接匹配
        if (keywordMap[title]) {
            return keywordMap[title];
        }

        // 模糊匹配
        for (const [key, words] of Object.entries(keywordMap)) {
            if (title.includes(key.substring(0, 2))) {
                return words;
            }
        }

        // 通用诗词关键词
        return ['nature', 'peaceful', 'traditional', 'beauty'];
    }

    /**
     * 打乱数组
     */
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * 从改进的在线图片服务获取图片（使用智能关键词）
     */
    async fetchFromOnlineServices(keywords, author, title) {
        try {
            // 基于关键词的颜色主题选择
            const colorTheme = this.getColorThemeFromKeywords(keywords);
            
            // 改进的图片服务URL列表，使用智能关键词
            const imageServices = [
                // Picsum with intelligent sizing based on poetry theme
                `https://picsum.photos/600/400.jpg?random=${this.hashString(keywords)}`,
                
                // DummyImage with poetry-themed colors and text
                `https://dummyimage.com/600x400/${colorTheme.bg}/${colorTheme.text}.jpg&text=${encodeURIComponent(author + ' ' + title)}`,
                
                // Placeholder with poetry styling
                `https://via.placeholder.com/600x400/${colorTheme.bg}/${colorTheme.text}?text=${encodeURIComponent('最美诗词·' + author)}`,
                
                // LoremPicsum with nature category (more relevant for poetry)
                `https://picsum.photos/600/400?category=nature&random=${this.hashString(author + title)}`,
                
                // Backup with simple color
                `https://dummyimage.com/600x400/e8f4f8/2c3e50.jpg&text=${encodeURIComponent('诗词赏析')}`
            ];

            console.log(`🔍 使用智能关键词获取图片: ${keywords}`);
            console.log(`🎨 选择配色方案: ${colorTheme.name}`);
            
            for (const imageUrl of imageServices) {
                try {
                    console.log(`📸 尝试下载封面: ${imageUrl.substring(0, 60)}...`);
                    const response = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 8000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                        }
                    });
                    
                    const buffer = Buffer.from(response.data);
                    
                    // 检查图片大小是否合理（1KB-2MB）
                    if (buffer.length > 1000 && buffer.length < 2 * 1024 * 1024) {
                        console.log(`✅ 智能封面下载成功: ${buffer.length} bytes`);
                        return imageUrl;
                    } else {
                        console.warn(`图片大小不合适: ${buffer.length} bytes`);
                    }
                    
                } catch (error) {
                    console.warn(`下载失败: ${error.message}`);
                    continue;
                }
            }

            console.log('❌ 所有在线图片服务都失败');
            return null;

        } catch (error) {
            console.error('🚨 在线图片服务调用失败:', error.message);
            return null;
        }
    }

    /**
     * 根据关键词获取配色主题
     */
    getColorThemeFromKeywords(keywords) {
        const themes = {
            nature: { name: '自然', bg: 'e8f5e8', text: '2d5f2d' },
            moon: { name: '月夜', bg: 'e8f4f8', text: '2c3e50' },
            spring: { name: '春意', bg: 'f0f8e8', text: '4a5d23' },
            autumn: { name: '秋韵', bg: 'f8f0e8', text: '8b4513' },
            water: { name: '水韵', bg: 'e8f4ff', text: '1e3a8a' },
            mountain: { name: '山峦', bg: 'f5f5f5', text: '4a5568' },
            wine: { name: '醉意', bg: 'fdf2f8', text: '7c2d12' },
            classical: { name: '古典', bg: 'fef7e0', text: '92400e' }
        };

        const lowerKeywords = keywords.toLowerCase();
        
        if (lowerKeywords.includes('moon') || lowerKeywords.includes('night')) return themes.moon;
        if (lowerKeywords.includes('spring') || lowerKeywords.includes('flower')) return themes.spring;
        if (lowerKeywords.includes('autumn') || lowerKeywords.includes('leaf')) return themes.autumn;
        if (lowerKeywords.includes('mountain') || lowerKeywords.includes('peak')) return themes.mountain;
        if (lowerKeywords.includes('water') || lowerKeywords.includes('river')) return themes.water;
        if (lowerKeywords.includes('wine') || lowerKeywords.includes('celebration')) return themes.wine;
        if (lowerKeywords.includes('nature') || lowerKeywords.includes('bamboo')) return themes.nature;
        
        return themes.classical; // 默认古典风格
    }

    /**
     * 字符串哈希函数（用于生成稳定的随机种子）
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) % 10000;
    }

    /**
     * 获取本地兜底封面图片
     */
    async getLocalCoverImage() {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            // 本地封面图片路径
            const localCovers = [
                path.join(__dirname, '..', 'assets', 'cover-1.jpg'),
                path.join(__dirname, '..', 'assets', 'cover-2.jpg')
            ];
            
            // 检查哪些图片存在
            const availableCovers = [];
            for (const coverPath of localCovers) {
                try {
                    await fs.access(coverPath);
                    availableCovers.push(coverPath);
                    console.log(`✅ 找到本地封面: ${path.basename(coverPath)}`);
                } catch (error) {
                    console.log(`❌ 本地封面不存在: ${path.basename(coverPath)}`);
                }
            }
            
            if (availableCovers.length === 0) {
                console.log('❌ 没有找到任何本地封面图片');
                return null;
            }
            
            // 随机选择一张本地封面
            const randomIndex = Math.floor(Math.random() * availableCovers.length);
            const selectedCover = availableCovers[randomIndex];
            
            // 返回相对路径，用于Web访问
            const relativePath = `/assets/${path.basename(selectedCover)}`;
            console.log(`🎲 随机选择本地封面: ${relativePath}`);
            
            return relativePath;
            
        } catch (error) {
            console.error('🚨 获取本地封面失败:', error.message);
            return null;
        }
    }

    /**
     * 生成文字封面（保留原功能）
     */
    async generateTextCover(author, title, style = 'classic') {
        try {
            // 优先尝试获取网站封面图
            const webCover = await this.generateWebCover(author, title, style);
            if (webCover.success && webCover.imageUrl) {
                return webCover;
            }
            
            // 降级到HTML文字封面
            const coverDesign = await this.createTextCoverDesign(author, title, style);
            const htmlCover = this.generateHTMLCover(coverDesign);
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