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
    console.info('Loading plugin file==%o', file);
    // console.log(document.getElementsByClassName("el-upload__input")[0].value); 
    // 这里开始读取上传的file
    const reader = new FileReader();
    reader.onload = (event) => {
        console.info(event);
        const jsonData = JSON.parse(event.target.result);
        // jsonData 包含了 plugin 信息
        console.info('Parsed plugin file==%o', jsonData);
    };
    reader.readAsText(file.raw);
}
</script>