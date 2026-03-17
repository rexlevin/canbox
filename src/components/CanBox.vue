<template>
    <div class="page-container">
        <el-container class="main-container">
            <el-main class="main-content">
                <el-tabs tab-position="left" v-model="activeName" class="full-height-tabs">
                    <el-tab-pane :label="$t('canbox.myApps')" name="myApps" class="full-height-pane">
                        <AppList @switchTab="changeActiveTab"/>
                    </el-tab-pane>
                    <el-tab-pane :label="$t('canbox.appRepo')" name="appRepos" class="full-height-pane"><AppRepos /></el-tab-pane>
                    <!-- <el-tab-pane :label="$t('canbox.userCenter')" class="full-height-pane"><UserCenter/></el-tab-pane> -->
                    <el-tab-pane :label="$t('canbox.devApp')" name="devApp" class="full-height-pane"><AppDev/></el-tab-pane>
                    <el-tab-pane :label="$t('settings.title')" class="full-height-pane"><Settings/></el-tab-pane>
                    <el-tab-pane :label="aboutLabel" :name="'about'" class="full-height-pane">
                        <About/>
                    </el-tab-pane>
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

/* 左侧标签页自适应宽度，最大宽度 280px */
.full-height-tabs :deep(.el-tabs__header) {
    width: 15vw;
    max-width: 280px;
    min-width: 180px;
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
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppList from '@/components/AppList.vue';
import AppRepos from '@/components/AppRepos.vue';
import UserCenter from '@/components/UserCenter.vue'
import AppDev from '@/components/AppDev.vue';
import About from '@/components/About.vue';
import Settings from '@/components/Settings.vue';
import { useUpdateStore } from '@/stores/updateStore';

const { t } = useI18n();
const updateStore = useUpdateStore();
let activeName = ref('myApps');

// 关于标签的 label - 有更新时显示图标
const aboutLabel = computed(() => {
    if (updateStore.hasUpdate) {
        return `🔔 ${t('canbox.about')}`;
    }
    return t('canbox.about');
});

const changeActiveTab = (name) => {
    console.info('name: ', name)
    activeName.value = name;
}
</script>
