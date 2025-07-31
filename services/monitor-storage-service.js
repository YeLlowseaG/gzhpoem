/**
 * 公众号监控数据存储服务
 * 管理监控账号和文章数据
 * 使用项目现有的KV存储系统
 */

const Redis = require('ioredis');

class MonitorStorageService {
    constructor() {
        this.redis = null;
        if (process.env.REDIS_URL) {
            this.redis = new Redis(process.env.REDIS_URL);
            this.isRedisAvailable = true;
            console.log('✅ 监控存储使用Redis');
        } else {
            this.isRedisAvailable = false;
            console.log('⚠️ 监控存储使用内存模式');
        }
        
        // 内存存储作为fallback
        this.memoryStorage = {
            accounts: [],
            articles: []
        };
        
        this.init();
    }

    async init() {
        try {
            if (this.isRedisAvailable) {
                // 初始化Redis键，如果不存在的话
                const accountsExist = await this.redis.exists('monitor:accounts');
                if (!accountsExist) {
                    await this.redis.set('monitor:accounts', JSON.stringify([]));
                }
                
                const articlesExist = await this.redis.exists('monitor:articles');
                if (!articlesExist) {
                    await this.redis.set('monitor:articles', JSON.stringify([]));
                }
            }
            
            console.log('✅ 监控存储服务初始化完成');
        } catch (error) {
            console.error('❌ 监控存储服务初始化失败:', error);
        }
    }

