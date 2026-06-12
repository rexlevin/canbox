---
title: 进行中的变更
description: 记录正在实施或讨论中的功能变更
related_changes: []
---

# 进行中的变更

> 最后更新：2026-06-11

## 📊 统计

| 项目 | 数量 |
|------|------|
| 进行中变更 | 4 |

---

## 📋 进行中

| 变更名称 | 日期 | 优先级 | 描述 |
|----------|------|--------|------|
| [app-global-shortcut](./app-global-shortcut.md) | 2026-06-11 | ⭐⭐⭐ | 为 APP 运行时提供全局快捷键注册/注销 API，支持持久化映射和事件驱动 |
| [launcher-settings-panel](./launcher-settings-panel.md) | 2026-06-11 | ⭐⭐ | Launcher APP 设置入口（uTools 风格齿轮按钮），含快捷键自定义配置 |
| [refactor-module-structure](./refactor-module-structure.md) | 2026-06-09 | ⭐⭐⭐ | 重构 modules/ 目录，按运行环境拆分为 canbox/app/utils 三层结构 |
| [rename-shortcut-to-app-launcher](./rename-shortcut-to-app-launcher.md) | 2026-06-10 | ⭐⭐⭐ | 重命名 shortcutManager → appLauncherManager，消除 shortcut 歧义 |

---

## 📋 添加新变更

当创建新变更时，应在 `active/` 目录下添加对应的文档：

```bash
# 文件命名格式
docs/changes/active/{变更名称}.md
```

参考模板：[../template.md](../template.md)
