# 打包

```bash
# 安装 electron-builder
npm i -g electron-builder

# 打包：
cd canbox
npm run build:win
```

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
    "platform": ["windows", "darwin", "linux"],
    "categories": ["development", "utility"],
    "tags": ["json", "jsonformatter"],
    "development": {
        "main": "index.html",
        "devTools": "detach"
    }
}
```

### 字段说明

| 字段       | 父节点 |  类型  | 约束 | 说明                                                                                                                                                    |
| ---------- | ------ | :----: | :--: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id         |        | string |  1  | app应用标识<br />1. 多段组成，如：`com.gitee.dev001.clipboard` <br />2. 每段都由小写字母和数字组成，且小写字母开头<br />3. 仅最后一段可以使用 - 符号 |
| window     |        | object |  1  | 同 Electron 中 BrowserWindow 参数                                                                                                                       |
| platform   |        | array |  *  | windows, darwin, linux<br />插件应用支持的平台，此为 `可选项`，默认为全平台支持                                                                       |
| categories |        | array |  *  | app分类，最多只取前两个                                                                                                                                 |
| tags       |        | array |  *  | app标签，用于app商城内搜索使用                                                                                                                          |

#### categories

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

## uat.dev.json

开发配置

```json
{
    "main": "http://localhost:5173/",
    "devTools": "detach"
}
```

字段说明：

| 字段     | 父节点      |  类型  | 约束 | 说明                                                  |
| -------- | ----------- | :----: | :--: | ----------------------------------------------------- |
| main     | development | string |  ?  | 开发环境下 `development.main` 配置会覆盖 `main`   |
| devTools | development | string |  ?  | 打开开发者工具，left, right, bottom, undocked, detach |

## preload.js

canbox开启了上下文隔离，想要使用canbox提供的api，需要在 app.json 中配置预加载脚本：

```json
"window": {
    "webPreferences": {
        "preload": "preload.js"
    }
}
```

在预加载脚本中使用canbox的api：

```javascript
# preload.js
canbox.hello();  # hello, hope you have a nice day
```

preload遵循 `CommonJS` 规范，可以使用 `require` 来引入 nodejs 模块：

## README.md

和 app.json 同级的 README.md 文件将会被解析为 app 信息在 canbox 展示

**图片地址使用网络url才能正确展示**

# API

## DB

canbox 使用 [pouchdb](https://pouchdb.com/) 作为本地存储库

pouchdb中文教程：[PouchDB 教程](https://www.w3ccoo.com/pouchdb/)

### canbox.db.put(doc)

新增/修改数据文档

**创建文档时，如果没有\_id，canbox会生成一个\_id最后在应答内容中返回给app**

想要修改文档，参数 `_rev` 使必须的

- 参数
  1. object
- 应答 object

```javascript
canbox.db.put({
    _id: '0001',
    boxes: '[{title:"json01",content:"hello lizl6"},{title:"json02",content:"hello world"}]'
}).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 数据入库成功
{
    id: "0001",
    ok: true,
    rev: "1-1e4db196bda552aeaf4c719d4f5f8e9e"
}
 *
 * 数据入库失败时，catch中的error信息：
"Document update conflict"
*/
```

修改文档：

```javascript
canbox.db.put({
    _id: '0001',
    boxes: '[{title:"json01",content:"hello lizl6"},{title:"json02",content:"hello world"}]',
    rev: "1-1e4db196bda552aeaf4c719d4f5f8e9e"
}).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 修改成功：
{ ok: true, id: '0001', rev: '2-d43f99e5e956bc1da667a5208320b43b' }
 */
```

### canbox.db.bulkDocs(docs)

- 参数
  1. `array` docs
- 应答 `array`

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    data: '这里是第一个节点的数据',
},{
    _id: '002',
    data: '这里是第二个节点的数据',
    _rev: '1-7b80fc50b6af7a905f368670429a757e'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 成功：
[
    {
        "ok": true,
        "id": "0001",
        "rev": "1-84abc2a942007bee7cf55007cba56198"
    },
    {
        "ok": true,
        "id": "0002",
        "rev": "2-7b80fc50b6af7a905f368670429a757e"
    }
]
 *
 * 失败的话：
"Document update conflict"
 */
```

### canbox.db.get(query)

- 参数
  1. `object`
- 应答 object

```javascript
canbox.db.get({
    _id: '0001'
}).then(result => {
    console.info('result:', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 成功获取数据，返回数据信息示例如下：
{
    "boxes": "[{title:\"json01\",content:\"hello lizl6\"},{title:\"json02\",content:\"hello world\"}]",
    "createTime": "20241212173838",
    "_id": "0001",
    "_rev": "1-1e4db196bda552aeaf4c719d4f5f8e9e"
}
 *
 * 没有获取到数据，catch中的error信息：
"missing"
*/
```

### canbox.db.remove(doc)

- 参数
  1. object 需要包含 `_id` 和 `_rev`
- 应答 object

```javascript
canbox.db.remove({
    _id: '0001',
    _rev: '1-1e4db196bda552aeaf4c719d4f5f8e9e'
}).then(result => {
    console.info('result:', result);
}).catch(error => {
    console.error('error=', error);
});

/**
 * 删除成功，返回result如下：
{
    "ok": true,
    "id": "0001",
    "rev": "2-7c2e19010a1048fd631bcc1ced9bf07d"
}
 *
 * 没有匹配到可删除的数据，catch中error信息：
"missing"
*/
```

## 应答码

| code | 释义                                                 |
| ---- | ---------------------------------------------------- |
| 0000 | 成功                                                 |
| 9100 | 数据操作异常、失败                                   |
| 9200 | 文件/文件夹操作异常、失败                            |
| 9201 | 文件夹删除失败                                       |
| 9202 | 文件读取失败，可能是因为文件不存在，具体查看 message |

# repos

canbox没有中心服务器，所有能使用的app都靠交流传播😆

repos文件就是app信息的集合，这是一个json格式的描述文件：

```json
{
    "title": "",
    "version": "",
    "repos": [
        {
            "app": "",
            "description": "",
            "history": "",
            "release": ""
        }
    ]
}
```