    /**
     * 保存监控账号列表
     */
    async saveAccounts(accounts) {
        try {
            const processedAccounts = accounts.map(account => ({
                ...account,
                id: account.id || this.generateId(),
                addedAt: account.addedAt || new Date().toISOString(),
                lastChecked: account.lastChecked || null,
                status: account.status || 'active'
            }));
            
            if (this.isRedisAvailable) {
                await this.redis.set('monitor:accounts', JSON.stringify(processedAccounts));
            } else {
                this.memoryStorage.accounts = processedAccounts;
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ 保存监控账号失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取监控账号列表
     */
    async getAccounts() {
        try {
            let accounts = [];
            
            if (this.isRedisAvailable) {
                const data = await this.redis.get('monitor:accounts');
                accounts = data ? JSON.parse(data) : [];
            } else {
                accounts = this.memoryStorage.accounts;
            }
            
            return { success: true, accounts };
        } catch (error) {
            console.error('❌ 获取监控账号失败:', error);
            return { success: true, accounts: [] };
        }
    }

    /**
     * 清理重复账号
     */
    async cleanupDuplicateAccounts() {
        try {
            const { accounts } = await this.getAccounts();
            const uniqueAccounts = [];
            const seen = new Set();
            
            for (const account of accounts) {
                const key = `${account.name}-${account.link}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueAccounts.push(account);
                } else {
                    console.log(`🧹 清理重复账号: ${account.name}`);
                }
            }
            
            if (uniqueAccounts.length !== accounts.length) {
                await this.saveAccounts(uniqueAccounts);
                console.log(`✅ 清理完成，从 ${accounts.length} 个账号清理到 ${uniqueAccounts.length} 个`);
            }
            
            return { success: true, cleaned: accounts.length - uniqueAccounts.length };
        } catch (error) {
            console.error('❌ 清理重复账号失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 添加监控账号
     */
    async addAccount(accountData) {
        try {
            // 先清理可能的重复数据
            await this.cleanupDuplicateAccounts();
            
            const { accounts } = await this.getAccounts();
            
            // 检查是否已存在（只检查name和link，避免wechatId为"未知"时的误判）
            const exists = accounts.find(acc => 
                acc.name === accountData.name || 
                (acc.link === accountData.link && accountData.link && acc.link !== '')
            );
            
            if (exists) {
                console.log(`⚠️ 账号已存在: ${accountData.name}, 现有账号:`, exists);
                return { success: false, error: '账号已存在' };
            }
            
            const newAccount = {
                ...accountData,
                id: this.generateId(),
                addedAt: new Date().toISOString(),
                status: 'active'
            };
            
            accounts.push(newAccount);
            await this.saveAccounts(accounts);
            
            console.log(`✅ 添加监控账号: ${newAccount.name}`);
            return { success: true, account: newAccount };
            
        } catch (error) {
            console.error('❌ 添加监控账号失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 删除监控账号
     */
    async removeAccount(accountId) {
        try {
            const { accounts } = await this.getAccounts();
            const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
            
            if (filteredAccounts.length === accounts.length) {
                return { success: false, error: '账号不存在' };
            }
            
            await this.saveAccounts(filteredAccounts);
            
            // 同时删除该账号的文章记录
            await this.removeAccountArticles(accountId);
            
            console.log(`✅ 删除监控账号: ${accountId}`);
            return { success: true };
            
        } catch (error) {
            console.error('❌ 删除监控账号失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 更新账号最后检查时间
     */
    async updateAccountLastChecked(accountId, articles = []) {
        try {
            const { accounts } = await this.getAccounts();
            const account = accounts.find(acc => acc.id === accountId);
            
            if (!account) {
                return { success: false, error: '账号不存在' };
            }
            
            account.lastChecked = new Date().toISOString();
            account.lastArticleCount = articles.length;
            account.newArticleCount = articles.filter(art => art.isNew).length;
            
            await this.saveAccounts(accounts);
            return { success: true };
            
        } catch (error) {
            console.error('❌ 更新账号检查时间失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 保存文章列表
     */
    async saveArticles(allArticles) {
        try {
            if (this.isRedisAvailable) {
                await this.redis.set('monitor:articles', JSON.stringify(allArticles));
            } else {
                this.memoryStorage.articles = allArticles;
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ 保存文章失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取所有文章
     */
    async getArticles() {
        try {
            let articles = [];
            
            if (this.isRedisAvailable) {
                const data = await this.redis.get('monitor:articles');
                articles = data ? JSON.parse(data) : [];
            } else {
                articles = this.memoryStorage.articles;
            }
            
            return { success: true, articles };
        } catch (error) {
            console.error('❌ 获取文章失败:', error);
            return { success: true, articles: [] };
        }
    }

    /**
     * 保存账号的文章
     */
    async saveAccountArticles(accountId, articles) {
        try {
            const { articles: allArticles } = await this.getArticles();
            
            // 移除该账号的旧文章
            const filteredArticles = allArticles.filter(art => art.accountId !== accountId);
            
            // 添加新文章
            const newArticles = articles.map(article => ({
                ...article,
                id: this.generateId(),
                accountId: accountId,
                savedAt: new Date().toISOString(),
                isRead: false
            }));
            
            const updatedArticles = [...filteredArticles, ...newArticles];
            await this.saveArticles(updatedArticles);
            
            console.log(`✅ 保存 ${newArticles.length} 篇文章，账号ID: ${accountId}`);
            return { success: true, count: newArticles.length };
            
        } catch (error) {
            console.error('❌ 保存账号文章失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取账号的文章
     */
    async getAccountArticles(accountId, limit = 20) {
        try {
            const { articles } = await this.getArticles();
            const accountArticles = articles
                .filter(art => art.accountId === accountId)
                .sort((a, b) => new Date(b.publishTime || b.savedAt) - new Date(a.publishTime || a.savedAt))
                .slice(0, limit);
                
            return { success: true, articles: accountArticles };
        } catch (error) {
            console.error('❌ 获取账号文章失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 删除账号的所有文章
     */
    async removeAccountArticles(accountId) {
        try {
            const { articles } = await this.getArticles();
            const filteredArticles = articles.filter(art => art.accountId !== accountId);
            await this.saveArticles(filteredArticles);
            return { success: true };
        } catch (error) {
            console.error('❌ 删除账号文章失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 标记文章为已读
     */
    async markArticleAsRead(articleId) {
        try {
            const { articles } = await this.getArticles();
            const article = articles.find(art => art.id === articleId);
            
            if (article) {
                article.isRead = true;
                article.readAt = new Date().toISOString();
                await this.saveArticles(articles);
            }
            
            return { success: true };
        } catch (error) {
            console.error('❌ 标记文章已读失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取统计信息
     */
    async getStats() {
        try {
            const { accounts } = await this.getAccounts();
            const { articles } = await this.getArticles();
            
            const stats = {
                totalAccounts: accounts.length,
                activeAccounts: accounts.filter(acc => acc.status === 'active').length,
                totalArticles: articles.length,
                unreadArticles: articles.filter(art => !art.isRead).length,
                newArticles: articles.filter(art => art.isNew).length,
                todayArticles: articles.filter(art => {
                    const today = new Date().toISOString().split('T')[0];
                    const articleDate = (art.publishTime || art.savedAt).split('T')[0];
                    return articleDate === today;
                }).length
            };
            
            return { success: true, stats };
        } catch (error) {
            console.error('❌ 获取统计信息失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 清理过期文章（保留最近30天）
     */
    async cleanupOldArticles(days = 30) {
        try {
            const { articles } = await this.getArticles();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const validArticles = articles.filter(article => {
                const articleDate = new Date(article.publishTime || article.savedAt);
                return articleDate >= cutoffDate;
            });
            
            if (validArticles.length < articles.length) {
                await this.saveArticles(validArticles);
                const removed = articles.length - validArticles.length;
                console.log(`🧹 清理了 ${removed} 篇过期文章`);
            }
            
            return { success: true, cleaned: articles.length - validArticles.length };
        } catch (error) {
            console.error('❌ 清理过期文章失败:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = MonitorStorageService;