#!/bin/bash

echo "🚀 启动最美诗词生成器..."
echo "📱 请在浏览器中访问 http://localhost:8080"
echo "按 Ctrl+C 停止服务器"
echo ""

cd "$(dirname "$0")"
python3 simple-server.py