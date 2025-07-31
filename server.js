// 诗词生成器 - 重构版本
// 专为个人使用优化，注重稳定性和易用性

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
axios.get('https://api.ipify.org?format=json').then(res => {
  console.log('🌐 当前出口IP:', res.data.ip, '（请加入微信白名单）');
}).catch(err => {
  console.warn('无法获取出口IP:', err.message);
});
const cheerio = require('cheerio');

// 服务模块
const AIService = require('./services/ai-service');
const WechatService = require('./services/wechat-service');
const WeChatMonitorService = require('./services/wechat-monitor-service');
const KVStorageService = require('./services/kv-storage-service');
const ConfigService = require('./services/config-service');
const SVGGenerator = require('./services/svg-generator');
const CanvasImageGenerator = require('./services/canvas-image-generator');

const app = express();
const PORT = 8080;

// 初始化服务
const aiService = new AIService();
const wechatService = new WechatService();
const wechatMonitorService = new WeChatMonitorService();
const storageService = new KVStorageService();
const configService = new ConfigService();
const svgGenerator = new SVGGenerator();
const canvasImageGenerator = new CanvasImageGenerator();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            ai: aiService.isConfigured(),
            wechat: wechatService.isConfigured(),
            storage: storageService.isReady()
        }
    });
});

// 获取当前服务器出口 IP（用于微信白名单）
app.get('/api/ip', async (req, res) => {
    try {
        console.log('🔍 获取服务器出口IP...');
        
        // 同时查询多个 IP 检测服务
        const ipCheckers = [
            { name: 'ipify', url: 'https://api.ipify.org?format=json' },
            { name: 'httpbin', url: 'https://httpbin.org/ip' },
            { name: 'ip-api', url: 'http://ip-api.com/json' }
        ];
        
        const results = [];
        
        for (const checker of ipCheckers) {
            try {
                const response = await axios.get(checker.url, { timeout: 5000 });
                const ip = response.data.ip || response.data.origin || response.data.query;
                if (ip) {
                    results.push({ service: checker.name, ip: ip });
                    console.log(`📍 ${checker.name}: ${ip}`);
                }
            } catch (error) {
                console.warn(`❌ ${checker.name} 查询失败:`, error.message);
            }
        }
        
        // 获取请求头中的 IP 信息
        const headerIps = {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip'],
            'cf-connecting-ip': req.headers['cf-connecting-ip'],
            'x-vercel-forwarded-for': req.headers['x-vercel-forwarded-for']
        };
        
        const currentIp = results.length > 0 ? results[0].ip : 'unknown';
        console.log(`🌐 当前出口IP: ${currentIp} （请添加到微信白名单）`);
        
        res.json({
            success: true,
            currentIp: currentIp,
            allResults: results,
            headers: headerIps,
            message: `请将 ${currentIp} 添加到微信公众平台的IP白名单中`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ 获取IP失败:', error);
        res.status(500).json({
            success: false,
            error: '获取IP失败',
            message: error.message
        });
    }
});

// ==================== AI 相关接口 ====================

// 生成完整的公众号内容包（文章+标题+封面）
app.post('/api/articles/generate', async (req, res) => {
    console.log('=== 生成文章请求开始 ===');
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    
    try {
        const { author, title, style, keywords, content, customPrompt } = req.body;
        
        // 参数验证
        if (!author || !title) {
            console.log('❌ 参数验证失败: 作者或标题为空');
            return res.status(400).json({
                success: false,
                error: '作者和标题不能为空'
            });
        }
        
        console.log(`🎯 开始生成完整内容包: ${author} - ${title}`);
        console.log('AI服务配置状态:', aiService.isConfigured());
        console.log('存储服务状态:', storageService.isReady());
        
        // 生成完整内容包（文章+标题+封面）
        console.log('📝 调用AI服务生成文章...');
        const result = await aiService.generateArticle({
            author,
            title,
            style: style || 'popular',
            keywords,
            content,
            customPrompt
        });
        
        console.log('🎨 AI生成结果:', result.success ? '成功' : '失败');
        if (!result.success) {
            console.log('❌ AI生成失败原因:', result.error);
        }
        
        // 保存到本地
        if (result.success) {
            console.log('💾 保存文章到存储...');
            const savedArticle = await storageService.saveArticle({
                ...result,
                metadata: { 
                    author, 
                    title, 
                    style: style || 'popular', 
                    keywords, 
                    createdAt: new Date().toISOString() 
                }
            });
            
            // 返回包含ID的结果
            result.id = savedArticle.id;
            console.log('✅ 文章保存成功, ID:', savedArticle.id);
        }
        
        console.log(`✅ 内容包生成完成: ${result.source}`);
        res.json(result);
        
    } catch (error) {
        console.error('❌❌❌ 生成内容包失败 ❌❌❌');
        console.error('错误详情:', error);
        console.error('错误堆栈:', error.stack);
        console.error('错误名称:', error.name);
        console.error('错误消息:', error.message);
        
        res.status(500).json({
            success: false,
            error: '生成内容包失败',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// 单独生成标题
app.post('/api/titles/generate', async (req, res) => {
    try {
        const { author, title, style, count } = req.body;
        
        if (!author || !title) {
            return res.status(400).json({
                success: false,
                error: '作者和标题不能为空'
            });
        }
        
        const titles = await aiService.titleGenerator.generateMultipleTitles(
            author, 
            title, 
            style || 'emotional', 
            count || 3
        );
        
        res.json({
            success: true,
            titles: titles
        });
        
    } catch (error) {
        console.error('生成标题失败:', error);
        res.status(500).json({
            success: false,
            error: '生成标题失败',
            message: error.message
        });
    }
});

// 单独生成封面
app.post('/api/covers/generate', async (req, res) => {
    try {
        const { author, title, style } = req.body;
        
        if (!author || !title) {
            return res.status(400).json({
                success: false,
                error: '作者和标题不能为空'
            });
        }
        
        const cover = await aiService.coverGenerator.generateTextCover(
            author, 
            title, 
            style || 'classic'
        );
        
        res.json(cover);
        
    } catch (error) {
        console.error('生成封面失败:', error);
        res.status(500).json({
            success: false,
            error: '生成封面失败',
            message: error.message
        });
    }
});

// 获取历史文章
app.get('/api/articles/history', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const articles = await storageService.getArticles({
            page: parseInt(page),
            limit: parseInt(limit),
            search
        });
        
        res.json({
            success: true,
            data: articles
        });
        
    } catch (error) {
        console.error('获取历史文章失败:', error);
        res.status(500).json({
            success: false,
            error: '获取历史文章失败'
        });
    }
});

// 获取单个文章
app.get('/api/articles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const article = await storageService.getArticle(id);
        
        if (!article) {
            return res.status(404).json({
                success: false,
                error: '文章不存在'
            });
        }
        
        res.json({
            success: true,
            data: article
        });
        
    } catch (error) {
        console.error('获取文章失败:', error);
        res.status(500).json({
            success: false,
            error: '获取文章失败'
        });
    }
});

// 删除文章
app.delete('/api/articles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await storageService.deleteArticle(id);
        
        res.json({
            success: true,
            message: '文章删除成功'
        });
        
    } catch (error) {
        console.error('删除文章失败:', error);
        res.status(500).json({
            success: false,
            error: '删除文章失败'
        });
    }
});

// ==================== OCR 相关接口 ====================

// OCR文字提取接口
app.post('/api/ocr/extract', async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({
                success: false,
                error: '缺少图片数据'
            });
        }
        
        console.log('🔍 开始OCR文字提取...');
        
        // 检查是否配置了通义千问OCR服务
        if (!process.env.QWEN_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'OCR服务未配置，请联系管理员配置QWEN_API_KEY'
            });
        }
        
        // 处理base64图片数据
        let imageData = image;
        if (image.startsWith('data:image/')) {
            imageData = image.split(',')[1];
        }
        
        // 调用通义千问OCR服务
        const ocrResult = await performOCR(imageData);
        
        if (ocrResult.success) {
            console.log('✅ OCR提取成功，文字长度:', ocrResult.text.length);
            res.json({
                success: true,
                text: ocrResult.text,
                confidence: ocrResult.confidence || 0.9
            });
        } else {
            console.error('❌ OCR提取失败:', ocrResult.error);
            res.status(500).json({
                success: false,
                error: 'OCR提取失败: ' + ocrResult.error
            });
        }
        
    } catch (error) {
        console.error('❌ OCR接口错误:', error);
        res.status(500).json({
            success: false,
            error: 'OCR服务异常: ' + error.message
        });
    }
});

