// 爆款文 - 前端应用
// 复制自 app.js
class BaokuanApp {
    constructor() {
        this.currentArticle = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkServiceStatus();
    }

    bindEvents() {
        document.addEventListener('submit', (e) => e.preventDefault());
    }

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

    async generateArticle() {
        const url = document.getElementById('articleUrl').value.trim();
        const manualContent = document.getElementById('manualContent').value.trim();
        if (!url && !manualContent) {
            this.showToast('error', '请输入爆款文章链接或粘贴正文内容');
            return;
        }
        this.showLoading();
        try {
            const response = await fetch('/api/baokuan/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, manualContent })
            });
            const data = await response.json();
            if (data.success) {
                this.displayResult(data);
                this.currentArticle = data;
                this.showToast('success', '爆款文生成成功');
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

    displayResult(result) {
        const outputElement = document.getElementById('output');
        const placeholderElement = document.getElementById('outputPlaceholder');
        const actionsElement = document.getElementById('outputActions');
        let html = '';
        if (result.originTitle) {
            html += `<div class="article-metadata"><strong>原文标题：</strong>${result.originTitle}</div>`;
        }
        if (result.originSummary) {
            html += `<div class="article-metadata"><strong>原文摘要：</strong>${result.originSummary}</div>`;
        }
        if (result.topic) {
            html += `<div class="article-metadata"><strong>爆款选题：</strong>${result.topic}</div>`;
        }
        if (result.keywords && result.keywords.length) {
            html += `<div class="article-metadata"><strong>关键词：</strong>${result.keywords.join('、')}</div>`;
        }
        if (result.content) {
            html += '<div class="article-content"><h4>📝 诗词相关爆款文：</h4>' + this.renderMarkdown(result.content) + '</div>';
        }
        outputElement.innerHTML = html;
        outputElement.style.display = 'block';
        placeholderElement.style.display = 'none';
        actionsElement.style.display = 'flex';
    }

    renderMarkdown(content) {
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
        document.getElementById('generateBtn').textContent = '🚀 生成爆款文';
    }

    async copyToClipboard() {
        if (!this.currentArticle || !this.currentArticle.content) return;
        try {
            await navigator.clipboard.writeText(this.currentArticle.content);
            this.showToast('success', '内容已复制到剪贴板');
        } catch (error) {
            const textarea = document.createElement('textarea');
            textarea.value = this.currentArticle.content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('success', '内容已复制到剪贴板');
        }
    }

    showToast(type, message) {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('.toast-icon');
        const messageElement = toast.querySelector('.toast-message');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        icon.textContent = icons[type] || icons.info;
        messageElement.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }
}

let baokuanApp;
document.addEventListener('DOMContentLoaded', () => {
    baokuanApp = new BaokuanApp();
});

function generateArticle() {
    baokuanApp.generateArticle();
}
function copyToClipboard() {
    baokuanApp.copyToClipboard();
}
function showSettings() {
    document.getElementById('settingsModal').classList.add('active');
}
function hideSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}
function switchSettingsTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabName + 'Settings').classList.add('active');
    document.querySelector(`[onclick="switchSettingsTab('${tabName}')"]`).classList.add('active');
}
function testAIService() {}
function testWechatService() {}
function exportData() {}