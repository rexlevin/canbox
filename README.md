# Canbox

![Logo](logo_128x128.png)

**Canbox** 是一个集成了多种实用工具的应用平台，旨在为用户提供便捷的生活和工作辅助功能。

# 功能特性

- **应用管理**：支持应用的安装、卸载和更新。
- **快捷方式**：为常用应用创建快捷方式。
- **多系统支持**：基于Electron，支持linux、windows（未测试完全）、mac（我没有mac😢，这个等有mac的人来干😆）

# 安装指南

## 下载可执行文件

## 编译安装

```bash
# 1. 克隆项目
git clone https://github.com/lizl6/canbox.git

# 2. 安装依赖：
npm install

# 3. 启动开发环境
npm run dev

# 4. 构建生产版本
# vite编译
npm run build
# linux环境打包
npm run build-dist:linux  # Linux
# windows环境打包
npm run build-dist:win    # Windows
```

# 欢迎提交 Issue！

# 许可证

Apache 2.0
