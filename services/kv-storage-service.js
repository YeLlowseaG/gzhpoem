// 动态导入 KV，避免环境变量缺失时报错
let kv = null;
try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        kv = require('@vercel/kv').kv;
    } else if (process.env.REDIS_URL) {
        // 使用 Redis URL 创建连接
        const redis = require('redis');
        kv = redis.createClient({ url: process.env.REDIS_URL });
        kv.connect().catch(console.error);
    }
} catch (error) {
    console.warn('KV/Redis 初始化失败:', error.message);
}
const { v4: uuidv4 } = require('uuid');

class KVStorageService {
    constructor() {
        this.isKVAvailable = this.checkKVAvailability();
        console.log(this.isKVAvailable ? '✅ KV 存储服务已启用' : '⚠️ KV 存储服务不可用，使用内存存储');
        
        // 内存备用存储（开发环境）
        this.memoryStorage = {
            articles: [],
            stats: {
                totalArticles: 0,
                totalGenerations: 0,
                totalWechatUploads: 0,
                createdAt: new Date().toISOString()
            }
        };
    }

    /**
     * 检查 KV 是否可用
     */
    checkKVAvailability() {
        return !!kv;
    }

    /**
     * 检查存储是否准备就绪
     */
    isReady() {
        return true;
    }

    /**
     * 获取数据目录路径（兼容性）
     */
    getDataPath() {
        return this.isKVAvailable ? 'Vercel KV' : 'Memory Storage';
    }

    /**
     * 保存文章
     */
    async saveArticle(article) {
        try {
            const newArticle = {
                id: uuidv4(),
                ...article,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (this.isKVAvailable) {
                // 使用 KV 存储
                const articles = await this.loadArticles();
                articles.unshift(newArticle);
                
                // 限制最多保存1000篇文章
                if (articles.length > 1000) {
                    articles.splice(1000);
                }
                
                await kv.set('articles', JSON.stringify(articles));
                
                // 更新统计
                await this.updateStats('totalArticles', 1);
                await this.updateStats('totalGenerations', 1);
            } else {
                // 使用内存存储
                this.memoryStorage.articles.unshift(newArticle);
                if (this.memoryStorage.articles.length > 1000) {
                    this.memoryStorage.articles.splice(1000);
                }
                this.memoryStorage.stats.totalArticles++;
                this.memoryStorage.stats.totalGenerations++;
            }

            console.log(`📄 文章保存成功: ${newArticle.metadata?.title || '未知标题'}`);
            return newArticle;
            
        } catch (error) {
            console.error('❌ 保存文章失败:', error);
            throw error;
        }
    }

    /**
     * 加载所有文章
     */
    async loadArticles() {
        try {
            if (this.isKVAvailable) {
                const data = await kv.get('articles');
                if (data) {
                    return typeof data === 'string' ? JSON.parse(data) : data;
                }
                return [];
            } else {
                return this.memoryStorage.articles;
            }
        } catch (error) {
            console.error('❌ 加载文章失败:', error);
            return [];
        }
    }

    /**
     * 获取文章列表
     */
    async getArticles({ page = 1, limit = 20, search = '' } = {}) {
        try {
            const articles = await this.loadArticles();
            
            // 搜索过滤
            let filteredArticles = articles;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredArticles = articles.filter(article => 
                    article.metadata?.title?.toLowerCase().includes(searchLower) ||
                    article.metadata?.author?.toLowerCase().includes(searchLower) ||
                    article.content?.toLowerCase().includes(searchLower)
                );
            }
            
            // 分页
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
            
            return {
                articles: paginatedArticles,
                pagination: {
                    current: page,
                    total: Math.ceil(filteredArticles.length / limit),
                    count: paginatedArticles.length,
                    totalCount: filteredArticles.length
                }
            };
            
        } catch (error) {
            console.error('❌ 获取文章列表失败:', error);
            return {
                articles: [],
                pagination: { current: 1, total: 0, count: 0, totalCount: 0 }
            };
        }
    }

    /**
     * 获取单篇文章
     */
    async getArticle(id) {
        try {
            const articles = await this.loadArticles();
            const article = articles.find(a => a.id === id);
            
            if (!article) {
                throw new Error('文章不存在');
            }
            
            return article;
            
        } catch (error) {
            console.error('❌ 获取文章失败:', error);
            throw error;
        }
    }

