const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('@modules/utils/logger');
const { getAppPath } = require('@modules/main/pathManager');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');

/**
 * App进程管理器
 * 用于启动和管理独立的App进程
 */
class AppProcessManager {
    constructor() {
        this.processMap = new Map(); // 存储App进程 {appId: childProcess}
    }

    /**
     * 启动App进程
     * @param {string} uid - App ID
     * @param {boolean} devTag app开发tag，true：当前是开发app
     * @returns {boolean} - 是否成功
     */
    startApp(uid, devTag) {
        try {
            // 验证必要参数
            if (!uid) {
                logger.error('uid is required');
                return false;
            }

            // 检查App是否已运行
            if (this.isAppRunning(uid)) {
                logger.info(`App ${uid} is already running`);
                return true;
            }

            // 获取应用信息
            const appItem = devTag
                ? getAppsDevStore().get('default')[uid]
                : getAppsStore().get('default')[uid];
                
            if (!appItem) {
                logger.error(`App ${uid} not found`);
                return false;
            }

            // 加载应用配置
            const appPath = devTag ? appItem.path : path.join(getAppPath(), uid + '.asar');
            const appJson = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf8'));

            // 加载开发配置
            const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
                ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
                : null;

            // 确定主入口文件
            const appMain = devTag && uatDevJson?.main ? uatDevJson.main : appJson.main;
            
            // 构建启动参数 - 确保包含WM_CLASS相关参数
            const args = [
                '--no-sandbox',
                '--disable-setuid-sandbox', 
                '--disable-gpu-sandbox',
                '--app-id=' + uid,
                '--app-path=' + appPath,
                '--app-main=' + appMain,
                // 强制设置WM_CLASS相关的X11属性
                '--enable-features=UseOzonePlatform',
                '--ozone-platform-hint=auto'
            ];

            // 开发模式添加额外参数
            if (devTag) {
                args.push('--dev-mode');
                if (uatDevJson?.devTools) {
                    args.push('--dev-tools=' + uatDevJson.devTools);
                }
            }

            // 在生产模式下，使用环境变量强制指定入口文件
            const isProduction = require('electron').app.isPackaged;
            const appMainPath = path.join(__dirname, 'app-main.js');
            
            let envVars = {
                ...process.env,
                CANBOX_APP_ID: uid,
                CANBOX_APP_PATH: appPath,
                CANBOX_DEV_MODE: devTag ? 'true' : 'false',
                CANBOX_ROOT_PATH: path.resolve(__dirname, '../..'),
                CANBOX_MODULES_PATH: path.resolve(__dirname, '..'),
                // 明确传递主进程标识，防止子进程被错误识别
                CANBOX_MAIN_PROCESS: 'false',
                // 添加更多调试信息
                CANBOX_DEBUG_MODE: 'true'
            };
            
            // 清理旧的CANBOX_MAIN_PROCESS环境变量，确保不冲突
            delete envVars.CANBOX_MAIN_PROCESS;
            envVars.CANBOX_MAIN_PROCESS = 'false';
            
            // 使用不同的方法启动Electron进程
            let appProcess;
            
            if (isProduction) {
                // 生产模式：使用修改后的main.js，通过环境变量控制流程
                logger.info('[{}] Production mode - using main.js with app process detection', uid);
                
                // 不设置CANBOX_MAIN_PROCESS环境变量，让检测逻辑正确工作
                
                // 在打包环境中，使用app.getPath获取正确的可执行文件路径
                const electronPath = isProduction ? 
                    require('electron').app.getPath('exe') :
                    process.execPath;
                const spawnArgs = [
                    // 生产模式下强制添加WM_CLASS相关参数
                    ...args,
                    // 确保X11窗口属性设置
                    '--class=' + uid,
                    '--enable-features=UseOzonePlatform',
                    '--ozone-platform-hint=x11',
                    // 强制设置X11窗口属性
                    '--wm-class=' + uid,
                    '--x11-wm-class=' + uid,
                    // 添加额外的X11识别属性
                    '--app-name=' + uid,
                    // 强制设置X11窗口组
                    '--x11-wm-group=' + uid
                ];
                
                // 生产模式下强制设置X11相关环境变量
                envVars.GTK_APPLICATION_ID = uid;
                envVars.XDG_CURRENT_DESKTOP = 'GNOME';
                envVars.GDK_BACKEND = 'x11';
                // 添加更多X11特定设置
                envVars.XDG_SESSION_TYPE = 'x11';
                envVars.DISPLAY = process.env.DISPLAY || ':0';
                envVars.XAUTHORITY = process.env.XAUTHORITY || path.join(process.env.HOME, '.Xauthority');
                // 强制设置窗口管理器识别属性
                envVars._NET_WM_PID = process.pid;
                envVars._NET_WM_NAME = uid;
                
                // 生产模式下强制设置X11相关环境变量
                envVars.GTK_APPLICATION_ID = uid;
                envVars.XDG_CURRENT_DESKTOP = 'GNOME';
                envVars.GDK_BACKEND = 'x11';
                // 添加更多X11特定设置
                envVars.XDG_SESSION_TYPE = 'x11';
                envVars.DISPLAY = process.env.DISPLAY || ':0';
                envVars.XAUTHORITY = process.env.XAUTHORITY || path.join(process.env.HOME, '.Xauthority');
                
                // 生产模式下强制设置X11相关环境变量
                envVars.GTK_APPLICATION_ID = uid;
                envVars.XDG_CURRENT_DESKTOP = 'GNOME';
                envVars.GDK_BACKEND = 'x11';
                
                logger.info('[{}] Electron execPath: {}', uid, electronPath);
                logger.info('[{}] Spawn args: {}', uid, JSON.stringify(spawnArgs));
                
                appProcess = spawn(electronPath, spawnArgs, {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                    env: envVars
                });
                
            } else {
                // 开发模式：直接启动
                logger.info('[{}] Development mode - direct spawn', uid);
                
                // 开发模式下去除重复的基本参数
                const devArgs = args.filter(arg => 
                    !arg.includes('--no-sandbox') && 
                    !arg.includes('--disable-setuid-sandbox') && 
                    !arg.includes('--disable-gpu-sandbox')
                );
                
                appProcess = spawn(process.execPath, [
                    appMainPath,
                    // 保留必要的核心参数
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu-sandbox',
                    ...devArgs
                ], {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false,
                    env: envVars
                });
            }

            // 处理进程输出
            appProcess.stdout?.on('data', (data) => {
                logger.info('[{}] {}', uid, data.toString().trim());
            });

            appProcess.stderr?.on('data', (data) => {
                logger.error('[{}] {}', uid, data.toString().trim());
            });

            // 处理进程退出
            appProcess.on('exit', (code, signal) => {
                logger.info('App {} exited whith code {}, signal {}', uid, code, signal);
                this.processMap.delete(uid);
            });

            appProcess.on('error', (error) => {
                logger.error('Failed to start app {}: {}', uid, error);
                this.processMap.delete(uid);
            });

            // 存储进程引用
            this.processMap.set(uid, appProcess);
            logger.info('App {} started successfully', uid);

            return true;

        } catch (error) {
            logger.error('Failed to start app {}: {}', uid, error);
            return false;
        }
    }

