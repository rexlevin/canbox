const { ipcMain } = require('electron');

/**
 * 初始化数据库相关的 IPC 消息处理逻辑
 */
function initDbIpcHandlers() {
    const DB = require('./db');
    ipcMain.on('msg-db', (event, args) => {
        console.info('args: ', args);
        DB[args.type](args.appId, args.param, (res) => {
            event.returnValue = JSON.stringify(res);
        });
    });
}

/**
 * 初始化窗口相关的 IPC 消息处理逻辑
 */
function initWindowIpcHandlers() {
    const WindowManager = require('./win');
    ipcMain.on('msg-window', (event, args) => {
        console.info('args: ', args);
        const result = WindowManager[args.type](args.param, args.appId);
        console.info('result: ', result);
        event.returnValue = JSON.stringify(result);
    });
}

/**
 * 统一初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    initDbIpcHandlers();
    initWindowIpcHandlers();
}

module.exports = initIpcHandlers;
