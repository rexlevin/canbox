---
title: File Task Manager
description: 文件任务管理器 - 集中化管理文件操作、任务队列、进度感知
date: 2026-04-17
---

# File Task Manager (文件任务管理器)

## 概述

创建统一的 `file-task` 模块，解决当前目录操作分散、并发冲突、缺乏状态管理等问题。

## 核心功能

1. **集中化文件操作**：统一的文件操作 API
2. **任务队列**：同类型任务串行，不同类型并行
3. **独立临时目录**：每个任务使用 `{type}-{uid}` 格式目录
4. **状态可视化**：通过 IPC 事件推送，Pinia Store 响应式管理

## 模块结构

```
modules/file-task/
├── index.js                    # 统一导出
├── file-task-manager.js        # FileTaskManager 核心（单例）
├── file-task-queue.js          # FileTaskQueue 任务队列
├── file-task-state.js          # FileTaskState 状态枚举
├── file-operation.js           # FileOperation 文件操作服务
├── file-path.js                # FilePath 路径解析
└── file-task-ipc.js            # FileTaskIPC IPC 通信
```

## 任务类型

| 类型 | 描述 |
|------|------|
| `app-import` | 从本地 zip 导入应用 |
| `repo-download` | 从仓库下载应用 |
| `app-pack` | 打包应用 |
| `app-update` | 批量更新应用 |

## 任务状态

```
idle → pending → preparing → downloading → extracting → moving → completed
                    ↓
                 failed / cancelled
```

## 迁移计划

### Phase 1: 基础框架
- [ ] FileTaskState 状态枚举
- [ ] FileTaskPath 路径解析
- [ ] FileOperation 文件操作服务
- [ ] FileTaskQueue 任务队列
- [ ] FileTaskManager 核心管理器
- [ ] FileTaskIPC IPC 通信

### Phase 2: 前端集成
- [ ] FileTaskStore
- [ ] Preload 接口

### Phase 3: 业务迁移
- [ ] 迁移 repo-download
- [ ] 迁移 app-import

### Phase 4: 完善
- [ ] 清理遗留临时目录
- [ ] 综合测试

## 相关文档

- [OpenSpec Proposal](../../openspec/changes/file-task-manager/proposal.md)
- [OpenSpec Design](../../openspec/changes/file-task-manager/design.md)
- [OpenSpec Tasks](../../openspec/changes/file-task-manager/tasks.md)
