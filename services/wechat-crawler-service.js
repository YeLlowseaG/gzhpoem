/**
 * 微信公众号爬虫服务
 * 基于 wechatDownload 项目的核心原理实现
 * 通过截取微信浏览器的认证密钥来获取文章
 */

const axios = require('axios');
const cheerio = require('cheerio');

class WechatCrawlerService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.37(0x18002529) NetType/WIFI Language/zh_CN';
        this.baseUrl = 'https://mp.weixin.qq.com';
        this.retryDelay = 2000;
    }

    /**
     * 从微信文章链接中提取公众号信息和密钥
     * @param {string} articleUrl - 微信文章链接
     */
    extractAccountInfo(articleUrl) {
        try {
            const url = new URL(articleUrl);
            const params = new URLSearchParams(url.search);
            
            const biz = params.get('__biz');
            const mid = params.get('mid');
            const idx = params.get('idx');
            const sn = params.get('sn');
            
            if (!biz) {
                throw new Error('无法从链接中提取公众号信息');
            }
            
            return {
                biz: biz,
                mid: mid,
                idx: idx,
                sn: sn,
                success: true
            };
        } catch (error) {
            console.error('提取公众号信息失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取公众号文章列表
     * @param {string} biz - 公众号唯一标识
     * @param {string} key - 认证密钥（需要从微信浏览器获取）
     */
    async getArticleList(biz, key, offset = 0, count = 10) {
        try {
            console.log(`🔍 获取公众号文章列表: ${biz}`);
            
            const apiUrl = `${this.baseUrl}/mp/profile_ext`;
            const params = {
                action: 'getmsg',
                __biz: biz,
                f: 'json',
                offset: offset,
                count: count,
                is_ok: 1,
                scene: 124,
                uin: 777,
                key: key,
                pass_ticket: '',
                wxtoken: '',
                appmsg_token: '',
                x5: 0
            };

            const response = await axios.get(apiUrl, {
                params: params,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    'Referer': `${this.baseUrl}/mp/profile_ext?action=home&__biz=${biz}&scene=124`,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 15000
            });

            if (response.data.base_resp && response.data.base_resp.ret === 0) {
                const articles = this.parseArticleList(response.data);
                console.log(`✅ 成功获取 ${articles.length} 篇文章`);
                return { success: true, articles, hasMore: response.data.can_msg_continue === 1 };
            } else {
                const errorMsg = response.data.base_resp?.err_msg || '获取文章列表失败';
                console.error('API返回错误:', errorMsg);
                return { success: false, error: errorMsg };
            }

        } catch (error) {
            console.error('获取文章列表失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 解析文章列表数据
     */
    parseArticleList(data) {
        const articles = [];
        
        if (!data.general_msg_list) {
            return articles;
        }

        try {
            const msgList = JSON.parse(data.general_msg_list);
            
            msgList.list.forEach(item => {
                if (item.app_msg_ext_info) {
                    // 主文章
                    const mainArticle = this.parseArticleInfo(item.app_msg_ext_info, item.comm_msg_info);
                    if (mainArticle) {
                        articles.push(mainArticle);
                    }
                    
                    // 多图文中的其他文章
                    if (item.app_msg_ext_info.multi_app_msg_item_list) {
                        item.app_msg_ext_info.multi_app_msg_item_list.forEach(subItem => {
                            const subArticle = this.parseArticleInfo(subItem, item.comm_msg_info);
                            if (subArticle) {
                                articles.push(subArticle);
                            }
                        });
                    }
                }
            });
        } catch (error) {
            console.error('解析文章列表失败:', error);
        }

        return articles;
    }

    /**
     * 解析单篇文章信息
     */
    parseArticleInfo(articleInfo, msgInfo) {
        try {
            return {
                title: articleInfo.title,
                author: articleInfo.author,
                link: articleInfo.content_url.replace(/\\\//g, '/'),
                cover: articleInfo.cover,
                digest: articleInfo.digest,
                publishTime: new Date(msgInfo.datetime * 1000).toISOString(),
                isOriginal: articleInfo.copyright_stat === 11,
                readCount: null, // 需要额外请求获取
                likeCount: null, // 需要额外请求获取
                source: 'wechat-crawler'
            };
        } catch (error) {
            console.error('解析文章信息失败:', error);
            return null;
        }
    }

    /**
     * 获取文章详细内容
     */
    async getArticleContent(articleUrl) {
        try {
            console.log(`📖 获取文章内容: ${articleUrl}`);
            
            const response = await axios.get(articleUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            
            // 提取文章内容
            const content = $('#js_content').html() || '';
            const title = $('#activity-name').text().trim() || $('.rich_media_title').text().trim();
            const author = $('.rich_media_meta_text').first().text().trim();
            const publishTime = $('.rich_media_meta_text').last().text().trim();
            
            return {
                success: true,
                data: {
                    title,
                    author,
                    content,
                    publishTime,
                    url: articleUrl
                }
            };

        } catch (error) {
            console.error('获取文章内容失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 生成获取密钥的指导信息
     */
    generateKeyInstructions(articleUrl) {
        const accountInfo = this.extractAccountInfo(articleUrl);
        if (!accountInfo.success) {
            return { success: false, error: accountInfo.error };
        }

        return {
            success: true,
            instructions: {
                step1: '复制这个链接到微信文件传输助手',
                step2: '在微信中点击链接打开文章',
                step3: '文章打开后，系统会自动捕获认证密钥',
                step4: '然后就可以批量获取该公众号的所有文章',
                articleUrl: articleUrl,
                biz: accountInfo.biz,
                note: '每个公众号的密钥有效期约为1-2小时'
            }
        };
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = WechatCrawlerService;