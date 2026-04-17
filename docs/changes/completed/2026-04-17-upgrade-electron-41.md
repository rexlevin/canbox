---
title: Electron 升级到 41.2.1
description: 将 Electron 从 35.7.2 升级到 41.2.1，升级 Node.js 到 23+，同步更新依赖包
related_changes:
  - app-locale-api
---

# Electron 升级到 41.2.1 - 2026-04-16

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **状态** | ✅ 已完成 |
| **优先级** | ⭐⭐⭐ |
| **难度** | 🟡 中等 |
| **实际时间** | 1小时 |
| **负责人** | AI Agent |

## 🎯 变更概述

将 Electron 从 35.7.2 升级到 41.2.1，Node.js 从 18.x 升级到 23+，同步更新相关依赖包。

## 🔍 问题描述

### 当前状况
- Electron 版本：35.7.2（2025-03 发布）
- Node.js 版本：18.x
- 部分依赖包版本较旧

### 升级必要性
1. 获取最新安全修复和性能优化
2. 支持新特性（如更严格的 CSP、更新的 Chromium）
3. 保持与上游社区同步

## 📁 修改的文件

```
- package.json (electron 版本、依赖版本)
- modules/main/pathManager.js (修复循环依赖)
```

## 🛠️ 实施细节

### 升级步骤
1. 升级 Node.js 到 23.x+
2. 升级 electron 到 ^41.2.1
3. 同步升级 electron-builder 到 ^25.1.8
4. 同步升级 electron-updater 到 ^6.3.9
5. 保持 electron-store 为 ^8.2.0（v10 是 ESM，不兼容）
6. 修复 pathManager.js 的循环依赖问题
7. 测试基础功能

### 依赖版本对照

| 包名 | 当前版本 | 目标版本 |
|------|----------|----------|
| electron | ^35.7.2 | ^41.2.1 |
| electron-builder | (隐式) | ^25.1.8 |
| electron-updater | ^6.8.3 | ^6.3.9 |
| electron-store | ^8.2.0 | ^8.2.0 (暂不升级) |

**说明**：electron-store v10 是纯 ESM 模块，与当前 CommonJS 项目不兼容，保持 v8.2.0。

## 🧪 测试验证

### 已测试项
- [x] 主窗口启动
- [x] APP 启动（Childprocess 模式）
- [x] 语言切换
- [x] 托盘功能
- [x] 配置存储功能
- [x] 打包功能（Linux AppImage）

### 测试结果
✅ 所有基础功能测试通过

## 🔗 相关文档

### 设计文档
- [OpenSpec 详细设计](../../../openspec/changes/archive/2026-04-16-upgrade-electron-41/)

---

*创建时间: 2026-04-16*
*最后更新: 2026-04-16*
*版本: 1.0*
