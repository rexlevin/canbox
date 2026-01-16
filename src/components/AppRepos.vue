<template>
    <div class="app-repos" v-loading="loading">
        <div class="button-section">
            <el-button type="primary" @click="showDialog">{{ $t('appRepo.addSource') }}</el-button>
            <el-button type="primary" @click="importAppRepos">{{ $t('appRepo.importSources') }}</el-button>
            <el-button type="primary" @click="exportAppRepos">{{ $t('appRepo.exportSources') }}</el-button>
        </div>

        <el-dialog
            v-model="dialogVisible"
            :title="$t('appRepo.addSourceTitle')"
            width="600px"
            :before-close="handleClose">
            <el-form
                ref="formRef"
                :model="{ repoUrl }"
                label-width="120px"
                label-position="top"
                @submit.prevent="addAppRepo">
                <el-form-item
                    :label="$t('appRepo.repoUrl')"
                    prop="repoUrl"
                    :rules="[
                        { required: true, message: $t('appRepo.repoUrlRequired'), trigger: 'blur' },
                        {
                            pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                            message: $t('appRepo.repoUrlInvalid'),
                            trigger: ['blur', 'change']
                        }
                    ]">
                    <el-input
                        v-model="repoUrl"
                        :placeholder="$t('appRepo.repoUrlPlaceholder')"
                        clearable
                        @input="formRef?.clearValidate('repoUrl')"/>
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="dialogVisible = false">{{ $t('appRepo.cancel') }}</el-button>
                    <el-button type="primary" @click="formRef?.validate().then(() => addAppRepo())">
                        {{ $t('appRepo.confirm') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="Object.keys(reposData).length > 0">
            <el-row v-for="(repo, uid) in reposData" :key="uid">
                <el-col :span="24">
                    <div class="card" v-loading="loadingTag[uid]">
                        <div class="img-block">
                            <img style="width: 58px; height: 58px; cursor: pointer;" :src="'file://' + repo.logo" alt="" />
                        </div>
                        <div class="info-block vertical-block">
                            <div class="app-name">
                                <span style="font-weight: bold; font-size: 20px;">{{ repo.name }}</span>
                                <span style="padding-left: 20px; color: gray;">{{ repo.version }}</span>
                            </div>
                            <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ repo.description }}</div>
                        </div>
                        <div class="operate-block">
                            <div>
                                <span class="operate-icon-span" @click="copyRepoURL(uid)" :title="$t('appRepo.copySource')">
                                    <el-icon :size="33"><CopyDocument /></el-icon>
                                </span>
                                <span class="operate-icon-span" v-show="!repo.downloaded" @click="downloadAppsFromRepo(uid)" :title="$t('appRepo.downloadApp')">
                                    <el-icon :size="33" color="#228b22"><Download /></el-icon>
                                </span>
                                <span class="operate-icon-span" v-show="repo.downloaded && !repo.toUpdate" style="cursor: not-allowed;" :title="$t('appRepo.appDownloaded')">
                                    <el-icon :size="33" color="#228b22"><CircleCheck /></el-icon>
                                </span>
                                <span class="operate-icon-span" v-show="repo.downloaded && repo.toUpdate" @click="downloadAppsFromRepo(uid)" :title="$t('appRepo.updateApp')">
                                    <el-icon :size="33" color="#228b22"><Refresh /></el-icon>
                                </span>
                                <span class="operate-icon-span" @click="removeRepo(uid)" :title="$t('appRepo.removeSource')">
                                    <el-icon :size="33" color="#ab4e52"><Remove /></el-icon>
                                </span>
                            </div>
                        </div>
                    </div>
                </el-col>
            </el-row>
        </div>

        <!-- 空状态提示 -->
        <div class="empty-section" v-show="Object.keys(reposData).length == 0">
            <p>{{ $t('appRepo.empty') }}</p>
        </div>
    </div>
</template>

