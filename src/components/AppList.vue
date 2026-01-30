<template>
    <div class="app-list-container">
        <!-- 第一部分：按钮区域 -->
        <div class="button-section">
            <el-button type="primary" @click="importApp">{{ $t('appList.importApp') }}</el-button>
            <el-button type="primary" @click="toAnotherTab('appRepos')">{{ $t('appList.goToRepo') }}</el-button>
            <el-button type="primary" @click.prevent="toAnotherTab('devApp')">{{ $t('appList.goToDev') }}</el-button>
        </div>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="Object.keys(appsData).length > 0">
            <el-row v-for="(appItem, uid) in appsData" :key="uid">
                <el-col :span="24">
                     <div class="card">
                         <div class="img-block">
                            <img style="width: 58px; height: 58px; cursor: pointer;" @click="showAppInfo(uid)" :src="'file://' + appItem.appJson.logo" alt="" />
                            <span v-if="appItem.sourceTag === 'import'" class="import-tag" :title="$t('appList.importTagTitle')"><el-tag type="info" effect="dark">{{ $t('appList.importTag') }}</el-tag></span>
                        </div>
                        <div class="info-block vertical-block">
                            <div class="app-name" @click="showAppInfo(uid)">
                                <span style="font-weight: bold; font-size: 20px;">{{ appItem.name }}</span>
                                <span style="padding-left: 20px; color: gray;">{{ appItem.version }}</span>
                            </div>
                            <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appItem.description }}</div>
                        </div>
                        <div class="operate-block">
                            <div>
                                <span class="operate-icon-span" @click="loadApp(uid)" :title="$t('appList.runApp')">
                                    <el-icon :size="33" color="#228b22"><VideoPlay /></el-icon>
                                </span>
                                <span class="operate-icon-span" @click="clearData(uid)" :title="$t('appList.clearData')">
                                    <el-icon :size="33" color=""><Delete /></el-icon>
                                </span>
                                <span class="operate-icon-span" @click="removeApp(uid)" :title="$t('appList.removeApp')">
                                    <el-icon :size="33" color="#ab4e52"><Remove /></el-icon>
                                </span>
                            </div>
                        </div>
                     </div>
                </el-col>
            </el-row>
        </div>

        <!-- 空状态提示 -->
        <div class="empty-section" v-show="Object.keys(appsData).length == 0">
            <p>{{ $t('appList.empty') }}</p>
        </div>
    </div>

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
    margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);
}

.card {width: 100%; height: 60px; display: flex; justify-content: flex-start;}
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {line-height: 60px; text-align: left; margin-left: 10px;}
.info-block div{width: 300px;}
.info-block .app-name {height: 30px; line-height: 30px; cursor: pointer;}
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

.empty-section {
    height: calc(100vh - 60px);
    display: flex;
    justify-content: center;
    align-items: center;
}

.import-tag {
  position: absolute;
  left: 300px;
  top: 5px;
  /* width: 30px;
  right: 5px; */
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
import { onBeforeMount, onMounted, ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/appStore';
import { md } from '@/utils/markdownRenderer';
import CustomDrawer from './CustomDrawer.vue';

const { t } = useI18n();

// 定义触发的自定义事件
const emit = defineEmits(['switchTab']);
const toAnotherTab = (name) => {
    emit('switchTab', name);
}

let appsData = ref({});
const appStore = useAppStore();
const drawerInfo = ref(false);
const readme = ref(null);
const history = ref(null);
const historyFlag = ref(false);

onBeforeMount(() => {
    loadAppsData();
});

watch(
    () => appStore.appListUpdated,
    () => {
        loadAppsData();
    }
);

/**
 * 并行获取所有应用的详细信息（readme/history）
 */
function fetchAppsDetails(apps) {
    const promises = Object.keys(apps).map(uid => {
        console.info('uid: ', uid);
        return new Promise((resolve) => {
            window.api.app.info(uid, (infoResult) => {
                if (infoResult.success) {
                    resolve({ uid, data: infoResult.data });
                } else {
                    console.error(`获取应用 ${uid} 信息失败:`, infoResult.msg);
                    resolve(null);
                }
            });
        });
    });

    // 等待所有应用信息加载完成
    Promise.all(promises).then(results => {
        results.forEach(item => {
            if (item && item.data) {
                const existingApp = appsData.value[item.uid];
                if (existingApp) {
                    appsData.value[item.uid] = {
                        ...existingApp,
                        readme: item.data.readme,
                        history: item.data.history
                    };
                }
            }
        });
    });
}

/**
 * 导入已有app
 */
function loadAppsData() {
    window.api.app.all(result => {
        if (result.success) {
            // 初始化加载状态
            appsData.value = result.data;
            // 并行获取详细信息
            fetchAppsDetails(result.data);
        } else {
            console.info(result.msg || '获取APP列表失败');
        }
    });
}

// 显示应用信息（点击 logo 或名称时）
function showAppInfo(uid) {
    const appData = appsData.value[uid];
    if (!appData) {
        console.error('应用数据不存在:', uid);
        return;
    }

    // 设置 readme 和 history
    readme.value = appData.readme || '';
    history.value = appData.history || '';
    historyFlag.value = !!appData.history;

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

// 运行app
function loadApp(uid) {
    window.api.app.load(uid);
}

// 删除app数据
function clearData(uid) {
    window.api.app.clearData(uid, (result) => {
        console.info('clearData result=', result);
        if(!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: t('appList.clearDataSuccess'),
            type:'success'
        });
    });
}

// 移除app
function removeApp(uid) {
    // 这里增加一个确认弹框
    window.api.app.remove({
        id: uid,
        devTag: false
    }, (result) => {
        console.info('remove result=', result);
        if(!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        // 触发删除当前应用的事件
        delete appsData.value[uid];
        appStore.setRemovedAppId(uid);
        ElMessage({
            message: t('appList.removeSuccess'),
            type:'success'
        });
    });
}

// 从zip压缩文件导入app
async function importApp() {
    try {
        // 1. 选择 .zip 文件
        const { canceled, filePaths } = await window.api.selectFile({
            title: t('appList.selectFile'),
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['zip'] }],
        });
        if (canceled || !filePaths?.[0]) return;

        const zipPath = filePaths[0];

        // 2. 导入文件：复制文件并重命名
        const { success, error } = await window.api.importApp(zipPath);
        if (!success) {
            throw new Error(error);
        }

        window.api.app.all(result => {
            if (!result.success) {
                return;
            }
            appsData.value = result.data;
            // 并行获取详细信息
            fetchAppsDetails(result.data);
        });

        ElMessage({
            message: t('appList.importSuccess'),
            type: 'success',
        });
    } catch (error) {
        console.error('导入应用失败:', error);
        ElMessage.error(t('appList.importFailed') + error.message)
    }
}
</script>
