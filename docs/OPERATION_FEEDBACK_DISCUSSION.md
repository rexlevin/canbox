# 操作反馈与用户体验改进讨论稿

> 创建时间：2026-04-04
> 状态：讨论中，未实现
> 优先级：P0（核心体验问题）

---

## 背景

用户在使用 Canbox 进行以下操作时，缺乏视觉反馈：
- 打包应用 (pack-asar)
- 下载应用 (download)
- 添加仓库 (add repo)

这些问题导致用户不确定操作是否在进行中、是否卡住、是否完成。

---

## 当前状态

### 已有的超时机制

| 操作类型 | 超时时间 | 位置 |
|---------|---------|------|
| 仓库验证 | 10秒 | `modules/ipc/repoIpcHandler.js` |
| 仓库下载 | 5秒 | `modules/ipc/repoIpcHandler.js` |
| 文件下载 | 30秒 | `modules/utils/repoUtils.js` |
| GitHub API | 10秒 | `modules/auto-update/githubReleaseProvider.js` |
| 自动更新检查 | 30秒 | `modules/auto-update/autoUpdateManager.js` |
| 子进程通信 | 30秒 | `modules/childprocess/processBridge.js` |

**超时处理示例：**
```javascript
// repoIpcHandler.js
const response = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': '...' }
});

if (error.code === 'ECONNABORTED') {
    throw new Error('NetworkTimeout');
}
```

### 缺失的反馈机制

| 操作 | 问题 | 影响 |
|------|------|------|
| pack-asar | 点击后无反馈 | 用户可能重复点击 |
| download app | 无进度条 | 不知道下载进度和剩余时间 |
| add repo | 无进度条 | 不知道是否在下载 |

---

## 第一阶段：立即实现（P0）

### 目标
为所有长时间操作添加基本的视觉反馈，不依赖后端进度数据。

### 实现方案

#### 1. 按钮级 Loading 状态（< 10秒）

适用于：快速操作、验证类操作

```
┌────────────────────────────────────┐
│  [ 打包应用 ]  →  [ ⏳ 打包中... ]  │
│                                    │
│  Naive UI: button loading prop    │
└────────────────────────────────────┘
```

**实现要点：**
- 使用 `loading` prop 自动禁用按钮
- 显示加载文本
- 操作完成/失败后恢复
- 错误消息通过 `message.error()` 显示

**代码示例：**
```vue
<template>
  <n-button
    :loading="packing"
    @click="handlePack"
  >
    {{ packing ? t('app.packing') : t('app.pack') }}
  </n-button>
</template>

<script setup>
import { ref } from 'vue';
import { useMessage } from 'naive-ui';

const message = useMessage();
const packing = ref(false);

async function handlePack() {
  packing.value = true;
  try {
    await ipc.invoke('pack-asar', { ... });
    message.success(t('app.packSuccess'));
  } catch (error) {
    message.error(error.message);
  } finally {
    packing.value = false;
  }
}
</script>
```

#### 2. 模拟进度（10-60秒）

适用于：下载类操作（axios 已支持 progress 事件，但先用估算）

```
┌──────────────────────────────────────────┐
│  下载应用:  [████████░░░░░░] 60%          │
│  预计剩余时间: 15秒                      │
└──────────────────────────────────────────┘
```

**实现要点：**
- 基于超时时间估算（如 30秒超时）
- 线性或缓动动画
- 避免假进度（不要太快，也不要停在 99%）

