<template>
    <el-row>
        <el-col :span="24" style="height: 80px; line-height: 80px; box-shadow: var(--el-box-shadow-lighter);">
            <el-button type="primary" @click="addAppDev">选择 app.json 新建 app 项目</el-button>
        </el-col>
    </el-row>
    <el-row v-for="(item, index) in appDevList">
        <el-col :span="24"><AppDevItem :appDevItem="item" @reloadAppDev="load"/></el-col>
    </el-row>

    <el-dialog v-model="centerDialogVisible" title="Warning" width="300" center>
        <span style="white-space:pre-line">{{ warningContent }}</span>
        <template #footer>
        <div class="dialog-footer">
            <el-button type="primary" @click="centerDialogVisible = false"> 确&nbsp;&nbsp;&nbsp;&nbsp;定 </el-button>
        </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { onBeforeMount, ref } from 'vue';
import AppDevItem from '@/components/AppDevItem.vue';

let appDevList = ref({});
const centerDialogVisible = ref(false);
const warningContent = ref('');

function addAppDev() {
    window.api.appDev.add((result) => {
        appDevList.value = result?.correct;
    });
}

function load() {
    // appDevList.value = null;
    window.api.appDev.all((result) => {
        appDevList.value = result.correct;
        if(result.wrong && result.wrong.length > 0) {
            warningContent.value = `以下 app.json 存在问题，已经移除： \n ${result.wrong.map(item => item.name).join('\n')}`;
            centerDialogVisible.value = true;
        }
    });
}

onBeforeMount(() => {
    load();
});
</script>
