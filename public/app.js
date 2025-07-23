// 最美诗词 - 前端应用
// 重构版本，专注于个人使用的简洁体验

class PoemApp {
    constructor() {
        this.currentView = 'generate';
        this.currentMode = 'poetry'; // 'poetry' or 'baokuan'
        this.currentArticle = null;
        this.articles = [];
        this.config = {};
        this.prompts = this.getDefaultPrompts();
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkServiceStatus();
        await this.loadConfig();
        await this.loadRecentArticles();
        this.initializePrompts();
    }

    getDefaultPrompts() {
        return {
            poetry: `请为{author}的《{title}》创作一篇900-1200字的诗词赏析文章。

重要要求：
1. 必须先找到这首诗的准确原文，如果用户没有提供原文，请根据你的知识库找到正确的诗词内容
2. 风格：{style}
3. 文章结构：
   - 吸引人的标题（例如："千古绝唱！李白《静夜思》背后的深意，读懂的人都哭了"）
   - 诗词原文（完整准确）
   - 创作背景
   - 逐句深度赏析
   - 艺术特色
   - 情感主题
   - 现代意义
   - 结语
4. 适合微信公众号发布，要有吸引力
5. 使用markdown格式
6. 字数控制在900-1200字

{keywords}

{content}

请确保诗词原文的准确性，这是文章质量的基础。`,
            
            baokuan: {
                extract: `请阅读以下文章内容，提炼出一个最有爆款潜力的选题，并给出5个相关关键词。

文章内容：{content}

输出格式：
选题：xxx
关键词：xxx,xxx,xxx,xxx,xxx`,
                
                generate: `请以"{topic}"为主题，结合以下关键词：{keywords}，创作一篇与中国诗词文化相关的原创文章，要求内容新颖、有深度、有诗意，适合公众号爆款。

写作要求：
1. 标题要吸引眼球，引起共鸣
2. 内容要结合诗词文化，有文化底蕴
3. 语言要生动有趣，贴近现代读者
4. 结构清晰，逻辑性强
5. 字数控制在800-1200字
6. 适合微信公众号传播

请创作一篇高质量的爆款文章。`
            }
        };
    }

    initializePrompts() {
        // 从本地存储或配置中加载用户自定义提示词
        const savedPrompts = localStorage.getItem('custom-prompts');
        if (savedPrompts) {
            try {
                this.prompts = { ...this.prompts, ...JSON.parse(savedPrompts) };
            } catch (error) {
                console.error('加载自定义提示词失败:', error);
            }
        }
        
        // 初始化设置页面的提示词内容
        this.updatePromptTextareas();
    }