**代码示例：**
```vue
<template>
  <n-spin :show="downloading">
    <n-progress
      v-if="downloading"
      type="line"
      :percentage="downloadProgress"
      :status="downloadStatus"
    />
    <span v-if="downloading && estimatedTime">
      {{ t('common.estimatedTime') }}: {{ estimatedTime }}s
    </span>
  </n-spin>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';

const downloading = ref(false);
const downloadProgress = ref(0);
const downloadStatus = ref('default');
const estimatedTime = ref(30); // 基于超时时间
let progressInterval = null;

async function handleDownload() {
  downloading.value = true;
  downloadProgress.value = 0;
  downloadStatus.value = 'default');

  // 启动进度模拟
  const startTime = Date.now();
  progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const progress = Math.min((elapsed / estimatedTime.value) * 100, 95);
    downloadProgress.value = progress;
  }, 200);

  try {
    await ipc.invoke('download-app', { ... });
    downloadProgress.value = 100;
    downloadStatus.value = 'success');
  } catch (error) {
    downloadStatus.value = 'error');
    throw error;
  } finally {
    clearInterval(progressInterval);
    setTimeout(() => {
      downloading.value = false;
      downloadProgress.value = 0;
    }, 1000);
  }
}

onUnmounted(() => {
  clearInterval(progressInterval);
});
</script>
```

#### 3. 错误处理优化

当前超时错误消息示例（已实现）：
```javascript
// AppRepos.vue
const errorTypeMap = {
  'NetworkTimeout': 'networkTimeout',
  'InvalidGitRepo': 'invalidGitRepo',
  // ...
};
```

**改进点：**
- 确保所有超时都有明确的错误消息
- 区分网络超时、服务器错误、本地错误
- 提供重试按钮

---

## 第二阶段：真实进度（P1）

### 目标
从后端获取真实的进度数据，支持精确的百分比显示和剩余时间计算。

### 实现方案

#### 1. 下载进度（axios 进度事件）

axios 支持进度事件，但目前未使用：

```javascript
// 当前实现（repoIpcHandler.js:437）
const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 5000,
});

// 改进后实现
const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 0, // 移除超时，改用进度控制
    onDownloadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentage = Math.round((loaded / total) * 100);

        // 通过 IPC 通知前端
        mainWindow.webContents.send('download-progress', {
            taskId,
            loaded,
            total,
            percentage
        });
    },
});
```

**前端监听：**
```javascript
import { ref } from 'vue';

const downloadProgress = ref(0);
const downloadSize = ref('0 MB / 0 MB');

ipc.on('download-progress', (event, data) => {
    downloadProgress.value = data.percentage;
    downloadSize.value = formatSize(data.loaded) + ' / ' + formatSize(data.total);
});

function formatSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
```

#### 2. Pack 进度（挑战）

**问题：** `buildAsar()` 是黑盒 Promise，无法获取进度。

**可能的解决方案：**

| 方案 | 可行性 | 复杂度 | 备注 |
|------|--------|--------|------|
| 监听文件系统变化 | ⭐⭐ | 高 | 通过递归监控目录，不准确 |
| 分阶段估算 | ⭐⭐⭐ | 中 | 基于步骤数（压缩、签名等） |
| 替换打包库 | ⭐⭐⭐⭐ | 高 | 找/写支持进度回调的库 |
| 接受无进度 | ⭐ | 低 | 只显示 loading 状态 |

**推荐：分阶段估算**
```javascript
async function packWithProgress() {
    const stages = [
        { name: '准备文件', weight: 10 },
        { name: '压缩资源', weight: 40 },
        { name: '生成 ASAR', weight: 40 },
        { name: '签名校验', weight: 10 },
    ];

    let progress = 0;
    for (const stage of stages) {
        mainWindow.webContents.send('pack-progress', {
            stage: stage.name,
            progress: progress,
            message: `${stage.name}...`
        });

        // 执行实际操作
        await performStage(stage.name);

        progress += stage.weight;
        mainWindow.webContents.send('pack-progress', {
            stage: stage.name,
            progress: progress,
            message: `${stage.name} 完成`
        });
    }
}
```

---

## 第三阶段：并发与取消（P2）

### 目标
支持多个并行操作，以及用户主动取消操作。

### 实现方案

#### 1. 并发任务管理