/**
 * 执行OCR文字识别
 */
async function performOCR(imageBase64) {
    try {
        const response = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
            {
                model: 'qwen-vl-ocr',
                input: {
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    image: `data:image/jpeg;base64,${imageBase64}`
                                },
                                {
                                    text: '请识别图片中的所有文字内容，按原始排版格式输出，保持段落和换行。'
                                }
                            ]
                        }
                    ]
                },
                parameters: {
                    result_format: 'message'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        if (response.data.output && response.data.output.choices) {
            const extractedText = response.data.output.choices[0].message.content;
            return {
                success: true,
                text: extractedText.trim(),
                confidence: 0.95
            };
        } else {
            throw new Error('OCR服务返回格式异常');
        }
        
    } catch (error) {
        console.error('通义千问OCR调用失败:', error.message);
        
        // 降级到简单的文字提取（适用于简单图片）
        try {
            return await fallbackOCR(imageBase64);
        } catch (fallbackError) {
            return {
                success: false,
                error: `OCR失败: ${error.message}, 降级处理也失败: ${fallbackError.message}`
            };
        }
    }
}

/**
 * 降级OCR处理（使用通用视觉识别）
 */
async function fallbackOCR(imageBase64) {
    const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        {
            model: 'qwen-vl-plus',
            input: {
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                image: `data:image/jpeg;base64,${imageBase64}`
                            },
                            {
                                text: '这是一张包含文字的图片，请仔细识别并提取图片中的所有文字内容。请按照原文的格式和段落结构输出，不要添加任何解释或分析。'
                            }
                        ]
                    }
                ]
            },
            parameters: {
                result_format: 'message',
                max_tokens: 2000
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        }
    );
    
    if (response.data.output && response.data.output.choices) {
        const content = response.data.output.choices[0].message.content;
        return {
            success: true,
            text: content.trim(),
            confidence: 0.85
        };
    } else {
        throw new Error('降级OCR服务返回格式异常');
    }
}

// ==================== 爆款文相关接口 ====================

// 生成爆款文（完整版逻辑 - 包含标题和封面）
app.post('/api/baokuan/generate', async (req, res) => {
    const { url, manualContent, customPrompts } = req.body;
    if (!url && !manualContent) {
        return res.json({ success: false, error: '缺少爆款文章链接或正文内容' });
    }
    try {
        // 1. 优先用手动正文
        let originContent = manualContent ? manualContent.trim() : '';
        let originTitle = '', originSummary = '';
        if (originContent) {
            originTitle = url ? url : '手动输入';
            originSummary = originContent.slice(0, 200) + (originContent.length > 200 ? '...' : '');
        } else {
            // 2. 抓取网页内容
            const response = await axios.get(url, { timeout: 10000 });
            const html = response.data;
            const $ = cheerio.load(html);
            originTitle = $('title').text() || '';
            if ($('article').length) {
                originContent = $('article').text();
            } else if ($('.rich_media_content').length) {
                originContent = $('.rich_media_content').text();
            } else if ($('body').length) {
                originContent = $('body').text();
            }
            originContent = originContent.replace(/\s+/g, ' ').trim();
            originSummary = originContent.slice(0, 200) + (originContent.length > 200 ? '...' : '');
        }
    } catch (error) {
        res.json({ success: false, error: '爆款文生成失败: ' + error.message });
    }
});