    updatePromptTextareas() {
        // 更新诗词赏析提示词
        const poetryTextarea = document.getElementById('poetryPromptTemplate');
        if (poetryTextarea) {
            poetryTextarea.value = this.prompts.poetry;
        }
        
        // 更新爆款文提示词
        const baokuanExtractTextarea = document.getElementById('baokuanExtractTemplate');
        if (baokuanExtractTextarea) {
            baokuanExtractTextarea.value = this.prompts.baokuan.extract;
        }
        
        const baokuanGenerateTextarea = document.getElementById('baokuanGenerateTemplate');
        if (baokuanGenerateTextarea) {
            baokuanGenerateTextarea.value = this.prompts.baokuan.generate;
        }
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

    // ==================== 模式切换 ====================
    switchMode(modeName) {
        this.currentMode = modeName;
        
        // 更新模式切换按钮状态
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(modeName + 'Tab').classList.add('active');
        
        // 切换表单显示
        document.querySelectorAll('.form-mode').forEach(form => {
            form.classList.remove('active');
            form.style.display = 'none';
        });
        
        const targetForm = document.getElementById(modeName + 'Form');
        if (targetForm) {
            targetForm.classList.add('active');
            targetForm.style.display = 'block';
        }
        
        // 更新页面标题和描述
        if (modeName === 'poetry') {
            document.getElementById('generateTitle').textContent = '生成诗词赏析文章';
            document.getElementById('generateDescription').textContent = '输入诗词信息，AI将为您生成深度赏析文章';
        } else if (modeName === 'baokuan') {
            document.getElementById('generateTitle').textContent = '生成诗词相关爆款文';
            document.getElementById('generateDescription').textContent = '输入爆款文章链接，AI将生成诗词文化相关的爆款内容';
        }
        
        // 清空当前文章和输出
        this.currentArticle = null;
        this.hideOutput();
        
        this.showToast('info', `已切换到${modeName === 'poetry' ? '诗词赏析' : '爆款文'}模式`);
    }

    hideOutput() {
        document.getElementById('output').style.display = 'none';
        document.getElementById('outputPlaceholder').style.display = 'flex';
        document.getElementById('outputActions').style.display = 'none';
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
                    keywords,
                    customPrompt: this.prompts.poetry
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

    async generateBaokuan() {
        const url = document.getElementById('baokuanUrl').value.trim();
        const manualContent = document.getElementById('baokuanContent').value.trim();
        
        if (!url && !manualContent) {
            this.showToast('error', '请输入爆款文章链接或粘贴正文内容');
            return;
        }
        
        this.showBaokuanLoading();
        
        try {
            const response = await fetch('/api/baokuan/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    manualContent,
                    customPrompts: this.prompts.baokuan
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayBaokuanArticle(data);
                this.currentArticle = data;
                this.showToast('success', '爆款文生成成功');
                
                // 自动滚动到结果区域
                document.getElementById('output').scrollIntoView({ behavior: 'smooth' });
            } else {
                throw new Error(data.error || '生成失败');
            }
        } catch (error) {
            this.showToast('error', '生成失败: ' + error.message);
        } finally {
            this.hideBaokuanLoading();
        }
    }

    displayBaokuanArticle(result) {
        const outputElement = document.getElementById('output');
        const placeholderElement = document.getElementById('outputPlaceholder');
        const actionsElement = document.getElementById('outputActions');
        
        let html = '';
        
        if (result.originTitle) {
            html += `<div class="baokuan-metadata"><strong>原文标题：</strong>${result.originTitle}</div>`;
        }
        
        if (result.originSummary) {
            html += `<div class="baokuan-metadata"><strong>原文摘要：</strong>${result.originSummary}</div>`;
        }
        
        if (result.topic) {
            html += `<div class="baokuan-metadata"><strong>爆款选题：</strong>${result.topic}</div>`;
        }
        
        if (result.keywords && result.keywords.length) {
            html += `<div class="baokuan-metadata"><strong>关键词：</strong>${result.keywords.join('、')}</div>`;
        }
        
        if (result.content) {
            html += '<div class="article-content"><h4>📝 诗词相关爆款文：</h4>' + this.renderMarkdown(result.content) + '</div>';
        }
        
        outputElement.innerHTML = html;
        outputElement.style.display = 'block';
        placeholderElement.style.display = 'none';
        actionsElement.style.display = 'flex';
        
        // 添加文章元数据
        this.addBaokuanMetadata(result);
        
        // 保存当前选择的标题（使用爆款选题）
        this.selectedTitle = result.topic || null;
    }

    addBaokuanMetadata(articleData) {
        const metaElement = document.createElement('div');
        metaElement.className = 'article-metadata';
        metaElement.innerHTML = `
            <small style="color: var(--text-muted); margin-top: 1rem; display: block;">
                📊 来源: 爆款文生成器 | 
                ⏰ 生成时间: ${new Date().toLocaleString()} |
                📝 字数: ${articleData.content ? articleData.content.length : 0}
            </small>
        `;
        
        document.getElementById('output').appendChild(metaElement);
    }

    showBaokuanLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loading').querySelector('p').textContent = 'AI正在抓取和生成爆款文，请稍候...';
        document.getElementById('output').style.display = 'none';
        document.getElementById('outputPlaceholder').style.display = 'none';
        document.getElementById('generateBaokuanBtn').disabled = true;
        document.getElementById('generateBaokuanBtn').textContent = '生成中...';
    }

    hideBaokuanLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('generateBaokuanBtn').disabled = false;
        document.getElementById('generateBaokuanBtn').textContent = '🚀 生成爆款文';
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
            this.showToast('error', `请先生成${this.currentMode === 'poetry' ? '文章' : '爆款文'}`);
            return;
        }
        
        console.log('开始上传到微信...', this.currentArticle);
        
