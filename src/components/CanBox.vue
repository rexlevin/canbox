<template>
    <div class="page-container">
        <el-container class="main-container">
            <el-main class="main-content">
                <el-tabs tab-position="left" v-model="activeName" class="full-height-tabs">
                    <el-tab-pane label="我的app" name="myApps" class="full-height-pane">
                        <AppList @switchTab="changeActiveTab"/>
                    </el-tab-pane>
                    <el-tab-pane label="APP 仓库" name="appRepos" class="full-height-pane"><AppRepos /></el-tab-pane>
                    <el-tab-pane label="用户中心" class="full-height-pane"><UserCenter/></el-tab-pane>
                    <el-tab-pane label="APP 开发" name="devApp" class="full-height-pane"><AppDev/></el-tab-pane>
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
</script>
