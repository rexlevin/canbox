const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { getAppsStore, getAppsDevStore } = require('./storageManager');
const shortcutManager = require('./shortcutManager');
const { getAppPath, getAppDataPath } = require('./pathManager');
const appWindow = require('./app.window');
const { handleError } = require('./ipc/errorHandler')
const ObjectUtils = require('../utils/ObjectUtils');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();
const APP_PATH = getAppPath();
const APP_DATA_PATH = getAppDataPath();

/**
 * 获取应用列表
 * @returns {*[Object]} app信息集合
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

module.exports = {
    getAppList,
    getAppInfo
}