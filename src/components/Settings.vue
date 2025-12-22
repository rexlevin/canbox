<template>
    <div class="app-list-container">
        <!-- 第一部分：设置列表区域 -->
        <div class="app-list-section">
            <el-row>
                <el-col :span="24">
                    <div class="card">
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
                    </div>
                </el-col>
            </el-row>
        </div>
    </div>
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

<style scoped>
.app-list-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 20px 0;
}

.app-list-section {
    height: calc(100vh - 60px);
    overflow-y: auto;
    margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);
}

.card {width: 100%; height: 80px; display: flex; justify-content: flex-start;}
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {line-height: 80px; text-align: left; margin-left: 10px;}
.info-block div{width: 300px;}
.info-block .app-name {height: 40px; line-height: 40px; cursor: pointer;}
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
</style>