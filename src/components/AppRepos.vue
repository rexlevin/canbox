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
        <div class="app-list-section" v-show="Object.keys(reposData).length > 0">
            <el-row v-for="(repo, uid) in reposData" :key="uid">
                <el-col :span="24">
                    <div class="repo-item">
                        <div class="repo-info">
                            <span class="repo-name">{{ repo.name }}</span>
                            <span class="repo-branch">{{ repo.branch || 'main' }}</span>
                        </div>
                        <div class="repo-actions">
                            <!-- <el-button type="primary" size="small" @click="loadAppsFromRepo(repo)">加载应用</el-button> -->
                            <el-button type="danger" size="small" @click="removeRepo(uid)">删除</el-button>
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
});

// 获取仓库列表
const fetchReposData = async () => {
    loading.value = true;
    window.api.getReposData(result => {
        if (result.success) {
            // Object.assign(reposData, result.data || {});
            reposData = reactive(result.data);
        } else {
            ElMessage.error(result.error || '获取仓库列表失败');
        }
        loading.value = false;
    });
};

// 加载仓库中的应用
// const loadAppsFromRepo = (repo) => {
//     window.api.loadAppsFromRepo(repo.id, result => {
//         if (result.success) {
//             ElMessage.success(`已加载仓库 ${repo.repo} 中的应用`);
//         } else {
//             ElMessage.error(result.error || '加载应用失败');
//         }
//     });
// };

// 删除仓库
const removeRepo = (uid) => {
    window.api.removeRepo(uid, result => {
        if (result.success) {
            ElMessage.success('仓库删除成功');
            fetchReposData();
        } else {
            ElMessage.error(result.error || '仓库删除失败');
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
            ElMessage.error(result.error || '仓库添加失败');
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
    padding: 10px;
}

.repo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background-color: #fafafa;
}

.repo-info {
    display: flex;
    flex-direction: column;
}

.repo-name {
    font-weight: bold;
    margin-bottom: 5px;
}

.repo-branch {
    color: #909399;
    font-size: 12px;
}

.repo-actions {
    display: flex;
    gap: 10px;
}

.empty-section {
    height: calc(100vh - 60px);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #909399;
}
</style>