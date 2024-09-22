<template>
    <!-- <el-row>
        <el-col :span="24"><div>asdf</div></el-col>
    </el-row> -->
    <el-row v-for="(item, index) in extensionList">
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="extensionList[index]"/></el-col>
        <el-col :span="12" v-if="index % 2 == 0"><AppItem :appItem="extensionList[index + 1]"/></el-col>
        <!-- <el-col :span="12" v-if="index % 2 == 0">{{ extensionList[index].config.name }}</el-col> -->
        <!-- <el-col :span="12" v-if="index % 2 == 0">{{ extensionList[index + 1].config.name }}</el-col> -->
    </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';

import AppItem from './AppItem.vue';

const props = defineProps({
    extensionList: {
        type: Array,
        required: true,
        default: []
    }
});

onMounted(() => {
});
</script>