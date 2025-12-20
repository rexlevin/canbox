const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require(path.join(__dirname, 'utils/logger'));
const initApiIpcHandlers = require(path.join(__dirname, 'api'));

// 从环境变量中获取App信息
const appId = process.env.APP_ID || process.argv.find(arg => arg.startsWith('--app-id='))?.split('=')[1];
const appName = process.env.APP_NAME || process.argv.find(arg => arg.startsWith('--app-name='))?.split('=')[1];
const wmClass = process.env.ELECTRON_WM_CLASS || process.argv.find(arg => arg.startsWith('--wm-class='))?.split('=')[1];
const appPath = process.env.APP_PATH;
const isDevMode = process.env.IS_DEV_MODE === 'true' || process.argv.includes('--dev-mode');

// 从环境变量中获取窗口配置和app.json
let windowConfig = {};
let appJson = {};
try {
    if (process.env.APP_WINDOW_CONFIG) {
        windowConfig = JSON.parse(process.env.APP_WINDOW_CONFIG);
    }
    if (process.env.APP_JSON) {
        appJson = JSON.parse(process.env.APP_JSON);
    }
} catch (error) {
    logger.error('Failed to parse app config from environment:', error);
}

// 检查是否通过 --app-main-path 参数被调用
const appMainPathArg = process.argv.find(arg => arg.startsWith('--app-main-path='));
if (appMainPathArg) {
    console.log('app-main.js called via --app-main-path, but this should not happen in Electron');
    process.exit(0);
}



if (!appId || !appPath) {
    console.error('App ID or path not specified');
    process.exit(1);
}

// 设置 WM_CLASS - 使用 canbox-{appId} 格式
const finalWmClass = `canbox-${appId}`;
app.commandLine.appendSwitch('class', finalWmClass);
logger.info(`Set WM_CLASS to: ${finalWmClass}`);

// 添加 --no-sandbox 参数（如果还没有）
if (!process.argv.includes('--no-sandbox')) {
    app.commandLine.appendSwitch('no-sandbox');
    logger.info('Added --no-sandbox flag');
}

// 禁用硬件加速
app.disableHardwareAcceleration();

// 清除安全警告
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// 操作系统类型
const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

let appWin = null;

// 如果环境变量中没有 app.json，尝试从文件读取
if (!appJson || Object.keys(appJson).length === 0) {
    try {
        const appJsonPath = path.join(appPath, 'app.json');
        appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    } catch (error) {
        logger.error(`Failed to read app.json for app ${appId}:`, error);
        process.exit(1);
    }
}

// 设置应用名称为 canbox-{appId}
app.setName(`canbox-${appId}`);

// 创建App窗口
function createAppWindow() {
    // 使用App ID创建唯一的session
    const sess = session.fromPartition(`app-${appId}`);

    // 注册预加载脚本
    sess.registerPreloadScript({
        type: 'frame',
        filePath: path.join(__dirname, 'app.api.js')
    });

    // 基础窗口选项
    let options = {
        minWidth: 0,
        minHeight: 0,
        width: 800,
        height: 600,
        resizable: true,
        show: false,
        icon: path.resolve(appPath, appJson.logo),
        webPreferences: {
            sandbox: false,
            spellcheck: false,
            webSecurity: false,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: true,
            contextIsolation: true,
            session: sess,
            additionalArguments: [`--app-id=${appId}`, `--is-app=true`],
        }
    };

    // 合并App自定义窗口选项
    const windowOptions = windowConfig && Object.keys(windowConfig).length > 0 ? windowConfig : appJson.window;
    
    if (windowOptions) {
        // 深度合并 webPreferences，确保不会覆盖基础配置
        if (windowOptions.webPreferences) {
            options.webPreferences = { 
                ...options.webPreferences, 
                ...windowOptions.webPreferences 
            };
        }
        
        // 合并其他窗口配置
        Object.keys(windowOptions).forEach(key => {
            if (key !== 'webPreferences') {
                options[key] = windowOptions[key];
            }
        });
        
        // 处理 preload 路径
        if (options.webPreferences.preload) {
            options.webPreferences.preload = path.resolve(appPath, options.webPreferences.preload);
        }
        
        logger.info(`Applied window config for app ${appId}:`, Object.keys(windowOptions));
    }

    // Linux 特殊处理
    if (os === 'linux') {
        // 使用唯一的 windowClass
        options.windowClass = finalWmClass;
    }

    // Windows 特殊处理
    if (os === 'win') {
        options.appUserModelId = `canbox.${appId}`;
    }

    logger.info('Creating app window with options: {}', JSON.stringify(options));

    appWin = new BrowserWindow(options);

    // 加载App页面
    const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
        ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
        : null;

    logger.info('isDevMode: {}', isDevMode);
    logger.info('[app-main.js] uatDevJson: {}', uatDevJson);
    const appMain = isDevMode && uatDevJson?.main ? uatDevJson.main : appJson.main;
    const loadUrl = appMain.startsWith('http')
        ? appMain
        : `file://${path.resolve(appPath, appMain)}`;

    logger.info(`Loading app URL: ${loadUrl}`);

    appWin.loadURL(loadUrl).catch(err => {
        logger.error(`Failed to load app URL: ${err.message}`);
    });

    appWin.setMenu(null);

    appWin.on('ready-to-show', () => {
        appWin.show();
        
        // 开发模式下打开开发者工具
        if (isDevMode && uatDevJson?.devTools) {
            appWin.webContents.openDevTools({ mode: uatDevJson.devTools });
        }
    });

    appWin.on('closed', () => {
        logger.info(`App ${appId} window closed`);
        appWin = null;
        app.quit();
    });

    return appWin;
}

// 应用就绪时创建窗口
app.whenReady().then(() => {
    // 初始化 API 相关的 IPC handlers
    initApiIpcHandlers();
    logger.info('API IPC handlers initialized in app process');

    createAppWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createAppWindow();
        }
    });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 应用退出前清理
app.on('before-quit', () => {
    logger.info(`App ${appId} is quitting`);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception in app ${appId}:`, error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection in app ${appId}:`, reason);
});