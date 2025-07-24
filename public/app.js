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
                extract: `请深度分析以下爆款文章，提取其成功的爆点要素和写作技巧：

文章内容：{content}

请从以下维度进行分析：
1. 爆款标题技巧（为什么这个标题吸引人？用了什么套路？）
2. 开头抓人技巧（如何在前3句话抓住读者？）
3. 情感触点分析（触动了读者什么情感？恐惧/焦虑/好奇/共鸣？）
4. 内容结构特点（用了什么逻辑结构？对比/反转/递进？）
5. 表达方式特色（语言风格、修辞手法、互动元素）
6. 传播引爆点（什么地方最容易被转发/讨论？）

输出格式：
标题技巧：xxx
开头套路：xxx  
情感触点：xxx
结构特点：xxx
表达特色：xxx
引爆点：xxx`,
                
                generate: `请借鉴以下爆款写作技巧，创作一篇诗词文化领域的爆款文章：

分析出的爆款要素：{keywords}

创作要求：
1. 严格模仿原文的标题技巧，但内容改为诗词相关
2. 借鉴原文的开头套路和情感触点
3. 使用相同的内容结构和表达方式
4. 保持原文的传播引爆点，但融入诗词文化
5. 字数控制在800-1200字
6. 目标：让不懂诗词的人也想转发

核心思路：不是普通的诗词科普，而是借鉴爆文套路的诗词爆款文！

请开始创作：`
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
            document.getElementById('generateTitle').textContent = '仿写爆款文';
            document.getElementById('generateDescription').textContent = '输入爆款文章链接或内容，AI将分析其爆款套路并仿写全新文章';
        } else if (modeName === 'xiaolvshu') {
            document.getElementById('generateTitle').textContent = '生成小绿书图片';
            document.getElementById('generateDescription').textContent = '输入任意文本内容，AI将智能分段并生成精美图片';
        }
        
        // 清空当前文章和输出
        this.currentArticle = null;
        this.hideOutput();
        
        const modeNames = {
            'poetry': '诗词赏析',
            'baokuan': '爆款文',
            'xiaolvshu': '小绿书'
        };
        this.showToast('info', `已切换到${modeNames[modeName] || modeName}模式`);
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
            const response = await fetch('/api/baokuan/generate-complete', {
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
        
        // 显示生成的标题选项（如果有多个）
        if (result.titles && result.titles.length > 0) {
            html += '<div class="generated-titles"><h4>🎯 生成的爆款标题：</h4>';
            result.titles.forEach((title, index) => {
                const isSelected = index === 0;
                html += `
                    <div class="title-option ${isSelected ? 'selected' : ''}" 
                         onclick="app.selectTitle('${title.replace(/'/g, "\\'")}', this)">
                        ${title}
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 显示封面预览（如果有）
        if (result.cover && result.cover.success) {
            html += '<div class="cover-preview"><h4>🎨 生成的封面：</h4>';
            if (result.cover.html) {
                html += `<div class="cover-preview-container">${result.cover.html}</div>`;
            } else if (result.cover.imageUrl) {
                html += `<div class="cover-preview-container"><img src="${result.cover.imageUrl}" alt="封面图" style="max-width: 200px; border-radius: 8px;"></div>`;
            }
            html += '</div>';
        }
        
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
        
        if (result.explosiveElements) {
            html += `<div class="baokuan-metadata"><strong>爆款要素分析：</strong><br><pre style="white-space: pre-wrap; font-size: 0.8em; line-height: 1.4;">${result.explosiveElements}</pre></div>`;
        }
        
        if (result.content) {
            html += '<div class="article-content"><h4>📝 仿写的爆款文：</h4>' + this.renderMarkdown(result.content) + '</div>';
        }
        
        outputElement.innerHTML = html;
        outputElement.style.display = 'block';
        placeholderElement.style.display = 'none';
        actionsElement.style.display = 'flex';
        
        // 添加文章元数据
        this.addBaokuanMetadata(result);
        
        // 保存当前选择的标题（使用第一个生成的标题或爆款选题）
        this.selectedTitle = (result.titles && result.titles.length > 0) ? result.titles[0] : result.topic || null;
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
                    <h4 class="article-title">${this.getDisplayTitle(article)}</h4>
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

    getDisplayTitle(article) {
        // 优先显示AI生成的爆款标题
        if (article.titles && article.titles.length > 0) {
            // 诗词赏析：显示第一个生成的爆款标题
            return article.titles[0];
        } else if (article.topic) {
            // 爆款文：显示提炼的选题
            return article.topic;
        } else if (article.metadata?.type === 'baokuan') {
            // 爆款文但没有topic的情况
            return '爆款文：' + (article.metadata.title || '未知标题');
        } else {
            // 默认情况：显示传统格式
            return `${article.metadata?.author || '未知作者'} - ${article.metadata?.title || '未知标题'}`;
        }
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

// 图片上传和OCR相关函数
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        app.showToast('error', '请上传图片文件');
        return;
    }
    
    // 检查文件大小 (最大10MB)
    if (file.size > 10 * 1024 * 1024) {
        app.showToast('error', '图片文件不能超过10MB');
        return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';
        
        // 存储文件供后续OCR使用
        app.uploadedImageFile = file;
        app.showToast('success', '图片上传成功，点击"提取文字"进行识别');
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    document.getElementById('baokuanImage').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    app.uploadedImageFile = null;
    app.showToast('info', '已清除图片');
}

// 文件转base64辅助函数
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function extractTextFromImage() {
    if (!app.uploadedImageFile) {
        app.showToast('error', '请先上传图片');
        return;
    }
    
    const extractBtn = document.getElementById('extractBtn');
    const originalText = extractBtn.textContent;
    
    try {
        extractBtn.classList.add('extracting');
        extractBtn.disabled = true;
        extractBtn.textContent = '🔍 识别中...';
        
        // 将文件转换为base64
        const base64Image = await fileToBase64(app.uploadedImageFile);
        
        const response = await fetch('/api/ocr/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Image
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 将提取的文字填入文本框
            const contentTextarea = document.getElementById('baokuanContent');
            contentTextarea.value = data.text;
            
            app.showToast('success', `成功识别 ${data.text.length} 个字符`);
            
            // 自动滚动到文本框
            contentTextarea.scrollIntoView({ behavior: 'smooth' });
            contentTextarea.focus();
        } else {
            app.showToast('error', '文字识别失败: ' + data.error);
        }
    } catch (error) {
        app.showToast('error', '文字识别失败: ' + error.message);
    } finally {
        extractBtn.classList.remove('extracting');
        extractBtn.disabled = false;
        extractBtn.textContent = originalText;
    }
}

// ==================== 小绿书功能 ====================

// 显示小绿书生成弹窗
function generateXiaoLvShu() {
    // 获取当前生成的内容
    const outputElement = document.getElementById('output');
    if (!outputElement || !outputElement.textContent.trim()) {
        app.showToast('error', '请先生成文章内容');
        return;
    }
    
    // 自动填充标题和作者信息
    const titleInput = document.getElementById('xiaoLvShuTitle');
    const authorInput = document.getElementById('xiaoLvShuAuthor');
    
    // 尝试从当前文章获取标题
    if (app.currentArticle && app.currentArticle.titles && app.currentArticle.titles.length > 0) {
        titleInput.value = app.currentArticle.titles[0];
    } else if (document.getElementById('title')) {
        titleInput.value = document.getElementById('title').value;
    }
    
    // 尝试获取作者
    if (document.getElementById('author')) {
        authorInput.value = document.getElementById('author').value;
    }
    
    // 显示模态框
    document.getElementById('xiaoLvShuModal').classList.add('active');
}

// 隐藏小绿书模态框
function hideXiaoLvShuModal() {
    document.getElementById('xiaoLvShuModal').classList.remove('active');
    
    // 重置状态
    document.getElementById('xiaoLvShuLoading').style.display = 'none';
    document.getElementById('xiaoLvShuResult').style.display = 'none';
    document.getElementById('xiaoLvShuImages').innerHTML = '';
}

// 开始生成小绿书
async function startGenerateXiaoLvShu() {
    const outputElement = document.getElementById('output');
    const content = outputElement.textContent.trim();
    
    if (!content) {
        app.showToast('error', '没有可用的文章内容');
        return;
    }
    
    const template = document.getElementById('xiaoLvShuTemplate').value;
    const title = document.getElementById('xiaoLvShuTitle').value || '诗词赏析';
    const author = document.getElementById('xiaoLvShuAuthor').value || '';
    
    // 显示加载状态
    document.getElementById('xiaoLvShuLoading').style.display = 'block';
    document.getElementById('xiaoLvShuResult').style.display = 'none';
    
    try {
        console.log('📸 开始生成小绿书图片...');
        
        const response = await fetch('/api/xiaolvshu/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                title: title,
                author: author,
                template: template
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayXiaoLvShuResult(data);
            app.showToast('success', `小绿书生成成功！共 ${data.totalPages} 张图片`);
        } else {
            app.showToast('error', '生成失败: ' + data.error);
        }
        
    } catch (error) {
        console.error('小绿书生成失败:', error);
        app.showToast('error', '生成失败: ' + error.message);
    } finally {
        document.getElementById('xiaoLvShuLoading').style.display = 'none';
    }
}

// 显示小绿书生成结果
function displayXiaoLvShuResult(data) {
    const resultDiv = document.getElementById('xiaoLvShuResult');
    const imagesDiv = document.getElementById('xiaoLvShuImages');
    const countSpan = document.getElementById('xiaoLvShuCount');
    
    // 更新计数
    countSpan.textContent = `共 ${data.totalPages} 张图片 (${data.template})`;
    
    // 清空之前的图片
    imagesDiv.innerHTML = '';
    
    // 显示每张图片
    data.images.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'xiaolvshu-image-item';
        
        imageItem.innerHTML = `
            <div class="xiaolvshu-page-number">${image.pageNumber}</div>
            <img src="${image.dataUrl}" alt="第${image.pageNumber}页" />
            <div class="xiaolvshu-image-overlay">
                <div class="xiaolvshu-image-actions">
                    <button class="btn btn-sm btn-outline" onclick="downloadXiaoLvShuImage(${index})">
                        💾 下载
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="previewXiaoLvShuImage(${index})">
                        👁️ 预览
                    </button>
                </div>
            </div>
        `;
        
        imagesDiv.appendChild(imageItem);
    });
    
    // 存储图片数据供后续使用
    app.currentXiaoLvShuImages = data.images;
    
    // 显示结果
    resultDiv.style.display = 'block';
}

// 下载单张小绿书图片
function downloadXiaoLvShuImage(index) {
    if (!app.currentXiaoLvShuImages || !app.currentXiaoLvShuImages[index]) {
        app.showToast('error', '图片数据不存在');
        return;
    }
    
    const image = app.currentXiaoLvShuImages[index];
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = `小绿书_第${image.pageNumber}页.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    app.showToast('success', `第${image.pageNumber}页下载完成`);
}

// 预览小绿书图片
function previewXiaoLvShuImage(index) {
    if (!app.currentXiaoLvShuImages || !app.currentXiaoLvShuImages[index]) {
        app.showToast('error', '图片数据不存在');
        return;
    }
    
    const image = app.currentXiaoLvShuImages[index];
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
            <head>
                <title>小绿书预览 - 第${image.pageNumber}页</title>
                <style>
                    body { margin: 0; padding: 20px; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                    img { max-width: 100%; max-height: 100%; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px; }
                </style>
            </head>
            <body>
                <img src="${image.dataUrl}" alt="第${image.pageNumber}页" />
            </body>
        </html>
    `);
}

// 下载全部小绿书图片
function downloadAllXiaoLvShu() {
    if (!app.currentXiaoLvShuImages || app.currentXiaoLvShuImages.length === 0) {
        app.showToast('error', '没有可下载的图片');
        return;
    }
    
    app.currentXiaoLvShuImages.forEach((image, index) => {
        setTimeout(() => {
            downloadXiaoLvShuImage(index);
        }, index * 500); // 延迟下载避免浏览器限制
    });
}

// 上传小绿书到微信（图片&文字模式）
async function uploadXiaoLvShuToWechat(event) {
    console.log('🚀 uploadXiaoLvShuToWechat函数被调用');
    
    if (!app.currentXiaoLvShuImages || app.currentXiaoLvShuImages.length === 0) {
        app.showToast('error', '没有可上传的图片');
        return;
    }
    
    // 检查图片是否都有dataUrl
    const validImages = app.currentXiaoLvShuImages.filter(img => img.dataUrl);
    if (validImages.length === 0) {
        app.showToast('error', '图片数据不完整，请重新生成');
        return;
    }
    
    if (validImages.length < app.currentXiaoLvShuImages.length) {
        const confirmed = confirm(`有 ${app.currentXiaoLvShuImages.length - validImages.length} 张图片数据不完整，是否只上传 ${validImages.length} 张有效图片？`);
        if (!confirmed) return;
    }
    
    // 获取触发事件的按钮
    const uploadBtn = event ? event.target : document.querySelector('button[onclick*="uploadXiaoLvShuToWechat"]');
    if (!uploadBtn) {
        app.showToast('error', '找不到上传按钮');
        return;
    }
    
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '上传中...';
    
    try {
        app.showToast('info', '开始上传小绿书到微信草稿...');
        
        // 获取标题（从页面或默认）
        const titleElement = document.getElementById('xiaolvshuTitle');
        const title = titleElement ? titleElement.value.trim() : '图文分享';
        
        const response = await fetch('/api/xiaolvshu/upload-wechat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                images: validImages,
                title: title || '图文分享'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            app.showToast('success', result.message || '小绿书已上传到微信草稿箱');
            console.log('✅ 小绿书上传成功:', result.data);
        } else {
            throw new Error(result.message || result.error || '上传失败');
        }
        
    } catch (error) {
        console.error('小绿书上传失败:', error);
        app.showToast('error', '上传失败: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
}

/**
 * 显示进度容器（避免图片插入页面导致布局拉伸）
 */
function displayProgressContainer(totalPages) {
    const outputElement = document.getElementById('output');
    const outputPlaceholder = document.getElementById('outputPlaceholder');
    const outputActions = document.getElementById('outputActions');
    
    // 显示输出区域
    outputElement.style.display = 'block';
    outputPlaceholder.style.display = 'none';
    outputActions.style.display = 'none';
    
    // 创建进度容器（固定高度，避免布局跳动）
    outputElement.innerHTML = `
        <div class="xiaolvshu-progress-container" style="min-height: 400px;">
            <div class="xiaolvshu-result-info">
                <h4>📸 小绿书生成进度</h4>
                <div class="progress-bar-container" style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; margin: 10px 0;">
                    <div id="progressBar" class="progress-bar" style="width: 0%; height: 100%; background: #4CAF50; border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
                <p id="progressText">准备生成 ${totalPages} 张图片...</p>
            </div>
            
            <div id="progressImagesList" class="xiaolvshu-progress-list" style="max-height: 300px; overflow-y: auto;">
                <!-- 生成进度列表 -->
            </div>
        </div>
    `;
}

/**
 * 更新进度显示
 */
function updateProgressDisplay(generatedImages, totalPages, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const imagesList = document.getElementById('progressImagesList');
    
    if (progressBar) {
        const progress = (generatedImages.length / totalPages) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${message} (${generatedImages.length}/${totalPages})`;
    }
    
    if (imagesList) {
        // 只显示完成的图片列表，不显示实际图片（避免布局问题）
        let listHtml = '';
        
        // 创建已完成的页码映射
        const completedPages = new Set(generatedImages.map(img => img.pageNumber));
        
        for (let i = 1; i <= totalPages; i++) {
            if (completedPages.has(i)) {
                listHtml += `
                    <div class="progress-item" style="padding: 8px; margin: 4px 0; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #4CAF50;">
                        <span style="font-weight: bold;">第 ${i} 页</span>
                        <span style="margin-left: 10px; color: #666; font-size: 14px;">✅ 生成完成</span>
                    </div>
                `;
            } else {
                listHtml += `
                    <div class="progress-item" style="padding: 8px; margin: 4px 0; background: #f0f0f0; border-radius: 4px; border-left: 4px solid #ddd;">
                        <span style="font-weight: bold;">第 ${i} 页</span>
                        <span style="margin-left: 10px; color: #999; font-size: 14px;">⏳ 等待生成...</span>
                    </div>
                `;
            }
        }
        
        imagesList.innerHTML = listHtml;
        
        // 在进度更新时存储生成的图片数据
        if (generatedImages.length > 0 && app) {
            app.currentXiaoLvShuImages = generatedImages;
        }
    }
}

// 独立的小绿书生成函数（直接从表单输入）
async function generateXiaoLvShuDirect() {
    const title = document.getElementById('xiaolvshuTitle').value.trim() || '内容图片';
    const author = document.getElementById('xiaolvshuAuthor').value.trim() || '';
    const content = document.getElementById('xiaolvshuContent').value.trim();
    const template = document.getElementById('xiaolvshuTemplate').value;
    const useAIGeneration = document.getElementById('useAIGeneration').checked;
    
    if (!content) {
        app.showToast('error', '请输入要转换的文本内容');
        return;
    }
    
    const generateBtn = document.getElementById('generateXiaoLvShuBtn');
    const originalText = generateBtn.textContent;
    
    try {
        // 显示加载状态
        generateBtn.disabled = true;
        generateBtn.textContent = useAIGeneration ? '🤖 AI生成中...' : '📸 生成中...';
        
        console.log('📸 开始生成小绿书图片...', useAIGeneration ? '(AI完全生成模式)' : '(SVG模板模式)');
        
        // 改用fetch实现手动流式接收（解决GET长度限制）
        const response = await fetch('/api/xiaolvshu/generate-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
                title: title,
                author: author,
                template: template,
                useAIGeneration: useAIGeneration
            })
        });

        if (!response.body) {
            throw new Error('流式响应不支持');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const generatedImages = [];
        let totalPages = 0;
        let isFirstUpdate = true;
        let buffer = '';
        
        // 隐藏loading，显示进度模式
        document.getElementById('loading').style.display = 'none';

        // 手动实现流式读取
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const progressData = JSON.parse(line.substring(6));
                            console.log('📡 收到进度:', progressData);

                            // 处理不同的进度步骤
                            if (progressData.step === 2 && progressData.data?.totalPages) {
                                totalPages = progressData.data.totalPages;
                                // 显示进度容器
                                displayProgressContainer(totalPages);
                                isFirstUpdate = false;
                            }
                            
                            // 单张图片完成
                            if (progressData.data?.image) {
                                generatedImages.push(progressData.data.image);
                                // 更新进度显示（不插入实际图片）
                                updateProgressDisplay(generatedImages, progressData.data.total, progressData.message);
                            }

                            // 全部完成
                            if (progressData.step === 999) {
                                if (progressData.data?.finalResult) {
                                    const finalData = progressData.data.finalResult;
                                    displayXiaoLvShuDirectResult(finalData);
                                    app.showToast('success', `🎉 小绿书生成完成！共 ${finalData.totalPages} 张图片`);
                                } else if (progressData.data?.error) {
                                    app.showToast('error', '生成失败: ' + progressData.data.error);
                                }
                                break;
                            }

                        } catch (parseError) {
                            console.error('解析进度数据失败:', parseError);
                        }
                    }
                }
            }
        } catch (streamError) {
            console.error('流式读取失败:', streamError);
            
            // 如果已经有图片生成成功，显示部分结果
            if (generatedImages.length > 0) {
                app.showToast('warning', `连接中断，已生成${generatedImages.length}张图片`);
                displayXiaoLvShuDirectResult({
                    success: true,
                    images: generatedImages,
                    totalPages: generatedImages.length,
                    template: template,
                    partial: true
                });
            } else {
                app.showToast('error', '生成失败，请重试');
            }
        } finally {
            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
            // loading已经在开始时隐藏了
        }

        return;
        
    } catch (error) {
        console.error('小绿书生成失败:', error);
        app.showToast('error', '生成失败: ' + error.message);
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
        // loading已经在开始时隐藏了
    }
}

