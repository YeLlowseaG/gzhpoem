/**
 * 微信公众号监控服务 - 基于 RSSHub
 * 统一的微信公众号文章监控接口
 */

const RSSHubWeChatService = require('./rsshub-wechat-service');

class WeChatMonitorService {
    constructor() {
        this.rsshubService = new RSSHubWeChatService();
        this.monitoredAccounts = new Map(); // 缓存监控的账号信息
    }

    /**
     * 检查服务是否可用
     */
    async isServiceAvailable() {
        return await this.rsshubService.checkService();
    }

    /**
     * 添加监控账号
     * @param {Object} accountInfo - 账号信息
     * @param {string} accountInfo.id - 账号ID
     * @param {string} accountInfo.name - 账号名称
     * @param {string} accountInfo.identifier - 账号标识符 (用于搜索)
     * @param {string} accountInfo.method - 监控方法 ('auto', 'sogou', 'freewechat', 'feeddd', 'wechat2rss')
     */
    async addMonitorAccount(accountInfo) {
        console.log(`📝 添加监控账号: ${accountInfo.name} (${accountInfo.identifier})`);
        
        // 验证账号是否存在
        try {
            const isValid = await this.rsshubService.validateAccount(accountInfo.identifier);
            if (!isValid) {
                throw new Error(`无法找到微信公众号: ${accountInfo.identifier}`);
            }
        } catch (error) {
            console.warn(`⚠️ 账号验证失败: ${error.message}`);
            // 允许添加，但标记为未验证
            accountInfo.verified = false;
        }

        accountInfo.verified = accountInfo.verified !== false;
        accountInfo.addedAt = new Date().toISOString();
        accountInfo.method = accountInfo.method || 'auto';
        
        this.monitoredAccounts.set(accountInfo.id, accountInfo);
        
        console.log(`✅ 成功添加监控账号: ${accountInfo.name}`);
        return accountInfo;
    }

    /**
     * 移除监控账号
     * @param {string} accountId - 账号ID
     */
    removeMonitorAccount(accountId) {
        const account = this.monitoredAccounts.get(accountId);
        if (account) {
            this.monitoredAccounts.delete(accountId);
            console.log(`🗑️ 移除监控账号: ${account.name}`);
            return true;
        }
        return false;
    }

    /**
     * 获取监控账号列表
     */
    getMonitoredAccounts() {
        return Array.from(this.monitoredAccounts.values());
    }

