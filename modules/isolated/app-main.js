const { BrowserWindow, session, app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 简化的日志系统，避免 electron app 依赖问题
const logger = {
    info: (message, ...args) => {
        let formatted = message;
        args.forEach(arg => {
            formatted = formatted.replace(/{}/, arg);
        });
        console.info(`[${path.basename(__filename)}] [INFO] ${formatted}`);
    },
    error: (message, ...args) => {
        let formatted = message;
        args.forEach(arg => {
            formatted = formatted.replace(/{}/, arg);
        });
        console.error(`[${path.basename(__filename)}] [ERROR] ${formatted}`);
    },
    warn: (message, ...args) => {
        let formatted = message;
        args.forEach(arg => {
            formatted = formatted.replace(/{}/, arg);
        });
        console.warn(`[${path.basename(__filename)}] [WARN] ${formatted}`);
    },
    debug: (message, ...args) => {
        let formatted = message;
        args.forEach(arg => {
            formatted = formatted.replace(/{}/, arg);
        });
        console.debug(`[${path.basename(__filename)}] [DEBUG] ${formatted}`);
    }
};

// 使用绝对路径加载模块
const modulesPath = process.env.CANBOX_MODULES_PATH || path.resolve(__dirname, '..');
logger.info('modulesPath: {}', modulesPath);
// 简化的窗口状态管理，避免模块别名问题
const winState = {
    save: (appId, state, callback) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const { app } = require('electron');
            
            const dataDir = path.join(app.getPath('userData'), 'Users', 'data');
            const stateFile = path.join(dataDir, 'winState.json');
            
            // 确保目录存在
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            // 读取现有状态
            let allStates = {};
            if (fs.existsSync(stateFile)) {
                allStates = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            }
            
            // 更新状态
            allStates[appId] = state;
            
            // 保存状态
            fs.writeFileSync(stateFile, JSON.stringify(allStates, null, 2));
            
            if (callback) callback({ success: true, data: null, msg: '保存成功' });
        } catch (error) {
            logger.error(`Failed to save window state for ${appId}:`, error);
            if (callback) callback({ success: false, data: null, msg: error.message });
        }
    },
    
    loadSync: (appId) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const { app } = require('electron');
            
            const stateFile = path.join(app.getPath('userData'), 'Users', 'data', 'winState.json');
            
            if (!fs.existsSync(stateFile)) {
                return null;
            }
            
            const allStates = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            return allStates[appId] || null;
        } catch (error) {
            logger.error(`Failed to load window state for ${appId}:`, error);
            return null;
        }
    }
};

const getWinState = () => winState;

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
            
        logger.info('[{}] Loading URL: {}', appId, loadUrl);
        
        // 加载应用内容
        appWin.loadURL(loadUrl).catch(err => {
            logger.error('[{}] Failed to load URL: {}', appId, err);
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
            
            logger.info('[{}] Window closing', appId);
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
        logger.error('[{}] Failed to create window: {}', appId, error);
        process.exit(1);
    }
}

// 禁用沙盒相关设置
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// 初始化简化的数据库处理逻辑
function initDbIpcHandlers() {
    ipcMain.on('msg-db', (event, args) => {
        logger.info('[{}] Received db request: type={}, appId={}', appId, args.type, args.appId);
        
        // 简化的数据库响应，实际项目中需要实现真实的数据库操作
        let result;
        try {
            switch (args.type) {
                case 'get':
                case 'put':
                case 'remove':
                case 'bulkDocs':
                    // 返回模拟数据或错误信息
                    result = { success: false, msg: `Database operation ${args.type} not implemented in isolated process` };
                    break;
                default:
                    result = { success: false, msg: `Unknown database operation: ${args.type}` };
            }
        } catch (error) {
            result = { success: false, msg: error.message };
        }
        
        event.returnValue = JSON.stringify(result);
    });
}

// 初始化其他 IPC 消息处理逻辑
function initOtherIpcHandlers() {
    // 处理对话框消息
    ipcMain.on('msg-dialog', (event, args) => {
        logger.info('[{}] Received dialog request: type={}', appId, args.type);
        event.returnValue = JSON.stringify({ 
            success: false, 
            msg: `Dialog operation ${args.type} not implemented in isolated process` 
        });
    });
    
    // 处理窗口创建消息
    ipcMain.on('msg-createWindow', (event, args) => {
        logger.info('[{}] Received createWindow request', appId);
        event.returnValue = JSON.stringify({ 
            success: false, 
            msg: `Create window not implemented in isolated process` 
        });
    });
    
    // 处理通知消息
    ipcMain.on('msg-notification', (event, args) => {
        logger.info('[{}] Received notification request: title={}', appId, args.options?.title);
        // 通知是异步的，不需要返回值
    });
    
    // 处理 electronStore 消息
    ipcMain.on('msg-electronStore', (event, args) => {
        logger.info('[{}] Received electronStore request: type={}, name={}', appId, args.type, args.param?.name);
        event.returnValue = JSON.stringify({ 
            success: false, 
            msg: `ElectronStore operation ${args.type} not implemented in isolated process` 
        });
    });
}

// 应用就绪后创建窗口
app.whenReady().then(() => {
    // 初始化 IPC 处理器
    initDbIpcHandlers();
    initOtherIpcHandlers();
    
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