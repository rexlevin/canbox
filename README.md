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

## DB

canbox 使用 [pouchdb](https://pouchdb.com/) 作为本地存储库

pouchdb中文教程：[PouchDB 教程](https://www.w3ccoo.com/pouchdb/)

### canbox.db.put(data)

- 参数
  1. `data`
- 应答 object

```javascript
const result = canbox.db.put({
    _id: '0001',
    boxes: '[{title:"json01",content:"hello lizl6"},{title:"json02",content:"hello world"}]'
});
console.info(result);
/*
 * 数据入库成功
{
    "code": "0000",
    "_id": "0001",
    "_rev": "1-ba9a81377a1991e5a693659ec7e238c2"
}
 *
 * 数据入库失败
{
    "code": "9100",
    "message": "Database operate, put error, Document update conflict"
}
*/
```

### canbox.db.get(query)

## 应答

```json
{
    code: '',
    message: '',
    data: object/array/string/int/boolean
}
```

| code | 释义                                                 |
| ---- | ---------------------------------------------------- |
| 0000 | 成功                                                 |
| 9100 | 数据操作异常、不成功                                 |
| 9200 | 文件/文件夹操作异常、不成功                          |
| 9201 | 文件夹删除失败                                       |
| 9202 | 文件读取失败，可能是因为文件不存在，具体查看 message |
