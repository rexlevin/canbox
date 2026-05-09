<template>
    <transition name="slide-up">
        <div v-if="showPanel" class="file-task-panel">
            <div class="panel-header">
                <span class="panel-title">{{ $t('fileTask.title') }}</span>
                <span class="panel-count">{{ $t('fileTask.taskCount', { count: activeTasks.length }) }}</span>
                <div class="panel-actions">
                    <el-tooltip :content="$t('fileTask.clearCompleted')" placement="top">
                        <button class="icon-btn" @click="handleClearCompleted">🗑️</button>
                    </el-tooltip>
                    <el-tooltip :content="panelExpanded ? $t('fileTask.collapse') : $t('fileTask.expand')" placement="top">
                        <button class="icon-btn" @click="panelExpanded = !panelExpanded">
                            {{ panelExpanded ? '▼' : '▲' }}
                        </button>
                    </el-tooltip>
                </div>
            </div>
            <div v-show="panelExpanded" class="panel-body">
                <div v-if="taskList.length === 0" class="empty-tip">
                    {{ $t('fileTask.empty') }}
                </div>
                <div
                    v-for="task in taskList"
                    :key="task.id"
                    :class="['task-item', `task-status-${task.status}`]"
                >
                    <div class="task-info">
                        <span class="task-type-icon">{{ getTypeIcon(task.type) }}</span>
                        <span class="task-name">{{ task.options?.name || task.uid || task.id }}</span>
                        <el-tag
                            :type="getStatusTagType(task.status)"
                            size="small"
                            effect="plain"
                            class="task-status-tag"
                        >
                            {{ getStatusText(task.status) }}
                        </el-tag>
                    </div>
                    <div v-if="isRunningState(task.status)" class="task-progress">
                        <el-progress
                            :percentage="task.progress || 0"
                            :stroke-width="6"
                            :show-text="!!task.progressText"
                            :format="() => task.progressText || ''"
                        />
                        <span v-if="task.speed" class="task-speed">{{ task.speed }}</span>
                    </div>
                    <div v-if="task.error" class="task-error">
                        {{ task.error }}
                    </div>
                    <div class="task-actions">
                        <el-button
                            v-if="canCancel(task)"
                            type="warning"
                            size="small"
                            text
                            @click="handleCancel(task.id)"
                        >
                            {{ $t('common.cancel') }}
                        </el-button>
                        <el-button
                            v-if="canRetry(task)"
                            type="primary"
                            size="small"
                            text
                            @click="handleRetry(task.id)"
                        >
                            {{ $t('autoUpdate.retry') }}
                        </el-button>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFileTaskStore } from '@/stores/fileTaskStore';

const { t } = useI18n();
const fileTaskStore = useFileTaskStore();

const panelExpanded = ref(true);

const taskList = computed(() => fileTaskStore.taskList);
const activeTasks = computed(() => fileTaskStore.activeTasks);
const showPanel = computed(() => taskList.value.length > 0);

const TERMINAL_STATES = ['completed', 'cancelled', 'failed'];

function isRunningState(status) {
    return !TERMINAL_STATES.includes(status);
}

function canCancel(task) {
    return ['pending', 'preparing', 'downloading', 'extracting', 'moving'].includes(task.status);
}

function canRetry(task) {
    return task.status === 'failed';
}

function getTypeIcon(type) {
    const icons = {
        'app-import': '📥',
        'repo-download': '📦',
        'app-pack': '📦',
        'app-update': '🔄',
    };
    return icons[type] || '📋';
}

function getStatusTagType(status) {
    const map = {
        'idle': 'info',
        'pending': 'info',
        'preparing': 'warning',
        'downloading': '',
        'extracting': 'warning',
        'moving': 'warning',
        'completed': 'success',
        'failed': 'danger',
        'cancelled': 'info',
    };
    return map[status] || 'info';
}

function getStatusText(status) {
    const key = `fileTask.status.${status}`;
    const text = t(key);
    // 如果没有对应的国际化文本，返回原始状态
    return text === key ? status : text;
}

async function handleCancel(taskId) {
    try {
        await window.api.fileTask.cancel(taskId);
    } catch (err) {
        console.error('[FileTaskPanel] cancel task failed:', err);
    }
}

async function handleRetry(taskId) {
    try {
        await window.api.fileTask.retry(taskId);
    } catch (err) {
        console.error('[FileTaskPanel] retry task failed:', err);
    }
}

function handleClearCompleted() {
    fileTaskStore.clearCompleted();
}

// 监听任务更新
function onTaskUpdate(task) {
    fileTaskStore.updateTask(task);
}

onMounted(async () => {
    if (!window.api?.fileTask) {
        console.warn('[FileTaskPanel] window.api.fileTask not available');
        return;
    }

    // 获取当前所有任务
    try {
        const result = await window.api.fileTask.getAll();
        if (result.success && result.tasks) {
            fileTaskStore.updateTasks(result.tasks);
        }
    } catch (err) {
        console.error('[FileTaskPanel] getAll tasks failed:', err);
    }

    // 监听任务更新
    window.api.fileTask.onUpdate(onTaskUpdate);
});

onBeforeUnmount(() => {
    if (window.api?.fileTask) {
        window.api.fileTask.offUpdate(onTaskUpdate);
    }
});
</script>

<style scoped>
.file-task-panel {
    position: fixed;
    bottom: 12px;
    right: 12px;
    width: 380px;
    max-height: 400px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.panel-header {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    flex-shrink: 0;
}

.panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}

.panel-count {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
}

.panel-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
}

.icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.icon-btn:hover {
    background-color: #f0f0f0;
}

.panel-body {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0;
}

.empty-tip {
    text-align: center;
    padding: 20px;
    color: #909399;
    font-size: 13px;
}

.task-item {
    padding: 8px 14px;
    border-bottom: 1px solid #f5f5f5;
    transition: background-color 0.2s;
}

.task-item:last-child {
    border-bottom: none;
}

.task-item:hover {
    background-color: #fafafa;
}

.task-item.task-status-completed {
    opacity: 0.7;
}

.task-item.task-status-failed {
    background-color: #fef0f0;
}

.task-info {
    display: flex;
    align-items: center;
    gap: 6px;
}

.task-type-icon {
    font-size: 14px;
}

.task-name {
    font-size: 13px;
    color: #303133;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.task-status-tag {
    flex-shrink: 0;
}

.task-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    padding-right: 0;
}

.task-progress .el-progress {
    flex: 1;
}

.task-speed {
    font-size: 11px;
    color: #909399;
    white-space: nowrap;
}

.task-error {
    margin-top: 4px;
    font-size: 12px;
    color: #f56c6c;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.task-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
}

/* slide-up 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(20px);
    opacity: 0;
}
</style>
