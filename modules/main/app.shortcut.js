const { ipcRenderer } = require('electron');
const path = require("path");
const fs = require("fs");
const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

/*
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/config/canbox/
 */
const UserDataPath = ipcRenderer.sendSync('getPath', 'userData');
const AppDataPath = ipcRenderer.sendSync('getPath', 'appData');

module.exports = {
    /**
     * 给各个 app 生成启动快捷方式，并放到应用程序启动文件所在目录
     *
     * windows：C:\Users\brood\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
     * linux：~/.local/share/applications/
     *
     * @param {String} AppItemListStr
     */
    generateStartupShortcut: (AppItemListStr) => {
        const appItemList = JSON.parse(AppItemListStr);
        if('win' === os) {
            generateShortcutWindows(appItemList);
        } else if('linux' === os) {
            generateShortcutLinux(appItemList);
        } else {
            console.info('嘤嘤嘤~我没有mac，我不知道怎么搞~');
        }
    },
    deleteStartupShortcut: () => {
        // 删除canbox目录
        const shortcutDir = path.join(AppDataPath, '/Microsoft/Windows/Start Menu/Programs', 'canbox');
        if(fs.existsSync(shortcutDir)) {
            fs.rmSync(shortcutDir, { recursive: true });
        }
    }
}

/**
 *
 * @param {Array<Object>} appItemList
 */
function generateShortcutWindows(appItemList) {
    console.info('appItemList', appItemList);
    console.info('333333333333333333333333process.execPath', process.execPath);
    // console.info('44444444,', UserDataPath);
    // console.info('55555555,', AppDataPath);
    // const exePath = path.join(appItem.path, appItem.exe);
    const exePath = process.execPath;
    const iconPath = path.join(UserDataPath, 'User', 'default');
    const shortcutDir = path.join(AppDataPath, '/Microsoft/Windows/Start Menu/Programs', 'canbox');
    // 检查shortcutDir是否存在，不存在则创建
    if(!fs.existsSync(shortcutDir)) {
        fs.mkdirSync(shortcutDir);
    }
    // 写入快捷方式
    for(let appItem of appItemList) {
        const shortcutPath = path.join(shortcutDir, `canbox-${appItem.id}.lnk`);
        const shortcut = {
            Target: exePath + ' id:' + appItem.id,
            WorkingDirectory: appItem.path,
            IconLocation: path.join(iconPath, appItem.logo),
            Arguments: '',
            Description: appItem.description,
            Name: appItem.name,
            Hotkey: ''
        };
        // 写入快捷方式
        fs.writeFileSync(shortcutPath, JSON.stringify(shortcut));
    }
}

function generateShortcutLinux(appItemList) {}