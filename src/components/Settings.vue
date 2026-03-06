<template>
    <div class="app-list-container">
        <!-- 第一部分：设置列表区域 -->
        <div class="app-list-section">
            <el-row>
                <el-col :span="24">
                    <div class="card">
                        <el-form label-width="150px">
                            <el-form-item :label="$t('settings.language')" style="margin-bottom: 20px;">
                                <el-select v-model="currentLanguage" @change="handleLanguageChange"
                                    style="width: 200px;">
                                    <el-option v-for="lang in availableLanguages" :key="lang.code" :label="lang.name"
                                        :value="lang.code" />
                                </el-select>
                            </el-form-item>
                            <el-form-item :label="$t('settings.font')" style="margin-bottom: 20px;">
                                <el-select v-model="currentFont" @change="handleFontChange" style="width: 250px;">
                                    <el-option v-for="font in availableFonts" :key="font.value" :label="font.label"
                                        :value="font.value" />
                                </el-select>
                            </el-form-item>
                            <el-form-item :label="$t('settings.executionMode')" style="margin-bottom: 20px;">
                                <el-select v-model="currentExecutionMode" @change="handleExecutionModeChange"
                                    style="width: 250px;">
                                    <el-option v-for="mode in executionModes" :key="mode.value" :label="mode.label"
                                        :value="mode.value" />
                                </el-select>
                            </el-form-item>
                            <el-form-item :label="$t('settings.shortcutTitle')" style="margin-bottom: 20px;">
                                <div style="display: flex; gap: 10px;">
                                    <el-button type="primary" size="" @click="generateShortcut">
                                        {{ $t('settings.createShortcut') }}
                                    </el-button>
                                    <el-button type="danger" size="" @click="deleteShortcut">
                                        {{ $t('settings.deleteShortcut') }}
                                    </el-button>
                                </div>
                            </el-form-item>
                            <el-form-item :label="$t('settings.customDataPath')" style="margin-bottom: 20px;">
                                <div style="width: 100%;">
                                    <!-- 当前使用路径 -->
                                    <el-descriptions :column="1" size="small" border style="margin-bottom: 12px;">
                                        <el-descriptions-item :label="$t('settings.currentDataPath')">
                                            {{ currentDataPath }}
                                        </el-descriptions-item>
                                        <el-descriptions-item :label="$t('settings.diskUsage')">
                                            {{ diskUsage }}
                                        </el-descriptions-item>
                                    </el-descriptions>

                                    <!-- 新路径选择 -->
                                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                                        <el-input v-model="newDataPath"
                                            :placeholder="$t('settings.customDataPathPlaceholder')" />
                                        <el-button @click="selectDirectory">
                                            {{ $t('settings.browse') }}
                                        </el-button>
                                    </div>

                                    <!-- 警告提示 -->
                                    <el-alert v-if="newDataPath" type="warning" :closable="false"
                                        style="margin-bottom: 12px;">
                                        <template #title>
                                            {{ $t('settings.customDataPathWarning') }}
                                        </template>
                                        <div style="font-size: 12px; margin-top: 4px;">
                                            {{ $t('settings.customDataPathWarningDetail', {
                                                path: newDataPath + '/Users'
                                            }) }}
                                        </div>
                                    </el-alert>

                                    <!-- 操作按钮 -->
                                    <div style="display: flex; gap: 8px;">
                                        <el-button type="primary" @click="saveCustomDataPath"
                                            :disabled="!newDataPath || isSaving">
                                            {{ isSaving ? $t('settings.migrating') : $t('settings.saveAndMigrate') }}
                                        </el-button>
                                        <el-button @click="resetToDefault" :disabled="isSaving">
                                            {{ $t('settings.resetToDefault') }}
                                        </el-button>
                                    </div>
                                </div>
                            </el-form-item>
                            <el-divider style="margin: 20px 0;">{{ $t('settings.logViewerSettings') }}</el-divider>
                            <el-form-item :label="$t('settings.logRetentionDays')" style="margin-bottom: 20px;">
                                <el-input-number v-model="logRetentionDays" :min="0" :max="30" :step="1"
                                    controls-position="right" style="width: 200px;" @change="saveLogRetentionDays" />
                                <span style="margin-left: 10px; color: #909399;">{{ $t('settings.logRetentionDaysHint')
                                    }}</span>
                            </el-form-item>
                        </el-form>
                    </div>
                </el-col>
            </el-row>
        </div>

        <!-- 倒计时对话框 -->
        <RestartCountdownDialog v-model:visible="showRestartDialog" :isAppImage="restartIsAppImage"
            @restart-now="onRestartNow" />
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import RestartCountdownDialog from './RestartCountdownDialog.vue';

