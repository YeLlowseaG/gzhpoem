/**
 * HTML图片生成器 - 用HTML排版代替SVG
 * 解决SVG文字换行困难的问题
 */

class HtmlImageGenerator {
    constructor() {
        this.templates = this.getDefaultTemplates();
    }

    getDefaultTemplates() {
        return {
            classic: {
                name: '古典雅致',
                width: 750,
                height: 1334,
                background: 'linear-gradient(135deg, #f8f5f0 0%, #e8e2d6 100%)',
                primaryColor: '#8b4513',
                textColor: '#2c2c2c',
                fontSize: 24,
                lineHeight: 1.9,
                padding: 80,
                fontFamily: '"Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif'
            },
            modern: {
                name: '现代简约',
                width: 750,
                height: 1334,
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)',
                primaryColor: '#667eea',
                textColor: '#333333',
                fontSize: 26,
                lineHeight: 1.8,
                padding: 70,
                fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
            },
            elegant: {
                name: '优雅文艺',
                width: 750,
                height: 1334,
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                primaryColor: '#8b4513',
                textColor: '#444444',
                fontSize: 22,
                lineHeight: 2.1,
                padding: 75,
                fontFamily: '"Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif'
            }
        };
    }

    /**
     * 生成HTML模板
     */
    generateHtmlTemplate(content, options = {}) {
        const {
            title = '内容图片',
            author = '',
            template = 'classic',
            pageNumber = 1,
            totalPages = 1
        } = options;

        const templateConfig = this.templates[template];
        
        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        .page {
            width: ${templateConfig.width}px;
            height: ${templateConfig.height}px;
            background: ${templateConfig.background};
            padding: ${templateConfig.padding}px;
            font-family: ${templateConfig.fontFamily};
            font-size: ${templateConfig.fontSize}px;
            line-height: ${templateConfig.lineHeight};
            color: ${templateConfig.textColor};
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        .content {
            width: 100%;
            text-align: left;
            word-wrap: break-word;
            white-space: pre-wrap;
            font-size: ${templateConfig.fontSize}px;
            line-height: ${templateConfig.lineHeight};
            letter-spacing: 0.5px;
            word-spacing: 1px;
        }
        
        .footer {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 12px;
            color: rgba(0,0,0,0.3);
            font-weight: 300;
        }
        
        /* 段落样式 */
        .content p {
            margin-bottom: ${templateConfig.fontSize * 0.8}px;
            text-indent: ${templateConfig.fontSize * 2}px;
        }
        
        /* 首段不缩进 */
        .content p:first-child {
            text-indent: 0;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="content">
            ${this.formatContent(content)}
        </div>
        
        <div class="footer">
            ${pageNumber}/${totalPages}
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * 格式化内容
     */
    formatContent(content) {
        return content
            .split('\n\n')
            .filter(p => p.trim())
            .map(paragraph => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
            .join('');
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = { innerHTML: '' };
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 生成图片（需要Puppeteer）
     */
    async generateImage(content, options = {}) {
        try {
            // 检查是否有Puppeteer
            let puppeteer;
            try {
                puppeteer = require('puppeteer');
            } catch (error) {
                console.warn('⚠️ Puppeteer未安装，返回HTML内容');
                // 返回HTML，前端可以用html2canvas转换
                return {
                    success: true,
                    html: this.generateHtmlTemplate(content, options),
                    needsConversion: true
                };
            }

            const html = this.generateHtmlTemplate(content, options);
            
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setContent(html);
            await page.setViewport({ 
                width: this.templates[options.template || 'classic'].width, 
                height: this.templates[options.template || 'classic'].height 
            });
            
            const screenshot = await page.screenshot({ 
                type: 'png',
                fullPage: true 
            });
            
            await browser.close();
            
            return {
                success: true,
                imageBuffer: screenshot,
                dataUrl: `data:image/png;base64,${screenshot.toString('base64')}`,
                width: this.templates[options.template || 'classic'].width,
                height: this.templates[options.template || 'classic'].height
            };
            
        } catch (error) {
            console.error('HTML图片生成失败:', error);
            return {
                success: false,
                error: error.message,
                // 降级到HTML
                html: this.generateHtmlTemplate(content, options),
                needsConversion: true
            };
        }
    }
}

module.exports = HtmlImageGenerator;