// 生成爆款文完整版（带标题和封面）
app.post('/api/baokuan/generate-complete', async (req, res) => {
    const { url, manualContent, customPrompts } = req.body;
    if (!url && !manualContent) {
        return res.json({ success: false, error: '缺少爆款文章链接或正文内容' });
    }
    
    try {
        console.log('🎯 开始生成爆款文完整内容包...');
        
        // 1. 优先用手动正文
        let originContent = manualContent ? manualContent.trim() : '';
        let originTitle = '', originSummary = '';
        if (originContent) {
            originTitle = url ? url : '手动输入';
            originSummary = originContent.slice(0, 200) + (originContent.length > 200 ? '...' : '');
        } else {
            // 2. 抓取网页内容
            const response = await axios.get(url, { timeout: 10000 });
            const html = response.data;
            const $ = cheerio.load(html);
            originTitle = $('title').text() || '';
            if ($('article').length) {
                originContent = $('article').text();
            } else if ($('.rich_media_content').length) {
                originContent = $('.rich_media_content').text();
            } else if ($('body').length) {
                originContent = $('body').text();
            }
            originContent = originContent.replace(/\s+/g, ' ').trim();
            originSummary = originContent.slice(0, 200) + (originContent.length > 200 ? '...' : '');
        }

        // 3. AI提取原文标题和爆款选题
        let extractedTitle = originTitle || '仿写文章';
        let topic = '仿写文章';
        
        if (aiService.isConfigured() && originContent) {
            // 首先提取原文标题和爆款选题
            const [titleExtractResult, topicExtractResult] = await Promise.allSettled([
                // 提取原文标题
                aiService.generateWithAI({
                    author: '', title: '', style: '', keywords: '', 
                    content: customPrompts && customPrompts.extractTitle ? 
                        customPrompts.extractTitle.replace('{content}', originContent.slice(0, 1000)) :
                        `请从以下内容中提取出原文的标题，如果没有明确标题，请根据内容概括一个简洁的标题：\n\n${originContent.slice(0, 1000)}\n\n请只返回标题，不要解释。`
                }),
                // 提取爆款选题
                aiService.generateWithAI({
                    author: '', title: '', style: '', keywords: '', 
                    content: customPrompts && customPrompts.extractTopic ? 
                        customPrompts.extractTopic.replace('{content}', originContent.slice(0, 1000)) :
                        `请从以下内容中提取出适合做爆款文章的核心选题（一句话概括这篇文章的核心亮点或吸引点）：\n\n${originContent.slice(0, 1000)}\n\n请只返回选题概括，不要解释。`
                })
            ]);
            
            // 处理提取结果
            if (titleExtractResult.status === 'fulfilled' && titleExtractResult.value?.content) {
                extractedTitle = titleExtractResult.value.content.trim()
                    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除markdown图片语法
                    .replace(/https?:\/\/[^\s]+/g, '') // 移除URL
                    .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
                    .replace(/\s+/g, ' ') // 移除多余空格
                    .trim();
                console.log('✅ 原文标题提取成功:', extractedTitle);
            }
            
            if (topicExtractResult.status === 'fulfilled' && topicExtractResult.value?.content) {
                topic = topicExtractResult.value.content.trim()
                    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除markdown图片语法
                    .replace(/https?:\/\/[^\s]+/g, '') // 移除URL
                    .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
                    .replace(/\s+/g, ' ') // 移除多余空格
                    .trim();
                console.log('✅ 爆款选题提取成功:', topic);
            }
        }
        
        // 4. 基于提取的信息生成仿写爆款文
        let finalContent = '', titles = [], cover = null;
        
        if (aiService.isConfigured() && originContent) {
            // 并行生成文章、标题、封面
            const [articleResult, titleResult, coverResult] = await Promise.allSettled([
                // 生成文章内容
                aiService.generateWithAI({
                    author: '', 
                    title: topic, 
                    style: 'popular', 
                    keywords: '', 
                    content: customPrompts && customPrompts.generate ? 
                        customPrompts.generate.replace('{content}', originContent.slice(0, 2000)) :
                        `请仿写以下文章，创作一篇类似风格和主题的爆款文章：\n\n原文内容：\n${originContent.slice(0, 2000)}\n\n仿写要求：\n1. **严格模仿标题套路**：学习原文的标题技巧、数字使用、吸引力公式\n2. **复制开头套路**：完全模仿原文的开头方式和抓人技巧\n3. **保持相同结构**：使用相同的段落组织、逻辑展开和表达方式\n4. **复制传播引爆点**：保持原文最容易被转发/讨论的元素和表达\n5. **保持相同主题领域**：绝对不能改变主题（诗词→诗词，职场→职场，情感→情感）\n6. **模仿语言风格**：学习原文的语气、用词、修辞手法\n7. **保持底部引导**：如果原文有收藏、转发、关注等引导语，也要模仿使用\n8. **字数控制在800-1200字**\n\n**文章格式要求**：\n- **必须是连贯完整的文章**，不要出现“第一段”、“第二段”、“结尾”等标记\n- **不要使用段落标题**，直接写正文内容\n- **保持文字流畅自然**，像一篇正常的微信爆款文章\n- **严格保持原文的互动性和传播性**\n\n**重要：这是爆款文仿写，要学习套路但绝对不能改变主题领域！**\n\n请开始仿写：`
                }),
                
                // 生成爆款标题 - 使用原文主题领域而不是固定的诗词
                aiService.titleGenerator.generateMultipleTitles('仿写文章', topic, 'popular', 3),
                
                // 生成封面图 - 使用默认封面，不调用AI图片生成
                Promise.resolve({ success: true, imageUrl: null, useDefault: true })
            ]);
            
            // 处理结果
            if (articleResult.status === 'fulfilled' && articleResult.value?.content) {
                const rawContent = articleResult.value.content;
                console.log('✅ 爆款文内容生成成功');
                
                // AI排版优化
                console.log('🎨 开始AI排版优化...');
                try {
                    const formatResult = await aiService.generateWithAI({
                        author: '', title: '', style: '', keywords: '',
                        content: customPrompts && customPrompts.format ? 
                            customPrompts.format.replace('{content}', rawContent) :
                            `请对以下文章进行排版优化，提升阅读体验：

${rawContent}

排版优化要求：
1. **段落结构优化**：合理分段，每段2-4句话，避免大段文字
2. **重点内容突出**：对关键信息使用**加粗**标记
3. **添加适当的分隔符**：在不同主题之间添加 --- 分隔线
4. **优化开头结尾**：确保开头抓人眼球，结尾呼吁行动
5. **保持原文内容不变**：只调整排版格式，不修改文字内容
6. **适合移动端阅读**：考虑手机屏幕的阅读习惯

**格式要求**：
- 使用markdown格式
- 保持文章的完整性和流畅性
- 确保排版美观易读

请开始排版优化：`
                    });
                    
                    if (formatResult && formatResult.content) {
                        finalContent = formatResult.content;
                        console.log('✅ AI排版优化完成');
                    } else {
                        finalContent = rawContent; // 优化失败则使用原内容
                        console.log('⚠️ AI排版优化失败，使用原内容');
                    }
                } catch (error) {
                    console.log('⚠️ AI排版优化出错:', error.message);
                    finalContent = rawContent; // 出错则使用原内容
                }
            }
            
            if (titleResult.status === 'fulfilled' && titleResult.value) {
                // 清理标题中的URL和markdown语法
                titles = titleResult.value.map(title => 
                    title.replace(/!\[.*?\]\(.*?\)/g, '') // 移除markdown图片语法
                         .replace(/https?:\/\/[^\s]+/g, '') // 移除URL
                         .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
                         .replace(/\s+/g, ' ') // 移除多余空格
                         .trim()
                );
                console.log('✅ 爆款文标题生成成功, 共', titles.length, '个');
            }
            
            if (coverResult.status === 'fulfilled' && coverResult.value?.success) {
                cover = coverResult.value;
                console.log('✅ 爆款文封面生成成功');
            } else {
                console.log('⚠️ 爆款文封面生成失败，使用默认封面');
                cover = aiService.getBackupCover('诗词', topic);
            }
        }
        
        res.json({
            success: true,
            originTitle: extractedTitle, // 使用AI提取的原文标题
            originSummary,
            topic, // 使用AI提取的爆款选题
            keywords: [],
            content: finalContent,
            titles: titles,
            cover: cover,
            originalContent: originContent.slice(0, 500) + '...' // 返回原文摘要，供前端显示
        });

    } catch (error) {
        console.error('❌ 生成爆款文完整内容包失败:', error);
        res.json({ success: false, error: '爆款文生成失败: ' + error.message });
    }
});

