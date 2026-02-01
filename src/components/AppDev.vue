<template>
    <div class="app-list-container">
        <!-- 第一部分：按钮区域 -->
        <div class="button-section">
            <el-button type="primary" @click="addAppDev">{{ $t('devApp.addApp') }}</el-button>
        </div>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="Object.keys(appDevData).length > 0">

            <el-row v-for="(appDevItem, uid) in appDevData" :key="uid">
                <el-col :span="24">
                    <div class="card" v-loading="exportAppFlag[uid]">
                        <div class="img-block">
                            <img style="width: 58px; height: 58px; cursor: pointer;" @click="showAppDevInfo(uid)"
                                :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
                        </div>
                        <div class="info-block vertical-block">
                            <div class="app-name" @click="showAppDevInfo(uid)">
                                <span style="font-weight: bold; font-size: 24px;">{{ appDevItem.appJson.name }}</span>
                                <span style="padding-left: 20px; color: gray;">{{ appDevItem.appJson.version }}</span>
                            </div>
                            <div style="height: 30px; line-height: 13px; font-size: 15px;">{{
                                appDevItem.appJson.description }}</div>
                        </div>
                        <div class="operate-block">
                            <span class="operate-icon-span" @click="packApp(uid)" :title="$t('devApp.packApp')">
                                <el-icon :size="35" color="#6a8759">
                                    <Expand />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="loadApp(uid)" :title="$t('devApp.runApp')">
                                <el-icon :size="35" color="#228b22">
                                    <VideoPlay />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="clearData(uid)" :title="$t('devApp.clearData')">
                                <el-icon :size="35" color="">
                                    <Delete />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="removeApp(uid)" :title="$t('devApp.removeApp')">
                                <el-icon :size="35" color="#ab4e52">
                                    <Remove />
                                </el-icon>
                            </span>
                        </div>
                    </div>
                </el-col>
            </el-row>
        </div>

        <!-- 空状态提示 -->
        <div class="empty-section" v-show="Object.keys(appDevData).length == 0">
            <p>{{ $t('devApp.empty') }}</p>
        </div>

        <div class="doc-links">
            <el-link type="primary" @click="openAppDevDoc">{{ $t('devApp.viewDevDoc') }}</el-link>
            <el-link type="primary" @click="openApiDoc">{{ $t('devApp.viewApiDoc') }}</el-link>
            <el-link type="primary" @click="downloadCanboxTS">{{ $t('devApp.downloadCanboxTypes') }}</el-link>
        </div>

    </div>

    <el-dialog v-model="centerDialogVisible" :title="$t('devApp.warningTitle')" width="300" center>
        <span style="white-space:pre-line">{{ warningContent }}</span>
        <template #footer>
            <div class="dialog-footer">
                <el-button type="primary" @click="centerDialogVisible = false"> {{ $t('devApp.confirm') }} </el-button>
            </div>
        </template>
    </el-dialog>

    <CustomDrawer v-model="drawerInfo" :size="580">
        <div class="drawer-container">
            <el-tabs class="drawer-tabs">
                <el-tab-pane :label="$t('appList.appIntro')">
                    <div class="drawer-content" id="divAppInfo" v-html="renderedReadme"></div>
                </el-tab-pane>
                <el-tab-pane :label="$t('appList.versionHistory')" v-if="historyFlag">
                    <div class="drawer-content" v-html="renderedHistory"></div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </CustomDrawer>
</template>

<style scoped>
.app-list-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.button-section {
    height: 60px;
    padding: 10px 0;
    line-height: 60px;
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
    height: 60px;
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
    line-height: 60px;
    text-align: left;
    margin-left: 10px;
}

.info-block div {
    width: 300px;
}

.info-block .app-name {
    height: 30px;
    line-height: 30px;
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

.empty-section {
    height: calc(100vh - 60px);
    display: flex;
    justify-content: center;
    align-items: center;
}

.doc-links {
    position: absolute;
    bottom: 0;
    width: 100%;
    text-align: center;
    padding: 10px 0;
    border-top: 1px solid #eee;
}

.doc-links .el-link {
    margin-right: 20px;
}

.doc-links .el-link:last-child {
    margin-right: 0;
}

/* 抽屉样式 */
.drawer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-tabs {
  flex-shrink: 0;
  height: 100%;
}

.drawer-tabs :deep(.el-tabs__header) {
  flex-shrink: 0;
}

.drawer-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  height: calc(100% - 55px);
}

.drawer-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.drawer-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  text-align: left;
  box-sizing: border-box;
}

.drawer-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.drawer-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.drawer-content :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.drawer-content :deep(p) {
  margin: 8px 0;
  line-height: 1.6;
}

.drawer-content :deep(h1),
.drawer-content :deep(h2),
.drawer-content :deep(h3) {
  margin-top: 20px;
  margin-bottom: 10px;
  font-weight: bold;
}

