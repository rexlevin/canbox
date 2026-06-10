# app-global-shortcut

## 概述

为 Canbox APP 运行时提供全局快捷键注册/注销 API，使 APP 开发者可以通过 `window.canbox.shortcut` 注册系统级快捷键。Canbox 主进程负责与 Electron `globalShortcut` 模块交互，并维护 `accelerator → appId` 的持久化映射关系。

## 核心设计

### 1. 映射持久化，非 callback 持久化

`register()` 只注册 `accelerator → appId` 映射到 `canbox.json`，不存储回调函数。APP 每次启动通过 `onTriggered()` 监听快捷键触发事件。

**对比**：

| 方案 | 描述 | 结论 |
|------|------|------|
| ❌ 参考 `registerCloseCallback` | 回调存储在 preload 闭包内，APP 重启后丢失 | 不可行 |
| ✅ 持久化映射 + 事件驱动 | 映射存 JSON，触发时主进程发 IPC 事件 | **采纳** |

```
APP 启动 → canbox.shortcut.register('Alt+Space', { mode: 'callback' })  // 只需调用一次
APP 关闭 → 映射保留在 canbox.json
Canbox 重启 → globalShortcutManager 从 JSON 恢复所有快捷键
APP 再次启动 → canbox.shortcut.onTriggered(callback)  // 只需设置事件监听
```

### 2. 两种触发模式

| 模式 | `mode` 值 | 行为 | 适用场景 |
|------|-----------|------|----------|
| 聚焦模式 | `'focus'` | 主进程聚焦/启动 APP 窗口 | 快速切换类 APP |
| 事件模式 | `'callback'` | 主进程发 `shortcut-triggered` IPC 事件 | 工具类 APP（截图、语音输入等） |

默认模式为 `'focus'`。

### 3. 冲突检测与错误返回

```typescript
// 注册成功
{ success: true }

// 被已安装 APP 占用（映射表中存在）
{ success: false, reason: 'occupied', occupiedBy: 'APP名称' }

// 系统或其他应用占用（Electron globalShortcut 注册失败）
{ success: false, reason: 'system-occupied' }
```

`occupiedBy` 返回的 APP 名称从 `appManager.getAppInfo(appId).name` 获取。

### 4. 数据持久化

复用 `canbox.json`（`getCanboxStore()`），在根级别新增 `globalShortcuts` 字段：

```json
{
    "windowBounds": { ... },
    "isMaximized": false,
    "globalShortcuts": {
        "Alt+Space": {
            "appId": "com.github.dev001.clipboard",
            "mode": "callback",
            "registeredAt": "2026-06-11T05:30:00.000Z"
        }
    }
}
```

选择 `canbox.json` 而非独立文件的原因：
- 与现有 storage 模式一致（`getCanboxStore()` 已封装路径逻辑）
- 映射数据量小（每个 APP 通常只注册 1-2 个快捷键）
- 避免引入新的 store 实例

### 5. API 设计

```typescript
// 注册全局快捷键
canbox.shortcut.register(accelerator: string, options?: {
    mode?: 'focus' | 'callback'  // 默认 'focus'
}): Promise<{
    success: boolean
    reason?: 'occupied' | 'system-occupied'
    occupiedBy?: string
}>

// 注销全局快捷键
canbox.shortcut.unregister(accelerator: string): Promise<{ success: boolean }>

// 查询指定快捷键是否已注册
canbox.shortcut.isRegistered(accelerator: string): Promise<boolean>

// 监听快捷键触发事件（callback 模式）
canbox.shortcut.onTriggered(callback: (accelerator: string) => void): void
```

### 6. 架构分层

