# store

使用electron-store进行数据存储

# db

canbox 使用 [pouchdb](https://pouchdb.com/) 作为本地存储库

pouchdb中文教程：[PouchDB 教程](https://www.w3ccoo.com/pouchdb/)

Canbox 为每个 APP 生成单独的 pouchdb 存储

## canbox.db.put(doc)

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

## canbox.db.bulkDocs(docs)

批量操作文档，支持新增、修改和删除。

- 参数
  1. `array` docs - 文档数组
- 应答 `array` - 每个文档的操作结果

### 功能说明

- **新增文档**：当文档没有 `_id` 或没有 `_rev` 时，canbox 会自动生成 `_id` 并插入新文档
- **修改文档**：当文档包含 `_id` 和 `_rev` 时，会更新现有文档
- **删除文档**：当文档包含 `_deleted: true` 参数时，会删除该文档（需要提供 `_id` 和 `_rev`）

### 新增文档示例

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    data: '第一个文档'
}, {
    _id: '002',
    data: '第二个文档'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 成功返回：
[
    { "ok": true, "id": "001", "rev": "1-xxx" },
    { "ok": true, "id": "002", "rev": "1-xxx" }
]
 */
```

### 修改文档示例

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    data: '第一个文档（已修改）',
    _rev: '1-xxx'
}, {
    _id: '002',
    data: '第二个文档（已修改）',
    _rev: '1-xxx'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 成功返回：
[
    { "ok": true, "id": "001", "rev": "2-xxx" },
    { "ok": true, "id": "002", "rev": "2-xxx" }
]
 */
```

### 删除文档示例

```javascript
canbox.db.bulkDocs([{
    _id: '001',
    _rev: '1-xxx',
    _deleted: true
}, {
    _id: '002',
    data: '保留这个文档'
}]).then(result => {
    console.info('result=', result);
}).catch(error => {
    console.error('error=', error);
});
/*
 * 成功返回（删除的文档也会返回 ok: true）：
[
    { "ok": true, "id": "001", "rev": "2-xxx" },
    { "ok": true, "id": "002", "rev": "1-xxx" }
]
 *
 * 失败：
"Document update conflict"
 */
```

### 混合操作示例

```javascript
canbox.db.bulkDocs([
    { _id: '001', data: '新增' },              // 新增
    { _id: '002', data: '修改', _rev: '1-xxx' }, // 修改
    { _id: '003', _rev: '1-xxx', _deleted: true } // 删除
]).then(result => {
    console.info('混合操作成功');
});
```

**注意**：canbox 会自动为新文档生成 `createTime`，为更新文档生成 `updateTime`。

## canbox.db.get(query)

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

## canbox.db.remove(doc)

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

## canbox.db.find(query)

使用 Mango 查询语法查询文档。

- 参数
  1. `object` query - 查询条件对象，支持 Mango 查询语法
- 应答 `object` - 包含 `docs` 数组的查询结果

### 基础查询示例

```javascript
// 查询所有 type 为 'hosts_entry' 的文档
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    }
}).then(result => {
    console.info('查询到的文档数量:', result.docs.length);
    console.info('文档列表:', result.docs);
}).catch(error => {
    console.error('查询失败:', error);
});
/*
 * 成功返回：
{
    "docs": [
        {
            "_id": "001",
            "_rev": "1-xxx",
            "type": "hosts_entry",
            "name": "配置1",
            "content": "192.168.1.1 example.com",
            "active": true,
            "createTime": "20241227100000"
        },
        {
            "_id": "002",
            "_rev": "1-xxx",
            "type": "hosts_entry",
            "name": "配置2",
            "content": "192.168.1.2 test.com",
            "active": false,
            "createTime": "20241227100100"
        }
    ]
}
 */
```

### 高级查询示例

```javascript
// 多条件查询
canbox.db.find({
    selector: {
        type: 'hosts_entry',
        active: true
    }
}).then(result => {
    console.info('激活的 hosts 配置:', result.docs);
});

// 排序
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    },
    sort: [{ createTime: 'desc' }]
}).then(result => {
    console.info('按创建时间倒序:', result.docs);
});

// 限制返回数量
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    },
    limit: 10
}).then(result => {
    console.info('前10条记录:', result.docs);
});

// 指定返回字段
canbox.db.find({
    selector: {
        type: 'hosts_entry'
    },
    fields: ['_id', 'name', 'active']
}).then(result => {
    console.info('只返回指定字段:', result.docs);
});
```

**注意**：`find` 方法使用 PouchDB 的 Mango 查询语法，支持复杂的查询条件、排序、分页等功能。

# window

## canbox.win.createWindow(options, params)

- 参数
  1. options: `object` 参考electron：BaseWindowsConstructorOptions
  2. params: `object` : `{url: '', title: '', devTools: true}`
     1. `url`: 窗口加载页面相对路径，或路由路径
     2. `title`: 窗口标题
     3. `devTools`: 是否开启devTools，默认 `false`
     4. `ecsClose`: 点击 `ecs` 关闭窗口，默认 `false`
- 应答：窗口的id编码

## canbox.win.notification(options)

- 参数
  - `options` : 参考electron：Notification
- 应答

```javascript
// 直接调用
canbox.win.notification({ title: 'canbox', body: 'hello world' });

// 如果需要处理已发送业务
canbox.win.notification({ title: 'canbox', body: 'hello world' })
    .then(() = > {
        console.info('通知已发送，这里是一些处理业务');
    });

// 当前api方法不会reject，但可以保留错误处理的逻辑
canbox.win.notification(options)
    .then(() => {
        console.log('通知已发送，这里是一些处理业务');
    })
    .catch((error) => {
        console.error('发送通知失败:', error);
    });
```

# dialog

直接的封装，没有做任何修建，请求参数和应答均可参见electron的 [`dialog`](https://www.electronjs.org/zh/docs/latest/api/dialog) 模块

## showOpenDialog

文件选择框

与 Electron `showOpenDialog` 一致

## showSaveDialog

文件保存框

与 Electron `showSaveDialog` 一致

## showMessageBox

消息框

与 Electron `showMessageBox` 一致

# 生命周期

## registerCloseCallback

注册窗口关闭时APP的回调函数

- 参数： `Function`

```javascript
// 注册窗口关闭时的回调函数
canbox.registerCloseCallback(() => {
    console.log('窗口即将关闭，执行清理操作...');
    // 在这里可以执行一些清理逻辑，例如保存数据或关闭资源
});

```
