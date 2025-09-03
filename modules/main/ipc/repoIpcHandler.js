const { ipcMain } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { dialog } = require('electron');
const { handleError } = require('./errorHandler');

const { getReposStore } = require('../storageManager');
const repoUtils = require('../utils/repoUtils');
const fileUtils = require('../utils/fileUtils');
const DateFormat = require('../../utils/DateFormat');

const { handleImportApp } = require('../appManager');

const { getReposPath, getReposTempPath } = require('../pathManager');
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
    reposData[uid].downloaded = false;
    reposStore.set('default', reposData);
    return { success: true };
}

/**
 * 处理添加单个仓库的逻辑
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
        return { success: true };
    } catch (error) {
        return handleError(error, 'handleAddAppRepo');
    }
}

/**
 * 处理批量导入仓库列表的逻辑
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
            downloadUrl = `${repo}/releases/download/${version}/${fileName}`;
        } else {
            // 自托管服务（如 Gitea/GitLab CE）
            downloadUrl = `${repo}/archive/${fileName}`;
        }

        // 确保 REPOS_TEMP_PATH 目录存在
        if (!fs.existsSync(REPOS_TEMP_PATH)) {
            fs.mkdirSync(REPOS_TEMP_PATH, { recursive: true });
        } else {
            // 清空 REPOS_TEMP_PATH 目录
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
        return handleError(new Error('下载应用失败: ' + error.message), 'downloadAppsFromRepo');
    }
}

/**
 * 初始化仓库管理相关的 IPC 处理逻辑
 */
function initRepoHandlers() {
    // 添加app源
    ipcMain.handle('add-app-repo', async (event, repoUrl, branch) => {
        return handleAddAppRepo(repoUrl, branch);
    });

    // 导入app源列表
    ipcMain.handle('import-app-repos', async () => {
        return handleImportAppRepos();
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
}

module.exports = {
    init: initRepoHandlers
};