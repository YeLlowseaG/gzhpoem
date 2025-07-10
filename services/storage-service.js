const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class StorageService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.articlesFile = path.join(this.dataDir, 'articles.json');
        this.configFile = path.join(this.dataDir, 'config.json');
        this.statsFile = path.join(this.dataDir, 'stats.json');
        
        this.initializeStorage();
    }

    /**
     * 初始化存储
     */
    async initializeStorage() {
        try {
            // 确保数据目录存在
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // 初始化文件
            await this.initializeFile(this.articlesFile, []);
            await this.initializeFile(this.configFile, {});
            await this.initializeFile(this.statsFile, {
                totalArticles: 0,
                totalGenerations: 0,
                totalWechatUploads: 0,
                createdAt: new Date().toISOString()
            });
            
            console.log('✅ 存储服务初始化完成');
        } catch (error) {
            console.error('❌ 存储服务初始化失败:', error);
        }
    }

    /**
     * 初始化单个文件
     */
    async initializeFile(filePath, defaultData) {
        try {
            await fs.access(filePath);
        } catch (error) {
            // 文件不存在，创建默认文件
            await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
        }
    }

    /**
     * 检查存储是否准备就绪
     */
    isReady() {
        return true; // 简化实现
    }

    /**
     * 获取数据目录路径
     */
    getDataPath() {
        return this.dataDir;
    }

    /**
     * 保存文章
     */
    async saveArticle(article) {
        try {
            const articles = await this.loadArticles();
            
            const newArticle = {
                id: uuidv4(),
                ...article,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            articles.unshift(newArticle); // 最新的在前面
            
            // 限制最多保存1000篇文章
            if (articles.length > 1000) {
                articles.splice(1000);
            }
            
            await fs.writeFile(this.articlesFile, JSON.stringify(articles, null, 2));
            
            // 更新统计
            await this.updateStats('totalArticles', 1);
            await this.updateStats('totalGenerations', 1);
            
            console.log(`📄 文章保存成功: ${newArticle.metadata.title}`);
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
            const data = await fs.readFile(this.articlesFile, 'utf-8');
            return JSON.parse(data);
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
                    article.metadata.title.toLowerCase().includes(searchLower) ||
                    article.metadata.author.toLowerCase().includes(searchLower) ||
                    article.content.toLowerCase().includes(searchLower)
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
            
            await fs.writeFile(this.articlesFile, JSON.stringify(articles, null, 2));
            
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
            await fs.writeFile(this.articlesFile, JSON.stringify(articles, null, 2));
            
            // 更新统计
            await this.updateStats('totalArticles', -1);
            
            console.log(`🗑️ 文章删除成功: ${deletedArticle.metadata.title}`);
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
            const data = await fs.readFile(this.statsFile, 'utf-8');
            const stats = JSON.parse(data);
            
            // 获取实时统计
            const articles = await this.loadArticles();
            const recentArticles = articles.filter(a => 
                new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            );
            
            return {
                ...stats,
                currentArticles: articles.length,
                recentArticles: recentArticles.length,
                updatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ 获取统计失败:', error);
            return {
                totalArticles: 0,
                totalGenerations: 0,
                totalWechatUploads: 0,
                currentArticles: 0,
                recentArticles: 0
            };
        }
    }

    /**
     * 更新统计
     */
    async updateStats(key, increment) {
        try {
            const stats = await this.getStats();
            stats[key] = (stats[key] || 0) + increment;
            stats.updatedAt = new Date().toISOString();
            
            await fs.writeFile(this.statsFile, JSON.stringify(stats, null, 2));
            
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
                exportedAt: new Date().toISOString()
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
                await fs.writeFile(this.articlesFile, JSON.stringify(data.articles, null, 2));
            }
            
            if (data.stats) {
                await fs.writeFile(this.statsFile, JSON.stringify(data.stats, null, 2));
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
                await fs.writeFile(this.articlesFile, JSON.stringify(filteredArticles, null, 2));
                console.log(`🧹 清理了 ${articles.length - filteredArticles.length} 篇旧文章`);
            }
            
        } catch (error) {
            console.error('❌ 清理数据失败:', error);
        }
    }
}

module.exports = StorageService;