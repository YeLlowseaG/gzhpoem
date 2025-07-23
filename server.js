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
const KVStorageService = require('./services/kv-storage-service');
const ConfigService = require('./services/config-service');
const SVGGenerator = require('./services/svg-generator');

const app = express();
const PORT = 8080;

// 初始化服务
const aiService = new AIService();
const wechatService = new WechatService();
const storageService = new KVStorageService();
const configService = new ConfigService();
const svgGenerator = new SVGGenerator();

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

// 生成爆款文（新版逻辑）
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
        // 3. AI分析爆款要素和写作技巧
        let topic = '', keywords = [], explosiveElements = '';
        if (aiService.isConfigured()) {
            const extractPrompt = customPrompts && customPrompts.extract ? 
                customPrompts.extract.replace('{content}', originContent.slice(0, 2000)) :
                `请深度分析以下爆款文章，提取其成功的爆点要素和写作技巧：\n\n文章内容：${originContent.slice(0, 2000)}\n\n请从以下维度进行分析：\n1. 爆款标题技巧（为什么这个标题吸引人？用了什么套路？）\n2. 开头抓人技巧（如何在前3句话抓住读者？）\n3. 情感触点分析（触动了读者什么情感？恐惧/焦虑/好奇/共鸣？）\n4. 内容结构特点（用了什么逻辑结构？对比/反转/递进？）\n5. 表达方式特色（语言风格、修辞手法、互动元素）\n6. 传播引爆点（什么地方最容易被转发/讨论？）\n\n输出格式：\n标题技巧：xxx\n开头套路：xxx\n情感触点：xxx\n结构特点：xxx\n表达特色：xxx\n引爆点：xxx`;
            
            const aiExtract = await aiService.generateWithAI({
                author: '', title: '', style: '', keywords: '', content: extractPrompt
            });
            
            if (aiExtract && aiExtract.content) {
                explosiveElements = aiExtract.content;
                // 从分析结果中提取核心信息作为topic和keywords
                const titleMatch = aiExtract.content.match(/标题技巧[:：]\s*(.+)/);
                const emotionMatch = aiExtract.content.match(/情感触点[:：]\s*(.+)/);
                topic = titleMatch ? `借鉴爆款技巧的诗词文章` : '诗词爆款文';
                keywords = explosiveElements.split('\n').filter(line => line.includes('：')).map(line => line.split('：')[1]?.trim()).filter(Boolean);
            }
        }
        // 4. AI生成诗词相关爆款文
        let finalContent = '';
        if (aiService.isConfigured() && explosiveElements) {
            const genPrompt = `请以“${topic}”为主题，结合以下关键词：${keywords.join('、')}，创作一篇与中国诗词文化相关的原创文章，要求内容新颖、有深度、有诗意，适合公众号爆款。`;
            const aiGen = await aiService.generateWithAI({
                author: '', title: topic, style: 'popular', keywords: keywords.join(','), content: genPrompt
            });
            finalContent = aiGen && aiGen.content ? aiGen.content : '';
        }
        res.json({
            success: true,
            originTitle,
            originSummary,
            topic,
            keywords,
            content: finalContent,
            titles: titles || [],
            cover: cover,
            explosiveElements: explosiveElements // 返回分析的爆款要素，供前端显示
        });
    } catch (error) {
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
        const { articleId, selectedTitle, article } = req.body;
        
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
        
        // 上传到微信（支持选择的标题）
        const result = await wechatService.uploadToDraft(articleData, appId, appSecret, selectedTitle);
        
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

// 生成小绿书图片
app.post('/api/xiaolvshu/generate', async (req, res) => {
    try {
        const { content, title, author, template = 'classic' } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                error: '缺少文章内容'
            });
        }
        
        console.log('📸 开始生成小绿书图片...');
        console.log('📝 内容长度:', content.length);
        console.log('🎨 使用模板:', template);
        
        // 生成多张SVG图片
        const result = await svgGenerator.generateImages(content, {
            title: title || '诗词赏析',
            author: author || '',
            template: template
        });
        
        if (result.success) {
            console.log('✅ 小绿书图片生成完成, 共', result.totalPages, '张');
            res.json({
                success: true,
                images: result.images,
                totalPages: result.totalPages,
                template: result.template
            });
        } else {
            console.error('❌ 小绿书图片生成失败:', result.error);
            res.status(500).json({
                success: false,
                error: '图片生成失败: ' + result.error
            });
        }
        
    } catch (error) {
        console.error('❌ 小绿书接口错误:', error);
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

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 诗词生成器服务启动成功!`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 数据存储: ${storageService.getDataPath()}`);
    console.log(`\n🎯 可用接口:`);
    console.log(`   POST /api/articles/generate  - 生成文章`);
    console.log(`   GET  /api/articles/history   - 历史文章`);
    console.log(`   POST /api/wechat/test        - 测试微信`);
    console.log(`   POST /api/wechat/upload      - 上传文章`);
    console.log(`   GET  /api/config             - 获取配置`);
    console.log(`   GET  /api/stats              - 使用统计`);
    console.log(`   GET  /health                 - 健康检查\n`);
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