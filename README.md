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
        "resizable": false
    },
    "categories": ["development", "utility"],
    "tags": ["json", "jsonformatter"]
}

```

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

## tags

非必填

app标签，用于app商城内搜索使用

# API
