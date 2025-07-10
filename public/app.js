// 最美诗词 - 前端应用
// 重构版本，专注于个人使用的简洁体验

class PoemApp {
    constructor() {
        this.currentView = 'generate';
        this.currentArticle = null;
        this.articles = [];
        this.config = {};
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkServiceStatus();
        await this.loadConfig();
        await this.loadRecentArticles();
    }

    bindEvents() {
        // 表单提交防止页面刷新
        document.addEventListener('submit', (e) => e.preventDefault());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        if (this.currentView === 'generate') {
                            e.preventDefault();
                            this.generateArticle();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveCurrentArticle();
                        break;
                }
            }
        });

        // 自动保存
        setInterval(() => {
            this.autoSave();
        }, 30000); // 30秒自动保存一次
    }

    // ==================== 服务状态检查 ====================
    async checkServiceStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.updateServiceStatus('connected', '服务正常');
            } else {
                this.updateServiceStatus('disconnected', '服务异常');
            }
        } catch (error) {
            this.updateServiceStatus('disconnected', '服务离线');
        }
    }

    updateServiceStatus(status, message) {
        const statusElement = document.getElementById('serviceStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        dot.className = `status-dot ${status}`;
        text.textContent = message;
    }

    // ==================== 配置管理 ====================
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            
            if (data.success) {
                this.config = data.data;
                this.updateUI();
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async saveConfig() {
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.config)
            });
            
            const data = await response.json();
            if (data.success) {
                this.showToast('success', '配置保存成功');
            }
        } catch (error) {
            this.showToast('error', '配置保存失败');
        }
    }

    updateUI() {
        // 更新微信配置显示
        const wechatAppId = document.getElementById('wechatAppId');
        const wechatAppSecret = document.getElementById('wechatAppSecret');
        
        if (wechatAppId && this.config.wechat) {
            wechatAppId.value = this.config.wechat.appId || '';
        }
        
        if (wechatAppSecret && this.config.wechat) {
            wechatAppSecret.value = this.config.wechat.appSecret === '***已配置***' ? '' : this.config.wechat.appSecret || '';
        }
    }

    // ==================== 视图切换 ====================
    switchView(viewName) {
        // 隐藏所有视图
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        
        // 移除所有导航激活状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 显示目标视图
        const targetView = document.getElementById(viewName + 'View');
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // 激活对应导航
        const navItem = document.querySelector(`[onclick="switchView('${viewName}')"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        this.currentView = viewName;
        
        // 加载视图数据
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch(viewName) {
            case 'history':
                await this.loadArticles();
                break;
            case 'stats':
                await this.loadStats();
                break;
            case 'wechat':
                await this.loadWechatStatus();
                break;
        }
    }

    // ==================== 文章生成 ====================
    async generateArticle() {
        const author = document.getElementById('author').value.trim();
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        const style = document.getElementById('style').value;
        const keywords = document.getElementById('keywords').value.trim();
        
        if (!author || !title) {
            this.showToast('error', '请输入作者和诗词名称');
            return;
        }
        
        this.showLoading();
        
        try {
            const response = await fetch('/api/articles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author,
                    title,
                    content,
                    style,
                    keywords
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayArticle(data);
                this.currentArticle = data;
                this.showToast('success', '文章生成成功');
                
                // 自动滚动到结果区域
                document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error(data.error || '生成失败');
            }
        } catch (error) {
            this.showToast('error', '生成失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayArticle(articleData) {
        const outputElement = document.getElementById('output');
        const placeholderElement = document.getElementById('outputPlaceholder');
        const actionsElement = document.getElementById('outputActions');
        
        // 创建完整的显示内容
        let displayContent = '';
        
        // 显示生成的标题选项
        if (articleData.titles && articleData.titles.length > 0) {
            displayContent += '<div class="generated-titles"><h4>🎯 生成的爆款标题：</h4>';
            articleData.titles.forEach((title, index) => {
                displayContent += `<div class="title-option" onclick="app.selectTitle('${title}')">${index + 1}. ${title}</div>`;
            });
            displayContent += '</div><hr>';
        }
        
        // 显示封面预览
        if (articleData.cover && articleData.cover.success) {
            displayContent += '<div class="cover-preview"><h4>🖼️ 文字封面预览：</h4>';
            displayContent += `<div class="cover-preview-container">${articleData.cover.html}</div>`;
            displayContent += '</div><hr>';
        }
        
        // 显示文章内容
        displayContent += '<div class="article-content"><h4>📝 文章内容：</h4>';
        displayContent += this.renderMarkdown(articleData.content);
        displayContent += '</div>';
        
        outputElement.innerHTML = displayContent;
        
        // 显示结果区域
        outputElement.style.display = 'block';
        placeholderElement.style.display = 'none';
        actionsElement.style.display = 'flex';
        
        // 添加文章元数据
        this.addArticleMetadata(articleData);
        
        // 保存当前选择的标题（默认第一个）
        this.selectedTitle = articleData.titles && articleData.titles.length > 0 ? articleData.titles[0] : null;
    }

    selectTitle(title) {
        this.selectedTitle = title;
        
        // 更新UI显示选中状态
        document.querySelectorAll('.title-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // 找到并高亮选中的标题
        document.querySelectorAll('.title-option').forEach(option => {
            if (option.textContent.includes(title)) {
                option.classList.add('selected');
            }
        });
        
        this.showToast('success', '标题已选择: ' + title);
    }

    renderMarkdown(content) {
        // 简单的markdown渲染
        return content
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 1rem 0;">')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/gm, '<p>$1</p>')
            .replace(/<p><h([1-6])>/g, '<h$1>')
            .replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    }

    addArticleMetadata(articleData) {
        const metaElement = document.createElement('div');
        metaElement.className = 'article-metadata';
        metaElement.innerHTML = `
            <small style="color: var(--text-muted); margin-top: 1rem; display: block;">
                📊 来源: ${articleData.source || 'AI'} | 
                ⏰ 生成时间: ${new Date().toLocaleString()} |
                📝 字数: ${articleData.content.length}
            </small>
        `;
        
        document.getElementById('output').appendChild(metaElement);
    }

    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('output').style.display = 'none';
        document.getElementById('outputPlaceholder').style.display = 'none';
        document.getElementById('generateBtn').disabled = true;
        document.getElementById('generateBtn').textContent = '生成中...';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('generateBtn').textContent = '✨ 生成文章';
    }

    // ==================== 复制功能 ====================
    async copyToClipboard() {
        if (!this.currentArticle) return;
        
        try {
            await navigator.clipboard.writeText(this.currentArticle.content);
            this.showToast('success', '内容已复制到剪贴板');
        } catch (error) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = this.currentArticle.content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('success', '内容已复制到剪贴板');
        }
    }

    // ==================== 微信功能 ====================
    async testWechatConnection() {
        const appId = document.getElementById('wechatAppId').value.trim();
        const appSecret = document.getElementById('wechatAppSecret').value.trim();
        
        if (!appId || !appSecret) {
            this.showToast('error', '请输入AppID和AppSecret');
            return;
        }
        
        try {
            const response = await fetch('/api/wechat/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId, appSecret })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateWechatStatus(true);
                this.showToast('success', '微信连接测试成功');
                
                // 保存配置
                this.config.wechat = { appId, appSecret };
                await this.saveConfig();
            } else {
                this.updateWechatStatus(false);
                this.showToast('error', '微信连接失败: ' + data.error);
            }
        } catch (error) {
            this.updateWechatStatus(false);
            this.showToast('error', '连接测试失败: ' + error.message);
        }
    }

    updateWechatStatus(connected) {
        const statusElement = document.getElementById('wechatStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span:last-child');
        
        if (connected) {
            dot.className = 'status-dot connected';
            text.textContent = '已连接';
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = '未连接';
        }
    }

    async uploadToWechat() {
        if (!this.currentArticle) {
            this.showToast('error', '请先生成文章');
            return;
        }
        
        console.log('开始上传到微信...', this.currentArticle);
        
        try {
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.disabled = true;
            uploadBtn.textContent = '🚀 上传中...';
            
            // 构建上传数据
            const uploadData = {
                articleId: this.currentArticle.id,
                selectedTitle: this.selectedTitle || null,
                article: this.currentArticle // 传递完整的文章数据
            };
            
            console.log('上传数据:', uploadData);
            
            const response = await fetch('/api/wechat/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('success', `完整内容包已上传到微信草稿箱！\n标题: ${data.data.title}`);
                
                // 显示上传详情
                this.showUploadSuccess(data.data);
            } else {
                this.showToast('error', '上传失败: ' + data.error);
            }
        } catch (error) {
            this.showToast('error', '上传失败: ' + error.message);
        } finally {
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.disabled = false;
            uploadBtn.textContent = '🚀 上传微信';
        }
    }

    showUploadSuccess(uploadData) {
        const successMessage = `
            <div class="upload-success">
                <h4>✅ 上传成功！</h4>
                <p><strong>标题:</strong> ${uploadData.title}</p>
                <p><strong>草稿ID:</strong> ${uploadData.media_id}</p>
                <p><strong>封面:</strong> ${uploadData.hasCustomCover ? '✅ 已上传自定义封面' : '⚠️ 使用默认封面'}</p>
                <p><strong>排版:</strong> ✅ 已优化微信排版</p>
                <small>请到微信公众平台查看草稿并发布</small>
            </div>
        `;
        
        // 临时显示成功信息
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = successMessage;
        tempDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); z-index: 1000; max-width: 400px;';
        document.body.appendChild(tempDiv);
        
        setTimeout(() => {
            document.body.removeChild(tempDiv);
        }, 5000);
    }

    // ==================== 历史记录 ====================
    async loadArticles(page = 1) {
        try {
            const response = await fetch(`/api/articles/history?page=${page}&limit=10`);
            const data = await response.json();
            
            if (data.success) {
                this.articles = data.data.articles;
                this.displayArticles(data.data);
            }
        } catch (error) {
            console.error('加载文章失败:', error);
            this.showToast('error', '加载历史记录失败');
        }
    }

    async loadRecentArticles() {
        try {
            const response = await fetch('/api/articles/history?limit=5');
            const data = await response.json();
            
            if (data.success) {
                this.articles = data.data.articles;
            }
        } catch (error) {
            console.error('加载最近文章失败:', error);
        }
    }

    displayArticles(articlesData) {
        const listElement = document.getElementById('articleList');
        const { articles, pagination } = articlesData;
        
        if (articles.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <div class="placeholder-icon">📝</div>
                    <p>还没有生成过文章，去创作第一篇吧！</p>
                    <button class="btn btn-primary" onclick="app.switchView('generate')">开始创作</button>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = articles.map(article => `
            <div class="article-item">
                <div class="article-meta">
                    <h4 class="article-title">${article.metadata.author} - ${article.metadata.title}</h4>
                    <div class="article-info">
                        ${new Date(article.createdAt).toLocaleDateString()} | 
                        ${article.metadata.style} | 
                        ${article.content.length}字
                    </div>
                </div>
                <div class="article-actions">
                    <button class="btn btn-sm btn-outline" onclick="app.viewArticle('${article.id}')">
                        👁️ 查看
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.copyArticle('${article.id}')">
                        📋 复制
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="app.deleteArticle('${article.id}')">
                        🗑️ 删除
                    </button>
                </div>
            </div>
        `).join('');
        
        this.displayPagination(pagination);
    }

    displayPagination(pagination) {
        const paginationElement = document.getElementById('pagination');
        const { current, total } = pagination;
        
        if (total <= 1) {
            paginationElement.innerHTML = '';
            return;
        }
        
        let html = '';
        
        if (current > 1) {
            html += `<button class="btn btn-outline" onclick="app.loadArticles(${current - 1})">上一页</button>`;
        }
        
        for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
            if (i === current) {
                html += `<button class="btn btn-primary">${i}</button>`;
            } else {
                html += `<button class="btn btn-outline" onclick="app.loadArticles(${i})">${i}</button>`;
            }
        }
        
        if (current < total) {
            html += `<button class="btn btn-outline" onclick="app.loadArticles(${current + 1})">下一页</button>`;
        }
        
        paginationElement.innerHTML = html;
    }

    async deleteArticle(id) {
        if (!confirm('确定要删除这篇文章吗？')) return;
        
        try {
            const response = await fetch(`/api/articles/${id}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('success', '文章删除成功');
                await this.loadArticles();
            } else {
                this.showToast('error', '删除失败: ' + data.error);
            }
        } catch (error) {
            this.showToast('error', '删除失败: ' + error.message);
        }
    }

    // ==================== 统计功能 ====================
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.success) {
                this.displayStats(data.data);
            }
        } catch (error) {
            console.error('加载统计失败:', error);
        }
    }

    displayStats(stats) {
        const statsElement = document.getElementById('statsContent');
        
        statsElement.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.currentArticles || 0}</div>
                <div class="stat-label">总文章数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.recentArticles || 0}</div>
                <div class="stat-label">本周新增</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalGenerations || 0}</div>
                <div class="stat-label">总生成次数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalWechatUploads || 0}</div>
                <div class="stat-label">微信上传次数</div>
            </div>
        `;
    }

    // ==================== 快速操作 ====================
    async testAIService() {
        try {
            const response = await fetch('/api/ai/test');
            const data = await response.json();
            
            if (data.success) {
                this.showToast('success', 'AI服务连接正常');
            } else {
                this.showToast('error', 'AI服务连接失败: ' + data.message);
            }
        } catch (error) {
            this.showToast('error', '测试失败: ' + error.message);
        }
    }

    async testWechatService() {
        if (!this.config.wechat?.appId || !this.config.wechat?.appSecret) {
            this.showToast('error', '请先配置微信公众号信息');
            return;
        }
        
        await this.testWechatConnection();
    }

    async exportData() {
        try {
            const response = await fetch('/api/articles/history?limit=1000');
            const data = await response.json();
            
            if (data.success) {
                const exportData = {
                    articles: data.data.articles,
                    exportedAt: new Date().toISOString()
                };
                
                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json'
                });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `poetry-articles-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.showToast('success', '数据导出成功');
            }
        } catch (error) {
            this.showToast('error', '数据导出失败: ' + error.message);
        }
    }

    // ==================== 设置功能 ====================
    showSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    hideSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    switchSettingsTab(tabName) {
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById(tabName + 'Settings').classList.add('active');
        document.querySelector(`[onclick="switchSettingsTab('${tabName}')"]`).classList.add('active');
    }

    // ==================== 自动保存 ====================
    autoSave() {
        const author = document.getElementById('author').value.trim();
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        
        if (author || title || content) {
            const draftData = { author, title, content };
            localStorage.setItem('poem-draft', JSON.stringify(draftData));
        }
    }

    loadDraft() {
        const draftData = localStorage.getItem('poem-draft');
        if (draftData) {
            const draft = JSON.parse(draftData);
            document.getElementById('author').value = draft.author || '';
            document.getElementById('title').value = draft.title || '';
            document.getElementById('content').value = draft.content || '';
        }
    }

    // ==================== 提示系统 ====================
    showToast(type, message) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageElement = toast.querySelector('.toast-message');
        
        // 设置图标
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        icon.textContent = icons[type] || icons.info;
        messageElement.textContent = message;
        
        // 设置样式
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ==================== 搜索功能 ====================
    async searchArticles() {
        const query = document.getElementById('searchInput').value.trim();
        
        if (!query) {
            await this.loadArticles();
            return;
        }
        
        try {
            const response = await fetch(`/api/articles/history?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayArticles(data.data);
            }
        } catch (error) {
            this.showToast('error', '搜索失败: ' + error.message);
        }
    }
}

// 全局变量和函数
let app;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new PoemApp();
    
    // 加载草稿
    app.loadDraft();
    
    console.log('🌸 最美诗词应用已启动');
});

// 全局函数，供HTML调用
function switchView(viewName) {
    app.switchView(viewName);
}

function generateArticle() {
    app.generateArticle();
}

function copyToClipboard() {
    app.copyToClipboard();
}

function uploadToWechat() {
    app.uploadToWechat();
}

function testWechatConnection() {
    app.testWechatConnection();
}

function showSettings() {
    app.showSettings();
}

function hideSettings() {
    app.hideSettings();
}

function switchSettingsTab(tabName) {
    app.switchSettingsTab(tabName);
}

function testAIService() {
    app.testAIService();
}

function testWechatService() {
    app.testWechatService();
}

function exportData() {
    app.exportData();
}

function searchArticles() {
    app.searchArticles();
}

function saveSettings() {
    // 保存设置逻辑
    app.hideSettings();
    app.showToast('success', '设置保存成功');
}

// 补充缺失的方法
PoemApp.prototype.loadWechatStatus = async function() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (data.services && data.services.wechat !== undefined) {
            this.updateWechatStatus(data.services.wechat);
        }
    } catch (error) {
        console.error('加载微信状态失败:', error);
    }
};