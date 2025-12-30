<template>
    <div class="app-list-container">
        <!-- 第一部分：按钮区域 -->
        <div class="button-section">
            <el-button type="primary" @click="addAppDev">选择 app.json 新建 app 项目</el-button>
        </div>

        <!-- 第二部分：应用列表区域 -->
        <div class="app-list-section" v-show="Object.keys(appDevData).length > 0">

            <el-row v-for="(appDevItem, uid) in appDevData" :key="uid">
                <el-col :span="24">
                    <div class="card" v-loading="exportAppFlag[uid]">
                        <div class="img-block">
                            <img style="width: 58px; height: 58px; cursor: pointer;" @click="drawerInfo = true"
                                :src="'file://' + appDevItem.path + '/' + appDevItem.appJson.logo" alt="" />
                        </div>
                        <div class="info-block vertical-block">
                            <div class="app-name" @click="drawerInfo = true">
                                <span style="font-weight: bold; font-size: 20px;">{{ appDevItem.appJson.name }}</span>
                                <span style="padding-left: 20px; color: gray;">{{ appDevItem.appJson.version }}</span>
                            </div>
                            <div style="height: 30px; line-height: 13px; font-size: 12px;">{{
                                appDevItem.appJson.description }}</div>
                        </div>
                        <div class="operate-block">
                            <span class="operate-icon-span" @click="packApp(uid)" title="打包app">
                                <el-icon :size="35" color="#6a8759">
                                    <Expand />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="loadApp(uid)" title="运行这个开发中的app">
                                <el-icon :size="35" color="#228b22">
                                    <VideoPlay />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="clearData(uid)" title="清除用户数据">
                                <el-icon :size="35" color="">
                                    <Delete />
                                </el-icon>
                            </span>
                            <span class="operate-icon-span" @click="removeApp(uid)" title="移除这个开发中的app">
                                <el-icon :size="35" color="#ab4e52">
                                    <Remove />
                                </el-icon>
                            </span>
                        </div>
                    </div>
                </el-col>
            </el-row>
        </div>

        <!-- 空状态提示 -->
        <div class="empty-section" v-show="Object.keys(appDevData).length == 0">
            <p>暂无开发中的应用</p>
        </div>

        <div class="doc-links">
            <el-link type="primary" @click="openAppDevDoc">查看 APP 开发文档</el-link>
            <el-link type="primary" @click="openApiDoc">查看 API 文档</el-link>
        </div>

    </div>

    <el-dialog v-model="centerDialogVisible" title="Warning" width="300" center>
        <span style="white-space:pre-line">{{ warningContent }}</span>
        <template #footer>
            <div class="dialog-footer">
                <el-button type="primary" @click="centerDialogVisible = false"> 确&nbsp;&nbsp;&nbsp;&nbsp;定 </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.app-list-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.button-section {
    height: 60px;
    padding: 10px 0;
    line-height: 60px;
}

.app-list-section {
    height: calc(100vh - 60px);
    overflow-y: auto;
    margin: 5px 0 0 0;
    padding: 0;
    box-shadow: var(--el-box-shadow-lighter);
}

.card {
    width: 100%;
    height: 60px;
    display: flex;
    justify-content: flex-start;
}

.img-block {
    width: 60px;
    height: 100%;
    margin: 0;
    padding: 0;
}

.info-block {
    line-height: 60px;
    text-align: left;
    margin-left: 10px;
}

.info-block div {
    width: 300px;
}

.info-block .app-name {
    height: 30px;
    line-height: 30px;
    cursor: pointer;
}

.info-block .app-name:hover {
    color: #409eff;
    font-weight: bold;
}

.vertical-block {
    display: table;
}

.operate-block {
    width: 100%;
    margin-right: 20px;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: right;
}

.operate-block div {
    display: table-cell;
}

.operate-block div:first-child {
    text-align: left;
    padding-left: 10px;
}

.operate-block div:first-child span {
    color: gray;
}

.operate-icon-span {
    display: inline-block;
    cursor: pointer;
    text-align: center;
    border-radius: 20px;
    margin-right: 10px;
}

.operate-icon-span:hover {
    background-color: hsl(0, 0%, 80%);
}

.operate-icon-span:active {
    background-color: hsl(0, 0%, 70%);
}

.empty-section {
    height: calc(100vh - 60px);
    display: flex;
    justify-content: center;
    align-items: center;
}

.doc-links {
    position: absolute;
    bottom: 0;
    width: 100%;
    text-align: center;
    padding: 10px 0;
    border-top: 1px solid #eee;
}

.doc-links .el-link {
    margin-right: 20px;
}

.doc-links .el-link:last-child {
    margin-right: 0;
}
</style>

<script setup>
import { onBeforeMount, onUpdated, ref } from 'vue';
import { ElMessage } from 'element-plus';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';