**Pinia Store 设计：**
```javascript
// stores/taskStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useTaskStore = defineStore('task', () => {
    const tasks = ref({});

    function addTask(taskId, type, metadata) {
        tasks.value[taskId] = {
            id: taskId,
            type, // 'pack' | 'download' | 'add-repo'
            status: 'pending',
            progress: 0,
            startTime: Date.now(),
            metadata,
        };
    }

    function updateProgress(taskId, progress, message) {
        if (tasks.value[taskId]) {
            tasks.value[taskId].progress = progress;
            tasks.value[taskId].message = message;
        }
    }

    function completeTask(taskId, success = true, error = null) {
        if (tasks.value[taskId]) {
            tasks.value[taskId].status = success ? 'completed' : 'failed';
            tasks.value[taskId].endTime = Date.now();
            tasks.value[taskId].error = error;
        }
    }

    function removeTask(taskId) {
        delete tasks.value[taskId];
    }

    const activeTasks = computed(() =>
        Object.values(tasks.value).filter(t => t.status === 'pending' || t.status === 'running')
    );

    const completedTasks = computed(() =>
        Object.values(tasks.value).filter(t => t.status === 'completed' || t.status === 'failed')
    );

    return { tasks, addTask, updateProgress, completeTask, removeTask, activeTasks, completedTasks };
});
```

#### 2. 任务栏 UI

```
┌────────────────────────────────────────────────────┐
│  📋 任务                                            │
├────────────────────────────────────────────────────┤
│  📦 打包 MyApp                  [████████░░] 80%  │
│     正在压缩资源...                                 │
│  ⏸ 暂停  ❌ 取消                                    │
├────────────────────────────────────────────────────┤
│  ⬇️ 下载 CoolApp               [██████████] 100% ✅│
│     完成 (12.3 MB / 12.3 MB)                        │
├────────────────────────────────────────────────────┤
│  ➕ 添加 awesome-repo            [████░░░░░░] 40%   │
│     正在下载 app.json...                            │
└────────────────────────────────────────────────────┘
```

#### 3. 取消机制

**AbortController 模式：**

```javascript
// 后端
const abortControllers = new Map();

ipcMain.handle('download-app', async (event, { url, taskId }) => {
    const controller = new AbortController();
    abortControllers.set(taskId, controller);

    try {
        const response = await axios.get(url, {
            responseType: 'stream',
            signal: controller.signal,
            onDownloadProgress: (progressEvent) => {
                // 进度回调
            },
        });

        // 处理下载...

    } catch (error) {
        if (error.name === 'AbortError') {
            logger.info(`下载已取消: ${taskId}`);
            throw new Error('UserCancelled');
        }
        throw error;
    } finally {
        abortControllers.delete(taskId);
    }
});

ipcMain.handle('cancel-task', async (event, { taskId }) => {
    const controller = abortControllers.get(taskId);
    if (controller) {
        controller.abort();
    }
});
```

**前端：**
```vue
<template>
  <n-button @click="handleCancel">
    {{ t('common.cancel') }}
  </n-button>
</template>

<script setup>
async function handleCancel() {
  await ipc.invoke('cancel-task', { taskId: currentTask.value.id });
  message.info(t('common.taskCancelled'));
}
</script>
```

**取消 UI 变体：**

| 变体 | 使用场景 | 示例 |
|------|---------|------|
| 按钮变形 | 操作中的卡片 | [⏸ 暂停] → [▶️ 继续] |
| 任务栏 | 全局任务管理 | 见上方任务栏 |
| 确认对话框 | 长时间操作 | "确定要取消吗？已下载 80%" |

---

## 第四阶段：高级特性（P3）

### 1. 断点续传

保存下载进度，支持中断后继续：

```javascript
// 检查是否有临时文件
const tempFile = `${downloadPath}.tmp`;
const downloadedBytes = fs.existsSync(tempFile) ? fs.statSync(tempFile).size : 0;

const response = await axios.get(url, {
    headers: {
        'Range': `bytes=${downloadedBytes}-`,
    },
    onDownloadProgress: (progressEvent) => {
        const total = downloadedBytes + progressEvent.total;
        // 更新进度
    },
});

// 追加写入
fs.appendFileSync(tempFile, response.data);
```