const { t, locale } = useI18n();

const currentLanguage = ref('en-US');
const availableLanguages = ref([]);
const currentFont = ref('default');
const currentExecutionMode = ref('window');

// 日志查看器配置
const logRetentionDays = ref(30);

// 自定义数据路径相关
const currentDataPath = ref('');
const diskUsage = ref('');
const newDataPath = ref('');
const isSaving = ref(false);

// 倒计时对话框相关
const showRestartDialog = ref(false);
const restartIsAppImage = ref(false);

// 常用系统字体列表
const availableFonts = ref([
    { label: t('settings.defaultFont'), value: 'default' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Microsoft YaHei (微软雅黑)', value: '"Microsoft YaHei", sans-serif' },
    { label: 'SimSun (宋体)', value: 'SimSun, serif' },
    { label: 'SimHei (黑体)', value: 'SimHei, sans-serif' },
    { label: 'Noto Sans CJK', value: '"Noto Sans CJK SC", sans-serif' },
    { label: 'Source Han Sans (思源黑体)', value: '"Source Han Sans CN", sans-serif' },
    { label: 'WenQuanYi Zen Hei (文泉驿正黑)', value: '"WenQuanYi Zen Hei", sans-serif' },
    { label: 'Liberation Sans', value: '"Liberation Sans", sans-serif' },
    { label: 'DejaVu Sans', value: '"DejaVu Sans", sans-serif' },
    { label: 'Ubuntu', value: 'Ubuntu, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Courier New', value: '"Courier New", monospace' }
]);

// 执行模式选项
const executionModes = ref([
    { label: t('settings.executionModeWindow'), value: 'window' },
    { label: t('settings.executionModeChildprocess'), value: 'childprocess' }
    // { label: t('settings.executionModeCustom'), value: 'custom' }  // 自定义模式暂时禁用
]);

function generateShortcut() {
    window.api.generateShortcut(ret => {
        if (ret.success) {
            ElMessage({
                message: t('settings.shortcutCreated'),
                type: 'success'
            });
        } else {
            ElMessage.error(ret.msg);
        }
    });
}
function deleteShortcut() {
    window.api.deleteShortcut(ret => {
        if (ret.success) {
            ElMessage({
                message: t('settings.shortcutDeleted'),
                type: 'success'
            });
        } else {
            ElMessage.error(ret.msg);
        }
    });
}

async function handleLanguageChange(lang) {
    const result = await window.api.i18n.setLanguage(lang);
    if (!result.success) {
        ElMessage.error(result.msg || 'Failed to change language');
        currentLanguage.value = await window.api.i18n.getLanguage();
    }
}

async function handleFontChange(fontValue) {
    // 通过 IPC 保存字体设置到 canbox.json
    const result = await window.api.font.set(fontValue);

    if (!result.success) {
        ElMessage.error(result.msg || 'Failed to set font');
        return;
    }

    // 应用字体到整个应用
    applyFont(fontValue);

    ElMessage({
        message: t('settings.fontSetSuccess'),
        type: 'success'
    });
}

async function handleExecutionModeChange(mode) {
    const result = await window.api.execution.setGlobalMode(mode);
    if (!result.success) {
        ElMessage.error(result.msg || 'Failed to set execution mode');
        return;
    }
    ElMessage({
        message: t('settings.executionModeSetSuccess'),
        type: 'success'
    });
}

// 自定义数据路径相关函数
async function selectDirectory() {
    const result = await window.api.userData.selectDirectory();
    if (result.success) {
        newDataPath.value = result.path;
    }
}

async function saveCustomDataPath() {
    if (!newDataPath.value) {
        ElMessage.error(t('settings.customDataPathPlaceholder'));
        return;
    }

    isSaving.value = true;
    try {
        const result = await window.api.userData.migrate(newDataPath.value);
        if (result.success) {
            // 显示倒计时对话框
            restartIsAppImage.value = result.isAppImage;
            showRestartDialog.value = true;
            newDataPath.value = '';
        } else {
            ElMessage.error(t('settings.migrationFailed', { error: result.error }));
        }
    } catch (error) {
        ElMessage.error(t('settings.migrationFailed', { error: error.message }));
    } finally {
        isSaving.value = false;
    }
}

async function resetToDefault() {
    isSaving.value = true;
    try {
        const result = await window.api.userData.resetToDefault();
        if (result.success) {
            // 显示倒计时对话框
            restartIsAppImage.value = result.isAppImage;
            showRestartDialog.value = true;
        } else {
            ElMessage.error(t('settings.migrationFailed', { error: result.error }));
        }
    } catch (error) {
        ElMessage.error(t('settings.migrationFailed', { error: error.message }));
    } finally {
        isSaving.value = false;
    }
}

// 立刻重启
async function onRestartNow() {
    try {
        const result = await window.api.userData.restartNow();
        if (result.success) {
            showRestartDialog.value = false;
        }
    } catch (error) {
        ElMessage.error(t('settings.migrationFailed', { error: error.message }));
    }
}

async function saveLogRetentionDays() {
    const days = logRetentionDays.value;
    if (days < 0 || days > 30) {
        ElMessage.error(t('settings.retentionDaysError'));
        logRetentionDays.value = await window.api.logViewer.getRetentionDays();
        return;
    }
    const result = await window.api.logViewer.setRetentionDays(days);
    if (result.success) {
        ElMessage.success(t('settings.retentionDaysSaved'));
    } else {
        ElMessage.error(result.msg || t('settings.retentionDaysSaveFailed'));
    }
}

function applyFont(fontValue) {
    // 根据选择应用字体
    if (fontValue === 'default') {
        // 移除自定义字体，使用浏览器默认
        document.documentElement.style.fontFamily = '';
    } else {
        // 应用用户选择的字体
        document.documentElement.style.fontFamily = fontValue;
    }
}

// 监听字体更改事件（从其他窗口同步）
function onFontChanged(event, fontValue) {
    currentFont.value = fontValue;
    applyFont(fontValue);
}

async function loadSettings() {
    // 加载语言设置
    currentLanguage.value = await window.api.i18n.getLanguage();
    availableLanguages.value = await window.api.i18n.getAvailableLanguages();
    console.info('Current language:', currentLanguage.value);
    console.info('Available languages:', availableLanguages.value);

    // 通过 IPC 加载字体设置
    const savedFont = await window.api.font.get();
    currentFont.value = savedFont;
    applyFont(savedFont);

    // 加载执行模式设置
    const savedExecutionMode = await window.api.execution.getGlobalMode();
    currentExecutionMode.value = savedExecutionMode || 'window';

    // 加载自定义数据路径信息
    const pathResult = await window.api.userData.getCurrentPath();
    if (pathResult.success) {
        currentDataPath.value = pathResult.path;
    }

    const usageResult = await window.api.userData.getDiskUsage();
    if (usageResult.success) {
        diskUsage.value = usageResult.size;
    }

    // 加载日志保留天数配置
    logRetentionDays.value = await window.api.logViewer.getRetentionDays();
}

onMounted(() => {
    loadSettings();

    // 监听字体更改事件
    window.api.on('font-changed', onFontChanged);
});

onUnmounted(() => {
    // 清理事件监听
    window.api.off?.('font-changed', onFontChanged);
});
</script>

<style scoped>
.app-list-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 20px 0;
}

