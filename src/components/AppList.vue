<template>
    <el-row v-for="(item, index) in appList">
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="appList[index]"/></el-col>
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="appList[index + 1]"/></el-col>
    </el-row>
</template>

<script setup>
import { onBeforeMount, onMounted, ref } from 'vue';

import AppItem from '@/components/AppItem.vue';

let appList = ref({});
onBeforeMount(() => {
    window.api.app.all(result => {
        appList.value = result;
    });
});
onMounted(() => {
    // window.api.app.all(result => {
    //     appList.value = result;
    // });
});
</script>