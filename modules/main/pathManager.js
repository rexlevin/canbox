const { app } = require('electron');
const { get } = require('http');
const path = require('path');

/**
 * app.getPath('userData') 指向 userData 目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/.config/canbox/
 *
 * 注意：子进程模式下，使用环境变量 CANBOX_USER_DATA 避免主进程退出后 app.getPath() 调用阻塞
 */
const PathManager = {
    // 获取 userData 路径
    getUserDataPath: () => {
        // 优先使用环境变量（子进程模式）
        if (process.env.CANBOX_USER_DATA) {
            return process.env.CANBOX_USER_DATA;
        }
        return app.getPath('userData');
    },
    // 定义常用路径
    getDataPath: () => {
        return PathManager.getUserDataPath();
    },
    getDownloadsPath: () => {
        return app.getPath('downloads');
    },
    getTempPath: () => {
        return app.getPath('temp');
    },
    // 可以根据需要扩展其他路径
    getAppPath: () => {
        // 优先使用环境变量 CANBOX_APP_PATH（子进程模式）
        if (process.env.CANBOX_APP_PATH) {
            return process.env.CANBOX_APP_PATH;
        }
        // 默认路径：userData/Users/apps
        return path.join(PathManager.getUserDataPath(), 'Users', 'apps');
    },
    getAppDataPath: () => {
        return path.join(PathManager.getUserDataPath(), 'Users', 'data');
    },
    getAppIconPath: () => {
        return path.join(PathManager.getUserDataPath(), 'Users', 'appIcon');
    },
    getAppTempPath: () => {
        return path.join(PathManager.getUserDataPath(), 'Users', 'temp', 'apps');
    },
    getReposPath: () => {
        return path.join(PathManager.getUserDataPath(), 'Users', 'repos');
    },
    getReposTempPath: () => {
        return path.join(PathManager.getUserDataPath(), 'Users', 'temp', 'repos');
    }
};

module.exports = PathManager;