# Canbox Wayland 环境配置指南

## 问题描述

在 Wayland 窗口管理器（如 KDE Plasma、GNOME、Sway 等）下，Canbox 主窗口和应用窗口可能会在 dock 上堆叠在一起，这是因为 Wayland 环境使用不同的窗口识别机制。

## 解决方案

我们对代码进行了优化，为 Wayland 环境提供了更好的窗口识别支持：

### 1. 主窗口设置 (main.js)

- **WM_CLASS**: `canbox-main`
- **应用标识**: `com.github.lizl6.canbox`
- **窗口标题**: `Canbox`

### 2. 应用窗口设置 (集成进程模式)

- **WM_CLASS**: `canbox-app-{appId}`
- **独特的窗口类名**: 每个应用都有唯一的 WM_CLASS 标识
- **应用名称**: 使用应用的实际名称

### 3. 独立进程模式设置

在独立进程模式下，每个应用都在单独的 Electron 进程中运行：
- 每个应用窗口都是独立的进程实例
- 具有独立的 WM_CLASS 标识
- 在 Wayland dock 中显示为独立的应用程序

## 环境要求

确保你的 Wayland 环境支持以下特性：

1. **XDG Desktop Portal**: 用于应用间通信
2. **Electron 35.7.2+**: 支持 Wayland 环境
3. **适当的窗口管理器**: KDE Plasma, GNOME, Sway 等

## 配置检查

### 查看窗口信息

可以使用以下命令检查窗口的 WM_CLASS：

```bash
# 在 KDE 中查看窗口信息
xprop WM_CLASS

# 或者在 Wayland 环境中查看
swaymsg -t get_tree | jq '.nodes[] | .name, .app_id'
```

### 验证配置

启动 Canbox 后，检查：

1. 主窗口和应用窗口是否在 dock 中分开显示
2. 每个窗口是否具有正确的图标和标题
3. 窗口切换是否正常工作

## 故障排除

如果仍然存在窗口堆叠问题：

1. **重启窗口管理器**: 重启桌面环境
2. **清除窗口状态**: 删除 `~/.config/canbox` 配置目录
3. **检查日志**: 查看 Canbox 启动日志中的窗口创建信息
4. **Wayland 兼容性**: 确保 Wayland 环境完全支持

## 性能说明

在 Wayland 环境下：
- 集成模式性能更好，窗口管理更集中
- 独立模式资源占用更高，但窗口识别更清晰
- 建议根据应用数量选择合适模式

## 开发模式

开发模式下可以启用详细日志来调试窗口问题：

```bash
# 启用详细日志
CANBOX_DEV_MODE=true npm start

# 或者直接设置环境变量
export ELECTRON_ENABLE_LOGGING=true
npm start
```

## 已知限制

- 某些 Wayland 合成器可能有特殊要求
- 旧版本桌面环境可能支持不完全
- 多显示器配置可能需要额外测试