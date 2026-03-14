<template>
    <div class="log-viewer-container">
        <!-- Top Toolbar -->
        <div class="toolbar">
            <!-- Left Controls -->
            <div class="toolbar-left">
                <el-button :icon="Refresh" @click="refreshLogs">{{ $t('logViewer.refresh') }}</el-button>
                <el-button :icon="Download" @click="showExportDialog">{{ $t('logViewer.export') }}</el-button>
                <el-button :icon="FolderDelete" @click="confirmClearLogs" type="danger">{{ $t('logViewer.clearLogs') }}</el-button>
                <el-button :icon="DeleteFilled" @click="showCleanupDialog" type="danger">{{ $t('logViewer.cleanupOldLogs') }}</el-button>
            </div>

            <!-- Right Controls -->
            <div class="toolbar-right">
                <el-select v-model="logSource" @change="onLogSourceChange" style="width: 150px; margin-right: 10px;">
                    <el-option :label="$t('logViewer.logSourceApp')" value="app" />
                    <el-option :label="$t('logViewer.logSourceMonitor')" value="monitor" />
                </el-select>
                <el-button :icon="Top" :type="isAlwaysOnTop ? 'primary' : 'default'" @click="toggleAlwaysOnTop">
                    {{ $t('logViewer.alwaysOnTop') }}
                </el-button>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
            <!-- Log Level Filter -->
            <div class="filter-item">
                <span class="filter-label">{{ $t('logViewer.logLevel') }}:</span>
                <el-checkbox-group v-model="selectedLevels">
                    <el-checkbox label="debug">{{ $t('logViewer.levelDebug') }}</el-checkbox>
                    <el-checkbox label="info">{{ $t('logViewer.levelInfo') }}</el-checkbox>
                    <el-checkbox label="warn">{{ $t('logViewer.levelWarn') }}</el-checkbox>
                    <el-checkbox label="error">{{ $t('logViewer.levelError') }}</el-checkbox>
                </el-checkbox-group>
                <el-button text @click="selectAllLevels" style="margin-left: 10px;">
                    {{ $t('logViewer.showAll') }}
                </el-button>
            </div>

            <!-- Search Input -->
            <div class="filter-item search-item">
                <el-input
                    v-model="searchQuery"
                    :placeholder="$t('logViewer.search')"
                    clearable
                    style="width: 300px; margin-right: 10px;">
                    <template #append>
                        <el-checkbox v-model="useRegex" :label="$t('logViewer.regexSearch')" />
                    </template>
                </el-input>
            </div>

            <!-- Date Filter -->
            <div class="filter-item">
                <span class="filter-label">{{ $t('logViewer.dateSelect') }}:</span>
                <el-select v-model="selectedDate" @change="onDateChange" style="width: 150px;">
                    <el-option label="今天" value="today" />
                    <el-option
                        v-for="date in availableDates"
                        :key="date"
                        :label="date"
                        :value="date" />
                </el-select>
            </div>
        </div>

        <!-- Log Display Area -->
        <div class="log-display">
            <div class="log-header">
                <span>{{ $t('logViewer.logCount', { count: filteredLogs.length }) }}</span>
                <el-switch v-model="autoScroll" :active-text="$t('logViewer.autoScroll')" />
            </div>

            <el-scrollbar ref="scrollbarRef" @scroll="onScroll">
                <div class="log-list" v-if="filteredLogs.length > 0">
                    <div
                        v-for="log in filteredLogs"
                        :key="log.id"
                        class="log-item"
                        :class="`log-${log.level}`">
                        <div class="log-level">
                            <el-tag :type="getLevelType(log.level)" size="small">
                                {{ log.level.toUpperCase() }}
                            </el-tag>
                        </div>
                        <div class="log-time">{{ formatTime(log.timestamp) }}</div>
                        <div class="log-message" v-html="highlightText(log.message)"></div>
                    </div>
                </div>
                <div v-else class="empty-logs">
                    <el-empty :description="$t('logViewer.noLogs')" />
                </div>
            </el-scrollbar>
        </div>

        <!-- Status Bar -->
        <div class="status-bar">
            <span>{{ $t('logViewer.displayingLogs', { count: filteredLogs.length, total: allLogs.length }) }}</span>
            <span v-if="loading">{{ $t('logViewer.loadingLogs') }}</span>
        </div>

        <!-- Export Dialog -->
        <el-dialog v-model="exportDialogVisible" :title="$t('logViewer.export')" width="500">
            <el-form :model="exportForm" label-width="120">
                <el-form-item :label="$t('logViewer.exportFormat')">
                    <el-radio-group v-model="exportForm.format">
                        <el-radio label="txt">{{ $t('logViewer.formatTxt') }}</el-radio>
                        <el-radio label="json">{{ $t('logViewer.formatJson') }}</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item :label="$t('logViewer.exportRange')">
                    <el-radio-group v-model="exportForm.range">
                        <el-radio label="all">{{ $t('logViewer.exportAll') }}</el-radio>
                        <el-radio label="recent">{{ $t('logViewer.exportRecent') }}</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="exportForm.range === 'recent'" :label="$t('logViewer.exportCount')">
                    <el-input-number v-model="exportForm.count" :min="1" :max="10000" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="exportDialogVisible = false">{{ $t('common.cancel') }}</el-button>
                <el-button type="primary" @click="exportLogs">{{ $t('common.confirm') }}</el-button>
            </template>
        </el-dialog>

        <!-- Clear Logs Confirmation Dialog -->
        <el-dialog v-model="clearLogsDialogVisible" :title="$t('logViewer.confirmClearLogs')" width="400">
            <p>{{ $t('logViewer.confirmClearLogsDetail') }}</p>
            <template #footer>
                <el-button @click="clearLogsDialogVisible = false">{{ $t('common.cancel') }}</el-button>
                <el-button type="danger" @click="clearLogs">{{ $t('common.confirm') }}</el-button>
            </template>
        </el-dialog>

        <!-- Cleanup Dialog -->
        <el-dialog v-model="cleanupDialogVisible" :title="$t('logViewer.cleanupPreview')" width="500">
            <p>{{ $t('logViewer.confirmCleanupDetail') }}</p>
            <div v-if="cleanupPreview.files.length > 0" class="cleanup-preview">
                <p>{{ $t('logViewer.filesToDelete') }}:</p>
                <el-table ref="cleanupTableRef" :data="cleanupPreview.files" max-height="200" @selection-change="onCleanupSelectionChange" @row-click="toggleRowSelection">
                    <el-table-column type="selection" width="55" />
                    <el-table-column prop="filename" :label="$t('common.name')" />
                    <el-table-column prop="date" :label="$t('common.date')" />
                </el-table>
            </div>
            <p v-else>{{ $t('logViewer.noFilesToDelete') }}</p>
            <template #footer>
                <el-button @click="cleanupDialogVisible = false">{{ $t('common.cancel') }}</el-button>
                <el-button type="danger" @click="cleanupOldLogs" :disabled="selectedCleanupFiles.length === 0">{{ $t('common.confirm') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Delete, DeleteFilled, FolderDelete, Top } from '@element-plus/icons-vue'

const { t } = useI18n()

// State
const logs = ref([])
const allLogs = ref([])
const loading = ref(false)
const logSource = ref('app')
const selectedLevels = ref(['debug', 'info', 'warn', 'error'])
const searchQuery = ref('')
const useRegex = ref(false)
const selectedDate = ref('today')
const availableDates = ref([])
const autoScroll = ref(true)
const isAlwaysOnTop = ref(false)
const isScrolledToBottom = ref(true)
const scrollbarRef = ref(null)

// Dialogs
const exportDialogVisible = ref(false)
const clearLogsDialogVisible = ref(false)
const cleanupDialogVisible = ref(false)

// Export form
const exportForm = ref({
    format: 'txt',
    range: 'all',
    count: 100
})

// Cleanup preview
const cleanupPreview = ref({
    files: []
})
const selectedCleanupFiles = ref([])
const cleanupTableRef = ref(null)

// Polling interval
let pollingInterval = null
let lastLogId = null

// Constants
const MAX_LOGS = 500
const POLL_INTERVAL = 1000

// Computed
const filteredLogs = computed(() => {
    let result = [...allLogs.value]

    // Filter by level
    if (selectedLevels.value.length > 0) {
        result = result.filter(log => selectedLevels.value.includes(log.level))
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
        if (useRegex.value) {
            try {
                const regex = new RegExp(searchQuery.value, 'gi')
                result = result.filter(log => regex.test(log.message))
            } catch (e) {
                // Invalid regex, ignore
            }
        } else {
            const query = searchQuery.value.toLowerCase()
            result = result.filter(log => log.message.toLowerCase().includes(query))
        }
    }

    return result
})

// Methods
const getLevelType = (level) => {
    const types = {
        debug: 'info',
        info: 'info',
        warn: 'warning',
        error: 'danger'
    }
    return types[level] || 'info'
}

const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' +
        date.getMilliseconds().toString().padStart(3, '0')
}

