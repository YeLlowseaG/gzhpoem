#!/usr/bin/env python3
"""
简单的HTTP服务器，用于提供静态文件和微信API代理
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import sys

# 通义千问API配置
QWEN_API_KEY = "sk-4b37b09662a44a90bb62a953d0f22aed"
QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"

PORT = 8080

class WechatProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.serve_file('index.html', 'text/html')
        elif self.path == '/health':
            self.send_json({'status': 'ok', 'message': '微信公众号代理服务器运行中'})
        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            self.send_error(400, "Invalid JSON")
            return

        if self.path == '/api/wechat/token':
            self.handle_get_token(data)
        elif self.path == '/api/wechat/upload-image-from-url':
            self.handle_upload_image(data)
        elif self.path == '/api/wechat/draft/add':
            self.handle_add_draft(data)
        elif self.path == '/api/ai/generate':
            self.handle_ai_generate(data)
        else:
            self.send_error(404)

    def handle_get_token(self, data):
        app_id = data.get('appId')
        app_secret = data.get('appSecret')
        
        if not app_id or not app_secret:
            self.send_json({'errcode': -1, 'errmsg': '缺少AppID或AppSecret'})
            return

        try:
            url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={app_id}&secret={app_secret}"
            
            with urllib.request.urlopen(url, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                self.send_json(result)
        except Exception as e:
            self.send_json({'errcode': -1, 'errmsg': f'请求失败: {str(e)}'})

    def handle_upload_image(self, data):
        # 模拟上传图片成功，返回模拟的media_id
        # 实际部署时需要真正下载和上传图片
        import time
        media_id = f"mock_media_id_{int(time.time())}"
        self.send_json({'media_id': media_id})

    def handle_add_draft(self, data):
        access_token = data.get('accessToken')
        articles = data.get('articles')
        
        if not access_token or not articles:
            self.send_json({'errcode': -1, 'errmsg': '缺少必要参数'})
            return

        try:
            url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}"
            post_data = json.dumps({'articles': articles}).encode('utf-8')
            
            req = urllib.request.Request(url, data=post_data, headers={'Content-Type': 'application/json'})
            
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                self.send_json(result)
        except Exception as e:
            self.send_json({'errcode': -1, 'errmsg': f'添加草稿失败: {str(e)}'})

    def handle_ai_generate(self, data):
        prompt = data.get('prompt')
        author = data.get('author')
        title = data.get('title')
        
        if not prompt or not author or not title:
            self.send_json({'success': False, 'error': '缺少必要参数'})
            return

        try:
            # 调用通义千问API
            request_data = {
                "model": "qwen-plus",
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                },
                "parameters": {
                    "result_format": "message"
                }
            }
            
            post_data = json.dumps(request_data).encode('utf-8')
            
            req = urllib.request.Request(
                QWEN_API_URL,
                data=post_data,
                headers={
                    'Authorization': f'Bearer {QWEN_API_KEY}',
                    'Content-Type': 'application/json'
                }
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                
                if result.get('output') and result['output'].get('choices'):
                    content = result['output']['choices'][0]['message']['content']
                    # 添加封面图片
                    content_with_cover = f"![封面图片](https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop)\n\n{content}"
                    
                    self.send_json({'success': True, 'content': content_with_cover})
                else:
                    self.send_json({'success': False, 'error': '生成内容失败'})
                    
        except Exception as e:
            print(f"AI生成错误: {str(e)}")
            # 如果API调用失败，返回基础模板
            fallback_content = self.generate_fallback_content(author, title)
            self.send_json({'success': True, 'content': fallback_content})

    def generate_fallback_content(self, author, title):
        return f"""# 千古绝唱！{author}《{title}》背后的深意，读懂的人都哭了

![封面图片](https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop)

当我们谈论中国古典诗词的璀璨明珠时，{author}的《{title}》无疑是其中最耀眼的一颗。这首诗不仅仅是文字的组合，更是情感的结晶，是中华文化的瑰宝。今天，让我们一起走进这首诗的世界，感受其中蕴含的深刻内涵。

## 📖 诗词原文

**《{title}》**  
*{author}*

（此处应插入具体诗词内容）

## 🌟 创作背景与时代意义

{author}创作《{title}》的时代背景极为重要。当时的社会环境、政治氛围以及诗人的个人经历，都深深影响着这首诗的创作。通过了解这些背景，我们能够更好地理解诗人的内心世界和创作动机。

这首诗诞生于一个特殊的历史时期，那时的文人墨客们面临着种种人生际遇。{author}作为其中的佼佼者，用他独特的视角和深刻的洞察力，为我们留下了这样一首传世佳作。

![配图1](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop)

## 🎯 逐句深度赏析

每一句诗都是诗人情感的体现，每一个字都承载着深刻的含义。让我们逐句来品味这首诗的精妙之处：

**第一句的妙处在于**其开门见山的表达方式，直接将读者带入到诗人所营造的意境之中。这种写法看似简单，实则蕴含着高超的艺术技巧。

**第二句则进一步深化了主题**，通过具体的意象描绘，让抽象的情感变得具体可感。这种由浅入深的表达方式，正是古典诗词的魅力所在。

## 🌸 重点词语与意象解析

在这首诗中，几个关键词语的运用尤为精妙，它们不仅仅是简单的景物描写，更是情感的载体和精神的寄托。

## 👨‍🎨 诗人生平与创作风格

{author}作为中国古代文学史上的重要人物，其生平经历和创作风格都值得我们深入了解。他的诗歌创作不仅数量丰富，而且质量上乘，在文学史上占有重要地位。

![配图2](https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop)

## 🎨 艺术手法与表现技巧

这首诗在艺术表现上有许多值得我们学习和欣赏的地方：

**1. 意境营造**：诗人通过精心选择的意象和巧妙的组合，营造出了一个独特的艺术境界。

**2. 语言运用**：诗中的每一个字都经过精心推敲，既保持了语言的优美，又确保了意思的准确传达。

**3. 情感表达**：诗人通过含蓄而深刻的表达方式，将复杂的情感融入到简洁的诗句中。

## 💭 情感主题与现代意义

《{title}》所表达的情感主题具有永恒的价值，它不仅仅属于那个时代，更属于我们每一个人。在现代社会中，这首诗仍然能够引起我们的共鸣，给我们以启发和思考。

![配图3](https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=600&h=400&fit=crop)

## 结语

{author}的《{title}》是一首永远读不厌的诗，每一次重读都会有新的感悟和收获。它像一面镜子，映照着我们的内心世界；它像一位老师，教导着我们人生的道理。

让我们在繁忙的现代生活中，偶尔停下脚步，重温这些经典之作，让古典诗词的美好继续滋养我们的心灵。

---

*如果这篇文章让你有所感悟，请点赞转发，让更多人感受到古典诗词的魅力！*

**关注「最美诗词」，每天为你推送最美的诗词赏析！**"""

    def serve_file(self, filename, content_type):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Content-Length', len(content.encode('utf-8')))
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404)

    def send_json(self, data):
        json_data = json.dumps(data, ensure_ascii=False)
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', len(json_data.encode('utf-8')))
        self.end_headers()
        self.wfile.write(json_data.encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def main():
    # 切换到脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    with socketserver.TCPServer(("", PORT), WechatProxyHandler) as httpd:
        print(f"🚀 微信公众号代理服务器运行在 http://localhost:{PORT}")
        print(f"📱 请在浏览器中访问 http://localhost:{PORT} 使用诗词生成器")
        print("按 Ctrl+C 停止服务器")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")

if __name__ == "__main__":
    main()