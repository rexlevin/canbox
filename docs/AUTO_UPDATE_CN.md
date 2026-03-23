# 概述

Canbox 使用 `electron-updater` 实现自动更新功能,支持通过 GitHub Releases 进行版本更新。

### 主要特性

- ✅ 基于 GitHub Releases 的版本发布和更新
- ✅ 支持 Linux AppImage 格式自动更新
- ✅ 可配置的更新检查频率
- ✅ 手动/自动下载更新包
- ✅ 版本跳过功能
- ✅ 实时下载进度显示
- ✅ 完整的日志记录

---

# 工作原理

### electron-updater 工作机制

`electron-updater` 是 Electron 官方提供的自动更新解决方案,通过与 GitHub Releases 集成实现版本检查和更新。

```
┌─────────────────────────────────────────────────────────────────┐
│                        Canbox 应用                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────────────────────────┐    │
│  │  主进程      │      │       渲染进程                  │    │
│  │  Main Process│◀────▶│    Renderer Process            │    │
│  │              │  IPC  │                               │    │
│  │  ┌────────┐  │      │  ┌────────────────────────┐   │    │
│  │  │auto-   │  │      │  │   更新对话框 UI        │   │    │
│  │  │update  │  │      │  │   - 检查更新按钮        │   │    │
│  │  │manager │  │      │  │   - 下载进度条          │   │    │
│  │  └────────┘  │      │  │   - 安装按钮            │   │    │
│  └──────┬───────┘      │  └────────────────────────┘   │    │
│         │              │                               │    │
│         │ electron-    │                               │    │
│         │ updater      │                               │    │
│         ▼              ▼                               │    │
│  ┌──────────────────────────────────────────────────┐  │    │
│  │         GitHub Releases                          │  │    │
│  │  - latest-linux.yml (更新元数据)                 │  │    │
│  │  - Canbox-0.2.3-linux-x86_64.AppImage            │  │    │
│  └──────────────────────────────────────────────────┘  │    │
└─────────────────────────────────────────────────────────┘
```

### 版本检查流程

1. **读取最新版本信息**

   - 请求: `https://github.com/owner/repo/releases/latest/download/latest-linux.yml`
   - 解析 `version` 字段获取远程版本号
   - 注意: `/latest/` 只指向最新的 stable 版本，忽略 pre-release 版本

2. **版本比较**

   - 使用 `semver` 比较本地版本和远程版本
   - 判断是否需要更新

3. **下载和安装**

   - 从 GitHub Releases 下载 AppImage 文件
   - SHA512 校验文件完整性
   - 替换旧版本并重启应用

---

# 架构设计

### 模块结构

```
modules/auto-update/
├── index.js                      # 模块入口,导出公共接口
├── autoUpdateManager.js         # 核心管理器,单例模式
├── autoUpdateConfig.js          # 配置管理
├── autoUpdateEvents.js          # 事件定义
└── githubReleaseProvider.js     # GitHub Release 提供器(扩展用)
```

### 模块职责

#### 1. autoUpdateManager.js

核心管理器,负责:

- 初始化 `electron-updater`
- 检查更新
- 下载更新
- 安装更新
- 版本跳过管理
- 事件监听和转发

#### 2. autoUpdateConfig.js

配置管理,负责:

- 读取/保存用户配置
- 检查频率控制
- 跳过版本列表管理

配置存储位置: `Users/canbox.json`

#### 3. autoUpdateEvents.js

事件定义,负责:

- 定义 IPC 通道名称
- 定义更新事件常量

#### 4. githubReleaseProvider.js

GitHub Release 提供器,负责:

- 自定义更新源逻辑
- 为未来扩展其他发布源(如自建服务器)

---

# 发布流程

### 需要发布的文件

在 GitHub Release 中需要上传以下文件:

| 文件名                                     | 必需      | 说明                   |
| ------------------------------------------ | --------- | ---------------------- |
| `canbox-<version>-linux-x86_64.AppImage` | ✅ 必需   | AppImage 可执行文件    |
| `latest-linux.yml`                       | ✅ 必需   | 更新元数据文件         |
| `package.json`                           | ❌ 不需要 | 已打包在 AppImage 内部 |