    /**
     * 获取指定账号的最新文章
     * @param {string} accountId - 账号ID
     * @param {number} limit - 获取文章数量限制
     */
    async getAccountArticles(accountId, limit = 10) {
        const account = this.monitoredAccounts.get(accountId);
        if (!account) {
            throw new Error(`未找到监控账号: ${accountId}`);
        }

        console.log(`📖 获取账号文章: ${account.name} (${account.identifier})`);

        try {
            let articles;
            
            switch (account.method) {
                case 'sogou':
                    articles = await this.rsshubService.getArticlesBySogou(account.identifier, limit);
                    break;
                case 'freewechat':
                    articles = await this.rsshubService.getArticlesByThirdParty('freewechat', account.identifier, limit);
                    break;
                case 'feeddd':
                    articles = await this.rsshubService.getArticlesByThirdParty('feeddd', account.identifier, limit);
                    break;
                case 'wechat2rss':
                    articles = await this.rsshubService.getArticlesByThirdParty('wechat2rss', account.identifier, limit);
                    break;
                case 'auto':
                default:
                    articles = await this.rsshubService.getArticlesSmart(account.identifier, limit);
                    break;
            }

            // 为文章添加账号信息
            articles = articles.map(article => ({
                ...article,
                accountId: account.id,
                accountName: account.name,
                monitorMethod: account.method,
                fetchedAt: new Date().toISOString()
            }));

            console.log(`✅ 成功获取 ${articles.length} 篇文章`);
            return articles;
            
        } catch (error) {
            console.error(`❌ 获取文章失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 获取所有监控账号的最新文章
     * @param {number} limitPerAccount - 每个账号获取的文章数量限制
     */
    async getAllArticles(limitPerAccount = 5) {
        const allArticles = [];
        const accounts = this.getMonitoredAccounts();
        
        console.log(`📚 获取所有监控账号文章，共 ${accounts.length} 个账号`);

        for (const account of accounts) {
            try {
                const articles = await this.getAccountArticles(account.id, limitPerAccount);
                allArticles.push(...articles);
            } catch (error) {
                console.error(`❌ 获取账号 ${account.name} 文章失败: ${error.message}`);
                // 继续处理其他账号
            }
        }

        // 按发布时间排序
        allArticles.sort((a, b) => {
            const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
            const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
            return dateB - dateA; // 最新的在前
        });

        console.log(`✅ 总共获取 ${allArticles.length} 篇文章`);
        return allArticles;
    }

    /**
     * 搜索微信公众号
     * @param {string} query - 搜索关键词
     */
    async searchWeChatAccount(query) {
        console.log(`🔍 搜索微信公众号: ${query}`);
        
        // 尝试多种方法搜索
        const searchMethods = [
            {
                name: '搜狗搜索',
                fn: () => this.rsshubService.getArticlesBySogou(query, 3)
            },
            {
                name: '智能搜索',
                fn: () => this.rsshubService.getArticlesSmart(query, 3)
            }
        ];

        for (const method of searchMethods) {
            try {
                console.log(`🔄 尝试方法: ${method.name}`);
                const articles = await method.fn();
                
                if (articles && articles.length > 0) {
                    // 从文章中提取账号信息
                    const accountInfo = {
                        identifier: query,
                        name: articles[0].author || query,
                        latestArticle: articles[0].title,
                        articleCount: articles.length,
                        verified: true,
                        searchMethod: method.name
                    };
                    
                    console.log(`✅ 通过${method.name}找到公众号: ${accountInfo.name}`);
                    return accountInfo;
                }
            } catch (error) {
                console.warn(`⚠️ ${method.name}搜索失败: ${error.message}`);
                continue;
            }
        }
        
        // 所有方法都失败，返回基本信息让用户尝试
        console.log(`⚠️ 未能验证公众号，但允许用户尝试添加: ${query}`);
        return {
            identifier: query,
            name: query,
            verified: false,
            searchMethod: '未验证'
        };
    }

    /**
     * 获取服务状态信息
     */
    async getServiceStatus() {
        const isAvailable = await this.isServiceAvailable();
        const monitoredCount = this.monitoredAccounts.size;
        const methods = this.rsshubService.getAvailableMethods();
        
        return {
            available: isAvailable,
            monitoredAccounts: monitoredCount,
            supportedMethods: methods,
            serviceUrl: this.rsshubService.baseUrl
        };
    }

    /**
     * 测试账号监控功能
     * @param {string} accountIdentifier - 账号标识符
     * @param {string} method - 监控方法
     */
    async testAccountMonitoring(accountIdentifier, method = 'auto') {
        console.log(`🧪 测试账号监控: ${accountIdentifier} (方法: ${method})`);
        
        try {
            let articles;
            
            switch (method) {
                case 'sogou':
                    articles = await this.rsshubService.getArticlesBySogou(accountIdentifier, 3);
                    break;
                case 'freewechat':
                    articles = await this.rsshubService.getArticlesByThirdParty('freewechat', accountIdentifier, 3);
                    break;
                case 'feeddd':
                    articles = await this.rsshubService.getArticlesByThirdParty('feeddd', accountIdentifier, 3);
                    break;
                case 'wechat2rss':
                    articles = await this.rsshubService.getArticlesByThirdParty('wechat2rss', accountIdentifier, 3);
                    break;
                case 'auto':
                default:
                    articles = await this.rsshubService.getArticlesSmart(accountIdentifier, 3);
                    break;
            }

            const result = {
                success: true,
                method: method,
                articlesFound: articles.length,
                latestArticle: articles[0] || null,
                testTime: new Date().toISOString()
            };
            
            console.log(`✅ 测试成功: 找到 ${articles.length} 篇文章`);
            return result;
            
        } catch (error) {
            const result = {
                success: false,
                method: method,
                error: error.message,
                testTime: new Date().toISOString()
            };
            
            console.log(`❌ 测试失败: ${error.message}`);
            return result;
        }
    }
}

module.exports = WeChatMonitorService;