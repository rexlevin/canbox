<template>
    <h1>User Center</h1>
</template>

<script setup>
import { onBeforeMount } from 'vue';

onBeforeMount(() => {
    // Check if the user is authenticated
    const user = window.api.getUserInfo();
    if (!user) {
        // Redirect to the login page if not authenticated
        // this.$router.push('/login');
    }
});
</script>