    /**
     * 更新文章
     */
    async updateArticle(id, updates) {
        try {
            const articles = await this.loadArticles();
            const index = articles.findIndex(a => a.id === id);
            
            if (index === -1) {
                throw new Error('文章不存在');
            }
            
            articles[index] = {
                ...articles[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            if (this.isKVAvailable) {
                await kv.set('articles', JSON.stringify(articles));
            } else {
                this.memoryStorage.articles = articles;
            }
            
            console.log(`📄 文章更新成功: ${id}`);
            return articles[index];
            
        } catch (error) {
            console.error('❌ 更新文章失败:', error);
            throw error;
        }
    }

    /**
     * 删除文章
     */
    async deleteArticle(id) {
        try {
            const articles = await this.loadArticles();
            const index = articles.findIndex(a => a.id === id);
            
            if (index === -1) {
                throw new Error('文章不存在');
            }
            
            const deletedArticle = articles.splice(index, 1)[0];
            
            if (this.isKVAvailable) {
                await kv.set('articles', JSON.stringify(articles));
                await this.updateStats('totalArticles', -1);
            } else {
                this.memoryStorage.articles = articles;
                this.memoryStorage.stats.totalArticles--;
            }
            
            console.log(`🗑️ 文章删除成功: ${deletedArticle.metadata?.title || '未知标题'}`);
            return deletedArticle;
            
        } catch (error) {
            console.error('❌ 删除文章失败:', error);
            throw error;
        }
    }

    /**
     * 搜索文章
     */
    async searchArticles(query, { page = 1, limit = 20 } = {}) {
        return this.getArticles({ page, limit, search: query });
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        try {
            let stats;
            
            if (this.isKVAvailable) {
                const data = await kv.get('stats');
                if (data) {
                    stats = typeof data === 'string' ? JSON.parse(data) : data;
                } else {
                    stats = {
                        totalArticles: 0,
                        totalGenerations: 0,
                        totalWechatUploads: 0,
                        createdAt: new Date().toISOString()
                    };
                }
            } else {
                stats = this.memoryStorage.stats;
            }
            
            // 获取实时统计
            const articles = await this.loadArticles();
            const recentArticles = articles.filter(a => 
                new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            );
            
            return {
                ...stats,
                currentArticles: articles.length,
                recentArticles: recentArticles.length,
                updatedAt: new Date().toISOString(),
                storageType: this.isKVAvailable ? 'Vercel KV' : 'Memory'
            };
            
        } catch (error) {
            console.error('❌ 获取统计失败:', error);
            return {
                totalArticles: 0,
                totalGenerations: 0,
                totalWechatUploads: 0,
                currentArticles: 0,
                recentArticles: 0,
                storageType: 'Error'
            };
        }
    }

    /**
     * 更新统计
     */
    async updateStats(key, increment) {
        try {
            if (this.isKVAvailable) {
                const data = await kv.get('stats');
                const stats = data ? (typeof data === 'string' ? JSON.parse(data) : data) : {};
                stats[key] = (stats[key] || 0) + increment;
                stats.updatedAt = new Date().toISOString();
                await kv.set('stats', JSON.stringify(stats));
            } else {
                this.memoryStorage.stats[key] = (this.memoryStorage.stats[key] || 0) + increment;
                this.memoryStorage.stats.updatedAt = new Date().toISOString();
            }
            
        } catch (error) {
            console.error('❌ 更新统计失败:', error);
        }
    }

    /**
     * 标记文章为已上传微信
     */
    async markAsUploaded(id, uploadData) {
        try {
            await this.updateArticle(id, {
                wechatUpload: {
                    uploaded: true,
                    uploadedAt: new Date().toISOString(),
                    ...uploadData
                }
            });
            
            // 更新统计
            await this.updateStats('totalWechatUploads', 1);
            
        } catch (error) {
            console.error('❌ 标记上传状态失败:', error);
        }
    }

    /**
     * 导出数据
     */
    async exportData() {
        try {
            const articles = await this.loadArticles();
            const stats = await this.getStats();
            
            return {
                articles,
                stats,
                exportedAt: new Date().toISOString(),
                storageType: this.isKVAvailable ? 'Vercel KV' : 'Memory'
            };
            
        } catch (error) {
            console.error('❌ 导出数据失败:', error);
            throw error;
        }
    }

    /**
     * 导入数据
     */
    async importData(data) {
        try {
            if (data.articles && Array.isArray(data.articles)) {
                if (this.isKVAvailable) {
                    await kv.set('articles', JSON.stringify(data.articles));
                } else {
                    this.memoryStorage.articles = data.articles;
                }
            }
            
            if (data.stats) {
                if (this.isKVAvailable) {
                    await kv.set('stats', JSON.stringify(data.stats));
                } else {
                    this.memoryStorage.stats = data.stats;
                }
            }
            
            console.log('✅ 数据导入成功');
            
        } catch (error) {
            console.error('❌ 导入数据失败:', error);
            throw error;
        }
    }

    /**
     * 清理旧数据
     */
    async cleanup(daysToKeep = 90) {
        try {
            const articles = await this.loadArticles();
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            
            const filteredArticles = articles.filter(article => 
                new Date(article.createdAt) > cutoffDate
            );
            
            if (filteredArticles.length < articles.length) {
                if (this.isKVAvailable) {
                    await kv.set('articles', JSON.stringify(filteredArticles));
                } else {
                    this.memoryStorage.articles = filteredArticles;
                }
                console.log(`🧹 清理了 ${articles.length - filteredArticles.length} 篇旧文章`);
            }
            
        } catch (error) {
            console.error('❌ 清理数据失败:', error);
        }
    }

    /**
     * 迁移现有数据到 KV（一次性操作）
     */
    async migrateFromFileSystem(oldStorageService) {
        try {
            if (!this.isKVAvailable) {
                console.log('⚠️ KV 不可用，跳过迁移');
                return;
            }

            console.log('🔄 开始迁移数据到 KV...');
            
            // 迁移文章
            const articles = await oldStorageService.loadArticles();
            if (articles.length > 0) {
                await kv.set('articles', JSON.stringify(articles));
                console.log(`✅ 迁移了 ${articles.length} 篇文章`);
            }
            
            // 迁移统计
            const stats = await oldStorageService.getStats();
            await kv.set('stats', JSON.stringify(stats));
            console.log('✅ 迁移了统计数据');
            
            console.log('🎉 数据迁移完成');
            
        } catch (error) {
            console.error('❌ 数据迁移失败:', error);
        }
    }
}

module.exports = KVStorageService;