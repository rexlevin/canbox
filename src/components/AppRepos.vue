<template>
    <div class="app-repos" v-loading="loading">
        <div class="button-section">
            <el-button type="primary" @click="showDialog">添加 APP 源</el-button>
            <el-button type="primary" @click="importAppRepos">导入 APP 源列表</el-button>
        </div>

        <el-dialog
            v-model="dialogVisible"
            title="添加 APP 源"
            width="600px"
            :before-close="handleClose">
            <el-form 
                ref="formRef"
                :model="{ repoUrl, branch }" 
                label-width="120px" 
                label-position="top"
                @submit.prevent="addAppRepo">
                <el-form-item 
                    label="Git 仓库地址"
                    prop="repoUrl"
                    :rules="[
                        { required: true, message: '请输入仓库地址', trigger: 'blur' },
                        { 
                            pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 
                            message: '请输入有效的URL地址', 
                            trigger: ['blur', 'change'] 
                        }
                    ]">
                    <el-input
                        v-model="repoUrl"
                        placeholder="例如: https://github.com/username/repo"
                        clearable 
                        @input="formRef?.clearValidate('repoUrl')"/>
                </el-form-item>
                <el-form-item label="分支 (可选)" prop="branch">
                    <el-input
                        v-model="branch"
                        placeholder="例如: main 或 master, 默认为 main"
                        clearable />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="formRef?.validate().then(() => addAppRepo())">
                        确认
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="Object.keys(reposData).length > 0" style="margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
            <el-row v-for="(repo, uid) in reposData" :key="uid">
                <el-col :span="24">
                    <div class="card">
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
                                <span class="operate-icon-span" @click="downloadAppsFromRepo(uid)" title="下载这个APP">
                                    <el-icon :size="33" color="#228b22"><Download /></el-icon>
                                </span>
                                <span class="operate-icon-span" @click="removeRepo(uid)" title="移除这个app源">
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
            <p>暂无仓库</p>
        </div>
    </div>
</template>

<script setup>
import { onBeforeMount, ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useAppStore } from '@/stores/appStore';

const dialogVisible = ref(false);
const repoUrl = ref('');
const branch = ref('');

const showDialog = () => {
    dialogVisible.value = true;
};

const handleClose = (done) => {
    repoUrl.value = '';
    done();
};

const formRef = ref();
const loading = ref(false);
let reposData = reactive({});

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
            Object.keys(reposData).forEach(key => delete reposData[key]);
            Object.assign(reposData, result.data || {});
        } else {
            ElMessage.error(result.msg || '获取仓库列表失败');
        }
        loading.value = false;
    });
};

// 下载仓库中的应用
const downloadAppsFromRepo = (uid) => {
    window.api.downloadAppsFromRepo(uid, result => {
        if (result.success) {
            ElMessage.success('app下载成功');
            const appStore = useAppStore();
            appStore.triggerAppListUpdate();
        } else {
            ElMessage.error(result.msg || 'app下载失败');
        }
    });
};

// 删除仓库
const removeRepo = (uid) => {
    window.api.removeRepo(uid, result => {
        if (result.success) {
            ElMessage.success('仓库删除成功');
            fetchReposData();
        } else {
            ElMessage.error(result.msg || '仓库删除失败');
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
    window.api.addAppRepo(repoUrl.value, branch.value, result => {
        if (result.success) {
            ElMessage.success('仓库添加成功');
            dialogVisible.value = false;
            repoUrl.value = '';
            branch.value = '';
            fetchReposData();
        } else {
            ElMessage.error(result.msg || '仓库添加失败');
        }
        loading.value = false;
    });
},

importAppRepos = () => {
    window.api.importAppRepos(ret => {
        if (!ret.success) {
            ElMessage({
                type: 'error',
                message: '导入失败：' + ret.msg
            });
        } else {
            ElMessage({
                type: 'success',
                message: '导入成功'
            });
        }
    });
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