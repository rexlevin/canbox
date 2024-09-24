<template>
    <el-button type="primary" @click="generateShortcut">XXXXXX</el-button>
</template>

<script setup>
function generateShortcut() {
    window.api.generateShortcut();
}
</script>