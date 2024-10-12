const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron')
const path = require('path')
// const fs = require("fs");
// const { sandboxed } = require('process');

const Store  = require('electron-store');
Store.initRenderer();

// 清除启动时控制台的“Electron Security Warning (Insecure Content-Security-Policy)”报错信息
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 禁用当前应用程序的硬件加速
app.disableHardwareAcceleration();

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

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
            if(command.indexOf('id:') == -1) continue;
            appId = command.substring(command.indexOf(':') + 1);
        }
        if (win && '' === appId) {
            if(win.isMinimized()) win.restore();
            if(!win.isVisible()) win.show();
            win.focus();
        }
        if(win && '' != appId) {
            // console.info('now loadAppDirect==%s', appId);
            win.webContents.send('loadAppDirect', appId);
        }
    })
 
    app.whenReady().then(() => {
        createTray();
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // app第一次启动的时候，启动参数可以从process.argv里面获取到
        let appId = '';
        for(let arg of process.argv) {
            if(arg.indexOf('id:') == -1) continue;
            appId = arg.substring(arg.indexOf(':') + 1);
        }
        console.info(appId);
        if('' != appId) {
            win.webContents.send('loadAppDirect', appId);
        }
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

const createWindow = () => {
    const config = {
        minWidth: 700,
        minHeight: 450,
        width: 700,
        height: 450,
        resizable: false,
        icon: path.join(__dirname, 'logo.png'),
        webPreferences: {
            sandbox: false,     // 没有这个配置，加载不到 preload.js
            preload: path.join(__dirname, './preload.js'),
            spellcheck: false,
            webSecurity: false
        },
        useContentSize: true,
        show: false,
        autoHideMenuBar: true,
    };

    win = new BrowserWindow(config);

    // win.loadURL(path.join('file://', __dirname, './dist/index.html'));
    win.loadURL('http://localhost:5173/');
    
    // win.setMenu(Menu.buildFromTemplate(menuTemplate));
    win.setMenu(null);

    if(os === 'win') {
        win.setAppDetails({
            appId: 'canbox'
        });
    }

    // 打开开发者窗口
    win.webContents.openDevTools({mode: 'detach'});

    win.on('ready-to-show', () => {
        win.show(); // 注释掉这行，即启动最小化到tray
    });

    // 关闭主窗口事件，需要把所有 app 的窗口都要关掉
    win.on('close', (e) => {
        for(let key of appMap.keys()) {
            appMap.get(key).close();
        }
        appMap.clear();
        console.info('now will close app');
    });
}

function createTray() {
    let tray;
    if('linux' === os) {
        tray = new Tray(path.join(__dirname, './logo2.png'));
    } else {
        tray = new Tray(path.join(__dirname, './logo.png'));
    }
    const menu = Menu.buildFromTemplate(trayMenuTemplate);
    tray.setContextMenu(menu);
}
const trayMenuTemplate = [{
    label: '显示窗口',
    type: 'normal',
    click: function() {
        win.show();
    }
}, {
    label: 'About',
    type: 'normal',
    click: function() {
        dialog.showMessageBox({
            type: 'info',
            title: '关于',
            message: package.name + ':' + package.version + '\n' + package.description + '\nnode:' + process.versions['node'] + '\nchrome:' + process.versions['chrome'] + '\nelectron:' + process.versions['electron']
        });
    }
}, {
    label: 'Project Repository',
    type: 'normal',
    click: function() {
        let exec = require('child_process').exec
            , locale = app.getLocale()
            , url = ''
        // 使用ip的话要么自己维护一个ip库放在外部（太大，没必要放项目里），要么使用第三方，都需要进行网络交互
        // 所以这里使用一个最粗略的方式“语言环境”来判断是否是中国大陆
        if(locale.indexOf('zh-CN') == -1) {
            url = 'https://github.com/rexlevin/coderbox'
        } else {
            url = 'https://gitee.com/rexlevin/coderbox'
        }
        exec('open ' + url)
    }
}, {
    label: 'Quit',
    type: 'normal',
    click: function() {
        app.quit();
    }
}];

/**
 * 启动app
 */
ipcMain.on('loadApp', (e, appItem) => {
    // console.info('loadApp===%o', appItem);
    appItem = JSON.parse(appItem);
    if(appMap.has(appItem.id)) {
        appMap.get(appItem.id).show();
        console.info(appItem.id + ' ' + appItem.appJson.name + ' is already exists');
        return;
    }
    const window = {
        minWidth: 0,
        minHeight: 0,
        width: 800,
        height: 600,
        resizable: true
    };
    if(undefined === appItem.appJson.window) {
        appItem.appJson.window = window;
    } else {
        appItem.appJson.window = Object.assign(window, appItem.appJson.window);
    }
    const options = {
        minWidth: appItem.appJson.window.minWidth,
        minHeight: appItem.appJson.window.minHeight,
        width: appItem.appJson.window.width,
        height: appItem.appJson.window.height,
        resizable: appItem.appJson.window.resizable,
        title: appItem.appJson.name,
        icon: path.join(appItem.path, 'logo.png'),
        webPreferences: {}
    };
    let appWin = new BrowserWindow(options);
    appWin.loadURL(appItem.appJson.main);
    appWin.setMenu(null);
    if(os === 'win') {
        appWin.setAppDetails({
            appId: appItem.id
        });
    }
    if(undefined != appItem.appJson.window['devTools']) {
        appWin.webContents.openDevTools({mode: appItem.appJson.window['devTools']});
    }
    appMap.set(appItem.id, appWin);
    appWin.on('close', () => {
        appMap.delete(appItem.id);
    });
});

/**
 * 给各个 app 生成启动快捷方式，并放到启动目录
 * 
 * windows启动目录：C:\Users\brood\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
 * linux启动目录：~/.local/share/applications/
 */
ipcMain.on('generateStartupShortcut', (e, appItemList) => {
    if('win' === os) {
        generateShortcutWindows(appItemList);
    } else if('linux' === os) {
        generateShortcutLinux(appItemList);
    } else {
        console.info('嘤嘤嘤~我不认识你~');
        return;
    }
});
function generateShortcutWindows(appItemList) {
    const appDataPath = path.join(app.getPath('appData'), '/Microsoft/Windows/Start Menu/Programs');
}
function generateShortcutLinux(appItemList) {
    const appDataPath = path.join(app.getPath('home'), '/.local/share/applications');
}

/**
 * 打开文件选择窗口，读取文件本地path
 */
ipcMain.on('openAppJson', (e, options) => {
    dialog.showOpenDialog(options).then(result => {
        // result: { canceled: false, filePaths: [ 'C:\\Users\\brood\\depot\\cargo\\can-demo\\app.json' ] }
        // console.info(3, 'You selected:', result.filePaths[0]);
        if (result.canceled) {
            win.webContents.send('openAppJson-reply', '');
            return;
        }
        return win.webContents.send('openAppJson-reply', result.filePaths[0]);
    });
});