.app-list-section {
    height: calc(100vh - 60px);
    overflow-y: auto;
    margin: 5px 0 0 0;
    padding: 0;
    box-shadow: var(--el-box-shadow-lighter);
}

.card {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: flex-start;
}

.img-block {
    width: 60px;
    height: 100%;
    margin: 0;
    padding: 0;
}

.info-block {
    line-height: 80px;
    text-align: left;
    margin-left: 10px;
}

.info-block div {
    width: 300px;
}

.info-block .app-name {
    height: 40px;
    line-height: 40px;
    cursor: pointer;
}

.info-block .app-name:hover {
    color: #409eff;
    font-weight: bold;
}

.vertical-block {
    display: table;
}

.operate-block {
    width: 100%;
    margin-right: 20px;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: right;
}

.operate-block div {
    display: table-cell;
}

.operate-block div:first-child {
    text-align: left;
    padding-left: 10px;
}

.operate-block div:first-child span {
    color: gray;
}

.operate-icon-span {
    display: inline-block;
    cursor: pointer;
    text-align: center;
    border-radius: 20px;
    margin-right: 10px;
}

.operate-icon-span:hover {
    background-color: hsl(0, 0%, 80%);
}

.operate-icon-span:active {
    background-color: hsl(0, 0%, 70%);
}
</style>