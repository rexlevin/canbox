const { BrowserWindow, session, app, ipcMain } = require('electron');

// 调试信息
console.log('环境变量检查:');
console.log('CANBOX_MAIN_PROCESS:', process.env.CANBOX_MAIN_PROCESS);
console.log('CANBOX_APP_ID:', process.env.CANBOX_APP_ID);
console.log('process.argv:', process.argv);
console.log('process.execPath:', process.execPath);
console.log('process.pid:', process.pid);
console.log('process.ppid:', process.ppid);
const path = require('path');
const fs = require('fs');
const os = require('os');

// 立即输出调试信息，确认app-main.js被加载
console.log('=== [app-main.js] LOADED ===');
console.log('Working directory:', process.cwd());
console.log('Script filename:', __filename);
console.log('Arguments:', process.argv);

// 添加module-alias支持 - 处理生产模式路径
const moduleAlias = require('module-alias');
const isProduction = require('electron').app.isPackaged;

let modulesPath, rootPath;
if (isProduction) {
    // 生产模式下使用环境变量提供的路径
    modulesPath = process.env.CANBOX_MODULES_PATH || path.join(process.resourcesPath, 'app.asar/modules');
    rootPath = process.env.CANBOX_ROOT_PATH || path.join(process.resourcesPath, 'app.asar');
} else {
    // 开发模式使用原始路径
    modulesPath = path.join(__dirname, '..');
    rootPath = path.resolve(__dirname, '../..');
}

console.log('Modules path:', modulesPath);
console.log('Root path:', rootPath);

// 在生产模式下，ASAR内的路径无法直接访问，跳过检查
if (!isProduction) {
    try {
        fs.accessSync(modulesPath);
        fs.accessSync(rootPath);
    } catch (error) {
        console.error('路径访问失败:', error);
        process.exit(1);
    }
} else {
    console.log('生产模式跳过路径检查，使用ASAR内嵌路径');
}

moduleAlias.addAliases({
    '@': path.join(rootPath, 'src'),
    '@modules': modulesPath
});
moduleAlias();

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
// const modulesPath = process.env.CANBOX_MODULES_PATH || path.resolve(__dirname, '..');
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
            logger.error('Failed to load window state for {}: {}', appId, error);
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

logger.info('[app-main.js] Starting app: appId={}, appPath={}, appMain={}', appId, appPath, appMain);

if (!appId || !appPath || !appMain) {
    console.error('Missing required arguments: app-id, app-path, app-main');
    process.exit(1);
}

// 子进程不需要单例检查，让每个App独立运行
// 只有主进程才需要单例锁定

/**
 * 创建独立进程的应用窗口
 */
