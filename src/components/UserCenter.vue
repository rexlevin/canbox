<template>
    <el-button type="primary" @click="generateShortcut">为所有扩展app生成启动快捷方式</el-button>
</template>

<script setup>
function generateShortcut() {
    window.api.generateShortcut();
}
</script>