### 2. 速度限制

```javascript
let lastBytes = 0;
let lastTime = Date.now();

onDownloadProgress: (progressEvent) => {
    const now = Date.now();
    const elapsed = now - lastTime;
    const speed = (progressEvent.loaded - lastBytes) / (elapsed / 1000);

    if (speed > MAX_SPEED) {
        // 限流逻辑
        await sleep(THROTTLE_DELAY);
    }

    lastBytes = progressEvent.loaded;
    lastTime = now;
}
```

### 3. 批量操作

支持选中多个应用批量打包/下载：

```
┌────────────────────────────────────────────────────┐
│  ☑️ MyApp           [████████░░] 80%               │
│  ☑️ CoolApp         [██████░░░░] 60%               │
│  ☑️ AwesomeApp      [███░░░░░░░] 30%               │
│                                                      │
│  [⏸ 全部暂停]  [❌ 取消全部]  [📥 全部完成通知]     │
└────────────────────────────────────────────────────┘
```

---

## 技术选型

### UI 组件库
- **当前使用**：Naive UI
- **优势**：内置 `n-spin`, `n-progress`, `n-button` 等组件
- **无迁移成本**

### 状态管理
- **当前使用**：Pinia（已在更新功能中使用）
- **优势**：Vue 3 生态标准，TypeScript 友好

### HTTP 库
- **当前使用**：axios
- **优势**：内置 progress 支持，无需迁移

### IPC 通信
- **当前使用**：electron ipcMain / ipcRenderer
- **优势**：标准 Electron 通信方式

---

## 实施路线图

| 阶段 | 内容 | 优先级 | 预估时间 |
|------|------|--------|---------|
| P0 | 按钮级 loading + 错误处理 | 最高 | 2-4 小时 |
| P0 | 模拟进度（下载/添加仓库） | 最高 | 2-3 小时 |
| P1 | 真实下载进度（axios progress） | 高 | 1-2 小时 |
| P1 | Pack 阶段估算 | 中 | 3-4 小时 |
| P2 | 并发任务管理（Pinia） | 中 | 4-6 小时 |
| P2 | 取消机制（AbortController） | 中 | 2-3 小时 |
| P2 | 任务栏 UI | 中 | 3-4 小时 |
| P3 | 断点续传 | 低 | 4-6 小时 |
| P3 | 速度限制 | 低 | 2-3 小时 |
| P3 | 批量操作 | 低 | 6-8 小时 |

**建议优先顺序：**
1. 先完成 P0（立即改善用户体验）
2. 根据用户反馈决定是否进入 P1
3. P2 和 P3 作为未来增强功能

---

## 风险与未知

### 1. buildAsar() 进度支持
- **风险**：可能无法获取真实进度
- **缓解**：接受估算或显示 "正在打包..."
- **备选**：寻找替代打包库

### 2. 服务器不支持 Range 请求
- **风险**：断点续传无法工作
- **缓解**：检测服务器响应头，优雅降级

### 3. 并发任务过多导致性能问题
- **风险**：同时下载 10+ 个应用
- **缓解**：限制最大并发数（如 3 个）

### 4. 用户取消后的清理
- **风险**：临时文件残留、状态不一致
- **缓解**：完善的 finally 清理逻辑

---

## 待确认问题

1. **用户体验优先级**：P0 的按钮 loading 是否足够？还是需要立即进入 P1 的真实进度？
2. **Pack 进度**：用户是否接受 "正在打包..." 这种简单反馈？
3. **任务栏**：是否需要全局任务栏？还是只在卡片内显示进度？
4. **并发限制**：同时允许几个下载任务？（默认建议 3 个）
5. **超时策略**：是否保留现有超时机制？还是改为基于进度的超时？

---

## 参考资料

- [Axios Progress Event](https://axios-http.com/docs/req_config)
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Naive UI Progress](https://www.naiveui.com/en-US/component/progress)
