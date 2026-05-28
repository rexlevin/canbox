---
title: 依赖包 Deprecation 分析报告
description: 记录 npm install 时的 deprecation warnings，分析影响和升级建议
related_issues:
  - upgrade-electron-41
---

# 依赖包 Deprecation 分析报告

> 创建时间：2026-04-17
> 最后更新：2026-05-28
> 状态：🟡 部分已处理

---

## 📊 问题概览

npm install 时产生的 deprecation warnings 主要来自以下 3 个来源：

| 来源 | 涉及包 | 严重程度 |
|------|--------|----------|
| `pouchdb` 及其依赖 | leveldown, levelup, level-* 系列 | 🟡 中 |
| `electron-sudo` 及其依赖 | sudo-prompt, npmlog 等 | 🟢 已处理 |
| 直接依赖 | asar, glob, rimraf, core-js | 🟡 中 |

---

## 🟢 已处理：electron-sudo 及其依赖

### 处理方案

已将直接依赖 `sudo-prompt@9.2.1` 替换为 `@vscode/sudo-prompt@9.3.2`（VSCode 团队维护的 fork）。

**替换原因**：
- `sudo-prompt@9.2.1` 内部使用了 `util.isObject()` / `util.isFunction()`，这两个 API 在 Node.js v22+ 中已被移除
- Electron v41 内置 Node.js v22+，导致 `canbox.sudo.exec` 调用时报错 `Node.util.isObject is not a function`
- `@vscode/sudo-prompt` 自行实现了 `isObject` / `isFunction`，不再依赖已废弃的 `util` API，API 完全兼容

### 依赖链（处理后）

```
@vscode/sudo-prompt@9.3.2 ✅ VSCode 维护，活跃更新
electron-sudo@4.0.12       ⚠️ 仅 Windows 平台使用，暂保留
├── sudo-prompt@9.2.1      ⚠️ electron-sudo 内部依赖，非直接引用
└── ...其他已废弃依赖
```

### 检查点

- [x] 确认 `electron-sudo` 的功能是否还在使用 → 仅 Windows 平台使用，暂保留
- [x] 替换直接依赖 `sudo-prompt` 为 `@vscode/sudo-prompt` → 已完成

---

## 🟡 中风险：pouchdb 依赖链

### 依赖链

```
pouchdb@9.0.0
├── leveldown@5.6.0, 6.1.1 ⚠️ 被 classic-level 替代
├── levelup@4.4.0 ⚠️ 被 abstract-level 替代
├── level-concat-iterator@3.1.0 ⚠️ 不再维护
├── level-errors@2.0.1 ⚠️ 不再维护
├── deferred-leveldown@5.3.0 ⚠️ 不再维护
├── encoding-down@6.3.0 ⚠️ 不再维护
├── level-codec@9.0.2 ⚠️ 不再维护
├── level-packager@5.1.1 ⚠️ 不再维护
├── level-js@5.0.2 ⚠️ 改用 browser-level
└── abstract-leveldown@6.2.3, 7.2.0 ⚠️ 不再维护
```

### 影响

- 这些 level-* 包都已停止维护
- 存在潜在安全风险
- 未来可能与新版 Node.js 不兼容

### 建议方案

| 方案 | 说明 |
|------|------|
| 升级 pouchdb | 新版本可能已使用新的依赖链 |
| 替换存储方案 | 如改用 indexedDB 或其他方案（需较大改动） |

### 检查点

- [ ] 确认 `pouchdb` 的功能是否还在使用
- [ ] 检查 pouchdb 是否有更新版本

---

## 🟢 已处理：electron-store

| 包 | 版本 | 状态 |
|----|------|------|
| `electron-store` | ^8.2.0 | ✅ 保持不变（v10 是纯 ESM，与当前 CommonJS 项目不兼容） |

**说明**：electron-store v10 是纯 ESM 模块，不再支持 `require()`。当前项目使用 CommonJS 模式，保持 v8.2.0 暂不升级，后续可单独处理迁移。

---

## 🟡 中风险：直接依赖包

### 包列表

| 包 | 当前版本 | 问题 | 建议升级 |
|----|----------|------|----------|
| `asar` | ^3.2.0 | 被 `@electron/asar` 替代 | `@electron/asar@^4.0.0` |
| `glob` | ^11.0.3 | 看起来是最新版 | ✅ 已是最新版 |
| `rimraf` | ^6.0.1 | 看起来是最新版 | ✅ 已是最新版 |

### asar 升级说明

asar@3.2.0 的警告：
> Please use @electron/asar moving forward. There is no API change, just a package name change.

**升级方式**：
```bash
npm uninstall asar
npm install @electron/asar
```

同时需要更新代码中的引用（如果有的话）。

---

## 📋 升级建议汇总

| 优先级 | 包 | 当前版本 | 目标版本 | 操作 |
|--------|-----|----------|----------|------|
| 🟢 已处理 | `sudo-prompt` → `@vscode/sudo-prompt` | ^9.2.1 → ^9.3.2 | `@vscode/sudo-prompt@^9.3.2` | ✅ 已替换 |
| 🟡 中 | `electron-sudo` | ^4.0.12 | 移除或替换 | 仅 Windows 使用，暂保留 |
| 🟡 中 | `pouchdb` | ^9.0.0 | ^9.0.0+ | 检查最新版本 |
| 🟡 中 | `asar` | ^3.2.0 | `@electron/asar@^4.0.0` | 直接替换包名 |
| 🟢 低 | `electron-store` | ^8.2.0 | 暂不升级 | v10 是 ESM，需单独迁移 |

---

## 🔍 需要进一步确认

### 1. electron-sudo 使用情况

需要检查代码中是否使用了 `electron-sudo`：

```bash
grep -r "electron-sudo" --include="*.js" .
grep -r "sudo-prompt" --include="*.js" .
```

### 2. pouchdb 使用情况

需要检查代码中是否使用了 `pouchdb`：

```bash
grep -r "pouchdb" --include="*.js" .
```

### 3. asar 使用情况

需要检查代码中是否直接引用了 `asar`：

```bash
grep -r "require.*asar" --include="*.js" .
grep -r "from.*asar" --include="*.js" .
```

---

## 📝 处理记录

| 日期 | 操作 | 结果 |
|------|------|------|
| 2026-04-17 | 创建分析报告 | 待处理 |
| 2026-05-28 | 替换 `sudo-prompt@9.2.1` 为 `@vscode/sudo-prompt@9.3.2` | ✅ 已完成，修复 Node.js v22+ 兼容性问题 |

---

*文档版本：1.0*
