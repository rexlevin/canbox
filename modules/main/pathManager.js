const { app } = require('electron');
const path = require('path');

/**
 * app.getPath('userData') 指向 userData 目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/.config/canbox/
 */
const PathManager = {
    // 定义常用路径
    getDataPath: () => {
        return app.getPath('userData');
    },
    getDownloadsPath: () => {
        return app.getPath('downloads');
    },
    getTempPath: () => {
        return app.getPath('temp');
    },
    // 可以根据需要扩展其他路径
    getAppPath: () => {
        return path.join(app.getPath('userData'), 'Users', 'apps');
    },
    getAppDataPath: () => {
        return path.join(app.getPath('userData'), 'Users', 'data');
    },
    getAppIconPath: () => {
        return path.join(app.getPath('userData'), 'Users', 'appIcon');
    },
    getAppTempPath: () => {
        return path.join(app.getPath('userData'), 'Users', 'temp');
    },
    getReposPath: () => {
        return path.join(app.getPath('userData'), 'Users', 'repos');
    }
};

module.exports = PathManager;