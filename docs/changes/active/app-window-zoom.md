# app-window-zoom

## 概述

为所有 APP 窗口（webapp 和普通 APP）提供缩放能力，支持 Ctrl+鼠标滚轮 和 Ctrl++/Ctrl+-/Ctrl+0 快捷键。通过 `app.json` 的 `window.zoomEnabled` 字段控制开启/关闭，默认开启。

## 核心设计

### 1. 缩放参数（与 Canbox 主窗口一致）

| 参数 | 值 |
|------|-----|
| 缩放步进 | 0.1 |
| 缩放范围 | 0.5 ~ 2.0 |
| Ctrl+0 | 重置到 1.0 |

### 2. 快捷键

| 操作 | 快捷键 |
|------|--------|
| 放大 | Ctrl++ / Ctrl+= |
| 缩小 | Ctrl+- |
| 重置 | Ctrl+0 |
| 滚轮缩放 | Ctrl+鼠标滚轮（上滚+0.1，下滚-0.1） |

### 3. app.json 配置开关

位置：`window.zoomEnabled`，类型 `boolean`，默认 `true`。

```json
{
    "window": {
        "zoomEnabled": false,
        "width": 1280,
        "height": 800
    }
}
```

设为 `false` 时 APP 窗口不启用任何缩放能力。

### 4. 实现方式

注入自包含脚本（方案 1）：
- 在 `did-finish-load` 时通过 `webContents.executeJavaScript` 注入缩放脚本
- 脚本自行监听 keydown 和 wheel 事件，使用 CSS `zoom` 实现缩放
- 零 IPC 依赖，零 preload 修改，适用于 webapp 和普通 APP

### 5. 影响范围

- **新建** `modules/web-app/app-zoom.js`：封装 `setupAppZoom(appWin, enableZoom)` 函数
- **修改** `modules/integrated/appWindowManager.js`：解析 `zoomEnabled` 配置，调用 `setupAppZoom`
- **修改** `childprocessEntry.js`：同上
- **修改** `docs/development/APP_DEV.md` 和 `APP_DEV_CN.md`：新增 `zoomEnabled` 字段说明

## 验收标准

- [ ] Ctrl+滚轮 / Ctrl++ / Ctrl+- / Ctrl+0 在所有 APP 窗口中正常工作
- [ ] 缩放步进为 0.1，范围 0.5~2.0，Ctrl+0 重置到 1.0
- [ ] `app.json` 设置 `window.zoomEnabled: false` 后快捷键和滚轮均不生效
- [ ] `app.json` 不设置 `zoomEnabled` 时默认启用缩放
- [ ] 普通 APP（本地 HTML）和 webapp（外部 URL）均正常工作
- [ ] 文档更新完整（中英文 APP_DEV 文档）

## 实施计划

- [ ] 新建 `modules/web-app/app-zoom.js`，实现 `setupAppZoom(appWin, enableZoom)` 函数
- [ ] 修改 `modules/integrated/appWindowManager.js`：读取 `appJson.window.zoomEnabled`（默认 `true`），调用 `setupAppZoom`
- [ ] 修改 `childprocessEntry.js`：同上
- [ ] 更新 `docs/development/APP_DEV.md`：添加 `zoomEnabled` 字段说明
- [ ] 更新 `docs/development/APP_DEV_CN.md`：同上
