<template>
    <div class="flex flex-wrap" v-loading="exportAppFlag" style="margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
        <div class="card">
            <div class="img-block">
                <img style="width: 58px; height: 58px; cursor: pointer;" @click="drawerInfo = true" :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
            </div>
            <div class="info-block vertical-block">
                <div class="app-name" @click="drawerInfo = true">
                    <span style="font-weight: bold; font-size: 20px;">{{ appDevItem.appJson.name }}</span>
                    <span style="padding-left: 20px; color: gray;">v{{ appDevItem.appJson.version }}</span>
                </div>
                <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appDevItem.appJson.description }}</div>
            </div>
            <div class="operate-block">
                <span class="operate-icon-span" @click="packApp" title="打包app">
                    <el-icon :size="35" color="#6a8759"><Expand /></el-icon>
                </span>
                <span class="operate-icon-span" @click="loadApp" title="运行这个开发中的app">
                    <el-icon :size="35" color="#228b22"><VideoPlay /></el-icon>
                </span>
                <span class="operate-icon-span" @click="clearData" title="清除用户数据">
                    <el-icon :size="35" color=""><Delete /></el-icon>
                </span>
                <span class="operate-icon-span" @click="removeApp" title="移除这个开发中的app">
                    <el-icon :size="35" color="#ab4e52"><Remove /></el-icon>
                </span>
            </div>
        </div>
    </div>

    <el-drawer v-model="drawerInfo" :with-header="false" :size="580">
        <el-tabs v-model="activeName">
            <el-tab-pane name="appInfo" label="app介绍">
                <div style="text-align: left;" v-html="readme" id="divAppInfo"></div>
            </el-tab-pane>
            <el-tab-pane label="版本记录" v-if="historyFlag" v-html="history"></el-tab-pane>
        </el-tabs>
    </el-drawer>
</template>

<script setup>
import { onBeforeMount, onMounted, onUpdated, ref } from 'vue'
import { ElMessage } from 'element-plus';
import { marked } from 'marked'

const props = defineProps({
    appDevItem: {
        type: Object,
        required: true,
        default: {}
    }
});

const emit = defineEmits(['reloadAppDev']);
const drawerInfo = ref(false);

const readme = ref(null);
const history = ref(null);
const historyFlag = ref(false);

const activeName = ref('appInfo');

// 控制打包按钮的loading状态
let exportAppFlag = ref(false);

async function packApp() {
    exportAppFlag.value = true;
    const result = window.api.packToAsar(JSON.stringify(props.appDevItem));
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

function loadApp() {
    window.api.app.load(JSON.stringify(props.appDevItem), 'dev');
}
function clearData() {
    window.api.app.clearData(props.appDevItem.id, (result)=>{
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
function removeApp() {
    window.api.app.remove({
            id: props.appDevItem.id,
            tag: 'dev'
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
        emit('reloadAppDev');
    });
}

onBeforeMount(() => {
    window.api.app.info(JSON.stringify(props.appDevItem), result => {
        // console.info('appDev info result=', result);
        if(!result.success) {
            readme.value = 'There is no infomation of this app';
            return;
        }
        if (result.data.readme) {
            readme.value = marked.parse(result.data.readme);
        } else {
            readme.value = 'There is no infomation of this app';
        }
        if (result.data.history) {
            history.value = marked.parse(result.data.history);
            historyFlag.value = true;
        } else {
            historyFlag.value = false;
        }
    });
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

<style scoped>
/* .card {width: 100%; height: 60px; border: 1px solid #626262; box-sizing: border-box; display: flex;} */
.card {width: 100%; height: 60px; display: flex; justify-content: flex-start;}
/* .card:hover{color: #409eff;} */
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
.operate-icon-span {display:inline-block; cursor: pointer; text-align: center; border-radius: 20px; margin-right: 10px;}
.operate-icon-span:hover { background-color: hsl(0, 0%, 80%); }
.operate-icon-span:active {background-color: hsl(0, 0%, 70%); }

.drawer-body{padding:0;}
.el-tabs--card { height: calc(100vh - 100px); }
.el-tab-pane { height: calc(100vh - 100px); overflow-y: auto; }
</style>