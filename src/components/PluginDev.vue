<template>
    <el-row>
        <el-col :span="24">
            <el-upload
                    class="upload-demo"
                    accept=".json"
                    action=""
                    drag
                    :auto-upload="false"
                    :on-change="loadPluginFile"
                    :file-list="uploadFiles"
                    >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                    Drop plugin.json here or <em>click to upload plugin.json</em>
                </div>
            </el-upload>
        </el-col>
    </el-row>
    <el-row>
        <el-col :span="24">xxx</el-col>
    </el-row>
</template>

<script setup>
import { ref } from 'vue';
import { UploadFilled } from '@element-plus/icons-vue';

const uploadFiles = ref([]);

function loadPluginFile(file) {
    // Your code to load the plugin file goes here
    // This function should handle the file upload, parse the JSON, and update the plugin state
    console.info('Loading plugin file==%o', file);
    // 这里开始读取上传的file
    // 假设我们用FileReader来读取JSON
    const reader = new FileReader();
    reader.onload = (event) => {
        const jsonData = JSON.parse(event.target.result);
        // jsonData 包含了 plugin 描述信息
        console.info('Parsed plugin file==%o', jsonData);
    };
    reader.readAsText(file.raw);
}
</script>