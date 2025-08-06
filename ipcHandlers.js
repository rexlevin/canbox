const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const Store = require('electron-store');
const AppsConfig = new Store({
    cwd: 'Users',
    name: 'apps'
});

const AppsDevConfig = new Store({
    cwd: 'Users',
    name: 'appsDev'
});

const userDataPath = app.getPath('userData');

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

    // 获取路径
    ipcMain.on('getPath', (event, name) => {
        event.returnValue = app.getPath(name);
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
            const targetPath = path.join(userDataPath, 'Users', 'apps', `${uuid}.asar`);

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
    fs.unlinkSync(path.join(APP_PATH, id + '.asar'));
    console.info('%s===remove is success', id);
}

module.exports = {
    initIpcHandlers
};