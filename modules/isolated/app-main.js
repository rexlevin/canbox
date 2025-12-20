const { BrowserWindow, session, app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const logger = require('@modules/utils/logger');
const winState = require('@modules/main/winState');

// 解析命令行参数
const args = process.argv.slice(2);
const parsedArgs = {};

args.forEach(arg => {
    if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        parsedArgs[key] = value || true;
    }
});

const appId = parsedArgs['app-id'] || process.env.CANBOX_APP_ID;
const appPath = parsedArgs['app-path'] || process.env.CANBOX_APP_PATH;
const appMain = parsedArgs['app-main'];
const devMode = parsedArgs['dev-mode'] || process.env.CANBOX_DEV_MODE === 'true';
const devTools = parsedArgs['dev-tools'];

if (!appId || !appPath || !appMain) {
    console.error('Missing required arguments: app-id, app-path, app-main');
    process.exit(1);
}

/**
 * 创建独立进程的应用窗口
 */
function createAppWindow() {
    try {
        // 加载应用配置
        const appJsonPath = path.join(appPath, 'app.json');
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

        // 加载开发配置
        const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
            ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
            : null;
        
        // 创建会话
        const sess = session.fromPartition(appId);
        sess.registerPreloadScript({
            type: 'frame',
            filePath: path.join(__dirname, '../app.api.js')
        });
        
        // 默认窗口选项
        let options = {
            minWidth: 0,
            minHeight: 0,
            width: 800,
            height: 600,
            resizable: true,
            webPreferences: {},
            show: false
        };

        // 合并应用自定义窗口选项
        if (appJson.window) {
            Object.assign(options, JSON.parse(JSON.stringify(appJson.window)));
            
            // 设置图标路径
            if (options.icon) {
                options.icon = path.resolve(appPath, options.icon);
            } else {
                options.icon = path.resolve(appPath, appJson.logo);
            }
            
            // 设置 Web 偏好选项
            options.webPreferences = {
                sandbox: false,
                noSandbox: true,
                spellcheck: false,
                webSecurity: false,
                nodeIntegration: false,
                nodeIntegrationInSubFrames: true,
                contextIsolation: true,
                session: sess,
                additionalArguments: [`--app-id=${appId}`],
            };
        }

        // 处理 preload 路径
        if (appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appPath, appJson.window.webPreferences.preload);
        }

        // Linux 系统特殊处理
        if (os.platform() === 'linux') {
            options.windowClass = appId;
        }
        
        // 恢复窗口状态
        const state = winState.loadSync(appId);
        if (!state || state.restore !== 0) {
            if (state?.position) {
                options.x = state.position.x;
                options.y = state.position.y;
                options.width = state.position.width;
                options.height = state.position.height;
            }
        }
        
        logger.info(`[${appId}] Creating window with options: %o`, options);
        
        // 创建窗口
        const appWin = new BrowserWindow(options);
        
        // 最大化处理
        if (state?.isMax) {
            appWin.maximize();
        }
        
        // 确定加载URL
        const mainFile = devMode && uatDevJson?.main ? uatDevJson.main : appMain;
        const loadUrl = mainFile.startsWith('http')
            ? mainFile
            : `file://${path.resolve(appPath, mainFile)}`;
            
        logger.info(`[${appId}] Loading URL: ${loadUrl}`);
        
        // 加载应用内容
        appWin.loadURL(loadUrl).catch(err => {
            logger.error(`[${appId}] Failed to load URL:`, err);
        });
        
        // 设置窗口事件
        appWin.on('close', () => {
            // 通知渲染进程
            if (appWin.webContents) {
                appWin.webContents.send('window-close-callback');
            }
            
            // 保存窗口状态
            const bounds = appWin.getContentBounds();
            const isMax = appWin.isMaximized();
            winState.save(appId, {
                restore: 1,
                isMax,
                position: isMax ? null : bounds
            }, () => {});
            
            logger.info(`[${appId}] Window closing`);
        });
        
        // 准备显示事件
        appWin.on('ready-to-show', () => {
            appWin.show();
            if (devMode && devTools) {
                appWin.webContents.openDevTools({ mode: devTools });
            }
        });
        
        // 设置菜单和应用详情
        appWin.setMenu(null);
        if (process.platform === 'win') {
            appWin.setAppDetails({ appId: appId });
        }

        return appWin;

    } catch (error) {
        logger.error(`[${appId}] Failed to create window:`, error);
        process.exit(1);
    }
}

// 禁用沙盒相关设置
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// 应用就绪后创建窗口
app.whenReady().then(() => {
    createAppWindow();
    
    // 当所有窗口关闭时退出应用
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createAppWindow();
        }
    });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error(`[${appId}] Uncaught exception:`, error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[${appId}] Unhandled rejection at:`, promise, 'reason:', reason);
});