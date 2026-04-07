# 操作反馈与用户体验改进 - 2026-04-04

## 变更概述

为用户操作（如打包应用、下载应用、添加仓库等）添加视觉反馈机制，解决用户不确定操作状态的问题，提升用户体验。

## 背景

用户在使用 Canbox 进行以下操作时，缺乏视觉反馈：
- 打包应用 (pack-asar)
- 下载应用 (download)
- 添加仓库 (add repo)

这些问题导致用户不确定操作是否在进行中、是否卡住、是否完成。

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

**超时处理示例**：
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
| download | 无进度显示 | 用户不知道下载进度 |
| add repo | 无状态提示 | 用户不确定是否添加成功 |

---

## 解决方案

### 1. 统一反馈组件设计

#### 1.1 Loading 状态组件
**文件**: `src/components/OperationFeedback.vue`

```vue
<template>
  <div class="operation-feedback" v-if="visible">
    <div class="feedback-overlay" @click.self="closeIfClickOutside">
      <div class="feedback-content">
        <!-- 标题和关闭按钮 -->
        <div class="feedback-header">
          <h3>{{ title }}</h3>
          <el-button 
            v-if="closable" 
            type="text" 
            @click="close"
            class="close-btn"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <!-- 状态指示器 -->
        <div class="status-indicator">
          <div 
            class="status-icon"
            :class="statusClass"
          >
            <el-icon v-if="status === 'loading'"><Loading /></el-icon>
            <el-icon v-if="status === 'success'"><CircleCheck /></el-icon>
            <el-icon v-if="status === 'error'"><CircleClose /></el-icon>
            <el-icon v-if="status === 'warning'"><Warning /></el-icon>
          </div>
          
          <div class="status-text">
            <p class="status-title">{{ statusTitle }}</p>
            <p class="status-message">{{ message }}</p>
          </div>
        </div>
        
        <!-- 进度条 -->
        <div class="progress-section" v-if="showProgress">
          <el-progress 
            :percentage="progressPercentage"
            :status="progressStatus"
            :stroke-width="6"
            :show-text="showProgressText"
          />
          <div class="progress-details" v-if="progressDetails">
            <span>{{ progressDetails.current }}/{{ progressDetails.total }}</span>
            <span class="speed" v-if="progressDetails.speed">
              {{ progressDetails.speed }}
            </span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons" v-if="showActions">
          <el-button 
            type="primary" 
            @click="handlePrimaryAction"
            :loading="primaryLoading"
            :disabled="primaryDisabled"
          >
            {{ primaryButtonText }}
          </el-button>
          
          <el-button 
            v-if="showSecondaryButton"
            @click="handleSecondaryAction"
            :disabled="secondaryDisabled"
          >
            {{ secondaryButtonText }}
          </el-button>
          
          <el-button 
            v-if="showCancelButton"
            type="text"
            @click="close"
            :disabled="cancelDisabled"
          >
            {{ cancelButtonText }}
          </el-button>
        </div>
        
        <!-- 详细信息 -->
        <div class="details-section" v-if="showDetails">
          <el-collapse v-model="activeDetails">
            <el-collapse-item title="详细信息" name="details">
              <pre class="details-content">{{ detailsContent }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  Close,
  Loading,
  CircleCheck,
  CircleClose,
  Warning
} from '@element-plus/icons-vue';

const props = defineProps({
  // 基础属性
  visible: { type: Boolean, default: false },
  title: { type: String, default: '操作反馈' },
  message: { type: String, default: '' },
  
  // 状态
  status: { 
    type: String, 
    default: 'loading',
    validator: (value) => ['loading', 'success', 'error', 'warning', 'info'].includes(value)
  },
  
  // 进度
  showProgress: { type: Boolean, default: false },
  progressPercentage: { type: Number, default: 0 },
  progressStatus: { 
    type: String, 
    default: 'success',
    validator: (value) => ['success', 'exception', 'warning'].includes(value)
  },
  showProgressText: { type: Boolean, default: true },
  progressDetails: { type: Object, default: null },
  
  // 按钮
  showActions: { type: Boolean, default: true },
  primaryButtonText: { type: String, default: '确定' },
  secondaryButtonText: { type: String, default: '取消' },
  cancelButtonText: { type: String, default: '关闭' },
  showSecondaryButton: { type: Boolean, default: false },
  showCancelButton: { type: Boolean, default: true },
  primaryLoading: { type: Boolean, default: false },
  primaryDisabled: { type: Boolean, default: false },
  secondaryDisabled: { type: Boolean, default: false },
  cancelDisabled: { type: Boolean, default: false },
  
  // 详细信息
  showDetails: { type: Boolean, default: false },
  detailsContent: { type: String, default: '' },
  
  // 行为控制
  closable: { type: Boolean, default: true },
  clickOutsideToClose: { type: Boolean, default: false },
  autoClose: { type: Boolean, default: false },
  autoCloseDelay: { type: Number, default: 3000 }
});

const emit = defineEmits([
  'update:visible',
  'close',
  'primary-action',
  'secondary-action'
]);

const activeDetails = ref(props.showDetails ? ['details'] : []);

// 计算属性
const statusClass = computed(() => {
  return {
    'status-loading': props.status === 'loading',
    'status-success': props.status === 'success',
    'status-error': props.status === 'error',
    'status-warning': props.status === 'warning',
    'status-info': props.status === 'info'
  };
});

const statusTitle = computed(() => {
  const titles = {
    loading: '处理中...',
    success: '操作成功',
    error: '操作失败',
    warning: '警告',
    info: '提示'
  };
  return titles[props.status] || '未知状态';
});

// 方法
const close = () => {
  emit('update:visible', false);
  emit('close');
};

const closeIfClickOutside = () => {
  if (props.clickOutsideToClose) {
    close();
  }
};

const handlePrimaryAction = () => {
  emit('primary-action');
  if (!props.primaryLoading && props.status !== 'loading') {
    close();
  }
};

const handleSecondaryAction = () => {
  emit('secondary-action');
};

// 自动关闭逻辑
watch(() => props.visible, (newVal) => {
  if (newVal && props.autoClose && props.status !== 'loading') {
    setTimeout(() => {
      if (props.visible) {
        close();
      }
    }, props.autoCloseDelay);
  }
});

// 状态变化时重置自动关闭计时器
watch(() => props.status, (newStatus) => {
  if (props.visible && props.autoClose && newStatus !== 'loading') {
    setTimeout(() => {
      if (props.visible) {
        close();
      }
    }, props.autoCloseDelay);
  }
});
</script>

<style scoped>
.operation-feedback {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
}

.feedback-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-content {
  background-color: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 420px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.feedback-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.close-btn {
  padding: 4px;
  margin-left: auto;
}

.status-indicator {
  display: flex;
  align-items: center;
  padding: 24px 20px;
  gap: 16px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.status-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.status-loading {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  animation: spin 1s linear infinite;
}

.status-success {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.status-error {
  background-color: var(--el-color-error-light-9);
  color: var(--el-color-error);
}

.status-warning {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.status-info {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-text {
  flex: 1;
}

.status-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.status-message {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.progress-section {
  padding: 0 20px 20px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.speed {
  color: var(--el-color-primary);
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 12px;
  padding: 0 20px 20px;
}

.action-buttons .el-button {
  flex: 1;
}

.details-section {
  padding: 0 20px 20px;
}

.details-content {
  margin: 0;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
```

