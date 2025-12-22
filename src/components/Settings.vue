<template>
    <el-card shadow="hover">
        <el-form label-width="120px">
            <el-form-item label="为所有APP" style="margin-bottom: 20px;">
                <div style="display: flex; gap: 10px;">
                    <el-button type="primary" size="" @click="generateShortcut">
                        创建快捷方式
                    </el-button>
                    <el-button type="danger" size="" @click="deleteShortcut">
                        删除快捷方式
                    </el-button>
                </div>
            </el-form-item>
            
            <el-form-item label="APP启动模式" style="margin-bottom: 0px;">
                <el-radio-group v-model="appLaunchMode" @change="onLaunchModeChange">
                    <el-radio label="window">窗口模式</el-radio>
                    <el-radio label="process">子进程模式</el-radio>
                    <el-radio label="follow">跟随APP</el-radio>
                </el-radio-group>
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

// 响应式参数
const appLaunchMode = ref('window');

// 获取APP启动模式
function getAppLaunchMode() {
    window.api.getAppLaunchMode((result) => {
        if (result.success) {
            appLaunchMode.value = result.data || 'window';
        } else {
            console.error('获取APP启动模式失败:', result.msg);
            // 使用默认值
            appLaunchMode.value = 'window';
        }
    });
}

// 设置APP启动模式
function setAppLaunchMode(mode) {
    window.api.setAppLaunchMode(mode, (result) => {
        if (result.success) {
            ElMessage({
                message: 'APP启动模式设置成功',
                type: 'success'
            });
        } else {
            ElMessage.error(result.msg);
            // 恢复原值
            getAppLaunchMode();
        }
    });
}

// 启动模式改变时的处理
function onLaunchModeChange(newMode) {
    setAppLaunchMode(newMode);
}

function generateShortcut() {
    window.api.generateShortcut(ret => {
        if (ret.success) {
            ElMessage({
                message: 'app快捷方式生成成功',
                type:'success'
            });
        } else {
            ElMessage.error(ret.msg);
        }
    });
}
function deleteShortcut() {
    window.api.deleteShortcut(ret => {
        if (ret.success) {
            ElMessage({
                message: 'app快捷方式清除成功',
                type:'success'
            });
        } else {
            ElMessage.error(ret.msg);
        }
    });
}

// 组件加载时获取当前设置
onMounted(() => {
    getAppLaunchMode();
});
</script>