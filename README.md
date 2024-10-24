# 插件开发

## app.json

```json
{
    "name": "剪贴板",
    "id": "com.gitee.dev001.clipboard",
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
        "icon": "logo.png",
        "resizable": false,
        "webPreferences": {
            "preload": "preload.js"
        }
    },
    "platform": ["win32", "darwin", "linux"]
    "categories": ["development", "utility"],
    "tags": ["json", "jsonformatter"],
    "development": {
        "main": "index.html",
        "devTools": "detach"
    }
}

```

### id

app 应用标识

1. 使用多段标识，如： `com.gitee.dev001.clipboard`
2. 数字与字母构成，字母全小写
3. 仅最后一段可以使用 `-` 符号

### window

同 Electron 中 BrowserWindow 参数

### platform

win32, darwin, linux

插件应用支持的平台，此为 `可选项`，默认为全平台支持

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

### development

开发环境配置

main：开发环境下 `development.main` 配置会覆盖 `main`

devTools：打开开发者工具，left, right, bottom, undocked, detach

# README.md

和 app.json 同级的 README.md 文件将会被解析为 app 信息在 canbox 展示

**图片地址使用网络url才能正确展示**

# API
