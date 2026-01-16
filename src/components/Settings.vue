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
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const currentLanguage = ref('en-US');
const availableLanguages = ref([]);

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

async function loadSettings() {
    currentLanguage.value = await window.api.i18n.getLanguage();
    availableLanguages.value = await window.api.i18n.getAvailableLanguages();
    console.info('Current language:', currentLanguage.value);
    console.info('Available languages:', availableLanguages.value)
}
onMounted(() => {
    loadSettings();
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

.card {width: 100%; height: 80px; display: flex; justify-content: flex-start;}
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