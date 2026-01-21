const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { dialog } = require('electron');
const { handleError } = require('@modules/ipc/errorHandler');
const logger = require('@modules/utils/logger');

const { getReposStore, getAppsStore } = require('@modules/main/storageManager');
const repoUtils = require('@modules/utils/repoUtils');
const fsUtils = require('@modules/utils/fs-utils');
const DateFormat = require('@modules/utils/DateFormat');

const { handleImportApp } = require('@modules/main/appManager');

const { getReposPath, getReposTempPath } = require('@modules/main/pathManager');
const REPOS_PATH = getReposPath();
const REPOS_TEMP_PATH = getReposTempPath();

async function updateReposStatus(uid) {
    const reposStore = getReposStore();
    const reposData = reposStore.get('default') || {};
    if (!reposData || Object.keys(reposData).length === 0) {
        return { success: true };
    }
    const repo = reposData[uid];
    if (!repo) {
        return { success: true };
    }

    // 下载状态置为false，并删除下载时间和可更新状态
    reposData[uid].downloaded = false;
    delete reposData[uid].downloadTime;
    delete reposData[uid].toUpdate;
    reposStore.set('default', reposData);
    return { success: true };
}

/**
 * 处理添加单个仓库的逻辑
 */
async function handleAddAppRepo(repoUrl) {
    try {
        if (!repoUrl) {
            throw new Error('NoGitRepo');
        }

        // 校验仓库地址格式
        if (!repoUtils.validateRepoUrl(repoUrl)) {
            throw new Error('InvalidGitRepo');
        }

        // 自动获取仓库的默认分支
        let branch = '';
        try {
            // 移除末尾的 .git 后缀（如果有）
            let cleanRepoUrl = repoUrl;
            if (cleanRepoUrl.endsWith('.git')) {
                cleanRepoUrl = cleanRepoUrl.slice(0, -4);
            }

            // 尝试获取仓库信息来推断默认分支
            const repoInfoUrl = cleanRepoUrl + '/info/refs?service=git-upload-pack';
            const response = await axios.get(repoInfoUrl, {
                timeout: 10000, // 10秒超时
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Canbox/0.1.0'
                }
            });
            const text = response.data;
            // 从响应中提取默认分支信息
            const match = text.match(/refs\/heads\/([^\s]+)/);
            if (match) {
                branch = match[1];
            } else {
                branch = 'main'; // 回退到 main
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                logger.warn('获取默认分支超时，使用 main 作为默认分支');
            } else {
                logger.info('无法自动获取默认分支，使用 main 作为默认分支: {}', error.message);
            }
            branch = repoUrl.includes('github.com') ? 'main' : 'master'; // 回退到 main
        }

        // 尝试访问仓库地址
        try {
            const url = repoUtils.getFileUrl(repoUrl, branch, 'app.json');
            logger.info('验证仓库访问: {}', url);
            const response = await axios.get(url, {
                timeout: 10000, // 10秒超时
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Canbox/0.1.0'
                }
            });
            if (response.status !== 200) {
                logger.error('仓库访问失败，状态码: {} URL: {}', response.status, url);
                logger.error('响应内容(前500字符): {}', JSON.stringify(response.data).substring(0, 500));
                throw new Error('UnableToAccessRepo');
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                logger.warn('仓库访问超时: {}', repoUrl);
                throw new Error('NetworkTimeout');
            } else if (error.response) {
                logger.error('仓库访问失败，状态码: {} URL: {}', error.response.status, url);
                logger.error('响应内容(前500字符): {}', JSON.stringify(error.response.data).substring(0, 500));
                throw new Error('UnableToAccessRepo');
            }
            throw error;
        }

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
                throw new Error('CannotDownloadAppJson');
            }

            // 如果是app.json，下载logo图片
            if (file === 'app.json' && downloadSuccess) {
                appJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (appJson.logo) {
                    const logoUrl = repoUtils.getFileUrl(repoUrl, branch, appJson.logo);
                    const logoExt = path.extname(appJson.logo);
                    logoPath = path.join(reposPath, `logo${logoExt}`);
                    const logoDir = path.dirname(logoPath);

                    fsUtils.ensureDirExists(logoDir);

                    // const logoDownloadSuccess = await repoUtils.downloadLogoFromRepo(logoUrl, logoPath);
                    // if (!logoDownloadSuccess) {
                    //     console.warn(`无法下载logo图片: ${logoUrl}`);
                    // }
                    repoUtils.downloadLogoFromRepo(logoUrl, logoPath).then((logoDownloadSuccess) => {
                        if (!logoDownloadSuccess) {
                            console.warn(`无法下载logo图片: ${logoUrl}`);
                        }
                    });
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
            logo: logoPath,
            files: {},
            createTime: Date.now(),
            downloaded: false
        };

        // 异步计算并保存文件哈希值
        await Promise.all(filesToDownload.map(async (file) => {
            const filePath = path.join(reposPath, file);
            if (fs.existsSync(filePath)) {
                const crypto = require('crypto');
                const hash = crypto.createHash('sha256');
                const stream = fs.createReadStream(filePath);

                await new Promise((resolve, reject) => {
                    stream.on('data', (chunk) => hash.update(chunk));
                    stream.on('end', () => {
                        const fileHash = hash.digest('hex');
                        reposData[uuid].files[file.replace(/\./g, '_')] = fileHash;
                        resolve();
                    });
                    stream.on('error', reject);
                });
            }
        }));

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

        // 对比"我的app"中已有的app，如果有相同id，则设置downloaded为true
        const appsStore = getAppsStore();
        const appsData = appsStore.get('default') || {};
        const isAppDownloaded = Object.values(appsData).some(app => app.id === appJson.id);

        if (isAppDownloaded) {
            const updatedReposData = reposStore.get('default') || {};
            updatedReposData[uuid].downloaded = true;
            updatedReposData[uuid].downloadTime = Date.now();
            reposStore.set('default', updatedReposData);
            logger.info(`仓库 ${uuid} (id: ${appJson.id}) 已下载，更新状态`);
        }

        return { success: true };
    } catch (error) {
        throw error;
    }
}

