# web-app-creator

## 概述

新增"创建网页应用"功能，用户输入网址后 Canbox 自动抓取网站名称和图标，用户可编辑确认后生成 WebApp 类型的 APP，像本地应用一样打开使用。

## 核心设计

### 整体流程

```
用户点击"创建网页应用" → 输入 URL → 回车/点击"获取" → 抓取网站信息 → 编辑确认 → 生成 asar 包 → 注册到 Canbox → 出现在"我的 APP"
```

### 新增文件（统一归纳到 `modules/web-app/` 目录）

| 文件 | 职责 |
|------|------|
| `modules/web-app/web-app-creator.js` | 主进程核心：生成 app.json + 打包 asar + 注册 APP |
| `modules/web-app/website-scraper.js` | 网站元数据抓取（title、favicon），HTTP 优先 + BrowserWindow fallback |
| `modules/web-app/web-app-navigator.js` | WebApp 导航处理：快捷键、右键菜单、链接拦截差异化逻辑 |
| `src/components/CreateWebAppDialog.vue` | 前端对话框：URL 输入、信息获取、名称/图标编辑、导航选项 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `preload.js` | 新增 `webApp` 命名空间：`fetchWebsiteInfo`、`createWebApp` |
| `modules/ipc/appManagerIpcHandler.js` | 新增 `fetch-website-info`、`create-web-app` IPC handler |
| `src/components/AppList.vue` | 在"导入已有APP"按钮旁新增"创建网页应用"按钮 |
| `modules/core/win.js` | `setupExternalUrlHandler` 增加 `isWebApp` 参数，webapp 模式下同源 `target="_blank"` 在窗口内打开 |
| `childprocessEntry.js` | `setupExternalUrlHandler` 增加 `isWebApp` 参数，同上 |
| `locales/zh-CN.json` | 新增国际化文案 |
| `locales/en-US.json` | 新增国际化文案 |

### App ID 命名

格式：`com.canbox.webapp.{uuid前8位}`，例如 `com.canbox.webapp.a1b2c3d4`。规整且无版权风险。

### WebApp 的 app.json 结构

```json
{
    "id": "com.canbox.webapp.a1b2c3d4",
    "name": "百度一下",
    "version": "1.0.0",
    "description": "Web App: https://www.baidu.com",
    "author": "",
    "logo": "logo.png",
    "main": "https://www.baidu.com",
    "type": "webapp",
    "webappOptions": {
        "showNavbar": false
    },
    "window": {
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
    }
}
```

- `type: "webapp"` 标识这是网页应用，用于导航行为差异化
- `webappOptions.showNavbar` 控制是否显示导航栏，默认 false（沉浸式）
- `main` 直接填入 http URL，现有加载逻辑已支持
- asar 包内仅包含 `app.json` + `logo.png`

### 网站信息抓取策略（website-scraper.js）

1. **HTTP 请求优先**：请求 URL → 解析 HTML → 提取 `<title>`、`<link rel="icon">`、`<link rel="apple-touch-icon">`
2. **BrowserWindow fallback**：创建隐藏窗口加载页面 → `did-finish-load` 后从渲染后的 DOM 提取 title 和 favicon（解决 JS 渲染问题）
3. **图标下载**：获取到图标 URL 后下载为 PNG，若为 ICO 格式则直接保存
4. **默认兜底**：抓取失败时使用默认 WebApp 图标

### 导航处理（web-app-navigator.js）

**核心原则：不影响已有功能。** 通过 `appJson.type === 'webapp'` 判断，只在 webapp 模式下启用差异化行为。

#### 链接处理对比

| 行为 | 普通APP | WebApp |
|------|---------|--------|
| 同源导航 | 正常放行 | 正常放行 |
| 跨域导航 | 外部浏览器 | 外部浏览器 |
| 同源 `target="_blank"` | 外部浏览器 | **窗口内打开** |
| 跨域 `target="_blank"` | 外部浏览器 | 外部浏览器 |

#### 快捷键（仅 WebApp）

- `Alt+←` 后退
- `Alt+→` 前进
- `Ctrl+R` / `F5` 刷新

#### 右键菜单（仅 WebApp）

新增：后退 / 前进 / 刷新 / 在浏览器中打开

#### 导航栏

