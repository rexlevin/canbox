<template>
    <el-card shadow="hover">
        <el-form label-width="">
            <el-form-item label="为所有APP" style="margin-bottom: 0px;">
                <div style="display: flex; gap: 10px;">
                    <el-button type="primary" size="medium" @click="generateShortcut">
                        创建快捷方式
                    </el-button>
                    <el-button type="danger" size="medium" @click="deleteShortcut">
                        删除快捷方式
                    </el-button>
                </div>
            </el-form-item>
        </el-form>
    </el-card>
</template>

<script setup>
import { ElMessage } from 'element-plus';

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
</script>