const highlightText = (text) => {
    if (!searchQuery.value.trim()) return text

    try {
        const regex = useRegex.value
            ? new RegExp(`(${searchQuery.value})`, 'gi')
            : new RegExp(`(${escapeRegExp(searchQuery.value)})`, 'gi')
        return text.replace(regex, '<mark>$1</mark>')
    } catch (e) {
        return text
    }
}

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const refreshLogs = async () => {
    try {
        loading.value = true
        const options = {
            source: logSource.value,
            afterId: null  // 初始加载不传 afterId
        }
        if (selectedDate.value !== 'today') {
            options.date = selectedDate.value
        }

        const result = await window.api.log.getLogs(options)
        if (result.success) {
            logs.value = result.logs
            allLogs.value = result.logs.slice(-MAX_LOGS)
            if (allLogs.value.length > 0) {
                lastLogId = allLogs.value[allLogs.value.length - 1].id
            }
            // 加载日志后滚动到底部
            if (autoScroll.value) {
                await nextTick()
                scrollToBottom()
            }
        }
    } catch (error) {
        ElMessage.error(t('logViewer.loadLogsFailed'))
        console.error('Failed to load logs:', error)
    } finally {
        loading.value = false
    }
}

const loadRecentLogs = async () => {
    try {
        if (selectedDate.value !== 'today') {
            // 非今日日期不轮询
            return
        }

        const options = {
            source: logSource.value,
            afterId: lastLogId  // 传递 lastLogId 获取增量
        }

        const result = await window.api.log.getLogs(options)
        if (result.success) {
            if (result.logs.length > 0) {
                console.log(`[loadRecentLogs] Found ${result.logs.length} new logs`)
                // 直接追加新日志（后端已过滤）
                logs.value = [...logs.value, ...result.logs]
                allLogs.value = logs.value.slice(-MAX_LOGS)

                // 更新 lastLogId
                if (allLogs.value.length > 0) {
                    lastLogId = allLogs.value[allLogs.value.length - 1].id
                }

                // 如果开启了自动滚动，自动滚动到底部
                if (autoScroll.value) {
                    await nextTick()
                    scrollToBottom()
                }
            }
        }
    } catch (error) {
        console.error('Failed to load recent logs:', error)
    }
}