        try {
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.disabled = true;
            uploadBtn.textContent = '🚀 上传中...';
            
            // 先保存文章到存储系统（如果还没有ID的话）
            let articleToUpload = this.currentArticle;
            if (!articleToUpload.id) {
                articleToUpload = await this.saveArticleBeforeUpload();
            }
            
            // 构建上传数据
            const uploadData = {
                articleId: articleToUpload.id,
                selectedTitle: this.selectedTitle || null,
                article: articleToUpload // 传递完整的文章数据
            };
            
            console.log('上传数据:', uploadData);
            
            const response = await fetch('/api/wechat/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                const contentType = this.currentMode === 'poetry' ? '文章' : '爆款文';
                this.showToast('success', `${contentType}已上传到微信草稿箱！\n标题: ${data.data.title}`);
                
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

    async saveArticleBeforeUpload() {
        try {
            let saveData;
            let saveEndpoint;
            
            if (this.currentMode === 'baokuan') {
                // 保存爆款文
                saveData = {
                    ...this.currentArticle,
                    metadata: {
                        title: this.currentArticle.topic || '爆款文',
                        author: '爆款文生成器',
                        style: 'baokuan',
                        keywords: this.currentArticle.keywords ? this.currentArticle.keywords.join(',') : '',
                        createdAt: new Date().toISOString(),
                        type: 'baokuan'
                    }
                };
                saveEndpoint = '/api/baokuan/save';
            } else {
                // 保存诗词文章（使用原有逻辑）
                return this.currentArticle;
            }
            
            const response = await fetch(saveEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentArticle.id = data.id;
                return { ...this.currentArticle, id: data.id };
            } else {
                throw new Error(data.error || '保存失败');
            }
        } catch (error) {
            console.error('保存文章失败:', error);
            // 如果保存失败，仍然尝试上传，但没有ID
            return this.currentArticle;
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
                    <button class="btn btn-sm btn-primary" onclick="app.uploadArticle('${article.id}')">
                        🚀 上传
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

    async viewArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`);
            const data = await response.json();
            
            if (data.success) {
                // 显示文章详情模态框
                this.showArticleModal(data.data);
            } else {
                this.showToast('error', '获取文章失败: ' + data.error);
            }
        } catch (error) {
            this.showToast('error', '获取文章失败: ' + error.message);
        }
    }

    async copyArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`);
            const data = await response.json();
            
            if (data.success && data.data.content) {
                await navigator.clipboard.writeText(data.data.content);
                this.showToast('success', '文章内容已复制到剪贴板');
            } else {
                this.showToast('error', '获取文章内容失败');
            }
        } catch (error) {
            this.showToast('error', '复制失败: ' + error.message);
        }
    }

    async uploadArticle(id) {
        try {
            const response = await fetch(`/api/articles/${id}`);
            const data = await response.json();
            
            if (!data.success) {
                this.showToast('error', '获取文章失败: ' + data.error);
                return;
            }
            
            const article = data.data;
            
            // 构建上传数据
            const uploadData = {
                articleId: id,
                selectedTitle: article.titles && article.titles.length > 0 ? article.titles[0] : null,
                article: article
            };
            
            console.log('历史文章上传数据:', uploadData);
            
            const uploadResponse = await fetch('/api/wechat/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uploadData)
            });
            
            const uploadResult = await uploadResponse.json();
            
            if (uploadResult.success) {
                this.showToast('success', `文章已上传到微信草稿箱！\n标题: ${uploadResult.data.title}`);
                this.showUploadSuccess(uploadResult.data);
            } else {
                this.showToast('error', '上传失败: ' + uploadResult.error);
            }
        } catch (error) {
            this.showToast('error', '上传失败: ' + error.message);
        }
    }

    showArticleModal(article) {
        // 创建文章查看模态框
        const modalHtml = `
            <div id="articleModal" class="modal active">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>${article.metadata?.author || '未知'} - ${article.metadata?.title || '未知标题'}</h3>
                        <button class="modal-close" onclick="closeArticleModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="article-info-bar">
                            <span>📅 ${new Date(article.createdAt).toLocaleString()}</span>
                            <span>🎨 ${article.metadata?.style || '未知风格'}</span>
                            <span>📝 ${article.content?.length || 0}字</span>
                        </div>
                        <div class="article-content-preview">
                            ${this.renderMarkdown(article.content || '无内容')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="copyArticleContent('${article.id}')">📋 复制</button>
                        <button class="btn btn-primary" onclick="uploadArticleFromModal('${article.id}')">🚀 上传微信</button>
                        <button class="btn btn-outline" onclick="closeArticleModal()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('articleModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);
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
        // 确保提示词内容已更新
        this.updatePromptTextareas();
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

function generateBaokuan() {
    app.generateBaokuan();
}

function switchMode(modeName) {
    app.switchMode(modeName);
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

function refreshServerIp() {
    app.refreshServerIp();
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    if (modal) {
        modal.remove();
    }
}

function copyArticleContent(id) {
    app.copyArticle(id);
}

function uploadArticleFromModal(id) {
    app.uploadArticle(id);
    closeArticleModal();
}

// 提示词管理相关函数
function switchPromptTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.prompt-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchPromptTab('${tabName}')"]`).classList.add('active');
    
