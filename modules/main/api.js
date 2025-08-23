const { ipcMain } = require('electron');

/**
 * 初始化数据库相关的 IPC 消息处理逻辑
 */
function initDbIpcHandlers() {
    const DB = require('./db');
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
    const winFactory = require('./win');
    ipcMain.on('msg-createWindow', (event, args) => {
        console.info('args: ', args);
        const result = winFactory.createWindow(args.options, args.params, args.appId);
        console.info('result: ', result);
        event.returnValue = JSON.stringify(result);
    });
}

/**
 * 统一初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    initDbIpcHandlers();
    createWindowIpcHandlers();
}

module.exports = initIpcHandlers;
