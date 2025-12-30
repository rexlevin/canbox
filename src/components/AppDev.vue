<template>
    <div class="app-list-container">
        <!-- 第一部分：按钮区域 -->
        <div class="button-section">
            <el-button type="primary" @click="addAppDev">选择 app.json 新建 app 项目</el-button>
        </div>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="Object.keys(appDevData).length > 0">

            <el-row v-for="(appDevItem, uid) in appDevData" :key="uid">
                <el-col :span="24">
                    <div class="card" v-loading="exportAppFlag[uid]">
                        <div class="img-block">
                            <img style="width: 58px; height: 58px; cursor: pointer;" @click="drawerInfo = true"
                                :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
                        </div>
                        <div class="info-block vertical-block">
                            <div class="app-name" @click="drawerInfo = true">
                                <span style="font-weight: bold; font-size: 20px;">{{ appDevItem.appJson.name }}</span>
                                <span style="padding-left: 20px; color: gray;">{{ appDevItem.appJson.version }}</span>
                            </div>
                            <div style="height: 30px; line-height: 13px; font-size: 12px;">{{
                                appDevItem.appJson.description }}</div>
                        </div>
                        <div class="operate-block">
                            <span class="operate-icon-span" @click="packApp(uid)" title="打包app">
                                <el-icon :size="35" color="#6a8759">
                                    <Expand />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="loadApp(uid)" title="运行这个开发中的app">
                                <el-icon :size="35" color="#228b22">
                                    <VideoPlay />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="clearData(uid)" title="清除用户数据">
                                <el-icon :size="35" color="">
                                    <Delete />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="removeApp(uid)" title="移除这个开发中的app">
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
            <p>暂无开发中的应用</p>
        </div>

        <div class="doc-links">
            <el-link type="primary" @click="openAppDevDoc">查看 APP 开发文档</el-link>
            <el-link type="primary" @click="openApiDoc">查看 API 文档</el-link>
        </div>

    </div>

    <el-dialog v-model="centerDialogVisible" title="Warning" width="300" center>
        <span style="white-space:pre-line">{{ warningContent }}</span>
        <template #footer>
            <div class="dialog-footer">
                <el-button type="primary" @click="centerDialogVisible = false"> 确&nbsp;&nbsp;&nbsp;&nbsp;定 </el-button>
            </div>
        </template>
    </el-dialog>
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
</style>

<script setup>
import { onBeforeMount, onUpdated, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { renderAndOpenMarkdown } from '../utils/markdownRenderer';

let appDevData = ref({});
const centerDialogVisible = ref(false);
const warningContent = ref('');

function addAppDev() {
    window.api.appDev.add((result) => {
        if (result?.correct) {
            appDevData.value = result.correct;
        }
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
            message: '打包成功！',
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
            message: '清除数据成功',
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
            message: 'APP 删除成功',
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
    });
}

// 打开APP开发文档
async function openAppDevDoc() {
    await renderAndOpenMarkdown('docs/APP_DEV_CN.md', 'APP 开发文档', { maxContentWidth: 1100 });
}

// 打开API文档
async function openApiDoc() {
    await renderAndOpenMarkdown('docs/API_CN.md', 'API 文档');
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
