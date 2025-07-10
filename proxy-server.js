// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AIService = require('./ai-service');

const app = express();
const port = 3001;

// 初始化AI服务
const aiService = new AIService();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 服务静态文件

// 内存存储配置
const upload = multer({ storage: multer.memoryStorage() });

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'proxy-server', port: port });
});

// AI生成诗词赏析接口
app.post('/api/ai/generate', async (req, res) => {
    try {
        const { title, author, content, style } = req.body;
        
        console.log('收到AI生成请求:', { title, author, style });
        
        if (!title || !author) {
            return res.status(400).json({
                success: false,
                error: '标题和作者不能为空'
            });
        }
        
        const result = await aiService.generatePoetryAnalysis({
            title,
            author,
            content,
            style: style || '通俗'
        });
        
        res.json(result);
        
    } catch (error) {
        console.error('AI生成失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 测试AI连接
app.get('/api/ai/test', async (req, res) => {
    try {
        const result = await aiService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'AI服务测试失败',
            error: error.message
        });
    }
});

// 切换AI服务提供商
app.post('/api/ai/switch', async (req, res) => {
    try {
        const { provider } = req.body;
        
        if (!provider) {
            return res.status(400).json({
                success: false,
                error: '请指定AI服务提供商'
            });
        }
        
        aiService.switchProvider(provider);
        
        res.json({
            success: true,
            message: `已切换到 ${provider} 服务`
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// 获取微信AccessToken
app.post('/api/wechat/token', async (req, res) => {
    try {
        const { appId, appSecret } = req.body;
        
        if (!appId || !appSecret) {
            return res.status(400).json({
                success: false,
                error: 'AppID和AppSecret不能为空'
            });
        }
        
        const response = await axios.get(
            `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
        );
        
        if (response.data.errcode) {
            return res.status(400).json({
                success: false,
                error: response.data.errmsg,
                errcode: response.data.errcode
            });
        }
        
        res.json({
            success: true,
            access_token: response.data.access_token,
            expires_in: response.data.expires_in
        });
        
    } catch (error) {
        console.error('获取微信Token失败:', error);
        res.status(500).json({
            success: false,
            error: '获取微信Token失败: ' + error.message
        });
    }
});

// 上传图片到微信
app.post('/api/wechat/upload', upload.single('media'), async (req, res) => {
    try {
        const { access_token } = req.body;
        const file = req.file;
        
        if (!access_token || !file) {
            return res.status(400).json({
                success: false,
                error: '缺少access_token或文件'
            });
        }
        
        const FormData = require('form-data');
        const form = new FormData();
        form.append('media', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
        form.append('type', 'image');
        
        const response = await axios.post(
            `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${access_token}&type=image`,
            form,
            {
                headers: form.getHeaders()
            }
        );
        
        if (response.data.errcode) {
            return res.status(400).json({
                success: false,
                error: response.data.errmsg,
                errcode: response.data.errcode
            });
        }
        
        res.json({
            success: true,
            media_id: response.data.media_id
        });
        
    } catch (error) {
        console.error('上传图片失败:', error);
        res.status(500).json({
            success: false,
            error: '上传图片失败: ' + error.message
        });
    }
});

// 添加草稿
app.post('/api/wechat/draft', async (req, res) => {
    try {
        const { access_token, articles } = req.body;
        
        if (!access_token || !articles) {
            return res.status(400).json({
                success: false,
                error: '缺少access_token或文章内容'
            });
        }
        
        const response = await axios.post(
            `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${access_token}`,
            { articles }
        );
        
        if (response.data.errcode && response.data.errcode !== 0) {
            return res.status(400).json({
                success: false,
                error: response.data.errmsg,
                errcode: response.data.errcode
            });
        }
        
        res.json({
            success: true,
            media_id: response.data.media_id
        });
        
    } catch (error) {
        console.error('添加草稿失败:', error);
        res.status(500).json({
            success: false,
            error: '添加草稿失败: ' + error.message
        });
    }
});

// 获取草稿列表
app.get('/api/wechat/drafts', async (req, res) => {
    try {
        const { access_token, offset = 0, count = 20 } = req.query;
        
        if (!access_token) {
            return res.status(400).json({
                success: false,
                error: '缺少access_token'
            });
        }
        
        const response = await axios.post(
            `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${access_token}`,
            {
                offset: parseInt(offset),
                count: parseInt(count)
            }
        );
        
        if (response.data.errcode && response.data.errcode !== 0) {
            return res.status(400).json({
                success: false,
                error: response.data.errmsg,
                errcode: response.data.errcode
            });
        }
        
        res.json({
            success: true,
            total_count: response.data.total_count,
            item_count: response.data.item_count,
            item: response.data.item
        });
        
    } catch (error) {
        console.error('获取草稿列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取草稿列表失败: ' + error.message
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`🚀 代理服务器运行在 http://localhost:${port}`);
    console.log(`📝 AI服务提供商: ${aiService.currentProvider}`);
    console.log(`🔗 API接口:`);
    console.log(`   - POST /api/ai/generate - 生成诗词赏析`);
    console.log(`   - GET  /api/ai/test - 测试AI连接`);
    console.log(`   - POST /api/ai/switch - 切换AI服务`);
    console.log(`   - POST /api/wechat/token - 获取微信Token`);
    console.log(`   - POST /api/wechat/upload - 上传图片`);
    console.log(`   - POST /api/wechat/draft - 添加草稿`);
    console.log(`   - GET  /api/wechat/drafts - 获取草稿列表`);
});

module.exports = app;