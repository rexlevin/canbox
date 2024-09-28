<template>
    <div class="flex flex-wrap" style="margin: 5px 0 0 0; padding: 0; box-shadow: var(--el-box-shadow-lighter);">
        <div class="card">
            <div class="img-block">
               <img style="width: 58px; height: 58px; cursor: pointer;" @click="loadAppDev()" :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
            </div>
            <div class="info-block vertical-block">
                <div style="height: 30px; line-height: 30px; cursor: pointer;" @click="loadApp()">{{ appDevItem.appJson.name }}</div>
                <div style="height: 30px; line-height: 13px; font-size: 12px;">{{ appDevItem.appJson.description }}</div>
            </div>
            <div class="operate-block">asdasdfasdfasdfasdfasdfasdfasdfasdasdfasdfasdfasdfasdfasdfasdfasdfaasdfasdff</div>
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

function loadAppDev() {}
</script>

<style scoped>
/* .card {width: 100%; height: 60px; border: 1px solid #626262; box-sizing: border-box; display: flex;} */
.card {width: 100%; height: 60px; display: flex;}
.card:hover{color: #409eff;}
.img-block {width: 60px; height: 100%; margin: 0; padding: 0;}
.info-block {width: 120px; line-height: 60px; text-align: left; margin-left: 10px; flex: 1;}
.vertical-block {display: table;}
.operate-block {background-color: gray;}
</style>