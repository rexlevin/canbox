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
    </div>
</template>

<script setup>
import { ref } from 'vue';
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
</style>