// 显示独立小绿书生成结果
function displayXiaoLvShuDirectResult(data) {
    const outputElement = document.getElementById('output');
    const placeholderElement = document.getElementById('outputPlaceholder');
    const actionsElement = document.getElementById('outputActions');
    
    let html = `
        <div class="xiaolvshu-result-info">
            <h4>📸 小绿书生成完成</h4>
            <p>共生成 ${data.totalPages} 张图片，使用模板：${data.template}</p>
        </div>
        
        <div class="xiaolvshu-images-grid">
    `;
    
    // 显示每张图片
    data.images.forEach((image, index) => {
        html += `
            <div class="xiaolvshu-image-card">
                <div class="xiaolvshu-page-number">第 ${image.pageNumber} 页</div>
                ${image.aiGenerated ? 
                    `<img src="${image.imageUrl}" alt="第${image.pageNumber}页" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />` :
                image.frontendCanvas ? 
                    `<div class="canvas-placeholder" data-index="${index}" style="width: 100%; height: 300px; background: #f5f5f5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666;">前端生成中...</div>` :
                    `<img src="${image.dataUrl}" alt="第${image.pageNumber}页" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`
                }
                <div class="xiaolvshu-image-actions">
                    <button class="btn btn-sm btn-outline" onclick="downloadXiaoLvShuImage(${index})">
                        💾 下载
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="previewXiaoLvShuImage(${index})">
                        👁️ 预览
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // 批量操作按钮
    html += `
        <div class="xiaolvshu-batch-actions">
            <button class="btn btn-outline" onclick="downloadAllXiaoLvShu()">
                💾 下载全部
            </button>
            <button class="btn btn-primary" onclick="uploadXiaoLvShuToWechat(event)">
                🚀 上传微信
            </button>
        </div>
    `;
    
    outputElement.innerHTML = html;
    outputElement.style.display = 'block';
    placeholderElement.style.display = 'none';
    actionsElement.style.display = 'none'; // 小绿书模式不需要这些按钮
    
    // 存储图片数据供后续使用
    app.currentXiaoLvShuImages = data.images;
    
    // 处理前端Canvas生成的图片
    setTimeout(() => {
        data.images.forEach((image, index) => {
            if (image.frontendCanvas) {
                // 前端生成Canvas图片
                generateCanvasImageFinal(image, index);
            }
        });
    }, 100);
    
    // 滚动到结果区域
    outputElement.scrollIntoView({ behavior: 'smooth' });
}

// 前端Canvas图片生成器
class FrontendCanvasGenerator {
    constructor() {
        this.templates = {
            classic: {
                name: '古典雅致',
                width: 750,
                height: 1334,
                background: '#f8f5f0',
                textColor: '#2c2c2c',
                fontSize: 24,
                lineHeight: 40,
                padding: 80,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            },
            modern: {
                name: '现代简约',
                width: 750,
                height: 1334,
                background: '#ffffff',
                textColor: '#333333',
                fontSize: 26,
                lineHeight: 42,
                padding: 70,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            },
            elegant: {
                name: '优雅文艺',
                width: 750,
                height: 1334,
                background: '#ffecd2',
                textColor: '#444444',
                fontSize: 22,
                lineHeight: 38,
                padding: 75,
                fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
            }
        };
    }
    
    generateImage(content, template = 'classic', pageNumber = 1, totalPages = 1) {
        const config = this.templates[template];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = config.width;
        canvas.height = config.height;
        
        // 绘制背景
        ctx.fillStyle = config.background;
        ctx.fillRect(0, 0, config.width, config.height);
        
        // 智能字体大小计算
        const intelligentFontSize = this.calculateIntelligentFontSize(content, config);
        
        // 绘制文字
        ctx.fillStyle = config.textColor;
        ctx.font = `${intelligentFontSize}px ${config.fontFamily}`;
        ctx.textAlign = 'center'; // 改为居中对齐
        ctx.textBaseline = 'top';
        
        // 文字换行
        const maxWidth = config.width - config.padding * 2;
        const lines = this.wrapText(ctx, content, maxWidth);
        
        // 计算文字总高度并垂直居中
        const totalTextHeight = lines.length * intelligentFontSize * 1.6; // 使用行高1.6
        const startY = Math.max(config.padding, (config.height - totalTextHeight) / 2);
        
        let y = startY;
        for (const line of lines) {
            if (y + intelligentFontSize * 1.6 > config.height - config.padding) break;
            
            if (line.trim()) {
                ctx.fillText(line, config.width / 2, y); // 居中绘制
            }
            y += intelligentFontSize * 1.6;
        }
        
        // 绘制页码
        if (totalPages > 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.font = `14px ${config.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.fillText(`${pageNumber}/${totalPages}`, config.width / 2, config.height - 30);
        }
        
        return canvas.toDataURL('image/png');
    }
    
    // 智能字体大小计算
    calculateIntelligentFontSize(content, config) {
        const length = content.length;
        let fontSize;
        
        if (length <= 100) {
            fontSize = Math.max(28, config.fontSize + 6); // 短文本用大字体
        } else if (length <= 300) {
            fontSize = config.fontSize + 2; // 中等文本稍大
        } else if (length <= 600) {
            fontSize = config.fontSize; // 正常字体
        } else if (length <= 1000) {
            fontSize = Math.max(16, config.fontSize - 4); // 较长文本缩小
        } else {
            fontSize = Math.max(14, config.fontSize - 8); // 很长文本更小
        }
        
        console.log(`📝 智能字体大小: 内容${length}字符 -> ${fontSize}px`);
        return fontSize;
    }
    
    wrapText(ctx, text, maxWidth) {
        const lines = [];
        const paragraphs = text.split('\n');
        
        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                lines.push('');
                continue;
            }
            
            const chars = paragraph.split('');
            let currentLine = '';
            
            for (let i = 0; i < chars.length; i++) {
                const char = chars[i];
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    const endPunctuations = ['。', '，', '！', '？', '；', '：', '）', '】', '』', '》', '」', '"', '"', '、'];
                    
                    if (endPunctuations.includes(char)) {
                        currentLine += char;
                    } else {
                        lines.push(currentLine);
                        currentLine = char;
                    }
                } else {
                    currentLine += char;
                }
            }
            
            if (currentLine.trim()) {
                lines.push(currentLine);
            }
        }
        
        return lines;
    }
}

