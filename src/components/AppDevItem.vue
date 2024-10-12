<template>
    <div class="flex flex-wrap" style="margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
        <div class="card">
            <div class="img-block">
               <img style="width: 58px; height: 58px; cursor: pointer;" @click="load()" :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
            </div>
            <div class="info-block vertical-block">
                <div class="app-name" @click="load()">{{ appDevItem.appJson.name }}</div>
                <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appDevItem.appJson.description }}</div>
            </div>
            <div class="operate-block">
                <span class="operate-icon-span" @click="remove(appDevItem.id)" title="删除这个开发中的app">
                    <el-icon :size="25" color="#ab4e52" class="operate-icon"><Delete /></el-icon>
                </span>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ElMessage } from 'element-plus';

const props = defineProps({
    appDevItem: {
        type: Object,
        required: true,
        default: {}
    }
});

const emit = defineEmits(['reloadAppDev']);

function load() {
    window.api.appDev.load(JSON.stringify(props.appDevItem));
}
function remove(id) {
    console.info('id=', id);
    window.api.appDev.remove(id, (result)=>{
        console.info('remove result=', result);
        if(result.code !== '0000') {
            ElMessage.error(result.message);
            return;
        }
        ElMessage({
            message: '删除成功',
            type:'success'
        });
        emit('reloadAppDev');
    });
}
</script>

<style scoped>
/* .card {width: 100%; height: 60px; border: 1px solid #626262; box-sizing: border-box; display: flex;} */
.card {width: 100%; height: 60px; display: flex; justify-content: flex-start;}
/* .card:hover{color: #409eff;} */
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {line-height: 60px; text-align: left; margin-left: 10px;}
.info-block div{width: 300px;}
.info-block .app-name {height: 30px; line-height: 30px; cursor: pointer;}
.info-block .app-name:hover{color: #409eff; font-weight: bold;}
.vertical-block {display: table;}
.operate-block {width: 100%; margin-right: 20px;
    display: flex; flex: 1;
    align-items: center;
    justify-content: right;
}
.operate-icon-span {display:inline-block; cursor: pointer; text-align: center; border-radius: 20px;}
.operate-icon-span:hover { background-color: hsl(0, 0%, 80%); }
.operate-icon-span:active {background-color: hsl(0, 0%, 70%); }
</style>