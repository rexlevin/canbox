const { app, BrowserWindow } = require('electron')
const fs = require('fs');
const path = require('path')

const tray = require('./modules/main/tray');
const uatDev = fs.existsSync('./uat.dev.json') ? require('./uat.dev') : {};
console.info('uatDev: ', uatDev);

// 引入 IPC 消息处理模块
const initDbIpcHandlers = require('./modules/main/api');
// 初始化 IPC 消息处理
initDbIpcHandlers();

// 引入 IPC 消息处理模块
const { initIpcHandlers, handleLoadAppById } = require('./ipcHandlers');

// 清除启动时控制台的“Electron Security Warning (Insecure Content-Security-Policy)”报错信息
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 禁用当前应用程序的硬件加速
app.disableHardwareAcceleration();

// 操作系统类型
const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';
// 当前是否是打包环境
const isPackaged = app.isPackaged;

// canbox 主窗口对象
let win = null;

// 设置一个map集合，用于存放所有打开的window
let appMap = new Map();

// 创建锁，保证只有一个实例在运行
const getTheLock = app.requestSingleInstanceLock();
if (!getTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // console.info('commandLine===%o', commandLine);
        // console.info('workingDirectory===%o', workingDirectory);
        // 如果app已经启动，那么参数再次启动app或者 app 的参数只能从commandLine里面获得
        let appId = '';
        for(let command of commandLine) {
            if(command.indexOf('id:') === -1) continue;
            appId = command.substring(command.indexOf(':') + 1);
        }
        if (win && '' === appId) {
            if(win.isMinimized()) win.restore();
            if(!win.isVisible()) win.show();
            win.focus();
        }
        if(win && '' !== appId) {
            // console.info('now loadAppDirect==%s', appId);
            handleLoadAppById(appId);
        }
    })
 
    app.whenReady().then(() => {
        // 创建窗口
        createWindow();
        win.setIcon(path.join(__dirname, './logo.png'));
        // 创建托盘
        tray.createTray(win, appMap);
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // app第一次启动的时候，启动参数可以从process.argv里面获取到
        let appId = '';
        for(let arg of process.argv) {
            if(arg.indexOf('id:') === -1) continue;
            appId = arg.substring(arg.indexOf(':') + 1);
        }
        console.info(appId);
        if('' !== appId) {
            win.hide();
            handleLoadAppById(appId);
        }
    })
}

app.on('window-all-closed', () => {
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

    win = new BrowserWindow(config);

    if (!isPackaged && uatDev?.main) {
        console.info('now load uatDev==%s', uatDev.main);
        win.loadURL(uatDev.main);
    } else {
        console.info('now load app==%s', path.join('file://', __dirname, './build/index.html'));
        win.loadURL(path.join('file://', __dirname, './build/index.html'));
    }

    // win.setMenu(Menu.buildFromTemplate(menuTemplate));
    win.setMenu(null);

    if(os === 'win') {
        win.setAppDetails({
            appId: 'canbox'
        });
    }

    win.on('ready-to-show', () => {
        win.show(); // 注释掉这行，即启动最小化到tray

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
        } else if (!isPackaged && uatDev?.devTools) {
            win.webContents.openDevTools({ mode: uatDev?.devTools });
        }
    });

    // 关闭主窗口事件，最小化到托盘
    win.on('close', (e) => {
        win.hide();
        win.setSkipTaskbar(true);
        e.preventDefault();
    });

    // 在 win 的closed事件里退出整个app
    win.on('closed', () => {
        console.info('now win closed, and app will quit');
        app.quit();
    });
}

// 初始化 IPC 消息处理
initIpcHandlers(win);
