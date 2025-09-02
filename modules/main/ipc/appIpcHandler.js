const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { getAppsStore, getAppsDevStore } = require('../storageManager');
const shortcutManager = require('../shortcutManager');
const { getAppPath, getAppDataPath, getReposTempPath } = require('../pathManager');
const appWindow = require('../app.window');
const { handleError } = require('./errorHandler')
const ObjectUtils = require('../../utils/ObjectUtils');
const DateFormat = require('../../utils/DateFormat');
const { getAppsData, getAppList, getAppInfo, handleImportApp } = require('../appManager');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();
const APP_PATH = getAppPath();
const APP_DATA_PATH = getAppDataPath();
const APP_TEMP_PATH = getReposTempPath();

/**
 * 删除应用
 */
async function removeApp(param) {
    try {
        if ('dev' === param.tag) {
            await removeAppDevById(param.id);
        } else {
            await removeAppById(param.id);
        }
    } catch (err) {
        return { success: false, msg: err.message };
    }
    return { success: true, msg: '删除成功' };
}

async function removeAppDevById(id) {
    if (undefined === AppsDevConfig.get('default')) {
        return;
    }
    const appDevInfoList = AppsDevConfig.get('default');
    for (let appDevInfo of appDevInfoList) {
        if (id !== appDevInfo.id) continue;
        appDevInfoList.splice(appDevInfoList.indexOf(appDevInfo), 1);
        AppsDevConfig.set('default', appDevInfoList);
    }
}

async function removeAppById(id) {
    if (undefined === AppsConfig.get('default')) {
        return;
    }
    const appConfigList = AppsConfig.get('default');
    let logo = '';
    for (let appConfig of appConfigList) {
        if (id !== appConfig.id) continue;
        logo = appConfig.logo;
        appConfigList.splice(appConfigList.indexOf(appConfig), 1);
        AppsConfig.set('default', appConfigList);
    }
    try {
        fs.unlinkSync(path.join(APP_PATH, id + '.asar'));
    } catch (err) {
        console.error('remove app asar error:', err);
    }
    // 删除图标
    const logoExt = path.extname(logo);
    const logoPath = path.join(APP_PATH, `${id}${logoExt}`);
    try {
        fs.unlinkSync(logoPath);
    } catch (err) {
        console.error('remove app logo error:', err);
    }

    // 删除快捷方式
    const appList = await getAppList();
    const targetApp = appList.find(app => app.id === id);
    if (targetApp) {
        await shortcutManager.deleteShortcuts([targetApp]);
    }
}

/**
 * 获取当前开发中的app列表
 * @returns 获取一个json格式得app信息列表， 内容示例如下：
{
    "wrong": [
        {
            "id": "98e2dea8620745a0a49ea0dd205609da",
            "path": "/depot/cargo/demo-app/",
            "name": "test"
        }
    ],
    "correct": [
        {
            "id": "691e211238c141dcb6c00de4c0416349",
            "path": "C:\\Users\\brood\\depot\\cargo\\can-demo\\",
            "name": "demo",
            "appJson": {
                "name": "demo",
                "description": "这是一个插件demo",
                "author": "dev001",
                "homepage": "https://gitee.com/dev001/clipboard",
                "main": "index.html",
                "logo": "logo.png",
                "version": "0.0.6",
                "window": {
                    "minWidth": 600,
                    "minHeight": 400,
                    "width": 700,
                    "height": 500,
                    "resizable": false
                },
                "platform": [ "win32", "darwin", "linux" ],
                "categories": [ "utility" ],
                "tags": [ "demo" ]
            }
        }
    ]
}
 */
async function getAppDevList() {
    if (undefined === AppsDevConfig.get('default')) {
        return { "correct": {}, "wrong": {} };
    }
    let appDevInfoList = AppsDevConfig.get('default')
        , appDevList = []
        , appDevFalseList = []
        , tmpItem = {};
    for (let appDevInfo of appDevInfoList) {
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfo.path, 'app.json'), 'utf8'));
            tmpItem = ObjectUtils.clone(appDevInfo);
            tmpItem.appJson = appJson;
            appDevList.push(tmpItem);
        } catch (e) {
            console.error('parse app.json error:', e);
            appDevFalseList.push(appDevInfo);
        }
    }
    if (appDevFalseList.length > 0) {
        for (let falseItem of appDevFalseList) {
            console.info('faseItem: ', falseItem);
            appDevInfoList = appDevInfoList.filter(item => item.id !== falseItem.id);
        }
        AppsDevConfig.set('default', appDevInfoList);
    }
    // console.info('appDevInfoList===', appDevInfoList);
    // console.info('appDevList=====%o', appDevList);
    return { "correct": appDevList, "wrong": appDevFalseList };
}

/**
 * 初始化应用管理相关的 IPC 处理逻辑
 */
function initAppHandlers() {

    // 获取所有应用数据
    ipcMain.handle('get-apps-data', async (event) => {
        return await getAppsData();
    });

    // 获取应用列表
    ipcMain.handle('getAppList', async () => {
        return getAppList();
    });

    // 获取应用信息
    ipcMain.handle('getAppInfo', async (event, appItemJsonStr) => {
        return getAppInfo(appItemJsonStr);
    });

    // 获取应用开发列表
    ipcMain.handle('getAppDevList', async () => {
        return await getAppDevList();
    });

    // 处理应用添加
    ipcMain.handle('handleAppAdd', async () => {
        try {
            const result = await dialog.showOpenDialog({
                title: '选择你的 app.json 文件',
                filters: [
                    { name: 'app.json', extensions: ['json'] }
                ],
                properties: ['openFile']
            });
            if (result.canceled || result.filePaths.length === 0) {
                return null;
            }
            const filePath = result.filePaths[0];
            console.info('filePath: ', filePath);
            const appJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const appDevConfig = {
                id: uuidv4().replace(/-/g, ''),
                path: filePath.substring(0, filePath.lastIndexOf('app.json')),
                name: appJson.name
            };
            let appDevConfigArr = AppsDevConfig.get('default') || [];
            appDevConfigArr.unshift(appDevConfig);
            AppsDevConfig.set('default', appDevConfigArr);
            return await getAppDevList();
        } catch (err) {
            console.error('Failed to handle app add:', err);
            return null;
        }
    });
    
    // 导入应用
    ipcMain.handle('import-app', handleImportApp);

    // 删除应用
    ipcMain.handle('remove-app', async (event, param) => {
        return removeApp(param);
    });
    
    // 加载应用
    ipcMain.on('loadApp', (event, appItemStr, devTag) => {
        appWindow.loadApp(appItemStr, devTag);
    });

    // 清理应用数据
    ipcMain.handle('clearAppData', async (event, id) => {
        const appData = path.join(APP_DATA_PATH, id);
        try {
            await fs.promises.access(appData, fs.constants.F_OK);
            await fs.promises.rm(appData, { recursive: true, force: true });
            return { success: true, msg: 'clear data success' };
        } catch (err) {
            if (err.code === 'ENOENT') {
                return { success: true, msg: 'no data to clear' };
            }
            return handleError(err, 'clearAppData');
        }
    });
}

module.exports = {
    init: initAppHandlers
};