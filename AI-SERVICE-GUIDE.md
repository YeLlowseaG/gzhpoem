# AI服务使用指南

## 功能概述

项目已经集成了多个AI服务提供商，支持：
- 通义千问 (默认)
- OpenAI GPT
- DeepSeek

## 配置方法

### 1. 环境变量配置

复制 `env-example.txt` 为 `.env` 文件：
```bash
cp env-example.txt .env
```

编辑 `.env` 文件，填入你的API密钥：
```env
# 通义千问API配置
QWEN_API_KEY=sk-your-qwen-api-key

# OpenAI API配置
OPENAI_API_KEY=sk-your-openai-api-key

# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

### 2. 启动服务

```bash
npm start
```

## API接口

### 生成诗词赏析
```bash
POST /api/ai/generate
Content-Type: application/json

{
  "title": "静夜思",
  "author": "李白", 
  "content": "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
  "style": "通俗"
}
```

**参数说明：**
- `title`: 诗词标题（必填）
- `author`: 作者（必填）
- `content`: 诗词内容（选填，不填会自动补充）
- `style`: 写作风格，可选值：
  - `通俗`: 简单易懂，贴近大众
  - `文雅`: 典雅，引经据典
  - `情感`: 注重情感共鸣
  - `学术`: 严谨客观，深度分析

### 测试AI连接
```bash
GET /api/ai/test
```

### 切换AI服务
```bash
POST /api/ai/switch
Content-Type: application/json

{
  "provider": "openai"
}
```

**支持的provider值：**
- `qwen`: 通义千问
- `openai`: OpenAI GPT
- `deepseek`: DeepSeek

## 特色功能

### 1. 智能备用机制
- 当AI服务调用失败时，自动使用备用内容
- 确保服务的高可用性

### 2. 多样化风格
- 支持4种不同的写作风格
- 满足不同用户的需求

### 3. 完整的文章结构
生成的文章包含：
- 📖 诗词原文
- 🌟 创作背景
- 🎯 逐句赏析
- 🌸 艺术特色
- 👨‍🎨 作者简介
- 💭 情感主题
- 🎨 现代意义

### 4. 自动配图
- 自动添加封面图片
- 使用高质量的Unsplash图片

## 故障排除

### 1. API调用超时
- 检查网络连接
- 确认API密钥正确
- 尝试切换到其他AI服务

### 2. API密钥错误
- 检查环境变量配置
- 确认API密钥有效性
- 检查API配额是否用完

### 3. 服务无响应
- 检查服务器是否正常启动
- 查看控制台错误日志
- 重启服务

## 测试命令

```bash
# 测试AI连接
curl http://localhost:3001/api/ai/test

# 测试生成功能
curl -X POST http://localhost:3001/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "静夜思",
    "author": "李白",
    "style": "通俗"
  }'

# 切换AI服务
curl -X POST http://localhost:3001/api/ai/switch \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

## 注意事项

1. **API密钥安全**：不要将API密钥提交到代码仓库
2. **配额管理**：注意各个AI服务的调用配额
3. **网络要求**：确保网络可以访问AI服务API
4. **备用机制**：即使AI服务失败，系统也会返回备用内容 