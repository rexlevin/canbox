<template>
    <div class="operation-history">
        <!-- 浮动图标 -->
        <div
            v-show="!showPanel"
            class="float-icon"
            :style="iconPositionStyle"
            @click="togglePanel"
            @mousedown="startDrag"
        >
            <el-tooltip :content="$t('operationHistory.title')" placement="top">
                <div class="icon-wrapper">
                    <span class="icon">📋</span>
                    <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
                </div>
            </el-tooltip>
        </div>

        <!-- 全屏弹层 -->
        <transition name="fade">
            <div v-show="showPanel" class="panel-overlay" @click.self="closePanel">
                <div class="panel-container">
                    <div class="panel-header">
                        <span class="panel-title">{{ $t('operationHistory.title') }}</span>
                        <div class="panel-actions">
                            <el-button type="danger" size="small" @click="handleClear">
                                {{ $t('operationHistory.clear') }}
                            </el-button>
                            <el-button size="small" @click="closePanel">
                                {{ $t('operationHistory.close') }}
                            </el-button>
                        </div>
                    </div>
                    <div class="panel-body">
                        <div v-if="records.length === 0" class="empty-tip">
                            {{ $t('operationHistory.empty') }}
                        </div>
                        <div v-else class="record-list">
                            <div
                                v-for="record in records"
                                :key="record._id"
                                :class="['record-item', `type-${record.type}`]"
                            >
                                <div class="record-header">
                                    <span :class="['record-type', `type-${record.type}`]">
                                        {{ getTypeText(record.type) }}
                                    </span>
                                    <span class="record-time">{{ formatTime(record.timestamp) }}</span>
                                </div>
                                <div class="record-message">{{ record.message }}</div>
                                <div v-if="record.module" class="record-module">
                                    {{ $t(`operationHistory.modules.${record.module}`) || record.module }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="panel-footer">
                        <span class="storage-info">
                            {{ $t('operationHistory.storageSize') }}: {{ storageSize.toFixed(2) }} MB
                        </span>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import notification from '../utils/notification';

const { t } = useI18n();

// 状态
const showPanel = ref(false);
const records = ref([]);
const unreadCount = ref(0);
const storageSize = ref(0);

// 图标位置（默认左下角）
const iconPosition = ref({ left: 16, bottom: 16 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// 样式
const iconPositionStyle = computed(() => ({
    left: `${iconPosition.value.left}px`,
    bottom: `${iconPosition.value.bottom}px`
}));

// 生命周期
onMounted(async () => {
    loadIconPosition();
    await loadRecords();
    await loadStorageSize();
});

onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
});

// 加载图标位置
function loadIconPosition() {
    try {
        const saved = localStorage.getItem('canbox_op_history_icon_pos');
        if (saved) {
            iconPosition.value = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load icon position:', error);
    }
}

// 保存图标位置
function saveIconPosition() {
    try {
        localStorage.setItem('canbox_op_history_icon_pos', JSON.stringify(iconPosition.value));
    } catch (error) {
        console.error('Failed to save icon position:', error);
    }
}

// 拖动开始
function startDrag(e) {
    if (e.button !== 0) return; // 只响应左键
    isDragging.value = true;
    dragOffset.value = {
        x: e.clientX - iconPosition.value.left,
        y: window.innerHeight - e.clientY - iconPosition.value.bottom
    };
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
}

// 拖动中
function onDrag(e) {
    if (!isDragging.value) return;
    iconPosition.value = {
        left: Math.max(0, e.clientX - dragOffset.value.x),
        bottom: Math.max(0, window.innerHeight - e.clientY - dragOffset.value.y)
    };
}

// 拖动结束
function stopDrag() {
    if (isDragging.value) {
        isDragging.value = false;
        saveIconPosition();
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// 切换面板
function togglePanel() {
    showPanel.value = !showPanel.value;
    if (showPanel.value) {
        unreadCount.value = 0;
        loadRecords();
    }
}

// 关闭面板
function closePanel() {
    showPanel.value = false;
}

// 加载记录
async function loadRecords() {
    try {
        const result = await window.api.canboxDb.allDocs({ limit: 100 });
        if (result.success) {
            records.value = result.data.rows.map(row => row.doc);
        }
    } catch (error) {
        console.error('Failed to load records:', error);
    }
}

// 加载存储大小
async function loadStorageSize() {
    try {
        const result = await window.api.canboxDb.getSize();
        if (result.success) {
            storageSize.value = result.data;
        }
    } catch (error) {
        console.error('Failed to load storage size:', error);
    }
}

// 清空记录
async function handleClear() {
    try {
        await ElMessageBox.confirm(
            t('operationHistory.clearConfirm'),
            t('operationHistory.clear'),
            {
                confirmButtonText: t('common.confirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        );

        // 删除所有记录
        for (const record of records.value) {
            await window.api.canboxDb.remove({ _id: record._id, _rev: record._rev });
        }

        await loadRecords();
        await loadStorageSize();
        notification.success(t('operationHistory.clearSuccess'));
    } catch (error) {
        if (error !== 'cancel') {
            console.error('Failed to clear records:', error);
        }
    }
}

// 获取类型文本
function getTypeText(type) {
    const typeMap = {
        success: t('operationHistory.types.success'),
        error: t('operationHistory.types.error'),
        warning: t('operationHistory.types.warning'),
        info: t('operationHistory.types.info')
    };
    return typeMap[type] || type;
}

// 格式化时间
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString([], {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 暴露方法给外部调用（用于写入记录）
defineExpose({
    addRecord: async (options) => {
        try {
            await window.api.canboxDb.put(options);
            unreadCount.value++;
            if (showPanel.value) {
                await loadRecords();
                await loadStorageSize();
            }
        } catch (error) {
            console.error('Failed to add record:', error);
        }
    }
});
</script>

<style scoped>
.operation-history {
    position: fixed;
    z-index: 2000;
}

/* 浮动图标 */
.float-icon {
    position: fixed;
    cursor: pointer;
    z-index: 2001;
    user-select: none;
}

.icon-wrapper {
    position: relative;
    width: 40px;
    height: 40px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
}

.icon-wrapper:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.icon {
    font-size: 20px;
}

.badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: #f56c6c;
    color: #fff;
    font-size: 10px;
    line-height: 18px;
    text-align: center;
    border-radius: 9px;
}

/* 弹层遮罩 */
.panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2002;
}

.panel-container {
    width: calc(100% - 48px);
    height: calc(100% - 48px);
    max-width: 800px;
    background: #fff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e4e7ed;
    background: #f5f7fa;
}

.panel-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.panel-actions {
    display: flex;
    gap: 8px;
}

.panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.empty-tip {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #909399;
    font-size: 14px;
}

.record-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.record-item {
    padding: 12px 16px;
    border-radius: 8px;
    background: #f5f7fa;
    border-left: 4px solid #909399;
}

.record-item.type-success {
    border-left-color: #67c23a;
}

.record-item.type-error {
    border-left-color: #f56c6c;
}

.record-item.type-warning {
    border-left-color: #e6a23c;
}

.record-item.type-info {
    border-left-color: #409eff;
}

.record-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.record-type {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    color: #fff;
}

.record-type.type-success { background: #67c23a; }
.record-type.type-error { background: #f56c6c; }
.record-type.type-warning { background: #e6a23c; }
.record-type.type-info { background: #409eff; }

.record-time {
    font-size: 12px;
    color: #909399;
}

.record-message {
    font-size: 14px;
    color: #303133;
    line-height: 1.5;
}

.record-module {
    margin-top: 6px;
    font-size: 12px;
    color: #909399;
}

.panel-footer {
    padding: 12px 20px;
    border-top: 1px solid #e4e7ed;
    background: #f5f7fa;
}

.storage-info {
    font-size: 12px;
    color: #909399;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
