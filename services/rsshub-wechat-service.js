/**
 * RSSHub WeChat 监控服务
 * 利用 RSSHub 的微信公众号监控能力
 */

const axios = require('axios');
const cheerio = require('cheerio');

class RSSHubWeChatService {
    constructor(rsshubBaseUrl = process.env.RSSHUB_BASE_URL || 'https://rsshub.app') {
        this.baseUrl = rsshubBaseUrl;
        this.timeout = 30000; // 30秒超时
    }

    /**
     * 检查 RSSHub 服务是否可用
     */
    async checkService() {
        try {
            const response = await axios.get(`${this.baseUrl}/`, { timeout: this.timeout });
            return response.status === 200;
        } catch (error) {
            console.warn('RSSHub 服务检查失败:', error.message);
            return false;
        }
    }

    /**
     * 通过搜狗搜索监控微信公众号 - 最可靠的方法
     * @param {string} wechatId - 微信公众号ID
     * @param {number} limit - 获取文章数量限制
     */
    async getArticlesBySogou(wechatId, limit = 10) {
        try {
            console.log(`📡 通过搜狗搜索获取微信公众号文章: ${wechatId}`);
            
            const url = `${this.baseUrl}/wechat/sogou/${encodeURIComponent(wechatId)}`;
            const response = await axios.get(url, { 
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const articles = this.parseRSSFeed(response.data);
            
            console.log(`✅ 成功获取 ${articles.length} 篇文章 (限制: ${limit})`);
            return articles.slice(0, limit);
            
        } catch (error) {
            console.error(`❌ 搜狗搜索获取失败:`, error.message);
            throw new Error(`搜狗搜索获取失败: ${error.message}`);
        }
    }

    /**
     * 通过第三方服务监控微信公众号
     * @param {string} serviceType - 服务类型: 'freewechat', 'feeddd', 'wechat2rss'
     * @param {string} accountId - 账号ID
     * @param {number} limit - 获取文章数量限制
     */
    async getArticlesByThirdParty(serviceType, accountId, limit = 10) {
        const serviceMap = {
            'freewechat': 'freewechat/profile',
            'feeddd': 'wechat/feeddd',
            'wechat2rss': 'wechat/wechat2rss'
        };

        const servicePath = serviceMap[serviceType];
        if (!servicePath) {
            throw new Error(`不支持的服务类型: ${serviceType}`);
        }

        try {
            console.log(`📡 通过 ${serviceType} 获取微信公众号文章: ${accountId}`);
            
            const url = `${this.baseUrl}/${servicePath}/${encodeURIComponent(accountId)}`;
            const response = await axios.get(url, { 
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const articles = this.parseRSSFeed(response.data);
            
            console.log(`✅ 通过 ${serviceType} 成功获取 ${articles.length} 篇文章`);
            return articles.slice(0, limit);
            
        } catch (error) {
            console.error(`❌ ${serviceType} 获取失败:`, error.message);
            throw new Error(`${serviceType} 获取失败: ${error.message}`);
        }
    }

    /**
     * 智能获取微信公众号文章 - 自动尝试多种方法
     * @param {string} accountIdentifier - 账号标识符 (ID或名称)
     * @param {number} limit - 获取文章数量限制
     */
    async getArticlesSmart(accountIdentifier, limit = 10) {
        const methods = [
            // 优先使用搜狗搜索 - 最可靠
            {
                name: '搜狗搜索',
                fn: () => this.getArticlesBySogou(accountIdentifier, limit)
            },
            // 备用第三方服务
            {
                name: 'FreeWeChat',
                fn: () => this.getArticlesByThirdParty('freewechat', accountIdentifier, limit)
            },
            {
                name: 'FeedDD',
                fn: () => this.getArticlesByThirdParty('feeddd', accountIdentifier, limit)
            },
            {
                name: 'Wechat2RSS',
                fn: () => this.getArticlesByThirdParty('wechat2rss', accountIdentifier, limit)
            }
        ];

        for (const method of methods) {
            try {
                console.log(`🔄 尝试方法: ${method.name}`);
                const articles = await method.fn();
                
                if (articles && articles.length > 0) {
                    console.log(`✅ ${method.name} 成功获取 ${articles.length} 篇文章`);
                    return articles;
                }
            } catch (error) {
                console.warn(`⚠️ ${method.name} 失败: ${error.message}`);
                continue;
            }
        }

        throw new Error(`所有方法都失败了，无法获取微信公众号文章: ${accountIdentifier}`);
    }

    /**
     * 解析 RSS Feed 数据
     * @param {string} rssData - RSS XML 数据
     */
    parseRSSFeed(rssData) {
        try {
            const $ = cheerio.load(rssData, { xmlMode: true });
            const articles = [];

            $('item').each((index, element) => {
                const $item = $(element);
                
                const article = {
                    title: $item.find('title').text().trim(),
                    link: $item.find('link').text().trim(),
                    description: $item.find('description').text().trim(),
                    author: $item.find('author').text().trim(),
                    pubDate: this.parseDate($item.find('pubDate').text().trim()),
                    guid: $item.find('guid').text().trim(),
                    content: $item.find('content\\:encoded, content').text().trim() || 
                            $item.find('description').text().trim()
                };

                // 清理和验证数据
                if (article.title && article.link) {
                    // 清理 HTML 标签用于摘要
                    article.summary = this.stripHtml(article.description).substring(0, 150);
                    if (article.summary.length === 150) {
                        article.summary += '...';
                    }

                    // 提取发布时间
                    if (article.pubDate) {
                        article.timestamp = new Date(article.pubDate).getTime();
                    }

                    articles.push(article);
                }
            });

            return articles;
        } catch (error) {
            console.error('RSS 解析失败:', error.message);
            return [];
        }
    }

    /**
     * 解析日期字符串
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            return null;
        }
    }

    /**
     * 移除 HTML 标签
     */
    stripHtml(html) {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * 获取可用的监控方法列表
     */
    getAvailableMethods() {
        return [
            {
                type: 'sogou',
                name: '搜狗搜索',
                description: '通过搜狗微信搜索获取公众号文章，最可靠的方法',
                reliability: 'high'
            },
            {
                type: 'freewechat',
                name: 'FreeWeChat',
                description: '通过 FreeWeChat 服务获取文章',
                reliability: 'medium'
            },
            {
                type: 'feeddd',
                name: 'FeedDD',
                description: '通过 FeedDD 服务获取文章',
                reliability: 'medium'
            },
            {
                type: 'wechat2rss',
                name: 'Wechat2RSS',
                description: '通过 Wechat2RSS 服务获取文章',
                reliability: 'medium'
            }
        ];
    }

    /**
     * 验证账号是否存在
     * @param {string} accountIdentifier - 账号标识符
     */
    async validateAccount(accountIdentifier) {
        try {
            const articles = await this.getArticlesBySogou(accountIdentifier, 1);
            return articles && articles.length > 0;
        } catch (error) {
            return false;
        }
    }
}

module.exports = RSSHubWeChatService;