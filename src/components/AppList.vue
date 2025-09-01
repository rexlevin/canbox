<template>
    <div class="app-list-container">
        <!-- 第一部分：按钮区域 -->
        <div class="button-section">
            <el-button type="primary" @click="importApp">导入已有app</el-button>
            <el-button type="primary" @click="toAnotherTab('appRepos')">去仓库下载</el-button>
            <el-button type="primary" @click.prevent="toAnotherTab('devApp')">去开发自己的app</el-button>
        </div>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="appList.length > 0">
            <el-row v-for="(item, index) in appList">
                <el-col :span="24">
                    <AppItem :appItem="appList[index]" @remove-app="handleRemoveApp" />
                </el-col>
            </el-row>
        </div>

        <!-- 空状态提示 -->
        <div class="empty-section" v-show="appList.length == 0">
            <p>暂无应用</p>
        </div>
    </div>
</template>

<style scoped>
.app-list-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.button-section {
    height: 60px;
    padding: 10px 0;
    line-height: 60px;
}

.app-list-section {
    height: calc(100vh - 60px);
    overflow-y: auto;
}

.empty-section {
    height: calc(100vh - 60px);
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>

<script setup>
import { onBeforeMount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import AppItem from '@/components/AppItem.vue';
import { useAppStore } from '@/stores/appStore';

// 定义触发的自定义事件
const emit = defineEmits(['switchTab']);
const toAnotherTab = (name) => {
    emit('switchTab', name);
}

let appList = ref({});
const appStore = useAppStore();

onBeforeMount(() => {
    loadAppList();
});

watch(
    () => appStore.appListUpdated,
    () => {
        loadAppList();
    }
);

function loadAppList() {
    window.api.app.all(result => {
        appList.value = result;
    });
}

function handleRemoveApp(appId) {
    appList.value = appList.value.filter(app => app.id !== appId);
    const appStore = useAppStore();
    appStore.setRemovedAppId(appId);
}

async function importApp() {
    try {
        // 1. 选择 .zip 文件
        const { canceled, filePaths } = await window.api.selectFile({
            title: '选择应用文件',
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['zip'] }],
        });
        if (canceled || !filePaths?.[0]) return;

        const zipPath = filePaths[0];

        // 2. 导入文件：复制文件并重命名
        const { success, error } = await window.api.importApp(zipPath);
        if (!success) {
            throw new Error(error);
        }

        window.api.app.all(result => {
            appList.value = result;
        });

        ElMessage({
            message: '应用导入成功！',
            type: 'success',
        });
    } catch (error) {
        console.error('导入应用失败:', error);
        ElMessage.error('导入应用失败：' + error.message)
    }
}
</script>
