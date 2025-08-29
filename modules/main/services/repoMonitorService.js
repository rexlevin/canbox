const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { app } = require('electron');
const logger = require('../utils/logger');

const { handleError } = require('../ipc/errorHandler');
const repoUtils = require('../utils/repoUtils');
const fileUtils = require('../utils/fileUtils');

// 导入窗口管理模块
const windowManager = require('../windowManager');

class RepoMonitorService {
    constructor() {
        // 初始化存储路径
        this.userDir = path.join(app.getPath('userData'), 'Users');

        // 确保目录存在
        if (!fs.existsSync(this.userDir)) {
            fs.mkdirSync(this.userDir, { recursive: true });
        }

        // 初始化 electron-store
        this.store = new Store({
            cwd: 'Users',
            name: 'repos',
            defaults: {}
        });

    }

    /**
     * 计算文件哈希值
     * @param {string} filePath - 文件路径
     * @returns {Promise<string>} - 文件哈希值
     */
    async calculateFileHash(filePath) {
        const crypto = require('crypto');
        const fs = require('fs');
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    /**
     * 扫描仓库并更新数据
     */
    async scanRepo() {
        try {
            const repos = this.store.get('default') || {};
            logger.info(`开始扫描仓库，共 ${Object.keys(repos).length} 个仓库`);

            for (const [uid, repoInfo] of Object.entries(repos)) {
                try {
                    logger.info(`扫描仓库: ${repoInfo.repo} (分支: ${repoInfo.branch})`);
                    
                    const repoUrl = repoInfo.repo;
                    const branch = repoInfo.branch;
                    const uuid = uid;
                    const reposPath = path.join(this.userDir, 'repos', uuid);
                    fs.mkdirSync(reposPath, { recursive: true });

                    let appJson, logoPath, modifyFlag = false;
                    const filesToDownload = ['app.json', 'README.md', 'HISTORY.md'];
                    for (const file of filesToDownload) {
                        const fileUrl = repoUtils.getFileUrl(repoUrl, branch, file);
                        const filePath = path.join(reposPath, file);
                        
                        // 获取远程文件哈希值（或下载到临时目录计算）
                        let remoteHash = '', tempFilePath, downloadSuccess = false;
                        try {
                            remoteHash = await repoUtils.getFileHash(repoUrl, branch, file);
                        } catch (error) {
                            logger.warn(`无法获取 ${file} 的哈希值，将尝试下载文件...${error}`);
                            const { getReposTempPath } = require('../pathManager');
                            const REPOS_TEMP_PATH = getReposTempPath();
                            tempFilePath = path.join(REPOS_TEMP_PATH, file);
                            downloadSuccess = await repoUtils.downloadFileFromRepo(fileUrl, tempFilePath);
                            if (downloadSuccess) {
                                remoteHash = await this.calculateFileHash(tempFilePath);
                            }
                        }

                        if (!downloadSuccess && file === 'app.json') {
                            return handleError(new Error('无法下载app.json, 请检查仓库地址是否正确或是否有权限'), 'handleAddAppRepo');
                        }
                        if (!downloadSuccess) {
                            logger.error(`文件 ${file} 下载失败`);
                            continue;
                        }

                        // 对比哈希值
                        const storedHash = this.store.get(`default.${uid}.files.${file}`);
                        if (storedHash === remoteHash) {
                            fs.unlinkSync(tempFilePath); // 哈希一致，删除临时文件
                            logger.info(`文件 ${file} 未变化，跳过下载`);
                            continue;
                        } else {
                            // 哈希不一致，复制临时文件到目标路径
                            logger.info(`文件 ${file} 已更新，下载完成`);
                            fs.copyFileSync(tempFilePath, filePath);
                            fs.unlinkSync(tempFilePath); // 删除临时文件
                            // 更新哈希值
                            this.store.set(`default.${uid}.files.${file}`, remoteHash);
                            // 更新修改标识
                            modifyFlag = true;
                        }

                        // 如果是 app.json，下载logo图片
                        if (file === 'app.json') {
                            appJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            if (appJson.logo) {
                                const logoUrl = repoUtils.getFileUrl(repoUrl, branch, appJson.logo);
                                const logoExt = path.extname(appJson.logo);
                                logoPath = path.join(reposPath, `logo${logoExt}`);
                                const logoDir = path.dirname(logoPath);
                                
                                fileUtils.ensureDirExists(logoDir);
                                
                                const logoDownloadSuccess = await repoUtils.downloadFileFromRepo(logoUrl, logoPath);
                                if (!logoDownloadSuccess) {
                                    logger.warn(`无法下载logo图片: ${logoUrl}`);
                                }
                            }
                        }
                    }
                    if (!modifyFlag) {
                        logger.info(`扫描仓库: ${repoInfo.repo} (分支: ${repoInfo.branch})结束，仓库未更新`);
                        continue;
                    }

                    // 保存仓库信息
                    const existingFiles = this.store.get(`default.${uid}.files`) || {};
                    repos[uid] = {
                        ...repoInfo,
                        id: appJson.id,
                        name: appJson.name,
                        author: appJson.author || repoInfo.author,
                        version: appJson.version || repoInfo.version,
                        description: appJson.description || repoInfo.description,
                        logo: logoPath,
                        files: existingFiles
                    };
                    this.store.set('default', repos);
                    logger.info(`仓库 ${repoInfo.name} 信息已更新`);
                } catch (error) {
                    logger.warn(`仓库 ${repoInfo.repo} 扫描失败: ${error.message}`);
                }
            }
            logger.info('仓库扫描完成');
            // 通知前端数据已更新
            const win = windowManager.getWindow('canbox');
            win.webContents.send('repo-data-updated');
        } catch (error) {
            logger.error(`扫描失败: ${error.message}`);
        }
    }

    /**
     * 启动定时扫描任务
     * @param {string} schedule - cron 表达式
     */
    startScheduler(schedule) {
        cron.schedule(schedule, async () => {
            try {
                logger.info('开始定时扫描任务');
                await this.scanRepo();
                logger.info('定时扫描任务完成');
            } catch (error) {
                logger.error(`定时扫描任务失败: ${error.message}`);
            }
        });
        logger.info(`定时任务已启动，计划: ${schedule}`);
    }
}

module.exports = RepoMonitorService;