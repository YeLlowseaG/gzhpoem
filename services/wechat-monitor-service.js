/**
 * 微信公众号监控服务
 * 基于搜狗微信搜索实现公众号文章监控
 */

const axios = require('axios');
const cheerio = require('cheerio');

class WechatMonitorService {
    constructor() {
        this.baseUrl = 'https://weixin.sogou.com';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        this.retryDelay = 2000; // 请求间延迟
    }

    /**
     * 搜索公众号基本信息
     */
    async searchAccount(accountName) {
        try {
            console.log(`🔍 搜索公众号: ${accountName}`);
            
            const searchUrl = `${this.baseUrl}/weixin?type=1&query=${encodeURIComponent(accountName)}`;
            
            const response = await axios.get(searchUrl, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const accounts = [];

            // 解析搜索结果
            $('.results .result').each((index, element) => {
                const $el = $(element);
                const name = $el.find('h3 a').text().trim();
                const wechatId = $el.find('.info label').text().replace('微信号：', '').trim();
                const description = $el.find('.info dd').text().trim();
                const avatar = $el.find('.img-box img').attr('src');
                const link = $el.find('h3 a').attr('href');

                if (name && link) {
                    accounts.push({
                        name,
                        wechatId,
                        description,
                        avatar,
                        link: this.baseUrl + link,
                        source: 'sogou'
                    });
                }
            });

            console.log(`✅ 找到 ${accounts.length} 个公众号`);
            return { success: true, accounts };

        } catch (error) {
            console.error('❌ 搜索公众号失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取公众号最新文章列表
     */
    async getAccountArticles(accountLink, maxCount = 10) {
        try {
            console.log(`📰 获取公众号文章: ${accountLink}`);
            
            // 延迟请求，避免被封
            await this.delay(this.retryDelay);
            
            const response = await axios.get(accountLink, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const articles = [];

            // 解析文章列表
            $('.results .result').each((index, element) => {
                if (index >= maxCount) return false;

                const $el = $(element);
                const title = $el.find('h3 a').text().trim();
                const link = $el.find('h3 a').attr('href');
                const summary = $el.find('.txt-box p').text().trim();
                const publishTimeText = $el.find('.s-p').text().trim();
                const cover = $el.find('.img-box img').attr('src');

                if (title && link) {
                    // 解析发布时间
                    const publishTime = this.parsePublishTime(publishTimeText);
                    
                    articles.push({
                        title,
                        link,
                        summary,
                        publishTime,
                        cover,
                        isNew: this.isRecentArticle(publishTime)
                    });
                }
            });

            console.log(`✅ 获取到 ${articles.length} 篇文章`);
            return { success: true, articles };

        } catch (error) {
            console.error('❌ 获取文章失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 批量监控多个公众号
     */
    async monitorAccounts(accounts) {
        const results = [];
        
        for (const account of accounts) {
            try {
                console.log(`🔄 监控公众号: ${account.name}`);
                
                const articlesResult = await this.getAccountArticles(account.link, 5);
                
                results.push({
                    account,
                    articles: articlesResult.success ? articlesResult.articles : [],
                    success: articlesResult.success,
                    error: articlesResult.error,
                    checkedAt: new Date().toISOString()
                });

                // 延迟，避免请求过频
                await this.delay(this.retryDelay);

            } catch (error) {
                console.error(`❌ 监控 ${account.name} 失败:`, error.message);
                results.push({
                    account,
                    articles: [],
                    success: false,
                    error: error.message,
                    checkedAt: new Date().toISOString()
                });
            }
        }

        return results;
    }

    /**
     * 获取文章详细内容
     */
    async getArticleContent(articleUrl) {
        try {
            console.log(`📖 获取文章内容: ${articleUrl}`);
            
            const response = await axios.get(articleUrl, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            
            // 提取文章内容
            const title = $('#activity-name').text().trim() || $('.rich_media_title').text().trim();
            const author = $('.rich_media_meta_text').text().trim();
            const content = $('.rich_media_content').text().trim();
            const publishTime = $('.rich_media_meta_text').last().text().trim();

            return {
                success: true,
                data: {
                    title,
                    author,
                    content: content.substring(0, 2000) + (content.length > 2000 ? '...' : ''),
                    publishTime,
                    url: articleUrl
                }
            };

        } catch (error) {
            console.error('❌ 获取文章内容失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 解析发布时间
     */
    parsePublishTime(timeText) {
        if (!timeText) return null;

        const now = new Date();
        
        // 今天、昨天等相对时间
        if (timeText.includes('今天')) {
            return new Date().toISOString().split('T')[0];
        } else if (timeText.includes('昨天')) {
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return yesterday.toISOString().split('T')[0];
        } else if (timeText.includes('前天')) {
            const dayBeforeYesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            return dayBeforeYesterday.toISOString().split('T')[0];
        }

        // 尝试解析具体日期
        const dateMatch = timeText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (dateMatch) {
            return `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        }

        return timeText;
    }

    /**
     * 判断是否为最近文章
     */
    isRecentArticle(publishTime) {
        if (!publishTime) return false;
        
        const articleDate = new Date(publishTime);
        const now = new Date();
        const diffDays = (now - articleDate) / (1000 * 60 * 60 * 24);
        
        return diffDays <= 3; // 3天内的文章算新文章
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = WechatMonitorService;