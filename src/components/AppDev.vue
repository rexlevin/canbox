<template>
</template>

<script setup>
import { onMounted } from 'vue';

const props = defineProps({
    appDevList: {
        type: Array,
        required: true,
        default: []
    }
});

onMounted(() => {
    //
});
</script>
