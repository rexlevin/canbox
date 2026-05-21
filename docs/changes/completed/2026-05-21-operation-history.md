# operation-history

## 概述

为 Canbox 构建分级通知系统和操作历史记录功能，解决 ElMessage 通知置顶遮挡、视觉不醒目、无历史记录的问题。

## 核心设计

### 1. 存储模块：`modules/core/canboxDb.js`

基于 PouchDB 实现的独立数据库模块，与 APP 的 `db.js` 完全隔离。

- **存储路径**: `{canbox_user_data}/db/history/`
- **容量管理**: 默认 30 天 / 200M，支持配置和主动清理
- **数据结构**:
  ```javascript
  {
    _id: 'op_xxxxx',
    type: 'success' | 'error' | 'info' | 'warning',
    message: 'operationHistory.messages.xxx',  // i18n key
    params: { appName: 'xxx', size: '0 B' },    // i18n 参数
    module: 'appList' | 'settings' | 'update' | 'app' | 'repo',
    details: {},                                  // 扩展详情
    timestamp: 1700000000,
    createTime: '2026-05-20 15:29:39'
  }
  ```

### 2. 国际化支持

操作记录支持多语言切换，存储 i18n key 和参数，前端动态解析：

| 字段 | 说明 | 示例 |
|------|------|------|
| `message` | i18n key | `operationHistory.messages.appDataClearedSize` |
| `params` | 翻译参数 | `{ appName: "ImageBox", size: "0 B" }` |

**locale 配置**:
```javascript
// locales/zh-CN.json
"operationHistory": {
    "column": { "type": "类型", "module": "模块", "message": "操作内容" },
    "modules": { "app": "应用", "repo": "应用仓库" },
    "messages": {
        "appDataClearedSize": "应用 \"{appName}\" 数据已清理：{size}",
        "appDownloadSuccess": "应用 \"{appName}\" 下载成功：v{version}"
    }
}
```

### 3. 通知组件封装：`src/utils/notification.js`

统一封装 ElMessage 和 ElNotification 调用：

```javascript
notification.show({
  type: 'success',
  message: '操作成功',
  module: 'appList',
  details: {}
})
```

### 4. 通知使用规范

| 场景 | 组件 | 原因 |
|------|------|------|
| 操作结果反馈（成功/失败） | ElNotification | 右上角弹出，可手动关闭，带标题更醒目 |
| 长时间任务进度 | FileTaskPanel | 已有，支持进度条 |
| 需用户确认的操作 | ElMessageBox | 已有 |
| 非关键提示（info） | ElMessage | 可保留 |

### 5. 操作历史面板 UI

- **入口**: 左下角浮动图标（📋），可拖动，记忆位置
- **展开方式**: 点击图标 → 图标隐藏 → 弹层显示
- **弹层**: 占满窗口留一圈边距，使用 el-table 表格展示
- **表格列**: 日期(180px) | 类型(80px) | 模块(100px) | 操作内容(min-width 200px)
- **关闭**: 点击关闭按钮 → 弹层隐藏 → 图标恢复

### 6. 分页加载

- 初始加载 20 条记录
- 滚动到底部自动加载更多
- 支持 hasMore 状态控制

### 7. IPC 通信

新增主进程 IPC handler，供渲染进程调用 canboxDb：

| 操作 | IPC 通道 |
|------|----------|
| 写入记录 | canboxDb-put |
| 查询记录 | canboxDb-allDocs |
| 删除记录 | canboxDb-remove |
| 获取存储大小 | canboxDb-getSize |

## 验收标准

- [x] 通知组件可按类型（success/error/info/warning）正确显示
- [x] 操作记录持久化到 PouchDB，重启后可查询历史
- [x] 浮动图标可拖动并记忆位置
- [x] 弹层自适应窗口尺寸，关闭后图标恢复显示
- [x] 容量限制生效（30天/200M），支持手动清理
- [x] 替换现有 ElMessage 调用为新通知组件，符合规范
- [x] 操作历史面板使用 el-table 表格展示，列宽固定对齐
- [x] 支持多语言切换，旧记录显示正确翻译
- [x] 分页加载支持滚动加载更多

## 实施计划

- [x] 创建 `modules/core/canboxDb.js` 存储模块
- [x] 在 `modules/main/api.js` 新增 canboxDb IPC handler
- [x] 创建 `src/utils/notification.js` 通知组件封装
- [x] 创建 `src/components/OperationHistory.vue` 操作历史面板
- [x] 在 `CanBox.vue` 集成操作历史入口
- [x] 创建 `src/stores/operationHistoryStore.js` 状态管理
- [x] 更新类型定义和预加载脚本
- [x] 编写 `docs/notification-guidelines.md` 使用规范文档
- [x] 逐步替换各业务组件中的 ElMessage 调用
- [x] UI 优化：使用 el-table 替换 div 表格
- [x] 分页加载：初始 20 条，滚动加载更多
- [x] 多语言支持：存储 i18n key + params，前端动态解析
- [x] 修复 canboxDb.put 支持 params 字段
- [x] 表头多语言化（类型、模块、操作内容）
- [x] 添加 operationHistory.messages 翻译模板

## 已创建/修改的文件

| 文件 | 说明 |
|------|------|
| `modules/core/canboxDb.js` | 独立存储模块（支持 params 字段） |
| `modules/main/pathManager.js` | 添加 getCanboxDbPath |
| `modules/main/api.js` | 添加 canboxDb IPC handler |
| `modules/ipc/appManagerIpcHandler.js` | 应用操作记录写入（多语言支持） |
| `modules/ipc/repoIpcHandler.js` | 仓库操作记录写入（多语言支持） |
| `src/utils/notification.js` | 通知组件封装 |
| `src/components/OperationHistory.vue` | 操作历史面板（el-table + 多语言 + 分页） |
| `src/stores/operationHistoryStore.js` | 状态管理 |
| `src/components/CanBox.vue` | 集成入口 |
| `locales/zh-CN.json` | 中文国际化（添加 column、messages） |
| `locales/en-US.json` | 英文国际化（添加 column、messages） |
| `locales/index.js` | 翻译函数（支持 params 替换） |
| `types/canbox.d.ts` | 类型定义 |
| `preload.js` | API 暴露 |
| `docs/notification-guidelines.md` | 使用规范文档 |