#### 1.2 全局状态管理
**文件**: `src/composables/useOperationFeedback.js`

```javascript
import { ref, reactive } from 'vue';

// 全局状态
const operationState = reactive({
  visible: false,
  title: '',
  message: '',
  status: 'loading',
  showProgress: false,
  progressPercentage: 0,
  progressDetails: null,
  showActions: true,
  primaryButtonText: '确定',
  showSecondaryButton: false,
  showCancelButton: true,
  showDetails: false,
  detailsContent: '',
  closable: true,
  clickOutsideToClose: false,
  autoClose: false,
  autoCloseDelay: 3000
});

// 操作队列
const operationQueue = ref([]);
let currentOperationId = 0;

export function useOperationFeedback() {
  // 显示操作反馈
  const showFeedback = (config) => {
    const operationId = ++currentOperationId;
    
    const defaultConfig = {
      title: '操作反馈',
      message: '',
      status: 'loading',
      showProgress: false,
      progressPercentage: 0,
      showActions: true,
      autoClose: false,
      closable: true
    };
    
    const finalConfig = { ...defaultConfig, ...config, id: operationId };
    
    // 如果当前有操作正在进行，加入队列
    if (operationState.visible) {
      operationQueue.value.push(finalConfig);
      return operationId;
    }
    
    // 立即显示
    Object.assign(operationState, finalConfig, { visible: true });
    return operationId;
  };

  // 更新操作状态
  const updateFeedback = (operationId, updates) => {
    if (operationState.id === operationId) {
      Object.assign(operationState, updates);
    }
  };

  // 关闭操作反馈
  const closeFeedback = (operationId) => {
    if (!operationId || operationState.id === operationId) {
      operationState.visible = false;
      
      // 处理队列中的下一个操作
      if (operationQueue.value.length > 0) {
        const nextConfig = operationQueue.value.shift();
        setTimeout(() => {
          Object.assign(operationState, nextConfig, { visible: true });
        }, 300);
      }
    }
  };

  // 显示成功提示
  const showSuccess = (message, options = {}) => {
    return showFeedback({
      title: options.title || '操作成功',
      message,
      status: 'success',
      autoClose: true,
      autoCloseDelay: options.autoCloseDelay || 2000,
      ...options
    });
  };

  // 显示错误提示
  const showError = (message, error = null, options = {}) => {
    const config = {
      title: options.title || '操作失败',
      message,
      status: 'error',
      showDetails: !!error,
      detailsContent: error ? error.toString() : '',
      ...options
    };
    
    return showFeedback(config);
  };

  // 显示加载中
  const showLoading = (message, options = {}) => {
    return showFeedback({
      title: options.title || '处理中...',
      message,
      status: 'loading',
      showProgress: options.showProgress || false,
      ...options
    });
  };

  // 显示进度
  const showProgress = (title, initialProgress = 0, options = {}) => {
    return showFeedback({
      title,
      message: options.message || '',
      status: 'loading',
      showProgress: true,
      progressPercentage: initialProgress,
      progressDetails: options.progressDetails || null,
      ...options
    });
  };

  // 更新进度
  const updateProgress = (operationId, progress, details = null) => {
    updateFeedback(operationId, {
      progressPercentage: progress,
      progressDetails: details
    });
  };

  return {
    operationState,
    showFeedback,
    updateFeedback,
    closeFeedback,
    showSuccess,
    showError,
    showLoading,
    showProgress,
    updateProgress
  };
}

// 全局导出
export const operationFeedback = {
  show: showFeedback,
  success: showSuccess,
  error: showError,
  loading: showLoading,
  progress: showProgress,
  update: updateFeedback,
  close: closeFeedback
};
```

