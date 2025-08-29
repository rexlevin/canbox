const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { app } = require('electron');
const logger = require('../../utils/logger');

const { handleError } = require('../ipc/errorHandler');
const repoUtils = require('../../utils/repoUtils');
const fileUtils = require('../../utils/fileUtils');

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
            defaults: {
                repos: {}
            }
        });

        // 使用全局日志实例
        this.logger = logger;
    }

    /**
     * 记录日志
     * @param {string} message - 日志内容
     */
    log(message) {
        this.logger.info(message);
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
            this.log(`开始扫描仓库，共 ${Object.keys(repos).length} 个仓库`);

            for (const [uid, repoInfo] of Object.entries(repos)) {
                try {
                    this.log(`扫描仓库: ${repoInfo.repo} (分支: ${repoInfo.branch})`);
                    
                    const repoUrl = repoInfo.repo;
                    const branch = repoInfo.branch;
                    const uuid = uid;
                    const reposPath = path.join(this.userDir, 'repos', uuid);
                    fs.mkdirSync(reposPath, { recursive: true });

                    let appJson, logoPath;
                    const filesToDownload = ['app.json', 'README.md', 'HISTORY.md'];
                    for (const file of filesToDownload) {
                        const fileUrl = repoUtils.getFileUrl(repoUrl, branch, file);
                        const filePath = path.join(reposPath, file);
                        
                        // 获取远程文件哈希值（或下载到临时目录计算）
                        let remoteHash, tempFilePath;
                        try {
                            remoteHash = await repoUtils.getFileHash(repoUrl, branch, file);
                        } catch (error) {
                            const { getReposTempPath } = require('../pathManager');
                            const REPOS_TEMP_PATH = getReposTempPath();
                            tempFilePath = path.join(REPOS_TEMP_PATH, file);
                            await repoUtils.downloadFileFromRepo(fileUrl, tempFilePath);
                            remoteHash = await this.calculateFileHash(tempFilePath);
                        }

                        // 对比哈希值
                        const storedHash = this.store.get(`default.${uid}.files.${file}`);
                        if (storedHash === remoteHash) {
                            fs.unlinkSync(tempFilePath); // 哈希一致，删除临时文件
                            this.log(`文件 ${file} 未变化，跳过下载`);
                            continue;
                        } else {
                            // 哈希不一致，复制临时文件到目标路径
                            fs.copyFileSync(tempFilePath, filePath);
                            fs.unlinkSync(tempFilePath); // 删除临时文件
                        }

                        // 更新哈希值
                        const newHash = await this.calculateFileHash(filePath);
                        this.store.set(`default.${uid}.files.${file}`, newHash);

                        // 如果是 app.json，下载logo图片
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
                    console.info('appJson:', appJson);

                    // 保存仓库信息
                    repos[uid] = {
                        ...repoInfo,
                        id: appJson.id,
                        name: appJson.name,
                        author: appJson.author || repoInfo.author,
                        version: appJson.version || repoInfo.version,
                        description: appJson.description || repoInfo.description,
                        logo: logoPath
                    };
                    this.store.set('default', repos);
                    this.log(`仓库 ${repoInfo.name} 信息已更新`);
                } catch (error) {
                    this.log(`仓库 ${repoInfo.repo} 扫描失败: ${error.message}`);
                }
            }
            this.log('仓库扫描完成');
            // 通知前端数据已更新
            const { ipcMain } = require('electron');
            ipcMain.emit('repo-data-updated');
        } catch (error) {
            this.log(`扫描失败: ${error.message}`);
        }
    }

    /**
     * 启动定时扫描任务
     * @param {string} schedule - cron 表达式
     */
    startScheduler(schedule) {
        cron.schedule(schedule, async () => {
            try {
                this.log('开始定时扫描任务');
                await this.scanRepo();
                this.log('定时扫描任务完成');
            } catch (error) {
                this.log(`定时扫描任务失败: ${error.message}`);
            }
        });
        this.log(`定时任务已启动，计划: ${schedule}`);
    }
}

module.exports = RepoMonitorService;