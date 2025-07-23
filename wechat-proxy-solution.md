# 微信IP白名单问题解决方案

## 问题描述
Vercel等serverless平台IP动态变化，导致微信API调用频繁失败。

## 解决方案

### 方案1：使用固定IP代理服务

#### 1. 部署简单的代理服务器（推荐）
在有固定IP的VPS上部署以下代理：

```javascript
// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// 代理微信API请求
app.use('/cgi-bin', createProxyMiddleware({
  target: 'https://api.weixin.qq.com',
  changeOrigin: true,
  pathRewrite: {
    '^/cgi-bin': '/cgi-bin'
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('代理请求:', req.url);
  }
}));

app.listen(3000, () => {
  console.log('微信API代理服务启动: http://your-fixed-ip:3000');
});
```

#### 2. 在环境变量中配置代理
```bash
WECHAT_PROXY_URL=http://your-fixed-ip:3000
```

#### 3. 在白名单中只需添加VPS的固定IP

### 方案2：使用第三方代理服务

#### 可选的服务商：
- **ProxyMesh**: 提供固定IP的HTTP代理
- **Bright Data**: 专业代理服务
- **Storm Proxies**: 固定IP代理

### 方案3：扩大IP白名单范围

在微信公众平台添加Vercel/AWS常用IP段：
```
# AWS US-East-1 (Vercel主要使用)
34.192.0.0/10
52.0.0.0/11
54.80.0.0/13
```

### 方案4：迁移到支持固定IP的平台

考虑迁移到：
- **Railway**: 支持固定IP
- **Fly.io**: 支持固定IP
- **阿里云函数计算** + NAT网关
- **腾讯云函数** + NAT网关

## 推荐实施步骤

1. **短期解决**: 先扩大白名单IP范围
2. **长期解决**: 部署代理服务或迁移平台
3. **监控**: 添加IP变化监控和告警

## 成本对比

| 方案 | 月成本 | 稳定性 | 实施难度 |
|------|--------|--------|----------|
| 扩大白名单 | 免费 | 中等 | 简单 |
| VPS代理 | $5-10 | 高 | 中等 |
| 第三方代理 | $10-50 | 高 | 简单 |
| 迁移平台 | $10-20 | 高 | 复杂 |

建议先试试扩大白名单范围，如果还不稳定再考虑代理方案。