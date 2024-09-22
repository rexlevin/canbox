<template>
    <div class="common-layout my_container">
        <el-container class="my_container my_container">
            <el-container>
                <el-main class="my_main">
                    <el-tabs tab-position="left">
                        <el-tab-pane label="我的app">
                            <AppList :extensionList="extensionList"/>
                        </el-tab-pane>
                        <el-tab-pane label="app商店">app商店</el-tab-pane>
                        <el-tab-pane label="用户中心">用户中心</el-tab-pane>
                        <el-tab-pane label="设置">设置</el-tab-pane>
                    </el-tabs>
                </el-main>
            </el-container>
            <el-footer class="bottom">footer</el-footer>
        </el-container>
    </div>
</template>

<script setup>
import AppList from './AppList.vue';
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue';

const extensionList = ref(null);

onBeforeMount(() => {
    extensionList.value = window.api.getExtensionList();
    console.info(extensionList.value);
});
</script>

<style scoped>
.my_container{width: 100%; height: 100%;}
.my_main{padding: 0;}
.bottom {height: 40px; padding: 0;}
</style>
