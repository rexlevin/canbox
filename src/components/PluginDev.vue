<template>
    <el-row>
        <el-col :span="24">
            <el-upload
                    class="upload-demo"
                    accept=".json"
                    drag
                    action=""
                    multiple>
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
import { UploadFilled } from '@element-plus/icons-vue'
</script>