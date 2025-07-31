/**
 * WeRSS微信公众号RSS服务接口
 * 连接到we-mp-rss项目的API
 */

const axios = require('axios');

class WeRSSService {
    constructor(baseUrl = process.env.WERSS_SERVICE_URL || 'http://localhost:8001') {
        this.baseUrl = baseUrl;
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    /**
     * 检查WeRSS服务是否可用
     */
    async checkService() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000
            });
            return { success: true, status: response.status };
        } catch (error) {
            console.error('WeRSS服务不可用:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取所有RSS订阅列表
     */
    async getSubscriptions() {
        try {
            console.log('📡 获取WeRSS订阅列表');
            
            const response = await axios.get(`${this.baseUrl}/api/subscriptions`, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 10000
            });
            
            return {
                success: true,
                subscriptions: response.data || []
            };
        } catch (error) {
            console.error('❌ 获取订阅列表失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 添加新的公众号订阅
     */
    async addSubscription(accountName, accountUrl = null) {
        try {
            console.log(`➕ 添加WeRSS订阅: ${accountName}`);
            
            const payload = {
                name: accountName,
                url: accountUrl,
                type: 'wechat'
            };
            
            const response = await axios.post(`${this.baseUrl}/api/subscriptions`, payload, {
                headers: { 
                    'User-Agent': this.userAgent,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            
            return {
                success: true,
                subscription: response.data
            };
        } catch (error) {
            console.error('❌ 添加订阅失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 删除订阅
     */
    async removeSubscription(subscriptionId) {
        try {
            console.log(`🗑️ 删除WeRSS订阅: ${subscriptionId}`);
            
            await axios.delete(`${this.baseUrl}/api/subscriptions/${subscriptionId}`, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 10000
            });
            
            return { success: true };
        } catch (error) {
            console.error('❌ 删除订阅失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取指定订阅的最新文章
     */
    async getSubscriptionArticles(subscriptionId, limit = 10) {
        try {
            console.log(`📰 获取WeRSS文章: ${subscriptionId}`);
            
            const response = await axios.get(`${this.baseUrl}/api/subscriptions/${subscriptionId}/articles`, {
                params: { limit },
                headers: { 'User-Agent': this.userAgent },
                timeout: 15000
            });
            
            const articles = (response.data || []).map(article => ({
                title: article.title,
                link: article.link || article.url,
                summary: article.description || article.summary || '',
                publishTime: article.pubDate || article.published_at,
                author: article.author || subscriptionId,
                isNew: this.isRecentArticle(article.pubDate || article.published_at),
                source: 'werss'
            }));
            
            return { success: true, articles };
        } catch (error) {
            console.error('❌ 获取文章失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取所有订阅的最新文章
     */
    async getAllArticles(limit = 50) {
        try {
            console.log('📰 获取所有WeRSS文章');
            
            const response = await axios.get(`${this.baseUrl}/api/articles`, {
                params: { limit },
                headers: { 'User-Agent': this.userAgent },
                timeout: 15000
            });
            
            const articles = (response.data || []).map(article => ({
                title: article.title,
                link: article.link || article.url,
                summary: article.description || article.summary || '',
                publishTime: article.pubDate || article.published_at,
                author: article.author || article.feed_title,
                isNew: this.isRecentArticle(article.pubDate || article.published_at),
                source: 'werss'
            }));
            
            return { success: true, articles };
        } catch (error) {
            console.error('❌ 获取全部文章失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 手动刷新指定订阅
     */
    async refreshSubscription(subscriptionId) {
        try {
            console.log(`🔄 手动刷新WeRSS订阅: ${subscriptionId}`);
            
            const response = await axios.post(`${this.baseUrl}/api/subscriptions/${subscriptionId}/refresh`, {}, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 30000
            });
            
            return {
                success: true,
                message: response.data?.message || '刷新成功'
            };
        } catch (error) {
            console.error('❌ 刷新订阅失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取RSS订阅地址
     */
    getRSSUrl(subscriptionId) {
        return `${this.baseUrl}/rss/${subscriptionId}`;
    }

    /**
     * 判断是否为最近文章
     */
    isRecentArticle(publishTime) {
        if (!publishTime) return false;
        
        try {
            const articleDate = new Date(publishTime);
            const now = new Date();
            const diffDays = (now - articleDate) / (1000 * 60 * 60 * 24);
            
            return diffDays <= 3; // 3天内的文章算新文章
        } catch (error) {
            return false;
        }
    }

    /**
     * 测试连接并返回服务信息
     */
    async getServiceInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/info`, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 10000
            });
            
            return {
                success: true,
                info: response.data
            };
        } catch (error) {
            // 如果没有info接口，尝试获取订阅列表作为连接测试
            const testResult = await this.getSubscriptions();
            return {
                success: testResult.success,
                info: {
                    service: 'WeRSS',
                    status: testResult.success ? 'connected' : 'disconnected',
                    error: testResult.error
                }
            };
        }
    }
}

module.exports = WeRSSService;