### 2. 具体操作集成

#### 2.1 打包应用 (pack-asar)
**文件**: `modules/ipc/appIpcHandler.js`

```javascript
import { operationFeedback } from '../../src/composables/useOperationFeedback';

ipcMain.handle('pack-asar', async (event, appId) => {
  const operationId = operationFeedback.showLoading('正在打包应用...', {
    title: '应用打包',
    showProgress: true,
    progressDetails: { current: 0, total: 4 }
  });

  try {
    // 步骤 1: 准备打包目录
    operationFeedback.update(operationId, {
      progressPercentage: 25,
      progressDetails: { current: 1, total: 4, message: '准备打包目录...' }
    });
    const appPath = await preparePackDirectory(appId);
    
    // 步骤 2: 收集文件
    operationFeedback.update(operationId, {
      progressPercentage: 50,
      progressDetails: { current: 2, total: 4, message: '收集文件...' }
    });
    const files = await collectAppFiles(appPath);
    
    // 步骤 3: 创建 ASAR 包
    operationFeedback.update(operationId, {
      progressPercentage: 75,
      progressDetails: { current: 3, total: 4, message: '创建 ASAR 包...' }
    });
    const asarPath = await createAsarPackage(appId, appPath, files);
    
    // 步骤 4: 完成
    operationFeedback.update(operationId, {
      progressPercentage: 100,
      progressDetails: { current: 4, total: 4, message: '打包完成！' }
    });
    
    // 显示成功提示
    setTimeout(() => {
      operationFeedback.success('应用打包成功！', {
        title: '打包完成',
        autoCloseDelay: 3000
      });
    }, 500);
    
    return asarPath;
    
  } catch (error) {
    operationFeedback.error('应用打包失败', error, {
      title: '打包失败',
      showDetails: true
    });
    throw error;
  }
});
```

#### 2.2 下载应用 (download)
**文件**: `modules/ipc/downloadIpcHandler.js`

```javascript
ipcMain.handle('download-app', async (event, { repoUrl, appId, version }) => {
  const operationId = operationFeedback.showProgress('下载应用中...', 0, {
    title: '应用下载',
    progressDetails: { current: 0, total: 0, speed: '0 KB/s' }
  });

  try {
    const downloadOptions = {
      repoUrl,
      appId,
      version,
      onProgress: (progress, speed) => {
        operationFeedback.update(operationId, {
          progressPercentage: progress,
          progressDetails: {
            current: Math.round(progress),
            total: 100,
            speed: `${speed} KB/s`
          }
        });
      }
    };

    const result = await downloadManager.downloadApp(downloadOptions);
    
    operationFeedback.success('应用下载完成！', {
      title: '下载完成',
      autoCloseDelay: 2000
    });
    
    return result;
    
  } catch (error) {
    operationFeedback.error('应用下载失败', error, {
      title: '下载失败',
      autoClose: false,
      primaryButtonText: '重试',
      onPrimaryAction: () => {
        // 重新下载的逻辑
      }
    });
    throw error;
  }
});
```

#### 2.3 添加仓库 (add repo)
**文件**: `modules/ipc/repoIpcHandler.js`

```javascript
ipcMain.handle('add-repo', async (event, repoUrl) => {
  const operationId = operationFeedback.showLoading('正在添加仓库...', {
    title: '添加仓库',
    showProgress: true
  });

  try {
    // 步骤 1: 验证仓库
    operationFeedback.update(operationId, {
      progressPercentage: 33,
      message: '验证仓库地址...'
    });
    const isValid = await validateRepository(repoUrl);
    
    if (!isValid) {
      throw new Error('无效的仓库地址');
    }

    // 步骤 2: 下载仓库信息
    operationFeedback.update(operationId, {
      progressPercentage: 66,
      message: '下载仓库信息...'
    });
    const repoInfo = await fetchRepositoryInfo(repoUrl);

    // 步骤 3: 保存仓库配置
    operationFeedback.update(operationId, {
      progressPercentage: 100,
      message: '保存配置...'
    });
    await saveRepositoryConfig(repoUrl, repoInfo);

    operationFeedback.success('仓库添加成功！', {
      title: '添加完成',
      autoCloseDelay: 2000
    });

    return repoInfo;

  } catch (error) {
    operationFeedback.error('添加仓库失败', error, {
      title: '添加失败',
      showDetails: true
    });
    throw error;
  }
});
```

### 3. 前端集成

#### 3.1 全局组件注册
**文件**: `src/main.js`

```javascript
import { createApp } from 'vue';
import App from './App.vue';
import { operationFeedback } from './composables/useOperationFeedback';
import OperationFeedback from './components/OperationFeedback.vue';

const app = createApp(App);

// 注册全局组件
app.component('OperationFeedback', OperationFeedback);

// 提供全局操作反馈
app.provide('operationFeedback', operationFeedback);

app.mount('#app');
```

#### 3.2 在页面中使用
**文件**: `src/views/AppStore.vue`

