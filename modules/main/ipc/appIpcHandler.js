const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { getAppsStore, getAppsDevStore } = require('../storageManager');
const shortcutManager = require('../shortcutManager');
const { getAppPath, getAppDataPath } = require('../pathManager');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();
const APP_PATH = getAppPath();
const APP_DATA_PATH = getAppDataPath();

/**
 * 获取应用列表
 */
function getAppList() {
    if (undefined === AppsConfig.get('default')) {
        return [];
    }
    const appInfoList = AppsConfig.get('default');
    let appList = [];
    for (const appInfo of appInfoList) {
        const appJson = JSON.parse(fs.readFileSync(path.join(APP_PATH, appInfo.id + '.asar/app.json'), 'utf8'));
        const iconPath = path.join(APP_PATH, appInfo.id + '.asar', appJson.logo);
        const app = {
            id: appInfo.id,
            appJson: appJson,
            logo: iconPath,
            path: path.join(APP_PATH, appInfo.id + '.asar')
        };
        appList.push(app);
    }
    return appList;
}

/**
 * 获取应用信息
 */
function getAppInfo(appItemJsonStr) {
    const appItem = JSON.parse(appItemJsonStr);
    const readFileWithErrorHandling = (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            return null;
        } catch (err) {
            console.error(`文件操作失败: ${err.path}`, err);
            return null;
        }
    };

    const [readme, history] = [
        readFileWithErrorHandling(path.join(appItem.path, 'README.md')),
        readFileWithErrorHandling(path.join(appItem.path, 'HISTORY.md'))
    ];

    const msg = (readme || history) ? null : '部分文件读取失败';
    return { success: null === msg, data: { readme, history }, msg };
}

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
 * 初始化应用管理相关的 IPC 处理逻辑
 */
function initAppHandlers() {
    // 获取应用列表
    ipcMain.handle('getAppList', async () => {
        return getAppList();
    });

    // 获取应用信息
    ipcMain.handle('getAppInfo', async (event, appItemJsonStr) => {
        return getAppInfo(appItemJsonStr);
    });

    // 删除应用
    ipcMain.handle('remove-app', async (event, param) => {
        return removeApp(param);
    });
}

module.exports = {
    init: initAppHandlers
};