    // 切换内容
    document.querySelectorAll('.prompt-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Prompt').classList.add('active');
}

function savePoetryPrompt() {
    const promptText = document.getElementById('poetryPromptTemplate').value.trim();
    if (!promptText) {
        app.showToast('error', '提示词不能为空');
        return;
    }
    
    app.prompts.poetry = promptText;
    app.savePrompts();
    app.showToast('success', '诗词赏析提示词已保存');
}

function resetPoetryPrompt() {
    if (confirm('确定要恢复默认的诗词赏析提示词吗？')) {
        const defaultPrompts = app.getDefaultPrompts();
        document.getElementById('poetryPromptTemplate').value = defaultPrompts.poetry;
        app.showToast('info', '已恢复默认提示词');
    }
}

function saveBaokuanPrompts() {
    const extractText = document.getElementById('baokuanExtractTemplate').value.trim();
    const generateText = document.getElementById('baokuanGenerateTemplate').value.trim();
    
    if (!extractText || !generateText) {
        app.showToast('error', '提示词不能为空');
        return;
    }
    
    app.prompts.baokuan.extract = extractText;
    app.prompts.baokuan.generate = generateText;
    app.savePrompts();
    app.showToast('success', '爆款文提示词已保存');
}

function resetBaokuanPrompts() {
    if (confirm('确定要恢复默认的爆款文提示词吗？')) {
        const defaultPrompts = app.getDefaultPrompts();
        document.getElementById('baokuanExtractTemplate').value = defaultPrompts.baokuan.extract;
        document.getElementById('baokuanGenerateTemplate').value = defaultPrompts.baokuan.generate;
        app.showToast('info', '已恢复默认提示词');
    }
}

// 补充缺失的方法
PoemApp.prototype.loadWechatStatus = async function() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (data.services && data.services.wechat !== undefined) {
            this.updateWechatStatus(data.services.wechat);
        }
        
        // 同时加载服务器IP信息
        await this.loadServerIp();
    } catch (error) {
        console.error('加载微信状态失败:', error);
    }
};

PoemApp.prototype.loadServerIp = async function() {
    try {
        const response = await fetch('/api/ip');
        const data = await response.json();
        
        if (data.success) {
            this.updateServerIpDisplay(data.currentIp, data.allResults);
        } else {
            this.updateServerIpDisplay('获取失败', []);
        }
    } catch (error) {
        console.error('获取服务器IP失败:', error);
        this.updateServerIpDisplay('获取失败', []);
    }
};

PoemApp.prototype.updateServerIpDisplay = function(currentIp, allResults) {
    const ipElement = document.getElementById('currentIp');
    if (ipElement) {
        if (currentIp === '获取失败') {
            ipElement.textContent = '获取失败';
            ipElement.style.color = 'var(--error-color)';
        } else {
            ipElement.textContent = currentIp;
            ipElement.style.color = 'var(--success-color)';
            ipElement.style.fontWeight = 'bold';
        }
    }
    
    // 如果有多个IP结果，显示详细信息
    if (allResults && allResults.length > 1) {
        const tooltip = allResults.map(result => 
            `${result.service}: ${result.ip}`
        ).join('\n');
        
        if (ipElement) {
            ipElement.title = `多个检测源结果:\n${tooltip}`;
        }
    }
};

PoemApp.prototype.refreshServerIp = async function() {
    const refreshBtn = document.getElementById('refreshIpBtn');
    const originalText = refreshBtn.textContent;
    
    refreshBtn.disabled = true;
    refreshBtn.textContent = '刷新中...';
    
    try {
        await this.loadServerIp();
        this.showToast('success', 'IP信息已刷新');
    } catch (error) {
        this.showToast('error', '刷新失败: ' + error.message);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
    }
};

PoemApp.prototype.savePrompts = function() {
    try {
        localStorage.setItem('custom-prompts', JSON.stringify(this.prompts));
        console.log('提示词已保存到本地存储');
    } catch (error) {
        console.error('保存提示词失败:', error);
        this.showToast('error', '保存提示词失败');
    }
};