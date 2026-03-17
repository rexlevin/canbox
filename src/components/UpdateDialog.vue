<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="showCloseButton"
    @close="handleClose"
  >
    <div class="update-dialog-content">
      <!-- 更新信息 -->
      <div v-if="updateInfo" class="update-info">
        <div class="update-header">
          <h3>{{ t('autoUpdate.updateAvailable', { version: updateInfo.version }) }}</h3>
          <div class="update-meta">
            <span>{{ t('autoUpdate.releaseDate') }}: {{ formatDate(updateInfo.releaseDate) }}</span>
            <span v-if="updateInfo.size">
              | {{ t('autoUpdate.updateSize') }}: {{ formatSize(updateInfo.size) }}
            </span>
          </div>
        </div>

        <!-- 更新日志 -->
        <div class="release-notes">
          <h4>{{ t('autoUpdate.releaseNotes') }}</h4>
          <div class="notes-content" v-html="renderReleaseNotes(updateInfo.releaseNotes)"></div>
          <a
            v-if="updateInfo.releaseName"
            href="#"
            @click.prevent="openReleaseUrl"
            class="view-details-link"
          >
            {{ t('autoUpdate.viewDetails') }}
          </a>
        </div>
      </div>

      <!-- 下载进度 -->
      <div v-if="downloadProgress.show" class="download-progress">
        <el-progress
          :percentage="downloadProgress.percent"
          :format="progressFormat"
        />
        <div class="progress-text">{{ downloadProgress.text }}</div>
      </div>

      <!-- 安装进度 -->
      <div v-if="installProgress.show" class="install-progress">
        <el-progress
          :percentage="installProgress.percent"
          :format="progressFormat"
        />
        <div class="progress-text">{{ installProgress.text }}</div>
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="error-message">
        <el-alert
          :title="t('autoUpdate.updateError')"
          type="error"
          :description="error.message"
          :closable="false"
          show-icon
        />
        <div class="error-details" v-if="error.code">
          <span>{{ t('autoUpdate.errorCode') }}: {{ error.code }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <!-- 下载中/安装中 - 显示取消按钮 -->
        <el-button
          v-if="isDownloading || isInstalling"
          @click="handleCancel"
        >
          {{ t('common.cancel') }}
        </el-button>

        <!-- 下载完成 - 显示立即更新按钮 -->
        <el-button
          v-if="isUpdateReady && !isInstalling"
          type="primary"
          @click="handleInstall"
        >
          {{ t('autoUpdate.immediateUpdate') }}
        </el-button>

        <!-- 发现更新 - 显示下载按钮 -->
        <el-button
          v-if="hasUpdate && !isUpdateReady && !isDownloading && !isInstalling"
          type="primary"
          @click="handleDownload"
        >
          {{ t('autoUpdate.immediateDownload') }}
        </el-button>

        <!-- 跳过按钮 -->
        <el-button
          v-if="hasUpdate && !isDownloading && !isInstalling"
          @click="handleSkip"
        >
          {{ t('autoUpdate.skipVersion') }}
        </el-button>

        <!-- 稍后提醒按钮 -->
        <el-button
          v-if="hasUpdate && !isDownloading && !isInstalling"
          @click="handleRemindLater"
        >
          {{ t('autoUpdate.remindLater') }}
        </el-button>

        <!-- 错误 - 显示重试按钮 -->
        <el-button
          v-if="error"
          type="primary"
          @click="handleRetry"
        >
          {{ t('autoUpdate.retry') }}
        </el-button>

        <!-- 关闭按钮 -->
        <el-button
          v-if="showCloseButton"
          @click="handleClose"
        >
          {{ t('autoUpdate.close') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';

const { t } = useI18n();

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  updateInfo: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'download', 'install', 'cancel', 'skip', 'remind-later', 'retry']);

// State
const dialogVisible = ref(props.modelValue);
const downloadProgress = ref({
  show: false,
  percent: 0,
  text: ''
});
const installProgress = ref({
  show: false,
  percent: 0,
  text: ''
});
const error = ref(null);

// Computed
const dialogTitle = computed(() => {
  if (error.value) return t('autoUpdate.updateFailed');
  if (installProgress.value.show) return t('autoUpdate.installing');
  if (downloadProgress.value.show) return t('autoUpdate.downloading');
  if (hasUpdate.value) return t('autoUpdate.newVersionAvailable');
  return t('autoUpdate.newVersionAvailable');
});

const showCloseButton = computed(() => {
  return !isDownloading.value && !isInstalling.value;
});

const hasUpdate = computed(() => {
  return props.updateInfo !== null && !error.value;
});

const isDownloading = computed(() => {
  return downloadProgress.value.show;
});

const isInstalling = computed(() => {
  return installProgress.value.show;
});

const isUpdateReady = computed(() => {
  return hasUpdate.value && props.updateInfo?.downloaded && !error.value;
});

const releaseUrl = computed(() => {
  if (props.updateInfo?.releaseName) {
    return `https://github.com/rexlevin/canbox/releases/tag/${props.updateInfo.releaseName}`;
  }
  return '';
});

// Methods
const progressFormat = (percent) => {
  return `${percent}%`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  } catch (e) {
    return dateString;
  }
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const renderReleaseNotes = (notes) => {
  if (!notes) return '';
  // 检查是否已经是 HTML 格式（包含 < 开头的标签）
  if (notes.trim().startsWith('<')) {
    // 已经是 HTML，直接返回
    return notes;
  }
  // Markdown 格式，需要转换
  try {
    const md = new MarkdownIt();
    return md.render(notes);
  } catch (e) {
    return notes;
  }
};

const openReleaseUrl = () => {
  if (props.updateInfo?.releaseName && window.api?.openUrl) {
    const url = `https://github.com/rexlevin/canbox/releases/tag/${props.updateInfo.releaseName}`;
    window.api.openUrl(url);
  }
};

const handleDownload = () => {
  error.value = null;
  downloadProgress.value.show = true;
  downloadProgress.value.percent = 0;
  downloadProgress.value.text = t('autoUpdate.downloading');
  emit('download');
};

const handleInstall = () => {
  error.value = null;
  // 不要显示"正在安装"进度条，因为 quitAndInstall() 会立即退出应用
  // 渲染进程没有机会清除这个状态，导致应用重启后 UI 状态不正确
  // 直接触发安装，应用会立即退出并更新
  emit('install');
  // 立即关闭对话框，避免用户看到 UI 卡住
  handleClose();
};

const handleCancel = () => {
  downloadProgress.value.show = false;
  installProgress.value.show = false;
  emit('cancel');
};

const handleSkip = () => {
  if (props.updateInfo?.version) {
    emit('skip', props.updateInfo.version);
  }
  handleClose();
};

const handleRemindLater = () => {
  emit('remind-later');
  handleClose();
};

const handleRetry = () => {
  error.value = null;
  emit('retry');
};

const handleClose = () => {
  dialogVisible.value = false;
  emit('update:modelValue', false);
};

// 事件监听
const setupEventListeners = () => {
  // 监听下载进度
  window.api.on('download-progress', (event, progress) => {
    if (progress.percent !== undefined) {
      downloadProgress.value.percent = Math.round(progress.percent);
    }
    if (progress.transferred && progress.total) {
      const mbTransferred = (progress.transferred / (1024 * 1024)).toFixed(2);
      const mbTotal = (progress.total / (1024 * 1024)).toFixed(2);
      const speed = progress.bytesPerSecond
        ? `(${(progress.bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s)`
        : '';
      downloadProgress.value.text = `${mbTransferred} MB / ${mbTotal} MB ${speed}`;
    }
  });

  // 监听更新下载完成
  window.api.on('update-downloaded', (event, info) => {
    downloadProgress.value.show = false;
  });

  // 监听更新错误
  window.api.on('update-error', (event, err) => {
    downloadProgress.value.show = false;
    installProgress.value.show = false;
    error.value = err;
  });
};

const removeEventListeners = () => {
  window.api.off('download-progress');
  window.api.off('update-downloaded');
  window.api.off('update-error');
};

// Lifecycle
onMounted(() => {
  setupEventListeners();
});

onUnmounted(() => {
  removeEventListeners();
});

// Watch props
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal;
});
</script>

