<template>
    <el-row>
        <el-col :span="24" style="height: 80px; line-height: 80px; box-shadow: var(--el-box-shadow-lighter);">
            <el-button type="primary" @click="addAppDev">选择 app.json 新建 app 项目</el-button>
        </el-col>
    </el-row>
    <el-row v-for="(item, index) in appDevList">
        <el-col :span="24"><AppDevItem :appDevItem="item" @reloadAppDev="reload"/></el-col>
    </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import AppDevItem from '@/components/AppDevItem.vue';

let appDevList = ref({});

function addAppDev() {
    window.api.appDev.add((result) => {
        console.info(1, 'result: ', result);
        appDevList.value = result;
    });
}

function reload() {
    appDevList.value = window.api.appDev.all();
}

onMounted(() => {
    appDevList.value = window.api.appDev.all();
    console.info(1, 'appDevInfo: ', appDevList.value);
});
</script>
