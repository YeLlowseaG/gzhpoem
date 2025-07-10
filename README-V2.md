# 最美诗词生成器 V2.0 

> 一键生成诗词赏析爆文 + 精美封面 + 智能标题，直接上传微信公众号草稿箱

## 🎯 核心功能

### 一期功能（已完成）
- ✅ **输入作者 + 诗词名称**
- ✅ **生成900+字深度赏析文章**
- ✅ **生成3个爆款标题供选择**
- ✅ **生成精美文字封面**
- ✅ **优化排版，适配微信公众号**
- ✅ **一键上传到草稿箱**

### 技术特色
- 🤖 **多AI服务支持**：通义千问 + OpenAI + DeepSeek
- 🛡️ **智能降级**：AI失败时自动使用本地模板
- 💾 **本地存储**：所有生成内容自动保存
- 🎨 **响应式设计**：支持PC和移动端
- ⚡ **并行生成**：文章、标题、封面同时生成

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# AI服务配置（至少配置一个）
QWEN_API_KEY=your_qwen_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 微信公众号配置（可选，可在界面配置）
WECHAT_APPID=your_wechat_appid_here
WECHAT_SECRET=your_wechat_secret_here

# 服务器配置
PORT=3001
```

### 3. 启动服务
```bash
npm start
```

### 4. 打开浏览器
访问 http://localhost:3001

## 📖 使用说明

### 生成内容包
1. 在首页输入：
   - **作者**：如 "李白"
   - **诗词名称**：如 "静夜思" 
   - **风格**：选择文章风格
   - **关键词**（可选）：如 "思乡、月夜"

2. 点击 **✨ 生成文章**

3. 系统将生成：
   - 📝 深度赏析文章（900+字）
   - 🎯 3个爆款标题供选择
   - 🖼️ 精美文字封面
   - 📱 优化微信排版

### 上传到微信
1. 点击 **📱 微信管理** 配置公众号信息
2. 输入 AppID 和 AppSecret
3. 测试连接成功后
4. 回到生成页面，点击 **🚀 上传微信**
5. 到微信公众平台查看草稿并发布

## 🛠️ 技术架构

### 后端服务
- `server.js` - 主服务器
- `services/ai-service.js` - AI服务集成
- `services/title-generator.js` - 标题生成
- `services/cover-generator.js` - 封面生成
- `services/wechat-service.js` - 微信集成
- `services/storage-service.js` - 本地存储
- `services/config-service.js` - 配置管理

### 前端应用
- `public/index.html` - 主页面
- `public/app.js` - 应用逻辑
- `public/styles.css` - 样式文件

### 数据存储
- `data/articles.json` - 文章存储
- `data/config.json` - 配置存储
- `data/stats.json` - 统计信息

## 🎨 生成效果

### 爆款标题示例
- "千古名篇！李白《静夜思》背后的深意，读懂的人都哭了"
- "震撼！李白的《静夜思》竟然隐藏着这样的秘密"
- "太美了！李白《静夜思》的真正含义，99%的人都理解错了"

### 文章结构
- 📖 诗词原文
- 🌟 创作背景
- 🎯 逐句赏析
- 🌸 艺术特色
- 👨‍🎨 作者简介
- 💭 情感主题
- 🎨 现代意义

### 封面风格
- 📜 经典风：古典雅致
- 🎨 现代风：简约清新
- 🌸 雅致风：淡雅精美
- 🌙 诗意风：渐变梦幻

## 📊 API接口

### 核心接口
- `POST /api/articles/generate` - 生成完整内容包
- `POST /api/titles/generate` - 单独生成标题
- `POST /api/covers/generate` - 单独生成封面
- `POST /api/wechat/upload` - 上传到微信

### 管理接口
- `GET /api/articles/history` - 获取历史文章
- `GET /api/stats` - 获取使用统计
- `GET /api/config` - 获取配置
- `GET /health` - 健康检查

## 🔧 高级配置

### AI服务切换
系统会自动选择可用的AI服务，优先级：
1. 通义千问（推荐）
2. OpenAI
3. DeepSeek
4. 本地模板（备用）

### 微信排版优化
- 自动调整字体和行间距
- 添加颜色和样式
- 优化标题层级
- 美化引用和强调

### 本地存储管理
- 自动保存所有生成内容
- 支持搜索和分页
- 自动清理旧数据（90天）
- 支持导出和备份

## 🐛 故障排除

### 常见问题
1. **AI生成失败**：检查API密钥配置，系统会自动降级到模板
2. **微信上传失败**：检查AppID/AppSecret和网络连接
3. **端口占用**：修改 `.env` 中的 PORT 配置
4. **依赖安装失败**：删除 `node_modules` 重新安装

### 日志查看
服务器日志会显示详细的执行过程和错误信息。

## 📈 性能优化

- ⚡ 并行生成：文章、标题、封面同时生成
- 🗄️ 本地缓存：避免重复API调用
- 📱 响应式：自适应不同设备
- 🛡️ 容错机制：多级降级保障

## 🚀 部署建议

### 生产环境
1. 使用 PM2 管理进程
2. 配置 Nginx 反向代理
3. 开启 HTTPS
4. 定期备份数据目录

### Docker 部署（可选）
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📄 许可证

MIT License - 可自由使用和修改

---

**💡 提示：** 首次使用建议先配置通义千问API，生成效果最佳！