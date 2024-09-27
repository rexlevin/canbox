<template>
    <el-row>
        <el-col :span="24">
            <el-button type="primary" @click="newApp">选择 app.json 新建 app 项目</el-button>
        </el-col>
    </el-row>
</template>

<script setup>
import { onMounted } from 'vue';

// const props = defineProps({
//     appDevList: {
//         type: Array,
//         required: true,
//         default: []
//     }
// });

function newApp() {
    window.api.openAppJson();
}

onMounted(() => {
    //
});
</script>
