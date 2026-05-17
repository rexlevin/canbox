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
    message: '操作结果描述',
    timestamp: 1700000000,
    module: 'appList' | 'settings' | 'update' | ...,
    details: {}
  }
  ```

### 2. 通知组件封装：`src/utils/notification.js`

统一封装 ElMessage 和 ElNotification 调用：

```javascript
notification.show({
  type: 'success',
  message: '操作成功',
  module: 'appList',
  details: {}
})
```

### 3. 通知使用规范

| 场景 | 组件 | 原因 |
|------|------|------|
| 操作结果反馈（成功/失败） | ElNotification | 右上角弹出，可手动关闭，带标题更醒目 |
| 长时间任务进度 | FileTaskPanel | 已有，支持进度条 |
| 需用户确认的操作 | ElMessageBox | 已有 |
| 非关键提示（info） | ElMessage | 可保留 |

### 4. 操作历史面板 UI

- **入口**: 左下角浮动图标（📋），可拖动，记忆位置
- **展开方式**: 点击图标 → 图标隐藏 → 弹层显示
- **弹层**: 占满窗口留一圈边距，右上角有关闭按钮
- **关闭**: 点击关闭按钮 → 弹层隐藏 → 图标恢复

### 5. IPC 通信

新增主进程 IPC handler，供渲染进程调用 canboxDb：

| 操作 | IPC 通道 |
|------|----------|
| 写入记录 | canboxDb-put |
| 查询记录 | canboxDb-find |
| 删除记录 | canboxDb-remove |
| 获取存储大小 | canboxDb-info |

## 验收标准

- [ ] 通知组件可按类型（success/error/info/warning）正确显示
- [ ] 操作记录持久化到 PouchDB，重启后可查询历史
- [ ] 浮动图标可拖动并记忆位置
- [ ] 弹层自适应窗口尺寸，关闭后图标恢复显示
- [ ] 容量限制生效（30天/200M），支持手动清理
- [x] 替换现有 ElMessage 调用为新通知组件，符合规范

## 实施计划

- [x] 创建 `modules/core/canboxDb.js` 存储模块
- [x] 在 `modules/main/api.js` 新增 canboxDb IPC handler
- [x] 创建 `src/utils/notification.js` 通知组件封装
- [x] 创建 `src/components/OperationHistory.vue` 操作历史面板
- [x] 在 `CanBox.vue` 集成操作历史入口
- [x] 创建 `src/stores/operationHistoryStore.js` 状态管理
- [x] 更新类型定义和预加载脚本
- [ ] 编写 `docs/notification-guidelines.md` 使用规范文档
- [ ] 逐步替换各业务组件中的 ElMessage 调用

## 已创建/修改的文件

| 文件 | 说明 |
|------|------|
| `modules/core/canboxDb.js` | 独立存储模块 |
| `modules/main/pathManager.js` | 添加 getCanboxDbPath |
| `modules/main/api.js` | 添加 canboxDb IPC handler |
| `src/utils/notification.js` | 通知组件封装 |
| `src/components/OperationHistory.vue` | 操作历史面板 |
| `src/stores/operationHistoryStore.js` | 状态管理 |
| `src/components/CanBox.vue` | 集成入口 |
| `locales/zh-CN.json` | 中文国际化 |
| `locales/en-US.json` | 英文国际化 |
| `types/canbox.d.ts` | 类型定义 |
| `preload.js` | API 暴露 |
