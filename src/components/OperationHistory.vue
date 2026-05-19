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
            <div ref="panelRef" v-show="showPanel" class="panel-overlay" @click.self="closePanel" @keydown.esc="closePanel" tabindex="-1">
                <div class="panel-container">
                    <div class="panel-header">
                        <span class="panel-title">{{ $t('operationHistory.title') }}</span>
                        <div class="panel-actions">
                            <el-button type="danger" @click="handleClear">
                                {{ $t('operationHistory.clear') }}
                            </el-button>
                            <span class="close-btn" @click="closePanel" :title="$t('operationHistory.close')">✕</span>
                        </div>
                    </div>
                    <div class="panel-body">
                        <el-empty v-if="records.length === 0" :description="$t('operationHistory.empty')" />
                        <el-table
                            v-else
                            ref="tableRef"
                            :data="records"
                            height="100%"
                            :show-header="true"
                            style="width: 100%"
                        >
                            <el-table-column :label="$t('common.date')" width="170" fixed>
                                <template #default="{ row }">
                                    <span class="cell-time">{{ formatTime(row.timestamp) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="类型" width="80" fixed>
                                <template #default="{ row }">
                                    <span :class="['type-badge', `type-${row.type}`]">
                                        {{ getTypeText(row.type) }}
                                    </span>
                                </template>
                            </el-table-column>
                            <el-table-column label="模块" width="100">
                                <template #default="{ row }">
                                    {{ row.module ? $t(`operationHistory.modules.${row.module}`) || row.module : '-' }}
                                </template>
                            </el-table-column>
                            <el-table-column label="操作内容" min-width="200">
                                <template #default="{ row }">
                                    {{ row.message }}
                                </template>
                            </el-table-column>
                        </el-table>
                        <div v-if="isLoadingMore" class="loading-more">
                            <el-icon class="is-loading"><Loading /></el-icon>
                            加载中...
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
import { ref, computed, onMounted, onBeforeUnmount, toRaw, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessageBox } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import notification from '../utils/notification';

const { t } = useI18n();

// 状态
const showPanel = ref(false);
const records = ref([]);
const unreadCount = ref(0);
const storageSize = ref(0);
const panelRef = ref(null);
const tableRef = ref(null);
const isLoadingMore = ref(false);
const hasMore = ref(true);
const currentOffset = ref(0);
const PAGE_SIZE = 20;
let scrollHandler = null;

// 图标位置（默认左下角）
const iconPosition = ref({ left: 16, bottom: 16 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
let hasMoved = false;

// 样式
const iconPositionStyle = computed(() => ({
    left: `${iconPosition.value.left}px`,
    bottom: `${iconPosition.value.bottom}px`
}));

// 生命周期
onMounted(async () => {
    loadIconPosition();
    await loadStorageSize();
});

onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    unbindTableScroll();
});

// 加载图标位置
async function loadIconPosition() {
    try {
        const result = await window.api.canboxConfig.get('operationHistoryIconPosition', { left: 16, bottom: 16 });
        if (result.success) {
            iconPosition.value = result.data;
        }
    } catch (error) {
        console.error('Failed to load icon position:', error);
    }
}

// 保存图标位置
async function saveIconPosition() {
    try {
        const pos = toRaw(iconPosition.value);
        await window.api.canboxConfig.set('operationHistoryIconPosition', pos);
    } catch (error) {
        console.error('Failed to save icon position:', error);
    }
}

// 拖动开始
function startDrag(e) {
    if (e.button !== 0) return; // 只响应左键
    hasMoved = false;
    isDragging.value = true;
    // 记录鼠标相对于图标左上角的偏移
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
    const movedX = Math.abs(e.clientX - dragOffset.value.x - iconPosition.value.left);
    const movedY = Math.abs(e.clientY - dragOffset.value.y - iconPosition.value.bottom);

    if (movedX > 5 || movedY > 5) {
        hasMoved = true;
    }

    if (hasMoved) {
        // 计算新位置：鼠标位置减去初始偏移
        iconPosition.value = {
            left: Math.max(0, e.clientX - dragOffset.value.x),
            bottom: Math.max(0, window.innerHeight - e.clientY - dragOffset.value.y)
        };
    }
}

// 拖动结束
function stopDrag() {
    if (isDragging.value) {
        if (hasMoved) {
            saveIconPosition();
        }
        isDragging.value = false;
    }
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
}

// 切换面板
function togglePanel() {
    if (hasMoved) {
        return;
    }
    showPanel.value = !showPanel.value;
    if (showPanel.value) {
        unreadCount.value = 0;
        // 重置分页状态
        currentOffset.value = 0;
        hasMore.value = true;
        records.value = [];
        loadRecords();
        // 弹层显示后聚焦，以便捕获 ESC 键盘事件
        nextTick(() => {
            panelRef.value?.focus();
            // 绑定表格滚动事件
            bindTableScroll();
        });
    }
}

// 关闭面板
function closePanel() {
    unbindTableScroll();
    showPanel.value = false;
}

// 绑定表格滚动事件
function bindTableScroll() {
    nextTick(() => {
        const table = tableRef.value;
        if (table?.$el) {
            // el-table 的滚动容器是 .el-scrollbar__wrap
            const scrollEl = table.$el.querySelector('.el-scrollbar__wrap');
            if (scrollEl) {
                scrollHandler = handleTableScroll;
                scrollEl.addEventListener('scroll', scrollHandler);
            }
        }
    });
}

// 解绑表格滚动事件
function unbindTableScroll() {
    if (scrollHandler && tableRef.value?.$el) {
        const scrollEl = tableRef.value.$el.querySelector('.el-scrollbar__wrap');
        if (scrollEl) {
            scrollEl.removeEventListener('scroll', scrollHandler);
            scrollHandler = null;
        }
    }
}

// 表格滚动加载更多
function handleTableScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
        loadMore();
    }
}

// 加载记录（支持分页）
async function loadRecords(isLoadMore = false) {
    try {
        if (isLoadMore) {
            if (isLoadingMore.value || !hasMore.value) return;
            isLoadingMore.value = true;
        }

        const result = await window.api.canboxDb.allDocs({ 
            limit: PAGE_SIZE,
            skip: isLoadMore ? currentOffset.value : 0
        });

        if (result.success) {
            const docs = result.data.rows.map(row => row.doc);
            
            if (isLoadMore) {
                records.value = [...records.value, ...docs];
            } else {
                records.value = docs;
            }
            
            currentOffset.value += docs.length;
            hasMore.value = docs.length === PAGE_SIZE;
            
            console.log('[OperationHistory] 从数据库获取的记录:', JSON.stringify(docs, null, 2));
        }
    } catch (error) {
        console.error('Failed to load records:', error);
    } finally {
        isLoadingMore.value = false;
    }
}

// 加载更多
async function loadMore() {
    await loadRecords(true);
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
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
    gap: 12px;
    align-items: center;
}

.close-btn {
    font-size: 20px;
    color: #909399;
    cursor: pointer;
    line-height: 1;
    padding: 4px;
}

.close-btn:hover {
    color: #303133;
}

.panel-body {
    flex: 1;
    overflow: hidden;
    padding: 16px;
}

.cell-time {
    font-size: 14px;
    color: #909399;
}

/* 类型标签 */
.type-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
    color: #fff;
    line-height: 1.4;
}

.type-badge.type-success { background: #67c23a; }
.type-badge.type-error { background: #f56c6c; }
.type-badge.type-warning { background: #e6a23c; }
.type-badge.type-info { background: #409eff; }

.loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    color: #909399;
    font-size: 14px;
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
