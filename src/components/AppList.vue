<template>
    <div v-show="appList.length > 0">
        <el-row v-for="(item, index) in appList">
            <el-col :span="24"><AppItem :appItem="appList[index]" @remove-app="handleRemoveApp"/></el-col>
            <!-- <el-col :span="12" v-if="index % 2 === 0"><AppItem :appItem="appList[index]"/></el-col>
            <el-col :span="12" v-if="index % 2 === 0"><AppItem :appItem="appList[index + 1]"/></el-col> -->
        </el-row>
    </div>
    <div v-show="appList.length == 0">
        here is nothing<br />
        click <a href="javascript:void(0);" @click="importApp">here</a> to import a app<br />
        click <a href="javascript:void(0);" @click="toAnotherTab('appRepos')">here</a> to get apps<br />
        or to <a href="javascript:void(0);" @click.prevent="toAnotherTab('devApp')">develop a app</a>
    </div>
</template>

<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus'
import AppItem from '@/components/AppItem.vue';

// 定义触发的自定义事件
const emit = defineEmits(['switchTab']);
const toAnotherTab = (name) => {
    emit('switchTab', name);
}

let appList = ref({});
onBeforeMount(() => {
    window.api.app.all(result => {
        appList.value = result;
    });
});

function handleRemoveApp(appId) {
    appList.value = appList.value.filter(app => app.id !== appId);
}

async function importApp() {
    try {
        // 1. 选择 .asar 文件
        const { canceled, filePaths } = await window.api.selectFile({
            title: '选择应用文件',
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['asar'] }],
        });
        if (canceled || !filePaths?.[0]) return;

        const asarPath = filePaths[0];

        // 2. 导入文件：复制文件并重命名
        const { success, error } = await window.api.importApp(asarPath);
        if (!success) {
            throw new Error(error);
        }

        window.api.app.all(result => {
            appList.value = result;
        });

        ElMessage({
            message: '应用导入成功！',
            type: 'success',
        });
    } catch (error) {
        console.error('导入应用失败:', error);
        ElMessage.error('导入应用失败：' + error.message)
    }
}
</script>