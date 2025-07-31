/**
 * 公众号监控前端脚本
 */

class WechatMonitor {
    constructor() {
        this.apiBase = '';
        this.accounts = [];
        this.articles = [];
        this.stats = {};
        this.currentTab = 'accounts';
        
        this.init();
    }

    async init() {
        console.log('🚀 初始化公众号监控系统');
        await this.loadStats();
        await this.loadAccounts();
        
        // 设置定时刷新统计
        setInterval(() => this.loadStats(), 30000);
    }

    // ==================== API 调用 ====================

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}/api/monitor${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API调用失败:', error);
            this.showNotification('网络请求失败: ' + error.message, 'error');
            throw error;
        }
    }

    // ==================== 数据加载 ====================

    async loadStats() {
        try {
            const result = await this.apiCall('/stats');
            if (result.success) {
                this.stats = result.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('加载统计失败:', error);
        }
    }

    async loadAccounts() {
        try {
            const result = await this.apiCall('/accounts');
            if (result.success) {
                this.accounts = result.accounts;
                this.renderAccounts();
            }
        } catch (error) {
            console.error('加载账号失败:', error);
            document.getElementById('accountsList').innerHTML = 
                '<div class="empty-state"><h3>加载失败</h3><p>请刷新页面重试</p></div>';
        }
    }

    async loadArticles() {
        try {
            const unreadOnly = document.getElementById('unreadOnlyFilter').checked;
            const result = await this.apiCall(`/articles?limit=50&unreadOnly=${unreadOnly}`);
            if (result.success) {
                this.articles = result.articles;
                this.renderArticles();
            }
        } catch (error) {
            console.error('加载文章失败:', error);
            document.getElementById('articlesList').innerHTML = 
                '<div class="empty-state"><h3>加载失败</h3><p>请刷新页面重试</p></div>';
        }
    }

    // ==================== 界面渲染 ====================

    updateStatsDisplay() {
        document.getElementById('totalAccounts').textContent = this.stats.totalAccounts || 0;
        document.getElementById('totalArticles').textContent = this.stats.totalArticles || 0;
        document.getElementById('unreadArticles').textContent = this.stats.unreadArticles || 0;
        document.getElementById('todayArticles').textContent = this.stats.todayArticles || 0;
    }

    renderAccounts() {
        const container = document.getElementById('accountsList');
        
        if (this.accounts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>还没有监控账号</h3>
                    <p>点击"添加监控"按钮开始监控公众号</p>
                </div>
            `;
            return;
        }

        const html = this.accounts.map(account => `
            <div class="account-card" onclick="toggleAccountArticles('${account.id}')">
                <div class="account-info">
                    <div class="account-name">${account.name}</div>
                    <div class="account-meta">
                        微信号: ${account.wechatId || '未知'} | 
                        最后检查: ${account.lastChecked ? this.formatTime(account.lastChecked) : '从未检查'}
                        ${account.newArticleCount ? `| <span class="new-badge">${account.newArticleCount}新</span>` : ''}
                    </div>
                </div>
                <div class="account-status">
                    <span class="status-badge ${account.status === 'active' ? 'status-active' : 'status-error'}">
                        ${account.status === 'active' ? '活跃' : '异常'}
                    </span>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); checkAccount('${account.id}')" style="margin-right: 10px;">
                        🔄 检查
                    </button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); removeAccount('${account.id}')">
                        🗑️ 删除
                    </button>
                </div>
            </div>
            <div id="articles-${account.id}" style="display: none; background: #f8f9fa; padding: 20px;">
                <div class="loading">加载文章中...</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderArticles() {
        const container = document.getElementById('articlesList');
        
        if (this.articles.length === 0) {
            const hasAccounts = this.accounts.length > 0;
            container.innerHTML = `
                <div class="empty-state">
                    <h3>暂无文章</h3>
                    <p>${hasAccounts ? '请点击"🔄 全部更新"获取最新文章' : '请先添加监控账号'}</p>
                    ${hasAccounts ? '<button class="btn btn-primary" onclick="checkAllAccounts()" style="margin-top: 15px;">🔄 立即获取文章</button>' : ''}
                </div>
            `;
            return;
        }

        const html = this.articles.map(article => `
            <div class="article-item">
                <div class="article-content">
                    <div class="article-title" onclick="openArticle('${article.link}')">${article.title}</div>
                    <div class="article-meta">
                        <span>📅 ${this.formatTime(article.publishTime || article.savedAt)}</span>
                        <span>📖 ${article.isRead ? '已读' : '未读'}</span>
                        ${article.isNew ? '<span class="new-badge">新</span>' : ''}
                    </div>
                </div>
                <div class="article-actions">
                    ${!article.isRead ? `<button class="btn btn-primary" onclick="markAsRead('${article.id}')">标记已读</button>` : ''}
                    <button class="btn btn-secondary" onclick="openArticle('${article.link}')">📖 阅读</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // ==================== 事件处理 ====================

    async searchAccounts() {
        const accountName = document.getElementById('searchAccountInput').value.trim();
        if (!accountName) {
            this.showNotification('请输入公众号名称', 'warning');
            return;
        }

        try {
            this.showNotification('搜索中...', 'info');
            const result = await this.apiCall('/search-accounts', {
                method: 'POST',
                body: JSON.stringify({ accountName })
            });

            if (result.success && result.accounts.length > 0) {
                this.renderSearchResults(result.accounts, result.message);
                this.showNotification(`找到 ${result.accounts.length} 个${result.message ? '智能建议' : '搜索结果'}`, 'success');
            } else if (result.suggestions && result.suggestions.length > 0) {
                this.renderSearchResults(result.suggestions, '搜索失败，以下是手动添加建议');
                this.showNotification('搜索失败，提供手动添加建议', 'warning');
            } else {
                this.showNotification(result.error || '没有找到相关账号', 'warning');
                document.getElementById('searchResults').innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #666;">
                        <p>${result.error || '没有找到相关账号'}</p>
                        <p>建议使用下方的"手动添加"功能</p>
                    </div>
                `;
                document.getElementById('searchResults').style.display = 'block';
            }
        } catch (error) {
            this.showNotification('搜索失败', 'error');
        }
    }

    renderSearchResults(accounts, message) {
        const container = document.getElementById('searchResults');
        
        let headerHtml = '';
        if (message) {
            headerHtml = `<div style="padding: 10px; background: #f0f8ff; border-bottom: 1px solid #ddd; font-weight: bold; color: #0066cc;">${message}</div>`;
        }
        
        const html = headerHtml + accounts.map(account => `
            <div class="search-result-item" onclick="addAccount('${JSON.stringify(account).replace(/'/g, '&apos;')}')">
                <div class="search-result-name">
                    ${account.name}
                    ${account.source && account.source.includes('suggestion') ? '<span style="color: #28a745; font-size: 0.8em; margin-left: 8px;">💡 智能建议</span>' : ''}
                </div>
                <div class="search-result-desc">
                    ${account.wechatId !== '未知' ? `微信号: ${account.wechatId} | ` : ''}${account.description || '暂无描述'}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        container.style.display = 'block';
    }

    async addAccount(accountDataStr) {
        try {
            const accountData = JSON.parse(accountDataStr.replace(/&apos;/g, "'"));
            
            const result = await this.apiCall('/accounts', {
                method: 'POST',
                body: JSON.stringify(accountData)
            });

            if (result.success) {
                this.showNotification('账号添加成功', 'success');
                this.closeAddAccountModal();
                await this.loadAccounts();
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('添加账号失败', 'error');
        }
    }

    async removeAccount(accountId) {
        if (!confirm('确定要删除这个监控账号吗？')) {
            return;
        }

        try {
            const result = await this.apiCall(`/accounts/${accountId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                this.showNotification('账号删除成功', 'success');
                await this.loadAccounts();
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('删除账号失败', 'error');
        }
    }

    async checkAccount(accountId) {
        try {
            this.showNotification('检查中...', 'info');
            const result = await this.apiCall(`/accounts/${accountId}/check`, {
                method: 'POST'
            });

            if (result.success) {
                this.showNotification(result.message, 'success');
                await this.loadAccounts();
                await this.loadStats();
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('检查失败', 'error');
        }
    }

    async checkAllAccounts() {
        try {
            this.showNotification('批量检查中，请稍候...', 'info');
            const result = await this.apiCall('/check-all', {
                method: 'POST'
            });

            if (result.success) {
                this.showNotification(result.message, 'success');
                await this.loadAccounts();
                await this.loadStats();
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('批量检查失败', 'error');
        }
    }


    async toggleAccountArticles(accountId) {
        const articlesDiv = document.getElementById(`articles-${accountId}`);
        
        if (articlesDiv.style.display === 'none') {
            articlesDiv.style.display = 'block';
            
            try {
                const result = await this.apiCall(`/accounts/${accountId}/articles?limit=10`);
                if (result.success) {
                    this.renderAccountArticles(accountId, result.articles);
                }
            } catch (error) {
                articlesDiv.innerHTML = '<div class="empty-state">加载文章失败</div>';
            }
        } else {
            articlesDiv.style.display = 'none';
        }
    }

    renderAccountArticles(accountId, articles) {
        const container = document.getElementById(`articles-${accountId}`);
        
        if (articles.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无文章</div>';
            return;
        }

        const html = articles.map(article => `
            <div class="article-item" style="margin-bottom: 10px; background: white; border-radius: 6px; padding: 15px;">
                <div class="article-content">
                    <div class="article-title" onclick="openArticle('${article.link}')">${article.title}</div>
                    <div class="article-meta">
                        <span>📅 ${this.formatTime(article.publishTime || article.savedAt)}</span>
                        ${article.isNew ? '<span class="new-badge">新</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async markAsRead(articleId) {
        try {
            const result = await this.apiCall(`/articles/${articleId}/read`, {
                method: 'POST'
            });

            if (result.success) {
                await this.loadArticles();
                await this.loadStats();
            }
        } catch (error) {
            this.showNotification('标记失败', 'error');
        }
    }

    // ==================== 工具函数 ====================

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    detectMonitorType(url) {
        if (!url) return 'search';
        
        if (url.includes('rsshub.app') || url.includes('rss') || url.includes('.xml')) {
            return 'rss';
        } else if (url.includes('mp.weixin.qq.com/profile')) {
            return 'wechat-profile';
        } else if (url.includes('api') || url.includes('feed')) {
            return 'api';
        } else {
            return 'custom';
        }
    }

    formatTime(timeStr) {
        if (!timeStr) return '未知';
        
        const date = new Date(timeStr);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    openArticle(url) {
        if (url) {
            window.open(url, '_blank');
        }
    }

    showNotification(message, type = 'info') {
        // 简单的通知实现
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                notification.style.background = '#28a745';
                break;
            case 'error':
                notification.style.background = '#dc3545';
                break;
            case 'warning':
                notification.style.background = '#ffc107';
                notification.style.color = '#333';
                break;
            default:
                notification.style.background = '#007bff';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ==================== 模态框控制 ====================

    showAddAccountModal() {
        document.getElementById('addAccountModal').style.display = 'block';
        document.getElementById('searchAccountInput').focus();
    }


    closeAddAccountModal() {
        document.getElementById('addAccountModal').style.display = 'none';
        document.getElementById('searchAccountInput').value = '';
        document.getElementById('manualAccountName').value = '';
        document.getElementById('manualAccountId').value = '';
        document.getElementById('manualAccountUrl').value = '';
        document.getElementById('manualAccountDesc').value = '';
        document.getElementById('searchResults').style.display = 'none';
    }

    async addManualAccount() {
        const name = document.getElementById('manualAccountName').value.trim();
        const wechatId = document.getElementById('manualAccountId').value.trim();
        const monitorUrl = document.getElementById('manualAccountUrl').value.trim();
        const description = document.getElementById('manualAccountDesc').value.trim();

        if (!name) {
            this.showNotification('请输入公众号名称', 'warning');
            return;
        }

        // 验证URL格式（如果提供了）
        if (monitorUrl && !this.isValidUrl(monitorUrl)) {
            this.showNotification('请输入有效的监控链接', 'warning');
            return;
        }

        try {
            const accountData = {
                name,
                wechatId: wechatId || '未知',
                description: description || '手动添加的监控账号',
                avatar: null,
                link: monitorUrl || `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(name)}`,
                source: 'manual',
                monitorType: this.detectMonitorType(monitorUrl)
            };

            const result = await this.apiCall('/accounts', {
                method: 'POST',
                body: JSON.stringify(accountData)
            });

            if (result.success) {
                this.showNotification('账号添加成功，正在获取文章...', 'success');
                this.closeAddAccountModal();
                await this.loadAccounts();
                
                // 自动触发一次检查获取文章
                try {
                    await this.checkAllAccounts();
                } catch (error) {
                    this.showNotification('获取文章失败，请手动点击检查', 'warning');
                }
            } else {
                this.showNotification(result.error, 'error');
            }
        } catch (error) {
            this.showNotification('添加账号失败', 'error');
        }
    }

    switchTab(tabName) {
        // 更新标签状态
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // 加载对应数据
        if (tabName === 'articles' && this.articles.length === 0) {
            this.loadArticles();
        }
    }
}

// ==================== 全局函数 ====================

let monitor;

function showAddAccountModal() {
    monitor.showAddAccountModal();
}

function closeAddAccountModal() {
    monitor.closeAddAccountModal();
}

function searchAccounts() {
    monitor.searchAccounts();
}

function addAccount(accountDataStr) {
    monitor.addAccount(accountDataStr);
}

function addManualAccount() {
    monitor.addManualAccount();
}

function removeAccount(accountId) {
    monitor.removeAccount(accountId);
}

function checkAccount(accountId) {
    monitor.checkAccount(accountId);
}

function checkAllAccounts() {
    monitor.checkAllAccounts();
}

function toggleAccountArticles(accountId) {
    monitor.toggleAccountArticles(accountId);
}

function markAsRead(articleId) {
    monitor.markAsRead(articleId);
}

function openArticle(url) {
    monitor.openArticle(url);
}

function switchTab(tabName) {
    monitor.switchTab(tabName);
}


// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    monitor = new WechatMonitor();
});

// 点击模态框外部关闭
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ESC键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});