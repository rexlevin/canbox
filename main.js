const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
// const fs = require("fs");
// const { sandboxed } = require('process');

const tray = require('./modules/main/tray');

const Store  = require('electron-store');
Store.initRenderer();

// 清除启动时控制台的“Electron Security Warning (Insecure Content-Security-Policy)”报错信息
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 禁用当前应用程序的硬件加速
app.disableHardwareAcceleration();

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

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
        // 创建窗口
        createWindow();
        // 创建托盘
        tray.createTray(win, appMap);
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
        autoHideMenuBar: true
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
    // win.webContents.openDevTools({mode: 'detach'});

    win.on('ready-to-show', () => {
        win.show(); // 注释掉这行，即启动最小化到tray
    });

    // 关闭主窗口事件，需要把所有 app 的窗口都要关掉
    win.on('close', (e) => {
        win.hide();
        win.setSkipTaskbar(true);
        e.preventDefault();
        // for(let key of appMap.keys()) {
        //     appMap.get(key).close();
        // }
        // appMap.clear();
        // console.info('now will close app');
    });
}

/**
 * 启动app
 */
ipcMain.on('loadApp', (e, appItem, devTag) => {
    // console.info('loadApp===%o', appItem);
    appItem = JSON.parse(appItem);
    if(appMap.has(appItem.id)) {
        appMap.get(appItem.id).show();
        console.info(appItem.id + ' ' + appItem.appJson.name + ' is already exists');
        return;
    }
    let options = {
        minWidth: 0,
        minHeight: 0,
        width: 800,
        height: 600,
        resizable: true,
        webPreferences: {
            sandbox: false,     // 没有这个配置，加载不到 preload.js
            spellcheck: false,
            webSecurity: false
        }
    };
    if(undefined !== appItem.appJson.window) {
        options = cloneObj(appItem.appJson.window);
        if(undefined == options.webPreferences) {
            options.webPreferences = {};
        }
        options.webPreferences.sandbox = false;
        options.webPreferences.spellcheck = false;
        options.webPreferences.webSecurity = false;
    }
    if(undefined != options.icon) {
        options.icon = path.join(appItem.path, options.icon);
    } else {
        options.icon = path.join(appItem.path, appItem.appJson.logo);
    }
    if(undefined != options.webPreferences.preload) {
        options.webPreferences.preload = path.join(appItem.path, options.webPreferences.preload);
    }
    let appWin = new BrowserWindow(options);

    if('1' === devTag && undefined != appItem.appJson.development && appItem.appJson.development.main) {
        appItem.appJson.main = appItem.appJson.development.main;
    }
    if(appItem.appJson.main.indexOf('http') != -1) {
        appWin.loadURL(appItem.appJson.main);
    } else {
        appWin.loadFile(path.join(appItem.path, appItem.appJson.main));
    }
    appWin.setMenu(null);
    if(os === 'win') {
        appWin.setAppDetails({
            appId: appItem.id
        });
    }
    if('1' === devTag && undefined != appItem.appJson.development && appItem.appJson.development.devTools) {
        appWin.webContents.openDevTools({mode: appItem.appJson.development.devTools});
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
 * dialog只能在主进程调用，所以使用ipc模块在main.js中打开dialog
 * 该消息是个同步消息，所以使用 event.returnValue 进行应答
 */
ipcMain.on('openAppJson', (event, options) => {
    dialog.showOpenDialog(options).then(result => {
        // result: { canceled: false, filePaths: [ 'C:\\Users\\brood\\depot\\cargo\\can-demo\\app.json' ] }
        // console.info(3, 'You selected:', result.filePaths[0]);
        if (result.canceled) {
            event.returnValue = '';
            return;
        }
        event.returnValue = result.filePaths[0];
    });
});

/**
 * 使用外部浏览器打开url
 */
ipcMain.on('open-url', (event, url) => {
    shell.openExternal(url);
});


function cloneObj(obj) {
    if(obj == null) return null;
    if (typeof obj !== 'object') {
        return obj;
    } else {
        var newobj = obj.constructor === Array ? [] : {};
        for (var i in obj) {
            newobj[i] = typeof obj[i] === 'object' ? cloneObj(obj[i]) : obj[i]; 
        }
        return newobj;
    }
}