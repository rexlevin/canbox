const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const winState = require('./modules/main/winState');

const ObjectUtils = require('./modules/utils/ObjectUtils')

const appWindow = require('./modules/main/app.window')

const { getAppDataPath, getAppPath, getAppTempPath, getReposPath } = require('./modules/main/pathManager');
const APP_DATA_PATH = getAppDataPath();
const APP_PATH = getAppPath();
const APP_TEMP_PATH = getAppTempPath();
const APP_REPOS_PATH = getReposPath();

// 导入存储管理模块
const { getAppsStore, getAppsDevStore, getReposStore } = require('./modules/main/storageManager');

// 导入快捷方式管理模块
const shortcutManager = require('./modules/main/shortcutManager');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();

/**
 * 根据appId直接打开app
 * @param {string} appId 
 */
function handleLoadAppById(appId) {
    const appItem = getAppList().find(item => item.id === appId);
    appWindow.loadApp(JSON.stringify(appItem), null); // 注意：这里需要根据实际逻辑调整参数
}

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
        appWindow.loadApp(appItemStr, devTag);
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
            filters: [{ name: 'App Files', extensions: ['zip'] }],
        });
    });

    // 导入应用
    ipcMain.handle('import-app', async (event, zipPath) => {
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
            const uuid = uuidv4().replace(/-/g, '');
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
            // 将 APP_TEMP_PATH 下的文件移动到 APP_PATH 下
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
        const dirPath = path.resolve(APP_DATA_PATH, param.id);
        fs.rm(dirPath, { recursive: true, force: true }, (err) => {
            if (err) {
                console.error(`Failed to remove directory: ${err.message}`);
            } else {
                console.info('remove app success: %s', param.id);
            }
            winState.remove(param.id, (res) => {
                console.info(res);
                return { success: true, msg: '删除应用目录成功' };
            });

        });
    });

    // 清理应用数据
    ipcMain.handle('clearAppData', async (event, id) => {
        const appData = path.join(APP_DATA_PATH, id);
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
    const readFileWithErrorHandling = async (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            } else {
                return null;
            }
        } catch (err) {
            console.error(`文件操作失败: ${err.path}`, err);
            return null;
        }
    };

    ipcMain.handle('getAppInfo', async (event, appItemJsonStr) => {
        const appItem = JSON.parse(appItemJsonStr);
        const readmePath = path.join(appItem.path, 'README.md');
        const historyPath = path.join(appItem.path, 'HISTORY.md');

        const [readme, history] = await Promise.all([
            readFileWithErrorHandling(readmePath),
            readFileWithErrorHandling(historyPath)
        ]);

        const msg = (readme || history) ? null : '部分文件读取失败';
        return { success: null === msg, data: { readme, history }, msg };
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

    // 生成快捷方式
    ipcMain.handle('generate-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下生成快捷方式' };
        }
        const appList = await getAppList();
        return shortcutManager.generateShortcuts(appList);
    });

    // 删除快捷方式
    ipcMain.handle('delete-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下删除快捷方式' };
        }
        const appList = await getAppList();
        return shortcutManager.deleteShortcuts(appList);
    });

    // 添加app源
    ipcMain.handle('add-app-repo', async (event, repoUrl, branch) => {
        return handleAddAppRepo(repoUrl, branch);
    });

    // 导入app源列表
    ipcMain.handle('import-app-repos', async (event) => {
        return handleImportAppRepos();
    });

    // 获取仓库列表
    ipcMain.handle('get-repos-data', async (event) => {
        return getReposData();
    });

    // 删除仓库
    ipcMain.handle('remove-repo', async (event, uid) => {
        return removeRepo(uid);
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
    let logo = '';
    for (let appConfig of appConfigList) {
        if (id !== appConfig.id) continue;
        logo = appConfig.logo;
        appConfigList.splice(appConfigList.indexOf(appConfig), 1);
        AppsConfig.set('default', appConfigList);
    }
    try {
        fs.unlinkSync(path.join(APP_PATH, id + '.asar'));
        console.info('%s===remove is success', id);
    } catch (err) {
        console.error('remove app asar error:', err);
    }
    // 删除图标
    const logoExt = path.extname(logo);
    const logoPath = path.join(APP_PATH, `${id}${logoExt}`);
    try {
        fs.unlinkSync(logoPath);
        console.info('%s===remove logo is success', id);
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
 * 处理添加单个仓库的逻辑
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function handleAddAppRepo(repoUrl, branch) {
    try {
        if (!repoUrl) {
            return { success: false, error: '未输入仓库地址' };
        }
        branch = branch || 'main';

        // 校验repoUrl格式
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(repoUrl)) {
            return { success: false, error: '仓库地址格式无效' };
        }

        // 尝试访问仓库地址
        try {
            const response = await fetch(`${repoUrl}/blob/${branch || 'main'}/app.json`);
            if (!response.ok) {
                return { success: false, error: '无法访问该仓库，请检查地址是否正确或是否有权限' };
            }
        } catch (error) {
            return { success: false, error: '仓库地址不可访问: ' + error.message };
        }
        console.info('ipcHandlers.js: handleAddAppRepo: repoUrl: ', repoUrl, ' branch: ', branch);

        const uuid = uuidv4().replace(/-/g, '');
        const reposPath = path.join(APP_REPOS_PATH, uuid);
        fs.mkdirSync(reposPath, { recursive: true });

        // 解析仓库类型并构建文件下载URL
        const getFileUrl = (repoUrl, branch, file) => {
            try {
                const url = new URL(repoUrl);
                const host = url.hostname;
                const pathParts = url.pathname.split('/').filter(Boolean);
                
                // GitHub
                if (host.includes('github.com')) {
                    return `${repoUrl}/raw/${branch}/${file}`;
                }
                // GitLab
                else if (host.includes('gitlab.com') || host.includes('gitlab.')) {
                    return `${repoUrl}/-/raw/${branch}/${file}`;
                }
                // Bitbucket
                else if (host.includes('bitbucket.org')) {
                    return `${repoUrl}/raw/${branch}/${file}`;
                }
                // Gitee
                else if (host.includes('gitee.com')) {
                    return `${repoUrl}/raw/${branch}/${file}`;
                }
                // 自托管服务（如Gitea/GitLab CE）
                else {
                    // 尝试常见模式
                    return `${repoUrl}/raw/branch/${branch}/${file}`;
                }
            } catch (e) {
                console.error('解析仓库URL失败:', e);
                return `${repoUrl}/raw/${branch}/${file}`; // 默认回退
            }
        };

        let appJson, logoPath;
        // 下载文件
        const filesToDownload = ['app.json', 'README.md', 'HISTORY.md'];
        for (const file of filesToDownload) {
            const fileUrl = getFileUrl(repoUrl, branch, file);
            const filePath = path.join(reposPath, file);
            try {
                console.log(`尝试下载文件: ${fileUrl}`);
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    if (file === 'app.json') {
                        console.warn(`无法下载app.json: ${fileUrl}`);
                        return { success: false, error: '无法下载app.json, 请检查仓库地址是否正确或是否有权限' };
                    }
                    console.warn(`下载失败(${response.status}): ${fileUrl}`);
                    continue;
                }
                const content = await response.text();
                fs.writeFileSync(filePath, content);
                console.log(`文件下载成功: ${file}`);

                // 如果是app.json，下载logo图片
                if (file === 'app.json') {
                    appJson = JSON.parse(content);
                    if (appJson.logo) {
                        try {
                            const logoUrl = getFileUrl(repoUrl, branch, appJson.logo);
                            const logoExt = path.extname(appJson.logo);
                            logoPath = path.join(reposPath, `logo${logoExt}`);
                            const logoDir = path.dirname(logoPath);
                            
                            if (!fs.existsSync(logoDir)) {
                                fs.mkdirSync(logoDir, { recursive: true });
                            }
                            
                            const logoResponse = await fetch(logoUrl);
                            if (logoResponse.ok) {
                                const buffer = await logoResponse.arrayBuffer();
                                fs.writeFileSync(logoPath, Buffer.from(buffer));
                                console.log(`Logo图片下载成功: ${appJson.logo}`);
                            } else {
                                console.warn(`无法下载logo图片: ${logoUrl}`);
                            }
                        } catch (error) {
                            console.error('下载logo图片失败:', error);
                        }
                    }
                }
            } catch (error) {
                console.error(`下载文件错误(${fileUrl}):`, error);
            }
        }

        // 保存仓库信息
        const reposStore = getReposStore();
        const reposData = reposStore.get('default') || {};
        reposData[uuid] = {
            id: appJson.id,
            repo: repoUrl,
            branch: branch,
            author: appJson.author || '',
            version: appJson.version || '',
            description: appJson.description || '',
            logo: logoPath
        };
        reposStore.set('default', reposData);

        return { success: true };
    } catch (error) {
        console.error('Error adding app repository:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 处理批量导入仓库列表的逻辑
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function handleImportAppRepos() {
    try {
        const result = await dialog.showOpenDialog({
            title: '选择仓库列表文件',
            properties: ['openFile'],
            filters: [{ name: 'Text Files', extensions: ['txt'] }]
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: '未选择文件' };
        }
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');
        const repoUrls = content.split('\n').filter(url => url.trim() !== '');

        for (const repoUrl of repoUrls) {
            await handleAddAppRepo(repoUrl);
        }

        return { success: true };
    } catch (error) {
        console.error('Error importing app repositories:', error);
        return { success: false, error: error.message };
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
 * @returns {*[Object]} app信息集合
 */
function getAppList() {
    // console.log('appsConfig.get('default'):', appsConfig.get('default'));
    if (undefined === AppsConfig.get('default')) {
        return [];
    }
    const appInfoList = AppsConfig.get('default');
    let appList = [];
    for (const appInfo of appInfoList) {
        // 读取app.json文件内容
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
 * 获取仓库列表
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
async function getReposData() {
    try {
        const reposData = getReposStore().get('default') || {};
        return { success: true, data: reposData };
    } catch (error) {
        console.error('获取仓库列表失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 删除仓库
 * @param {string} uid 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function removeRepo(uid) {
    try {
        const reposStore = getReposStore();
        const reposData = reposStore.get('default') || {};
        if (!reposData[uid]) {
            return { success: false, error: '仓库不存在' };
        }
        delete reposData[uid];
        reposStore.set('default', reposData);
        // 删除仓库目录
        const repoPath = path.join(APP_PATH, 'repos', uid);
        fs.rmdirSync(repoPath, { recursive: true });
        return { success: true };
    } catch (error) {
        console.error('删除仓库失败:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initIpcHandlers,
    handleLoadAppById,
    handleAddAppRepo,
    handleImportAppRepos,
    getReposList: getReposData,
    removeRepo
};