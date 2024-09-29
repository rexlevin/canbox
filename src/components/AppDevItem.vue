<template>
    <div class="flex flex-wrap" style="margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
        <div class="card">
            <div class="img-block">
               <img style="width: 58px; height: 58px; cursor: pointer;" @click="loadAppDev()" :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
            </div>
            <div class="info-block vertical-block">
                <div style="height: 30px; line-height: 30px; cursor: pointer;" @click="loadAppDev()">{{ appDevItem.appJson.name }}</div>
                <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appDevItem.appJson.description }}</div>
            </div>
            <div class="operate-block"><el-icon :size="25" color="#ab4e52"><Delete /></el-icon></div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    appDevItem: {
        type: Object,
        required: true,
        default: {}
    }
});

function loadAppDev() {
    window.api.loadAppDev(JSON.stringify(props.appDevItem));
}
</script>

<style scoped>
/* .card {width: 100%; height: 60px; border: 1px solid #626262; box-sizing: border-box; display: flex;} */
.card {width: 100%; height: 60px; display: flex; justify-content: flex-start;}
/* .card:hover{color: #409eff;} */
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {line-height: 60px; text-align: left; margin-left: 10px;}
.info-block div{width: 300px;}
.info-block:hover {color: #409eff;}
.vertical-block {display: table;}
.operate-block {width: 100%; margin-right: 20px;
    display: flex; flex: 1;
    align-items: center;
    justify-content: right;
}
</style>