### 构建步骤

1. **构建 AppImage**

   ```bash
   npm run build-appimage
   ```
2. **生成的文件**

   - `dist/canbox-0.2.3-linux-x86_64.AppImage`
   - `dist/latest-linux.yml`
3. **创建 GitHub Release**

   - 在 GitHub 上创建新版本 Tag
   - 上传 AppImage 和 `latest-linux.yml` 文件

### latest-linux.yml 结构

```yaml
version: 0.2.3                           # 版本号
files:
  - url: canbox-linux-x86_64.AppImage  # 文件相对路径
    sha512: cLF5Vj37+LO3dZOoIqxQC1w...  # SHA512 校验值
    size: 152830334                     # 文件大小(字节)
    blockMapSize: 160146
path: canbox-linux-x86_64.AppImage
sha512: cLF5Vj37+LO3dZOoIqxQC1w...      # 校验值
releaseDate: '2026-03-06T12:17:52.376Z'
```

### electron-builder 配置

在 `package.json` 中的配置:

```json
{
  "build": {
    "artifactName": "${productName}-${os}-${arch}.${ext}",
    "publish": {
      "provider": "github",
      "owner": "rexlevin",
      "repo": "canbox"
    }
  }
}
```

---

# 更新流程

### 完整更新流程图

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  应用启动 │────▶│ 检查更新 │────▶│ 发现新版本│────▶│ 下载更新 │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                   │
                                                   ▼
┌──────────┐     ┌──────────┐     ┌──────────┐  ┌──────────┐
│  应用重启 │◀────│  安装更新│◀────│ 下载完成 │  │显示进度  │
└──────────┘     └──────────┘     └──────────┘  └──────────┘
```

### 详细步骤

#### 1. 检查更新阶段

```
用户点击"检查更新"
       │
       ▼
主进程接收 IPC: check-for-update
       │
       ▼
读取用户配置
       │
       ▼
检查频率是否满足?
  ├─ 否 ─▶ 返回"不需要检查"
  └─ 是 ─▶ 继续
       │
       ▼
请求 GitHub Releases: latest-linux.yml
       │
       ▼
解析版本号
       │
       ▼
semver 比较: remote > local?
  ├─ 否 ─▶ 返回"已是最新版本"
  └─ 是 ─▶ 继续
       │
       ▼
检查版本是否被跳过
  ├─ 是 ─▶ 返回"版本已跳过"
  └─ 否 ─▶ 继续
       │
       ▼
发送事件: update-available 到渲染进程
       │
       ▼
显示更新对话框
```

#### 2. 下载更新阶段

```
用户点击"下载更新"
       │
       ▼
主进程接收 IPC: download-update
       │
       ▼
调用 electron-updater.downloadUpdate()
       │
       ▼
开始下载 AppImage
       │
       ▼
实时进度回调
       │
       ▼
发送事件: download-progress 到渲染进程
       │
       ▼
更新进度条 UI
       │
       ▼
下载完成
       │
       ▼
发送事件: update-downloaded 到渲染进程
       │
       ▼
显示"立即安装"按钮
```

#### 3. 安装更新阶段

```
用户点击"立即安装"
       │
       ▼
主进程接收 IPC: install-update
       │
       ▼
检查更新包是否已下载
       │
       ▼
调用 electron-updater.quitAndInstall()
       │
       ▼
应用退出
       │
       ▼
electron-updater 替换 AppImage 文件
       │
       ▼
自动重启应用
       │
       ▼
新版本启动
```

### 状态机

```
┌─────────┐
│  idle   │ ◀────────┐
└────┬────┘          │
     │ 检查更新     │ 安装完成
     ▼              │
┌─────────┐         │
│ checking│         │
└────┬────┘         │
     │ 发现更新      │
     ▼              │
