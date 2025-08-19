# Canbox

![Logo](logo.png)

**Canbox** 是一个集成了多种实用工具的应用集合，旨在为用户提供便捷的生活和工作辅助功能。

## 功能特性

- **应用管理**：支持应用的安装、卸载和更新。
- **快捷方式**：为常用应用创建快捷方式。
- **多环境支持**：区分开发和生产环境，确保独立运行。

## 环境要求

- Node.js >= 22.0.0
- Electron >= 35.7.2
- Vite >= 5.4.6

## 安装指南

1. 克隆项目：
   ```bash
   git clone https://github.com/lizl6/canbox.git
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发环境：
   ```bash
   npm run dev
   ```
4. 构建生产版本：
   ```bash
   # vite编译
   npm run build

   # linux环境打包
   npm run build-dist:linux  # Linux
   # windows环境打包
   npm run build-dist:win    # Windows
   ```

## 使用说明

- **开发模式**：
  ```bash
  npm run dev
  ```
- **生产模式**：
  ```bash
  npm start
  ```

## 开发指南

### 项目结构

```
canbox/
├── dist/                  # 构建输出目录
├── modules/               # 核心模块
├── public/                # 静态资源
├── src/                   # 前端源码
├── utils/                 # 工具函数
├── main.js                # 主进程入口
├── ipcHandlers.js         # IPC 通信处理
└── package.json           # 项目配置
```

### 调试

- 启动开发服务器：
  ```bash
  npm run dev
  ```
- 调试主进程：
  ```bash
  npm run start
  ```

## 贡献指南

欢迎提交 Pull Request 或 Issue！

## 许可证

Apache 2.0
