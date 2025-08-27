const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const winState = require('./modules/main/winState');

const ObjectUtils = require('./modules/utils/ObjectUtils')

const appWindow = require('./modules/main/app.window')

const { getAppDataPath, getAppPath, getAppTempPath, getReposPath, getReposTempPath } = require('./modules/main/pathManager');
const APP_DATA_PATH = getAppDataPath();
const APP_PATH = getAppPath();
const APP_TEMP_PATH = getAppTempPath();
const REPOS_PATH = getReposPath();
const REPOS_TEMP_PATH = getReposTempPath();

// 引入工具模块
const repoUtils = require('./modules/utils/repoUtils');
const fileUtils = require('./modules/utils/fileUtils');

/**
 * 统一错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文描述
 * @returns {{success: boolean, msg: string}} - 标准化错误返回
 */
function handleError(error, context) {
    console.error(`[${context}] Error:`, error.message);
    return { success: false, msg: error.message };
}



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
function initIpcHandlers() {
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
    ipcMain.handle('import-app', handleImportApp);

    // 删除应用
    ipcMain.handle('remove-app', handleRemoveApp);

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

    // 获取应用信息
    const getAppFilePath = (basePath, fileName) => path.join(basePath, fileName);

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
        const [readme, history] = await Promise.all([
            readFileWithErrorHandling(getAppFilePath(appItem.path, 'README.md')),
            readFileWithErrorHandling(getAppFilePath(appItem.path, 'HISTORY.md'))
        ]);

        const msg = (readme || history) ? null : '部分文件读取失败';
        return { success: null === msg, data: { readme, history }, msg };
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

    ipcMain.handle('getAppList', async (event) => {
        return await getAppList();
    });

    // 生成快捷方式
    ipcMain.handle('generate-shortcut', async () => {
        if (!app.isPackaged) {
            return handleError(new Error('只能在生产环境下生成快捷方式'), 'generate-shortcut');
        }
        const appList = await getAppList();
        return shortcutManager.generateShortcuts(appList);
    });

    // 删除快捷方式
    ipcMain.handle('delete-shortcut', async () => {
        if (!app.isPackaged) {
            return handleError(new Error('只能在生产环境下删除快捷方式'), 'delete-shortcut');
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

    // 从仓库下载应用
    ipcMain.handle('download-apps-from-repo', async (event, uid) => {
        return downloadAppsFromRepo(uid);
    });
}

async function handleRemoveApp(event, param) {
    try {
        if ('dev' === param.tag) {
            await removeAppDevById(param.id);
        } else {
            await removeAppById(param.id);
        }
    } catch (err) {
        return handleError(err, 'handleRemoveApp');
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
}

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
            return handleError(new Error('未输入仓库地址'), 'handleAddAppRepo');
        }
        branch = branch || 'main';

        // 校验仓库地址格式
        if (!repoUtils.validateRepoUrl(repoUrl)) {
            return handleError(new Error('仓库地址格式无效'), 'handleAddAppRepo');
        }

        // 尝试访问仓库地址
        try {
            const response = await fetch(`${repoUrl}/blob/${branch || 'main'}/app.json`);
            if (!response.ok) {
                return handleError(new Error('无法访问该仓库，请检查地址是否正确或是否有权限'), 'handleAddAppRepo');
            }
        } catch (error) {
            return handleError(error, 'handleAddAppRepo');
        }
        console.info('ipcHandlers.js: handleAddAppRepo: repoUrl: ', repoUrl, ' branch: ', branch);

        const uuid = uuidv4().replace(/-/g, '');
        const reposPath = path.join(REPOS_PATH, uuid);
        fs.mkdirSync(reposPath, { recursive: true });

        let appJson, logoPath;
        // 下载文件
        const filesToDownload = ['app.json', 'README.md', 'HISTORY.md'];
        for (const file of filesToDownload) {
            const fileUrl = repoUtils.getFileUrl(repoUrl, branch, file);
            const filePath = path.join(reposPath, file);
            const downloadSuccess = await repoUtils.downloadFileFromRepo(fileUrl, filePath);
            if (!downloadSuccess && file === 'app.json') {
                return handleError(new Error('无法下载app.json, 请检查仓库地址是否正确或是否有权限'), 'handleAddAppRepo');
            }

            // 如果是app.json，下载logo图片
            if (file === 'app.json' && downloadSuccess) {
                appJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (appJson.logo) {
                    const logoUrl = repoUtils.getFileUrl(repoUrl, branch, appJson.logo);
                    const logoExt = path.extname(appJson.logo);
                    logoPath = path.join(reposPath, `logo${logoExt}`);
                    const logoDir = path.dirname(logoPath);
                    
                    fileUtils.ensureDirExists(logoDir);
                    
                    const logoDownloadSuccess = await repoUtils.downloadFileFromRepo(logoUrl, logoPath);
                    if (!logoDownloadSuccess) {
                        console.warn(`无法下载logo图片: ${logoUrl}`);
                    }
                }
            }
        }

        // 保存仓库信息
        const reposStore = getReposStore();
        const reposData = reposStore.get('default') || {};
        reposData[uuid] = {
            id: appJson.id,
            name: appJson.name,
            repo: repoUrl,
            branch: branch,
            author: appJson.author || '',
            version: appJson.version || '',
            description: appJson.description || '',
            logo: logoPath
        };
        reposStore.set('default', reposData);

        /*
{
    "default": {
        "3a6f487d7f9f4fae86dcfbc3dde401a2": {
            "id": "com.gitee.lizl6.cb-jsonbox",
            "name": "jsonbox",
            "repo": "https://gitee.com/lizl6/cb-jsonbox",
            "branch": "master",
            "author": "lizl6",
            "version": "0.0.1",
            "description": "JsonBox - 跨平台的 JSON 格式化工具",
            "logo": "/home/lizl6/.config/canbox/Users/repos/3a6f487d7f9f4fae86dcfbc3dde401a2/logo.png"
        }
    }
}
        */

        return { success: true };
    } catch (error) {
        console.error('Error adding app repository:', error);
        return handleError(error, 'handleAddAppRepo');
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
            return handleError(new Error('未选择文件'), 'handleImportAppRepos');
        }
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');
        const repoUrls = content.split('\n').filter(url => url.trim() !== '');

        for (const repoUrl of repoUrls) {
            await handleAddAppRepo(repoUrl);
        }

        return { success: true };
    } catch (error) {
        return handleError(error, 'handleImportAppRepos');
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
        return handleError(error, 'getReposData');
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
            return handleError(new Error('仓库不存在'), 'removeRepo');
        }
        delete reposData[uid];
        reposStore.set('default', reposData);
        // 删除仓库目录
        const repoPath = path.join(REPOS_PATH, uid);
        fs.rmdirSync(repoPath, { recursive: true });
        return { success: true };
    } catch (error) {
        console.error('删除仓库失败:', error);
        return handleError(error, 'removeRepo');
    }
}

