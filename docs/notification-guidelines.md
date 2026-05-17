# 通知组件使用规范

## 概述

本文档规范 Canbox 项目中用户通知的使用方式，确保通知体验一致且合理。

## 问题背景

原有问题：
- **ElMessage**：置顶居中显示，遮挡内容，无法手动关闭，无历史记录
- **ElNotification**：右上角弹出，相对醒目，但无历史记录
- **ElMessageBox**：对话框形式，适合需用户确认的场景

## 通知组件选择规范

### 决策矩阵

| 场景 | 推荐组件 | 替代组件 | 说明 |
|------|----------|----------|------|
| 操作结果反馈（成功/失败） | `ElNotification` | - | 右上角弹出，可手动关闭，带标题更醒目 |
| 长时间任务进度 | `FileTaskPanel` | - | 已有进度面板 |
| 需用户确认的操作 | `ElMessageBox` | - | 已有对话框 |
| 非关键提示（info 级别） | `ElMessage` | `ElNotification` | 可保留 |

### 详细规则

#### 1. 操作结果反馈 → ElNotification

**适用场景**：
- 应用安装/卸载成功
- 应用启动/停止
- 仓库添加/删除成功
- 设置保存成功
- 文件导入/导出完成

**特点**：
- 右上角弹出，不遮挡主内容
- 可手动关闭
- 带标题（如"成功"、"错误"），更醒目
- 自动在操作历史中记录

**代码示例**：
```javascript
import { ElNotification } from 'element-plus';

ElNotification({
    type: 'success',
    title: '成功',
    message: '应用安装成功',
    duration: 3000
});
```

#### 2. 使用通知封装 `notification.js`

为统一管理和扩展（如后续接入操作历史），推荐使用封装好的 `notification.js`：

```javascript
import notification from '@/utils/notification';

// 基础用法
notification.success('应用安装成功');
notification.error('应用安装失败');
notification.warning('存储空间不足');
notification.info('有新版本可用');

// 完整配置
notification.show({
    type: 'success',
    message: '应用安装成功',
    title: '安装完成',  // 可选，默认使用类型对应标题
    module: 'appList',   // 可选，用于标识来源模块
    details: { appId: 'xxx' },  // 可选，额外详情
    duration: 3000  // 可选，覆盖默认时长
});
```

#### 3. 长时间任务进度 → FileTaskPanel

**适用场景**：
- 文件下载
- 应用打包
- 批量导入/导出

**特点**：
- 固定面板显示
- 支持进度条
- 可取消操作

**注意**：FileTaskPanel 已有独立的进度反馈机制，无需额外通知。

#### 4. 需用户确认 → ElMessageBox

**适用场景**：
- 删除确认
- 覆盖确认
- 危险操作二次确认

**特点**：
- 模态对话框
- 阻塞用户操作
- 需用户主动选择

**代码示例**：
```javascript
import { ElMessageBox } from 'element-plus';

await ElMessageBox.confirm('确定要删除该应用吗？此操作不可撤销。', '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
});
```

#### 5. 非关键提示 → ElMessage（可选保留）

**适用场景**：
- 轻微提示，无需用户关注
- 自动恢复的状态提示
- 网络状态变化等临时信息

**特点**：
- 轻量显示
- 自动消失
- 不在操作历史中记录

**注意**：如果通知内容可能对用户有价值，建议使用 `ElNotification`。

## 操作历史记录规范

### 记录范围

以下操作**应记录**到操作历史：

| 模块 | 操作 | 类型 |
|------|------|------|
| appList | 应用安装成功/失败 | success/error |
| appList | 应用卸载成功/失败 | success/error |
| appList | 应用启动成功/失败 | success/error |
| appList | 应用停止成功/失败 | success/error |
| repo | 仓库添加成功/失败 | success/error |
| repo | 仓库删除成功/失败 | success/error |
| repo | 仓库同步完成 | success/warning |
| settings | 设置保存成功 | success |
| update | 检查更新完成 | info |
| update | 发现新版本 | info |
| update | 更新下载完成 | success |
| file-task | 文件导入完成 | success |
| file-task | 文件导出完成 | success |

以下情况**不记录**：
- 非关键提示（info 级别且无实际意义）
- 自动恢复的临时状态
- 轮询类操作的常规响应

### 记录数据结构

```javascript
{
    _id: 'op_xxxxx',       // 自动生成的唯一ID
    type: 'success',       // success | error | warning | info
    message: '应用安装成功', // 用户可读的消息
    timestamp: 1700000000,  // Unix 时间戳
    module: 'appList',      // 来源模块标识
    details: {             // 可选，额外详情
        appId: 'com.example.app',
        version: '1.0.0'
    }
}
```

### 实现方式

在通知成功后自动记录到操作历史：

```javascript
import notification from '@/utils/notification';
import { useOperationHistoryStore } from '@/stores/operationHistoryStore';

const historyStore = useOperationHistoryStore();

// 操作成功后
notification.success('应用安装成功');
historyStore.addRecord({
    type: 'success',
    message: '应用安装成功',
    module: 'appList',
    details: { appId: 'com.example.app' }
});

// 操作失败后
notification.error('应用安装失败');
historyStore.addRecord({
    type: 'error',
    message: '应用安装失败',
    module: 'appList',
    details: { appId: 'com.example.app', error: error.message }
});
```

**注意**：`notification.js` 目前未自动记录操作历史，后续迭代可考虑集成。

## 界面交互规范

### 操作历史入口

- **位置**：左下角浮动图标（📋 图标）
- **行为**：可拖动，记忆位置
- **点击**：图标隐藏 → 弹层显示

### 弹层设计

- **布局**：占满窗口，四周留边距
- **关闭**：右上角关闭按钮，点击后图标恢复显示
- **内容**：
  - 操作历史列表（按时间倒序）
  - 支持按模块/类型筛选
  - 支持手动清理

### 容量管理

- **默认限制**：30 天 / 200MB
- **自动清理**：超出限制时自动清理最旧记录
- **手动清理**：用户在操作历史面板中可主动清理

## 现有 ElMessage 替换计划

以下文件中的 ElMessage 调用应逐步替换：

| 文件 | 优先级 | 说明 |
|------|--------|------|
| `src/components/*.vue` | 高 | 组件中的通知调用 |
| `src/views/*.vue` | 高 | 页面级通知调用 |
| `src/stores/*.js` | 中 | Store 中的通知调用 |

### 替换检查清单

在修改每个文件时，检查以下问题：

1. [ ] 这是操作结果反馈吗？→ 使用 `notification.success/error`
2. [ ] 这是长时间任务吗？→ 使用 `FileTaskPanel`
3. [ ] 需要用户确认吗？→ 使用 `ElMessageBox`
4. [ ] 只是轻微提示吗？→ 可保留 `ElMessage`

### 替换示例

**Before**：
```javascript
import { ElMessage } from 'element-plus';

ElMessage.success('保存成功');
```

**After**：
```javascript
import notification from '@/utils/notification';

notification.success('保存成功');
```

## 相关文档

- [变更记录：操作历史功能](./changes/active/operation-history.md)
- [API 文档](./development/API.md)
- [组件开发指南](./development/APP_DEV.md)

---

*文档版本：1.0*
*最后更新：2026-05-17*
