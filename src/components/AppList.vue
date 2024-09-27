<template>
    <!-- <el-row>
        <el-col :span="24"><div>asdf</div></el-col>
    </el-row> -->
    <el-row v-for="(item, index) in appList">
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="appList[index]"/></el-col>
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="appList[index + 1]"/></el-col>
        <!-- <el-col :span="12" v-if="index % 2 == 0">{{ extensionList[index].config.name }}</el-col> -->
        <!-- <el-col :span="12" v-if="index % 2 == 0">{{ extensionList[index + 1].config.name }}</el-col> -->
    </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';

import AppItem from './AppItem.vue';

const props = defineProps({
    appList: {
        type: Array,
        required: true,
        default: []
    }
});

onMounted(() => {
});
</script>