# Canbox Flatpak 构建说明

## 概述

这个目录包含将 Canbox 打包为 Flatpak 包所需的配置文件。

## 文件说明

- `com.github.lizl6.canbox.yaml` - Flatpak manifest 文件，定义了应用的构建和运行配置
- `build-flatpak.sh` - 自动构建脚本，用于生成 Flatpak 包
- `README.md` - 此说明文档

## 构建依赖

构建 Flatpak 包需要安装以下软件：

```bash
# Ubuntu/Debian
sudo apt install flatpak flatpak-builder

# Fedora
sudo dnf install flatpak flatpak-builder

# 添加 Flathub 仓库
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

## 构建步骤

### 方法一：使用 npm 脚本（推荐）

```bash
# 在项目根目录运行
npm run build-flatpak
```

### 方法二：手动构建

```bash
# 进入 flatpak 目录
cd flatpak

# 赋予脚本执行权限
chmod +x build-flatpak.sh

# 运行构建脚本
./build-flatpak.sh
```

## 安装生成的 Flatpak 包

构建完成后会生成 `canbox.flatpak` 文件，可以使用以下命令安装：

```bash
flatpak install --user canbox.flatpak
```

## 运行应用

安装后可以通过以下方式运行：

```bash
# 从命令行运行
flatpak run com.github.lizl6.canbox

# 从桌面环境启动
# 应用会出现在应用菜单中，名称为 "Canbox"
```

## 权限说明

Flatpak 配置包含以下权限：
- 网络访问
- 文件系统访问（home、文档、下载目录）
- 图形界面访问（X11、Wayland）
- 通知权限

## 更新应用

如果需要更新应用，可以重新构建 Flatpak 包，然后使用：

```bash
flatpak update com.github.lizl6.canbox
```

## 故障排除

### 构建失败
- 确保已安装所有必需的 Flatpak 运行时和 SDK
- 检查网络连接，确保能访问 Flathub 仓库

### 运行时问题
- 如果应用无法启动，检查 Flatpak 权限设置
- 使用 `flatpak logs com.github.lizl6.canbox` 查看日志

## 发布到 Flathub

如需发布到 Flathub，需要：
1. 在 Flathub 注册应用
2. 提交 manifest 文件到 Flathub 仓库
3. 遵循 Flathub 的审查流程

---

如有问题，请参考 [Flatpak 官方文档](https://flatpak.org) 或创建 Issue。