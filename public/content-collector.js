/**
 * 内容收集器前端脚本
 */

class ContentCollector {
    constructor() {
        this.loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
        this.articleModal = new bootstrap.Modal(document.getElementById('articleModal'));
        this.accounts = [];
        this.articles = [];
        this.init();
    }

    async init() {
        await this.loadAccounts();
        await this.loadArticles();
        this.bindEvents();
        this.updateAccountSelectors();
    }

    bindEvents() {
        // 添加账号
        document.getElementById('addAccountBtn').addEventListener('click', () => this.addAccount());
        document.getElementById('accountName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addAccount();
        });

        // 提取文章
        document.getElementById('extractBtn').addEventListener('click', () => this.extractArticle());
        document.getElementById('articleUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.extractArticle();
        });

        // 搜索和筛选
        document.getElementById('searchInput').addEventListener('input', () => this.filterArticles());
        document.getElementById('filterAccount').addEventListener('change', () => this.filterArticles());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadArticles());
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

    // 账号管理
    async addAccount() {
        const name = document.getElementById('accountName').value.trim();
        const url = document.getElementById('accountUrl').value.trim();

        if (!name) {
            this.showMessage('请输入账号名称', 'warning');
            return;
        }

        this.showLoading('添加账号中...');

        try {
            const response = await fetch('/api/monitor-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, url })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('账号添加成功！', 'success');
                document.getElementById('accountName').value = '';
                document.getElementById('accountUrl').value = '';
                await this.loadAccounts();
                this.updateAccountSelectors();
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
            const response = await fetch('/api/monitor-accounts');
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
                    <div class="text-center text-muted py-3">
                        <i class="bi bi-person-plus display-6"></i>
                        <p class="mt-2">暂无监控账号，请添加账号开始收集内容</p>
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
                            <button class="btn btn-sm btn-outline-danger" onclick="collector.removeAccount('${account.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        ${account.url ? `<p class="card-text text-muted small mb-2">
                            <a href="${account.url}" target="_blank" class="text-decoration-none">
                                <i class="bi bi-link-45deg"></i> 查看链接
                            </a>
                        </p>` : ''}
                        <small class="text-muted">
                            <i class="bi bi-calendar"></i> ${new Date(account.addedAt).toLocaleDateString()}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async removeAccount(accountId) {
        if (!confirm('确定要删除这个账号吗？')) {
            return;
        }

        this.showLoading('删除账号中...');

        try {
            const response = await fetch(`/api/monitor-accounts/${accountId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('账号删除成功', 'success');
                await this.loadAccounts();
                this.updateAccountSelectors();
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

    updateAccountSelectors() {
        const selectors = ['selectAccount', 'filterAccount'];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            const currentValue = selector.value;
            
            // 保留第一个选项，清空其他选项
            while (selector.children.length > 1) {
                selector.removeChild(selector.lastChild);
            }
            
            // 添加账号选项
            this.accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.name;
                selector.appendChild(option);
            });
            
            // 恢复之前的选择
            if (currentValue) {
                selector.value = currentValue;
            }
        });
    }

    // 文章收集
    async extractArticle() {
        const url = document.getElementById('articleUrl').value.trim();
        const accountId = document.getElementById('selectAccount').value;

        if (!url) {
            this.showMessage('请输入文章链接', 'warning');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            this.showMessage('请输入有效的网址（以http://或https://开头）', 'warning');
            return;
        }

        this.showLoading('正在提取文章内容...');

        try {
            const response = await fetch('/api/collected-articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url, accountId })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('文章收集成功！', 'success');
                this.showExtractPreview(data.data);
                document.getElementById('articleUrl').value = '';
                document.getElementById('selectAccount').value = '';
                await this.loadArticles();
            } else {
                this.showMessage(`提取失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('提取文章失败:', error);
            this.showMessage('提取失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    showExtractPreview(article) {
        const previewDiv = document.getElementById('extractPreview');
        const accountName = this.accounts.find(acc => acc.id === article.accountId)?.name || '未分类';
        
        previewDiv.innerHTML = `
            <div class="extract-preview">
                <h6><i class="bi bi-check-circle-fill text-success"></i> 提取成功</h6>
                <div class="row">
                    <div class="col-md-8">
                        <strong>标题:</strong> ${article.title}<br>
                        <strong>作者:</strong> ${article.author || '未知'}<br>
                        <strong>时间:</strong> ${article.publishTime || '未知'}<br>
                        <strong>关联账号:</strong> ${accountName}
                    </div>
                    <div class="col-md-4">
                        ${article.readCount ? `<small class="text-muted">阅读: ${article.readCount}</small><br>` : ''}
                        ${article.likeCount ? `<small class="text-muted">点赞: ${article.likeCount}</small><br>` : ''}
                        ${article.shareCount ? `<small class="text-muted">分享: ${article.shareCount}</small><br>` : ''}
                        ${article.commentCount ? `<small class="text-muted">评论: ${article.commentCount}</small>` : ''}
                    </div>
                </div>
                <div class="content-preview mt-2">
                    <strong>内容预览:</strong>
                    <div class="mt-1" style="max-height: 80px; overflow: hidden;">
                        ${article.content.substring(0, 200)}...
                    </div>
                </div>
            </div>
        `;
        
        previewDiv.style.display = 'block';
        
        // 3秒后自动隐藏预览
        setTimeout(() => {
            previewDiv.style.display = 'none';
        }, 5000);
    }

    // 文章管理
    async loadArticles() {
        try {
            const response = await fetch('/api/collected-articles');
            const data = await response.json();
            
            if (data.success) {
                this.articles = data.data;
                this.displayArticles();
                document.getElementById('articleCount').textContent = this.articles.length;
            } else {
                console.error('加载文章列表失败:', data.error);
            }
        } catch (error) {
            console.error('加载文章列表失败:', error);
        }
    }

    filterArticles() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const accountFilter = document.getElementById('filterAccount').value;
        
        let filteredArticles = this.articles;
        
        // 按账号筛选
        if (accountFilter) {
            filteredArticles = filteredArticles.filter(article => article.accountId === accountFilter);
        }
        
        // 搜索筛选
        if (search) {
            filteredArticles = filteredArticles.filter(article => 
                article.title.toLowerCase().includes(search) ||
                article.content.toLowerCase().includes(search) ||
                article.author.toLowerCase().includes(search)
            );
        }
        
        this.displayArticles(filteredArticles);
    }

    displayArticles(articles = this.articles) {
        const container = document.getElementById('articlesList');
        
        if (articles.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-journal-x display-4"></i>
                    <p class="mt-2">暂无文章，请添加文章链接开始收集</p>
                </div>
            `;
            return;
        }

        container.innerHTML = articles.map(article => {
            const accountName = this.accounts.find(acc => acc.id === article.accountId)?.name || '未分类';
            const contentPreview = this.stripHtml(article.content).substring(0, 150);
            
            return `
                <div class="article-item">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">
                            <a href="#" onclick="collector.showArticleDetail('${article.id}')" class="text-decoration-none">
                                ${article.title}
                            </a>
                        </h6>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="${article.url}" target="_blank">
                                    <i class="bi bi-box-arrow-up-right"></i> 打开原文
                                </a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="collector.removeArticle('${article.id}')">
                                    <i class="bi bi-trash"></i> 删除
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <p class="text-muted small mb-2">${contentPreview}${contentPreview.length >= 150 ? '...' : ''}</p>
                    
                    <div class="d-flex justify-content-between align-items-center flex-wrap">
                        <div class="article-stats">
                            ${article.author ? `<span class="me-3"><i class="bi bi-person"></i> ${article.author}</span>` : ''}
                            ${article.publishTime ? `<span class="me-3"><i class="bi bi-calendar"></i> ${new Date(article.publishTime).toLocaleDateString()}</span>` : ''}
                            <span class="badge bg-secondary">${accountName}</span>
                        </div>
                        <div class="article-stats">
                            ${article.readCount ? `<span class="me-2">阅读 ${article.readCount}</span>` : ''}
                            ${article.likeCount ? `<span class="me-2">点赞 ${article.likeCount}</span>` : ''}
                            ${article.shareCount ? `<span class="me-2">分享 ${article.shareCount}</span>` : ''}
                            ${article.commentCount ? `<span>评论 ${article.commentCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    showArticleDetail(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article) return;

        const accountName = this.accounts.find(acc => acc.id === article.accountId)?.name || '未分类';
        
        document.getElementById('articleModalTitle').textContent = article.title;
        document.getElementById('articleModalLink').href = article.url;
        
        document.getElementById('articleModalContent').innerHTML = `
            <div class="mb-3">
                <div class="row">
                    <div class="col-md-6">
                        <strong>作者:</strong> ${article.author || '未知'}<br>
                        <strong>发布时间:</strong> ${article.publishTime || '未知'}<br>
                        <strong>关联账号:</strong> ${accountName}<br>
                        <strong>收集时间:</strong> ${new Date(article.addedAt).toLocaleString()}
                    </div>
                    <div class="col-md-6">
                        ${article.readCount ? `<strong>阅读量:</strong> ${article.readCount}<br>` : ''}
                        ${article.likeCount ? `<strong>点赞数:</strong> ${article.likeCount}<br>` : ''}
                        ${article.shareCount ? `<strong>分享数:</strong> ${article.shareCount}<br>` : ''}
                        ${article.commentCount ? `<strong>评论数:</strong> ${article.commentCount}<br>` : ''}
                    </div>
                </div>
            </div>
            <hr>
            <div class="article-content" style="max-height: 400px; overflow-y: auto;">
                ${article.content}
            </div>
        `;
        
        this.articleModal.show();
    }

    async removeArticle(articleId) {
        if (!confirm('确定要删除这篇文章吗？')) {
            return;
        }

        this.showLoading('删除文章中...');

        try {
            const response = await fetch(`/api/collected-articles/${articleId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('文章删除成功', 'success');
                await this.loadArticles();
            } else {
                this.showMessage(`删除失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('删除文章失败:', error);
            this.showMessage('删除失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }
}

// 初始化
const collector = new ContentCollector();