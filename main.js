const { app, BrowserWindow } = require('electron')
const fs = require('fs');
const path = require('path')

const moduleAlias = require('module-alias');

// 检查是否是子进程（用于启动App）
// 更严格的检测逻辑，确保只有真正的子进程才会被重定向
const hasAppIdArg = process.argv.some(arg => arg.startsWith('--app-id='));
const hasAppPathArg = process.argv.some(arg => arg.startsWith('--app-path='));
const hasAppMainArg = process.argv.some(arg => arg.startsWith('--app-main='));
const isMainProcess = process.env.CANBOX_MAIN_PROCESS === 'true';

// 如果是子进程（有应用参数且不是主进程）
const isAppProcess = hasAppIdArg && hasAppPathArg && hasAppMainArg && !isMainProcess;

if (isAppProcess) {
    console.log('[main.js] Detected app process, redirecting to app-main.js');
    console.log('[main.js] App process args:', process.argv.filter(arg => arg.startsWith('--app-')));
    console.log('[main.js] CANBOX_MAIN_PROCESS:', process.env.CANBOX_MAIN_PROCESS);
    
    // 设置模块别名（必须在require之前）
    moduleAlias.addAliases({
        '@': path.join(__dirname, './src'),
        '@modules': path.join(__dirname, './modules')
    });
    moduleAlias();
    
    // 直接执行app-main.js，不退出进程，让它自己管理生命周期
    const appMainPath = path.join(__dirname, 'modules/isolated/app-main.js');
    require(appMainPath);
    
    // 返回，不继续执行main.js的其他部分
    return;
}

// 手动添加映射（基于打包后的路径）
moduleAlias.addAliases({
    '@': path.join(__dirname, './src'),
    '@modules': path.join(__dirname, './modules')
});
// 注册别名（必须在 require 其他模块前执行）
moduleAlias();

const logger = require('@modules/utils/logger');

const tray = require('./tray');
const uatDev = (() => {
    try {
        // 在 asar 包中使用绝对路径
        const uatDevPath = path.join(__dirname, 'uat.dev.json');
        if (fs.existsSync(uatDevPath)) {
            return require(uatDevPath);
        }
        return {};
    } catch (error) {
        logger.warn('Failed to load uat.dev configuration: {}', error.message);
        return {};
    }
})();
logger.info('[main.js] uatDev: {}', JSON.stringify(uatDev));

// 引入 RepoMonitorService
const RepoMonitorService = require('@modules/services/repoMonitorService');

const appLoader = require('@modules/main/appLoader');

// 引入 IPC 消息处理模块
const { initIpcHandlers } = require('./ipcHandlers');

// 清除启动时控制台的"Electron Security Warning (Insecure Content-Security-Policy)"报错信息
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 标识主进程
process.env['CANBOX_MAIN_PROCESS'] = 'true'

// 禁用当前应用程序的硬件加速
app.disableHardwareAcceleration();

// 操作系统类型
const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

// canbox 主窗口对象
let win = null;

const isDev = !app.isPackaged;
console.info('main.js is running in %s mode', isDev ? 'development' : 'production');

// 创建锁，为了便于开发：正式环境仅一个实例，可同时多开多个开发环境
const getTheLock = isDev ? true : app.requestSingleInstanceLock();
if (!getTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        logger.info('commandLine size {}: {}', commandLine.length, JSON.stringify(commandLine));
        // console.info('workingDirectory===%o', workingDirectory);
        // 如果app已经启动，那么参数再次启动app或者 app 的参数只能从commandLine里面获得
        let appId = '';
        for (let command of commandLine) {
            if (command.indexOf('--app-id=') === -1) continue;
            appId = command.substring(command.indexOf('=') + 1);
        }
        if (win && '' === appId) {
            if (win.isMinimized()) win.restore();
            if (!win.isVisible()) win.show();
            win.focus();
        }
        if (win && '' !== appId) {
            // console.info('now loadAppDirect==%s', appId);
            appLoader.loadApp(appId, false);
        }
    })

    app.whenReady().then(() => {
        // 创建窗口
        createWindow();
        win.setIcon(path.join(__dirname, './logo.png'));
        // 创建托盘
        tray.createTray(win);
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // 初始化并启动仓库监控服务
        const repoMonitorService = new RepoMonitorService();
        repoMonitorService.startScheduler('0 * * * *'); // 每小时执行一次
        // repoMonitorService.startScheduler('*/1 * * * *'); // 每分钟执行一次

        // 启动时立即执行一次仓库检查
        repoMonitorService.scanRepo().then((ret) => {
            logger.info('启动时仓库检查完成');
            // 通知前端数据已更新
            if (ret.success) {
                win.webContents.send('repo-data-updated');
            }
        }).catch(error => {
            logger.error('启动时仓库检查失败:', error);
        });

        // app第一次启动的时候，启动参数可以从process.argv里面获取到
        let appId = '';
        for (let arg of process.argv) {
            if (arg.indexOf('--app-id=') === -1) continue;
            appId = arg.substring(arg.indexOf('=') + 1);
            break;
        }
        if ('' !== appId) {
            console.info('First-time startup with appId:', appId);
            win.hide();
            appLoader.loadApp(appId, false);
        }

        // 初始化快捷方式（异步）
        if (!isDev) {
            const shortcutManager = require('./modules/main/shortcutManager');
            const { getAllApps } = require('./modules/main/appManager');
            const package = require('./package.json');
            shortcutManager.initShortcuts(package.version, getAllApps().data || {}).then((result) => {
                if (result.success) {
                    logger.info('快捷方式初始化完成' + result.msg || '');
                } else {
                    logger.error('快捷方式初始化失败:', result.msg);
                }
            }).catch((error) => {
                logger.error('快捷方式初始化失败:', error);
            });
        }
    })
}