// 保存爆款文
app.post('/api/baokuan/save', async (req, res) => {
    try {
        console.log('💾 保存爆款文请求:', JSON.stringify(req.body, null, 2));
        
        const articleData = req.body;
        
        // 保存到存储
        const savedArticle = await storageService.saveArticle(articleData);
        
        console.log('✅ 爆款文保存成功, ID:', savedArticle.id);
        
        res.json({
            success: true,
            id: savedArticle.id,
            message: '爆款文保存成功'
        });
        
    } catch (error) {
        console.error('❌ 保存爆款文失败:', error);
        res.status(500).json({
            success: false,
            error: '保存爆款文失败',
            message: error.message
        });
    }
});

// 获取爆款文历史
app.get('/api/baokuan/history', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const articles = await storageService.getArticles({
            page: parseInt(page),
            limit: parseInt(limit),
            search
        });
        res.json({
            success: true,
            data: articles
        });
    } catch (error) {
        console.error('获取爆款文历史失败:', error);
        res.status(500).json({
            success: false,
            error: '获取爆款文历史失败'
        });
    }
});

// 删除爆款文
app.delete('/api/baokuan/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await storageService.deleteArticle(id);
        res.json({
            success: true,
            message: '爆款文删除成功'
        });
    } catch (error) {
        console.error('删除爆款文失败:', error);
        res.status(500).json({
            success: false,
            error: '删除爆款文失败'
        });
    }
});

// 上传小绿书到微信草稿
app.post('/api/xiaolvshu/upload-wechat', async (req, res) => {
    try {
        const { images, title } = req.body;
        
        if (!images || images.length === 0) {
            return res.status(400).json({
                success: false,
                error: '缺少图片数据'
            });
        }
        
        // 使用环境变量中的微信配置
        const appId = process.env.WECHAT_APP_ID;
        const appSecret = process.env.WECHAT_APP_SECRET;
        
        if (!appId || !appSecret) {
            return res.status(400).json({
                success: false,
                error: '服务器未配置微信公众号信息'
            });
        }
        
        console.log('📸 小绿书微信上传请求:', { 
            imageCount: images.length, 
            title: title || '未命名' 
        });
        
        // 准备小绿书数据
        const xiaolvshuData = {
            title: title || '图文分享',
            images: images.filter(img => img.dataUrl) // 只处理有图片数据的
        };
        
        console.log(`📊 有效图片数量: ${xiaolvshuData.images.length}`);
        
        // 上传到微信草稿
        const result = await wechatService.uploadXiaoLvShuToDraft(xiaolvshuData, appId, appSecret);
        
        res.json(result);
        
    } catch (error) {
        console.error('小绿书上传到微信失败:', error);
        res.status(500).json({
            success: false,
            error: '上传失败',
            message: error.message
        });
    }
});

// ==================== 微信公众号相关接口 ====================

// 测试微信连接
app.post('/api/wechat/test', async (req, res) => {
    try {
        const { appId, appSecret } = req.body;
        const result = await wechatService.testConnection(appId, appSecret);
        
        res.json(result);
        
    } catch (error) {
        console.error('测试微信连接失败:', error);
        res.status(500).json({
            success: false,
            error: '测试连接失败',
            message: error.message
        });
    }
});

