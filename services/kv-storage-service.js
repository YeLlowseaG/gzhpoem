const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class KVStorageService {
    constructor() {
        this.redis = null;
        if (process.env.REDIS_URL) {
            this.redis = new Redis(process.env.REDIS_URL);
            this.isRedisAvailable = true;
            console.log('✅ Redis 存储服务已启用！');
        } else {
            this.isRedisAvailable = false;
            console.log('⚠️ Redis 存储服务不可用，使用内存存储');
        }
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

    isReady() {
        return true;
    }

    getDataPath() {
        return this.isRedisAvailable ? 'Redis' : 'Memory Storage';
    }

    async saveArticle(article) {
        const newArticle = {
            id: uuidv4(),
            ...article,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (this.isRedisAvailable) {
            const articles = await this.loadArticles();
            articles.unshift(newArticle);
            if (articles.length > 1000) articles.splice(1000);
            await this.redis.set('articles', JSON.stringify(articles));
            await this.updateStats('totalArticles', 1);
            await this.updateStats('totalGenerations', 1);
        } else {
            this.memoryStorage.articles.unshift(newArticle);
            if (this.memoryStorage.articles.length > 1000) this.memoryStorage.articles.splice(1000);
            this.memoryStorage.stats.totalArticles++;
            this.memoryStorage.stats.totalGenerations++;
        }
        return newArticle;
    }

    async loadArticles() {
        if (this.isRedisAvailable) {
            const data = await this.redis.get('articles');
            return data ? JSON.parse(data) : [];
        } else {
            return this.memoryStorage.articles;
        }
    }

    async getArticles({ page = 1, limit = 20, search = '' } = {}) {
        const articles = await this.loadArticles();
        let filteredArticles = articles;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredArticles = articles.filter(article =>
                article.metadata?.title?.toLowerCase().includes(searchLower) ||
                article.metadata?.author?.toLowerCase().includes(searchLower) ||
                article.content?.toLowerCase().includes(searchLower)
            );
        }
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
    }

    async getArticle(id) {
        const articles = await this.loadArticles();
        const article = articles.find(a => a.id === id);
        if (!article) throw new Error('文章不存在');
        return article;
    }

    async updateArticle(id, updates) {
        const articles = await this.loadArticles();
        const index = articles.findIndex(a => a.id === id);
        if (index === -1) throw new Error('文章不存在');
        articles[index] = {
            ...articles[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        if (this.isRedisAvailable) {
            await this.redis.set('articles', JSON.stringify(articles));
        } else {
            this.memoryStorage.articles = articles;
        }
        return articles[index];
    }

    async deleteArticle(id) {
        const articles = await this.loadArticles();
        const index = articles.findIndex(a => a.id === id);
        if (index === -1) throw new Error('文章不存在');
        const deletedArticle = articles.splice(index, 1)[0];
        if (this.isRedisAvailable) {
            await this.redis.set('articles', JSON.stringify(articles));
            await this.updateStats('totalArticles', -1);
        } else {
            this.memoryStorage.articles = articles;
            this.memoryStorage.stats.totalArticles--;
        }
        return deletedArticle;
    }

    async searchArticles(query, { page = 1, limit = 20 } = {}) {
        return this.getArticles({ page, limit, search: query });
    }

    async getStats() {
        let stats;
        if (this.isRedisAvailable) {
            const data = await this.redis.get('stats');
            stats = data ? JSON.parse(data) : {
                totalArticles: 0,
                totalGenerations: 0,
                totalWechatUploads: 0,
                createdAt: new Date().toISOString()
            };
        } else {
            stats = this.memoryStorage.stats;
        }
        const articles = await this.loadArticles();
        const recentArticles = articles.filter(a =>
            new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        return {
            ...stats,
            currentArticles: articles.length,
            recentArticles: recentArticles.length,
            updatedAt: new Date().toISOString(),
            storageType: this.isRedisAvailable ? 'Redis' : 'Memory'
        };
    }

    async updateStats(key, increment) {
        if (this.isRedisAvailable) {
            const data = await this.redis.get('stats');
            const stats = data ? JSON.parse(data) : {};
            stats[key] = (stats[key] || 0) + increment;
            stats.updatedAt = new Date().toISOString();
            await this.redis.set('stats', JSON.stringify(stats));
        } else {
            this.memoryStorage.stats[key] = (this.memoryStorage.stats[key] || 0) + increment;
            this.memoryStorage.stats.updatedAt = new Date().toISOString();
        }
    }

    async markAsUploaded(id, uploadData) {
        await this.updateArticle(id, {
            wechatUpload: {
                uploaded: true,
                uploadedAt: new Date().toISOString(),
                ...uploadData
            }
        });
        await this.updateStats('totalWechatUploads', 1);
    }

    async exportData() {
        const articles = await this.loadArticles();
        const stats = await this.getStats();
        return {
            articles,
            stats,
            exportedAt: new Date().toISOString(),
            storageType: this.isRedisAvailable ? 'Redis' : 'Memory'
        };
    }

    async importData(data) {
        if (data.articles && Array.isArray(data.articles)) {
            if (this.isRedisAvailable) {
                await this.redis.set('articles', JSON.stringify(data.articles));
            } else {
                this.memoryStorage.articles = data.articles;
            }
        }
        if (data.stats) {
            if (this.isRedisAvailable) {
                await this.redis.set('stats', JSON.stringify(data.stats));
            } else {
                this.memoryStorage.stats = data.stats;
            }
        }
    }

    async cleanup(daysToKeep = 90) {
        const articles = await this.loadArticles();
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
        const filteredArticles = articles.filter(article =>
            new Date(article.createdAt) > cutoffDate
        );
        if (filteredArticles.length < articles.length) {
            if (this.isRedisAvailable) {
                await this.redis.set('articles', JSON.stringify(filteredArticles));
            } else {
                this.memoryStorage.articles = filteredArticles;
            }
        }
    }

    // 通用 get/set 方法
    async get(key) {
        if (this.isRedisAvailable) {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        } else {
            return this.memoryStorage[key] || null;
        }
    }

    async set(key, value) {
        if (this.isRedisAvailable) {
            await this.redis.set(key, JSON.stringify(value));
        } else {
            this.memoryStorage[key] = value;
        }
    }

    async delete(key) {
        if (this.isRedisAvailable) {
            await this.redis.del(key);
        } else {
            delete this.memoryStorage[key];
        }
    }
}

module.exports = KVStorageService;