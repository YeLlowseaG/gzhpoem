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
                template = 'classic'
            } = options;

            console.log('🎨 开始生成小绿书SVG图片...');
            console.log('📝 内容长度:', content.length);

            // 1. 智能分段
            const segments = this.intelligentSegmentation(content, template);
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
     * 智能分段算法
     */
    intelligentSegmentation(content, templateName) {
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
     * 文本换行处理 - 智能换行算法
     */
    wrapText(text, fontSize, maxWidth) {
        const lines = [];
        const paragraphs = text.split('\n');
        
        // 更精确的字符宽度估算 - 考虑SVG渲染的实际宽度
        const chineseCharWidth = fontSize * 0.9;  // 中文字符宽度（稍微调小）
        const englishCharWidth = fontSize * 0.45; // 英文字符宽度
        const punctuationWidth = fontSize * 0.4;  // 标点符号宽度（更窄）
        
        // 预留一些边距，避免文字贴边
        const actualMaxWidth = maxWidth - 20;
        
        // 不能在行首的标点符号
        const endPunctuations = ['。', '，', '！', '？', '；', '：', '）', '】', '』', '》', '」', '"', '"', '、', ')', ']', '}'];
        // 不能在行尾的标点符号  
        const startPunctuations = ['（', '【', '『', '《', '「', '"', '"', '(', '[', '{'];
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push(''); // 空行
                continue;
            }

            const chars = paragraph.split('');
            let currentLine = '';
            let currentWidth = 0;

            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const nextChar = i < chars.length - 1 ? chars[i + 1] : null;
                let charWidth;
                
                // 计算字符宽度
                if (/[\u4e00-\u9fa5]/.test(char)) {
                    // 中文字符
                    charWidth = chineseCharWidth;
                } else if (/[a-zA-Z0-9]/.test(char)) {
                    // 英文字符和数字
                    charWidth = englishCharWidth;
                } else {
                    // 标点符号等
                    charWidth = punctuationWidth;
                }
                
                // 检查是否需要换行
                if (currentWidth + charWidth > actualMaxWidth && currentLine.length > 0) {
                    // 检查标点符号换行规则
                    if (endPunctuations.includes(char)) {
                        // 结尾标点符号不能换到下一行，继续添加到当前行
                        currentLine += char;
                        currentWidth += charWidth;
                    } else if (nextChar && endPunctuations.includes(nextChar)) {
                        // 如果下一个字符是结尾标点，当前字符也不换行
                        currentLine += char;
                        currentWidth += charWidth;
                    } else if (startPunctuations.includes(char)) {
                        // 开头标点符号不能单独在行尾
                        lines.push(currentLine);
                        currentLine = char;
                        currentWidth = charWidth;
                    } else {
                        // 可以换行，保存当前行，开始新行
                        lines.push(currentLine);
                        currentLine = char;
                        currentWidth = charWidth;
                    }
                } else {
                    // 不需要换行，继续添加
                    currentLine += char;
                    currentWidth += charWidth;
                }
            }

            // 添加最后一行
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
        }

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