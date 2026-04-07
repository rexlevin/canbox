# AI Agent文档同步指南

## 概述

当您完成一个OpenSpec变更后，请使用本指南将变更同步到人类友好的文档系统中。

## 目录结构

```
docs/changes/
├── README.md              # 变更系统说明
├── template.md           # 变更记录模板（核心参考）
├── active/               # 进行中的变更（如无则空）
└── completed/            # 已完成变更（目标位置）
    ├── README.md         # 汇总文档（需要更新）
    ├── 2025-03-04-logging-unification.md
    ├── 2026-02-11-custom-user-data-path.md
    ├── 2026-02-12-improve-migration-restart-ux.md
    ├── 2026-03-14-log-viewer-window.md
    ├── 2026-03-21-auto-update.md
    └── 2026-03-25-app-list-ui-upgrade.md
```

## 文档结构

每个变更文档应包含以下部分（参考 `template.md`）：

```markdown
# [标题] - [日期]

## 📋 基本信息
| 项目 | 内容 |
|------|------|
| **状态** | ✅ 已完成 |
| **日期** | YYYY-MM-DD |
| **优先级** | ⭐⭐⭐⭐⭐ |

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
- [OpenSpec详细设计](../../../openspec/changes/archive/[变更目录名]/)
```

## 同步步骤（手动流程）

### 步骤1：准备工作
1. 确认变更已归档：`openspec/changes/archive/[变更目录名]`
2. 目录名格式应为：`YYYY-MM-DD-变更名称`
3. 获取变更日期：从目录名前10字符提取（YYYY-MM-DD）

### 步骤2：提取信息
打开以下文件提取内容：

1. **`proposal.md`**：
   - **标题**：第一行的 `# 提案：XXX`
   - **问题描述**：`## 为什么` 部分
   - **目标**：`## 目标` 部分

2. **`design.md`**：
   - **解决方案**：`## 解决方案` 部分
   - **架构设计**：`## 架构设计` 部分

3. **`tasks.md`**：
   - **修改的文件**：所有文件路径（格式如 `modules/apps/AppManager.js`）
   - **关键实现步骤**：主要任务列表

## 详细步骤

### 步骤1：确认变更已完成
- 变更已归档到 `openspec/changes/archive/`
- 目录名格式：`YYYY-MM-DD-变更名称`

### 步骤2：提取关键信息
打开以下文件提取信息：

**A. `proposal.md`**
- 标题：第一行的 `# 提案：XXX`
- 问题描述：`## 为什么` 部分
- 目标：`## 目标` 部分

**B. `design.md`**
- 解决方案：`## 解决方案` 部分
- 架构设计：`## 架构设计` 部分

**C. `tasks.md`**
- 修改的文件：所有文件路径
- 关键实现步骤

### 步骤3：创建文档
1. **复制模板**：参考 `docs/changes/template.md` 的结构
2. **填写内容**：将步骤2提取的信息填入对应位置
3. **确定文件名**：`YYYY-MM-DD-变更名称.md`
   - 示例：`2026-04-05-new-feature.md`
4. **保存位置**：`docs/changes/completed/`

### 步骤4：更新汇总文档
编辑 `docs/changes/completed/README.md`：

1. **更新按时间排序**：
   - 找到 `### 2026年变更` 部分
   - 按时间倒序添加新条目（最新在最前）
   - 格式：`1. **YYYY-MM-DD** - [标题](./文件名.md)`

2. **更新按类别分类**：
   - 根据变更类型（用户体验改进/系统功能增强/开发体验优化）添加到相应表格
   - 更新表格中的变更数量

3. **更新统计数字**：
   - 总变更数
   - 各年份变更数
   - 各类别变更数

4. **更新最后更新日期**：页面顶部的日期改为当前日期

## 文档质量标准

### 必须包含
- [ ] 基本信息表（状态、日期、优先级）
- [ ] 变更概述（1-2句话）
- [ ] 问题描述
- [ ] 解决方案
- [ ] 修改的文件列表
- [ ] 相关文档链接

### 推荐包含
- [ ] 实施细节
- [ ] 测试验证
- [ ] 影响评估
- [ ] 成功指标

### 格式要求
- 使用Markdown格式
- 标题层级正确
- 表格对齐
- 链接有效

## 示例：同步一个新变更

假设刚完成变更 `2026-04-05-new-feature`：

### 1. 准备工作
- 变更目录：`openspec/changes/archive/2026-04-05-new-feature/`
- 文件名：`2026-04-05-new-feature.md`
- 保存位置：`docs/changes/completed/`

### 2. 提取信息
```bash
# 查看目录结构
ls openspec/changes/archive/2026-04-05-new-feature/

# 读取关键文件
cat openspec/changes/archive/2026-04-05-new-feature/proposal.md | head -20
cat openspec/changes/archive/2026-04-05-new-feature/design.md | head -30
cat openspec/changes/archive/2026-04-05-new-feature/tasks.md | head -50
```

### 3. 创建文档
参考 `docs/changes/template.md` 创建：
```markdown
# New Feature - 2026-04-05

## 📋 基本信息
| 项目 | 内容 |
|------|------|
| **状态** | ✅ 已完成 |
| **日期** | 2026-04-05 |
| **优先级** | ⭐⭐⭐⭐ |

## 🎯 变更概述
[从proposal.md提取1-2句话概括]

## 🔍 问题描述
[从proposal.md的"## 为什么"部分复制]

## 💡 解决方案
[从design.md的"## 解决方案"部分复制]

## 📁 修改的文件
- modules/apps/AppManager.js
- src/components/NewFeature.vue
- ... [从tasks.md复制]

## 🧪 测试验证
[简要描述测试情况]

## 🔗 相关文档
- [OpenSpec详细设计](../../../openspec/changes/archive/2026-04-05-new-feature/)
```

### 4. 更新汇总
编辑 `docs/changes/completed/README.md`：
- 在"2026年变更"列表开头添加：`1. **2026-04-05** - [New Feature](./2026-04-05-new-feature.md)`
- 更新总变更数
- 更新最后更新日期为当前日期

## 常见问题

### Q: 变更目录名不包含日期怎么办？
A: 使用归档日期或当前日期，格式：`YYYY-MM-DD`

### Q: 如何确定优先级？
A: 参考：
- ⭐⭐⭐⭐⭐：核心功能、安全修复
- ⭐⭐⭐⭐：重要功能、用户体验
- ⭐⭐⭐：优化改进、bug修复
- ⭐⭐：小改进、文档更新
- ⭐：微小调整

### Q: 更新汇总文档时顺序错了怎么办？
A: 确保按时间倒序排列（最新的在最前面）

### Q: 可以批量同步历史变更吗？
A: 可以，为每个历史变更重复此流程

## 工作流程总结

当您需要同步一个OpenSpec变更时：

```
1. 确认变更已归档到 openspec/changes/archive/
2. 提取关键信息（proposal.md, design.md, tasks.md）
3. 参考 template.md 创建新文档
4. 保存到 docs/changes/completed/[YYYY-MM-DD-名称].md
5. 更新 docs/changes/completed/README.md
```

## 质量检查清单

完成同步后请检查：
- [ ] 文档格式符合模板要求
- [ ] 基本信息表完整
- [ ] 所有链接有效
- [ ] 文件名格式正确
- [ ] 汇总文档已更新
- [ ] 最后更新日期已修改

---

*最后更新：2026-04-07*
*版本：2.0（纯指导版）*