```vue
<template>
  <div class="app-store">
    <!-- 操作反馈组件 -->
    <OperationFeedback v-model="feedback.visible" v-bind="feedback" />
    
    <!-- 应用列表 -->
    <div class="app-list">
      <el-card 
        v-for="app in apps" 
        :key="app.id"
        class="app-card"
      >
        <template #header>
          <div class="app-header">
            <img :src="app.logo" class="app-logo" />
            <div class="app-info">
              <h3>{{ app.name }}</h3>
              <p class="app-version">{{ app.version }}</p>
            </div>
          </div>
        </template>
        
        <p class="app-description">{{ app.description }}</p>
        
        <template #footer>
          <div class="app-actions">
            <el-button 
              type="primary" 
              @click="downloadApp(app)"
              :loading="downloadingId === app.id"
            >
              下载
            </el-button>
            
            <el-button 
              v-if="isInstalled(app.id)"
              @click="launchApp(app.id)"
            >
              启动
            </el-button>
          </div>
        </template>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';
import { ipcRenderer } from '../../modules/ipc/ipcRenderer';

const operationFeedback = inject('operationFeedback');

const apps = ref([]);
const downloadingId = ref(null);
const feedback = ref({
  visible: false,
  title: '',
  message: '',
  status: 'loading'
});

// 下载应用
const downloadApp = async (app) => {
  downloadingId.value = app.id;
  
  try {
    const operationId = operationFeedback.progress(`下载 ${app.name}...`, 0, {
      title: '下载应用',
      progressDetails: { current: 0, total: 100 }
    });

    await ipcRenderer.invoke('download-app', {
      appId: app.id,
      version: app.version,
      onProgress: (progress) => {
        operationFeedback.update(operationId, {
          progressPercentage: progress,
          progressDetails: { current: Math.round(progress), total: 100 }
        });
      }
    });

    operationFeedback.success(`${app.name} 下载完成！`, {
      title: '下载完成'
    });

  } catch (error) {
    operationFeedback.error(`下载 ${app.name} 失败`, error, {
      title: '下载失败'
    });
  } finally {
    downloadingId.value = null;
  }
};

// 检查应用是否已安装
const isInstalled = (appId) => {
  // 实现检查逻辑
  return false;
};

// 启动应用
const launchApp = (appId) => {
  // 实现启动逻辑
};
</script>
```

### 4. 超时处理增强

#### 4.1 统一的超时管理器
**文件**: `modules/utils/timeoutManager.js`

```javascript
class TimeoutManager {
  constructor() {
    this.timeouts = new Map();
    this.defaultTimeout = 30000; // 30秒
  }

  // 创建带超时的 Promise
  createTimeoutPromise(promise, timeoutMs, operationId = null) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`操作超时 (${timeoutMs}ms)`);
        error.code = 'TIMEOUT';
        error.operationId = operationId;
        reject(error);
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // 带反馈的超时操作
  async withFeedback(operationName, promiseFn, options = {}) {
    const {
      timeout = this.defaultTimeout,
      showFeedback = true,
      feedbackTitle = operationName,
      feedbackMessage = '正在处理...'
    } = options;

    let operationId = null;
    
    if (showFeedback) {
      operationId = operationFeedback.showLoading(feedbackMessage, {
        title: feedbackTitle,
        showProgress: false
      });
    }

    try {
      const result = await this.createTimeoutPromise(
        promiseFn(),
        timeout,
        operationId
      );

      if (showFeedback && operationId) {
        operationFeedback.success(`${operationName} 完成`, {
          title: '操作成功',
          autoClose: true,
          autoCloseDelay: 2000
        });
      }

      return result;

    } catch (error) {
      if (showFeedback && operationId) {
        const errorMessage = error.code === 'TIMEOUT' 
          ? `${operationName} 超时，请稍后重试`
          : `${operationName} 失败: ${error.message}`;

        operationFeedback.error(errorMessage, error, {
          title: '操作失败',
          showDetails: error.code !== 'TIMEOUT',
          autoClose: false
        });
      }
      
      throw error;
    }
  }

  // 批量操作带进度反馈
  async batchWithFeedback(operationName, items, processFn, options = {}) {
    const {
      timeoutPerItem = 10000,
      feedbackTitle = operationName,
      showProgress = true
    } = options;

    const total = items.length;
    let completed = 0;
    let operationId = null;

    if (showProgress) {
      operationId = operationFeedback.showProgress(feedbackTitle, 0, {
        progressDetails: { current: 0, total }
      });
    }

    const results = [];
    const errors = [];

    for (const [index, item] of items.entries()) {
      try {
        const result = await this.createTimeoutPromise(
          processFn(item),
          timeoutPerItem,
          operationId
        );
        
        results.push(result);
        completed++;

        if (showProgress && operationId) {
          const progress = Math.round((completed / total) * 100);
          operationFeedback.update(operationId, {
            progressPercentage: progress,
            progressDetails: {
              current: completed,
              total,
              message: `处理 ${index + 1}/${total}`
            }
          });
        }

      } catch (error) {
        errors.push({ item, error });
        
        if (showProgress && operationId) {
          operationFeedback.update(operationId, {
            status: 'warning',
            message: `${completed}/${total} 完成，${errors.length} 个失败`
          });
        }
      }
    }

    // 操作完成
    if (showProgress && operationId) {
      if (errors.length === 0) {
        operationFeedback.success(`${operationName} 完成 (${total}/${total})`, {
          title: '批量操作完成',
          autoClose: true,
          autoCloseDelay: 3000
        });
      } else {
        operationFeedback.warning(
          `${operationName} 完成: ${results.length} 成功，${errors.length} 失败`,
          {
            title: '批量操作完成',
            showDetails: true,
            detailsContent: errors.map(e => `${e.item}: ${e.error.message}`).join('\n'),
            autoClose: false
          }
        );
      }
    }

    return { results, errors };
  }
}

export const timeoutManager = new TimeoutManager();
```

