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
const CanvasImageGenerator = require('./services/canvas-image-generator');

const app = express();
const PORT = 8080;

// 初始化服务
const aiService = new AIService();
const wechatService = new WechatService();
const storageService = new KVStorageService();
const configService = new ConfigService();
const svgGenerator = new SVGGenerator();
const canvasImageGenerator = new CanvasImageGenerator();

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
                // 让AI从分析中提取真正的爆款选题
                const topicPrompt = `请根据以下分析结果，提取出这篇文章的核心爆款选题（一句话概括）：\n\n${explosiveElements}\n\n请只返回一个简洁的选题概括，不要解释。`;
                try {
                    const topicResult = await aiService.generateWithAI({
                        author: '', title: '', style: '', keywords: '', content: topicPrompt
                    });
                    let rawTopic = (topicResult && topicResult.content) ? topicResult.content.trim() : originTitle || '类似风格文章';
                    
                    // 清理topic内容，移除URL和图片语法
                    topic = rawTopic
                        .replace(/!\[.*?\]\(.*?\)/g, '') // 移除markdown图片语法
                        .replace(/https?:\/\/[^\s]+/g, '') // 移除URL
                        .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
                        .replace(/\s+/g, ' ') // 移除多余空格
                        .trim();
                        
                    // 如果清理后为空，使用默认值
                    if (!topic) {
                        topic = originTitle || '类似风格文章';
                    }
                } catch (error) {
                    console.log('爆款选题提取失败，使用默认值');
                    topic = originTitle || '类似风格文章';
                }
                keywords = explosiveElements.split('\n').filter(line => line.includes('：')).map(line => line.split('：')[1]?.trim()).filter(Boolean);
            }
        }
        // 4. AI生成完整的仿写爆款文内容包（文章+标题+封面）
        let finalContent = '', titles = [], cover = null;
        if (aiService.isConfigured() && explosiveElements) {
            const genPrompt = `请严格仿写以下爆款文章的结构、套路和写作技巧，但内容要完全原创：\n\n爆款要素分析：\n${explosiveElements}\n\n仿写要求：\n1. 模仿原文的标题套路，但改为全新的话题\n2. 借鉴原文的开头方式，但用不同的内容\n3. 采用原文的情感触点，但应用到新的场景\n4. 使用原文的结构特点，但填入原创内容\n5. 复制原文的表达特色，但避免任何相似的具体内容\n6. 利用原文的引爆点，但创造全新的讨论点\n\n注意：这是仿写练习，要学习套路但内容必须100%原创，与原文完全不同。`;
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
            cover: cover || null,
            explosiveElements: explosiveElements // 返回分析的爆款要素，供前端显示
        });
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
                // 让AI从分析中提取真正的爆款选题
                const topicPrompt = `请根据以下分析结果，提取出这篇文章的核心爆款选题（一句话概括）：\n\n${explosiveElements}\n\n请只返回一个简洁的选题概括，不要解释。`;
                try {
                    const topicResult = await aiService.generateWithAI({
                        author: '', title: '', style: '', keywords: '', content: topicPrompt
                    });
                    let rawTopic = (topicResult && topicResult.content) ? topicResult.content.trim() : originTitle || '类似风格文章';
                    
                    // 清理topic内容，移除URL和图片语法
                    topic = rawTopic
                        .replace(/!\[.*?\]\(.*?\)/g, '') // 移除markdown图片语法
                        .replace(/https?:\/\/[^\s]+/g, '') // 移除URL
                        .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
                        .replace(/\s+/g, ' ') // 移除多余空格
                        .trim();
                        
                    // 如果清理后为空，使用默认值
                    if (!topic) {
                        topic = originTitle || '类似风格文章';
                    }
                } catch (error) {
                    console.log('爆款选题提取失败，使用默认值');
                    topic = originTitle || '类似风格文章';
                }
                keywords = explosiveElements.split('\n').filter(line => line.includes('：')).map(line => line.split('：')[1]?.trim()).filter(Boolean);
            }
        }

        // 4. AI生成完整的仿写爆款文内容包（文章+标题+封面）
        let finalContent = '', titles = [], cover = null;
        if (aiService.isConfigured() && explosiveElements) {
            // 并行生成文章、标题、封面
            const [articleResult, titleResult, coverResult] = await Promise.allSettled([
                // 生成文章内容
                aiService.generateWithAI({
                    author: '', 
                    title: topic, 
                    style: 'popular', 
                    keywords: keywords.join(','), 
                    content: customPrompts && customPrompts.generate ? 
                        customPrompts.generate.replace('{keywords}', explosiveElements) :
                        `请使用以下爆款写作技巧，仿写一篇类似风格的爆款文章：\n\n分析出的爆款要素：${explosiveElements}\n\n仿写要求：\n1. **严格模仿标题套路**：使用相同的标题技巧、关键词和吸引力公式\n2. **复制开头套路**：完全模仿原文的开头方式和情感触点\n3. **保持相同结构**：使用相同的段落组织、逻辑展开和表达方式\n4. **复制传播引爆点**：保持原文最容易被转发/讨论的元素\n5. **保持相似主题领域**：在类似或相关的领域内创作，不要完全改变主题\n6. **相似的核心内容**：保持原文的核心观点和内容方向\n7. 字数控制在800-1200字\n\n**文章格式要求**：\n- **必须是连贯完整的文章**，不要出现“第一段”、“第二段”、“结尾”等标记\n- **不要使用段落标题**，直接写正文内容\n- **保持文字流畅自然**，像一篇正常的微信文章\n\n**重要提醒**：\n- 不要强行改成诗词主题，保持原文的核心领域和内容方向\n- 重点是仿写风格和套路，而不是改变主题\n- 如枟原文讲的是职场，你也写职场；原文讲情感，你也写情感\n\n请开始仿写：`
                }),
                
                // 生成爆款标题 - 使用原文主题领域而不是固定的诗词
                aiService.titleGenerator.generateMultipleTitles('仿写文章', topic, 'popular', 3),
                
                // 生成封面图 - 使用默认封面，不调用AI图片生成
                Promise.resolve({ success: true, imageUrl: null, useDefault: true })
            ]);
            
            // 处理结果
            if (articleResult.status === 'fulfilled' && articleResult.value?.content) {
                finalContent = articleResult.value.content;
                console.log('✅ 爆款文内容生成成功');
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
            originTitle,
            originSummary,
            topic,
            keywords,
            content: finalContent,
            titles: titles,
            cover: cover,
            explosiveElements: explosiveElements // 返回分析的爆款要素，供前端显示
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