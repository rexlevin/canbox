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

// 设置全局语言，供 api.js 使用
process.env.CANBOX_LANGUAGE = args.language;
```

在 `api.js` 中优先使用环境变量：

```javascript
// api.js
function getCanboxLanguage() {
    // Childprocess 模式：从环境变量获取（由 childprocessEntry.js 设置）
    if (process.env.CANBOX_LANGUAGE) {
        return process.env.CANBOX_LANGUAGE;
    }
    
    // Window 模式：直接读取 store
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
| Canbox 全局配置 | 通过主进程获取 | 命令行参数传递 |
| 运行时信息 | 环境变量或 IPC | `process.env.CANBOX_XXX` |

## 相关文件

- `modules/main/api.js` - API 实现
- `modules/main/storageManager.js` - 存储管理
- `modules/childprocess/processManager.js` - 子进程管理
- `childprocessEntry.js` - 子进程入口

## 总结

理解两种进程模式的差异是设计 Canbox API 的关键：

1. **Window 模式**：`api.js` 与主 Canbox 同进程，可直接访问全局配置
2. **Childprocess 模式**：`api.js` 在独立进程中，必须通过外部方式（命令行参数）获取全局配置

任何需要访问 canbox 全局配置的 API，都必须考虑这种差异，不能直接使用 `getCanboxStore()`。
