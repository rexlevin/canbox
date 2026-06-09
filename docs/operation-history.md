# 操作历史 (Operation History)

## 概述

操作历史模块为 Canbox 提供统一的通知反馈和历史记录功能，解决 ElMessage 通知易被遮挡、无历史追溯的问题。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Renderer 进程                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ 业务组件     │  │ 通知组件     │  │ 操作历史面板     │ │
│  │ (AppManager) │  │(notification)│  │(OperationHistory)│ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │           │
│         └────────────┬─────┴────────────────────┘           │
│                      ▼                                      │
│              window.api.canboxDb                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ IPC (ipcRenderer.invoke)
┌──────────────────────▼──────────────────────────────────────┐
│                      Main 进程                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               ipcHandlers.js (canboxDb handlers)             │ │
│  │                    canboxDb IPC Handler                 │ │
│  └──────────────────────────┬─────────────────────────────┘ │
│                             ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              modules/canbox/core/canboxDb.js               │ │
│  │                     PouchDB                             │ │
│  └──────────────────────────┬─────────────────────────────┘ │
│                             ▼                                │
│              {canbox_user_data}/db/history/                 │
└─────────────────────────────────────────────────────────────┘
```

## 数据结构

### 操作记录 (Operation Record)

```javascript
{
  _id: 'op_4bdfa7836d',           // 唯一标识（自动生成）
  _rev: '1-xxx',                  // PouchDB 版本
  type: 'success',                // 类型：success | error | warning | info
  message: 'operationHistory.messages.appDataClearedSize', // i18n key
  params: {                       // i18n 参数
    appName: 'ImageBox',
    size: '0 B'
  },
  module: 'app',                  // 来源模块
  details: {                      // 扩展详情（用于调试/扩展）
    appId: 'xxx',
    clearedSize: 0
  },
  timestamp: 1779263083326,       // 时间戳
  createTime: '2026-05-20 15:29:39' // 创建时间
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 是 | 唯一标识，自动生成 |
| `type` | string | 是 | 类型：success/error/warning/info |
| `message` | string | 是 | i18n key 或直接文本 |
| `params` | object | 否 | i18n 翻译参数 |
| `module` | string | 否 | 来源模块 |
| `details` | object | 否 | 扩展详情 |
| `timestamp` | number | 是 | Unix 时间戳（毫秒） |

## 模块说明

### 1. canboxDb (`modules/canbox/core/canboxDb.js`)

数据库操作模块，基于 PouchDB：

| 方法 | 说明 |
|------|------|
| `put(doc)` | 写入记录 |
| `get(id)` | 获取单条记录 |
| `allDocs(options)` | 查询所有记录（支持 skip/limit 分页） |
| `remove(param)` | 删除记录 |
| `bulkRemove(docs)` | 批量删除 |
| `getSize()` | 获取存储大小 |

### 2. IPC Handler (`ipcHandlers.js`)

暴露给渲染进程的接口：

```javascript
// 渲染进程调用
await window.api.canboxDb.put({ type, message, params, module, details });
await window.api.canboxDb.allDocs({ limit: 20, skip: 0 });
await window.api.canboxDb.remove({ _id, _rev });
await window.api.canboxDb.getSize();
```

### 3. 业务写入 (`modules/canbox/ipc/`)

| 文件 | 写入场景 |
|------|----------|
| `appManagerIpcHandler.js` | 应用删除、移除、清理数据 |
| `repoIpcHandler.js` | 应用下载成功 |

**写入示例**：
```javascript
canboxDb.put({
    type: 'info',
    message: 'operationHistory.messages.appDataClearedSize',
    params: { appName: appName, size: formatSize(clearedSize) },
    module: 'app',
    details: { appId: id, clearedSize, clearedSizeStr }
});
```

### 4. 前端展示 (`src/components/OperationHistory.vue`)

操作历史面板组件：

- **浮动图标**: 左下角可拖动图标，未读计数显示
- **弹层面板**: 全屏遮罩 + 表格展示
- **表格列**: 日期 | 类型 | 模块 | 操作内容

**消息解析逻辑**：
```javascript
function resolveMessage(record) {
    const key = record.message;
    const params = record.params || {};
    if (key && key.includes('.')) {
        const translated = t(key, params);
        if (translated === key) {
            return formatFallbackMessage(record);
        }
        return translated;
    }
    return key || '';
}
```

## 国际化 (i18n)

### 翻译模板

```javascript
"operationHistory": {
    "title": "操作历史",
    "column": {
        "type": "类型",
        "module": "模块", 
        "message": "操作内容"
    },
    "modules": {
        "app": "应用",
        "repo": "应用仓库"
    },
    "messages": {
        "appRemoved": "应用 \"{appName}\" 已移除",
        "appDeleted": "应用 \"{appName}\" 已删除",
        "appDeletedWithData": "应用 \"{appName}\" 已删除：含用户数据",
        "appDataClearedSize": "应用 \"{appName}\" 数据已清理：{size}",
        "appDownloadSuccess": "应用 \"{appName}\" 下载成功：v{version}",
        "appInstallSuccess": "应用 \"{appName}\" 安装成功"
    }
}
```

### 多语言切换

切换语言后，操作历史面板会重新解析 i18n key，显示对应语言文本。

## 存储路径

```
{canbox_user_data}/
└── db/
    └── history/
        └── db.couch   # PouchDB 数据文件
```

默认 `{canbox_user_data}` 为 `~/.config/canbox/`，可在设置中自定义。

## 相关文档

- [通知使用规范](./notification-guidelines.md)
- [变更记录](../changes/active/operation-history.md)