/**
 * 处理批量导入仓库列表的逻辑
 */
async function handleImportAppRepos() {
    const result = await dialog.showOpenDialog({
        title: '选择仓库列表文件',
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
        return { success: true, msg: 'NoFileSelected' };
    }
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    let reposData;
    try {
        reposData = JSON.parse(content);
    } catch (error) {
        throw new Error('Invalid JSON format');
    }

    if (!Array.isArray(reposData)) {
        throw new Error('Invalid format: expected an array of repos');
    }

    // 获取已有的仓库列表，用于去重
    const reposStore = getReposStore();
    const existingRepos = reposStore.get('default') || {};
    const existingRepoUrls = Object.values(existingRepos).map(repo => repo.repo.toLowerCase());

    let successCount = 0, failedRepos = [], skippedCount = 0;
    for (const repo of reposData) {
        const repoUrl = repo.repo;
        if (!repoUrl || typeof repoUrl !== 'string') {
            console.warn(`跳过无效的仓库数据: %o`, repo);
            failedRepos.push({ repo: repo, error: 'Missing or invalid repo field' });
            continue;
        }

        // 检查是否已存在相同的仓库 URL
        if (existingRepoUrls.includes(repoUrl.toLowerCase())) {
            console.log(`跳过已存在的仓库: ${repoUrl}`);
            skippedCount++;
            continue;
        }

        console.log(`正在处理仓库: ${repoUrl}`);
        try {
            await handleAddAppRepo(repoUrl);
            successCount++;
            // 更新已存在仓库列表
            const updatedRepos = reposStore.get('default') || {};
            existingRepoUrls.push(...Object.values(updatedRepos).map(r => r.repo.toLowerCase()));
        } catch (error) {
            console.error(`处理仓库 ${repoUrl} 失败: ${error}`);
            failedRepos.push({ repoUrl, error });
        }
    }

    // 通知前端仓库数据已更新
    if (successCount > 0) {
        const windows = BrowserWindow.getAllWindows();
        logger.info('windows: {}', windows.length);
        if (windows.length > 0) {
            logger.info("windows[0]: {}", windows[0]);
            windows[0].webContents.send('repo-data-updated');
        }
    }

    return { success: true, data: { successCount, failedRepos, skippedCount} };
}

/**
 * 获取仓库列表
 */
async function getReposData() {
    try {
        const reposData = getReposStore().get('default') || {};
        return { success: true, data: reposData };
    } catch (error) {
        return handleError(error, 'getReposData');
    }
}

/**
 * 导出仓库列表为 JSON 文件
 */
async function exportReposData() {
    try {
        const reposData = getReposStore().get('default') || {};
        const exportData = [];

        // 提取需要的字段：id, name, repo, branch
        Object.entries(reposData).forEach(([uid, repo]) => {
            exportData.push({
                id: repo.id,
                name: repo.name,
                repo: repo.repo
            });
        });

        // 选择保存路径
        const result = await dialog.showSaveDialog({
            title: '导出 APP 源列表',
            defaultPath: 'app-repos.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: true, msg: '已取消导出' };
        }

        // 写入文件
        fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
        logger.info('导出仓库列表成功，文件路径: {}', result.filePath);

        return { success: true, data: { filePath: result.filePath } };
    } catch (error) {
        return handleError(error, 'exportReposData');
    }
}

/**
 * 删除仓库
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
        return handleError(error, 'removeRepo');
    }
}

/**
 * 从仓库下载应用
 */
async function downloadAppsFromRepo(uid) {
    const repoInfo = (getReposStore().get('default') || {})[uid];
    if (!repoInfo) {
        return handleError(new Error('仓库不存在'), 'downloadAppsFromRepo');
    }

    try {
        const { repo, id, version } = repoInfo;
        const fileName = `${id}-${version}.zip`;

        // 解析仓库平台并构建下载 URL
        const downloadUrl = repoUtils.getDownloadUrl(repo, version, fileName);
        logger.info(`从 ${repo} 下载 ${fileName}...${downloadUrl}`);

        // 确保 REPOS_TEMP_PATH 目录存在
        if (!fs.existsSync(REPOS_TEMP_PATH)) {
            fs.mkdirSync(REPOS_TEMP_PATH, { recursive: true });
        } else {
            fsUtils.clearDir(REPOS_TEMP_PATH);
        }

        // 下载文件
        const zipPath = path.join(REPOS_TEMP_PATH, fileName);
        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            timeout: 5000,
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 调用 handleImportApp 导入应用
        const ret = await handleImportApp(null, zipPath, uid);
        if (!ret.success) {
            fs.unlinkSync(zipPath); // 确保临时文件被删除
            return handleError(ret.msg, 'downloadAppsFromRepo');
        }
        // 删除临时文件
        fs.unlinkSync(zipPath);


        // 更新下载标识
        const reposStore = getReposStore();
        const reposData = reposStore.get('default') || {};
        reposData[uid] = { ...repoInfo, downloaded: true, downloadTime: DateFormat.format(new Date()), toUpdate: false };
        reposStore.set('default', reposData);

        // 返回下载结果
        return { success: true };
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return handleError(new Error('下载超时'), 'downloadAppsFromRepo');
        }
        return handleError(new Error('下载应用失败: ' + error.message), 'downloadAppsFromRepo');
    }
}

// function clearDir(dirPath) {
//     for (const file of fs.readdirSync(dirPath)) {
//         const fullPath = path.join(dirPath, file);
//         if (fs.lstatSync(fullPath).isDirectory()) {
//             clearDir(fullPath); // 递归删除子目录
//             fs.rmdirSync(fullPath);
//         } else {
//             fs.unlinkSync(fullPath); // 删除文件
//         }
//     }
// }

/**
 * 初始化仓库管理相关的 IPC 处理逻辑
 */
function initRepoHandlers() {
    // 添加app源
    ipcMain.handle('add-app-repo', async (event, repoUrl) => {
        try {
            return handleAddAppRepo(repoUrl);
        } catch (error) {
            return handleError(error, 'add-app-repo');
        }
    });

    // 导入app源列表
    ipcMain.handle('import-app-repos', async () => {
        try {
            return handleImportAppRepos();
        } catch (error) {
            return handleError(error, 'import-app-repos');
        }
    });

    // 获取仓库列表
    ipcMain.handle('get-repos-data', async () => {
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

    ipcMain.handle('update-repos-status', async (event, uid) => {
        return updateReposStatus(uid);
    });

    // 导出仓库列表
    ipcMain.handle('export-repos-data', async () => {
        return exportReposData();
    });
}

module.exports = {
    init: initRepoHandlers
};