// 创建全局Canvas生成器实例
const frontendCanvasGenerator = new FrontendCanvasGenerator();

// 生成Canvas图片 (通用函数)
function generateCanvasImage(imageData, index) {
    try {
        const dataUrl = frontendCanvasGenerator.generateImage(
            imageData.content, 
            imageData.template || 'classic',
            imageData.pageNumber, 
            imageData.totalPages || 1
        );
        
        // 更新图片数据
        if (app.currentXiaoLvShuImages && app.currentXiaoLvShuImages[index]) {
            app.currentXiaoLvShuImages[index].dataUrl = dataUrl;
            app.currentXiaoLvShuImages[index].frontendCanvas = false; // 标记已生成
        }
        
        // 更新页面显示 - 查找占位符
        const placeholderDiv = document.querySelector(`.canvas-placeholder[data-index="${index}"]`);
        if (placeholderDiv) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = `第${imageData.pageNumber}页`;
            img.style.cssText = 'width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
            placeholderDiv.parentNode.replaceChild(img, placeholderDiv);
            console.log(`📱 页面显示已更新 (第${imageData.pageNumber}页)`);
        } else {
            console.warn(`❌ 找不到占位符: .canvas-placeholder[data-index="${index}"]`);
            // 备用方案：查找所有含有"前端生成中"的div
            const allPlaceholders = document.querySelectorAll('div[style*="前端生成中"]');
            console.log(`🔍 找到 ${allPlaceholders.length} 个占位符`);
            
            // 尝试根据页码匹配
            for (const placeholder of allPlaceholders) {
                const card = placeholder.closest('.xiaolvshu-image-card');
                if (card) {
                    const pageNumberElement = card.querySelector('.xiaolvshu-page-number');
                    if (pageNumberElement && pageNumberElement.textContent.includes(`${imageData.pageNumber}`)) {
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.alt = `第${imageData.pageNumber}页`;
                        img.style.cssText = 'width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
                        placeholder.parentNode.replaceChild(img, placeholder);
                        console.log(`✅ 备用方案更新成功 (第${imageData.pageNumber}页)`);
                        break;
                    }
                }
            }
        }
        
        console.log(`✅ 前端Canvas生成成功 (第${imageData.pageNumber}页)`);
    } catch (error) {
        console.error(`前端Canvas生成失败 (第${imageData.pageNumber}页):`, error);
    }
}

// 最终结果页面的Canvas图片生成
function generateCanvasImageFinal(imageData, index) {
    generateCanvasImage(imageData, index);
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