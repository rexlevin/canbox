<template>
    <el-form label-width="auto" style="margin-top: 10px;">
        <el-form-item label="快捷启动">
            <el-button type="primary" @click="generateShortcut">为所有app生成快捷方式</el-button>
            <el-button type="danger" @click="deleteShortcut">删除所有app快捷方式</el-button>
        </el-form-item>
    </el-form>
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