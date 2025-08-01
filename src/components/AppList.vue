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

function importApp() {
}
</script>