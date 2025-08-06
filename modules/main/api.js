const { ipcMain } = require('electron');

/**
 * 初始化数据库相关的 IPC 消息处理逻辑
 * @param {Object} DB - 数据库模块
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

module.exports = initDbIpcHandlers;
