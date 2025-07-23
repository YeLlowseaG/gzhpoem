const fs = require('fs').promises;

class SVGGenerator {
    constructor() {
        this.templates = this.getDefaultTemplates();
    }

    getDefaultTemplates() {
        return {
            classic: {
                name: '古典雅致',
                width: 750,
                height: 1334,
                background: '#f8f5f0',
                primaryColor: '#8b4513',
                secondaryColor: '#cd853f',
                textColor: '#2c2c2c',
                titleSize: 28,
                contentSize: 20,
                lineHeight: 1.8,
                padding: 60,
                maxCharsPerPage: 450,
                fontFamily: 'serif'
            },
            modern: {
                name: '现代简约',
                width: 750,
                height: 1334,
                background: '#ffffff',
                primaryColor: '#667eea',
                secondaryColor: '#f093fb',
                textColor: '#333333',
                titleSize: 30,
                contentSize: 22,
                lineHeight: 1.7,
                padding: 50,
                maxCharsPerPage: 400,
                fontFamily: 'sans-serif'
            },
            elegant: {
                name: '优雅文艺',
                width: 750,
                height: 1334,
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                primaryColor: '#8b4513',
                secondaryColor: '#d4af37',
                textColor: '#444444',
                titleSize: 26,
                contentSize: 18,
                lineHeight: 2.0,
                padding: 55,
                maxCharsPerPage: 500,
                fontFamily: 'serif'
            }
        };
    }

