# WeRSS 微信公众号监控服务部署指南

WeRSS集成已完成，现在需要部署WeRSS服务来实现真实的微信公众号文章监控。

## 服务简介

WeRSS (we-mp-rss) 是一个开源的微信公众号RSS订阅服务，可以将微信公众号转换为RSS源。

- GitHub: https://github.com/rachelos/we-mp-rss
- 功能: 实时获取微信公众号最新文章
- API接口: RESTful API + RSS订阅

## 本地部署 WeRSS

### 方法1: Docker 部署 (推荐)

```bash
# 1. 克隆项目
git clone https://github.com/rachelos/we-mp-rss.git
cd we-mp-rss

# 2. 使用Docker运行
docker-compose up -d

# 3. 检查服务状态
curl http://localhost:8001/health
```

### 方法2: Python 直接运行

```bash
# 1. 克隆项目
git clone https://github.com/rachelos/we-mp-rss.git
cd we-mp-rss

# 2. 安装依赖
pip install -r requirements.txt

# 3. 运行服务
python app.py

# 服务将在 http://localhost:8001 启动
```

## 云服务器部署

### 使用 Vercel/Railway/Render

由于WeRSS是Python Flask应用，可以部署到支持Python的平台:

1. **Railway** (推荐)
   - Fork GitHub项目
   - 连接到Railway
   - 自动部署

2. **Render**
   - 导入GitHub仓库
   - 选择Python环境
   - 设置启动命令: `python app.py`

3. **自建VPS**
   ```bash
   # 在Ubuntu/CentOS服务器上
   sudo apt update
   sudo apt install python3 python3-pip
   git clone https://github.com/rachelos/we-mp-rss.git
   cd we-mp-rss
   pip3 install -r requirements.txt
   nohup python3 app.py &
   ```

## 配置集成

WeRSS服务启动后，需要在项目中配置服务地址:

### 修改 WeRSS 服务地址

编辑 `services/werss-service.js`:

```javascript
// 如果WeRSS部署在其他地址，修改此处
constructor(baseUrl = 'http://localhost:8001') {
    // 替换为你的WeRSS服务地址
    // 例如: 'https://your-werss-service.railway.app'
    this.baseUrl = baseUrl;
}
```

或者通过环境变量配置:

```bash
# 在 .env 文件中添加
WERSS_SERVICE_URL=https://your-werss-service.railway.app
```

## 使用方法

### 1. 添加微信公众号监控

在监控页面中:

1. 点击"添加监控"
2. 选择"手动添加"
3. 填写公众号信息
4. **监控链接**填写: `werss://公众号名称` 或 WeRSS API地址
5. 系统会自动识别为WeRSS类型

### 2. API调用示例

```javascript
// 检查WeRSS服务
const healthCheck = await weRSSService.checkService();

// 添加订阅
const result = await weRSSService.addSubscription('人民日报');

// 获取文章
const articles = await weRSSService.getSubscriptionArticles('人民日报', 10);
```

### 3. 支持的URL格式

系统会自动识别以下URL为WeRSS类型:
- 包含 `werss` 的URL
- 包含 `we-mp-rss` 的URL  
- 包含 `:8001` 的URL
- 格式: `werss://公众号名称`

## 故障排除

### 1. 连接失败
- 检查WeRSS服务是否正常运行
- 验证网络连接和防火墙设置
- 确认服务地址配置正确

### 2. 获取文章失败
- WeRSS服务可能需要一些时间来抓取文章
- 检查公众号名称是否正确
- 某些公众号可能有反爬虫机制

### 3. 服务不稳定
- WeRSS依赖微信的接口，可能会有限制
- 建议设置适当的请求间隔
- 监控服务状态并自动重启

## 环境变量配置

在 `.env` 文件中添加:

```bash
# WeRSS服务配置
WERSS_SERVICE_URL=http://localhost:8001
WERSS_REQUEST_TIMEOUT=15000
WERSS_RETRY_ATTEMPTS=3
```

## 注意事项

1. **合规使用**: 仅用于学习和个人监控，遵守微信服务条款
2. **频率限制**: 避免过于频繁的请求，建议每15分钟检查一次
3. **数据备份**: 重要的监控数据建议定期备份
4. **服务监控**: WeRSS服务建议配置监控和自动重启

## 技术支持

- WeRSS项目: https://github.com/rachelos/we-mp-rss
- 本项目集成代码: `services/werss-service.js`
- 前端识别逻辑: `public/monitor.js` 第392行

## 更新日志

- ✅ 完成WeRSS服务API封装
- ✅ 集成到监控系统
- ✅ 支持自动识别WeRSS链接
- ✅ 添加错误处理和重试机制
- ⏳ 等待WeRSS服务部署