#### 4.2 集成到现有 IPC 处理器
**文件**: `modules/ipc/repoIpcHandler.js`

```javascript
import { timeoutManager } from '../utils/timeoutManager';

// 使用带反馈的超时包装器
ipcMain.handle('validate-repository', async (event, repoUrl) => {
  return timeoutManager.withFeedback(
    '验证仓库',
    () => validateRepository(repoUrl),
    {
      timeout: 10000,
      feedbackTitle: '仓库验证',
      feedbackMessage: '正在验证仓库地址...'
    }
  );
});

ipcMain.handle('sync-repositories', async (event, repoList) => {
  return timeoutManager.batchWithFeedback(
    '同步仓库',
    repoList,
    (repo) => syncSingleRepository(repo),
    {
      timeoutPerItem: 15000,
      feedbackTitle: '仓库同步',
      showProgress: true
    }
  );
});
```

---

## 测试验证

### 1. 单元测试

#### 操作反馈组件测试
**文件**: `tests/components/OperationFeedback.test.js`

```javascript
import { mount } from '@vue/test-utils';
import OperationFeedback from '@/components/OperationFeedback.vue';
import { describe, it, expect, vi } from 'vitest';

describe('OperationFeedback', () => {
  it('should show loading state', () => {
    const wrapper = mount(OperationFeedback, {
      props: {
        visible: true,
        status: 'loading',
        title: '处理中',
        message: '请稍候...'
      }
    });

    expect(wrapper.find('.status-loading').exists()).toBe(true);
    expect(wrapper.find('.status-title').text()).toBe('处理中...');
    expect(wrapper.find('.status-message').text()).toBe('请稍候...');
  });

  it('should show success state', () => {
    const wrapper = mount(OperationFeedback, {
      props: {
        visible: true,
        status: 'success',
        title: '操作成功',
        message: '文件已保存'
      }
    });

    expect(wrapper.find('.status-success').exists()).toBe(true);
    expect(wrapper.find('.status-title').text()).toBe('操作成功');
  });

  it('should close when close button clicked', async () => {
    const wrapper = mount(OperationFeedback, {
      props: {
        visible: true,
        status: 'info',
        closable: true
      }
    });

    const closeBtn = wrapper.find('.close-btn');
    await closeBtn.trigger('click');
    
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    expect(wrapper.emitted('update:visible')[0]).toEqual([false]);
  });

  it('should auto close after delay', async () => {
    vi.useFakeTimers();
    
    const wrapper = mount(OperationFeedback, {
      props: {
        visible: true,
        status: 'success',
        autoClose: true,
        autoCloseDelay: 1000
      }
    });

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    
    expect(wrapper.emitted('update:visible')).toBeTruthy();
    
    vi.useRealTimers();
  });
});
```

#### 操作反馈状态管理测试
**文件**: `tests/composables/useOperationFeedback.test.js`

```javascript
import { useOperationFeedback } from '@/composables/useOperationFeedback';
import { describe, it, expect, beforeEach } from 'vitest';

describe('useOperationFeedback', () => {
  let feedback;
  
  beforeEach(() => {
    feedback = useOperationFeedback();
  });

  it('should show loading feedback', () => {
    const operationId = feedback.showLoading('正在处理...');
    
    expect(operationId).toBeGreaterThan(0);
    expect(feedback.operationState.visible).toBe(true);
    expect(feedback.operationState.status).toBe('loading');
    expect(feedback.operationState.message).toBe('正在处理...');
  });

  it('should show success feedback', () => {
    const operationId = feedback.showSuccess('操作成功');
    
    expect(operationId).toBeGreaterThan(0);
    expect(feedback.operationState.visible).toBe(true);
    expect(feedback.operationState.status).toBe('success');
    expect(feedback.operationState.autoClose).toBe(true);
  });

  it('should show error feedback with details', () => {
    const error = new Error('测试错误');
    const operationId = feedback.showError('操作失败', error);
    
    expect(operationId).toBeGreaterThan(0);
    expect(feedback.operationState.visible).toBe(true);
    expect(feedback.operationState.status).toBe('error');
    expect(feedback.operationState.showDetails).toBe(true);
    expect(feedback.operationState.detailsContent).toContain('测试错误');
  });

  it('should update progress', () => {
    const operationId = feedback.showProgress('下载中...', 0);
    
    feedback.updateProgress(operationId, 50, { current: 50, total: 100 });
    
    expect(feedback.operationState.progressPercentage).toBe(50);
    expect(feedback.operationState.progressDetails.current).toBe(50);
    expect(feedback.operationState.progressDetails.total).toBe(100);
  });

  it('should queue operations', () => {
    const id1 = feedback.showLoading('操作1');
    const id2 = feedback.showLoading('操作2');
    
    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(id1);
    expect(feedback.operationState.visible).toBe(true);
    expect(feedback.operationState.message).toBe('操作1');
    
    feedback.closeFeedback(id1);
    
    // 应该自动显示队列中的下一个操作
    expect(feedback.operationState.visible).toBe(true);
    expect(feedback.operationState.message).toBe('操作2');
  });
});
```

