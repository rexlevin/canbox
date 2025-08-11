<template>
    <h1>建设中...</h1>
</template>

<script setup>
import { onBeforeMount } from 'vue';

onBeforeMount(() => {
    const repoInfo = window.api.getRepoInfo();
    console.info('repoInfo in UserCenter: ', repoInfo);
    if (!repoInfo) {
        // Redirect to the login page if not authenticated
        // this.$router.push('/login');
    }
});
</script>