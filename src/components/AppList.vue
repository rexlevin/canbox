<template>
    <div v-show="appList.length > 0">
        <el-row v-for="(item, index) in appList">
            <el-col :span="12" v-if="index % 2 === 0"><AppItem :appItem="appList[index]"/></el-col>
            <el-col :span="12" v-if="index % 2 === 0"><AppItem :appItem="appList[index + 1]"/></el-col>
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

        // 2. 复制文件并重命名
        // await window.api.copyFile(asarPath);

        // 3. 调用合并后的操作
        const { success, error } = await window.api.importApp(asarPath);
        if (!success) {
            throw new Error(error);
        }

        window.api.app.all(result => {
            appList.value = result;
        });

        window.api.showMessageBox({
            title: '导入成功',
            message: '应用导入成功！',
            buttons: ['确定'],
        });
    } catch (error) {
        console.error('导入应用失败:', error);
        window.api.showMessageBox({
            title: '导入失败',
            message: '导入应用失败！',
            buttons: ['确定'],
        });
    }
}
</script>