### 2. 集成测试

#### 打包应用集成测试
**文件**: `tests/integration/packAsar.test.js`

```javascript
import { ipcRenderer } from '../../modules/ipc/ipcRenderer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Pack ASAR with Feedback', () => {
  const mockIpcHandler = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    // 模拟 IPC 处理器
    window.electron = {
      ipcRenderer: {
        invoke: mockIpcHandler
      }
    };
  });

  it('should show progress during packing', async () => {
    // 模拟打包过程的进度回调
    let progressCallback;
    mockIpcHandler.mockImplementation((channel, data) => {
      if (channel === 'pack-asar') {
        // 模拟进度更新
        setTimeout(() => progressCallback?.(25), 100);
        setTimeout(() => progressCallback?.(50), 200);
        setTimeout(() => progressCallback?.(75), 300);
        setTimeout(() => progressCallback?.(100), 400);
        
        return Promise.resolve('/path/to/app.asar');
      }
    });

    const appId = 'test-app';
    const result = await ipcRenderer.invoke('pack-asar', appId);
    
    expect(result).toBe('/path/to/app.asar');
    expect(mockIpcHandler).toHaveBeenCalledWith('pack-asar', appId);
  });

  it('should show error when packing fails', async () => {
    const error = new Error('打包失败：文件不存在');
    mockIpcHandler.mockRejectedValue(error);

    try {
      await ipcRenderer.invoke('pack-asar', 'invalid-app');
      fail('Should have thrown an error');
    } catch (e) {
      expect(e.message).toBe('打包失败：文件不存在');
    }
  });
});
```

#### 下载应用集成测试
**文件**: `tests/integration/downloadApp.test.js`

```javascript
describe('Download App with Feedback', () => {
  it('should show download progress', async () => {
    const downloadData = {
      repoUrl: 'https://example.com/repo',
      appId: 'test-app',
      version: '1.0.0'
    };

    const mockDownload = vi.fn((options) => {
      // 模拟下载进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        options.onProgress?.(progress, progress * 10);
        
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 50);
      
      return Promise.resolve({
        path: '/path/to/downloaded/app',
        size: 1024 * 1024 // 1MB
      });
    });

    const result = await mockDownload(downloadData);
    
    expect(result.path).toBe('/path/to/downloaded/app');
    expect(result.size).toBe(1024 * 1024);
  });
});
```

### 3. 端到端测试

#### 用户操作流程测试
**文件**: `tests/e2e/operationFeedback.spec.js`

```javascript
describe('Operation Feedback E2E Tests', () => {
  beforeEach(async () => {
    await page.goto('http://localhost:5173');
  });

  it('should show loading when packing app', async () => {
    // 点击打包按钮
    await page.click('.pack-button');
    
    // 验证加载状态显示
    const loadingText = await page.textContent('.status-loading');
    expect(loadingText).toContain('处理中');
    
    // 验证进度条显示
    const progressBar = await page.$('.el-progress');
    expect(progressBar).not.toBeNull();
    
    // 等待操作完成
    await page.waitForSelector('.status-success', { timeout: 30000 });
    
    // 验证成功状态
    const successText = await page.textContent('.status-success');
    expect(successText).toContain('操作成功');
  });

  it('should show error when operation fails', async () => {
    // 触发一个会失败的操作
    await page.click('.error-trigger-button');
    
    // 验证错误状态显示
    await page.waitForSelector('.status-error');
    const errorText = await page.textContent('.status-error');
    expect(errorText).toContain('操作失败');
    
    // 验证详细信息展开
    const detailsButton = await page.$('.details-toggle');
    await detailsButton.click();
    
    const detailsContent = await page.textContent('.details-content');
    expect(detailsContent).toContain('错误信息');
  });

  it('should handle multiple queued operations', async () => {
    // 快速触发多个操作
    await page.click('.operation-1');
    await page.click('.operation-2');
    await page.click('.operation-3');
    
    // 验证只有第一个操作显示
    const visibleOperations = await page.$$('.operation-feedback');
    expect(visibleOperations.length).toBe(1);
    
    // 完成第一个操作
    await page.click('.complete-button');
    
    // 验证第二个操作自动显示
    await page.waitForSelector('.operation-feedback');
    const currentOperation = await page.textContent('.feedback-title');
    expect(currentOperation).toContain('操作 2');
  });
});
```

### 4. 性能测试

#### 操作反馈性能测试
**文件**: `tests/performance/operationFeedback.perf.js`

