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
        // 先尝试桌面版搜索
        let result = await this.searchAccountDesktop(accountName);
        if (result.success && result.accounts.length > 0) {
            return result;
        }
        
        console.log('🔄 桌面版搜索失败，尝试移动版搜索...');
        
        // 尝试移动版搜索
        result = await this.searchAccountMobile(accountName);
        if (result.success && result.accounts.length > 0) {
            return result;
        }
        
        return result; // 返回最后一次尝试的结果
    }

    /**
     * 桌面版搜索
     */
    async searchAccountDesktop(accountName) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔍 桌面版搜索公众号: ${accountName} (尝试 ${attempt}/${this.maxRetries})`);
                
                const searchUrl = `${this.baseUrl}/weixin?type=1&query=${encodeURIComponent(accountName)}`;
                console.log(`🌐 请求URL: ${searchUrl}`);
                
                // 先访问首页获取Cookie
                console.log('🍪 预访问搜狗微信首页获取Cookie...');
                try {
                    await axios.get('https://weixin.sogou.com/', {
                        headers: { 'User-Agent': this.userAgent },
                        timeout: 10000
                    });
                } catch (e) {
                    console.log('⚠️ 预访问失败，继续搜索...');
                }

                const response = await axios.get(searchUrl, {
                    headers: { 
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'same-origin',
                        'Sec-Fetch-User': '?1',
                        'Cache-Control': 'max-age=0',
                        'Pragma': 'no-cache',
                        'Referer': 'https://weixin.sogou.com/'
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
                    '.news-box',
                    '.news-list2 li',
                    '.wx-rb',
                    'ul li',
                    '[id*="result"]'
                ];

                let foundResults = false;
                for (const selector of resultSelectors) {
                    console.log(`🔍 正在尝试选择器: ${selector}, 找到 ${$(selector).length} 个元素`);
                    
                    $(selector).each((index, element) => {
                        const $el = $(element);
                        
                        // 尝试多种方式提取信息
                        const nameSelectors = ['h3 a', '.tit a', 'a[target="_blank"]', 'dt a', '.wx-rb3 a'];
                        const linkSelectors = ['h3 a', '.tit a', 'a[target="_blank"]', 'dt a', '.wx-rb3 a'];
                        const descSelectors = ['.info dd', '.txt-info', '.s-p', 'dd', '.wx-rb4'];
                        const wechatIdSelectors = ['.info label', '.s-p'];
                        const avatarSelectors = ['.img-box img', 'img', '.wx-rb2 img'];
                        
                        let name = '', link = '', description = '', wechatId = '', avatar = '';
                        
                        // 提取标题和链接
                        for (const sel of nameSelectors) {
                            const element = $el.find(sel).first();
                            if (element.length) {
                                name = element.text().trim();
                                link = element.attr('href');
                                if (name && link) break;
                            }
                        }
                        
                        // 提取描述
                        for (const sel of descSelectors) {
                            const desc = $el.find(sel).text().trim();
                            if (desc && !desc.includes('微信号')) {
                                description = desc;
                                break;
                            }
                        }
                        
                        // 提取微信号
                        for (const sel of wechatIdSelectors) {
                            const id = $el.find(sel).text().replace(/微信号[：:]\s*/, '').trim();
                            if (id && id !== description) {
                                wechatId = id;
                                break;
                            }
                        }
                        
                        // 提取头像
                        for (const sel of avatarSelectors) {
                            const img = $el.find(sel).attr('src');
                            if (img) {
                                avatar = img;
                                break;
                            }
                        }
                        
                        console.log(`📄 元素 ${index}: name="${name}", link="${link}", desc="${description}"`);
                        
                        if (name && link && name.length > 1) {
                            foundResults = true;
                            // 处理相对链接
                            if (link.startsWith('/')) {
                                link = this.baseUrl + link;
                            }
                            
                            accounts.push({
                                name,
                                wechatId: wechatId || '未知',
                                description: description || '暂无描述',
                                avatar,
                                link,
                                source: 'sogou'
                            });
                        }
                    });
                    
                    if (foundResults) {
                        console.log(`✅ 选择器 ${selector} 找到了结果`);
                        break;
                    }
                }

                console.log(`✅ 找到 ${accounts.length} 个公众号`);
                
                if (accounts.length === 0) {
                    console.log(`📄 页面内容预览: ${$('body').text().substring(0, 500)}...`);
                    console.log(`🔍 尝试的选择器结果数量:`, resultSelectors.map(sel => `${sel}: ${$(sel).length}`));
                    
                    // 最后尝试：分析所有包含链接的元素
                    console.log(`🔧 最后尝试：分析所有可能的公众号链接...`);
                    $('a').each((index, element) => {
                        const $a = $(element);
                        const href = $a.attr('href');
                        const text = $a.text().trim();
                        
                        // 如果链接指向公众号详情页或文章页
                        if (href && (href.includes('mp.weixin.qq.com') || href.includes('profile'))) {
                            console.log(`🔗 找到可能的公众号链接: "${text}" -> ${href}`);
                            
                            if (text && text.length > 1 && text.length < 50) {
                                accounts.push({
                                    name: text,
                                    wechatId: '未知',
                                    description: '通过链接分析获得',
                                    avatar: null,
                                    link: href.startsWith('http') ? href : this.baseUrl + href,
                                    source: 'sogou-fallback'
                                });
                            }
                        }
                    });
                    
                    if (accounts.length > 0) {
                        console.log(`🎉 通过备用方法找到 ${accounts.length} 个公众号`);
                        return { success: true, accounts };
                    }
                    
                    // 尝试其他可能的结构
                    console.log(`📊 页面统计:`);
                    console.log(`  - 所有链接: ${$('a').length}`);
                    console.log(`  - 所有图片: ${$('img').length}`);
                    console.log(`  - class包含result的元素: ${$('[class*="result"]').length}`);
                    console.log(`  - 包含"公众号"文字的元素: ${$(':contains("公众号")').length}`);
                    
                    // 保存页面内容用于分析
                    console.log(`🔍 完整页面HTML长度: ${response.data.length} 字符`);
                    
                    // 检查是否是搜索结果页面
                    const bodyText = $('body').text();
                    if (bodyText.includes('抱歉，没有找到') || bodyText.includes('找不到相关结果')) {
                        return { 
                            success: false, 
                            error: `搜狗微信中确实没有找到"${accountName}"相关的公众号` 
                        };
                    }
                    
                    // 检查是否需要验证
                    if (bodyText.includes('验证码') || bodyText.includes('请输入验证码')) {
                        return { 
                            success: false, 
                            error: '搜狗微信要求验证码验证，请稍后重试或使用手动添加功能' 
                        };
                    }
                    
                    // 输出关键页面片段用于调试
                    console.log(`🔍 页面关键内容:`);
                    console.log(`  标题: ${$('title').text()}`);
                    console.log(`  H1标签: ${$('h1').text()}`);
                    console.log(`  主要内容区域: ${$('#main, .main, .content, .wrapper').length > 0 ? '找到' : '未找到'}`);
                    
                    // 分析所有可能包含公众号信息的元素
                    console.log(`🔍 深度分析页面结构:`);
                    const possibleContainers = ['div', 'li', 'article', 'section'].map(tag => 
                        `${tag}包含链接的: ${$(tag).filter((i, el) => $(el).find('a').length > 0).length}`
                    );
                    console.log(possibleContainers.join(', '));
                    
                    // 输出页面的HTML结构用于调试
                    console.log(`🔍 页面主要结构:`);
                    $('body').children().each((i, el) => {
                        const tagName = $(el).prop('tagName');
                        const className = $(el).attr('class') || '';
                        const id = $(el).attr('id') || '';
                        console.log(`  ${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ').join('.') : ''}`);
                    });
                    
                    // 如果确实是搜索页面但没有结果，尝试输出更多信息
                    if (bodyText.includes('搜索') || bodyText.includes('微信公众号')) {
                        console.log(`📝 页面可能是搜索页面，但解析失败。页面摘要:`);
                        console.log(`  ${bodyText.substring(0, 800)}...`);
                    }
                    
                    return { 
                        success: false, 
                        error: `未找到"${accountName}"相关的公众号。建议：1) 使用手动添加功能 2) 尝试其他关键词 3) 该账号可能未被搜狗收录` 
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
     * 移动版搜索
     */
    async searchAccountMobile(accountName) {
        try {
            console.log(`📱 移动版搜索公众号: ${accountName}`);
            
            const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
            const searchUrl = `${this.baseUrl}/weixin?type=1&query=${encodeURIComponent(accountName)}`;
            
            const response = await axios.get(searchUrl, {
                headers: { 
                    'User-Agent': mobileUA,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': 'https://weixin.sogou.com/'
                },
                timeout: 15000
            });

            console.log(`📱 移动版响应状态: ${response.status}`);
            
            const $ = cheerio.load(response.data);
            const accounts = [];

            // 移动版可能有不同的选择器
            const mobileSelectors = [
                '.results li',
                '.wx-rb',
                '.m-result',
                'li[class*="result"]',
                'div[class*="result"]'
            ];

            for (const selector of mobileSelectors) {
                console.log(`📱 移动版尝试选择器: ${selector}, 找到 ${$(selector).length} 个元素`);
                
                $(selector).each((index, element) => {
                    const $el = $(element);
                    const name = $el.find('a').first().text().trim();
                    const link = $el.find('a').first().attr('href');
                    const desc = $el.text().replace(name, '').trim();
                    
                    console.log(`📱 移动版元素 ${index}: name="${name}", link="${link}"`);
                    
                    if (name && link && name.length > 1 && name.length < 50) {
                        accounts.push({
                            name,
                            wechatId: '未知',
                            description: desc || '移动版搜索结果',
                            avatar: null,
                            link: link.startsWith('http') ? link : this.baseUrl + link,
                            source: 'sogou-mobile'
                        });
                    }
                });
                
                if (accounts.length > 0) break;
            }

            console.log(`📱 移动版找到 ${accounts.length} 个公众号`);
            return { success: true, accounts };

        } catch (error) {
            console.error('❌ 移动版搜索失败:', error.message);
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