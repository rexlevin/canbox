<template>
    <div class="page-container">
        <el-container class="main-container">
            <el-main class="main-content">
                <div class="custom-layout">
                    <!-- 左侧菜单栏 -->
                    <div class="sidebar">
                        <div 
                            v-for="item in menuItems" 
                            :key="item.name"
                            :class="['menu-item', { active: activeName === item.name }]"
                            @click="changeActiveTab(item.name)"
                        >
                            <el-tooltip 
                                v-if="item.name === 'about' && aboutTooltip" 
                                :content="aboutTooltip" 
                                placement="right"
                            >
                                <span class="menu-label">
                                    <span class="menu-icon">{{ item.icon }}</span>
                                    <span>{{ item.label }}</span>
                                </span>
                            </el-tooltip>
                            <span v-else class="menu-label">
                                <span class="menu-icon">{{ item.icon }}</span>
                                <span>{{ item.label }}</span>
                            </span>
                        </div>
                    </div>
                    
                    <!-- 右侧内容区 -->
                    <div class="content-area">
                        <div v-show="activeName === 'myApps'" class="tab-panel">
                            <AppList @switchTab="changeActiveTab"/>
                        </div>
                        <div v-show="activeName === 'appRepos'" class="tab-panel">
                            <AppRepos />
                        </div>
                        <div v-show="activeName === 'devApp'" class="tab-panel">
                            <AppDev/>
                        </div>
                        <div v-show="activeName === 'settings'" class="tab-panel">
                            <Settings/>
                        </div>
                        <div v-show="activeName === 'about'" class="tab-panel">
                            <About/>
                        </div>
                    </div>
                </div>
            </el-main>
        </el-container>
    </div>
</template>

<style scoped>
.page-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.main-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.main-content {
    height: 100%;
    padding: 0 !important;
}

/* 自定义布局 */
.custom-layout {
    display: flex;
    height: 100%;
    overflow: hidden;
}

/* 左侧菜单栏 */
.sidebar {
    width: 15vw;
    max-width: 280px;
    min-width: 200px;
    padding: 8px 0;
    border-right: 1px solid #e4e7ed;
}

/* 菜单项 */
.menu-item {
    padding: 14px 16px;
    margin: 4px 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.25s ease, color 0.25s ease, border-left-color 0.25s ease;
    font-size: 20px;
    color: #606266;
    border-left: 3px solid transparent;
    user-select: none;
}

/* 悬停效果 */
.menu-item:hover {
    background-color: #f5f7fa;
    color: #606266;
}

/* 选中状态 */
.menu-item.active {
    background-color: #ecf5ff;
    color: #409eff;
    border-left: 3px solid #409eff;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

/* 菜单标签内容 */
.menu-label {
    display: flex;
    align-items: center;
    gap: 10px;
}

.menu-icon {
    font-size: 20px;
    line-height: 1;
}

/* 右侧内容区 */
.content-area {
    flex: 1;
    overflow: hidden;
    min-width: 0;
    position: relative;
}

.tab-panel {
    height: 100%;
    overflow: hidden;
    position: relative;
    min-width: 0;
}
</style>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
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

// 页面加载时读取上次选中的菜单
onMounted(async () => {
    try {
        const result = await window.api.menu.getLast();
        if (result.success && result.menu) {
            activeName.value = result.menu;
        }
    } catch (error) {
        console.error('Failed to get last menu:', error);
    }
});

// 页面关闭前保存当前选中的菜单
onBeforeUnmount(async () => {
    try {
        await window.api.menu.setLast(activeName.value);
    } catch (error) {
        console.error('Failed to save last menu:', error);
    }
});

// 关于标签的 label - 有更新或错误时显示图标
const hasUpdate = computed(() => updateStore.hasUpdate);
const hasError = computed(() => updateStore.hasError);

// 关于标签图标
const aboutIcon = computed(() => {
    if (hasUpdate.value && hasError.value) {
        return '🔔';
    } else if (hasUpdate.value) {
        return '🔔';
    } else if (hasError.value) {
        return '⚠️';
    }
    return 'ℹ️';
});

// 关于标签的 Tooltip - 显示更新或错误详情
const aboutTooltip = computed(() => {
    const hasUpdate = updateStore.hasUpdate;
    const hasError = updateStore.hasError;
    const version = updateStore.updateInfo?.version;

    if (hasUpdate) {
        console.log('[CanBox.vue] aboutTooltip 计算 - hasUpdate:', hasUpdate, 'version:', version);
    }

    if (hasUpdate && hasError) {
        return t('autoUpdate.newVersionAvailable', { version }) + ' | ' + t('autoUpdate.updateError');
    } else if (hasUpdate) {
        return t('autoUpdate.newVersionAvailable', { version });
    } else if (hasError) {
        return t('autoUpdate.updateError');
    }
    return ''; // 无更新和错误时不显示 tooltip
});

// 菜单项配置
const menuItems = computed(() => [
    { name: 'myApps', icon: '📱', label: t('canbox.myApps') },
    { name: 'appRepos', icon: '📦', label: t('canbox.appRepo') },
    { name: 'devApp', icon: '💻', label: t('canbox.devApp') },
    { name: 'settings', icon: '⚙️', label: t('settings.title') },
    { name: 'about', icon: aboutIcon.value, label: t('canbox.about') },
]);

const changeActiveTab = async (name) => {
    console.info('name: ', name)
    activeName.value = name;
    // 保存到配置
    try {
        await window.api.menu.setLast(name);
    } catch (error) {
        console.error('Failed to save menu:', error);
    }
}
</script>