// 上传完整内容包到草稿箱
app.post('/api/wechat/upload', async (req, res) => {
    try {
        const { articleId, selectedTitle, article, coverData } = req.body;
        
        // 使用环境变量中的微信配置
        const appId = process.env.WECHAT_APP_ID;
        const appSecret = process.env.WECHAT_APP_SECRET;
        
        console.log('📤 微信上传请求:', { articleId, selectedTitle, hasArticle: !!article });
        console.log('📤 微信配置:', { appId: appId ? '已配置' : '未配置', appSecret: appSecret ? '已配置' : '未配置' });
        
        if (!appId || !appSecret) {
            return res.status(400).json({
                success: false,
                error: '服务器未配置微信公众号信息'
            });
        }
        
        let articleData;
        
        // 如果直接传递了文章数据，使用它；否则从存储中获取
        if (article) {
            articleData = article;
        } else if (articleId) {
            articleData = await storageService.getArticle(articleId);
            if (!articleData) {
                return res.status(404).json({
                    success: false,
                    error: '文章不存在'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                error: '缺少文章数据或文章ID'
            });
        }
        
        console.log(`📤 上传完整内容包到微信: ${articleData.metadata?.title || '未知标题'}`);
        
        // 清理选择的标题中的URL和markdown语法
        let cleanedTitle = selectedTitle;
        if (selectedTitle) {
            cleanedTitle = selectedTitle
                .replace(/!\[.*?\]\(.*?\)/g, '') // 移除markdown图片语法
                .replace(/https?:\/\/[^\s]+/g, '') // 移除URL
                .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
                .replace(/\s+/g, ' ') // 移除多余空格
                .trim();
        }
        
        // 处理封面数据
        if (coverData) {
            if (coverData.type === 'generated' && coverData.imageData) {
                // 将base64图片数据添加到文章数据中
                articleData.cover = {
                    ...articleData.cover,
                    generatedImageData: coverData.imageData,
                    useGeneratedImage: true
                };
                console.log('✅ 使用生成的CSS封面图片');
            } else if (coverData.type === 'default') {
                articleData.cover = {
                    ...articleData.cover,
                    useDefaultImage: true
                };
                console.log('✅ 使用系统默认封面图片');
            } else if (coverData.type === 'random') {
                articleData.cover = {
                    ...articleData.cover,
                    useRandomImage: true
                };
                console.log('✅ 使用线上随机封面图片');
            }
        }

        // 上传到微信（使用清理后的标题）
        const result = await wechatService.uploadToDraft(articleData, appId, appSecret, cleanedTitle);
        
        // 如果上传成功，标记文章状态
        if (result.success && articleId) {
            try {
                await storageService.markAsUploaded(articleId, {
                    mediaId: result.data.media_id,
                    title: result.data.title,
                    uploadedAt: new Date().toISOString()
                });
            } catch (error) {
                console.warn('标记上传状态失败:', error);
            }
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('上传到微信失败:', error);
        res.status(500).json({
            success: false,
            error: '上传失败',
            message: error.message
        });
    }
});

// ==================== 小绿书图片生成接口 ====================

// 生成小绿书图片 - 流式生成版本  
app.post('/api/xiaolvshu/generate-stream', async (req, res) => {
    try {
        const { content, title, author, template = 'classic', useAIGeneration = false } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                error: '缺少文章内容'
            });
        }
        
        console.log('📸 开始生成小绿书图片...');
        console.log('📝 内容长度:', content.length);
        console.log('🎨 使用模板:', template);
        console.log('🤖 AI生成模式:', useAIGeneration);
        
        // 设置SSE响应头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // 发送进度消息的辅助函数
        const sendProgress = (step, message, data = null) => {
            const eventData = {
                step,
                message,
                timestamp: new Date().toISOString(),
                data
            };
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        };

        try {
            // 第1步：AI智能分段
            sendProgress(1, '🤖 AI正在智能分段中...');
            
            let segments = await svgGenerator.intelligentSegmentation(content, template, aiService);
            
            // 限制分段数量，避免生成过多图片导致超时
            const maxPages = useAIGeneration ? 6 : 10; // AI模式最多6页，SVG模式最多10页
            if (segments.length > maxPages) {
                console.log(`⚠️ 分段过多(${segments.length}页)，限制为${maxPages}页`);
                segments = segments.slice(0, maxPages);
                sendProgress(2, `✅ AI分段完成，已限制为${segments.length}页以优化生成速度`, { totalPages: segments.length });
            } else {
                sendProgress(2, `✅ AI分段完成，共${segments.length}页`, { totalPages: segments.length });
            }

            // 第2步：逐个生成图片
            const images = [];
            for (let i = 0; i < segments.length; i++) {
                const pageNum = i + 1;
                sendProgress(3 + i, `🎨 正在生成第${pageNum}张图片 (${pageNum}/${segments.length})...`);
                
                try {
                    let pageImage;
                    
                    // 禁用AI图片生成，直接使用前端Canvas生成
                    sendProgress(3 + i, `📝 第${pageNum}张准备前端Canvas生成（已禁用AI图片生成）...`);
                    pageImage = {
                        frontendCanvas: true,
                        content: segments[i],
                        pageNumber: pageNum,
                        totalPages: segments.length,
                        template: template,
                        width: 750,
                        height: 1334
                    };
                    sendProgress(3 + i, `✅ 第${pageNum}张数据已准备，前端生成中！`);
                    
                    // 必须有图片结果才继续
                    if (pageImage) {
                        images.push(pageImage);
                        // 发送单张图片结果，实时更新进度
                        sendProgress(3 + i, `🎉 第${pageNum}张图片完成！`, { 
                            image: pageImage,
                            completed: pageNum,
                            total: segments.length 
                        });
                    } else {
                        // 如果所有方式都失败了，生成错误占位
                        sendProgress(3 + i, `❌ 第${pageNum}张图片所有方式都失败`);
                        const errorImage = {
                            error: true,
                            content: segments[i],
                            pageNumber: pageNum,
                            width: 750,
                            height: 1334,
                            errorMessage: '图片生成失败'
                        };
                        images.push(errorImage);
                    }
                } catch (error) {
                    console.error(`第${pageNum}张图片生成异常:`, error);
                    // 先尝试Canvas图片生成作为兜底
                    try {
                        sendProgress(3 + i, `🔧 第${pageNum}张图片异常，尝试Canvas兜底...`);
                        const canvasFallbackResult = await canvasImageGenerator.generateImage(segments[i], {
                            template: template,
                            pageNumber: pageNum,
                            totalPages: segments.length
                        });
                        
                        if (canvasFallbackResult.success) {
                            const fallbackImage = {
                                canvasGenerated: true,
                                dataUrl: canvasFallbackResult.dataUrl,
                                content: segments[i],
                                pageNumber: pageNum,
                                width: canvasFallbackResult.width,
                                height: canvasFallbackResult.height
                            };
                            
                            images.push(fallbackImage);
                            sendProgress(3 + i, `✅ 第${pageNum}张Canvas兜底图片生成成功！`);
                        } else {
                            throw new Error('Canvas兜底失败');
                        }
                    } catch (canvasFallbackError) {
                        console.warn(`Canvas兜底失败: ${canvasFallbackError.message}`);
                        // 最后尝试SVG兜底
                        try {
                            sendProgress(3 + i, `🔧 第${pageNum}张Canvas兜底失败，最后尝试SVG...`);
                            const svgFallbackImage = await svgGenerator.generateSinglePageSVG({
                                content: segments[i],
                                title: i === 0 ? title : '',
                                author: i === 0 ? author : '',
                                template: template,
                                pageNumber: pageNum,
                                totalPages: segments.length
                            });
                            
                            if (svgFallbackImage) {
                                images.push(svgFallbackImage);
                                sendProgress(3 + i, `✅ 第${pageNum}张SVG兜底图片生成成功！`);
                            } else {
                                // 最后的错误处理
                                images.push({
                                    error: true,
                                    content: segments[i],
                                    pageNumber: pageNum,
                                    errorMessage: '所有生成方式都失败'
                                });
                                sendProgress(3 + i, `❌ 第${pageNum}张图片完全失败`);
                            }
                        } catch (svgFallbackError) {
                            console.error(`SVG兜底也失败:`, svgFallbackError);
                            sendProgress(3 + i, `❌ 第${pageNum}张图片所有方式都失败`);
                        }
                    }
                }
            }

            // 最终完成
            sendProgress(999, `🎉 所有图片生成完成！共${images.length}张`, {
                finalResult: {
                    success: true,
                    images: images,
                    totalPages: images.length,
                    template: svgGenerator.templates[template].name,
                    generationMode: useAIGeneration ? 'AI生成' : 'SVG生成'
                }
            });

        } catch (error) {
            sendProgress(999, `❌ 生成失败: ${error.message}`, { error: error.message });
        }

        res.end();
        
    } catch (error) {
        console.error('❌ 小绿书接口错误:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: '图片生成服务异常: ' + error.message
            });
        }
    }
});

