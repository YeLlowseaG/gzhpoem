# 最美诗词 - 公众号文章生成器

一个基于AI的诗词赏析文章生成工具，支持直接上传到微信公众号草稿箱。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
npm start
```

### 3. 打开浏览器
访问 http://localhost:3001

## 📱 使用说明

### 生成文章
1. 在"生成文章"标签页中输入诗词信息
2. 选择合适的文章风格
3. 点击"生成文章"按钮
4. 复制生成的内容到微信编辑器

### 配置微信公众号
1. 切换到"公众号配置"标签页
2. 输入你的微信公众号AppID和AppSecret
3. 点击"测试连接"验证配置
4. 连接成功后即可直接上传文章到草稿箱

### 获取AppID和AppSecret
1. 登录微信公众平台 (https://mp.weixin.qq.com)
2. 进入"开发" → "基本配置"
3. 复制AppID和AppSecret到配置页面

## ⚡ 功能特点

- ✨ AI驱动的诗词赏析文章生成
- 📝 900+字详细内容，符合公众号阅读习惯
- 🎨 4种文风选择（通俗、文雅、情感、学术）
- 🖼️ 自动插入高质量配图
- 📱 响应式设计，支持手机使用
- 🚀 一键上传到微信公众号草稿箱
- 💾 自动保存配置信息

## 🛠️ 技术架构

- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **后端**: Node.js + Express
- **API集成**: 微信公众平台API
- **图片服务**: Unsplash API

## 📋 文章结构

生成的文章包含以下部分：
- 📖 诗词原文
- 🎯 逐句赏析  
- 🌟 重点词语/意象解析
- 📚 创作背景
- 👨‍🎨 作者简介
- 🎨 艺术手法
- 💭 情感主题
- 🖼️ 精美配图（3张）
- 📸 封面图片

## 🔒 安全说明

- AppSecret信息仅保存在本地localStorage
- 所有微信API调用通过本地代理服务器进行
- 不会上传或存储任何敏感信息到外部服务器

## 🐛 常见问题

**Q: 提示"获取AccessToken失败"？**
A: 请检查AppID和AppSecret是否正确，确保公众号具有相应权限。

**Q: 上传图片失败？**
A: 可能是网络问题，请确保网络连接正常，或更换图片URL。

**Q: 无法连接到服务器？**
A: 请确保已运行 `npm start` 启动代理服务器。

## 📞 技术支持

如有问题请检查：
1. Node.js版本 >= 14.0
2. 网络连接正常
3. 微信公众号配置正确
4. 代理服务器运行中

## 📄 许可证

MIT License