// 初始化 markdown-it
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
}).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.linkInsideHeader({
        symbol: '#',
        class: 'header-anchor'
    }),
    level: [1, 2, 3]
});

// 生成目录的辅助函数
function generateTocHtml(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headers = doc.querySelectorAll('h1, h2, h3');

    if (headers.length === 0) return '';

    let tocHtml = '<ul class="toc-list">';
    let lastLevel = 0;
    let levelStack = [];

    headers.forEach((header, index) => {
        const level = parseInt(header.tagName.charAt(1));
        const text = header.textContent;
        const id = header.id || `toc-${index}`;

        // 为没有 id 的标题添加 id
        if (!header.id) {
            header.id = id;
        }

        // 处理层级
        if (level > lastLevel) {
            tocHtml += '<ul class="toc-sublist">';
            levelStack.push(lastLevel);
        } else if (level < lastLevel) {
            while (levelStack.length > 0 && levelStack[levelStack.length - 1] >= level) {
                tocHtml += '</ul></li>';
                levelStack.pop();
            }
            tocHtml += '</li>';
        } else if (lastLevel > 0) {
            tocHtml += '</li>';
        }

        tocHtml += `<li class="toc-item toc-level-${level}"><a class="toc-link" href="#${id}">${text}</a>`;
        lastLevel = level;
    });

    // 关闭所有标签
    while (levelStack.length > 0) {
        tocHtml += '</li></ul>';
        levelStack.pop();
    }
    tocHtml += '</li></ul>';

    return tocHtml;
}

let appDevData = ref({});
const centerDialogVisible = ref(false);
const warningContent = ref('');

function addAppDev() {
    window.api.appDev.add((result) => {
        if (result?.correct) {
            appDevData.value = result.correct;
        }
    });
}

// 控制打包按钮的loading状态
let exportAppFlag = ref({});
// 打包app
async function packApp(uid) {
    exportAppFlag.value[uid] = true;
    const result = window.api.packToAsar(uid);
    result.then((result) => {
        if (!result.success) {
            ElMessage({
                type: 'error',
                message: result.msg,
            });
            return;
        }
        ElMessage({
            message: '打包成功！',
            type: 'success',
        });
    }).catch((err) => {
        ElMessage({
            type: 'error',
            message: err,
        });
    }).finally(() => {
        exportAppFlag.value[uid] = false;
    });
}

// 运行app
function loadApp(uid) {
    window.api.app.load(uid, true);
}

// 清除app运行数据
function clearData(uid) {
    window.api.app.clearData(uid, (result) => {
        console.info('clearData result=', result);
        if (!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: '清除数据成功',
            type: 'success'
        });
    });
}

function removeApp(uid) {
    window.api.app.remove({
        id: uid,
        devTag: true
    }, (result) => {
        console.info('remove result=', result);
        if (!result.success) {
            ElMessage.error(result.msg);
            return;
        }
        ElMessage({
            message: 'APP 删除成功',
            type: 'success'
        });
        load();
    });
}

function load() {
    window.api.appDev.all((result) => {
        // 支持新格式 { success: true, data: appDevData, wrong: appDevFalseData }
        // 兼容旧格式 { correct: appDevData, wrong: appDevFalseData }
        if (result && result.success) {
            appDevData.value = result.data || {};
        } else if (result && result.correct) {
            appDevData.value = result.correct || {};
        } else {
            appDevData.value = {};
        }

        const wrongApps = result?.wrong || {};
        if (wrongApps && Object.keys(wrongApps).length > 0) {
            warningContent.value = `以下 app.json 存在问题，已经移除： \n ${Object.entries(wrongApps).map(([key, item]) => item.name || key).join('\n')}`;
            centerDialogVisible.value = true;
        }
    });
}