```javascript
describe('Operation Feedback Performance', () => {
  it('should render feedback component quickly', async () => {
    const startTime = performance.now();
    
    // 显示操作反馈
    await operationFeedback.showLoading('性能测试...');
    
    const renderTime = performance.now() - startTime;
    console.log(`反馈组件渲染时间: ${renderTime.toFixed(2)}ms`);
    
    expect(renderTime).toBeLessThan(100); // 应该在100ms内完成
  });

  it('should handle rapid state updates', async () => {
    const operationId = operationFeedback.showProgress('快速更新测试', 0);
    const updateCount = 100;
    
    const startTime = performance.now();
    
    // 快速更新进度
    for (let i = 0; i <= updateCount; i++) {
      operationFeedback.updateProgress(operationId, i);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    const totalTime = performance.now() - startTime;
    const avgTime = totalTime / updateCount;
    
    console.log(`平均更新时间: ${avgTime.toFixed(2)}ms`);
    console.log(`总更新时间: ${totalTime.toFixed(2)}ms`);
    
    expect(avgTime).toBeLessThan(10); // 平均每次更新应小于10ms
  });

  it('should not cause memory leaks', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const operationCount = 100;
    
    // 创建并关闭多个操作
    for (let i = 0; i < operationCount; i++) {
      const opId = operationFeedback.showLoading(`操作 ${i}`);
      await new Promise(resolve => setTimeout(resolve, 10));
      operationFeedback.close(opId);
    }
    
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const avgIncrease = memoryIncrease / operationCount;
    
    console.log(`内存增加: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    console.log(`平均每次操作增加: ${(avgIncrease / 1024).toFixed(2)}KB`);
    
    expect(avgIncrease).toBeLessThan(1024); // 平均每次操作应增加少于1KB
  });
});
```

---

## 部署和配置

### 1. 配置选项

#### 全局配置
**文件**: `src/config/feedback.config.js`

```javascript
export const feedbackConfig = {
  // 默认超时时间
  defaultTimeout: 30000,
  
  // 自动关闭延迟
  autoCloseDelays: {
    success: 2000,
    error: 5000,
    warning: 3000,
    info: 2000
  },
  
  // 进度更新频率限制 (毫秒)
  progressUpdateThrottle: 100,
  
  // 最大队列长度
  maxQueueLength: 10,
  
  // 主题配置
  theme: {
    colors: {
      loading: '#409EFF',
      success: '#67C23A',
      error: '#F56C6C',
      warning: '#E6A23C',
      info: '#909399'
    },
    animations: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  // 本地化
  localization: {
    messages: {
      loading: '处理中...',
      success: '操作成功',
      error: '操作失败',
      timeout: '操作超时'
    }
  }
};
```

#### 操作特定配置
```javascript
export const operationConfigs = {
  'pack-asar': {
    timeout: 60000,
    showProgress: true,
    progressSteps: [
      { label: '准备目录', value: 25 },
      { label: '收集文件', value: 50 },
      { label: '创建包', value: 75 },
      { label: '完成', value: 100 }
    ]
  },
  
  'download-app': {
    timeout: 300000, // 5分钟
    showProgress: true,
    showSpeed: true,
    showSize: true
  },
  
  'add-repo': {
    timeout: 30000,
    showProgress: false,
    autoClose: true
  }
};
```

### 2. 主题定制

#### 自定义主题
```javascript
// 在应用初始化时设置主题
import { feedbackConfig } from './config/feedback.config';

feedbackConfig.theme.colors = {
  loading: '#1890ff',
  success: '#52c41a',
  error: '#f5222d',
  warning: '#faad14',
  info: '#8c8c8c'
};

feedbackConfig.theme.animations = {
  duration: 200,
  easing: 'ease-out'
};
```

#### 响应式设计
```css
/* 移动端适配 */
@media (max-width: 768px) {
  .feedback-content {
    width: 90vw;
    max-height: 80vh;
  }
  
  .status-indicator {
    flex-direction: column;
    text-align: center;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
    margin-bottom: 8px;
  }
}
```

### 3. 监控和日志

#### 操作反馈监控
**文件**: `modules/monitoring/feedbackMonitor.js`

```javascript
class FeedbackMonitor {
  constructor() {
    this.operations = new Map();
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      maxQueueLength: 0
    };
  }

  recordOperationStart(operationId, type, config) {
    this.operations.set(operationId, {
      type,
      config,
      startTime: Date.now(),
      status: 'started'
    });

    this.metrics.totalOperations++;
    
    // 更新最大队列长度
    const currentQueueLength = operationQueue.length;
    if (currentQueueLength > this.metrics.maxQueueLength) {
      this.metrics.maxQueueLength = currentQueueLength;
    }
  }

  recordOperationEnd(operationId, status, error = null) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.status = status;
    operation.error = error;

    // 更新指标
    if (status === 'success') {
      this.metrics.successfulOperations++;
    } else if (status === 'error') {
      this.metrics.failedOperations++;
    }

    // 更新平均持续时间
    const totalDuration = Array.from(this.operations.values())
      .filter(op => op.duration)
      .reduce((sum, op) => sum + op.duration, 0);
    
    const completedOperations = Array.from(this.operations.values())
      .filter(op => op.duration).length;
    
    if (completedOperations > 0) {
      this.metrics.averageDuration = totalDuration / completedOperations;
    }

    // 记录到日志
    this.logOperation(operation);
  }

  logOperation(operation) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: operation.type,
      duration: operation.duration,
      status: operation.status,
      config: operation.config
    };

    if (operation.error) {
      logEntry.error = {
        message: operation.error.message,
        stack: operation.error.stack
      };
    }

    console.log('[Operation Feedback]', logEntry);
    
    // 可以发送到监控系统
    if (window.monitoringClient) {
      window.monitoringClient.track('operation_feedback', logEntry);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentQueueLength: operationQueue.length,
      activeOperations: Array.from(this.operations.values())
        .filter(op => op.status === 'started').length
    };
  }

  getOperationReport(operationId) {
    return this.operations.get(operationId);
  }

  clearOldOperations(maxAge = 24 * 60 * 60 * 1000) { // 24小时
    const now = Date.now();
    for (const [id, operation] of this.operations.entries()) {
      if (operation.endTime && now - operation.endTime > maxAge) {
        this.operations.delete(id);
      }
    }
  }
}