    /**
     * 智能分段生成多张图片
     */
    async generateImages(content, options = {}) {
        try {
            const {
                title = '诗词赏析',
                author = '',
                template = 'classic',
                aiService = null,
                useAIGeneration = false  // 新增：是否使用完全AI生成
            } = options;

            console.log('🎨 开始生成小绿书图片...');
            console.log('📝 内容长度:', content.length);
            console.log('🤖 AI生成模式:', useAIGeneration ? '完全AI生成' : 'SVG模板生成');

            // 如果启用完全AI生成
            if (useAIGeneration && aiService && aiService.isConfigured()) {
                return await this.generateWithFullAI(content, { title, author, template, aiService });
            }

            // 1. 智能分段（支持AI）
            const segments = await this.intelligentSegmentation(content, template, aiService);
            console.log('📄 分段结果:', segments.length, '页');

            // 2. 生成每页SVG
            const images = [];
            for (let i = 0; i < segments.length; i++) {
                const pageImage = await this.generateSinglePageSVG({
                    content: segments[i],
                    title: i === 0 ? title : `${title} (${i + 1}/${segments.length})`,
                    author: i === 0 ? author : '',
                    template,
                    pageNumber: i + 1,
                    totalPages: segments.length
                });

                if (pageImage) {
                    images.push(pageImage);
                    console.log(`✅ 第${i + 1}页生成完成`);
                }
            }

            console.log('🎉 小绿书图片生成完成, 共', images.length, '张');
            return {
                success: true,
                images: images,
                totalPages: images.length,
                template: this.templates[template].name
            };

        } catch (error) {
            console.error('❌ 生成小绿书图片失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 智能分段算法 - 优先使用AI，降级到基础算法
     */
    async intelligentSegmentation(content, templateName, aiService = null) {
        const template = this.templates[templateName];
        const maxChars = template.maxCharsPerPage;
        
        // 清理内容，移除markdown语法
        let cleanContent = content
            .replace(/#{1,6}\s/g, '') // 移除标题符号
            .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
            .replace(/\*(.*?)\*/g, '$1') // 移除斜体
            .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
            .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
            .replace(/`(.*?)`/g, '$1') // 移除代码
            .replace(/---+/g, '') // 移除分隔线
            .trim();

        // 尝试使用AI智能分段
        if (aiService && aiService.isConfigured()) {
            try {
                console.log('🤖 尝试使用AI进行智能分段...');
                const aiSegments = await this.aiSmartSegmentation(cleanContent, maxChars, aiService);
                if (aiSegments && aiSegments.length > 0) {
                    console.log(`✅ AI分段成功，共${aiSegments.length}段`);
                    return aiSegments;
                }
            } catch (error) {
                console.warn('⚠️ AI分段失败，降级到基础算法:', error.message);
            }
        }

        // 降级到基础分段算法
        console.log('📝 使用基础分段算法...');
        const basicSegments = this.basicSegmentation(cleanContent, maxChars);
        console.log(`📝 基础分段结果: ${basicSegments.length}段`);
        if (basicSegments.length === 0) {
            console.error('❌ 基础分段也失败了，返回原文');
            return [cleanContent];
        }
        return basicSegments;
    }

    /**
     * AI智能分段与排版
     */
    async aiSmartSegmentation(content, maxCharsPerPage, aiService) {
        const prompt = `请帮我将以下文章内容智能分段并优化排版，用于制作手机端图片卡片（宽度750px）：

原文内容：
${content}

任务要求：
1. **智能分段**：每段控制在${Math.floor(maxCharsPerPage * 0.8)}-${maxCharsPerPage}字符，在语义完整位置分段
2. **排版优化**：每行控制在25-30个字符以内，确保手机端阅读舒适
3. **内容清理**：移除多余的链接、图片标记等干扰内容
4. **格式美化**：保持段落结构清晰，适当使用空行分隔

输出格式：每段之间用"---"分隔，段内文字按行排列，每行不超过30字符

示例输出：
身安不如心安，屋宽不如心宽。
——《增广贤文》

很多人到死也没弄明白，自己为什么
会生病？大多数的疾病，都是由于家
庭不和，亲人之间的情绪造成的。

---

当你不开心的时候，就想想自己还有
多少天可以折腾，还有多少时间能你
挥霍。人一旦没了健康，伴侣、孩子
或许都不是你的。

---

请开始处理：`;

        const result = await aiService.generateWithAI({
            author: '', 
            title: '智能分段', 
            style: 'popular', 
            keywords: '', 
            content: prompt
        });

        if (result && result.content) {
            // 解析AI返回的分段结果
            const segments = result.content
                .split('---')
                .map(segment => segment.trim())
                .filter(segment => segment.length > 0);
            
            // 验证分段结果
            const validSegments = segments.filter(segment => {
                return segment.length > 50 && segment.length <= maxCharsPerPage * 1.2;
            });

            if (validSegments.length > 0) {
                return validSegments;
            }
        }

        return null;
    }

    /**
     * 基础分段算法（降级方案）
     */
    basicSegmentation(cleanContent, maxChars) {
        // 按段落分割
        const paragraphs = cleanContent.split(/\n\s*\n/).filter(p => p.trim());
        const segments = [];
        let currentSegment = '';

        for (const paragraph of paragraphs) {
            const cleanParagraph = paragraph.trim();
            
            // 如果当前段落加上已有内容超过限制
            if (currentSegment.length + cleanParagraph.length > maxChars && currentSegment.length > 0) {
                // 保存当前分段
                segments.push(currentSegment.trim());
                currentSegment = cleanParagraph;
            } else {
                // 添加到当前分段
                if (currentSegment.length > 0) {
                    currentSegment += '\n\n' + cleanParagraph;
                } else {
                    currentSegment = cleanParagraph;
                }
            }
        }

        // 添加最后一个分段
        if (currentSegment.trim().length > 0) {
            segments.push(currentSegment.trim());
        }

        // 如果没有分段成功，强制按字符数分割
        if (segments.length === 0) {
            const chunks = [];
            for (let i = 0; i < cleanContent.length; i += maxChars) {
                chunks.push(cleanContent.substring(i, i + maxChars));
            }
            return chunks;
        }

        return segments;
    }

    /**
     * 完全AI生成模式 - 让AI处理分段、排版和图片生成
     */
    async generateWithFullAI(content, options) {
        const { title, author, template, aiService } = options;
        
        try {
            console.log('🤖 启动完全AI生成模式...');
            
            // 第一步：AI智能分段和排版
            const segments = await this.aiSmartSegmentation(content, this.templates[template].maxCharsPerPage, aiService);
            
            if (!segments || segments.length === 0) {
                throw new Error('AI分段失败');
            }

            console.log(`📄 AI分段完成，共${segments.length}页`);

            // 第二步：为每个分段生成AI图片
            const images = [];
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                
                try {
                    console.log(`🎨 正在为第${i + 1}页生成AI图片...`);
                    
                    // 简化的图片生成提示词
                    const imagePrompt = `${this.templates[template].name}风格的文字卡片背景图，${template === 'classic' ? '古典雅致' : template === 'modern' ? '现代简约' : '优雅文艺'}，温暖色调，简洁美观，高质量，4k分辨率`;

                    // 调用AI图片生成
                    const aiImageResult = await aiService.generateCoverImage({
                        author: author || '诗词',
                        title: `${title}-第${i + 1}页`,
                        content: segment,
                        style: template,
                        customPrompt: imagePrompt
                    });

                    if (aiImageResult && aiImageResult.success) {
                        images.push({
                            aiGenerated: true,
                            imageUrl: aiImageResult.url,
                            dataUrl: aiImageResult.url,
                            content: segment,
                            pageNumber: i + 1,
                            width: 750,
                            height: 1334
                        });
                        console.log(`✅ 第${i + 1}页AI图片生成成功`);
                    } else {
                        // AI图片生成失败，降级到SVG
                        console.log(`⚠️ 第${i + 1}页AI图片生成失败，降级到SVG`);
                        const svgImage = await this.generateSinglePageSVG({
                            content: segment,
                            title: i === 0 ? title : '',
                            author: i === 0 ? author : '',
                            template: template,
                            pageNumber: i + 1,
                            totalPages: segments.length
                        });
                        
                        if (svgImage) {
                            images.push(svgImage);
                        }
                    }
                } catch (error) {
                    console.error(`❌ 第${i + 1}页生成失败:`, error);
                    // 降级到SVG生成
                    const svgImage = await this.generateSinglePageSVG({
                        content: segment,
                        title: i === 0 ? title : '',
                        author: i === 0 ? author : '',
                        template: template,
                        pageNumber: i + 1,
                        totalPages: segments.length
                    });
                    
                    if (svgImage) {
                        images.push(svgImage);
                    }
                }
            }

            console.log('🎉 完全AI生成完成, 共', images.length, '张图片');
            return {
                success: true,
                images: images,
                totalPages: images.length,
                template: this.templates[template].name,
                generationMode: 'Full AI'
            };

        } catch (error) {
            console.error('❌ 完全AI生成失败:', error);
            // 降级到常规SVG生成
            console.log('📝 降级到SVG生成模式...');
            return await this.generateImages(content, { ...options, useAIGeneration: false });
        }
    }

    /**
     * 生成单页SVG
     */
    async generateSinglePageSVG(options) {
        const {
            content,
            title,
            author,
            template: templateName,
            pageNumber,
            totalPages
        } = options;

        const template = this.templates[templateName];

        try {
            // 构建SVG内容
            let svgContent = this.createSVGHeader(template);
            
            // 1. 绘制背景
            svgContent += this.createBackground(template);

            // 2. 绘制标题（仅第一页）
            let yPosition = template.padding;
            if (pageNumber === 1 && title) {
                const titleSVG = this.createTitle(title, author, template, yPosition);
                svgContent += titleSVG.svg;
                yPosition = titleSVG.nextY + 40; // 标题和内容间距
            }

            // 3. 绘制正文内容
            const contentSVG = this.createContent(content, template, yPosition);
            svgContent += contentSVG.svg;

            // 4. 绘制页码和水印
            svgContent += this.createFooter(template, pageNumber, totalPages);

            // 5. 闭合SVG
            svgContent += '</svg>';

            // 6. 转换为base64
            const base64SVG = Buffer.from(svgContent).toString('base64');

            return {
                svg: svgContent,
                base64: base64SVG,
                dataUrl: `data:image/svg+xml;base64,${base64SVG}`,
                width: template.width,
                height: template.height,
                pageNumber: pageNumber
            };

        } catch (error) {
            console.error(`生成第${pageNumber}页失败:`, error);
            return null;
        }
    }

    /**
     * 创建SVG头部
     */
    createSVGHeader(template) {
        return `<svg width="${template.width}" height="${template.height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>
                    .title-text { font-family: ${template.fontFamily}; font-weight: bold; font-size: ${template.titleSize}px; fill: ${template.primaryColor}; }
                    .author-text { font-family: ${template.fontFamily}; font-size: ${template.titleSize * 0.6}px; fill: ${template.secondaryColor}; }
                    .content-text { font-family: ${template.fontFamily}; font-size: ${template.contentSize}px; fill: ${template.textColor}; }
                    .footer-text { font-family: ${template.fontFamily}; font-size: 16px; fill: ${template.secondaryColor}; }
                    .watermark-text { font-family: ${template.fontFamily}; font-size: 14px; fill: rgba(0, 0, 0, 0.1); }
                </style>
            </defs>`;
    }

    /**
     * 创建背景
     */
    createBackground(template) {
        if (template.background.startsWith('linear-gradient')) {
            // 渐变背景
            return `
                <defs>
                    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#ffecd2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#fcb69f;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#bg-gradient)" />
                <!-- 纹理效果 -->
                <circle cx="100" cy="200" r="30" fill="rgba(255, 255, 255, 0.05)" />
                <circle cx="650" cy="400" r="25" fill="rgba(255, 255, 255, 0.05)" />
                <circle cx="200" cy="800" r="35" fill="rgba(255, 255, 255, 0.05)" />
                <circle cx="550" cy="1000" r="20" fill="rgba(255, 255, 255, 0.05)" />`;
        } else {
            // 纯色背景
            return `
                <rect width="100%" height="100%" fill="${template.background}" />
                <!-- 纹理效果 -->
                <circle cx="100" cy="200" r="30" fill="rgba(255, 255, 255, 0.05)" />
                <circle cx="650" cy="400" r="25" fill="rgba(255, 255, 255, 0.05)" />
                <circle cx="200" cy="800" r="35" fill="rgba(255, 255, 255, 0.05)" />
                <circle cx="550" cy="1000" r="20" fill="rgba(255, 255, 255, 0.05)" />`;
        }
    }

    /**
     * 创建标题
     */
    createTitle(title, author, template, startY) {
        const centerX = template.width / 2;
        let titleY = startY + template.titleSize;
        
        let svg = `<text x="${centerX}" y="${titleY}" text-anchor="middle" class="title-text">${this.escapeXML(title)}</text>`;
        
        if (author) {
            const authorY = titleY + template.titleSize * 0.8;
            svg += `<text x="${centerX}" y="${authorY}" text-anchor="middle" class="author-text">—— ${this.escapeXML(author)}</text>`;
            return { svg, nextY: authorY + 20 };
        }
        
        return { svg, nextY: titleY + 20 };
    }

    /**
     * 创建正文内容
     */
    createContent(content, template, startY) {
        const maxWidth = template.width - template.padding * 2;
        const lines = this.wrapText(content, template.contentSize, maxWidth);
        
        let svg = '';
        let y = startY + template.contentSize;
        
        for (const line of lines) {
            if (line.trim() === '') {
                // 空行
                y += template.contentSize * template.lineHeight * 0.5;
            } else {
                svg += `<text x="${template.padding}" y="${y}" class="content-text">${this.escapeXML(line)}</text>`;
                y += template.contentSize * template.lineHeight;
            }
            
            // 防止内容超出页面
            if (y > template.height - 100) {
                break;
            }
        }
        
        return { svg, nextY: y };
    }

    /**
     * 文本换行处理 - 简化但可靠的换行算法
     */
    wrapText(text, fontSize, maxWidth) {
        const lines = [];
        const paragraphs = text.split('\n');
        
        // 暴力解决：直接固定每行字符数，不再瞎猜字符宽度
        let maxCharsPerLine;
        if (fontSize >= 24) {
            maxCharsPerLine = 20; // 大字体
        } else if (fontSize >= 20) {
            maxCharsPerLine = 25; // 中字体  
        } else {
            maxCharsPerLine = 30; // 小字体
        }
        
        console.log(`暴力换行: fontSize=${fontSize}, 固定每行${maxCharsPerLine}字符`);
        
        // 不能在行首的标点符号
        const endPunctuations = ['。', '，', '！', '？', '；', '：', '）', '】', '』', '》', '」', '"', '"', '、', ')', ']', '}'];
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push(''); // 空行
                continue;
            }

            // 简化逻辑：直接按字符数量换行，但考虑标点符号规则
            const chars = paragraph.split('');
            let currentLine = '';

            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const nextChar = i < chars.length - 1 ? chars[i + 1] : null;
                
                // 检查是否需要换行 - 暴力简单版本
                if (currentLine.length >= maxCharsPerLine) {
                    // 检查标点符号换行规则
                    if (endPunctuations.includes(char)) {
                        // 结尾标点符号不能换到下一行
                        currentLine += char;
                    } else if (nextChar && endPunctuations.includes(nextChar)) {
                        // 如果下一个字符是结尾标点，当前字符也不换行
                        currentLine += char;
                    } else {
                        // 可以换行
                        lines.push(currentLine);
                        currentLine = char;
                    }
                } else {
                    // 不需要换行，继续添加
                    currentLine += char;
                }
            }

            // 添加最后一行
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
        }

        console.log(`换行结果: 原文${text.length}字符, 分成${lines.length}行`);
        return lines;
    }

    /**
     * 创建页脚
     */
    createFooter(template, pageNumber, totalPages) {
        const centerX = template.width / 2;
        const footerY = template.height - template.padding;
        
        let svg = '';
        
        // 页码
        if (totalPages > 1) {
            svg += `<text x="${centerX}" y="${footerY}" text-anchor="middle" class="footer-text">${pageNumber} / ${totalPages}</text>`;
        }
        
        // 水印
        svg += `<text x="${template.width - 20}" y="${template.height - 20}" text-anchor="end" class="watermark-text">最美诗词</text>`;
        
        return svg;
    }

    /**
     * XML转义
     */
    escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 获取可用模板列表
     */
    getTemplates() {
        return Object.entries(this.templates).map(([key, template]) => ({
            id: key,
            name: template.name,
            preview: {
                width: template.width,
                height: template.height,
                background: template.background,
                primaryColor: template.primaryColor
            }
        }));
    }
}

module.exports = SVGGenerator;