- 创建对话框中提供"显示导航栏"开关，默认关闭
- 设置写入 `appJson.webappOptions.showNavbar`
- L1 阶段预留配置字段，导航栏 UI 在 L2 阶段实现
- L1 阶段：快捷键 + 右键菜单已覆盖基本导航需求

### 前端对话框交互（CreateWebAppDialog.vue）

```
┌─────────────────────────────────────────┐
│  创建网页应用                             │
├─────────────────────────────────────────┤
│                                         │
│  网址 *                                  │
│  ┌───────────────────────────┐ ┌──────┐ │
│  │ https://example.com       │ │ 获取 │ │
│  └───────────────────────────┘ └──────┘ │
│  （回车键等同"获取"按钮）                  │
│                                         │
│  应用名称 *                              │
│  ┌───────────────────────────┐          │
│  │ Example Domain            │ ← 自动填入│
│  └───────────────────────────┘          │
│                                         │
│  图标                                    │
│  ┌────┐  ┌──────────────────┐          │
│  │ 🌐 │  │ 点击上传自定义图标 │          │
│  └────┘  └──────────────────┘          │
│                                         │
│  ☐ 显示导航栏                            │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │   取消    │  │   创建    │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

- URL 输入框支持回车键触发"获取"
- 名称和图标可手动修改
- 图标支持：自动获取 / 手动上传 / 默认图标

### setupExternalUrlHandler 修改方案

在 `win.js` 和 `childprocessEntry.js` 中，为 `setupExternalUrlHandler` 增加 `isWebApp` 参数：

```javascript
function setupExternalUrlHandler(win, isWebApp = false) {
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            if (isWebApp) {
                const currentUrl = win.webContents.getURL();
                try {
                    const navOrigin = new URL(url).origin;
                    const currentOrigin = new URL(currentUrl).origin;
                    if (navOrigin === currentOrigin) {
                        return { action: 'allow' };  // 同源在窗口内打开
                    }
                } catch (e) { /* fallthrough */ }
            }
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // will-navigate 逻辑不变，已有功能不受影响
    win.webContents.on('will-navigate', (event, url) => {
        // ... 现有逻辑完全保留
    });
}
```

调用处根据 `appJson.type === 'webapp'` 传入 `isWebApp`：
- `appWindowManager.js`：`setupExternalUrlHandler(appWin, appJson.type === 'webapp')`
- `childprocessEntry.js`：`setupExternalUrlHandler(appWin, appJson.type === 'webapp')`
- `win.js` 的 `createWindow`：保持 `setupExternalUrlHandler(win)` 不变（子窗口不需要 webapp 模式）

## 验收标准

- [ ] 输入 URL 后能成功抓取网站名称和图标，名称可编辑，图标可替换
- [ ] URL 输入框支持回车键触发"获取"操作
- [ ] 创建的 WebApp 出现在"我的 APP"列表，点击可正常打开
- [ ] WebApp 中同源链接在窗口内打开，跨域链接在外部浏览器打开
- [ ] WebApp 支持 Alt+←/→/Ctrl+R 快捷键导航
- [ ] WebApp 右键菜单包含导航选项
- [ ] "显示导航栏"选项可设置并保存到 app.json
- [ ] 现有 APP 的导航行为完全不受影响（回归检查）
- [ ] 抓取失败的网站可使用默认图标和手动输入名称完成创建

## 实施计划

- [ ] 创建 `modules/web-app/website-scraper.js`：网站元数据抓取
- [ ] 创建 `modules/web-app/web-app-navigator.js`：导航处理逻辑
- [ ] 创建 `modules/web-app/web-app-creator.js`：asar 包生成 + APP 注册
- [ ] 修改 `modules/ipc/appManagerIpcHandler.js`：新增 IPC handler
- [ ] 修改 `preload.js`：新增 webApp 命名空间
- [ ] 创建 `src/components/CreateWebAppDialog.vue`：前端对话框
- [ ] 修改 `src/components/AppList.vue`：新增"创建网页应用"按钮
- [ ] 修改 `modules/core/win.js`：setupExternalUrlHandler 增加 isWebApp 参数
- [ ] 修改 `childprocessEntry.js`：setupExternalUrlHandler 增加 isWebApp 参数
- [ ] 修改 `modules/integrated/appWindowManager.js`：调用 setupExternalUrlHandler 时传入 isWebApp
- [ ] 更新 `locales/zh-CN.json` 和 `locales/en-US.json`：新增国际化文案
- [ ] 构建验证 + 功能测试
