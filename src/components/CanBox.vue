<template>
    <div class="page-container">
        <el-container class="main-container">
            <el-main class="main-content">
                <el-tabs tab-position="left" v-model="activeName" class="full-height-tabs">
                    <el-tab-pane label="我的app" name="myApps" class="full-height-pane">
                        <AppList @switchTab="changeActiveTab"/>
                    </el-tab-pane>
                    <el-tab-pane label="app仓库" name="appRepos" class="full-height-pane"><AppRepos /></el-tab-pane>
                    <el-tab-pane label="用户中心" class="full-height-pane"><UserCenter/></el-tab-pane>
                    <el-tab-pane label="app开发" name="devApp" class="full-height-pane"><AppDev/></el-tab-pane>
                    <el-tab-pane label="设置" class="full-height-pane"><Settings/></el-tab-pane>
                </el-tabs>
            </el-main>
            <!-- <el-footer class="footer">footer</el-footer> -->
        </el-container>
    </div>
</template>

<style scoped>
.page-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
}

.main-container {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.main-content {
    height: calc(100vh - 40px);
    padding: 0;
}

.full-height-tabs {
    height: 100%;
}

.full-height-pane {
    height: 100%;
    overflow: hidden;
}

.footer {
    height: 40px;
    line-height: 40px;
    text-align: center;
}
</style>

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