```
┌────────────────────────────────────────────┐
│              APP 渲染进程                  │
│  window.canbox.shortcut.register/          │
│  unregister/isRegistered/onTriggered       │
└──────────────┬─────────────────────────────┘
               │ ipcRenderer.invoke
               ↓
┌────────────────────────────────────────────┐
│        modules/app/app.preload.js          │
│  封装 API → IPC 通信                      │
│  维护 onTriggered 回调                    │
└──────────────┬─────────────────────────────┘
               │ IPC
               ↓
┌────────────────────────────────────────────┐
│          modules/app/api.js                │
│  ipcMain.handle('shortcut-register')       │
│  ipcMain.handle('shortcut-unregister')     │
│  ipcMain.handle('shortcut-isRegistered')   │
└──────────────┬─────────────────────────────┘
               │ 调用
               ↓
┌────────────────────────────────────────────┐
│  modules/canbox/main/                      │
│  globalShortcutManager.js                  │
│  - 调用 Electron globalShortcut 模块       │
│  - 维护 accelerator → appId 内存映射       │
│  - 持久化到 canbox.json                   │
│  - 启动时恢复所有快捷键                    │
│  - 触发时查找 APP + 发送事件              │
└────────────────────────────────────────────┘
```

### 7. 窗口查找与聚焦

`focus` 模式触发时，主进程需要找到目标 APP 的 BrowserWindow 并聚焦：
- 通过 `executionDispatcher` 或类似机制查找 appId 对应的窗口
- 如果窗口不存在，启动 APP（调用 `appLoader.loadApp(appId)`）
- 如果窗口存在但隐藏/最小化，恢复并聚焦

### 8. 生命周期管理

| 事件 | 操作 |
|------|------|
| Canbox 启动（`app.whenReady()`） | `globalShortcutManager.restoreAll()` 恢复 JSON 中所有快捷键 |
| APP 卸载 | 需要清除该 APP 注册的所有快捷键（通过 `appManagerIpcHandler` 或 `globalShortcutManager` 提供 `unregisterAll(appId)` 方法） |
| Canbox 退出（`before-quit`） | `globalShortcut.unregisterAll()` 注销所有快捷键（Electron 推荐做法） |

### 9. 平台标注策略

- 当前开发环境为 **linux (x11)**，标注 `@platforms linux (x11)`
- 后续在 Windows/macOS 验证后更新标注
- 同时给所有已有 `window.canbox` API 补充 `@platforms linux, windows` 标注

## 验收标准

- [ ] APP 调用 `canbox.shortcut.register('Alt+Space')` 后，在系统级别按下 `Alt+Space` 能触发 APP 窗口聚焦
- [ ] 注册已被其他 APP 占用的快捷键时，返回 `{ success: false, reason: 'occupied', occupiedBy: 'xxx' }`
- [ ] 注册系统占用的快捷键时，返回 `{ success: false, reason: 'system-occupied' }`
- [ ] Canbox 重启后，之前注册的全局快捷键仍然有效（从 `canbox.json` 恢复）
- [ ] APP 卸载时，对应快捷键被清理，不再触发
- [ ] `callback` 模式下快捷键触发时，APP 渲染进程的 `onTriggered` 回调被正确调用
- [ ] Canbox 退出时所有全局快捷键被正确注销（`globalShortcut.unregisterAll()`）
- [ ] 现有 APP API 功能不受影响（回归测试：db、store、win、sudo、dialog、registerCloseCallback、getLocale、openUrl）
- [ ] `canbox.d.ts` 和 API 文档新增 `shortcut` 模块类型定义，已有 API 补充平台标注

## 实施参考

### 涉及文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `modules/canbox/main/globalShortcutManager.js` | 新建 | 全局快捷键管理器（核心模块） |
| `modules/app/api.js` | 修改 | 新增 `initShortcutIpcHandlers()` |
| `modules/app/app.preload.js` | 修改 | 暴露 `window.canbox.shortcut` API |
| `main.js` | 修改 | 启动时恢复快捷键、退出时注销 |
| `types/canbox.d.ts` | 修改 | 新增 `shortcut` 类型 + 全部 API 补充 `@platforms` |
| `docs/development/API.md` | 修改 | 新增 `# globalShortcut` 章节 + 各模块补充平台标注 |
| `docs/development/API_CN.md` | 修改 | 同上（中文版） |
| `modules/canbox/main/storageManager.js` | 不修改 | 复用现有 `getCanboxStore()` |
| `.codebuddy/rules/project-info.md` | 修改 | 更新模块统计（+1 文件） |

