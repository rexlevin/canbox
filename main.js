const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { sandboxed } = require('process');

// const Store  = require('electron-store');
// Store.initRenderer();

// 清除启动时控制台的“Electron Security Warning (Insecure Content-Security-Policy)”报错信息
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 禁用当前应用程序的硬件加速
app.disableHardwareAcceleration();

const isDarwin = process.platform === 'darwin' ? true : false;

let win = null;

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
    win.webContents.send('userDataPath', app.getPath('userData'));
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

console.info(__dirname);

const createWindow = () => {
    // Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
    // Menu.setApplicationMenu(null);

    let config = {
        minWidth: 700,
        minHeight: 450,
        width: 700,
        height: 450,
        icon: path.join(__dirname, '/public/logo.png'),
        webPreferences: {
            sandbox: false,     // 没有这个配置，加载不到 preload.js
            preload: path.join(__dirname, '/preload.js'),
            // preload: 'http://localhost:13000',
            spellcheck: false
        },
        useContentSize: true,
        show: false,
        autoHideMenuBar: true,
    };

    win = new BrowserWindow(config);

    // win.loadURL(path.join('file://', __dirname, '/dist/index.html'));
    win.loadURL('http://localhost:5173/');
    
    // win.setMenu(Menu.buildFromTemplate(menuTemplate));
    win.setMenu(null);

    // 打开开发者窗口
    win.webContents.openDevTools({mode: 'detach'});

    win.on('ready-to-show', () => {
        win.show();
    });

    // 关闭主窗口事件，记录窗口大小和位置
    win.on('close', (e) => {
        // e.preventDefault();     // 阻止默认事件
        // let isMax = win.isMaximized()
        //     , mainPosition = win.getContentBounds();
        // console.info('now will close app');
        // win.webContents.send('closeApp', isMax, mainPosition);
    });
}   