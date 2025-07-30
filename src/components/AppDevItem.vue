<template>
    <div class="flex flex-wrap" style="margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
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
                <span class="operate-icon-span" @click="pack()" title="打包app">
                    <el-icon :size="35" color="#6a8759"><FolderAdd /></el-icon>
                </span>
                <span class="operate-icon-span" @click="load()" title="运行这个开发中的app">
                    <el-icon :size="35" color="#228b22"><VideoPlay /></el-icon>
                </span>
                <span class="operate-icon-span" @click="clearData(appDevItem.id)" title="清除用户数据">
                    <el-icon :size="35" color=""><Remove /></el-icon>
                </span>
                <span class="operate-icon-span" @click="remove(appDevItem.id)" title="删除这个开发中的app">
                    <el-icon :size="35" color="#ab4e52"><Delete /></el-icon>
                </span>
            </div>
        </div>
    </div>

    <el-drawer v-model="drawerInfo" :with-header="false" :size="600">
        <!-- <div style="text-align: left;" v-html="appDevInfoContent"></div> -->
        <el-tabs>
            <el-tab-pane label="app介绍">
                <div style="text-align: left;" v-html="appDevInfoContent" id="divAppInfo"></div>
            </el-tab-pane>
            <el-tab-pane label="版本记录"></el-tab-pane>
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
const appDevInfoContent = ref(null);

async function pack() {
    const { response } = await window.api.showDialog({
        type: 'info',
        title: `打包${props.appDevItem.appJson.name}`,
        message: `版本号: ${props.appDevItem.appJson.version}`,
        buttons: ['取消', '确定'],
        defaultId: 1,
        cancelId: 0,
    });

    if (response === 1) {
        const { filePaths } = await window.api.selectDirectory({
            title: '选择打包目录',
            properties: ['openDirectory'],
            defaultPath: '../../',
        });

        if (filePaths && filePaths.length > 0) {
            const outputPath = `${props.appDevItem.appJson.name}.asar`;
            await window.api.packToAsar(filePaths[0], outputPath);

            await window.api.showDialog({
                type: 'info',
                message: '打包完成',
                detail: `文件已保存到: ${outputPath}`,
            });
        }
    }
}
function load() {
    window.api.app.load(JSON.stringify(props.appDevItem), 'dev');
}
function clearData(id) {
    window.api.app.clearData(id, (result)=>{
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
function remove(id) {
    window.api.appDev.remove(id, (result)=>{
        console.info('remove result=', result);
        if(result.code !== '0000') {
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
        if(result.code!== '0000') {
            appDevInfoContent.value = result.data;//'Cannot laod infomation of this app';
            return;
        }
        appDevInfoContent.value = marked.parse(result.data);
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
</style>