### 代码模式参考

#### 模式 1：IPC Handler 注册（参照 `modules/app/api.js`）

参照现有 `initSudoIpcHandlers()` 模式，使用 `ipcMain.handle` 注册异步 handler：

```javascript
// 参照：modules/app/api.js 第 162-178 行 initSudoIpcHandlers()
function initShortcutIpcHandlers() {
    const globalShortcutManager = require('@modules/canbox/main/globalShortcutManager');
    const instance = globalShortcutManager.getInstance();

    ipcMain.handle('shortcut-register', async (event, args) => {
        try {
            const result = await instance.register(args.accelerator, args.appId, args.options);
            return { success: true, data: result };
        } catch (error) {
            logger.error('[api.js] shortcut-register failed:', error.message);
            return { success: false, msg: error.message };
        }
    });

    ipcMain.handle('shortcut-unregister', async (event, args) => {
        try {
            const result = await instance.unregister(args.accelerator, args.appId);
            return { success: true, data: result };
        } catch (error) {
            logger.error('[api.js] shortcut-unregister failed:', error.message);
            return { success: false, msg: error.message };
        }
    });

    ipcMain.handle('shortcut-isRegistered', async (event, args) => {
        try {
            const result = instance.isRegistered(args.accelerator, args.appId);
            return { success: true, data: result };
        } catch (error) {
            logger.error('[api.js] shortcut-isRegistered failed:', error.message);
            return { success: false, msg: error.message };
        }
    });
}
```

在 `initApiIpcHandlers()` 末尾调用 `initShortcutIpcHandlers()`。

#### 模式 2：Preload API 暴露（参照 `modules/app/app.preload.js`）

参照现有 `registerCloseCallback` 和 `electronStore` 的混合模式：

```javascript
// 参照：modules/app/app.preload.js 第 3-23 行 registerCloseCallback
// + 第 339-391 行 electronStore (ipcRenderer.invoke 异步模式)

let __onShortcutTriggered = null;

const shortcut = {
    register: (accelerator, options = {}) => {
        if (!window.appId) throw new Error('appId is not set');
        return ipcRenderer.invoke('shortcut-register', {
            accelerator,
            options,
            appId: window.appId
        });
    },
    unregister: (accelerator) => {
        if (!window.appId) throw new Error('appId is not set');
        return ipcRenderer.invoke('shortcut-unregister', {
            accelerator,
            appId: window.appId
        });
    },
    isRegistered: (accelerator) => {
        if (!window.appId) throw new Error('appId is not set');
        return ipcRenderer.invoke('shortcut-isRegistered', {
            accelerator,
            appId: window.appId
        });
    },
    onTriggered: (callback) => {
        __onShortcutTriggered = callback;
    }
};

// 监听主进程发送的快捷键触发事件
ipcRenderer.on('shortcut-triggered', (event, accelerator) => {
    if (__onShortcutTriggered) {
        try {
            __onShortcutTriggered(accelerator);
        } catch (e) {
            console.error('Error executing shortcut callback:', e);
        }
    }
});
```

在 `window.canbox` 对象中新增 `shortcut` 属性。

#### 模式 3：Storage 持久化（参照 `main.js` 和 `storageManager.js`）

参照 `main.js` 中对 `getCanboxStore()` 的使用：

```javascript
// 参照：main.js 第 75-91 行 saveWindowState()
const { getCanboxStore } = require('@modules/canbox/main/storageManager');
const canboxStore = getCanboxStore();

// 读取
const shortcuts = canboxStore.get('globalShortcuts', {});

// 写入
canboxStore.set('globalShortcuts', shortcuts);
```

#### 模式 4：单例模式（参照 `file-task-manager.js`）

```javascript
// 参照：modules/canbox/file-task/file-task-manager.js
class GlobalShortcutManager {
    static instance = null;
    
    static getInstance() {
        if (!GlobalShortcutManager.instance) {
            GlobalShortcutManager.instance = new GlobalShortcutManager();
        }
        return GlobalShortcutManager.instance;
    }
}
```