// 保留原来的POST接口作为备用
app.post('/api/xiaolvshu/generate', async (req, res) => {
    try {
        const { content, title, author, template = 'classic', useAIGeneration = false } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                error: '缺少文章内容'
            });
        }
        
        console.log('📸 开始生成小绿书图片...(备用接口)');
        
        // 使用原来的生成方法
        const result = await svgGenerator.generateImages(content, {
            title: title || '诗词赏析',
            author: author || '',
            template: template,
            aiService: aiService,
            useAIGeneration: useAIGeneration
        });
        
        if (result.success) {
            res.json({
                success: true,
                images: result.images,
                totalPages: result.totalPages,
                template: result.template
            });
        } else {
            res.status(500).json({
                success: false,
                error: '图片生成失败: ' + result.error
            });
        }
        
    } catch (error) {
        console.error('❌ 小绿书备用接口错误:', error);
        res.status(500).json({
            success: false,
            error: '图片生成服务异常: ' + error.message
        });
    }
});

// 获取可用的图片模板
app.get('/api/xiaolvshu/templates', (req, res) => {
    try {
        const templates = svgGenerator.getTemplates();
        res.json({
            success: true,
            templates: templates
        });
    } catch (error) {
        console.error('获取模板失败:', error);
        res.status(500).json({
            success: false,
            error: '获取模板失败'
        });
    }
});

// ==================== 配置管理接口 ====================

// 获取配置
app.get('/api/config', async (req, res) => {
    try {
        const config = await configService.getConfig();
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取配置失败'
        });
    }
});

// 更新配置
app.post('/api/config', async (req, res) => {
    try {
        const config = req.body;
        await configService.saveConfig(config);
        
        res.json({
            success: true,
            message: '配置保存成功'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '保存配置失败'
        });
    }
});

// ==================== 统计和监控 ====================

// 获取使用统计
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await storageService.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: '获取统计失败'
        });
    }
});

// 内容收集 API
// 监控账号管理
app.post('/api/monitor-accounts', async (req, res) => {
    try {
        const { name, url, platform } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                error: '账号名称不能为空'
            });
        }

        const account = {
            id: Date.now().toString(),
            name: name.trim(),
            url: url?.trim() || '',
            platform: platform?.trim() || '',
            addedAt: new Date().toISOString()
        };

        // 获取现有账号列表
        const existingAccounts = await storageService.get('monitor-accounts') || [];
        existingAccounts.push(account);
        
        await storageService.set('monitor-accounts', existingAccounts);

        res.json({
            success: true,
            data: account,
            message: '监控账号添加成功'
        });
    } catch (error) {
        console.error('添加监控账号失败:', error);
        res.status(500).json({
            success: false,
            error: '添加监控账号失败'
        });
    }
});

app.get('/api/monitor-accounts', async (req, res) => {
    try {
        const accounts = await storageService.get('monitor-accounts') || [];
        res.json({
            success: true,
            data: accounts
        });
    } catch (error) {
        console.error('获取监控账号列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取监控账号列表失败'
        });
    }
});

app.delete('/api/monitor-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const accounts = await storageService.get('monitor-accounts') || [];
        const filteredAccounts = accounts.filter(account => account.id !== id);
        
        await storageService.set('monitor-accounts', filteredAccounts);

        res.json({
            success: true,
            message: '监控账号删除成功'
        });
    } catch (error) {
        console.error('删除监控账号失败:', error);
        res.status(500).json({
            success: false,
            error: '删除监控账号失败'
        });
    }
});

