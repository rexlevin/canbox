<template>
    <div class="common-layout my_container">
        <el-container class="my_container my_container">
            <el-container>
                <el-main class="my_main">
                    <el-tabs tab-position="left" v-model="activeName">
                        <el-tab-pane label="我的app" name="myApps">
                            <AppList @switchTab="changeActiveTab"/>
                        </el-tab-pane>
                        <el-tab-pane label="app仓库" name="appRepos"><AppRepos /></el-tab-pane>
                        <el-tab-pane label="用户中心"><UserCenter/></el-tab-pane>
                        <el-tab-pane label="app开发" name="devApp"><AppDev/></el-tab-pane>
                        <el-tab-pane label="设置"><Settings/></el-tab-pane>
                    </el-tabs>
                </el-main>
            </el-container>
            <el-footer class="bottom">footer</el-footer>
        </el-container>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import AppList from '@/components/AppList.vue';
import AppRepos from '@/components/AppRepos.vue';
import UserCenter from '@/components/UserCenter.vue'
import AppDev from '@/components/AppDev.vue';
import Settings from '@/components/Settings.vue';

let activeName = ref('myApps');
const changeActiveTab = (name) => {
    console.info('name: ', name)
    activeName.value = name;
}

// 监听键盘事件
const handleKeydown = (event) => {
    // console.info(event);
    if(event.ctrlKey && event.key == 'r') {
        window.api.reload();
    } else if (event.altKey && event.shiftKey && (event.key === 'i' || event.key === 'I')) {
        window.api.openDevTools();
    }
};

onMounted(() => {
    // 挂载键盘监听
    window.addEventListener('keydown', handleKeydown);
});
// 组件卸载时解绑事件
onUnmounted(() => {
    // 移除keydown监听
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.my_container{width: 100%; height: 100%;}
.my_main{padding: 0;}
.bottom {height: 40px; padding: 0;}
</style>
