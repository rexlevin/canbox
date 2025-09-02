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

const APP_DATA_PATH = getAppDataPath();
const APP_TEMP_PATH = getReposTempPath();

/**
 * 删除应用
 * 
 * @param {Object} param id: uid, devTag: 是否为开发中的应用, true:是
 * @returns 
 */
async function removeApp(param) {
    try {
        if (param.devTag) {
            await removeAppDevById(param.id);
        } else {
            await removeAppById(param.id);
        }
    } catch (err) {
        return handleError(err, 'removeApp');
    }
    return { success: true, msg: '删除成功' };
}

async function removeAppDevById(uid) {
    let appDevConfig = getAppsDevStore().get('default') || {};
    if (!appDevConfig || Object.keys(appDevConfig).length === 0) {
        return;
    }
    delete appDevConfig[uid];
    getAppsDevStore().set('default', appDevConfig);
}

async function removeAppById(uid) {
    let appConfig = getAppsStore().get('default') || {};
    if (!appConfig || Object.keys(appConfig).length === 0) {
        return;
    }

    const logo = appConfig[uid].logo;
    const logoExt = path.extname(logo);
    const logoPath = path.join(getAppPath(), `${id}${logoExt}`);

    try {
        fs.unlinkSync(path.join(getAppPath(), uid + '.asar'));
        delete appConfig[uid];
        getAppsStore().set('default', appConfig);
    } catch (err) {
        throw err;
    }

    // 删除图标
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
async function getAppDevData() {
    let appDevInfoData = getAppsDevStore().get('default') || {};
    if (!appDevInfoData || Object.keys(appDevInfoData).length === 0) {
        return { correct: {}, wrong: {} };
    }
    
    let appDevData = {} , appDevFalseData = {};
    Object.keys(appDevInfoData).forEach((key) => {
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfoData[key].path, 'app.json'), 'utf8'));
            appDevData[key] = ObjectUtils.clone(appDevInfoData[key]);
            appDevData[key].appJson = ObjectUtils.clone(appJson);
        } catch (error) {
            appDevFalseData[key] = ObjectUtils.clone(appDevInfoData[key]);
        }
    });

    // 删除有问题的应用
    if (Object.keys(appDevFalseData).length > 0) {
        for (const key in appDevFalseData) {
            delete appDevInfoData[key];
        }
        getAppsDevStore().set('default', appDevInfoData);
    }
    // console.info('appDevInfoData: ', appDevInfoData);
    // console.info('appDevData: ', appDevData);
    return { correct: appDevData, wrong: appDevFalseData };
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
    ipcMain.handle('get-apps-dev-data', async () => {
        return await getAppDevData();
    });

    // 处理应用添加
    ipcMain.handle('handle-app-dev-add', async () => {
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
            const uid = uuidv4().replace(/-/g, '');
            let appDevConfig = getAppsDevStore().get('default') || {};
            appDevConfig[uid] = {
                id: appJson.id,
                name: appJson.name,
                path: filePath.substring(0, filePath.lastIndexOf('app.json'))
            };
            getAppsDevStore().set('default', appDevConfig);
            return await getAppDevData();
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
    ipcMain.on('load-app', (event, uid, devTag) => {
        appWindow.loadApp(uid, devTag);
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