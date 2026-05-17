# dual-source-update

## 概述

实现双源更新机制：国内用户使用 GitHub 镜像加速源，海外用户继续使用 GitHub 直连。通过代理加速解决国内访问 GitHub 不稳定的问题。

## 背景

- GitHub 在国内访问不稳定，下载速度慢甚至超时
- Gitee 存在 100M release 文件大小限制，Canbox 单平台包约 150M，无法上传
- Gitee Release 不支持 GitHub 风格的 `releases/download/{tag}/{file}` 静态文件 URL，electron-updater 的 Generic Provider 无法直接使用
- 国内已有免费的 GitHub 加速代理服务，可以代理 GitHub Release 文件下载

## 架构设计

### Module 边界

将 `auto-update` 相关代码重构为独立的 module `modules/update-center/`，对外暴露统一 API：

```
modules/update-center/
├── index.js                    # Module 入口，暴露核心 API
├── autoUpdater.js              # electron-updater 封装
├── regionDetector.js           # 地区检测（语言/IP）
├── speedTester.js              # 源速度测试
├── providers/                  # 更新源提供商
│   ├── baseProvider.js         # 抽象基类
│   ├── githubProvider.js       # GitHub 直连实现
│   └── mirrorProvider.js       # 镜像加速实现
├── config.js                   # 配置管理
└── events.js                   # 事件定义
```

### 暴露 API

```javascript
module.exports = {
  // 核心功能
  checkForUpdates,      // 检查更新
  downloadUpdate,       // 下载更新
  installUpdate,        // 安装更新

  // 配置
  getUpdateSource,      // 获取当前更新源
  setUpdateSource,      // 设置更新源（github/mirror/auto）
  getConfig,            // 获取更新配置
  saveConfig,           // 保存更新配置

  // 状态
  getStatus,           // 获取当前更新状态
  onUpdateEvent,       // 订阅更新事件

  // 工具
  skipVersion,         // 跳过版本
  clearSkippedVersions // 清除跳过列表
};
```

### 智能源选择

```
1. 优先检查用户语言环境 (zh-CN → 镜像加速源)
2. 同时探测两源响应速度（3-5 秒超时）
3. 记录历史成功率，动态调整
```

### IPC 接口

```javascript
// 获取当前设置
ipc: 'update-source:get' → { source: 'github'|'mirror'|'auto', current: string }

// 设置更新源
ipc: 'update-source:set', { source: 'github'|'mirror'|'auto' }

// 事件通知
ipc: 'update-source:changed', { from: string, to: string }
```

### electron-updater 配置

- 使用自定义 GitHubProvider 和 MirrorProvider
- 运行时动态设置 feedURL
- feedURL 根据源不同指向不同地址：
  - GitHub 直连：`https://github.com/rexlevin/canbox/releases/latest/download`
  - 镜像加速：`https://ghproxy.com/https://github.com/rexlevin/canbox/releases/latest/download`

### 可用代理列表

| 代理 | URL 前缀 | 说明 |
|------|----------|------|
| ghproxy | `https://ghproxy.com` | 老牌，稳定 |
| ghfast | `https://ghfast.top` | 速度较快 |
| ghgo | `https://ghgo.xyz` | 备选 |

## 实际修改文件

### 新增文件

| 文件 | 说明 |
|------|------|
| `modules/update-center/index.js` | Module 入口 |
| `modules/update-center/autoUpdater.js` | electron-updater 封装 |
| `modules/update-center/config.js` | 配置管理 |
| `modules/update-center/events.js` | 事件定义 |
| `modules/update-center/regionDetector.js` | 地区检测 |
| `modules/update-center/speedTester.js` | 源速度测试 |
| `modules/update-center/providers/baseProvider.js` | 抽象基类 |
| `modules/update-center/providers/githubProvider.js` | GitHub Provider |
| `modules/update-center/providers/mirrorProvider.js` | 镜像 Provider |
| `.github/workflows/release.yml` | GitHub Actions 发布流程 |
| `docs/dual-source-update-deployment.md` | 部署文档 |
| `locales/zh-CN.json` | 国际化更新（新增 updateSource 相关翻译） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `main.js` | 引用更新中心模块 |
| `ipcHandlers.js` | 添加 update-source IPC 处理 |
| `preload.js` | 暴露 updateSource API |
| `src/components/Settings.vue` | 添加更新源设置 UI |
| `package.json` | 移除 publish 配置，添加构建脚本 |

## 实施计划

### Phase 1: 模块重构 ✅

- [x] 创建 `modules/update-center/` 目录结构
- [x] 抽取现有 `autoUpdateManager.js` 到 `autoUpdater.js`
- [x] 创建 `index.js` 统一暴露 API
- [x] 创建 `providers/baseProvider.js` 抽象基类
- [x] 创建 `providers/githubProvider.js` (从原 githubReleaseProvider 重构)
- [x] 创建 `providers/mirrorProvider.js` (替代 giteeProvider)
- [x] 创建 `regionDetector.js` 检测用户地区/语言
- [x] 创建 `speedTester.js` 测试源响应速度
- [x] 更新 `config.js` 添加 updateSource 配置项
- [x] 更新 `events.js` 添加源相关事件
- [x] 更新 `main.js` 和 `ipcHandlers.js` 引用

### Phase 2: 双源实现 ✅

- [x] 修改 electron-builder 配置，添加 `--publish never` 防止自动发布
- [x] GitHubProvider 已实现
- [x] MirrorProvider 已实现
- [x] 智能源选择逻辑已集成到 autoUpdater
- [x] 在设置页面添加"更新源"选项
- [x] 添加 IPC 接口 `update-source:get` 和 `update-source:set`
- [x] 添加国际化翻译

### Phase 3: 部署配置 ✅

- [x] 配置 GitHub Actions 自动发布
- [x] 创建部署文档

## 验收标准

- [x] 模块独立，API 清晰，与主程序边界明确
- [x] 双源支持框架已完成（GitHub/Mirror Provider）
- [x] 智能源选择逻辑已完成（语言检测 + 速度测试）
- [x] 国内用户自动使用镜像加速源更新
- [x] 海外用户继续使用 GitHub 直连
- [x] 用户可手动切换更新源
- [x] 镜像加速源下载失败时自动降级到 GitHub 直连
- [x] GitHub 保持完整包作为唯一文件存储
- [x] electron-builder 配置 `--publish never`，发布由 workflow 控制
- [x] 在设置页面添加"更新源"选项
- [x] GitHub Actions 自动发布

## 发布流程

```
1. 开发者推送 Git Tag
   └─ git tag v0.4.2 && git push origin v0.4.2

2. GitHub Actions 自动触发
   ├─ 构建 AppImage (Linux)
   ├─ 构建 exe (Windows)
   └─ 发布到 GitHub (rexlevin/canbox)

3. 国内用户通过镜像加速源自动更新
   └─ 代理从 GitHub Release 拉取文件，无需额外文件存储
```
