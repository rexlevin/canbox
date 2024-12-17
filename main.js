const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require("fs");
// const { sandboxed } = require('process');

const tray = require('./modules/main/tray');

const api = require('./modules/main/api');

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
            win.webContents.send('loadAppDirect', appId);
        }
    })
 
    app.whenReady().then(() => {
        // 创建窗口
        createWindow();
        // 让rederrer能使用@electron/remote
        require('@electron/remote/main').initialize();
        require('@electron/remote/main').enable(win.webContents);
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
            win.webContents.send('loadAppDirect', appId);
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

/**
 * 给各个 app 生成启动快捷方式，并放到应用程序启动文件所在目录
 * 
 * windows：C:\Users\brood\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
 * linux：~/.local/share/applications/
 */
ipcMain.on('generateStartupShortcut', (e, appItemList) => {
    if('win' === os) {
        generateShortcutWindows(appItemList);
    } else if('linux' === os) {
        generateShortcutLinux(appItemList);
    } else {
        console.info('嘤嘤嘤~我没有mac，我不知道怎么搞~');
    }
});

/**
 * windows系统：生成app的快捷方式
 * @param {Array<Object>} appItemList
 */
function generateShortcutWindows(appItemList) {
    const appDataPath = path.join(app.getPath('appData'), '/Microsoft/Windows/Start Menu/Programs', 'canbox');
    for(let appItem of appItemList) {
        const exePath = path.join(appItem.path, appItem.exe);
        const shortcutPath = path.join(appDataPath, `${appItem.name}.lnk`);
        const shortcut = {
            Target: exePath,
            WorkingDirectory: appItem.path,
            IconLocation: exePath,
            Arguments: '',
            Description: appItem.description,
            Name: appItem.name,
            Hotkey: ''
        };
        // 写入快捷方式
        fs.writeFileSync(shortcutPath, JSON.stringify(shortcut));
    }
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
    shell.openExternal(url).then(res => {
        console.info('open external link:', res);
    }).catch(error => {
        console.error('Error opening external link:', error);
    });
});

/**
 * 根据 name 获取路径
 * 参见：https://www.electronjs.org/zh/docs/latest/api/app#appgetpathname
 */
ipcMain.on('getPath', (event, name) => {
    event.returnValue = app.getPath(name);
});
