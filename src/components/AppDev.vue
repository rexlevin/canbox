<template>
    <el-row>
        <el-col :span="24" style="height: 80px; line-height: 80px; box-shadow: var(--el-box-shadow-lighter);">
            <el-button type="primary" @click="newApp">选择 app.json 新建 app 项目</el-button>
        </el-col>
    </el-row>
    <el-row v-for="(item, index) in appDevList">
        <el-col :span="24"><AppDevItem :appDevItem="item"/></el-col>
    </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import AppDevItem from '@/components/AppDevItem.vue';

function newApp() {
    appDevList = window.api.openAppJson((result) => {
        console.info(1, 'result: ', result);
    });
}

let appDevList = ref({});

onMounted(() => {
    appDevList.value = window.api.appDevList();
    console.info(1, 'appDevInfo: ', appDevList.value);
});
</script>