#### 模式 5：启动初始化（参照 `main.js` 中 `app.whenReady()`）

在 `main.js` 的 `app.whenReady()` 回调中，参照 `executionDispatcher.init()` 的位置（第 187 行附近），添加：

```javascript
const GlobalShortcutManager = require('@modules/canbox/main/globalShortcutManager');
GlobalShortcutManager.getInstance().restoreAll();
```

#### 模式 6：退出清理（参照 `main.js` 中 `before-quit`）

```javascript
// 参照：main.js 第 293-301 行
app.on('before-quit', () => {
    // ... 现有逻辑 ...
    
    // 注销所有全局快捷键
    const GlobalShortcutManager = require('@modules/canbox/main/globalShortcutManager');
    GlobalShortcutManager.getInstance().unregisterAll();
});
```

### 关键常量 / 路径 / 数据格式

#### Electron `globalShortcut` API 要点

```javascript
const { globalShortcut } = require('electron');

// 注册
globalShortcut.register('Alt+Space', callback);
// → boolean（成功返回 true）

// 注销
globalShortcut.unregister('Alt+Space');

// 全部注销
globalShortcut.unregisterAll();

// 检查是否已注册
globalShortcut.isRegistered('Alt+Space');
// → boolean

// 注意：
// - register() 的 callback 会在快捷键触发时被调用
// - macOS 上需要辅助功能权限
// - Linux Wayland 可能不完全支持
// - 某些系统快捷键无法覆盖（如 Alt+Tab）
```

#### 持久化数据格式

```typescript
interface ShortcutEntry {
    appId: string;          // APP 唯一标识符
    mode: 'focus' | 'callback';
    registeredAt: string;   // ISO 8601 时间戳
}

// 存储位置：{UsersBasePath}/Users/canbox.json
// 存储 key：globalShortcuts
type GlobalShortcutsMap = Record<string, ShortcutEntry>;
// 示例：{ "Alt+Space": { appId: "...", mode: "callback", registeredAt: "..." } }
```

#### accelerator 格式（Electron 规范）

Electron `globalShortcut.register()` 接受标准 accelerator 字符串：
- 修饰符 + 主键，如 `'Alt+Space'`、`'CommandOrControl+X'`、`'Shift+Alt+A'`
- 参考：https://www.electronjs.org/docs/latest/api/accelerator

#### APP 名称获取

```javascript
// 参照：modules/canbox/main/appManager.js
const { getAllApps } = require('@modules/canbox/main/appManager');
const apps = getAllApps();
const appName = apps.data[appId]?.name || appId;
```

## 实施计划

- [ ] 1. 创建 `modules/canbox/main/globalShortcutManager.js`：实现单例管理器，含 `register`、`unregister`、`unregisterAll`、`restoreAll`、`isRegistered`、`getRegisteredByAppId` 方法
- [ ] 2. 在 `modules/app/api.js` 中新增 `initShortcutIpcHandlers()`，注册 `shortcut-register`、`shortcut-unregister`、`shortcut-isRegistered` 三个 IPC handler，在 `initApiIpcHandlers()` 中调用
- [ ] 3. 在 `modules/app/app.preload.js` 中新增 `shortcut` 对象（register/unregister/isRegistered/onTriggered），监听 `shortcut-triggered` IPC 事件，在 `window.canbox` 中暴露
- [ ] 4. 修改 `main.js`：`app.whenReady()` 中调用 `restoreAll()`，`before-quit` 中调用 `unregisterAll()`
- [ ] 5. 更新 `types/canbox.d.ts`：新增 `shortcut` 模块类型定义，所有现有 API 添加 `@platforms linux, windows` JSDoc 标注
- [ ] 6. 更新 `docs/development/API.md`：新增 `# globalShortcut` 章节，各模块补充 `**支持平台**: linux, windows` 说明
- [ ] 7. 更新 `docs/development/API_CN.md`：同上（中文版）
- [ ] 8. 构建验证：`npm run build` 无错误
- [ ] 9. 手动测试：使用一个开发 APP 验证注册/注销/冲突检测/重启恢复/Callback 模式