const scrollToBottom = () => {
    if (scrollbarRef.value) {
        scrollbarRef.value.setScrollTop(999999)
    }
}

const onScroll = ({ scrollTop, clientHeight, scrollHeight }) => {
    isScrolledToBottom.value = scrollTop + clientHeight >= scrollHeight - 10
}

const onLogSourceChange = () => {
    lastLogId = null
    refreshLogs()
    loadAvailableDates()
}

const onDateChange = () => {
    lastLogId = null
    refreshLogs()
}

const selectAllLevels = () => {
    selectedLevels.value = ['debug', 'info', 'warn', 'error']
}

const showExportDialog = () => {
    exportDialogVisible.value = true
}

const exportLogs = async () => {
    try {
        let logsToExport = allLogs.value
        if (exportForm.value.range === 'recent') {
            logsToExport = allLogs.value.slice(-exportForm.value.count)
        }

        const result = await window.api.log.exportLogs(
            exportForm.value.format,
            logsToExport
        )

        if (result.success) {
            ElMessage.success(t('logViewer.exportSuccess'))
            exportDialogVisible.value = false
        } else {
            ElMessage.error(result.message || t('logViewer.exportFailed'))
        }
    } catch (error) {
        ElMessage.error(t('logViewer.exportFailed'))
        console.error('Failed to export logs:', error)
    }
}

const confirmClearLogs = () => {
    clearLogsDialogVisible.value = true
}

const clearLogs = async () => {
    try {
        const result = await window.api.log.clearLogs(logSource.value)
        if (result.success) {
            logs.value = []
            allLogs.value = []
            lastLogId = null
            ElMessage.success(t('logViewer.clearLogsSuccess'))
            clearLogsDialogVisible.value = false
        } else {
            ElMessage.error(result.message || t('logViewer.clearLogsFailed'))
        }
    } catch (error) {
        ElMessage.error(t('logViewer.clearLogsFailed'))
        console.error('Failed to clear logs:', error)
    }
}

const showCleanupDialog = async () => {
    try {
        const result = await window.api.log.getLogFiles()
        if (result.success && result.files.length > 0) {
            cleanupPreview.value.files = result.files
            selectedCleanupFiles.value = []
            cleanupDialogVisible.value = true
        } else {
            ElMessage.info(t('logViewer.noFilesToDelete'))
        }
    } catch (error) {
        ElMessage.error(t('logViewer.loadFilesFailed'))
        console.error('Failed to load log files:', error)
    }
}

