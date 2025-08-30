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
const { getAppList, getAppInfo } = require('../appManager');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();
const APP_PATH = getAppPath();
const APP_DATA_PATH = getAppDataPath();
const APP_TEMP_PATH = getReposTempPath();

async function handleImportApp(event, zipPath, uid) {
    try {

        // 检查是否有 APP_TEMP_PATH 目录，有则删除
        if (fs.existsSync(APP_TEMP_PATH)) {
            if (process.platform === 'win32') {
                await execSync(`del /f /q "${APP_TEMP_PATH}"`, { stdio: 'inherit' });
            } else {
                await execSync(`rm -rf "${APP_TEMP_PATH}"`, { stdio: 'inherit' });
            }
        }
        // 创建 APP_TEMP_PATH 目录
        fs.mkdirSync(APP_TEMP_PATH, { recursive: true });

        // 将文件复制到 APP_TEMP_PATH 目录下
        const uuid = uid || uuidv4().replace(/-/g, '');
        const targetPath = path.join(APP_TEMP_PATH, `${uuid}.zip`);

        if (!fs.existsSync(zipPath)) {
            throw new Error(`源文件不存在: ${zipPath}`);
        }
        const absoluteAsarPath = path.resolve(zipPath);
        if (!fs.existsSync(absoluteAsarPath)) {
            throw new Error(`解析后的路径无效: ${absoluteAsarPath}`);
        }
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        try {
            const command = process.platform === 'win32'
                ? `copy "${absoluteAsarPath}" "${targetPath}"`
                : `cp "${absoluteAsarPath}" "${targetPath}"`;
            execSync(command, { stdio: 'inherit' });
            console.log('ZIP 文件复制成功！');
        } catch (err) {
            console.error('复制失败:', err);
        }

        // 将 APP_TEMP_PATH 目录下的 zip 文件解压
        if (process.platform === 'win32') {
            execSync(`powershell -Command "Expand-Archive -Path '${targetPath}' -DestinationPath '${APP_TEMP_PATH}'"`, { stdio: 'inherit' });
        } else {
            execSync(`unzip -o "${targetPath}" -d "${APP_TEMP_PATH}"`, { stdio: 'inherit' });
        }
        console.info('解压成功:', APP_TEMP_PATH);
        // 删除 zip 文件
        fs.rmSync(targetPath, { recursive: true, force: true });
        // 重命名文件：检查 APP_TEMP_PATH 下的文件和目录，如果当前存在 xxxx.asar 则改为 ${uuid}.asar，xxxx.asar.unpacked 改为 ${uuid}.asar.unpacked
        const files = fs.readdirSync(APP_TEMP_PATH);
        files.forEach(file => {
            console.info('file:', file);
            if (file.endsWith('.asar')) {
                fs.renameSync(path.join(APP_TEMP_PATH, file), path.join(APP_TEMP_PATH, `${uuid}.asar`));
            } else if (file.endsWith('.asar.unpacked')) {
                fs.renameSync(path.join(APP_TEMP_PATH, file), path.join(APP_TEMP_PATH, `${uuid}.asar.unpacked`));
            }
        });
        // 将 APP_TEMP_PATH 下的所有文件移动到 APP_PATH 下
        if (fs.existsSync(APP_TEMP_PATH)) {
            if (process.platform === 'win32') {
                await execSync(`move "${APP_TEMP_PATH}\\*" "${APP_PATH}"`, { stdio: 'inherit' });
            } else {
                await execSync(`mv "${APP_TEMP_PATH}"/* "${APP_PATH}"`, { stdio: 'inherit' });
            }
        }

        const asarTargetPath = path.join(APP_PATH, `${uuid}.asar`);
        const appJson = JSON.parse(fs.readFileSync(path.join(asarTargetPath, 'app.json'), 'utf8'));
        let appConfigArr = AppsConfig.get('default') ? AppsConfig.get('default') : [];
        appConfigArr.push({
            id: uuid,
            name: appJson.name || '',
            version: appJson.version || '',
            description: appJson.description || '',
            author: appJson.author || '',
            logo: appJson.logo || '',
            sourceTag: ''
        });
        AppsConfig.set('default', appConfigArr);

        // 复制logo文件到目标目录
        const logoPathInAsar = path.join(asarTargetPath, appJson.logo);
        const logoExt = path.extname(appJson.logo);
        const logoPathInTarget = path.join(APP_PATH, `${uuid}${logoExt}`);
        try {
            fs.copyFileSync(logoPathInAsar, logoPathInTarget);
            console.log('Logo 文件复制成功！');
        } catch (err) {
            console.error('复制logo文件失败:', err);
        }

        return { success: true, uuid };
    } catch (error) {
        console.error('导入应用失败:', error);
        return handleError(error, 'handleImportApp');
    }
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