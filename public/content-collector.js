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
        const accountId = document.getElementById('accountId').value.trim();
        const url = document.getElementById('accountUrl').value.trim();
        const platform = document.getElementById('accountPlatform').value.trim();

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
                body: JSON.stringify({ name, accountId, url, platform })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('账号添加成功！', 'success');
                document.getElementById('accountName').value = '';
                document.getElementById('accountId').value = '';
                document.getElementById('accountUrl').value = '';
                document.getElementById('accountPlatform').value = '';
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
                        ${account.platform ? `<span class="badge bg-primary mb-2">${account.platform}</span><br>` : ''}
                        ${account.accountId ? `<p class="card-text text-muted small mb-1">
                            <i class="bi bi-person-badge"></i> ID: ${account.accountId}
                        </p>` : ''}
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
        const inputText = document.getElementById('articleUrl').value.trim();
        const accountId = document.getElementById('selectAccount').value;

        if (!inputText) {
            this.showMessage('请输入文章链接或分享内容', 'warning');
            return;
        }

        // 智能提取URL
        let extractedUrl = this.extractUrlFromText(inputText);
        
        if (!extractedUrl) {
            this.showMessage('未找到有效的网址链接，请检查输入内容', 'warning');
            return;
        }

        console.log('提取到的URL:', extractedUrl);

        this.showLoading('正在提取文章内容...');

        try {
            const response = await fetch('/api/collected-articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: extractedUrl, accountId })
            });

            const data = await response.json();
            
            if (data.success) {
                // 清除所有之前的提示
                document.querySelectorAll('.alert').forEach(alert => alert.remove());
                
                this.showMessage(`✅ 文章收集成功！标题: ${data.data.title}`, 'success');
                this.showExtractPreview(data.data);
                document.getElementById('articleUrl').value = '';
                document.getElementById('selectAccount').value = '';
                await this.loadArticles();
                
                // 滚动到文章列表顶部
                document.getElementById('articlesList').scrollIntoView({ behavior: 'smooth' });
            } else {
                this.showMessage(`❌ 提取失败: ${data.error}`, 'danger');
            }
        } catch (error) {
            console.error('提取文章失败:', error);
            this.showMessage('提取失败，请稍后重试', 'danger');
        } finally {
            this.hideLoading();
        }
    }

    extractUrlFromText(text) {
        // 如果直接是URL，直接返回
        if (text.startsWith('http://') || text.startsWith('https://')) {
            return text.trim();
        }
        
        // 使用正则表达式提取URL
        const urlPatterns = [
            // 小红书链接格式
            /https:\/\/www\.xiaohongshu\.com\/[^\s]+/g,
            // 通用HTTPS链接
            /https:\/\/[^\s]+/g,
            // 通用HTTP链接
            /http:\/\/[^\s]+/g
        ];
        
        for (const pattern of urlPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                // 返回第一个匹配的URL
                return matches[0].trim();
            }
        }
        
        return null;
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
                        <div class="d-flex gap-2">
                            <a href="${article.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-box-arrow-up-right"></i> 原文
                            </a>
                            <button class="btn btn-sm btn-outline-success" onclick="collector.copyTitleAndContent('${article.id}')">
                                <i class="bi bi-clipboard"></i> 复制
                            </button>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="collector.showFullContent('${article.id}')">
                                        <i class="bi bi-eye"></i> 查看全文
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="collector.removeArticle('${article.id}')">
                                        <i class="bi bi-trash"></i> 删除
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <p class="text-muted small mb-2">${contentPreview}${contentPreview.length >= 150 ? '...' : ''}</p>
                    
                    <div class="d-flex justify-content-between align-items-center flex-wrap">
                        <div class="article-stats">
                            ${article.author ? `<span class="me-3"><i class="bi bi-person"></i> ${article.author}</span>` : ''}
                            ${article.publishTime ? `<span class="me-3"><i class="bi bi-calendar"></i> ${this.formatDate(article.publishTime)}</span>` : ''}
                            <span class="badge bg-secondary">${accountName}</span>
                        </div>
                        <div class="article-stats">
                            ${article.readCount ? `<span class="me-2"><i class="bi bi-eye"></i> ${article.readCount}</span>` : ''}
                            ${article.likeCount ? `<span class="me-2"><i class="bi bi-heart"></i> ${article.likeCount}</span>` : ''}
                            ${article.shareCount ? `<span class="me-2"><i class="bi bi-share"></i> ${article.shareCount}</span>` : ''}
                            ${article.commentCount ? `<span><i class="bi bi-chat"></i> ${article.commentCount}</span>` : ''}
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

    formatDate(dateString) {
        if (!dateString) return '未知';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (error) {
            return dateString;
        }
    }

    showFullContent(articleId) {
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
                        <strong>发布时间:</strong> ${this.formatDate(article.publishTime)}<br>
                        <strong>关联账号:</strong> ${accountName}<br>
                        <strong>收集时间:</strong> ${new Date(article.addedAt).toLocaleString()}
                        ${article.location ? `<br><strong>发布地:</strong> ${article.location}` : ''}
                    </div>
                    <div class="col-md-6">
                        ${article.readCount ? `<strong>阅读量:</strong> ${article.readCount}<br>` : ''}
                        ${article.likeCount ? `<strong>点赞数:</strong> ${article.likeCount}<br>` : ''}
                        ${article.collectedCount ? `<strong>收藏数:</strong> ${article.collectedCount}<br>` : ''}
                        ${article.shareCount ? `<strong>分享数:</strong> ${article.shareCount}<br>` : ''}
                        ${article.commentCount ? `<strong>评论数:</strong> ${article.commentCount}<br>` : ''}
                        ${article.tags && article.tags.length > 0 ? `<strong>标签:</strong> ${article.tags.join(', ')}<br>` : ''}
                    </div>
                </div>
            </div>
            <hr>
            <div class="article-content">
                <h4>文章全文:</h4>
                <div style="max-height: 600px; overflow-y: auto; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; background-color: #f8f9fa;">
                    ${article.content}
                </div>
                ${article.images && article.images.length > 0 ? `
                    <h4 class="mt-4">文章图片 (${article.images.length}张):</h4>
                    <div class="row">
                        ${article.images.map((img, index) => `
                            <div class="col-12 mb-4">
                                <div class="d-flex align-items-start gap-3">
                                    <div class="position-relative" style="min-width: 200px;">
                                        <img src="${img}" class="img-fluid rounded shadow-sm" 
                                             style="max-height: 150px; max-width: 200px; object-fit: cover; cursor: pointer;" 
                                             onclick="window.open('${img}', '_blank')" 
                                             onerror="this.style.display='none'"
                                             title="点击查看大图">
                                        <div class="position-absolute top-0 end-0 bg-dark text-white px-2 py-1 rounded-bottom-start" style="font-size: 0.75em;">
                                            ${index + 1}
                                        </div>
                                    </div>
                                    <div class="flex-grow-1">
                                        <p class="mb-2"><strong>图片 ${index + 1}</strong></p>
                                        <div>
                                            <a href="${img}" target="_blank" class="btn btn-sm btn-outline-primary">
                                                <i class="bi bi-link-45deg"></i> 打开图片链接
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${article.imageTexts && article.imageTexts.length > 0 ? `
                    <hr>
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4 class="mt-2 mb-0">📝 图片文字内容:</h4>
                        <button class="btn btn-success btn-sm" onclick="collector.copyAllOCRText('${article.id}')">
                            <i class="bi bi-clipboard"></i> 复制全部文字
                        </button>
                    </div>
                    <div class="image-texts-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px; padding: 15px; background-color: #f8f9fa;">
                        ${article.imageTexts.map(imageText => `
                            <div class="image-text-item mb-4">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <div>
                                        <span class="badge bg-primary me-2">图片 ${imageText.index}</span>
                                        ${imageText.confidence > 0 ? `<small class="text-success">识别成功</small>` : `<small class="text-danger">识别失败</small>`}
                                    </div>
                                    ${imageText.confidence > 0 ? `
                                        <button class="btn btn-outline-success btn-sm" onclick="collector.copyOCRTextByIndex('${article.id}', ${imageText.index})">
                                            <i class="bi bi-clipboard"></i> 复制
                                        </button>
                                    ` : ''}
                                </div>
                                <div class="image-text-content p-3 border rounded" style="background-color: white; white-space: pre-wrap;">
                                    ${imageText.text}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.articleModal.show();
    }

    async copyTitleAndContent(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article) {
            this.showMessage('文章不存在', 'danger');
            return;
        }

        try {
            // 清理HTML标签，获取纯文本内容
            const plainTextContent = this.stripHtml(article.content);
            
            // 组合标题和内容
            const textToCopy = `${article.title}\n\n${plainTextContent}`;
            
            // 使用现代浏览器的Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textToCopy);
                this.showMessage('标题和全文已复制到剪贴板！', 'success');
            } else {
                // 兼容旧浏览器的方法
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    this.showMessage('标题和全文已复制到剪贴板！', 'success');
                } catch (err) {
                    this.showMessage('复制失败，请手动复制', 'danger');
                }
                
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('复制失败:', error);
            this.showMessage('复制失败，请稍后重试', 'danger');
        }
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
                        ${article.location ? `<br><strong>发布地:</strong> ${article.location}` : ''}
                    </div>
                    <div class="col-md-6">
                        ${article.readCount ? `<strong>阅读量:</strong> ${article.readCount}<br>` : ''}
                        ${article.likeCount ? `<strong>点赞数:</strong> ${article.likeCount}<br>` : ''}
                        ${article.collectedCount ? `<strong>收藏数:</strong> ${article.collectedCount}<br>` : ''}
                        ${article.shareCount ? `<strong>分享数:</strong> ${article.shareCount}<br>` : ''}
                        ${article.commentCount ? `<strong>评论数:</strong> ${article.commentCount}<br>` : ''}
                        ${article.tags && article.tags.length > 0 ? `<strong>标签:</strong> ${article.tags.join(', ')}<br>` : ''}
                    </div>
                </div>
            </div>
            <hr>
            <div class="article-content" style="max-height: 400px; overflow-y: auto; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                ${article.content}
            </div>
            ${article.images && article.images.length > 0 ? `
                <hr>
                <h6>文章图片 (${article.images.length}张):</h6>
                <div class="row">
                    ${article.images.map((img, index) => `
                        <div class="col-12 mb-3">
                            <div class="d-flex align-items-start gap-3">
                                <div class="position-relative" style="min-width: 150px;">
                                    <img src="${img}" class="img-fluid rounded shadow-sm" 
                                         style="max-height: 120px; max-width: 150px; object-fit: cover; cursor: pointer;" 
                                         onclick="window.open('${img}', '_blank')" 
                                         onerror="this.style.display='none'"
                                         title="点击查看大图">
                                    <div class="position-absolute top-0 end-0 bg-dark text-white px-1" style="font-size: 0.7em; border-radius: 0 0 0 5px;">
                                        ${index + 1}
                                    </div>
                                </div>
                                <div class="flex-grow-1">
                                    <p class="mb-1"><strong>图片 ${index + 1}</strong></p>
                                    <div>
                                        <a href="${img}" target="_blank" class="btn btn-sm btn-outline-primary" style="font-size: 0.8em;">
                                            <i class="bi bi-link-45deg"></i> 打开链接
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${article.imageTexts && article.imageTexts.length > 0 ? `
                <hr>
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">📝 图片文字内容:</h6>
                    <button class="btn btn-success btn-sm" onclick="collector.copyAllOCRText('${article.id}')" style="font-size: 0.75em;">
                        <i class="bi bi-clipboard"></i> 复制全部
                    </button>
                </div>
                <div class="image-texts-container" style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 5px; padding: 10px; background-color: #f8f9fa;">
                    ${article.imageTexts.map(imageText => `
                        <div class="image-text-item mb-3">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <div>
                                    <span class="badge bg-primary me-2" style="font-size: 0.7em;">图片 ${imageText.index}</span>
                                    ${imageText.confidence > 0 ? `<small class="text-success" style="font-size: 0.7em;">识别成功</small>` : `<small class="text-danger" style="font-size: 0.7em;">识别失败</small>`}
                                </div>
                                ${imageText.confidence > 0 ? `
                                    <button class="btn btn-outline-success btn-sm" onclick="collector.copyOCRTextByIndex('${article.id}', ${imageText.index})" style="font-size: 0.7em; padding: 2px 6px;">
                                        <i class="bi bi-clipboard"></i>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="image-text-content p-2 border rounded" style="background-color: white; white-space: pre-wrap; font-size: 0.85em;">
                                ${imageText.text}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        this.articleModal.show();
    }

    // OCR文字复制功能
    async copyOCRTextByIndex(articleId, index) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article || !article.imageTexts) {
            this.showMessage('未找到OCR文字内容', 'warning');
            return;
        }

        const imageText = article.imageTexts.find(item => item.index === index);
        if (!imageText || imageText.confidence <= 0) {
            this.showMessage('该图片未识别到文字内容', 'warning');
            return;
        }

        await this.copyTextToClipboard(imageText.text, `图片${index}的文字已复制到剪贴板！`);
    }

    async copyAllOCRText(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article || !article.imageTexts || article.imageTexts.length === 0) {
            this.showMessage('未找到OCR文字内容', 'warning');
            return;
        }

        // 只复制识别成功的文字
        const successfulTexts = article.imageTexts
            .filter(item => item.confidence > 0)
            .map(item => `【图片${item.index}】\n${item.text}`)
            .join('\n\n');

        if (successfulTexts.length === 0) {
            this.showMessage('没有成功识别的文字内容', 'warning');
            return;
        }

        await this.copyTextToClipboard(successfulTexts, '所有OCR文字已复制到剪贴板！');
    }

    async copyTextToClipboard(text, successMessage) {
        try {
            // 使用现代浏览器的Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.showMessage(successMessage, 'success');
            } else {
                // 兼容旧浏览器的方法
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    this.showMessage(successMessage, 'success');
                } catch (err) {
                    this.showMessage('复制失败，请手动复制', 'danger');
                }
                
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('复制失败:', error);
            this.showMessage('复制失败，请稍后重试', 'danger');
        }
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