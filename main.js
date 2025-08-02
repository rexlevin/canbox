const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require("fs");

const { v4: uuidv4 } = require('uuid');

const tray = require('./modules/main/tray');
const api = require('./modules/main/api');
const appWindow = require('./modules/main/app.window');

const Store  = require('electron-store');
Store.initRenderer();

// 清除启动时控制台的“Electron Security Warning (Insecure Content-Security-Policy)”报错信息
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 禁用当前应用程序的硬件加速
app.disableHardwareAcceleration();

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

/**
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/.config/canbox/
 */
const userDataPath = app.getPath('userData');

const AppsConfig = new Store({
    cwd: 'Users',
    name: 'apps'
});

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
    let config = {
        minWidth: 700,
        minHeight: 550,
        width: 700,
        height: 550,
        resizable: false,
        icon: path.join(__dirname, 'logo.png'),
        webPreferences: {
            sandbox: false, // 因为我想在preload中使用nodejs模块，所以这里设置为false，并且在启动参数中使用 --no-sandbox
            preload: path.join(__dirname, './preload.js'),
            spellcheck: false,
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: true,
            allowRunningInsecureContent: false,
            allowEval: false
        },
        useContentSize: true,
        show: false,
        autoHideMenuBar: true
    };

    win = new BrowserWindow(config);

    // win.loadURL(path.join('file://', __dirname, './dist/index.html'));
    win.loadURL('http://localhost:12333/');
    
    // win.setMenu(Menu.buildFromTemplate(menuTemplate));
    win.setMenu(null);

    if(os === 'win') {
        win.setAppDetails({
            appId: 'canbox'
        });
    }

    // 打开开发者窗口
    win.on('ready-to-show', () => {
        win.webContents.openDevTools({mode: 'detach'});
    });

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
 *
 * userData: C:\Users\brood\AppData\Roaming\canbox
 * appData: C:\Users\brood\AppData\Roaming
 */
ipcMain.on('getPath', (event, name) => {
    event.returnValue = app.getPath(name);
});

ipcMain.on('reload', () => {
    win.reload();
});
ipcMain.on('openDevTools', () => {
    if(win.webContents.isDevToolsOpened()) win.webContents.closeDevTools();
    else win.webContents.openDevTools({mode: 'detach'});
});
ipcMain.on('loadApp', (event, appItemStr, devTag) => {
    appWindow.loadApp(appItemStr, devTag);
});

// 添加 IPC 处理逻辑
ipcMain.handle('show-dialog', async (event, options) => {
    return dialog.showMessageBox(options);
});

ipcMain.handle('select-directory', async (event, options) => {
    return dialog.showOpenDialog(options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    return dialog.showSaveDialog(options);
});

ipcMain.handle('pack-asar', async (event, { sourceDir, outputPath }) => {
    const asar = require('asar');
    await asar.createPackage(sourceDir, outputPath);
    return { success: true, outputPath };
});

ipcMain.handle('select-file', async (event, options) => {
    return dialog.showOpenDialog({
        ...options,
        properties: ['openFile'],
        filters: [{ name: 'App Files', extensions: ['asar'] }],
    });
});

ipcMain.handle('import-app', async (event, asarPath) => {
    try {
        // 1. 生成 UUID 和目标路径
        const uuid = uuidv4().replace(/-/g, '');
        const targetPath = path.join(userDataPath, 'Users', 'apps', `${uuid}.asar`);
        // const targetPath = path.join(targetDir, `${uuid}.asar`);

        console.info('asarPath=', asarPath);
        console.info('targetPath=', targetPath);

        // 2. 复制文件并重命名
        if (!fs.existsSync(asarPath)) {
            throw new Error(`源文件不存在: ${asarPath}`);
        }
        const absoluteAsarPath = path.resolve(asarPath);
        if (!fs.existsSync(absoluteAsarPath)) {
            throw new Error(`解析后的路径无效: ${absoluteAsarPath}`);
        }
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        try {
            fs.copyFileSync(absoluteAsarPath, targetPath);
            console.log(`文件复制成功: ${absoluteAsarPath} -> ${targetPath}`);
        } catch (error) {
            console.error('复制文件失败:', {
                sourcePath: absoluteAsarPath,
                targetPath,
                error: error.message
            });
            throw error;
        }

        // 3. 读取 app.json
        const appJson = JSON.parse(fs.readFileSync(path.join(targetPath, 'app.json'), 'utf8'));
        const parsedAppJson = JSON.parse(appJson);

        
        // 4. 写入 apps.json
        let appConfigArr = AppsConfig.get('default') ? AppsConfig.get('default') : [];
        appConfigArr.push({
            sid: uuid,
            id: parsedAppJson.id || '',
            name: parsedAppJson.name || '',
            version: parsedAppJson.version || '',
            description: parsedAppJson.description || '',
            author: parsedAppJson.author || '',
            logo: parsedAppJson.logo || '',
        });
        AppsConfig.set('default', appConfigArr);
        // fs.writeFileSync(appsJsonPath, JSON.stringify(appsJson, null, 2));

        return { success: true, uuid };
    } catch (error) {
        console.error('导入应用失败:', error);
        return { success: false, error: error.message };
    }
});
