// 诗词生成器 - 重构版本
// 专为个人使用优化，注重稳定性和易用性

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// 服务模块
const AIService = require('./services/ai-service');
const WechatService = require('./services/wechat-service');
const KVStorageService = require('./services/kv-storage-service');
const ConfigService = require('./services/config-service');

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化服务
const aiService = new AIService();
const wechatService = new WechatService();
const storageService = new KVStorageService();
const configService = new ConfigService();

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

// ==================== AI 相关接口 ====================

// 生成完整的公众号内容包（文章+标题+封面）
app.post('/api/articles/generate', async (req, res) => {
    console.log('=== 生成文章请求开始 ===');
    console.log('请求体:', JSON.stringify(req.body, null, 2));
    
    try {
        const { author, title, style, keywords, content } = req.body;
        
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
            content
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