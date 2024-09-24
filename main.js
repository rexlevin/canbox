const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron')
const path = require('path')
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
let extMap = new Map();

// 创建锁，保证只有一个实例在运行
const getTheLock = app.requestSingleInstanceLock();
if (!getTheLock) {
    app.quit()
} else {

    // console.info(process.argv);
    // let extId = '';
    // for(let arg of process.argv) {
    //     if(arg.indexOf('id:') == -1) continue;
    //     extId = arg.substring(arg.indexOf(':') + 1);
    // }

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // console.info('commandLine===%o', commandLine);
        // console.info('workingDirectory===%o', workingDirectory);
        // console.info('extId====extId====%s', extId);
        // 如果app已经启动，那么参数再次启动app或者extension的参数只能从commandLine里面获得
        let extId = '';
        for(let command of commandLine) {
            if(command.indexOf('id:') == -1) continue;
            extId = command.substring(command.indexOf(':') + 1);
        }
        if (win && '' === extId) {
            if(win.isMinimized()) win.restore();
            if(!win.isVisible()) win.show();
            win.focus();
        }
        if(win && '' != extId) {
            console.info('now loadExtDirect==%s', extId);
            win.webContents.send('loadExtDirect', extId);
        }
    })
 
    app.whenReady().then(() => {
        createTray();
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

        // app第一次启动的时候，启动参数可以从process.argv里面获取到
        let extId = '';
        for(let arg of process.argv) {
            if(arg.indexOf('id:') == -1) continue;
            extId = arg.substring(arg.indexOf(':') + 1);
        }
        console.info(extId);
        if('' != extId) {
            win.webContents.send('loadExtDirect', extId);
        }
    })
}
// app.whenReady().then(() => {
//     console.info(process.argv);
//     createWindow();
//     app.on('activate', () => {
//         if (BrowserWindow.getAllWindows().length === 0) createWindow();
//     })
// })

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
    // win.webContents.openDevTools({mode: 'detach'});

    win.on('ready-to-show', () => {
        // win.show(); // 注释掉这行，即启动最小化到tray
    });

    // 关闭主窗口事件，把extionsion的窗口都要关掉
    win.on('close', (e) => {
        for(let key of extMap.keys()) {
            extMap.get(key).close();
        }
        extMap.clear();
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

ipcMain.on('loadExt', (e, appItem) => {
    console.info('loadExt===%o', appItem);
    appItem = JSON.parse(appItem);
    if(extMap.has(appItem.id)) {
        extMap.get(appItem.id).show();
        console.info(appItem.id + ' ' + appItem.config.name + ' is already exists');
        return;
    }
    const options = {
        width: appItem.config.width,
        height: appItem.config.height,
        title: appItem.config.name,
        icon: path.join(appItem.path, 'logo.png'),
        webPreferences: {}
    };
    let extWin = new BrowserWindow(options);
    extWin.loadFile(path.join(appItem.path, appItem.config.main));
    extWin.setMenu(null);
    if(os === 'win') {
        extWin.setAppDetails({
            appId: appItem.id
        });
    }
    // extWin.webContents.openDevTools({mode: 'detach'});
    extMap.set(appItem.id, extWin);
    extWin.on('close', () => {
        extMap.delete(appItem.id);
    });
});

/**
 * 给各个extension生成启动快捷方式，并放到启动目录
 * 
 * windows启动目录：C:\Users\brood\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
 * linux启动目录：~/.local/share/applications/
 */
ipcMain.on('generateStartupShortcut', (e, appItemList) => {
    let appDataPath;
    if('win' === os) {
        appDataPath = path.join(app.getPath('appData'), '/Microsoft/Windows/Start Menu/Programs');
    } else if('linux' === os) {
        appDataPath = path.join(app.getPath('home'), '/.local/share/applications');
    } else {
        console.info('嘤嘤嘤~我不认识你~');
        return;
    }
});

function generateShortcutWindows(appItemList) {
}