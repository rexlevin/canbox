# Electron 进程模式与数据访问设计

## 概述

Canbox 支持两种应用运行模式，这两种模式下 Electron 进程架构有本质区别，直接影响数据访问方式的设计决策。

## 两种运行模式

### 1. Window 模式（窗口模式）

```
┌─────────────────────────────────────────────────────────┐
│                    主 Canbox 进程                        │
│  ┌─────────────────┐        ┌──────────────────────┐   │
│  │   main.js       │        │    应用渲染窗口       │   │
│  │   (主进程)       │◄──────►│   (Renderer Process) │   │
│  │                 │  IPC   │                      │   │
│  │  ┌───────────┐  │        │  ┌────────────────┐  │   │
│  │  │  api.js   │  │        │  │   App 代码      │  │   │
│  │  │ (主进程)   │  │        │  │  canbox.getXxx │  │   │
│  │  └───────────┘  │        │  └────────────────┘  │   │
│  └─────────────────┘        └──────────────────────┘   │
│                                                         │
│  userData: ~/.config/canbox/  ✓ 正确路径               │
└─────────────────────────────────────────────────────────┘
```

**特点：**
- 应用在主 Canbox 进程的窗口中运行
- `api.js` 运行在主进程，与 `main.js` 同一进程
- `app.getPath('userData')` 返回 `~/.config/canbox/`
- 直接访问 `getCanboxStore()` 能正确读取配置

### 2. Childprocess 模式（独立进程模式）

```
┌─────────────────────────────┐         ┌─────────────────────────────────────────┐
│      主 Canbox 进程          │         │         子进程独立应用                   │
│  ┌─────────────────────┐   │         │  ┌─────────────────────────────────┐   │
│  │     main.js         │   │         │  │    childprocessEntry.js         │   │
│  │    (主进程)          │   │         │  │      (独立主进程)                │   │
│  │                     │   │  spawn  │  │                                 │   │
│  │  通过 processManager │◄──┼─────────┼──►│  ┌───────────┐  ┌───────────┐  │   │
│  │  启动子进程          │   │         │  │  │  api.js   │  │  App窗口   │  │   │
│  └─────────────────────┘   │         │  │  │(主进程)    │  │(渲染进程)   │  │   │
│                            │         │  │  └───────────┘  └───────────┘  │   │
│  userData: ~/.config/canbox/│         │  │                                 │   │
│                            │         │  │  userData: ~/.config/Electron/  │   │
│                            │         │  │  ✗ 错误路径！不是 canbox        │   │
└─────────────────────────────┘         │  └─────────────────────────────────┘   │
                                        └─────────────────────────────────────────┘
```

**特点：**
- 每个应用作为独立的 Electron 进程运行
- `childprocessEntry.js` 是独立的应用入口
- `api.js` 运行在子进程的主进程中，与主 Canbox 是不同进程
- `app.getPath('userData')` 返回 `~/.config/Electron/`（错误路径）
- 直接访问 `getCanboxStore()` 会读取到错误路径的配置

## 核心问题

### 问题根源

`getCanboxStore()` 依赖 `app.getPath('userData')` 获取存储路径：

```javascript
// storageManager.js
function getUsersBasePath() {
    const customRoot = getCustomDataRoot();
    return customRoot || app.getPath('userData');  // ← 这里返回不同路径
}
```

| 模式 | 进程 | `app.getPath('userData')` | 实际存储路径 |
|------|------|---------------------------|-------------|
| Window | 主 Canbox 主进程 | `~/.config/canbox/` | ✓ 正确 |
| Childprocess | 子进程独立主进程 | `~/.config/Electron/` | ✗ 错误 |

### 影响范围

只有读取 **canbox 全局配置** 的 API 会受影响：

| API | 是否有问题 | 原因 |
|-----|-----------|------|
| `canbox.db.xxx` | ❌ 无 | 使用 App 独立的数据库 |
| `canbox.store.xxx` | ❌ 无 | 使用 App 独立的 store |
| `canbox.window.xxx` | ❌ 无 | 操作当前进程窗口 |
| `canbox.dialog.xxx` | ❌ 无 | 纯 UI 操作 |
| `canbox.getLocale()` | ✅ **有** | 读取 canbox 全局语言配置 |

## 解决方案

### 方案对比

| 方案 | 实现方式 | 优点 | 缺点 |
|------|---------|------|------|
| A. 命令行参数 | 启动时传递 `--canbox-language` | 简单直接 | 只能传递启动时的值，无法动态更新 |
| B. IPC 通信 | 子进程通过 processBridge 向主进程查询 | 实时获取最新值 | 需要建立 IPC 通道，复杂度高 |
| C. 环境变量 | 设置 `CANBOX_LANGUAGE` | 简单 | 同样只能传递启动时的值 |

### 推荐方案：命令行参数

在 `processManager.js` 启动子进程时传递语言参数：

```javascript
// processManager.js
const language = getCanboxLanguage(); // 在主进程中读取
spawn('electron', [
    'childprocessEntry.js',
    `--app-id=${appId}`,
    `--canbox-language=${language}`  // ← 传递语言
]);
```

在 `childprocessEntry.js` 中解析并全局设置：

