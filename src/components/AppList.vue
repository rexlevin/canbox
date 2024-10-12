<template>
    <el-row v-for="(item, index) in appList">
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="appList[index]"/></el-col>
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="appList[index + 1]"/></el-col>
    </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';

import AppItem from '@/components/AppItem.vue';

let appList = ref({});

onMounted(() => {
    appList.value = window.api.appList();
});
</script>