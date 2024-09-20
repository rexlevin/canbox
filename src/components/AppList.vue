<template>
    <el-row>
        <el-col :span="24"><div>asdf</div></el-col>
    </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps({
    extensionList: Array
});

const extensionList = ref(extensionList);

onMounted(() => {
    console.info('extensionList==%o', extensionList.value);
});
</script>