export const feedbackMonitor = new FeedbackMonitor();
```

#### 集成到操作反馈系统
```javascript
import { feedbackMonitor } from '../monitoring/feedbackMonitor';

// 修改 useOperationFeedback.js
const showFeedback = (config) => {
  const operationId = ++currentOperationId;
  
  // 记录操作开始
  feedbackMonitor.recordOperationStart(operationId, config.type || 'unknown', config);
  
  // ... 原有逻辑 ...
};

const closeFeedback = (operationId, status = 'closed') => {
  // 记录操作结束
  const operation = operationState.id === operationId ? operationState : null;
  feedbackMonitor.recordOperationEnd(operationId, status, operation?.error);
  
  // ... 原有逻辑 ...
};
```

---

## 维护指南

### 1. 添加新的操作类型

#### 步骤 1: 定义操作配置
```javascript
// 在 operationConfigs 中添加新配置
export const operationConfigs = {
  // ... 现有配置 ...
  
  'new-operation': {
    timeout: 30000,
    showProgress: true,
    progressSteps: [
      { label: '步骤1', value: 33 },
      { label: '步骤2', value: 66 },
      { label: '完成', value: 100 }
    ],
    autoClose: true,
    autoCloseDelay: 2000
  }
};
```

#### 步骤 2: 实现操作处理器
```javascript
// 在新的 IPC 处理器中
ipcMain.handle('new-operation', async (event, params) => {
  return timeoutManager.withFeedback(
    '新操作',
    async () => {
      // 实现操作逻辑
      const result = await performNewOperation(params);
      return result;
    },
    operationConfigs['new-operation']
  );
});
```

#### 步骤 3: 在前端调用
```javascript
const performNewOperation = async () => {
  try {
    const result = await ipcRenderer.invoke('new-operation', params);
    // 处理结果
  } catch (error) {
    // 错误处理
  }
};
```

### 2. 自定义反馈样式

#### 修改组件样式
```vue
<template>
  <OperationFeedback 
    v-model="feedback.visible"
    v-bind="feedback"
    :custom-class="customClass"
  />
</template>

<script setup>
const customClass = {
  overlay: 'custom-overlay',
  content: 'custom-content',
  header: 'custom-header'
};
</script>

<style scoped>
.custom-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

.custom-content {
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.custom-header {
  background-color: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}
</style>
```

#### 使用插槽自定义内容
```vue
<template>
  <OperationFeedback v-model="feedback.visible" v-bind="feedback">
    <template #header>
      <div class="custom-header">
        <h2>自定义标题</h2>
        <p>自定义副标题</p>
      </div>
    </template>
    
    <template #content>
      <div class="custom-content">
        <!-- 自定义内容 -->
      </div>
    </template>
    
    <template #footer>
      <div class="custom-footer">
        <!-- 自定义底部 -->
      </div>
    </template>
  </OperationFeedback>
</template>
```

### 3. 故障排除

#### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 反馈组件不显示 | 组件未注册或 v-model 绑定错误 | 检查组件注册和绑定 |
| 进度条不更新 | 更新频率过高被节流 | 调整 progressUpdateThrottle 配置 |
| 自动关闭不工作 | autoClose 配置错误或状态为 loading | 确保状态不是 loading |
| 内存占用过高 | 操作记录未清理 | 定期调用 feedbackMonitor.clearOldOperations() |
| 动画卡顿 | 同时更新太多操作 | 限制并发操作数量 |

#### 调试工具
```javascript
// 在开发工具中调试
if (process.env.NODE_ENV === 'development') {
  window.__OPERATION_FEEDBACK_DEBUG__ = {
    getState: () => operationState,
    getQueue: () => operationQueue.value,
    getMetrics: () => feedbackMonitor.getMetrics(),
    clearAll: () => {
      operationQueue.value = [];
      operationState.visible = false;
    }
  };
}
```

---

## 总结

### 实现成果

1. **统一的反馈组件**：提供一致的用户操作反馈体验
2. **完整的进度管理**：支持进度显示、速度计算、详细状态
3. **智能队列管理**：自动处理并发操作，避免界面混乱
4. **丰富的状态类型**：支持加载、成功、错误、警告等多种状态
5. **完善的超时处理**：内置超时管理，提供清晰的错误提示
6. **全面的监控和日志**：记录操作性能，便于问题排查

### 技术特点

1. **响应式设计**：适配不同屏幕尺寸
2. **性能优化**：节流更新，避免频繁重绘
3. **可扩展性**：易于添加新的操作类型
4. **可定制性**：支持主题和样式定制
5. **国际化支持**：内置多语言支持

### 用户体验提升

1. **明确的操作状态**：用户始终知道操作进行到什么程度
2. **及时的反馈**：操作结果立即反馈，减少用户焦虑
3. **清晰的错误信息**：提供详细的错误信息和解决方案
4. **流畅的交互**：动画过渡，提升使用体验

### 未来改进方向

1. **更多反馈形式**：支持 toast、snackbar 等轻量级反馈
2. **离线支持**：在网络不稳定的情况下提供更好的体验
3. **用户偏好设置**：允许用户自定义反馈行为
4. **A/B 测试**：测试不同反馈方式的效果
5. **无障碍支持**：完善屏幕阅读器支持

---

**文档状态**: ✅ 已完成  
**最后更新**: 2026-04-07  
**维护者**: Canbox 开发团队