    /**
     * 停止App进程
     * @param {string} appId - App ID
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async stopApp(appId) {
        try {
            if (!this.processMap.has(appId)) {
                return { success: false, msg: 'App process not found' };
            }

            const appProcess = this.processMap.get(appId);

            // 尝试优雅关闭
            appProcess.kill('SIGTERM');

            // 等待一段时间后强制关闭
            setTimeout(() => {
                if (!appProcess.killed) {
                    appProcess.kill('SIGKILL');
                }
            }, 5000);

            this.processMap.delete(appId);
            logger.info('App {} stopped', appId);
            return { success: true };

        } catch (error) {
            logger.error('Failed to stop app {}: {}', appId, error);
            return { success: false, msg: error.message };
        }
    }

    /**
     * 检查App是否正在运行
     * @param {string} uid - App ID
     * @returns {boolean}
     */
    isAppRunning(uid) {
        const process = this.processMap.get(uid);
        return process && !process.killed;
    }

    /**
     * 聚焦App
     * @param {string} uid App ID
     */
    focusApp(uid) {
        const process = this.processMap.get(uid);
        if (!process || process.killed) {
            this.processMap.delete(uid);
            return;
        }
        process.focus();
    }

    /**
     * 获取所有运行中的App
     * @returns {string[]}
     */
    getRunningApps() {
        return Array.from(this.processMap.keys()).filter(id => this.isAppRunning(id));
    }

    /**
     * 停止所有App进程
     */
    async stopAllApps() {
        const runningApps = this.getRunningApps();
        const stopPromises = runningApps.map(id => this.stopApp(id));
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
        await this.stopApp(appId);
        // 等待一段时间确保进程完全退出
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.startApp(appId, devTag);
    }
}

// 创建单例实例
const appProcessManager = new AppProcessManager();

module.exports = appProcessManager;