function createAppWindow() {
    try {
        // 加载应用配置 - 处理生产模式下的ASAR路径
        let appJsonPath;
        let appJson;
        
        try {
            appJsonPath = isProduction 
                ? path.join(appPath.replace('.asar.unpacked', '.asar'), 'app.json')
                : path.join(appPath, 'app.json');
            
            // 直接读取配置文件，ASAR内的文件无法用accessSync检查
            appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        } catch (error) {
            // 尝试其他可能的路径
            try {
                appJsonPath = path.join(appPath, 'app.json');
                appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            } catch (secondError) {
                logger.error('[{}] 无法读取应用配置文件: {} - {}', appId, appJsonPath, error.message);
                process.exit(1);
            }
        }

        // 加载开发配置
        const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
            ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
            : null;

        // 创建会话 - 模拟Chrome PWA的独立配置
        const sess = session.fromPartition(`persist:${appId}`);
        
        // 设置Chrome-like的用户代理和配置
        sess.setUserAgent(`${session.defaultSession.getUserAgent()} CanboxApp/${appId}`);
        
        // 注册预加载脚本
        sess.registerPreloadScript({
            type: 'frame',
            filePath: path.join(__dirname, '../app.api.js')
        });
        
        // 模拟PWA的缓存策略
        sess.setPermissionRequestHandler((webContents, permission, callback) => {
            // 允许常见的PWA权限
            const allowedPermissions = ['notifications', 'geolocation', 'microphone', 'camera'];
            callback(allowedPermissions.includes(permission));
        });

        // 设置Chrome-like的缓存和存储设置
        // 注意：Electron的session没有setCacheDirectory方法
        // 使用webPreferences中的cache配置
        logger.info('[{}] Using persist session for Chrome-like PWA behavior', appId);

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
                additionalArguments: [`--app-id=${appId}`,
                     `--class=${appId}`, `--wm-class=${appId}`, `--wm_class=${appId}`
                ],
                enablePreferredSizeMode: false
            };
        }

        // 处理 preload 路径
        if (appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appPath, appJson.window.webPreferences.preload);
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

        logger.info('[{}] Creating window with options: {}', appId, JSON.stringify(options, null, 2));

        // 创建窗口
        const appWin = new BrowserWindow(options);

        // 最大化处理
        if (state?.isMax) {
            appWin.maximize();
        }

        // 确定加载URL - 处理生产模式下的ASAR路径
        const mainFile = devMode && uatDevJson?.main ? uatDevJson.main : appMain;
        let loadUrl;
        
        if (mainFile.startsWith('http')) {
            loadUrl = mainFile;
        } else {
            if (isProduction) {
                // 生产模式下使用file://协议，Electron会自动正确处理ASAR包内文件
                const asarPath = appPath.replace('.asar.unpacked', '.asar');
                const filePath = path.join(asarPath, mainFile);
                loadUrl = `file://${filePath}`;
                
                // 在生产模式下，我们信任ASAR包内文件存在，不需要accessSync检查
                logger.debug('[{}] Production mode file path: {}', appId, filePath);
            } else {
                // 开发模式下使用文件路径
                const filePath = path.resolve(appPath, mainFile);
                loadUrl = `file://${filePath}`;
                
                try {
                    fs.accessSync(filePath);
                } catch (error) {
                    logger.error('[{}] 应用入口文件不存在: {}', appId, filePath);
                    process.exit(1);
                }
            }
        }

        logger.info('[{}] Loading URL: {}', appId, loadUrl);

        // 加载应用内容
        appWin.loadURL(loadUrl).catch(err => {
            logger.error('[{}] Failed to load URL: {}', appId, err);
            process.exit(1);
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

// 初始化数据库处理逻辑
function initDbIpcHandlers() {
    // 动态导入数据库依赖
    try {
        const PouchDB = require('pouchdb');
        const { customAlphabet } = require('nanoid-cjs');
        const DateFormat = require('../utils/DateFormat');

        const nanoid = customAlphabet('1234567890abcdef', 10);

        // 数据库连接缓存
        const dbCache = {};

        // 获取或创建数据库连接
        function getDB(appId) {
            if (!dbCache[appId]) {
                const dbDir = path.join(app.getPath('userData'), 'Users', 'data', appId);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }
                dbCache[appId] = new PouchDB(path.join(dbDir, 'db'), { auto_compaction: true });
            }
            return dbCache[appId];
        }

        // 生成文档 ID 和时间戳
        function prepareDoc(doc) {
            doc._id = doc._id || nanoid();
            const now = new Date();
            if (doc._rev) {
                doc.updateTime = doc.updateTime || now.toISOString();
            } else {
                doc.createTime = doc.createTime || now.toISOString();
            }
            return doc;
        }

        ipcMain.on('msg-db', (event, args) => {
            logger.info('[{}] Received db request: type={}, appId={}', appId, args.type, args.appId);

            const db = getDB(args.appId);

            try {
                switch (args.type) {
                    case 'put':
                        const doc = prepareDoc(args.param);
                        db.put(doc)
                            .then(res => {
                                event.returnValue = JSON.stringify({ success: true, data: res });
                            })
                            .catch(err => {
                                event.returnValue = JSON.stringify({ success: false, msg: err.message });
                            });
                        break;

                    case 'get':
                        db.get(args.param._id)
                            .then(res => {
                                event.returnValue = JSON.stringify({ success: true, data: res });
                            })
                            .catch(err => {
                                event.returnValue = JSON.stringify({ success: false, msg: err.message });
                            });
                        break;

                    case 'bulkDocs':
                        const preparedDocs = args.param.map(prepareDoc);
                        db.bulkDocs(preparedDocs)
                            .then(res => {
                                event.returnValue = JSON.stringify({ success: true, data: res });
                            })
                            .catch(err => {
                                event.returnValue = JSON.stringify({ success: false, msg: err.message });
                            });
                        break;

                    case 'remove':
                        db.remove(args.param)
                            .then(res => {
                                event.returnValue = JSON.stringify({ success: true, data: res });
                            })
                            .catch(err => {
                                event.returnValue = JSON.stringify({ success: false, msg: err.message });
                            });
                        break;

                    default:
                        event.returnValue = JSON.stringify({ success: false, msg: `Unknown database operation: ${args.type}` });
                }
            } catch (error) {
                logger.error('[{}] Database operation error: {}', appId, error);
                event.returnValue = JSON.stringify({ success: false, msg: error.message });
            }
        });

    } catch (error) {
        logger.error('[{}] Failed to initialize database: {}', appId, error);
        // 如果无法加载依赖，则提供错误处理
        ipcMain.on('msg-db', (event, args) => {
            logger.info('[{}] Received db request: type={}, appId={}', appId, args.type, args.appId);
            event.returnValue = JSON.stringify({
                success: false,
                msg: `Database not available: ${error.message}. Dependencies may be missing.`
            });
        });
    }
}

// 初始化其他 IPC 消息处理逻辑
function initOtherIpcHandlers() {
    const { dialog } = require('electron');

    // 处理对话框消息
    ipcMain.on('msg-dialog', (event, args) => {
        logger.info('[{}] Received dialog request: type={}', appId, args.type);

        try {
            let result;
            switch (args.type) {
                case 'openFile':
                    result = dialog.showOpenDialogSync(args.options);
                    event.returnValue = JSON.stringify({
                        success: true,
                        data: result || []
                    });
                    break;

                case 'saveFile':
                    result = dialog.showSaveDialogSync(args.options);
                    event.returnValue = JSON.stringify({
                        success: true,
                        data: result
                    });
                    break;

                case 'showMessageBox':
                    result = dialog.showMessageBoxSync(args.options);
                    event.returnValue = JSON.stringify({
                        success: true,
                        data: result
                    });
                    break;

                case 'showErrorBox':
                    dialog.showErrorBox(args.options.title, args.options.content);
                    event.returnValue = JSON.stringify({
                        success: true,
                        data: null
                    });
                    break;

                default:
                    event.returnValue = JSON.stringify({
                        success: false,
                        msg: `Unknown dialog operation: ${args.type}`
                    });
            }
        } catch (error) {
            logger.error('[{}] Dialog operation error: {}', appId, error);
            event.returnValue = JSON.stringify({
                success: false,
                msg: error.message
            });
        }
    });

    // 处理窗口创建消息 - 在独立进程中暂时不支持
    ipcMain.on('msg-createWindow', (event, args) => {
        logger.info('[{}] Received createWindow request', appId);
        event.returnValue = JSON.stringify({
            success: false,
            msg: `Create window not supported in isolated process`
        });
    });

    // 处理通知消息
    ipcMain.on('msg-notification', (event, args) => {
        logger.info('[{}] Received notification request: title={}', appId, args.options?.title);

        try {
            if (args.options) {
                const { Notification } = require('electron');
                if (Notification.isSupported()) {
                    new Notification(args.options).show();
                }
            }
        } catch (error) {
            logger.error('[{}] Notification error: {}', appId, error);
        }
        // 通知是异步的，不需要返回值
    });

    // 处理 electronStore 消息
    ipcMain.on('msg-electronStore', (event, args) => {
        logger.info('[{}] Received electronStore request: type={}, name={}', appId, args.type, args.param?.name);

        try {
            const path = require('path');
            const fs = require('fs');

            // 构建存储文件路径
            const storeDir = path.join(app.getPath('userData'), 'Users', 'data', args.appId);
            const storeFile = path.join(storeDir, `${args.param.name}.json`);

            // 确保目录存在
            if (!fs.existsSync(storeDir)) {
                fs.mkdirSync(storeDir, { recursive: true });
            }

            let storeData = {};
            if (fs.existsSync(storeFile)) {
                storeData = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
            }

            let result;
            switch (args.type) {
                case 'get':
                    result = storeData[args.param.key];
                    break;

                case 'set':
                    storeData[args.param.key] = args.param.value;
                    fs.writeFileSync(storeFile, JSON.stringify(storeData, null, 2));
                    result = true;
                    break;

                case 'delete':
                    if (args.param.key in storeData) {
                        delete storeData[args.param.key];
                        fs.writeFileSync(storeFile, JSON.stringify(storeData, null, 2));
                        result = true;
                    } else {
                        result = false;
                    }
                    break;

                case 'clear':
                    storeData = {};
                    fs.writeFileSync(storeFile, JSON.stringify(storeData, null, 2));
                    result = true;
                    break;

                default:
                    event.returnValue = JSON.stringify({
                        success: false,
                        msg: `Unknown electronStore operation: ${args.type}`
                    });
                    return;
            }

            event.returnValue = JSON.stringify({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('[{}] ElectronStore operation error: {}', appId, error);
            event.returnValue = JSON.stringify({
                success: false,
                msg: error.message
            });
        }
    });
}

// 应用就绪后创建窗口 - 确保正确处理应用生命周期
let appReady = false;

// 立即设置ready事件监听
app.whenReady().then(() => {
    appReady = true;
    console.log('Electron app ready, initializing...');
    
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
}).catch(error => {
    console.error('App ready failed:', error);
    process.exit(1);
});

// 强制保持事件循环运行 - 防止立即退出
let appInitialized = false;

const keepAlive = setInterval(() => {
    // 保持心跳运行，防止进程退出
}, 1000);

// 防止进程立即退出 - 设置超时等待应用准备
setTimeout(() => {
    if (!appReady) {
        console.log('App still not ready after timeout, continuing anyway...');
        // 即使超时也继续执行，避免进程退出
        app.whenReady().then(() => {
            clearInterval(keepAlive); // 清除保持活的定时器
            appInitialized = true;
            initDbIpcHandlers();
            initOtherIpcHandlers();
            createAppWindow();
        });
    }
}, 3000);

// 应用成功初始化后清除定时器
app.whenReady().then(() => {
    if (appReady && !appInitialized) {
        clearInterval(keepAlive);
        appInitialized = true;
    }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    logger.error(`[${appId}] Uncaught exception:`, error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[${appId}] Unhandled rejection at:`, promise, 'reason:', reason);
});