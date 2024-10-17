# 插件开发

## app.json

```json
{
    "name": "剪贴板",
    "description": "一个好用的剪贴板",
    "author": "dev001",
    "homepage": "https://gitee.com/dev001/clipboard",
    "main": "index.html",
    "logo": "logo.png",
    "version": "0.0.6",
    "window": {
        "minWidth": 800,
        "minHeight": 400,
        "width": 900,
        "height": 500,
        "resizable": false,
        "preload": "preload.js",
        "devTools": "detach"
    },
    "platform": ["win32", "darwin", "linux"]
    "categories": ["development", "utility"],
    "tags": ["json", "jsonformatter"]
}

```

### platform

win32, darwin, linux

插件应用支持的平台，此为 `可选项`，默认为全平台支持

### devTools

left, right, bottom, undocked, detach

### categories

app分类，最多只取前两个

| key         | 说明          |
| ----------- | ------------- |
| education   | 教育app       |
| office      | 办公          |
| audio       | 音频app       |
| video       | 视频app       |
| game        | 游戏app       |
| utility     | 工具          |
| development | 开发者工具app |
| graphics    | 图形应用app   |
| network     | 网络应用程序  |

### tags

非必填

app标签，用于app商城内搜索使用

# README.md

和 app.json 同级的 README.md 文件将会被解析为 app 信息在 canbox 展示

**图片地址使用网络url才能正确展示**

# API
