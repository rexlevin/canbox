const { ipcMain } = require('electron');

const winFactory = require('./core/win');

/**
 * 初始化数据库相关的 IPC 消息处理逻辑
 */
function initDbIpcHandlers() {
    const DB = require('./core/db');
    ipcMain.on('msg-db', (event, args) => {
        console.info('args: ', args);
        DB[args.type](args.appId, args.param, (res, err) => {
            if (err) {
                event.returnValue = JSON.stringify({ code: '9100', msg: err.message });
                return;
            }
            console.info('api.js: dbHandler res: ', res);
            event.returnValue = JSON.stringify({ code: '0000', data: res});
        });
    });
}

/**
 * 初始化窗口相关的 IPC 消息处理逻辑
 */
function createWindowIpcHandlers() {
    ipcMain.on('msg-createWindow', (event, args) => {
        console.info('args: ', args);
        const result = winFactory.createWindow(args.options, args.params, args.appId);
        console.info('result: ', result);
        event.returnValue = JSON.stringify(result);
    });
}

/**
 * 初始化通知相关的 IPC 消息处理逻辑
 */
function notificationHandlers() {
    ipcMain.on('msg-notification', (event, args) => {
        console.info('args: ', args);
        winFactory.showNotification(args.options, args.appId);
        // console.info('result: ', result);
        // event.returnValue = JSON.stringify(result);
    });
}

/**
 * 统一初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    initDbIpcHandlers();
    createWindowIpcHandlers();
    notificationHandlers();
}

module.exports = initIpcHandlers;
