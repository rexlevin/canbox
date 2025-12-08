const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('@modules/utils/logger');
const { getAppPath } = require('@modules/main/pathManager');

/**
 * App进程管理器
 * 用于启动和管理独立的App进程
 */
class AppProcessManager {
    constructor() {
        this.appProcesses = new Map(); // 存储App进程 {appId: childProcess}
    }

    /**
     * 启动App进程
     * @param {string} appId - App ID
     * @param {boolean} devTag - 是否为开发模式
     * @param {Object} options - 额外选项
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async startAppProcess(appId, devTag = false, options = {}) {
        try {
            // 检查App是否已经运行
            if (this.appProcesses.has(appId)) {
                const existingProcess = this.appProcesses.get(appId);
                if (!existingProcess.killed) {
                    logger.info(`App ${appId} is already running`);
                    return { success: false, msg: 'App is already running' };
                }
                // 清理已结束的进程
                this.appProcesses.delete(appId);
            }
            logger.info(`App ${appId} will start in separate process...`);

            // 获取App信息
            const { getAppsStore, getAppsDevStore } = require('../main/storageManager');
            const appItem = devTag
                ? getAppsDevStore().get('default')[appId]
                : getAppsStore().get('default')[appId];

            if (!appItem) {
                return { success: false, msg: 'App not found' };
            }
            logger.info(`App ${appId} found, appItem: {}`, JSON.stringify(appItem));

            const appPath = devTag 
                ? appItem.path 
                : path.join(getAppPath(), appId + '.asar');

            const appJson = devTag
                ? JSON.parse(fs.readFileSync(path.join(appItem.path, 'app.json'), 'utf8'))
                : JSON.parse(fs.readFileSync(path.join(getAppPath(), appId + '.asar/app.json'), 'utf8'));

            // 构建窗口配置字符串并传递给子进程
            let windowConfig = {};
            if (appJson.window) {
                windowConfig = { ...appJson.window };
                
                // 处理图标路径
                if (windowConfig.icon) {
                    windowConfig.icon = path.resolve(appPath, windowConfig.icon);
                } else {
                    windowConfig.icon = path.resolve(appPath, appJson.logo);
                }
                if (!devTag) {
                    const logoExt = path.extname(appJson.logo);
                    windowConfig.icon = path.resolve(getAppPath(), `${appId}${logoExt}`);
                }
                
                // 处理 preload 路径
                if (windowConfig.webPreferences?.preload) {
                    windowConfig.webPreferences.preload = path.resolve(appPath, windowConfig.webPreferences.preload);
                }
            }



            // 构建启动参数
            // 在生产环境中，需要从 app.getAppPath() 获取正确的资源路径
            const { app } = require('electron');
            const appResourcePath = app.getAppPath();
            const appMainPath = path.join(appResourcePath, 'modules', 'main', 'app-main.js');
            
            // 启动App进程 - 回到 spawn 但确保使用正确的 Electron 环境
            let appProcess;
            
            // 直接使用 spawn 运行 app-main.js，不创建临时脚本
            const electronPath = process.execPath;
            
            // 使用 Electron 直接运行 app-main.js，传递所有必要的参数
            const appArgs = [
                appMainPath,
                '--app-id=' + appId,
                '--app-name=' + (appJson.name || appId),
                '--wm-class=canbox-' + appId,
                '--app-path=' + appPath,
                '--is-dev-mode=' + devTag,
                '--canbox-main-pid=' + process.pid,
                '--app-window-config=' + encodeURIComponent(JSON.stringify(windowConfig)),
                '--app-json=' + encodeURIComponent(JSON.stringify(appJson)),
                '--no-sandbox'
            ];

            if (devTag) {
                appArgs.push('--dev-mode');
            }

            logger.info('App {} appArgs: {}', appId, appArgs);

            // 最简单的解决方案：创建一个包含 app-main.js 内容的临时文件
            // 最简单的解决方案：创建一个包含 app-main.js 内容的临时文件
            
            // 需要复制整个 modules/main 目录到临时目录，以解决相对路径依赖问题
            // const fs = require('fs');
            const os = require('os');
            const tempDir = os.tmpdir();
            const tempAppDir = path.join(tempDir, `canbox-app-${appId}-${Date.now()}`);
            
            // 创建临时目录
            fs.mkdirSync(tempAppDir, { recursive: true });
            
            // 复制整个 modules/main 目录到临时目录
            const modulesMainDir = path.join(path.dirname(appMainPath), '..');
            const tempModulesDir = path.join(tempAppDir, 'modules');
            
            function copyDir(src, dest) {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }
                
                const entries = fs.readdirSync(src, { withFileTypes: true });
                
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    
                    if (entry.isDirectory()) {
                        copyDir(srcPath, destPath);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                    }
                }
            }
            
            copyDir(modulesMainDir, tempModulesDir);
            
            // 修复临时目录中所有文件的模块路径
            function fixModulePaths(dir) {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const originalPath = path.dirname(appMainPath); // modules/main
                const modulesPath = path.dirname(originalPath); // modules
                const projectRoot = path.dirname(modulesPath); // project root
                const nodeModulesPath = path.join(projectRoot, 'node_modules');
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        fixModulePaths(fullPath);
                    } else if (entry.name.endsWith('.js')) {
                        try {
                            let content = fs.readFileSync(fullPath, 'utf8');
                            
                            // 只修复真正的第三方模块路径，不包括 Node.js 内置模块
                            const modulePatterns = [
                                'log4js',
                                'electron-store',
                                'axios',
                                'fs-extra',
                                'uuid',
                                'nanoid-cjs',
                                'marked',
                                'rimraf',
                                'glob',
                                'node-cron',
                                'pouchdb'
                            ];
                            
                            // Node.js 内置模块，不需要替换
                            const nodeBuiltInModules = [
                                'path',
                                'fs',
                                'os',
                                'crypto',
                                'util',
                                'events',
                                'stream',
                                'buffer',
                                'child_process',
                                'http',
                                'https',
                                'url',
                                'querystring',
                                'net',
                                'dns',
                                'dgram',
                                'cluster',
                                'worker_threads',
                                'process',
                                'console',
                                'timers',
                                'module',
                                'vm',
                                'repl',
                                'assert',
                                'readline',
                                'string_decoder',
                                'zlib',
                                'tls'
                            ];
                            
                            let modified = false;
                            for (const module of modulePatterns) {
                                // 匹配 require('module') 格式，但不匹配相对路径
                                const regex = new RegExp(`require\\(\\'${module}\\'\\)`, 'g');
                                if (regex.test(content)) {
                                    const absolutePath = path.join(nodeModulesPath, module);
                                    content = content.replace(regex, `require('${absolutePath}')`);
                                    modified = true;
                                }
                            }
                            
                            if (modified) {
                                fs.writeFileSync(fullPath, content);
                                logger.info(`Fixed module paths in ${fullPath}`);
                            }
                        } catch (error) {
                            logger.error(`Failed to fix module paths in ${fullPath}: ${error.message}`);
                        }
                    }
                }
            }
            
            fixModulePaths(tempModulesDir);
            
            // 临时主文件的路径
            const tempMainPath = path.join(tempModulesDir, 'main', 'app-main.js');
            
            // 使用 Electron 运行临时文件
            const finalArgs = [tempMainPath, ...appArgs.slice(1)]; // 跳过第一个参数（原来的 appMainPath）
            
            appProcess = spawn(process.execPath, finalArgs, {
                env: {
                    ...process.env,
                    APP_ID: appId,
                    APP_NAME: appJson.name || appId,
                    ELECTRON_WM_CLASS: `canbox-${appId}`,
                    APP_PATH: appPath,
                    IS_DEV_MODE: devTag.toString(),
                    CANBOX_MAIN_PID: process.pid.toString(),
                    APP_WINDOW_CONFIG: JSON.stringify(windowConfig),
                    APP_JSON: JSON.stringify(appJson),
                    // 在生产环境中，需要明确设置 NODE_PATH 以便子进程能找到 node_modules
                    NODE_PATH: (() => {
                        const appResourcePath = app.getAppPath();
                        const parentDir = path.dirname(appResourcePath);
                        const currentDir = process.cwd();
                        const nodePath = `${parentDir}/node_modules:${appResourcePath}/node_modules:${currentDir}/node_modules:${process.env.NODE_PATH || ''}`;
                        logger.info(`Setting NODE_PATH for app ${appId}: ${nodePath}`);
                        logger.info(`App resource path: ${appResourcePath}`);
                        logger.info(`Current working directory: ${currentDir}`);
                        return nodePath;
                    })()
                },
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });
            
            // 清理临时目录
            appProcess.on('close', () => {
                try {
                    const rimraf = require('rimraf');
                    rimraf.sync(tempAppDir);
                    logger.info(`Cleaned up temporary app directory: ${tempAppDir}`);
                } catch (error) {
                    logger.error(`Failed to clean up temporary app directory: ${error.message}`);
                }
            });
    

            // 处理进程输出
            appProcess.stdout?.on('data', (data) => {
                logger.info(`App ${appId} stdout: ${data.toString().trim()}`);
            });

            appProcess.stderr?.on('data', (data) => {
                logger.error(`App ${appId} stderr: ${data.toString().trim()}`);
            });

            // 处理进程退出
            appProcess.on('close', (code, signal) => {
                logger.info(`App ${appId} process closed with code ${code}, signal ${signal}`);
                this.appProcesses.delete(appId);
            });

            appProcess.on('error', (error) => {
                logger.error(`App ${appId} process error: ${error.message}`);
                this.appProcesses.delete(appId);
            });

            // 存储进程引用
            this.appProcesses.set(appId, appProcess);

            logger.info(`App ${appId} started successfully with PID: ${appProcess.pid}`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to start app ${appId}:`, error);
            return { success: false, msg: error.message };
        }
    }

    /**
     * 停止App进程
     * @param {string} appId - App ID
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async stopAppProcess(appId) {
        try {
            if (!this.appProcesses.has(appId)) {
                return { success: false, msg: 'App process not found' };
            }

            const appProcess = this.appProcesses.get(appId);

            // 尝试优雅关闭
            appProcess.kill('SIGTERM');

            // 等待一段时间后强制关闭
            setTimeout(() => {
                if (!appProcess.killed) {
                    appProcess.kill('SIGKILL');
                }
            }, 5000);

            this.appProcesses.delete(appId);
            logger.info(`App ${appId} stopped`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to stop app ${appId}:`, error);
            return { success: false, msg: error.message };
        }
    }

    /**
     * 检查App是否正在运行
     * @param {string} appId - App ID
     * @returns {boolean}
     */
    isAppRunning(appId) {
        const process = this.appProcesses.get(appId);
        return process && !process.killed;
    }

    /**
     * 获取所有运行中的App
     * @returns {string[]}
     */
    getRunningApps() {
        return Array.from(this.appProcesses.keys()).filter(id => this.isAppRunning(id));
    }

    /**
     * 停止所有App进程
     */
    async stopAllApps() {
        const runningApps = this.getRunningApps();
        const stopPromises = runningApps.map(id => this.stopAppProcess(id));
        await Promise.allSettled(stopPromises);
        logger.info('All app processes stopped');
    }

    /**
     * 重启App进程
     * @param {string} appId - App ID
     * @param {boolean} devTag - 是否为开发模式
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async restartAppProcess(appId, devTag = false) {
        await this.stopAppProcess(appId);
        // 等待一段时间确保进程完全退出
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.startAppProcess(appId, devTag);
    }
}

// 创建单例实例
const appProcessManager = new AppProcessManager();

module.exports = appProcessManager;