```javascript
// childprocessEntry.js
function parseArgs() {
    const args = {};
    process.argv.forEach(arg => {
        // ... 其他参数解析
        if (arg.startsWith('--canbox-language=')) {
            args.language = arg.substring('--canbox-language='.length);
        }
    });
    return args;
}

// 设置全局 userData 路径环境变量
process.env.CANBOX_USER_DATA = args.userData;
```

在 `pathManager.js` 中优先使用环境变量：

```javascript
// pathManager.js
function getCanboxUserDataPath() {
    // 子进程模式：使用主进程传递的 userData 路径
    if (process.env.CANBOX_USER_DATA) {
        return process.env.CANBOX_USER_DATA;
    }
    // Window 模式或主进程：使用默认路径
    return app.getPath('userData');
}

function getUsersBasePath() {
    const customRoot = getCustomDataRoot();
    return customRoot || getCanboxUserDataPath();
}
```

在 `api.js` 中直接使用 store（路径已正确）：

```javascript
// api.js
function getCanboxLanguage() {
    try {
        const canboxStore = getCanboxStore();
        const savedLanguage = canboxStore.get('language');
        if (savedLanguage) {
            return savedLanguage;
        }
    } catch (error) {
        logger.error('Failed to get language from canbox store:', error);
    }
    
    // 默认根据系统语言
    const systemLocale = app.getLocale();
    return systemLocale.startsWith('zh') ? 'zh-CN' : 'en-US';
}
```

## 设计原则

基于以上分析，得出以下设计原则：

### 1. API 实现原则

```
┌─────────────────────────────────────────────────────────────┐
│  原则：API 实现应该区分数据来源                                │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ App 私有数据 │    │ Canbox 全局  │    │  处理方式        │ │
│  │ (db/store)  │    │ 配置        │    │                 │ │
│  └─────────────┘    └─────────────┘    └─────────────────┘ │
│         │                  │                                   │
│         ▼                  ▼                                   │
│    直接使用           需要特殊处理                              │
│    getXxxStore()      （命令行参数/IPC）                       │
└─────────────────────────────────────────────────────────────┘
```

### 2. 进程间通信原则

- **两个主进程之间**（主 Canbox ↔ 子进程）：没有直接 IPC 通道，需通过 `stdio` 或文件通信
- **主进程与渲染进程之间**：通过 `ipcMain`/`ipcRenderer` 通信
- **子进程的主进程与其渲染进程**：通过 `ipcMain`/`ipcRenderer` 通信

### 3. 数据访问原则

| 数据类型 | 访问方式 | 示例 |
|---------|---------|------|
| App 独立数据 | 直接使用 Store/DB | `new ElectronStore(appId, name)` |
| Canbox 全局配置 | 直接使用 Store | `getCanboxStore().get('key')`（路径已统一） |
| 运行时信息 | 环境变量 | `process.env.CANBOX_USER_DATA` |

## 相关文件

- `modules/main/api.js` - API 实现
- `modules/main/storageManager.js` - 存储管理
- `modules/childprocess/processManager.js` - 子进程管理
- `childprocessEntry.js` - 子进程入口

## 总结

理解两种进程模式的差异是设计 Canbox API 的关键：

1. **Window 模式**：`api.js` 与主 Canbox 同进程，`app.getPath('userData')` 返回正确路径
2. **Childprocess 模式**：`api.js` 在独立进程中，`app.getPath('userData')` 返回错误路径

**统一解决方案**：通过 `--user-data` 命令行参数将主进程的 userData 路径传递给子进程，子进程通过 `CANBOX_USER_DATA` 环境变量设置，使 `pathManager.js` 中的所有路径函数都能返回正确的 canbox 数据目录。

这样所有 API（`getLocale`、`store`、`db` 等）都可以直接使用，无需考虑运行模式差异。

## 模块加载顺序问题

### 问题描述

在 `childprocessEntry.js` 中，某些模块在 `CANBOX_USER_DATA` 环境变量设置之前就被 `require` 了，导致这些模块使用了错误的路径。

**问题示例**：

```javascript
// childprocessEntry.js

// 第 23 行：此时 CANBOX_USER_DATA 还未设置！
const winState = require('@modules/main/winState');

// 第 56-63 行：参数解析并设置环境变量
const args = parseArgs();
if (userData) {
    process.env.CANBOX_USER_DATA = userData;  // ← 环境变量在这里才设置
}

// 当 winState 被加载时：
// - CANBOX_USER_DATA 是 undefined
// - getCanboxUserDataPath() 走到 else 分支
// - 使用 app.getPath('userData') → ~/.config/Electron/
```

### 解决方案

**延迟加载依赖环境变量的模块**：

```javascript
// childprocessEntry.js

// 不在这里加载 winState
// const winState = require('@modules/main/winState');  // ❌ 不要在这里

// ... 参数解析和环境变量设置 ...

function createAppWindow() {
    // 在 CANBOX_USER_DATA 设置之后再加载
    const winState = require('@modules/main/winState');  // ✅ 正确位置

    // 使用 winState...
}
```

### 需要注意的模块

| 模块 | 问题 | 解决方案 |
|------|------|---------|
| `winState` | 在环境变量设置前加载 | 延迟到 `createAppWindow()` 中加载 |
| 其他在 `app.whenReady()` 后使用的模块 | 通常无问题 | 在 IPC handler 中加载即可 |
