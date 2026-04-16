# App Locale API - 2026-04-16

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **状态** | ✅ 已完成 |
| **优先级** | ⭐⭐⭐ |
| **难度** | 🟢 简单 |
| **实际时间** | 0.5小时 |
| **负责人** | AI Agent |

## 🎯 变更概述

为 APP 提供获取 Canbox 当前语言环境的能力，通过 `window.canbox.getLocale()` API 获取当前语言代码。

## 🔍 问题描述

### 当前状况
Canbox 支持多语言（中文/英文），但运行中的 APP 无法获取当前的语言环境。

### 用户痛点
APP 开发者无法展示与 Canbox 一致的语言内容。

## 💡 解决方案

### 总体方案
提供简单的 `getLocale()` API，APP 在初始化时调用一次即可获取当前语言。

### 技术实现
- 在 `app.api.js` 中添加 `getLocale()` 函数，通过 IPC 获取并缓存语言
- 在 `ipcHandlers.js` 中添加 `i18n-get-locale` IPC handler
- 缓存机制避免重复 IPC 调用

### 架构设计
```
Canbox 主进程 ──▶ i18n-get-locale IPC handler
                        │
                        ▼
              ┌─────────────────────┐
              │   app.api.js       │
              │   getLocale()      │
              └─────────────────────┘
```

## 📁 修改的文件

### 修改文件
```
- modules/app.api.js (添加 getLocale 函数)
- ipcHandlers.js (添加 i18n-get-locale handler)
```

## 🛠️ 实施细节

### 关键实现步骤
1. 在 `app.api.js` 中添加 `currentLocale` 缓存变量
2. 实现 `getLocale()` 函数，首次调用通过 IPC 获取，之后返回缓存值
3. 在 `ipcHandlers.js` 中添加 `i18n-get-locale` IPC handler

### 技术要点
- 同步 API 设计，返回缓存的语言值
- IPC 通信只在首次调用时发生
- appId 未设置时抛出错误

## 🧪 测试验证

### 手动测试
1. APP 调用 `window.canbox.getLocale()` 返回正确语言 - ✅ 通过

## 📊 影响评估

### 功能影响
| 影响范围 | 评估结果 | 说明 |
|----------|----------|------|
| 向后兼容性 | ✅ 兼容 | getLocale 是可选 API |
| API变更 | ✅ 无变更 | 仅新增 API |
| 数据迁移 | ✅ 不需要 | 无数据变更 |

## 🔗 相关文档

### 设计文档
- [OpenSpec 详细设计](../../../openspec/changes/app-locale-api/)

## 📈 成功指标

### 质量指标
- [x] 代码审查通过
- [x] 文档完整
- [x] 功能测试通过

## 🎉 总结与反思

### 成功经验
1. 简洁的 API 设计，符合最小化原则
2. 缓存机制避免重复 IPC 开销

### 后续建议
1. 如需语言变化通知功能，可考虑在未来版本实现（需要解决 Childprocess 模式的事件转发问题）
2. APP 可在初始化时调用 `getLocale()` 获取当前语言

---

*创建时间: 2026-04-16*
*最后更新: 2026-04-16*
*版本: 1.0*
