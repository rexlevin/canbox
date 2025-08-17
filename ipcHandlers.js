const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const winState = require('./modules/main/winState');

const ObjectUtils = require('./modules/utils/ObjectUtils')

const { getAppDataPath, getAppsPath } = require('./modules/main/pathManager');

const { getAppsStore, getAppsDevStore } = require('./modules/main/storageManager');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();

/**
 * 初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers(win) {
    // 打开文件选择窗口
    ipcMain.on('openAppJson', (event, options) => {
        dialog.showOpenDialog(options).then(result => {
            if (result.canceled) {
                event.returnValue = '';
                return;
            }
            event.returnValue = result.filePaths[0];
        });
    });

    // 使用外部浏览器打开 URL
    ipcMain.on('open-url', (event, url) => {
        shell.openExternal(url).then(res => {
            console.info('open external link:', res);
        }).catch(error => {
            console.error('Error opening external link:', error);
        });
    });

    // 重新加载窗口
    ipcMain.on('reload', () => {
        win.reload();
    });

    // 打开开发者工具
    ipcMain.on('openDevTools', () => {
        if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools();
        else win.webContents.openDevTools({ mode: 'detach' });
    });

    // 加载应用
    ipcMain.on('loadApp', (event, appItemStr, devTag) => {
        require('./modules/main/app.window').loadApp(appItemStr, devTag);
    });

    // 对话框相关 IPC
    ipcMain.handle('show-dialog', async (event, options) => {
        return dialog.showMessageBox(options);
    });

    ipcMain.handle('select-directory', async (event, options) => {
        return dialog.showOpenDialog(options);
    });

    ipcMain.handle('show-save-dialog', async (event, options) => {
        return dialog.showSaveDialog(options);
    });

    // 打包 ASAR
    ipcMain.handle('pack-asar', async (event, appDevItemStr) => {
        const appDevItem = JSON.parse(appDevItemStr);
        console.info('main.js==pack-asar appDevItem: ', appDevItem);
        return require('./modules/main/build-asar').buildAsar(appDevItem);
    });

    // 选择文件
    ipcMain.handle('select-file', async (event, options) => {
        return dialog.showOpenDialog({
            ...options,
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['asar'] }],
        });
    });

    // 导入应用
    ipcMain.handle('import-app', async (event, asarPath) => {
        try {
            const uuid = uuidv4().replace(/-/g, '');
            const targetPath = path.join(getAppsPath, `${uuid}.asar`);

            if (!fs.existsSync(asarPath)) {
                throw new Error(`源文件不存在: ${asarPath}`);
            }
            const absoluteAsarPath = path.resolve(asarPath);
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
                console.log('ASAR 文件复制成功！');
            } catch (err) {
                console.error('复制失败:', err);
            }

            const appJson = JSON.parse(fs.readFileSync(path.join(targetPath, 'app.json'), 'utf8'));
            let appConfigArr = AppsConfig.get('default') ? AppsConfig.get('default') : [];
            appConfigArr.push({
                id: uuid,
                name: appJson.name || '',
                version: appJson.version || '',
                description: appJson.description || '',
                author: appJson.author || '',
                logo: appJson.logo || '',
            });
            AppsConfig.set('default', appConfigArr);

            return { success: true, uuid };
        } catch (error) {
            console.error('导入应用失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 删除应用
    ipcMain.handle('remove-app', async (event, param) => {
        try {
            if ('dev' === param.tag) {
                await removeAppDevById(param.id);
            } else {
                await removeAppById(param.id);
            }
        } catch (err) {
            console.error('应用删除失败:', err.message);
            throw err;
        }
        const dirPath = path.resolve(getAppDataPath(), param.id);
        fs.rm(dirPath, { recursive: true, force: true }, (err) => {
            if (err) {
                console.error(`Failed to remove directory: ${err.message}`);
                throw err;
            }
            console.info('remove app success: %s', param.id);
            winState.remove(param.id, (res) => {
                console.info(res);
                return { success: true, msg: '删除应用目录成功' };
            });
        
        });
    });

    // 清理应用数据
    ipcMain.handle('clearAppData', async (event, id) => {
        const appData = path.join(getAppDataPath(), id);
        try {
            await fs.promises.access(appData, fs.constants.F_OK);
            await fs.promises.rm(appData, { recursive: true, force: true });
            return { code: '0000', msg: 'clear data success' };
        } catch (err) {
            if (err.code === 'ENOENT') {
                return { code: '0000', msg: 'no data to clear' };
            }
            console.error(`Failed to remove directory: ${err.message}`);
            return { code: '9201', msg: 'Failed to clear app data: ' + err.message };
        }
    });

    // 获取应用信息
    ipcMain.handle('getAppInfo', async (event, appItemJsonStr) => {
        const appItem = JSON.parse(appItemJsonStr);
        try {
            const content = await fs.promises.readFile(path.join(appItem.path, 'README.md'), 'utf8');
            return { code: '0000', data: content };
        } catch (err) {
            let msg;
            if (err.code === 'ENOENT') {
                console.error('file not found: ', err.path);
                msg = '文件不存在';
            } else {
                console.error('read file error: ', err.path);
                msg = '文件读取失败';
            }
            return { code: '9101', msg: msg, data: 'There is no introduction information of this app' };
        }
    });

    // 获取应用开发列表
    ipcMain.handle('getAppDevList', async () => {
        return await getAppDevList();
    });

    // 处理应用添加
    ipcMain.handle('handleAppAdd', async (event) => {
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
            throw err;
        }
    });

    ipcMain.handle('getAppList', async (event) => {
        return await getAppList();
    });

    // 导入快捷方式管理模块
    const shortcutManager = require('./modules/main/shortcutManager');

    // 生成快捷方式
    ipcMain.handle('generate-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下生成快捷方式' };
        }
        const appList = await getAppList();
        return shortcutManager.generateShortcuts(appList, process.execPath);
    });

    // 删除快捷方式
    ipcMain.handle('delete-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下删除快捷方式' };
        }
        const appList = await getAppList();
        return shortcutManager.deleteShortcuts(appList);
    });
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
    console.info('%s===remove is success', id);
}

async function removeAppById(id) {
    if (undefined === AppsConfig.get('default')) {
        return;
    }
    const appConfigList = AppsConfig.get('default');
    for (let appConfig of appConfigList) {
        if (id !== appConfig.id) continue;
        appConfigList.splice(appConfigList.indexOf(appConfig), 1);
        AppsConfig.set('default', appConfigList);
    }
    fs.unlinkSync(path.join(getAppsPath(), id + '.asar'));
    console.info('%s===remove is success', id);
}

async function getAppDevList() {
    // console.info(1,appsDevConfig);
    // console.info('getAppDevList===', appsDevConfig.get('default'));
    if(undefined === AppsDevConfig.get('default')) {
    return {"correct": {}, "wrong": {}};
    }
    let /*Array<Types.AppItemType>*/ appDevInfoList = AppsDevConfig.get('default')
        , appDevList = []
        , appDevFalseList = []
        , tmpItem = {};
    for(let appDevInfo of appDevInfoList) {
        // console.info('appDevInfo', appDevInfo);
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfo.path, 'app.json'), 'utf8'));
            tmpItem = ObjectUtils.clone(appDevInfo);
            tmpItem.appJson = appJson;
            appDevList.push(tmpItem);
        } catch(e) {
            console.error('parse app.json error:', e);
            appDevFalseList.push(appDevInfo);
        }
    }
    if(appDevFalseList.length > 0) {
        for(let falseItem of appDevFalseList) {
            console.info('faseItem: ', falseItem);
            appDevInfoList = appDevInfoList.filter(item => item.id !== falseItem.id);
        }
        AppsDevConfig.set('default', appDevInfoList);
    }
    // console.info('appDevInfoList===', appDevInfoList);
    // console.info('appDevList=====%o', appDevList);
    return {"correct": appDevList, "wrong": appDevFalseList};
}

