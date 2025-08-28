const Store = require('electron-store');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { app } = require('electron');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const { handleError } = require('./errorHandler');
const repoUtils = require('../utils/repoUtils');
const fileUtils = require('../../utils/fileUtils');

class RepoMonitorService {
    constructor() {
        // 初始化存储路径
        this.userDir = path.join(app.getPath('userData'), 'Users');
        this.configPath = path.join(this.userDir, 'repo-monitor.json');

        // 确保目录存在
        if (!fs.existsSync(this.userDir)) {
            fs.mkdirSync(this.userDir, { recursive: true });
        }

        // 初始化 electron-store
        this.store = new Store({
            cwd: 'Users',
            name: 'repo-monitor',
            defaults: {
                repos: {}
            }
        });

        // 初始化 winston 日志
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] ${level}: ${message}`;
                })
            ),
            transports: [
                new DailyRotateFile({
                    filename: path.join(this.userDir, 'repo-monitor-%DATE%.log'),
                    datePattern: 'YYYY-MM-DD',
                    maxSize: '10m',
                    maxFiles: '7d',
                    zippedArchive: true
                }),
                new winston.transports.Console()
            ]
        });
    }

    /**
     * 记录日志
     * @param {string} message - 日志内容
     */
    log(message) {
        this.logger.info(message);
    }

    /**
     * 扫描仓库并更新数据
     */
    async scanRepo() {
        try {
            const repos = this.store.get('repos.default') || {};
            this.log(`开始扫描仓库，共 ${Object.keys(repos).length} 个仓库`);

            for (const [uid, repoInfo] of Object.entries(repos)) {
                try {
                    this.log(`扫描仓库: ${repoInfo.repo} (分支: ${repoInfo.branch})`);
                    
                    // 下载仓库文件（参考 repoIpcHandler 逻辑）
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
                        const downloadSuccess = await repoUtils.downloadFileFromRepo(fileUrl, filePath);
                        if (!downloadSuccess && file === 'app.json') {
                            return handleError(new Error('无法下载app.json, 请检查仓库地址是否正确或是否有权限'), 'handleAddAppRepo');
                        }

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
                    this.store.set('repos.default', repos);
                    this.log(`仓库 ${repoInfo.name} 信息已更新`);
                } catch (error) {
                    this.log(`仓库 ${repoInfo.repo} 扫描失败: ${error.message}`);
                }
            }
            this.log('仓库扫描完成');
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