app.on('window-all-closed', async () => {
    // if (process.platform !== 'darwin') app.quit();
    if (process.platform !== 'darwin') {
        console.info('now will quit app');
        app.quit();
        console.info('now after quit app');
    }
});

const createWindow = () => {
    let config = {
        minWidth: 700,
        minHeight: 550,
        width: 700,
        height: 550,
        resizable: false,
        icon: path.join(__dirname, './logo.png'),
        webPreferences: {
            sandbox: false, // 因为在preload中使用nodejs的api（如：require）
            // 即使 preload.js 中只是简单地引入 electron 模块，也需要 require 的支持
            // 所以这里设置为false禁用了沙箱模式，并且在启动参数中使用 --no-sandbox
            preload: path.join(__dirname, './preload.js'),
            spellcheck: false,
            webSecurity: false,
            nodeIntegration: false, // false：禁止渲染进程使用nodejs的api
            contextIsolation: true,
            allowRunningInsecureContent: false,
            allowEval: false
        },
        useContentSize: true,
        show: false,
        autoHideMenuBar: true
    };
    if (os === 'linux') {
        // 为Wayland环境提供更好的窗口识别支持
        config.windowClass = 'canbox-main';
        config.title = 'Canbox';
        config.titleBarStyle = 'default';
        // 确保主进程WM_CLASS正确设置
        if (!config.webPreferences) config.webPreferences = {};
        config.webPreferences.additionalArguments = [
            `--app-name=Canbox`,
            `--class=canbox-main`,
            `--wm-class=canbox-main`
        ];
    }
    win = new BrowserWindow(config);

    if (isDev && uatDev?.main) {
        logger.info('[main.js] now load canbox in uatDev: {}', uatDev.main);
        win.loadURL(uatDev.main);
    } else {
        console.info('now load app==%s', path.join('file://', __dirname, './build/index.html'));
        win.loadURL(path.join('file://', __dirname, './build/index.html'));
    }

    // win.setMenu(Menu.buildFromTemplate(menuTemplate));
    win.setMenu(null);

    if (os === 'win') {
        win.setAppDetails({
            appId: 'canbox'
        });
    }

    win.on('ready-to-show', () => {
        win.show(); // 注释掉这行，即启动最小化到tray

        const PackageJson = require('./package.json');
        const devTitle = isDev ? ' - develop' : '';
        win.setTitle(`${PackageJson.description} - v${PackageJson.version}${devTitle}`);

        // 检查是否传入了 --dev-tools 参数
        let devToolsMode = null;
        for (const arg of process.argv) {
            if (arg.startsWith('--dev-tools=')) {
                devToolsMode = arg.split('=')[1];
                break;
            }
        }
        // 优先使用命令行参数，其次使用 uatDev 配置
        if (devToolsMode) {
            win.webContents.openDevTools({ mode: devToolsMode });
        } else if (isDev && uatDev?.devTools) {
            win.webContents.openDevTools({ mode: uatDev?.devTools });
        }
    });

    // 将app窗口添加到appMap中
    // windowManager.addWindow('canbox', win);

    // 关闭主窗口事件，最小化到托盘
    win.on('close', (e) => {
        win.hide();
        win.setSkipTaskbar(true);
        e.preventDefault();
    });

    // 在 win 的closed事件里退出整个app
    win.on('closed', async () => {
        console.info('now win closed, and app will quit');
        app.quit();
    });
}

// 初始化 IPC 消息处理
initIpcHandlers();