const onCleanupSelectionChange = (selection) => {
    selectedCleanupFiles.value = selection
}

const toggleRowSelection = (row) => {
    if (cleanupTableRef.value) {
        cleanupTableRef.value.toggleRowSelection(row)
    }
}

const cleanupOldLogs = async () => {
    try {
        if (selectedCleanupFiles.value.length === 0) {
            ElMessage.warning(t('logViewer.noFilesToDelete'))
            return
        }

        const filePaths = selectedCleanupFiles.value.map(file => file.path)
        console.log('[cleanupOldLogs] Selected files:', selectedCleanupFiles.value)
        console.log('[cleanupOldLogs] File paths:', filePaths)

        const result = await window.api.log.cleanupOldLogs(filePaths)
        console.log('[cleanupOldLogs] Result:', result)

        if (result.success) {
            ElMessage.success(t('logViewer.cleanupSuccess', { count: result.deletedCount || 0 }))
            cleanupDialogVisible.value = false
            await refreshLogs()
            await loadAvailableDates()
        } else {
            console.error('[cleanupOldLogs] Cleanup failed:', result.error)
            ElMessage.error(result.error || t('logViewer.cleanupFailed'))
        }
    } catch (error) {
        console.error('[cleanupOldLogs] Exception:', error)
        ElMessage.error(t('logViewer.cleanupFailed'))
    }
}

const toggleAlwaysOnTop = async () => {
    try {
        const result = await window.api.log.toggleAlwaysOnTop()
        if (result.success) {
            isAlwaysOnTop.value = result.alwaysOnTop
        }
    } catch (error) {
        console.error('Failed to toggle always on top:', error)
    }
}

const loadAvailableDates = async () => {
    try {
        const result = await window.api.log.getLogFiles(logSource.value)
        if (result.success && result.files) {
            availableDates.value = result.files
                .map(file => file.date)
                .filter(date => date && date !== new Date().toISOString().split('T')[0])
                .sort()
                .reverse()
        }
    } catch (error) {
        console.error('Failed to load available dates:', error)
    }
}

const startPolling = () => {
    if (selectedDate.value === 'today') {
        pollingInterval = setInterval(() => {
            loadRecentLogs()
        }, POLL_INTERVAL)
    }
}

const stopPolling = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
    }
}

// Watchers
watch(selectedDate, (newDate) => {
    stopPolling()
    if (newDate === 'today') {
        startPolling()
    }
})

// Lifecycle
onMounted(async () => {
    await refreshLogs()
    await loadAvailableDates()
    startPolling()
})

onUnmounted(() => {
    stopPolling()
})
</script>

<style scoped>
.log-viewer-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: #f5f5f5;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: #fff;
    border-bottom: 1px solid #e4e7ed;
}

.toolbar-left,
.toolbar-right {
    display: flex;
    gap: 8px;
}

.filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    padding: 10px 15px;
    background-color: #fff;
    border-bottom: 1px solid #e4e7ed;
    align-items: center;
}

.filter-item {
    display: flex;
    align-items: center;
}

.filter-label {
    margin-right: 8px;
    color: #606266;
    font-size: 14px;
}

.search-item {
    margin-left: auto;
}

.log-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: #fff;
}

.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 15px;
    background-color: #f9fafc;
    border-bottom: 1px solid #e4e7ed;
    font-size: 13px;
    color: #606266;
}

.log-list {
    padding: 10px;
}

.log-item {
    display: flex;
    align-items: flex-start;
    padding: 6px 10px;
    margin-bottom: 4px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 19px;
    line-height: 1.5;
}

.log-item:hover {
    background-color: #f5f7fa;
}

.log-level {
    width: 80px;
    flex-shrink: 0;
}

.log-time {
    width: 160px;
    flex-shrink: 0;
    color: #909399;
}

.log-message {
    flex: 1;
    word-break: break-all;
    text-align: left;
}

.log-debug {
    color: #909399;
}

.log-info {
    color: #409eff;
}

.log-warn {
    color: #e6a23c;
}

.log-error {
    color: #f56c6c;
}

.empty-logs {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
}

.status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 15px;
    background-color: #f9fafc;
    border-top: 1px solid #e4e7ed;
    font-size: 12px;
    color: #909399;
}

.cleanup-preview {
    margin-top: 15px;
    max-height: 250px;
    overflow-y: auto;
}

mark {
    background-color: #ffeb3b;
    color: #000;
    padding: 0 2px;
}
</style>
