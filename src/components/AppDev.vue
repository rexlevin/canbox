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
                    <div class="card">
                        <div class="img-block">
                            <img style="width: 58px; height: 58px; cursor: pointer;" @click="drawerInfo = true" :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
                        </div>
                        <div class="info-block vertical-block">
                            <div class="app-name" @click="drawerInfo = true">
                                <span style="font-weight: bold; font-size: 20px;">{{ appDevItem.appJson.name }}</span>
                                <span style="padding-left: 20px; color: gray;">{{ appDevItem.appJson.version }}</span>
                            </div>
                            <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appDevItem.appJson.description }}</div>
                        </div>
                        <div class="operate-block">
                            <span class="operate-icon-span" @click="packApp(uid)" title="打包app">
                                <el-icon :size="35" color="#6a8759"><Expand /></el-icon>
                            </span>
                            <span class="operate-icon-span" @click="loadApp(uid)" title="运行这个开发中的app">
                                <el-icon :size="35" color="#228b22"><VideoPlay /></el-icon>
                            </span>
                            <span class="operate-icon-span" @click="clearData(uid)" title="清除用户数据">
                                <el-icon :size="35" color=""><Delete /></el-icon>
                            </span>
                            <span class="operate-icon-span" @click="removeApp(uid)" title="移除这个开发中的app">
                                <el-icon :size="35" color="#ab4e52"><Remove /></el-icon>
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
</style>

<script setup>
import { onBeforeMount, ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import AppDevItem from '@/components/AppDevItem.vue';

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
let exportAppFlag = ref(false);
// 打包app
async function packApp(uid) {
    exportAppFlag.value = true;
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
        exportAppFlag.value = false;
    });
}

// 运行app
function loadApp(uid) {
    window.api.app.load(uid, 'dev');
}

// 清除app运行数据
function clearData(uid) {
    window.api.app.clearData(uid, (result)=>{
        console.info('clearData result=', result);
        if(!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: '清除数据成功',
            type:'success'
        });
    });
}

function removeApp(uid) {
    window.api.app.remove({
            id: uid,
            devTag: true
        }, (result) => {
        console.info('remove result=', result);
        if(!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: 'APP 删除成功',
            type:'success'
        });
        load();
    });
}

function load() {
    window.api.appDev.all((result) => {
        appDevData.value = result.correct;
        if(result.wrong && Object.keys(result.wrong).length > 0) {
            warningContent.value = `以下 app.json 存在问题，已经移除： \n ${Object.entris(result.wrong).map(item => item.name).join('\n')}`;
            centerDialogVisible.value = true;
        }
    });
}

onBeforeMount(() => {
    load();
});
</script>