/**
 * @returns {*[Object]} app信息集合
 */
function getAppList() {
    // console.log('appsConfig.get('default'):', appsConfig.get('default'));
    if(undefined === AppsConfig.get('default')) {
        return [];
    }
    const /*Array<Types.AppItemType>*/ appInfoList = AppsConfig.get('default');
    let appList = [];
    for(const appInfo of appInfoList) {
        // /home/lizl6/.config/canbox/Users/apps/541f02efdbf449018c57c880ac98aa59.asar/apps.json
        // C:\Users\brood\AppData\Roaming\canbox\Users\apps\541f02efdbf449018c57c880ac98aa59.asar\apps.json
        // 读取app.json文件内容
        const appJson = JSON.parse(fs.readFileSync(path.join(getAppsPath(), appInfo.id + '.asar/app.json'), 'utf8'));
        const iconPath = path.join(getAppsPath(), appInfo.id + '.asar', appJson.logo);
        // console.info('iconPath: ', iconPath);
        const app = {
            id: appInfo.id,
            appJson: appJson,
            logo: iconPath,
            path: path.join(getAppsPath(), appInfo.id + '.asar')
        };
        appList.push(app);
    }
    // console.info('appList=====%o', appList);
    return appList;
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

Types = function() {}
Types.AppItemType = function () {
    return {
        "name": "剪贴板",
        "id": "com.gitee.dev001.clipboard",
        "description": "一个好用的剪贴板",
        "author": "dev001",
        "homepage": "https://gitee.com/dev001/clipboard",
        "main": "index.html",
        "logo": "logo.png",
        "version": "0.0.6",
        "window": {
            "minWidth": 800,
            "minHeight": 400,
            "width": 900,
            "height": 500,
            "icon": "logo.png",
            "resizable": false,
            "webPreferences": {
                "preload": "preload.js"
            }
        },
        "platform": ["win32", "darwin", "linux"],
        "categories": ["development", "utility"],
        "tags": ["json", "jsonformatter"],
        "development": {
            "main": "index.html",
            "devTools": "detach"
        }
    };
}

module.exports = {
    initIpcHandlers
};