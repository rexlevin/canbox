<template>
    <div class="flex flex-wrap" style="margin: 5px 7px 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
        <div class="card">
            <div class="img-block">
                <img style="width: 58px; height: 58px; cursor: pointer;" @click="drawerInfo = true" :src="'file://' + appItem.path + '/' + appItem.appJson.logo" alt="" />
            </div>
            <div class="info-block vertical-block">
                <div class="app-name" @click="drawerInfo = true">
                    <span style="font-weight: bold; font-size: 20px;">{{ appItem.appJson.name }}</span>
                    <span style="padding-left: 20px; color: gray;">v{{ appItem.appJson.version }}</span>
                </div>
                <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appItem.appJson.description }}</div>
            </div>
            <div class="operate-block">
                <div>
                    <span class="operate-icon-span" @click="loadApp" title="运行这个app">
                        <el-icon :size="33" color="#228b22"><VideoPlay /></el-icon>
                    </span>
                    <span class="operate-icon-span" @click="clearData" title="清除用户数据">
                        <el-icon :size="33" color=""><Remove /></el-icon>
                    </span>
                    <span class="operate-icon-span" @click="removeApp" title="删除这个app">
                        <el-icon :size="33" color="#ab4e52"><Delete /></el-icon>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <el-drawer v-model="drawerInfo" :with-header="false" :size="600">
        <el-tabs>
            <el-tab-pane label="app介绍">
                <div style="text-align: left;" v-html="appInfoContent" id="divAppInfo"></div>
            </el-tab-pane>
            <el-tab-pane label="版本记录"></el-tab-pane>
        </el-tabs>
    </el-drawer>
</template>

<script setup>
import { onBeforeMount, onMounted, onUpdated, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { marked } from 'marked'

const emit = defineEmits(['remove-app']);

const props = defineProps({
    appItem: {
        type: Object,
        required: true,
        default: {}
    }
});

const drawerInfo = ref(false);
const appInfoContent = ref(null);

onBeforeMount(() => {
    // console.log('AppItem mounted:', props.appItem);
    window.api.app.info(JSON.stringify(props.appItem), result => {
        // console.info('appDev info result=', result);
        if(result.code!== '0000') {
            appInfoContent.value = result.data;//'Cannot laod infomation of this app';
            return;
        }
        // console.info(marked.parse(result.data));
        appInfoContent.value = marked.parse(result.data);
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

function loadApp() {
    // console.log('AppItem mounted:', props.appItem);
    window.api.app.load(JSON.stringify(props.appItem));
}
function clearData() {
    window.api.app.clearData(props.appItem.id, (result)=>{
        console.info('clearData result=', result);
        if(result.code !== '0000') {
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
    // 这里增加一个确认弹框
    window.api.app.remove({
        id: props.appItem.id,
        tag: ''
    }, (result) => {
        console.info('remove result=', result);
        if(result.code !== '0000') {
            ElMessage.error(result.msg);
            return;
        }
        // 触发删除当前应用的事件
        emit('remove-app', props.appItem.id);
        ElMessage({
            message: 'APP 删除成功',
            type:'success'
        }); 
    });
}
</script>

<style scoped>
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

.drawer-body{padding:0;}
.el-tabs--card { height: calc(100vh - 110px); }
.el-tab-pane { height: calc(100vh - 110px); overflow-y: auto; }
</style>