.drawer-content :deep(h1) {
  font-size: 28px;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.drawer-content :deep(h2) {
  font-size: 24px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.drawer-content :deep(h3) {
  font-size: 20px;
}

.drawer-content :deep(ul),
.drawer-content :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.drawer-content :deep(li) {
  margin: 4px 0;
}

.drawer-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.drawer-content :deep(th),
.drawer-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.drawer-content :deep(th) {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style>

<script setup>
import { onBeforeMount, onUpdated, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { renderAndOpenMarkdown } from '../utils/markdownRenderer';
import { md } from '@/utils/markdownRenderer';
import CustomDrawer from './CustomDrawer.vue';

const { t } = useI18n();

let appDevData = ref({});
const centerDialogVisible = ref(false);
const warningContent = ref('');
const drawerInfo = ref(false);
const readme = ref(null);
const history = ref(null);
const historyFlag = ref(false);
let appDevInfoData = ref({});
/**
 * 并行获取所有开发应用的详细信息（readme/history）
 */
function fetchAppDevDetails(apps) {
    const promises = Object.keys(apps).map(uid => {
        return new Promise((resolve) => {
            window.api.appDev.info(uid, (infoResult) => {
                if (infoResult.success) {
                    resolve({ uid, data: infoResult.data });
                } else {
                    console.error(`获取开发应用 ${uid} 信息失败:`, infoResult.msg);
                    resolve(null);
                }
            });
        });
    });

    Promise.all(promises).then(results => {
        results.forEach(item => {
            if (item && item.data) {
                appDevInfoData.value[item.uid] = {
                    readme: item.data.readme,
                    history: item.data.history
                };
            }
        });
    });
}

function addAppDev() {
    window.api.appDev.add((result) => {
        if (result?.correct && Object.keys(result.correct).length > 0) {
            // 只在有应用数据时才更新（避免用户取消时清空列表）
            appDevData.value = result.correct;
            // 并行获取详细信息
            fetchAppDevDetails(result.correct);
        }
        // 如果用户取消或返回空数据，不更新列表
    });
}

// 控制打包按钮的loading状态
let exportAppFlag = ref({});
// 打包app
async function packApp(uid) {
    exportAppFlag.value[uid] = true;
    const result = window.api.packToAsar(uid);
    result.then((result) => {
        if (!result.success) {
            ElMessage({
                type: 'error',
                message: result.msg,
            });
            return;
        }
        ElMessage({
            message: t('devApp.packSuccess'),
            type: 'success',
        });
    }).catch((err) => {
        ElMessage({
            type: 'error',
            message: err,
        });
    }).finally(() => {
        exportAppFlag.value[uid] = false;
    });
}

// 运行app
function loadApp(uid) {
    window.api.app.load(uid, true);
}

// 清除app运行数据
function clearData(uid) {
    window.api.app.clearData(uid, (result) => {
        console.info('clearData result=', result);
        if (!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: t('devApp.clearDataSuccess'),
            type: 'success'
        });
    });
}

function removeApp(uid) {
    window.api.app.remove({
        id: uid,
        devTag: true
    }, (result) => {
        console.info('remove result=', result);
        if (!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: t('devApp.removeSuccess'),
            type: 'success'
        });
        load();
    });
}

function load() {
    window.api.appDev.all((result) => {
        // 支持新格式 { success: true, data: appDevData, wrong: appDevFalseData }
        // 兼容旧格式 { correct: appDevData, wrong: appDevFalseData }
        if (result && result.success) {
            appDevData.value = result.data || {};
        } else if (result && result.correct) {
            appDevData.value = result.correct || {};
        } else {
            appDevData.value = {};
        }

        const wrongApps = result?.wrong || {};
        if (wrongApps && Object.keys(wrongApps).length > 0) {
            warningContent.value = `以下 app.json 存在问题，已经移除： \n ${Object.entries(wrongApps).map(([key, item]) => item.name || key).join('\n')}`;
            centerDialogVisible.value = true;
        }

        // 并行获取每个开发应用的详细信息
        if (result && (result.data || result.correct)) {
            const dataToProcess = result.data || result.correct || {};
            fetchAppDevDetails(dataToProcess);
        }
    });
}

// 显示开发应用信息（点击 logo 或名称时）
function showAppDevInfo(uid) {
    const appInfo = appDevInfoData.value[uid];
    if (!appInfo) {
        console.error('开发应用信息不存在:', uid);
        return;
    }

    // 设置 readme 和 history
    readme.value = appInfo.readme || '';
    history.value = appInfo.history || '';
    historyFlag.value = !!appInfo.history;

    // 打开 drawer
    drawerInfo.value = true;
}

// 渲染后的 readme HTML
const renderedReadme = computed(() => {
    if (!readme.value) return '';
    try {
        return md.render(readme.value);
    } catch (error) {
        console.error('渲染 README 失败:', error);
        return readme.value;
    }
});

// 渲染后的 history HTML
const renderedHistory = computed(() => {
    if (!history.value) return '';
    try {
        return md.render(history.value);
    } catch (error) {
        console.error('渲染 HISTORY 失败:', error);
        return history.value;
    }
});

// 打开APP开发文档
async function openAppDevDoc() {
    await renderAndOpenMarkdown('docs/APP_DEV_CN.md', 'APP 开发文档', { maxContentWidth: 1100 });
}

// 打开API文档
async function openApiDoc() {
    await renderAndOpenMarkdown('docs/API_CN.md', 'API 文档');
}

// 下载 canbox.d.ts 类型定义文件
async function downloadCanboxTS() {
    try {
        const result = await window.api.downloadCanboxTypes();

        if (!result.success) {
            ElMessage.error(t('devApp.downloadFailed') + result.msg);
            return;
        }

        // 用户取消操作，不显示任何提示
        if (result.msg === 'canceled') {
            return;
        }

        ElMessage.success(t('devApp.downloadSuccess'));
    } catch (error) {
        console.error('下载 canbox.d.ts 失败:', error);
        ElMessage.error(t('devApp.downloadFailed') + error.message);
    }
}

onBeforeMount(() => {
    load();
});

onUpdated(() => {
    // 拦截app介绍中的a标签链接跳转，使其使用外部浏览器打开
    const links = document.querySelectorAll('#divAppInfo a[href]');
    links.forEach(link => {
        link.addEventListener('click', e => {
            const url = link.getAttribute('href');
            e.preventDefault();
            window.api.openUrl(url);
        });
    });
});
</script>
