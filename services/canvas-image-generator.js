/**
 * Canvas图片生成器 - 直接用Canvas API绘制
 * 简单可靠，不依赖HTML/CSS
 */

class CanvasImageGenerator {
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
                textColor: '#2c2c2c',
                fontSize: 24,
                lineHeight: 40,
                padding: 80,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            },
            modern: {
                name: '现代简约',
                width: 750,
                height: 1334,
                background: '#ffffff',
                textColor: '#333333',
                fontSize: 26,
                lineHeight: 42,
                padding: 70,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            },
            elegant: {
                name: '优雅文艺',
                width: 750,
                height: 1334,
                background: '#ffecd2',
                textColor: '#444444',
                fontSize: 22,
                lineHeight: 38,
                padding: 75,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            }
        };
    }

    /**
     * 生成图片
     */
    async generateImage(content, options = {}) {
        const {
            template = 'classic',
            pageNumber = 1,
            totalPages = 1
        } = options;

        const templateConfig = this.templates[template];
        
        try {
            // 创建Canvas
            const canvas = this.createCanvas();
            const ctx = canvas.getContext('2d');
            
            // 设置画布大小
            canvas.width = templateConfig.width;
            canvas.height = templateConfig.height;
            
            // 绘制背景
            this.drawBackground(ctx, templateConfig);
            
            // 绘制文字内容
            this.drawText(ctx, content, templateConfig);
            
            // 绘制页码
            if (totalPages > 1) {
                this.drawPageNumber(ctx, pageNumber, totalPages, templateConfig);
            }
            
            // 转换为图片
            const dataUrl = canvas.toDataURL('image/png');
            
            return {
                success: true,
                dataUrl: dataUrl,
                width: templateConfig.width,
                height: templateConfig.height,
                pageNumber: pageNumber
            };
            
        } catch (error) {
            console.error('Canvas图片生成失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 创建Canvas元素
     */
    createCanvas() {
        if (typeof document !== 'undefined') {
            // 浏览器环境
            return document.createElement('canvas');
        } else {
            // Node.js环境 - 暂时返回失败，让前端处理
            throw new Error('服务器端Canvas暂不支持，请使用前端生成');
        }
    }
    
    /**
     * 绘制背景
     */
    drawBackground(ctx, config) {
        ctx.fillStyle = config.background;
        ctx.fillRect(0, 0, config.width, config.height);
        
        // 添加一些纹理效果
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(100, 200, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(650, 400, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(200, 800, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    /**
     * 绘制文字
     */
    drawText(ctx, text, config) {
        ctx.fillStyle = config.textColor;
        ctx.font = `${config.fontSize}px ${config.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // 计算可用宽度
        const maxWidth = config.width - config.padding * 2;
        const startX = config.padding;
        const startY = config.padding;
        
        // 文字换行处理
        const lines = this.wrapText(ctx, text, maxWidth, config.fontSize);
        
        // 绘制每一行
        let currentY = startY;
        for (const line of lines) {
            if (currentY + config.lineHeight > config.height - config.padding) {
                break; // 超出页面范围
            }
            
            if (line.trim() === '') {
                // 空行
                currentY += config.lineHeight * 0.5;
            } else {
                ctx.fillText(line, startX, currentY);
                currentY += config.lineHeight;
            }
        }
    }
    
    /**
     * 文字换行处理
     */
    wrapText(ctx, text, maxWidth, fontSize) {
        const lines = [];
        const paragraphs = text.split('\n');
        
        // 根据字体大小确定每行大概字符数
        const avgCharWidth = fontSize * 0.8; // 中文字符平均宽度
        const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push(''); // 空段落
                continue;
            }
            
            // 按最大字符数分行，考虑标点符号
            const chars = paragraph.split('');
            let currentLine = '';
            
            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const testLine = currentLine + char;
                
                // 检查宽度
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    // 需要换行，检查标点符号规则
                    const endPunctuations = ['。', '，', '！', '？', '；', '：', '）', '】', '』', '》', '」', '"', '"', '、'];
                    
                    if (endPunctuations.includes(char)) {
                        // 标点符号不换行
                        currentLine += char;
                    } else {
                        // 可以换行
                        lines.push(currentLine);
                        currentLine = char;
                    }
                } else {
                    currentLine += char;
                }
            }
            
            // 添加剩余内容
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
        }
        
        return lines;
    }
    
    /**
     * 绘制页码
     */
    drawPageNumber(ctx, pageNumber, totalPages, config) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = `14px ${config.fontFamily}`;
        ctx.textAlign = 'center';
        
        const pageText = `${pageNumber}/${totalPages}`;
        const x = config.width / 2;
        const y = config.height - 30;
        
        ctx.fillText(pageText, x, y);
    }
}

module.exports = CanvasImageGenerator;