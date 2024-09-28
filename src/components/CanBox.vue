<template>
    <div class="common-layout my_container">
        <el-container class="my_container my_container">
            <el-container>
                <el-main class="my_main">
                    <el-tabs tab-position="left">
                        <el-tab-pane label="我的app">
                            <AppList :appList="appList"/>
                        </el-tab-pane>
                        <el-tab-pane label="app商店">app商店</el-tab-pane>
                        <el-tab-pane label="用户中心"><UserCenter/></el-tab-pane>
                        <el-tab-pane label="app开发"><AppDev/></el-tab-pane>
                        <el-tab-pane label="设置">设置</el-tab-pane>
                    </el-tabs>
                </el-main>
            </el-container>
            <el-footer class="bottom">footer</el-footer>
        </el-container>
    </div>
</template>

<script setup>
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue';
import AppList from '@/components/AppList.vue';
import UserCenter from '@/components/UserCenter.vue'
import AppDev from '@/components/AppDev.vue';

const appList = ref(null);
const appDevList = ref(null);

onBeforeMount(() => {
    appList.value = window.api.appList();
    appDevList.value = window.api.appDevList();
});
</script>

<style scoped>
.my_container{width: 100%; height: 100%;}
.my_main{padding: 0;}
.bottom {height: 40px; padding: 0;}
</style>