// 文章收集管理
app.post('/api/collected-articles', async (req, res) => {
    try {
        const { url, accountId } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: '文章链接不能为空'
            });
        }

        // 处理分享链接，提取真实URL
        let realUrl = url.trim();
        
        // 检查是否是小红书分享文本
        if (realUrl.includes('小红书') && realUrl.includes('https://')) {
            const urlMatch = realUrl.match(/https:\/\/[^\s\u4e00-\u9fa5]+/);
            if (urlMatch) {
                realUrl = urlMatch[0];
                console.log(`📋 从小红书分享文本中提取真实URL: ${realUrl}`);
            }
        }
        
        // 检查其他平台的分享格式
        if (!realUrl.startsWith('http')) {
            const urlMatch = realUrl.match(/https?:\/\/[^\s\u4e00-\u9fa5]+/);
            if (urlMatch) {
                realUrl = urlMatch[0];
                console.log(`📋 从分享文本中提取URL: ${realUrl}`);
            }
        }
        
        // 如果仍然不是有效URL，返回错误
        if (!realUrl.startsWith('http')) {
            return res.status(400).json({
                success: false,
                error: '无法从输入内容中提取有效的URL链接'
            });
        }

        console.log(`📖 开始提取文章内容: ${realUrl}`);

        // 提取文章内容
        try {
            const response = await axios.get(realUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            let article = {};
            
            // 检查是否是小红书链接，优先尝试解析JSON数据
            if (realUrl.includes('xiaohongshu.com')) {
                console.log('🔍 检测到小红书链接，尝试解析JSON数据...');
                
                // 尝试从HTML中提取JSON数据
                const htmlContent = response.data;
                const jsonMatch = htmlContent.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});?\s*<\/script>/);
                
                if (jsonMatch) {
                    try {
                        const initialState = JSON.parse(jsonMatch[1]);
                        const noteData = initialState?.note?.noteDetailMap;
                        
                        if (noteData) {
                            // 获取第一个笔记的数据
                            const noteId = Object.keys(noteData)[0];
                            const note = noteData[noteId]?.note;
                            
                            if (note) {
                                console.log('✅ 成功解析小红书JSON数据');
                                
                                // 提取图片链接
                                const images = note.imageList?.map(img => img.urlDefault || img.url) || [];
                                
                                // 格式化互动数据
                                const interactInfo = note.interactInfo || {};
                                
                                article = {
                                    id: Date.now().toString(),
                                    title: note.title || '未获取到标题',
                                    content: note.desc || '未获取到内容',
                                    author: note.user?.nickname || '未知作者',
                                    publishTime: note.time ? new Date(note.time).toLocaleString() : '',
                                    url: realUrl,
                                    accountId: accountId || '',
                                    addedAt: new Date().toISOString(),
                                    images: images.filter(img => img && img.startsWith('http')),
                                    readCount: null, // 小红书不提供阅读量
                                    likeCount: interactInfo.likedCount || null,
                                    shareCount: interactInfo.shareCount || null,
                                    commentCount: interactInfo.commentCount || null,
                                    collectedCount: interactInfo.collectedCount || null,
                                    location: note.ipLocation || '',
                                    tags: note.tagList?.map(tag => tag.name) || []
                                };
                            }
                        }
                    } catch (jsonError) {
                        console.warn('⚠️ 解析小红书JSON数据失败，使用通用解析:', jsonError.message);
                    }
                }
            }
            
            // 如果小红书JSON解析失败，或不是小红书链接，使用通用解析
            if (!article || !article.title || article.title === '未获取到标题') {
                console.log('🔧 使用通用HTML解析方式...');
                
                const $ = cheerio.load(response.data);

                // 通用提取规则
                const title = $('h1').first().text().trim() || 
                             $('title').text().trim() || 
                             $('meta[property="og:title"]').attr('content') || '未获取到标题';

                const author = $('.author').first().text().trim() || 
                              $('[rel="author"]').first().text().trim() || 
                              $('.byline').first().text().trim() || 
                              $('meta[name="author"]').attr('content') || '';

                // 尝试多种内容选择器
                let content = '';
                const contentSelectors = [
                    '.article-content', '.content', '#content', 
                    '.post-content', '.entry-content', '.article-body',
                    '.rich_media_content', '.js_content', 'article'
                ];
                
                for (const selector of contentSelectors) {
                    content = $(selector).html();
                    if (content && content.trim().length > 100) break;
                }
                
                if (!content) {
                    content = $('body').html() || '未能提取到内容';
                }

                // 提取图片链接（特别是小红书等平台）
                let images = [];
                $('img').each((index, img) => {
                    const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-original');
                    if (src && src.startsWith('http')) {
                        images.push(src);
                    }
                });

            // 清理函数
            function cleanContent(htmlContent) {
                let cleanedContent = htmlContent;
                
                // 去除常见的无用信息
                const unwantedPatterns = [
                    /沪ICP备[^|]*\|/g,
                    /营业执照[^|]*\|/g,
                    /沪公网安备[^|]*\|/g,
                    /增值电信业务[^|]*\|/g,
                    /医疗器械[^|]*\|/g,
                    /互联网药品[^|]*\|/g,
                    /违法不良信息[^|]*\|/g,
                    /网络文化经营[^|]*\|/g,
                    /个性化推荐算法[^|]*号/g,
                    /© \d{4}-\d{4}/g,
                    /行吟信息科技[\s\S]*?更多/g,
                    /地址：[^电]*电话：[^更]*更多/g
                ];
                
                unwantedPatterns.forEach(pattern => {
                    cleanedContent = cleanedContent.replace(pattern, '');
                });
                
                // 去除多余的空白字符
                cleanedContent = cleanedContent.replace(/\s+/g, ' ').trim();
                
                return cleanedContent;
            }

            content = cleanContent(content);

            // 尝试提取发布时间
            let publishTime = '';
            const timeSelectors = [
                'time', '.publish-date', '.date', '.time',
                '[datetime]', '.post-date', '.article-date'
            ];
            
            for (const selector of timeSelectors) {
                const timeText = $(selector).text().trim() || $(selector).attr('datetime');
                if (timeText) {
                    publishTime = timeText;
                    break;
                }
            }

            // 尝试提取数据（阅读量等）
            let readCount = null, likeCount = null, shareCount = null, commentCount = null;
            
            // 查找可能的数据
            const readTexts = $('.read-count, .view-count, [class*="read"], [class*="view"]').text();
            const likeTexts = $('.like-count, [class*="like"], [class*="praise"]').text();
            const shareTexts = $('.share-count, [class*="share"]').text();
            const commentTexts = $('.comment-count, [class*="comment"]').text();
            
                // 简单数字提取
                if (readTexts) readCount = readTexts.match(/\d+/)?.[0] || null;
                if (likeTexts) likeCount = likeTexts.match(/\d+/)?.[0] || null;
                if (shareTexts) shareCount = shareTexts.match(/\d+/)?.[0] || null;
                if (commentTexts) commentCount = commentTexts.match(/\d+/)?.[0] || null;

                article = {
                    id: Date.now().toString(),
                    title: title,
                    content: content,
                    author: author,
                    publishTime: publishTime,
                    url: realUrl, // 使用清理后的真实URL
                    accountId: accountId || '',
                    readCount: readCount,
                    likeCount: likeCount,
                    shareCount: shareCount,
                    commentCount: commentCount,
                    images: images, // 添加图片链接数组
                    addedAt: new Date().toISOString(),
                    tags: [],
                    location: ''
                };
            }

            // 保存文章
            const existingArticles = await storageService.get('collected-articles') || [];
            existingArticles.unshift(article); // 最新的在前面
            
            await storageService.set('collected-articles', existingArticles);

            console.log(`✅ 文章提取成功: ${title}`);

            res.json({
                success: true,
                data: article,
                message: '文章收集成功'
            });

        } catch (extractError) {
            console.error('文章内容提取失败:', extractError.message);
            console.error('错误详情:', extractError);
            res.status(500).json({
                success: false,
                error: `提取失败: ${extractError.message}`,
                details: extractError.code || 'Unknown'
            });
        }

    } catch (error) {
        console.error('收集文章失败:', error);
        res.status(500).json({
            success: false,
            error: '收集文章失败'
        });
    }
});

