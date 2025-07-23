const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

class ImageGenerator {
    constructor() {
        this.templates = this.getDefaultTemplates();
        // 注册中文字体（如果有的话）
        this.initFonts();
    }

    async initFonts() {
        try {
            // 尝试注册系统中文字体
            // macOS/Linux 用户可能需要调整字体路径
            const fontPaths = [
                '/System/Library/Fonts/PingFang.ttc',
                '/System/Library/Fonts/STHeiti Light.ttc',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
            ];
            
            for (const fontPath of fontPaths) {
                try {
                    registerFont(fontPath, { family: 'Chinese' });
                    console.log('✅ 成功注册字体:', fontPath);
                    break;
                } catch (err) {
                    // 继续尝试下一个字体
                }
            }
        } catch (error) {
            console.log('⚠️ 字体注册失败，使用默认字体');
        }
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
                titleSize: 32,
                contentSize: 24,
                lineHeight: 1.8,
                padding: 40,
                maxCharsPerPage: 400
            },
            modern: {
                name: '现代简约',
                width: 750,
                height: 1334,
                background: '#ffffff',
                primaryColor: '#667eea',
                secondaryColor: '#f093fb',
                textColor: '#333333',
                titleSize: 36,
                contentSize: 26,
                lineHeight: 1.6,
                padding: 50,
                maxCharsPerPage: 350
            },
            elegant: {
                name: '优雅文艺',
                width: 750,
                height: 1334,
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                primaryColor: '#8b4513',
                secondaryColor: '#d4af37',
                textColor: '#444444',
                titleSize: 30,
                contentSize: 22,
                lineHeight: 1.9,
                padding: 45,
                maxCharsPerPage: 380
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

            console.log('🎨 开始生成小绿书图片...');
            console.log('📝 内容长度:', content.length);

            // 1. 智能分段
            const segments = this.intelligentSegmentation(content, template);
            console.log('📄 分段结果:', segments.length, '页');

            // 2. 生成每页图片
            const images = [];
            for (let i = 0; i < segments.length; i++) {
                const pageImage = await this.generateSinglePage({
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
        
        // 按段落分割
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
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
            for (let i = 0; i < content.length; i += maxChars) {
                chunks.push(content.substring(i, i + maxChars));
            }
            return chunks;
        }

        return segments;
    }

    /**
     * 生成单页图片
     */
    async generateSinglePage(options) {
        const {
            content,
            title,
            author,
            template: templateName,
            pageNumber,
            totalPages
        } = options;

        const template = this.templates[templateName];
        const canvas = createCanvas(template.width, template.height);
        const ctx = canvas.getContext('2d');

        try {
            // 1. 绘制背景
            await this.drawBackground(ctx, template);

            // 2. 绘制标题（仅第一页）
            let yPosition = template.padding;
            if (pageNumber === 1 && title) {
                yPosition = await this.drawTitle(ctx, title, author, template, yPosition);
                yPosition += 40; // 标题和内容间距
            }

            // 3. 绘制正文内容
            yPosition = await this.drawContent(ctx, content, template, yPosition);

            // 4. 绘制页码和装饰
            await this.drawFooter(ctx, template, pageNumber, totalPages);

            // 5. 添加水印
            await this.drawWatermark(ctx, template);

            // 6. 转换为base64
            const imageBuffer = canvas.toBuffer('image/png');
            const base64Image = imageBuffer.toString('base64');

            return {
                base64: base64Image,
                buffer: imageBuffer,
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
     * 绘制背景
     */
    async drawBackground(ctx, template) {
        const { width, height, background } = template;

        if (background.startsWith('linear-gradient')) {
            // 渐变背景
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#ffecd2');
            gradient.addColorStop(1, '#fcb69f');
            ctx.fillStyle = gradient;
        } else {
            // 纯色背景
            ctx.fillStyle = background;
        }

        ctx.fillRect(0, 0, width, height);

        // 添加微妙的纹理
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * width,
                Math.random() * height,
                Math.random() * 50 + 10,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    /**
     * 绘制标题
     */
    async drawTitle(ctx, title, author, template, startY) {
        const { width, padding, titleSize, primaryColor, secondaryColor } = template;

        // 标题
        ctx.font = `bold ${titleSize}px Chinese, serif`;
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'center';
        
        const titleY = startY + titleSize;
        ctx.fillText(title, width / 2, titleY);

        // 作者
        if (author) {
            ctx.font = `${titleSize * 0.6}px Chinese, serif`;
            ctx.fillStyle = secondaryColor;
            const authorY = titleY + titleSize * 0.8;
            ctx.fillText(`—— ${author}`, width / 2, authorY);
            return authorY + 20;
        }

        return titleY + 20;
    }

    /**
     * 绘制正文内容
     */
    async drawContent(ctx, content, template, startY) {
        const { width, padding, contentSize, lineHeight, textColor } = template;
        
        ctx.font = `${contentSize}px Chinese, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';

        const maxWidth = width - padding * 2;
        const lines = this.wrapText(ctx, content, maxWidth);
        
        let y = startY;
        for (const line of lines) {
            ctx.fillText(line, padding, y);
            y += contentSize * lineHeight;
        }

        return y;
    }

    /**
     * 文本换行处理
     */
    wrapText(ctx, text, maxWidth) {
        const lines = [];
        const paragraphs = text.split('\n');

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push(''); // 空行
                continue;
            }

            const words = paragraph.split('');
            let currentLine = '';

            for (const char of words) {
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    /**
     * 绘制页脚
     */
    async drawFooter(ctx, template, pageNumber, totalPages) {
        const { width, height, padding, secondaryColor } = template;

        ctx.font = '16px Chinese, sans-serif';
        ctx.fillStyle = secondaryColor;
        ctx.textAlign = 'center';

        // 页码
        if (totalPages > 1) {
            ctx.fillText(`${pageNumber} / ${totalPages}`, width / 2, height - padding);
        }
    }

    /**
     * 绘制水印
     */
    async drawWatermark(ctx, template) {
        const { width, height } = template;

        ctx.font = '14px Chinese, sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.textAlign = 'right';
        ctx.fillText('最美诗词', width - 20, height - 20);
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

module.exports = ImageGenerator;