// 打开APP开发文档
async function openAppDevDoc() {
    const result = await window.api.readFile('docs/APP_DEV_CN.md');
    if (result && result.success) {
        const htmlContent = md.render(result.data);
        const tocHtml = generateTocHtml(htmlContent);
        const tempHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>APP 开发文档 - Canbox</title>
    <style>
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; margin: 0; padding: 0; }
        .container { display: flex; max-width: 1400px; margin: 0 auto; }
        .content { flex: 1; padding: 40px 60px; max-width: 1100px; }
        .toc-container { width: 280px; padding: 40px 20px 40px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .toc-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .toc { padding: 0; margin: 0; }
        .toc ul { padding-left: 12px; margin: 5px 0; list-style: none; }
        .toc li { margin: 5px 0; }
        .toc a { color: #555; text-decoration: none; display: block; padding: 6px 10px; border-radius: 4px; transition: all 0.2s; }
        .toc a:hover { background-color: #e6f7ff; color: #1890ff; }
        .toc a.active { background-color: #1890ff; color: white; }
        .toc-level-1 { font-weight: bold; font-size: 20px; }
        .toc-level-2 { font-size: 18px; }
        .toc-level-3 { font-size: 16px; }
        h1, h2, h3, h4, h5, h6 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; scroll-margin-top: 20px; }
        h1 { font-size: 2.5em; border-bottom-width: 3px; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        .header-anchor { color: #999; text-decoration: none; margin-left: 10px; font-size: 0.8em; opacity: 0; transition: opacity 0.2s; }
        h1:hover .header-anchor, h2:hover .header-anchor, h3:hover .header-anchor { opacity: 1; }
        .header-anchor:hover { color: #1890ff; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 15px 0; }
        pre code { background: none; padding: 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; background: #f9f9f9; padding: 10px 20px; border-radius: 4px; }
        a { color: #1890ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="toc-container">
            <div class="toc-title">目录</div>
            <div id="toc">${tocHtml}</div>
        </div>
        <div class="content">
            ${htmlContent}
        </div>
    </div>
    <script>
        // 滚动高亮当前目录项
        window.addEventListener('scroll', () => {
            const headers = document.querySelectorAll('h1, h2, h3');
            const tocLinks = document.querySelectorAll('.toc-link');
            let currentId = '';

            headers.forEach(header => {
                const rect = header.getBoundingClientRect();
                if (rect.top <= 100) {
                    currentId = header.id;
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + currentId) {
                    link.classList.add('active');
                }
            });
        });
    <\/script>
</body>
</html>`;

        const openResult = await window.api.openHtml(tempHtml);
        if (!openResult.success) {
            ElMessage.error('无法打开文档: ' + openResult.msg);
        }
    } else {
        ElMessage.error('无法读取APP开发文档');
    }
}

// 打开API文档
async function openApiDoc() {
    const result = await window.api.readFile('docs/API_CN.md');
    if (result && result.success) {
        const htmlContent = md.render(result.data);
        const tocHtml = generateTocHtml(htmlContent);
        const tempHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 文档 - Canbox</title>
    <style>
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; margin: 0; padding: 0; }
        .container { display: flex; max-width: 1400px; margin: 0 auto; }
        .content { flex: 1; padding: 40px 60px; max-width: 900px; }
        .toc-container { width: 280px; padding: 40px 20px 40px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .toc-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .toc { padding: 0; margin: 0; }
        .toc ul { padding-left: 12px; margin: 5px 0; list-style: none; }
        .toc li { margin: 5px 0; }
        .toc a { color: #555; text-decoration: none; display: block; padding: 6px 10px; border-radius: 4px; transition: all 0.2s; }
        .toc a:hover { background-color: #e6f7ff; color: #1890ff; }
        .toc a.active { background-color: #1890ff; color: white; }
        .toc-level-1 { font-weight: bold; font-size: 16px; }
        .toc-level-2 { font-size: 15px; }
        .toc-level-3 { font-size: 14px; }
        h1, h2, h3, h4, h5, h6 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; scroll-margin-top: 20px; }
        h1 { font-size: 2.5em; border-bottom-width: 3px; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        .header-anchor { color: #999; text-decoration: none; margin-left: 10px; font-size: 0.8em; opacity: 0; transition: opacity 0.2s; }
        h1:hover .header-anchor, h2:hover .header-anchor, h3:hover .header-anchor { opacity: 1; }
        .header-anchor:hover { color: #1890ff; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 15px 0; }
        pre code { background: none; padding: 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; background: #f9f9f9; padding: 10px 20px; border-radius: 4px; }
        a { color: #1890ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="toc-container">
            <div class="toc-title">目录</div>
            <div id="toc">${tocHtml}</div>
        </div>
        <div class="content">
            ${htmlContent}
        </div>
    </div>
    <script>
        // 滚动高亮当前目录项
        window.addEventListener('scroll', () => {
            const headers = document.querySelectorAll('h1, h2, h3');
            const tocLinks = document.querySelectorAll('.toc-link');
            let currentId = '';

            headers.forEach(header => {
                const rect = header.getBoundingClientRect();
                if (rect.top <= 100) {
                    currentId = header.id;
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + currentId) {
                    link.classList.add('active');
                }
            });
        });
    <\/script>
</body>
</html>`;

        const openResult = await window.api.openHtml(tempHtml);
        if (!openResult.success) {
            ElMessage.error('无法打开文档: ' + openResult.msg);
        }
    } else {
        ElMessage.error('无法读取API文档');
    }
}

onBeforeMount(() => {
    load();
});

onUpdated(() => {
    // 拦截app介绍中的a标签链接跳转，使其使用外部浏览器打开
    const links = document.querySelectorAll('#divAppInfo a[href]');
    links.forEach(link => {
        link.addEventListener('click', e => {
            const url = link.getAttribute('href');
            e.preventDefault();
            window.api.openUrl(url);
        });
    });
});
</script>
