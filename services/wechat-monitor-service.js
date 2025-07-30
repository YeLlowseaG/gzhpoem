/**
 * 微信公众号监控服务
 * 基于搜狗微信搜索实现公众号文章监控
 */

const axios = require('axios');
const cheerio = require('cheerio');

class WechatMonitorService {
    constructor() {
        this.baseUrl = 'https://weixin.sogou.com';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.retryDelay = 3000; // 请求间延迟
        this.maxRetries = 2; // 最大重试次数
    }

    /**
     * 搜索公众号基本信息
     */
    async searchAccount(accountName) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔍 搜索公众号: ${accountName} (尝试 ${attempt}/${this.maxRetries})`);
                
                const searchUrl = `${this.baseUrl}/weixin?type=1&query=${encodeURIComponent(accountName)}`;
                console.log(`🌐 请求URL: ${searchUrl}`);
                
                const response = await axios.get(searchUrl, {
                    headers: { 
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Cache-Control': 'max-age=0'
                    },
                    timeout: 15000,
                    validateStatus: function (status) {
                        return status < 500; // 接受400-499的状态码
                    }
                });

                console.log(`📡 响应状态: ${response.status}`);
                console.log(`📡 响应头:`, JSON.stringify(response.headers, null, 2));
                console.log(`📄 页面标题: ${cheerio.load(response.data)('title').text()}`);
                
                if (response.status === 403 || response.status === 429) {
                    console.log(`⚠️ 被限制访问 (${response.status})，等待后重试...`);
                    if (attempt < this.maxRetries) {
                        await this.delay(this.retryDelay * attempt);
                        continue;
                    }
                    return { 
                        success: false, 
                        error: `访问被限制 (${response.status})，请稍后再试` 
                    };
                }

                const $ = cheerio.load(response.data);
                const accounts = [];

                // 检查是否有验证码或其他阻断页面
                if ($('title').text().includes('验证') || $('body').text().includes('验证码')) {
                    console.log('⚠️ 遇到验证码页面');
                    return { 
                        success: false, 
                        error: '遇到验证码限制，请稍后再试' 
                    };
                }

                // 解析搜索结果 - 尝试多种选择器
                const resultSelectors = [
                    '.results .result',
                    '.result',
                    'li[id^="sogou_vr"]',
                    '.news-box'
                ];

                let foundResults = false;
                for (const selector of resultSelectors) {
                    $(selector).each((index, element) => {
                        const $el = $(element);
                        let name = $el.find('h3 a').text().trim() || $el.find('.tit a').text().trim();
                        let wechatId = $el.find('.info label').text().replace('微信号：', '').trim();
                        let description = $el.find('.info dd').text().trim() || $el.find('.txt-info').text().trim();
                        let avatar = $el.find('.img-box img').attr('src') || $el.find('img').attr('src');
                        let link = $el.find('h3 a').attr('href') || $el.find('.tit a').attr('href');

                        if (name && link) {
                            foundResults = true;
                            // 处理相对链接
                            if (link.startsWith('/')) {
                                link = this.baseUrl + link;
                            }
                            
                            accounts.push({
                                name,
                                wechatId,
                                description,
                                avatar,
                                link,
                                source: 'sogou'
                            });
                        }
                    });
                    
                    if (foundResults) break;
                }

                console.log(`✅ 找到 ${accounts.length} 个公众号`);
                
                if (accounts.length === 0) {
                    console.log(`📄 页面内容预览: ${$('body').text().substring(0, 500)}...`);
                    console.log(`🔍 尝试的选择器结果数量:`, resultSelectors.map(sel => `${sel}: ${$(sel).length}`));
                    
                    // 尝试其他可能的结构
                    console.log(`📊 页面统计:`);
                    console.log(`  - 所有链接: ${$('a').length}`);
                    console.log(`  - 所有图片: ${$('img').length}`);
                    console.log(`  - class包含result的元素: ${$('[class*="result"]').length}`);
                    console.log(`  - 包含"公众号"文字的元素: ${$(':contains("公众号")').length}`);
                    
                    return { 
                        success: false, 
                        error: `未找到"${accountName}"相关的公众号，请尝试其他关键词。可能原因：1) 搜狗反爬限制 2) 账号名称不准确 3) 账号未被搜狗收录` 
                    };
                }
                
                return { success: true, accounts };

            } catch (error) {
                console.error(`❌ 搜索公众号失败 (尝试 ${attempt}):`, error.message);
                
                if (attempt === this.maxRetries) {
                    return { 
                        success: false, 
                        error: `搜索失败: ${error.message}` 
                    };
                }
                
                // 等待后重试
                await this.delay(this.retryDelay * attempt);
            }
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