┌─────────┐         │
│  ready  │         │
└────┬────┘         │
     │ 下载         │
     ▼              │
┌─────────┐         │
│downloading         │
└────┬────┘         │
     │ 下载完成     │
     ▼              │
┌─────────┐         │
│  ready  │─────────┘
└────┬────┘
     │ 安装
     ▼
┌─────────┐
│installing│
└─────────┘
```

---

# 配置说明

### 默认配置

```javascript
{
  enabled: true,                    // 是否启用自动更新
  checkOnStartup: true,             // 是否在启动时检查
  checkFrequency: 'startup',         // 检查频率: startup/daily/weekly/manual
  autoDownload: false,              // 是否自动下载更新包
  autoInstall: false,               // 更新后是否自动安装
  skippedVersions: [],               // 跳过的版本列表
  lastCheckTime: null,              // 上次检查时间(时间戳)
  lastVersionChecked: null          // 上次检查的版本号
}
```

### 检查频率说明

| 频率        | 说明           | 间隔时间 |
| ----------- | -------------- | -------- |
| `startup` | 每次启动都检查 | 0        |
| `daily`   | 每天检查一次   | 24 小时  |
| `weekly`  | 每周检查一次   | 7 天     |
| `manual`  | 仅手动检查     | 无限     |

### electron-updater 配置

在 `autoUpdateManager.js` 中的配置:

```javascript
autoUpdater.autoDownload = false;              // 不自动下载,由用户手动触发
autoUpdater.autoInstallOnAppQuit = false;      // 不在退出时自动安装
autoUpdater.allowDowngrade = false;           // 不允许降级更新
```

---

# API 接口

### 主进程 IPC 处理

#### 检查更新

**IPC 通道**: `check-for-update`

**参数**: 无

**返回**:

```javascript
{
  available: boolean,        // 是否有可用更新
  version?: string,          // 新版本号
  releaseDate?: string,      // 发布日期
  releaseNotes?: string,     // 发布说明
  reason?: string            // 无更新时的原因
}
```

#### 下载更新

**IPC 通道**: `download-update`

**参数**: 无

**返回**: 无(通过 `download-progress` 事件通知进度)

#### 安装更新

**IPC 通道**: `install-update`

**参数**: 无

**返回**: 无(应用会退出并安装)

#### 获取更新状态

**IPC 通道**: `get-update-status`

**参数**: 无

**返回**:

```javascript
{
  state: string,             // 当前状态: idle/checking/downloading/ready/installing/error
  progress: number,          // 下载进度(0-100)
  error: Error | null,       // 错误信息
  updateInfo: Object | null  // 更新信息
}
```

#### 跳过版本

**IPC 通道**: `skip-version`

**参数**:

```javascript
{
  version: string            // 要跳过的版本号
}
```

**返回**: 无

### 渲染进程事件

#### 更新事件

| 事件名称                 | 说明         | 数据                                                |
| ------------------------ | ------------ | --------------------------------------------------- |
| `update-available`     | 发现新版本   | `{ version, releaseDate, releaseNotes }`          |
| `update-not-available` | 已是最新版本 | `{ version }`                                     |
| `download-progress`    | 下载进度     | `{ percent, bytesPerSecond, transferred, total }` |
| `update-downloaded`    | 下载完成     | `{ version, releaseDate, releaseNotes }`          |
| `update-error`         | 更新错误     | `{ message, code }`                               |

---

# 日志说明

### 日志前缀

所有自动更新相关的日志都使用前缀 `[AutoUpdate]` 便于过滤和追踪。

### 检查更新日志

```
[AutoUpdate] 开始检查更新
[AutoUpdate] 调用 electron-updater 检查更新
[AutoUpdate] 发现新版本: v0.2.4
[AutoUpdate] 检查结果: 成功，发现新版本 v0.2.4，需要进行升级
```

### 无可用更新日志

```
[AutoUpdate] 开始检查更新
[AutoUpdate] 检查结果: 无可用更新，当前已是最新版本
```

### 检查失败日志

```
[AutoUpdate] 开始检查更新
[AutoUpdate] 检查结果: 失败 - Failed to check for updates (错误信息)
```

### 下载进度日志

```
[AutoUpdate] 开始下载更新包
[AutoUpdate] 下载进度: 45.23% (1024 KB/s)
[AutoUpdate] 下载完成
```

### 安装日志

```
[AutoUpdate] 开始安装更新
[AutoUpdate] 应用将退出并安装更新
```

### 错误日志

```
[AutoUpdate] 更新错误: Failed to download update (代码: ERR_DOWNLOAD)
```

---

# 常见问题

### Q1: 404 错误 - latest-linux.yml 文件不存在

**现象**:

```
[AutoUpdate] 更新错误: Failed to check for updates (代码: 404)
```

**原因**:

- GitHub Release 中还没有上传 `latest-linux.yml` 文件
- 或文件路径配置不正确

**解决**:

- 确保执行了 `npm run build-appimage` 构建命令
- 确保 `dist/latest-linux.yml` 已生成
- 确保该文件已上传到 GitHub Release

---

### Q2: SHA512 校验失败

**现象**:

```
[AutoUpdate] 更新错误: sha512 checksum mismatch
```

**原因**:

- 下载的文件损坏或不完整
- `latest-linux.yml` 中的校验值与文件不匹配

**解决**:

- 重新构建并发布
- 确保 `latest-linux.yml` 由 `electron-builder` 自动生成
- 检查网络环境是否稳定

---

### Q3: 更新后版本号未变化

**现象**:

- 下载安装后应用版本号仍然是旧版本

**原因**:

- AppImage 文件替换失败
- 权限不足

**解决**:

- 检查 AppImage 文件权限
- 确保应用安装在可写入目录
- 尝试手动替换 AppImage 文件

---

### Q4: 无法自动检测到更新

**现象**:

- GitHub Release 已发布新版本,但应用检测不到

**原因**:

- `package.json` 中的 `version` 字段未更新
- `latest-linux.yml` 版本号不正确
- GitHub Release tag 格式不正确

**解决**:

- 确保 `package.json` 中的版本号正确
- 重新构建并发布
- GitHub Release tag 应为 `v{version}` 格式(如 `v0.2.4`)

---

### Q5: 跳过的版本仍然提醒

**现象**:

- 用户已跳过某版本,但仍然收到更新提醒

**原因**:

- 版本号格式不一致
- 配置文件损坏

**解决**:

- 检查跳过版本列表: `Users/canbox.json`
- 清空跳过版本列表重试
- 检查日志确认版本号格式

---

### Q6: 下载进度卡住

**现象**:

- 下载进度长时间无变化

**原因**:

- 网络连接不稳定
- GitHub 访问受限
- 文件过大

**解决**:

- 检查网络连接
- 尝试切换网络环境
- electron-updater 不支持取消下载,需重新启动应用

---

# 开发建议

### 测试自动更新

1. **本地测试**

   - 使用 `electron-builder --dir` 构建不压缩版本
   - 修改 `package.json` 版本号模拟新版本
   - 检查日志确认流程
2. **模拟发布**

   - 创建测试 GitHub Release
   - 上传测试文件
   - 验证更新流程

### 调试技巧

1. **启用详细日志**

   ```javascript
   autoUpdater.logger = logger;
   autoUpdater.logger.transports.file.level = 'debug';
   ```
2. **查看网络请求**

   - 使用开发者工具查看网络面板
   - 确认 `latest-linux.yml` 请求是否成功
3. **检查配置**

   ```javascript
   console.log(autoUpdater.autoDownload);
   console.log(autoUpdater.currentVersion);
   console.log(autoUpdater.getFeedURL());
   ```

---

# 参考资料

- [electron-updater 官方文档](https://www.electron.build/auto-update)
- [Electron Builder 文档](https://www.electron.build/)
- [semver 版本规范](https://semver.org/)
- [AppImage 格式说明](https://appimage.org/)