<script>
import { watch } from 'vue';
import markdownIt from 'markdown-it';

export default {
  name: 'UpdateDialog'
};
</script>

<style scoped>
.update-dialog-content {
  padding: 10px 0;
}

.update-info {
  margin-bottom: 20px;
}

.update-header {
  margin-bottom: 20px;
}

.update-header h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #303133;
}

.update-meta {
  font-size: 14px;
  color: #909399;
}

.release-notes {
  margin-bottom: 20px;
}

.release-notes h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
}

.notes-content {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
}

.notes-content * {
  text-align: left !important;
}

.notes-content :deep(h1),
.notes-content :deep(h2),
.notes-content :deep(h3) {
  margin-top: 10px;
  margin-bottom: 5px;
  font-size: 14px;
}

.notes-content :deep(p) {
  margin: 5px 0;
}

.notes-content :deep(ul),
.notes-content :deep(ol) {
  margin: 5px 0;
  padding-left: 20px;
}

.notes-content :deep(li) {
  margin: 3px 0;
}

.notes-content :deep(code) {
  padding: 2px 4px;
  background-color: #e6f7ff;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

.view-details-link {
  display: inline-block;
  margin-top: 10px;
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
}

.view-details-link:hover {
  text-decoration: underline;
}

.download-progress,
.install-progress {
  margin: 20px 0;
}

.progress-text {
  margin-top: 10px;
  font-size: 14px;
  color: #909399;
  text-align: center;
}

.error-message {
  margin: 20px 0;
}

.error-details {
  margin-top: 10px;
  padding: 10px;
  background-color: #fef0f0;
  border-radius: 4px;
  font-size: 13px;
  color: #f56c6c;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
