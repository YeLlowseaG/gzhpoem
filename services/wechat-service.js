const axios = require('axios');
const FormData = require('form-data');

class WechatService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = 0;
        this.appId = process.env.WECHAT_APPID;
        this.appSecret = process.env.WECHAT_SECRET;
    }

    /**
     * 检查是否已配置微信服务
     */
    isConfigured() {
        return !!(this.appId && this.appSecret);
    }

    /**
     * 获取AccessToken
     */
    async getAccessToken(appId, appSecret) {
        // 使用传入的参数或环境变量
        const id = appId || this.appId;
        const secret = appSecret || this.appSecret;
        
        if (!id || !secret) {
            throw new Error('微信AppID和AppSecret未配置');
        }

        // 检查token是否还有效
        if (this.accessToken && Date.now() < this.tokenExpiry && this.appId === id) {
            return this.accessToken;
        }

        try {
            console.log('🔄 获取微信AccessToken...');
            
            const response = await axios.get(
                `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${id}&secret=${secret}`,
                { timeout: 10000 }
            );

            if (response.data.errcode) {
                throw new Error(`微信API错误: ${response.data.errmsg} (${response.data.errcode})`);
            }

            if (!response.data.access_token) {
                throw new Error('未获取到有效的AccessToken');
            }

            // 缓存token
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期
            this.appId = id;
            this.appSecret = secret;

            console.log('✅ 微信AccessToken获取成功');
            return this.accessToken;

        } catch (error) {
            console.error('❌ 获取微信AccessToken失败:', error.message);
            throw error;
        }
    }

    /**
     * 测试微信连接
     */
    async testConnection(appId, appSecret) {
        try {
            const token = await this.getAccessToken(appId, appSecret);
            
            // 测试调用一个简单的API
            const response = await axios.get(
                `https://api.weixin.qq.com/cgi-bin/getcallbackip?access_token=${token}`,
                { timeout: 5000 }
            );

            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`微信API测试失败: ${response.data.errmsg}`);
            }

            return {
                success: true,
                message: '微信公众号连接成功',
                data: {
                    appId: appId || this.appId,
                    tokenExpiry: new Date(this.tokenExpiry).toLocaleString()
                }
            };

        } catch (error) {
            return {
                success: false,
                message: '微信公众号连接失败',
                error: error.message
            };
        }
    }

    /**
     * 上传图片到微信素材库
     */
    async uploadImage(imageUrl, appId, appSecret) {
        try {
            const token = await this.getAccessToken(appId, appSecret);
            
            console.log('🖼️ 上传图片到微信素材库...');
            
            // 下载图片
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'stream',
                timeout: 30000
            });

            // 创建FormData
            const form = new FormData();
            form.append('media', imageResponse.data, {
                filename: 'cover.jpg',
                contentType: 'image/jpeg'
            });

            // 上传到微信
            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                    },
                    timeout: 30000
                }
            );

            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`图片上传失败: ${response.data.errmsg}`);
            }

            console.log('✅ 图片上传成功');
            return response.data.media_id;

        } catch (error) {
            console.error('❌ 图片上传失败:', error.message);
            // 返回默认图片URL，让微信自己处理
            return imageUrl;
        }
    }

    /**
     * 上传文章到草稿箱（支持完整内容包）
     */
    async uploadToDraft(article, appId, appSecret, selectedTitle = null) {
        try {
            const token = await this.getAccessToken(appId, appSecret);
            
            console.log('📄 上传完整内容包到草稿箱...');
            
            // 处理文章内容，进行公众号排版
            const formattedContent = this.formatContentForWechat(article.content);
            
            // 选择标题（优先使用用户选择的标题）
            const finalTitle = selectedTitle || 
                               (article.titles && article.titles[0]) || 
                               this.generateTitle(article.metadata);
            
            // 上传封面图片
            let thumbMediaId = null;
            
            try {
                // 检查是否有AI生成的封面
                const imageUrl = article.cover?.imageUrl;
                if (imageUrl) {
                    console.log('📸 使用AI生成的封面图片:', imageUrl);
                } else {
                    console.log('📸 使用默认封面图片');
                }
                
                console.log('🔍 文章数据检查:', {
                    hasCover: !!article.cover,
                    hasImageUrl: !!article.cover?.imageUrl,
                    imageUrl: article.cover?.imageUrl?.substring(0, 50) + '...'
                });
                
                thumbMediaId = await this.uploadDefaultCover(appId, appSecret, imageUrl);
                console.log('✅ 封面上传成功, media_id:', thumbMediaId);
            } catch (error) {
                console.error('❌ 封面上传失败:', error.message);
                throw new Error('封面图片上传失败，无法创建草稿');
            }

            // 构建草稿数据
            const draftData = {
                articles: [{
                    title: finalTitle,
                    author: '最美诗词',
                    digest: this.generateDigest(formattedContent),
                    content: formattedContent,
                    content_source_url: '',
                    thumb_media_id: thumbMediaId,
                    show_cover_pic: 1,
                    need_open_comment: 1,
                    only_fans_can_comment: 0
                }]
            };
            
            console.log('📄 草稿数据:', JSON.stringify(draftData, null, 2));

            // 上传草稿
            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`,
                draftData,
                { timeout: 30000 }
            );

            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`草稿上传失败: ${response.data.errmsg}`);
            }

            console.log('✅ 完整内容包上传成功');
            return {
                success: true,
                message: '完整内容包已上传到草稿箱',
                data: {
                    media_id: response.data.media_id,
                    title: finalTitle,
                    hasCustomCover: !!thumbMediaId,
                    coverType: article.cover ? 'text' : 'image'
                }
            };

        } catch (error) {
            console.error('❌ 上传草稿失败:', error.message);
            return {
                success: false,
                message: '上传失败',
                error: error.message
            };
        }
    }

    /**
     * 为微信公众号格式化内容（优化排版）
     */
    formatContentForWechat(content) {
        // 移除markdown图片语法，保留alt文本
        content = content.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
        
        // 转换markdown标题为微信编辑器格式，增加样式
        content = content.replace(/^### (.+)$/gm, '<h3 style="color: #2c3e50; font-size: 18px; margin: 20px 0 10px 0;">$1</h3>');
        content = content.replace(/^## (.+)$/gm, '<h2 style="color: #34495e; font-size: 20px; margin: 25px 0 15px 0; border-left: 4px solid #3498db; padding-left: 10px;">$1</h2>');
        content = content.replace(/^# (.+)$/gm, '<h1 style="color: #2c3e50; font-size: 24px; text-align: center; margin: 30px 0 20px 0;">$1</h1>');
        
        // 转换引用格式，增加样式
        content = content.replace(/^> (.+)$/gm, '<blockquote style="background: #f8f9fa; border-left: 4px solid #6c757d; margin: 15px 0; padding: 10px 15px; font-style: italic;">$1</blockquote>');
        
        // 转换粗体和斜体，增加颜色
        content = content.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #e74c3c;">$1</strong>');
        content = content.replace(/\*([^*]+)\*/g, '<em style="color: #8e44ad;">$1</em>');
        
        // 处理段落，增加行间距
        const paragraphs = content.split('\n\n');
        const styledParagraphs = paragraphs.map(p => {
            if (p.trim() && !p.includes('<h') && !p.includes('<blockquote')) {
                // 检查是否是诗词内容（包含诗句特征）
                const isPoetry = /^[^\s]+，\s*$|^[^\s]+。\s*$/m.test(p) || 
                               /床前明月光|举头望明月|低头思故乡/i.test(p);
                               
                const indentStyle = isPoetry ? '' : 'text-indent: 2em;';
                return `<p style="line-height: 1.8; margin: 15px 0; ${indentStyle}">${p.replace(/\n/g, '<br>')}</p>`;
            }
            return p.replace(/\n/g, '<br>');
        });
        
        content = styledParagraphs.join('\n');
        
        // 添加分隔线样式
        content = content.replace(/---/g, '<hr style="border: none; height: 1px; background: linear-gradient(to right, transparent, #bdc3c7, transparent); margin: 30px 0;">');
        
        // 添加整体容器样式
        content = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; font-size: 16px; color: #2c3e50; max-width: 100%; word-wrap: break-word;">${content}</div>`;
        
        return content;
    }

    /**
     * 处理文章内容（保持向后兼容）
     */
    processArticleContent(content) {
        return this.formatContentForWechat(content);
    }

    /**
     * 上传文字封面为图片
     */
    async uploadTextCoverAsImage(cover, appId, appSecret) {
        try {
            // 这里应该将HTML转换为图片
            // 由于需要无头浏览器，我们先返回一个占位符
            // 实际部署时可以集成puppeteer或其他HTML转图片的服务
            
            console.log('📸 文字封面转图片功能需要额外配置');
            
            // 暂时返回null，使用默认图片处理
            return null;
            
        } catch (error) {
            console.error('文字封面转图片失败:', error);
            return null;
        }
    }

    /**
     * 提取封面图片URL
     */
    extractCoverImage(content) {
        const match = content.match(/!\[封面图片\]\(([^)]+)\)/);
        return match ? match[1] : null;
    }

    /**
     * 生成文章标题
     */
    generateTitle(metadata) {
        const { author, title } = metadata;
        return `${author}《${title}》深度解读 | 最美诗词`;
    }

    /**
     * 生成文章摘要
     */
    generateDigest(content) {
        // 移除HTML标签和多余的空白字符
        let plainText = content.replace(/<[^>]*>/g, '');
        plainText = plainText.replace(/\s+/g, ' ').trim();
        
        // 微信摘要限制在64字符以内更安全
        const maxLength = 60;
        const digest = plainText.substring(0, maxLength);
        
        return digest + (plainText.length > maxLength ? '...' : '');
    }

    /**
     * 获取草稿列表
     */
    async getDraftList(appId, appSecret, offset = 0, count = 20) {
        try {
            const token = await this.getAccessToken(appId, appSecret);
            
            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${token}`,
                {
                    offset: parseInt(offset),
                    count: parseInt(count)
                },
                { timeout: 10000 }
            );

            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`获取草稿列表失败: ${response.data.errmsg}`);
            }

            return {
                success: true,
                data: {
                    total_count: response.data.total_count,
                    item_count: response.data.item_count,
                    items: response.data.item || []
                }
            };

        } catch (error) {
            console.error('❌ 获取草稿列表失败:', error.message);
            return {
                success: false,
                message: '获取草稿列表失败',
                error: error.message
            };
        }
    }

    /**
     * 删除草稿
     */
    async deleteDraft(mediaId, appId, appSecret) {
        try {
            const token = await this.getAccessToken(appId, appSecret);
            
            const response = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=${token}`,
                { media_id: mediaId },
                { timeout: 10000 }
            );

            if (response.data.errcode && response.data.errcode !== 0) {
                throw new Error(`删除草稿失败: ${response.data.errmsg}`);
            }

            return {
                success: true,
                message: '草稿删除成功'
            };

        } catch (error) {
            console.error('❌ 删除草稿失败:', error.message);
            return {
                success: false,
                message: '删除草稿失败',
                error: error.message
            };
        }
    }

    /**
     * 清理过期的AccessToken
     */
    clearExpiredToken() {
        if (Date.now() >= this.tokenExpiry) {
            this.accessToken = null;
            this.tokenExpiry = 0;
        }
    }

    /**
     * 上传封面图片
     */
    async uploadDefaultCover(appId, appSecret, aiImageUrl = null) {
        try {
            const token = await this.getAccessToken(appId, appSecret);
            
            let imageBuffer;
            
            if (aiImageUrl) {
                // 下载AI生成的图片
                console.log('📸 下载AI生成的图片...');
                const imageResponse = await axios.get(aiImageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                });
                imageBuffer = Buffer.from(imageResponse.data);
                console.log(`✅ AI图片下载成功: ${imageBuffer.length} bytes`);
            } else {
                // 生成默认封面图片
                console.log('📸 生成默认封面图片...');
                imageBuffer = await this.generateDefaultCoverBuffer();
            }
            
            const formData = new FormData();
            formData.append('media', imageBuffer, {
                filename: 'default-cover.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('type', 'thumb');
            
            console.log('📤 上传封面到微信（永久素材 - 缩略图）...');
            const uploadResponse = await axios.post(
                `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=thumb`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: 30000
                }
            );
            
            console.log('📤 微信上传响应:', uploadResponse.data);
            
            if (uploadResponse.data.errcode && uploadResponse.data.errcode !== 0) {
                throw new Error(`图片上传失败: ${uploadResponse.data.errmsg}`);
            }
            
            const mediaId = uploadResponse.data.media_id || uploadResponse.data.thumb_media_id;
            
            if (!mediaId) {
                throw new Error('微信返回的media_id为空');
            }
            
            return mediaId;
            
        } catch (error) {
            console.error('默认封面上传失败:', error.message);
            throw error;
        }
    }

    /**
     * 生成默认封面图片缓冲区
     */
    async generateDefaultCoverBuffer() {
        try {
            // 使用一个稳定的图片服务
            const imageUrls = [
                'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&h=400&fit=crop&fm=jpg&q=60',
                'https://picsum.photos/600/400.jpg',
                'https://dummyimage.com/600x400/f4f1e8/8b4513.jpg&text=Cover'
            ];
            
            for (const imageUrl of imageUrls) {
                try {
                    console.log(`📸 尝试下载封面图片: ${imageUrl}`);
                    const imageResponse = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 8000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                        }
                    });
                    
                    const buffer = Buffer.from(imageResponse.data);
                    if (buffer.length > 1000 && buffer.length < 1024 * 1024) { // 1KB-1MB
                        console.log(`✅ 成功下载封面: ${buffer.length} bytes`);
                        return buffer;
                    }
                } catch (error) {
                    console.log(`❌ 下载失败: ${error.message}`);
                    continue;
                }
            }
            
            throw new Error('所有图片源都无法访问');
            
        } catch (error) {
            console.warn('下载在线图片失败，创建最基础图片:', error.message);
            
            // 最终备用方案：创建一个有效的JPEG文件
            // 这是一个1x1像素的白色JPEG
            const minimalValidJpeg = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
                0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11,
                0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
                0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
                0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
                0x00, 0x80, 0xFF, 0xD9
            ]);
            
            console.log(`生成备用封面: ${minimalValidJpeg.length} bytes`);
            return minimalValidJpeg;
        }
    }
}

module.exports = WechatService;