<template>
    <div class="app-list-container">
        <!-- 第一部分：设置列表区域 -->
        <div class="app-list-section">
            <el-row>
                <el-col :span="24">
                    <div class="card">
                        <el-form label-width="120px">
                            <el-form-item :label="$t('settings.language')" style="margin-bottom: 20px;">
                                <el-select v-model="currentLanguage" @change="handleLanguageChange" style="width: 200px;">
                                    <el-option
                                        v-for="lang in availableLanguages"
                                        :key="lang.code"
                                        :label="lang.name"
                                        :value="lang.code"
                                    />
                                </el-select>
                            </el-form-item>
                            <el-form-item :label="$t('settings.font')" style="margin-bottom: 20px;">
                                <el-select v-model="currentFont" @change="handleFontChange" style="width: 250px;">
                                    <el-option
                                        v-for="font in availableFonts"
                                        :key="font.value"
                                        :label="font.label"
                                        :value="font.value"
                                    />
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
                        </el-form>
                    </div>
                </el-col>
            </el-row>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const currentLanguage = ref('en-US');
const availableLanguages = ref([]);
const currentFont = ref('default');

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

function generateShortcut() {
    window.api.generateShortcut(ret => {
        if (ret.success) {
            ElMessage({
                message: t('settings.shortcutCreated'),
                type:'success'
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
                type:'success'
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
    margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);
}

.card {width: 100%; height: 100%; display: flex; justify-content: flex-start;}
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {line-height: 80px; text-align: left; margin-left: 10px;}
.info-block div{width: 300px;}
.info-block .app-name {height: 40px; line-height: 40px; cursor: pointer;}
.info-block .app-name:hover{color: #409eff; font-weight: bold;}
.vertical-block {display: table;}

.operate-block {width: 100%; margin-right: 20px;
    display: flex; flex: 1;
    align-items: center;
    justify-content: right;
}
.operate-block div {display: table-cell;}
.operate-block div:first-child {text-align: left; padding-left: 10px;}
.operate-block div:first-child span {color: gray;}
.operate-icon-span {display:inline-block; cursor: pointer; text-align: center; border-radius: 20px; margin-right: 10px;}
.operate-icon-span:hover { background-color: hsl(0, 0%, 80%); }
.operate-icon-span:active {background-color: hsl(0, 0%, 70%); }
</style>