# AI Agent文档同步指南

## 概述

当您完成一个OpenSpec变更后，请使用本指南将变更同步到人类友好的文档系统中。

## 目录结构

```
docs/changes/
├── index.md               # 变更索引（总览）
├── README.md              # 变更系统说明（保留兼容）
├── template.md            # 变更记录模板（核心参考）
├── active/                # 进行中的变更
│   └── README.md          # 进行中变更索引
│   └── [变更名称].md      # 进行中变更文档
└── completed/             # 已完成变更
    ├── index.md           # 汇总文档（需要更新）
    ├── 2025-03-04-logging-unification.md
    ├── 2026-02-11-custom-user-data-path.md
    └── ...
```

## 两种工作流程

### 流程 A：进行中的变更

当变更刚开始创建（尚未完成）时：

1. 在 `openspec/changes/<name>/` 创建变更产出物（proposal, design, tasks 等）
2. 在 `docs/changes/active/` 创建变更文档：`[变更名称].md`
3. 更新 `docs/changes/active/README.md` 添加新变更
4. 状态标记为 `🚧 进行中`

### 流程 B：已完成的变更

当变更完成后：

1. 归档变更：`mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>`
2. 将 `docs/changes/active/[变更名称].md` 移动到 `docs/changes/completed/`
3. 重命名为 `YYYY-MM-DD-变更名称.md`
4. 更新状态为 `✅ 已完成`
5. 更新 `docs/changes/index.md` 索引

## 文档结构

每个变更文档应包含以下部分（参考 `template.md`）：

```markdown
# [标题] - [日期]

## 📋 基本信息
| 项目 | 内容 |
|------|------|
| **状态** | ✅ 已完成 / 🚧 进行中 / 📋 计划中 |
| **优先级** | ⭐⭐⭐⭐⭐ |
| ...

## 🎯 变更概述
[1-2句话概括]

## 🔍 问题描述
[详细描述原问题]

## 💡 解决方案
[描述解决方案]

## 📁 修改的文件
- path/to/file1.js
- path/to/file2.vue

## 🧪 测试验证
[描述测试情况]

## 🔗 相关文档
- [OpenSpec详细设计](../../../openspec/changes/[archive/]变更目录名/)
```

## 详细步骤

### 流程 A：创建进行中变更文档

#### 步骤1：创建变更目录
```
docs/changes/active/
```

#### 步骤2：提取信息
打开以下文件提取内容：

1. **`proposal.md`**：
   - 变更概述
   - 目标
   - 风险评估

2. **`design.md`**：
   - 解决方案
   - 技术选型
   - 架构设计

3. **`tasks.md`**：
   - 关键实现步骤
   - 任务清单

#### 步骤3：创建文档
1. 参考 `template.md` 结构
2. 填写内容
3. 状态标记为 `🚧 进行中`
4. 保存位置：`docs/changes/active/[变更名称].md`

#### 步骤4：更新索引
编辑 `docs/changes/active/README.md`：
- 添加新变更条目
- 更新变更数量

---

### 流程 B：归档已完成变更

#### 步骤1：归档 OpenSpec 变更
```bash
mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
```

#### 步骤2：移动变更文档
```bash
mv docs/changes/active/[变更名称].md docs/changes/completed/YYYY-MM-DD-变更名称.md
```

#### 步骤3：更新文档内容
- 状态改为 `✅ 已完成`
- 添加完成日期
- 更新 OpenSpec 链接（添加 archive/ 路径）
- 添加测试验证结果

#### 步骤4：更新索引
编辑 `docs/changes/index.md`：
1. 更新总变更数
2. 按时间倒序添加新条目
3. 更新各类别统计
4. 更新最后更新日期

## 示例

### 示例 A：创建进行中变更

假设刚创建新变更 `upgrade-electron-41`：

1. 创建目录：`docs/changes/active/`
2. 创建文件：`docs/changes/active/upgrade-electron-41.md`
```markdown
# Upgrade Electron 41 - 进行中

## 📋 基本信息
| 项目 | 内容 |
|------|------|
| **状态** | 🚧 进行中 |
| ...

## 🎯 变更概述
将 Electron 从 35.7.2 升级到 41.2.1
...

## 🔗 相关文档
- [OpenSpec详细设计](../../../openspec/changes/upgrade-electron-41/)
```

3. 更新 `docs/changes/active/README.md`

---

### 示例 B：归档已完成变更

假设 `upgrade-electron-41` 已完成：

1. 归档：`mv openspec/changes/upgrade-electron-41 openspec/changes/archive/2026-04-16-upgrade-electron-41`
2. 移动：`mv docs/changes/active/upgrade-electron-41.md docs/changes/completed/2026-04-16-upgrade-electron-41.md`
3. 更新文档状态为 `✅ 已完成`
4. 更新链接：`../../../openspec/changes/archive/2026-04-16-upgrade-electron-41/`
5. 更新 `docs/changes/index.md`

## 文档质量标准

### 必须包含
- [ ] 基本信息表（状态、日期、优先级）
- [ ] 变更概述（1-2句话）
- [ ] 问题描述
- [ ] 解决方案
- [ ] 修改的文件列表
- [ ] 相关文档链接

### 进行中状态额外要求
- [ ] 预计时间
- [ ] 任务清单（待完成）

### 已完成状态额外要求
- [ ] 实际时间
- [ ] 测试验证结果
- [ ] 成功指标达成情况

## 常见问题

### Q: 进行中和已完成的区别？
A: 
- **进行中**：正在开发，可能随时变更
- **已完成**：已实现并测试通过，已归档

### Q: 变更目录名不包含日期怎么办？
A: 使用当前日期，格式：`YYYY-MM-DD`

### Q: 如何确定优先级？
A: 参考：
- ⭐⭐⭐⭐⭐：核心功能、安全修复
- ⭐⭐⭐⭐：重要功能、用户体验
- ⭐⭐⭐：优化改进、bug修复
- ⭐⭐：小改进、文档更新
- ⭐：微小调整

### Q: 可以批量同步历史变更吗？
A: 可以，为每个历史变更重复此流程

## 工作流程总结

```
创建新变更时：
1. openspec-cn new change "<name>"
2. 创建 docs/changes/active/[name].md
3. 更新 docs/changes/active/README.md

变更完成时：
1. openspec-cn archive "<name>"
2. 移动文档到 docs/changes/completed/
3. 更新文档状态和链接
4. 更新 docs/changes/index.md
```

## 质量检查清单

完成同步后请检查：
- [ ] 文档格式符合模板要求
- [ ] 基本信息表完整
- [ ] 所有链接有效
- [ ] 文件名格式正确
- [ ] 索引文件已更新
- [ ] 最后更新日期已修改

---

*最后更新：2026-04-16*
*版本：3.0（支持进行中/已完成双流程）*
