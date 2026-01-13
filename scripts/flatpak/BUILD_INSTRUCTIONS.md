# Canbox Flatpak 完整构建流程

## 快速开始

### 前提条件
1. 已安装 Node.js 和 npm
2. 已安装 flatpak 和 flatpak-builder
3. 已添加 Flathub 仓库

### 三步骤构建

```bash
# 步骤 1: 构建常规包
npm install
npm run build
npm run build-dist:linux

# 步骤 2: 构建 Flatpak 包
npm run build-flatpak
# 或者
cd flatpak && ./build-flatpak.sh

# 步骤 3: 安装
flatpak install --user canbox.flatpak

# 步骤 4: 运行
flatpak run com.github.lizl6.canbox
```

## 详细说明

### 1. 构建流程说明

当前的 Flatpak 构建策略：
- **两阶段构建**: 先构建标准的 AppImage，然后从 AppImage 中提取内容构建 Flatpak
- **简化依赖**: 使用标准 SDK (org.freedesktop.Sdk) 而不是 Electron 专用 SDK
- **沙盒权限**: 包含网络、文件系统、图形界面等必要的权限

### 2. 文件结构

```
canbox/
├── flatpak/
│   ├── com.github.lizl6.canbox.yaml    # Flatpak manifest
│   ├── build-flatpak.sh                # 构建脚本
│   ├── README.md                       # 说明文档
│   ├── BUILD_INSTRUCTIONS.md           # 本文件
│   └── test-flatpak-config.sh          # 配置测试脚本
└── dist/
    └── canbox-0.0.8-linux-x86_64.AppImage  # 构建输入
```

### 3. 主要配置文件

#### 3.1 manifest 文件 (`com.github.lizl6.canbox.yaml`)
- App ID: `com.github.lizl6.canbox`
- 运行时: Freedesktop Platform 24.08
- 构建方式: 从 AppImage 提取
- 权限配置: 包含必要的 Linux 桌面权限

#### 3.2 构建脚本 (`build-flatpak.sh`)
- 自动安装必要的运行时
- 验证前置条件
- 完整的构建和打包流程

### 4. 故障排除

#### 4.1 常见问题

**问题1**: Flatpak 命令未找到
```bash
# 解决方案
sudo apt install flatpak flatpak-builder  # Ubuntu/Debian
sudo dnf install flatpak flatpak-builder  # Fedora
```

**问题2**: Flathub 仓库未添加
```bash
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

**问题3**: AppImage 不存在
```bash
# 请先构建 Linux 包
npm run build-dist:linux
```

#### 4.2 验证构建

使用测试脚本验证配置：
```bash
cd flatpak
./test-flatpak-config.sh
```

使用基础构建测试：
```bash
cd flatpak
flatpak-builder --stop-at=canbox build-dir com.github.lizl6.canbox.yaml
```

### 5. 发布选项

#### 5.1 本地安装
```bash
flatpak install --user canbox.flatpak
```

#### 5.2 分发安装
```bash
# 共享文件给别人安装
flatpak install --user canbox.flatpak
```

#### 5.3 发布到 Flathub（高级）
如需发布到 Flathub 官方仓库，需要：
1. Fork [Flathub 仓库](https://github.com/flathub/flathub)
2. 提交 manifest 文件
3. 通过审查流程

### 6. 维护说明

#### 6.1 版本更新
当 Canbox 版本更新时，需要：
1. 更新 `package.json` 中的版本号
2. 更新 `com.github.lizl6.canbox.yaml` 中的 AppImage 路径
3. 重新构建所有包

#### 6.2 依赖更新
如需更新 Flatpak 运行时版本，修改：
```yaml
runtime-version: '24.08'  # 改为新版本
```

## 技术细节

### 沙盒权限说明
- `--share=network`: 网络访问权限
- `--filesystem=home`: 主目录文件访问
- `--socket=x11/wayland`: 图形界面支持
- `--talk-name=org.freedesktop.Notifications`: 系统通知权限

### 构建优化
- 当前配置已针对 Electron 应用优化
- 使用最小化的运行时依赖
- 自动清理构建缓存
- 支持增量构建

---
*最后更新: 2026-01-13*
```