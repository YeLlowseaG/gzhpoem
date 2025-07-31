/**
 * 微信公众号监控前端脚本
 */

class WeChatMonitor {
    constructor() {
        this.loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
        this.accounts = [];
        this.init();
    }

    async init() {
        await this.checkServiceStatus();
        await this.loadAccounts();
        // 只有在有监控账号时才加载文章
        if (this.accounts && this.accounts.length > 0) {
            await this.loadArticles();
        }
        this.bindEvents();
    }

    bindEvents() {
        // 搜索公众号
        document.getElementById('searchBtn').addEventListener('click', () => this.searchAccount());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAccount();
        });

        // 测试监控
        document.getElementById('testBtn').addEventListener('click', () => this.testMonitoring());

        // 添加账号
        document.getElementById('addAccountBtn').addEventListener('click', () => this.addAccount());

        // 刷新文章
        document.getElementById('refreshArticlesBtn').addEventListener('click', () => this.loadArticles());

        // 自动填充搜索结果
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const value = e.target.value.trim();
            document.getElementById('accountIdentifier').value = value;
        });
    }

    showLoading(text = '处理中...') {
        document.getElementById('loadingText').textContent = text;
        this.loadingModal.show();
    }

    hideLoading() {
        this.loadingModal.hide();
    }

    showMessage(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    async checkServiceStatus() {
        try {
            const response = await fetch('/api/wechat-monitor/status');
            const data = await response.json();
            
            if (data.success) {
                const status = data.data;
                this.updateServiceStatus(status.available, 
                    `RSSHub ${status.available ? '在线' : '离线'} (监控 ${status.monitoredAccounts} 个账号)`);
            } else {
                this.updateServiceStatus(false, '服务检查失败');
            }
        } catch (error) {
            console.error('检查服务状态失败:', error);
            this.updateServiceStatus(false, '服务连接失败');
        }
    }

    updateServiceStatus(online, text) {
        const indicator = document.getElementById('serviceStatus');
        const statusText = document.getElementById('serviceStatusText');
        
        indicator.className = `status-indicator ${online ? 'status-online' : 'status-offline'}`;
        statusText.textContent = text;
    }

    async searchAccount() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            this.showMessage('请输入搜索关键词', 'warning');
            return;
        }

        this.showLoading('搜索公众号中...');
        
        try {
            const response = await fetch(`/api/wechat-monitor/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                this.displaySearchResult(data.data);
                // 自动填充表单
                document.getElementById('accountName').value = data.data.name;
                document.getElementById('accountIdentifier').value = data.data.identifier;
                
                // 根据验证状态显示不同消息
                if (data.data.verified) {
                    this.showMessage(`找到公众号: ${data.data.name}`, 'success');
                } else {
                    this.showMessage(`无法验证公众号，但您可以尝试添加: ${data.data.name}`, 'info');
                }
            } else {
                // 仍然自动填充，让用户可以尝试
                document.getElementById('accountName').value = query;
                document.getElementById('accountIdentifier').value = query;
                this.showMessage('无法验证该公众号，但您可以尝试直接添加', 'info');
                document.getElementById('searchResult').style.display = 'none';
            }
        } catch (error) {
            console.error('搜索失败:', error);
            this.showMessage('搜索失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    displaySearchResult(result) {
        const resultDiv = document.getElementById('searchResult');
        const contentDiv = document.getElementById('searchResultContent');
        
        contentDiv.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <strong>公众号名称:</strong> ${result.name}<br>
                    <strong>标识符:</strong> ${result.identifier}<br>
                    <strong>验证状态:</strong> 
                    <span class="badge bg-${result.verified ? 'success' : 'warning'}">
                        ${result.verified ? '已验证' : '未验证'}
                    </span>
                </div>
                <div class="col-md-6">
                    ${result.latestArticle ? `<strong>最新文章:</strong> ${result.latestArticle}<br>` : ''}
                    ${result.articleCount ? `<strong>找到文章:</strong> ${result.articleCount} 篇` : ''}
                </div>
            </div>
        `;
        
        resultDiv.style.display = 'block';
    }

    async testMonitoring() {
        const identifier = document.getElementById('accountIdentifier').value.trim();
        const method = document.getElementById('monitorMethod').value;

        if (!identifier) {
            this.showMessage('请输入公众号标识符', 'warning');
            return;
        }

        this.showLoading('测试监控功能...');

        try {
            const response = await fetch('/api/wechat-monitor/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accountIdentifier: identifier,
                    method: method
                })
            });

            const data = await response.json();
            
            if (data.success) {
                const result = data.data;
                if (result.success) {
                    this.showMessage(
                        `测试成功！使用 ${result.method} 方法找到 ${result.articlesFound} 篇文章`, 
                        'success'
                    );
                } else {
                    this.showMessage(`测试失败: ${result.error}`, 'warning');
                }
            } else {
                this.showMessage('测试请求失败', 'danger');
            }
        } catch (error) {
            console.error('测试失败:', error);
            this.showMessage('测试失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async addAccount() {
        const name = document.getElementById('accountName').value.trim();
        const identifier = document.getElementById('accountIdentifier').value.trim();
        const method = document.getElementById('monitorMethod').value;

        if (!name || !identifier) {
            this.showMessage('请填写公众号名称和标识符', 'warning');
            return;
        }

        this.showLoading('添加监控账号...');

        try {
            const response = await fetch('/api/wechat-monitor/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    identifier: identifier,
                    method: method
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('监控账号添加成功！', 'success');
                // 清空表单
                document.getElementById('accountName').value = '';
                document.getElementById('accountIdentifier').value = '';
                document.getElementById('searchInput').value = '';
                document.getElementById('searchResult').style.display = 'none';
                // 重新加载账号列表
                await this.loadAccounts();
                await this.checkServiceStatus();
                // 如果这是第一个账号，自动加载文章
                if (this.accounts.length === 1) {
                    await this.loadArticles();
                }
            } else {
                this.showMessage(`添加失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('添加账号失败:', error);
            this.showMessage('添加失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async loadAccounts() {
        try {
            const response = await fetch('/api/wechat-monitor/accounts');
            const data = await response.json();
            
            if (data.success) {
                this.accounts = data.data;
                this.displayAccounts();
                document.getElementById('accountCount').textContent = this.accounts.length;
            } else {
                console.error('加载账号列表失败:', data.error);
            }
        } catch (error) {
            console.error('加载账号列表失败:', error);
        }
    }

    displayAccounts() {
        const container = document.getElementById('accountsList');
        
        if (this.accounts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-inbox display-4"></i>
                        <p class="mt-2">暂无监控账号，请添加公众号开始监控</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.accounts.map(account => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card account-card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${account.name}</h6>
                            <button class="btn btn-sm btn-outline-danger" onclick="monitor.removeAccount('${account.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <p class="card-text text-muted small mb-2">${account.identifier}</p>
                        <div class="mb-2">
                            <span class="badge method-badge bg-${this.getMethodColor(account.method)}">
                                ${this.getMethodName(account.method)}
                            </span>
                            ${account.verified ? 
                                '<span class="badge bg-success ms-1">已验证</span>' : 
                                '<span class="badge bg-warning ms-1">未验证</span>'
                            }
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${new Date(account.addedAt).toLocaleDateString()}
                            </small>
                            <button class="btn btn-sm btn-primary" onclick="monitor.viewAccountArticles('${account.id}')">
                                <i class="bi bi-eye"></i> 查看文章
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getMethodName(method) {
        const names = {
            'auto': '自动',
            'sogou': '搜狗',
            'freewechat': 'FreeWeChat',
            'feeddd': 'FeedDD',
            'wechat2rss': 'Wechat2RSS'
        };
        return names[method] || method;
    }

    getMethodColor(method) {
        const colors = {
            'auto': 'primary',
            'sogou': 'success',
            'freewechat': 'info',
            'feeddd': 'warning',
            'wechat2rss': 'secondary'
        };
        return colors[method] || 'secondary';
    }

    async removeAccount(accountId) {
        if (!confirm('确定要删除这个监控账号吗？')) {
            return;
        }

        this.showLoading('删除账号中...');

        try {
            const response = await fetch(`/api/wechat-monitor/accounts/${accountId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('账号删除成功', 'success');
                await this.loadAccounts();
                await this.checkServiceStatus();
            } else {
                this.showMessage(`删除失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('删除账号失败:', error);
            this.showMessage('删除失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async viewAccountArticles(accountId) {
        this.showLoading('获取文章中...');
        
        try {
            const response = await fetch(`/api/wechat-monitor/accounts/${accountId}/articles?limit=10`);
            const data = await response.json();
            
            if (data.success) {
                this.displayArticles(data.data, true);
                this.showMessage(`成功获取 ${data.data.length} 篇文章`, 'success');
            } else {
                this.showMessage(`获取文章失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('获取文章失败:', error);
            this.showMessage('获取文章失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    async loadArticles() {
        this.showLoading('加载最新文章...');
        
        try {
            const response = await fetch('/api/wechat-monitor/articles?limitPerAccount=3');
            const data = await response.json();
            
            if (data.success) {
                this.displayArticles(data.data);
            } else {
                console.error('加载文章失败:', data.error);
            }
        } catch (error) {
            console.error('加载文章失败:', error);
        } finally {
            this.hideLoading();
        }
    }

    displayArticles(articles, scrollToArticles = false) {
        const container = document.getElementById('articlesList');
        
        if (articles.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-newspaper display-4"></i>
                    <p class="mt-2">暂无文章，请先添加监控账号</p>
                </div>
            `;
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="article-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-1">
                        <a href="${article.link}" target="_blank" class="text-decoration-none">
                            ${article.title}
                        </a>
                    </h6>
                    <small class="text-muted">
                        ${article.accountName}
                    </small>
                </div>
                <p class="text-muted small mb-2">
                    ${article.summary || article.description.substring(0, 100) + '...'}
                </p>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">
                            <i class="bi bi-person"></i> ${article.author || article.accountName}
                        </small>
                        ${article.pubDate ? `<small class="text-muted ms-3">
                            <i class="bi bi-calendar"></i> ${new Date(article.pubDate).toLocaleDateString()}
                        </small>` : ''}
                    </div>
                    <span class="badge method-badge bg-${this.getMethodColor(article.monitorMethod)}">
                        ${this.getMethodName(article.monitorMethod)}
                    </span>
                </div>
            </div>
        `).join('');

        if (scrollToArticles) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// 初始化
const monitor = new WeChatMonitor();