<script setup>
import { onBeforeMount, ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

import { useAppStore } from '@/stores/appStore';
const appStore = useAppStore();

const { t } = useI18n();

const dialogVisible = ref(false);
const repoUrl = ref('');

// 控制loading状态
let loadingTag = ref({});

const showDialog = () => {
    dialogVisible.value = true;
};

const handleClose = (done) => {
    repoUrl.value = '';
    done();
};

const formRef = ref();
const loading = ref(false);
let reposData = ref({});

watch(() => appStore.removedAppId, (newAppId) => {
    if (newAppId) {
        window.api.updateReposStatus(newAppId, (result) => {
            console.log('Repos status %s updated: %o', newAppId, result);
            appStore.setRemovedAppId(null);
            fetchReposData();
        });
    }
});

onBeforeMount(() => {
    fetchReposData();
    // 监听仓库数据更新事件
    window.api.on('repo-data-updated', () => {
        fetchReposData();
    });
});

// 获取仓库列表
const fetchReposData = async () => {
    loading.value = true;
    window.api.getReposData(result => {
        if (result.success) {
            // 清空对象并重新赋值，确保响应式更新
            reposData.value = result.data;
            // Object.keys(reposData).forEach(key => delete reposData[key]);
            // Object.assign(reposData, result.data || {});
        } else {
            ElMessage.error(result.msg || t('appRepo.fetchFailed'));
        }
        loading.value = false;
    });
};

// 下载仓库中的应用
const downloadAppsFromRepo = (uid) => {
    loadingTag.value[uid] = true;
    window.api.downloadAppsFromRepo(uid, result => {
        console.info('downloadAppsFromRepo result: %o', result);
        if (result.success) {
            ElMessage.success(t('appRepo.downloadSuccess'));
            const appStore = useAppStore();
            appStore.triggerAppListUpdate();
            fetchReposData();   // 更新仓库列表
        } else {
            ElMessage.error(result.msg || t('appRepo.downloadFailed'));
        }
        loadingTag.value[uid] = false;
    });
};

// 删除仓库
const removeRepo = (uid) => {
    window.api.removeRepo(uid, result => {
        if (result.success) {
            ElMessage.success(t('appRepo.removeSuccess'));
            fetchReposData();
        } else {
            ElMessage.error(result.msg || t('appRepo.removeFailed'));
        }
    });
};

// 添加app源
const addAppRepo = async () => {
    loading.value = true;

    // 验证表单
    await formRef.value?.validate();

    dialogVisible.value = false;

    // 调用IPC接口
    window.api.addAppRepo(repoUrl.value, result => {
        if (result.success) {
            ElMessage.success(t('appRepo.addSuccess'));
            dialogVisible.value = false;
            repoUrl.value = '';
            fetchReposData();
        } else {
            ElMessage.error(result.msg || t('appRepo.addFailed'));
        }
        loading.value = false;
    });
};

const importAppRepos = () => {
    window.api.importAppRepos(ret => {
        console.log('importAppRepos ret: %o', ret);
        if (!ret.success && 'NoFileSelected' === ret.msg) {
            ElMessage(t('appRepo.noFileSelected'));
        } else if (!ret.success && 'Invalid JSON format' === ret.msg) {
            ElMessage({
                type: 'error',
                message: t('appRepo.invalidJson')
            });
        } else if (!ret.success && 'Invalid format: expected an array of repos' === ret.msg) {
            ElMessage({
                type: 'error',
                message: t('appRepo.invalidFormat')
            });
        } else if (!ret.success) {
            ElMessage({
                type: 'error',
                message: t('appRepo.importFailedPrefix') + ret.msg
            });
        } else {
            const { successCount, failedRepos, skippedCount } = ret.data || {};
            const failedCount = failedRepos ? failedRepos.length : 0;
            if (failedCount > 0 || skippedCount > 0) {
                let message = t('appRepo.importSuccessMsg', { count: successCount });
                if (skippedCount > 0) {
                    message = t('appRepo.importSuccessWithSkipped', { success: successCount, skipped: skippedCount });
                }
                if (failedCount > 0) {
                    message = t('appRepo.importSuccessWithFailed', { success: successCount, failed: failedCount });
                }
                ElMessage({
                    type: failedCount > 0 ? 'warning' : 'success',
                    message
                });
            } else {
                ElMessage({
                    type: 'success',
                    message: t('appRepo.importSuccessAll', { success: successCount })
                });
            }
        }
    });
};

const exportAppRepos = () => {
    window.api.exportReposData(ret => {
        console.log('exportAppRepos ret: %s', JSON.stringify(ret));
        if (!ret.success) {
            ElMessage({
                type: 'error',
                message: t('appRepo.exportFailed') + ret.msg
            });
        } else {
            ElMessage({
                type: 'success',
                message: t('appRepo.exportSuccess')
            });
        }
    });
}

// 复制仓库 URL 到剪贴板
const copyRepoURL = (uid) => {
    const repo = reposData.value[uid];
    if (repo && repo.repo) {
        navigator.clipboard.writeText(repo.repo).then(() => {
            ElMessage.success(t('appRepo.copySuccess'));
        }).catch(() => {
            ElMessage.error(t('appRepo.copyFailed'));
        });
    }
}
</script>

<style scoped>
.app-repos {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.button-section {
    height: 60px;
    padding: 10px 0;
    line-height: 60px;
}

button {
    padding: 10px 15px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background-color: #45a049;
}

/* 仓库列表样式 */
.app-list-section {
    height: calc(100vh - 60px);
    overflow-y: auto;
    margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);
}

.card {width: 100%; height: 60px; display: flex; justify-content: flex-start;}
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {line-height: 60px; text-align: left; margin-left: 10px;}
.info-block div{width: 300px;}
.info-block .app-name {height: 30px; line-height: 30px; cursor: pointer;}
.info-block .app-name:hover{color: #409eff; font-weight: bold;}
.vertical-block {display: table;}

.operate-block {width: 100%; margin-right: 20px;
    display: flex; flex: 1;
    align-items: center;
    justify-content: right;
}
.operate-block div {display: table-cell;}
.operate-block div:first-child {text-align: left; padding-left: 10px;}
.operate-block div:first-child span {color: gray;}
.operate-icon-span {display:inline-block; cursor: pointer; text-align: center; border-radius: 20px; margin-right: 10px;}
.operate-icon-span:hover { background-color: hsl(0, 0%, 80%); }
.operate-icon-span:active {background-color: hsl(0, 0%, 70%); }

.empty-section {
    height: calc(100vh - 60px);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #909399;
}
</style>