async function downloadAppsFromRepo(uid) {
    const repoInfo = (getReposStore().get('default') || {})[uid]
    if (undefined === repoInfo) {
        return handleError(new Error('仓库不存在'), 'downloadAppsFromRepo');
    }
    console.info('repoInfo: ', repoInfo);

    try {
        let downloadUrl;
        const { repo, id, version } = repoInfo;
        const fileName = `${id}-${version}.zip`;

        // 解析仓库平台并构建下载 URL
        if (repo.includes('github.com')) {
            downloadUrl = `${repo.replace('github.com', 'github.com/releases/download')}/v${version}/${fileName}`;
        } else if (repo.includes('gitlab.com')) {
            downloadUrl = `${repo}/-/archive/v${version}/${fileName}`;
        } else if (repo.includes('bitbucket.org')) {
            downloadUrl = `${repo}/downloads/${fileName}`;
        } else if (repo.includes('gitee.com')) {
            // downloadUrl = `${repo}/repository/archive/${fileName}`;
            downloadUrl = `${repo}/releases/download/${version}/${fileName}`;
        } else {
            // 自托管服务（如 Gitea/GitLab CE）
            downloadUrl = `${repo}/archive/${fileName}`;
        }

        // 确保 APP_TEMP_PATH 目录存在
        if (!fs.existsSync(REPOS_TEMP_PATH)) {
            fs.mkdirSync(REPOS_TEMP_PATH, { recursive: true });
        } else {
            // 当 APP_TEMP_PATH 存在时，使用命令行清空 REPOS_TEMP_PATH 目录下的所有内容，注意区分OS不同
            if (process.platform === 'win32') {
                execSync(`rd /s /q ${REPOS_TEMP_PATH}\\*`);
            } else {
                execSync(`rm -rf ${REPOS_TEMP_PATH}/*`);
            }
        }

        // 下载文件
        const zipPath = path.join(REPOS_TEMP_PATH, fileName);
        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 调用 handleImportApp 导入应用
        const ret = await handleImportApp(null, zipPath, uid);

        // 删除临时文件
        fs.unlinkSync(zipPath);

        return ret;
    } catch (error) {
        return handleError(new Error('下载应用失败: ' + error.message), 'downloadAppsFromRepo');
    }
}

module.exports = {
    initIpcHandlers,
    handleLoadAppById
};