app.get('/api/collected-articles', async (req, res) => {
    try {
        const { accountId, search, limit = 50 } = req.query;
        let articles = await storageService.get('collected-articles') || [];

        // 按账号筛选
        if (accountId) {
            articles = articles.filter(article => article.accountId === accountId);
        }

        // 搜索筛选
        if (search) {
            const searchLower = search.toLowerCase();
            articles = articles.filter(article => 
                article.title.toLowerCase().includes(searchLower) ||
                article.content.toLowerCase().includes(searchLower) ||
                article.author.toLowerCase().includes(searchLower)
            );
        }

        // 限制数量
        articles = articles.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: articles
        });
    } catch (error) {
        console.error('获取文章列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取文章列表失败'
        });
    }
});

app.delete('/api/collected-articles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const articles = await storageService.get('collected-articles') || [];
        const filteredArticles = articles.filter(article => article.id !== id);
        
        await storageService.set('collected-articles', filteredArticles);

        res.json({
            success: true,
            message: '文章删除成功'
        });
    } catch (error) {
        console.error('删除文章失败:', error);
        res.status(500).json({
            success: false,
            error: '删除文章失败'
        });
    }
});

// WeChat 监控 API
// 获取监控服务状态
app.get('/api/wechat-monitor/status', async (req, res) => {
    try {
        const status = await wechatMonitorService.getServiceStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('获取监控服务状态失败:', error);
        res.status(500).json({
            success: false,
            error: '获取监控服务状态失败'
        });
    }
});

// 搜索微信公众号
app.get('/api/wechat-monitor/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: '缺少搜索关键词'
            });
        }

        const result = await wechatMonitorService.searchWeChatAccount(query);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('搜索微信公众号失败:', error);
        res.status(500).json({
            success: false,
            error: '搜索微信公众号失败'
        });
    }
});

// 测试账号监控
app.post('/api/wechat-monitor/test', async (req, res) => {
    try {
        const { accountIdentifier, method = 'auto' } = req.body;
        if (!accountIdentifier) {
            return res.status(400).json({
                success: false,
                error: '缺少账号标识符'
            });
        }

        const result = await wechatMonitorService.testAccountMonitoring(accountIdentifier, method);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('测试账号监控失败:', error);
        res.status(500).json({
            success: false,
            error: '测试账号监控失败'
        });
    }
});

// 添加监控账号
app.post('/api/wechat-monitor/accounts', async (req, res) => {
    try {
        const { name, identifier, method = 'auto' } = req.body;
        if (!name || !identifier) {
            return res.status(400).json({
                success: false,
                error: '缺少账号名称或标识符'
            });
        }

        const accountInfo = {
            id: Date.now().toString(), // 简单的ID生成
            name,
            identifier,
            method
        };

        const result = await wechatMonitorService.addMonitorAccount(accountInfo);
        res.json({
            success: true,
            data: result,
            message: '监控账号添加成功'
        });
    } catch (error) {
        console.error('添加监控账号失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '添加监控账号失败'
        });
    }
});

// 获取监控账号列表
app.get('/api/wechat-monitor/accounts', async (req, res) => {
    try {
        const accounts = wechatMonitorService.getMonitoredAccounts();
        res.json({
            success: true,
            data: accounts
        });
    } catch (error) {
        console.error('获取监控账号列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取监控账号列表失败'
        });
    }
});

// 删除监控账号
app.delete('/api/wechat-monitor/accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = wechatMonitorService.removeMonitorAccount(id);
        
        if (success) {
            res.json({
                success: true,
                message: '监控账号删除成功'
            });
        } else {
            res.status(404).json({
                success: false,
                error: '监控账号不存在'
            });
        }
    } catch (error) {
        console.error('删除监控账号失败:', error);
        res.status(500).json({
            success: false,
            error: '删除监控账号失败'
        });
    }
});

// 获取指定账号的文章
app.get('/api/wechat-monitor/accounts/:id/articles', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;
        
        const articles = await wechatMonitorService.getAccountArticles(id, parseInt(limit));
        res.json({
            success: true,
            data: articles
        });
    } catch (error) {
        console.error('获取账号文章失败:', error);
        res.status(500).json({
            success: false,
            error: error.message || '获取账号文章失败'
        });
    }
});

// 获取所有监控账号的文章
app.get('/api/wechat-monitor/articles', async (req, res) => {
    try {
        const { limitPerAccount = 5 } = req.query;
        
        const articles = await wechatMonitorService.getAllArticles(parseInt(limitPerAccount));
        res.json({
            success: true,
            data: articles
        });
    } catch (error) {
        console.error('获取所有文章失败:', error);
        res.status(500).json({
            success: false,
            error: '获取所有文章失败'
        });
    }
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, async () => {
    console.log(`\n🚀 诗词生成器服务启动成功!`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 数据存储: ${storageService.getDataPath()}`);
    
    console.log(`\n🎯 可用接口:`);
    console.log(`   POST /api/articles/generate     - 生成文章`);
    console.log(`   GET  /api/articles/history      - 历史文章`);
    console.log(`   POST /api/wechat/test           - 测试微信`);
    console.log(`   POST /api/wechat/upload         - 上传文章`);
    console.log(`   GET  /api/config                - 获取配置`);
    console.log(`   GET  /api/stats                 - 使用统计`);
    console.log(`   GET  /health                    - 健康检查\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n📤 接收到关闭信号，正在优雅关闭...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n📤 接收到中断信号，正在优雅关闭...');
    process.exit(0);
});

module.exports = app;