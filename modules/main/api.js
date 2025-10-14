const { ipcMain } = require('electron');

const winFactory = require('./core/win');
const dialogFactory = require('./core/dialog');
const ElectronStore = require('./core/electronStore');

/**
 * 初始化数据库相关的 IPC 消息处理逻辑
 */
function initDbIpcHandlers() {
    const DB = require('./core/db');
    ipcMain.on('msg-db', (event, args) => {
        console.info('args: ', args);
        DB[args.type](args.appId, args.param, (res, err) => {
            if (err) {
                event.returnValue = JSON.stringify({ success: false, msg: err.message });
                return;
            }
            console.info('api.js: dbHandler res: ', res);
            event.returnValue = JSON.stringify({ success: true, data: res});
        });
    });
}

/**
 * 初始化 electronStore 相关的 IPC 消息处理逻辑
 * @description 处理来自渲染进程的 IPC 消息，操作 electronStore
 * @listens ipcMain.on('msg-electronStore')
 * @param {object} args - IPC 消息参数
 * @param {string} args.type - 操作类型，支持 'get'、'set'、'delete'、'clear'
 * @param {object} args.param - 参数对象
 * @param {string} args.param.name - 存储的名称
 * @param {string} args.param.key - 存储的键
 * @param {any} [args.param.value] - 存储的值（仅 'set' 操作需要）
 * @param {string} args.appId - 应用 ID，用于动态生成存储路径
 * @returns {void}
 * @emits event.returnValue - 返回操作结果，格式为 { success: boolean, data: any }
 */
function initElectronStoreIpcHandlers() {
    ipcMain.on('msg-electronStore', (event, args) => {
        console.info('args: ', args);
        const store = new ElectronStore(args.appId, args.param.name);
        store[args.type](args.param.key, args.param.value)
            .then(result => {
                event.returnValue = JSON.stringify({ success: true, data: result });
            })
            .catch(err => {
                event.returnValue = JSON.stringify({ success: false, msg: err.message });
            });
    });
}

/**
 * 初始化窗口相关的 IPC 消息处理逻辑
 * @description 处理来自渲染进程的 IPC 消息，创建新窗口
 * @listens ipcMain.on('msg-createWindow')
 * @param {object} args - IPC 消息参数
 * @param {object} args.options - 窗口配置选项
 * @param {object} args.params - 窗口参数
 * @param {string} args.appId - 应用 ID
 * @returns {void}
 * @emits event.returnValue - 返回创建窗口的id，格式为 id: string
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
 * @listens ipcMain.on('msg-notification')
 * @param {object} args - IPC 消息参数
 * @param {object} args.options - 通知配置选项
 * @param {string} args.options.title - 通知标题
 * @param {string} args.options.body - 通知内容
 * @param {string} args.appId - 应用 ID
 * @returns {void}
 * @emits event.returnValue - 返回通知创建结果，格式为 { success: boolean, data: any }
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
 * 初始化对话框相关的 IPC 消息处理逻辑
 * @description 处理来自渲染进程的 IPC 消息，操作对话框（如打开文件、保存文件等）
 * @listens ipcMain.on('msg-dialog')
 * @param {object} args - IPC 消息参数
 * @param {string} args.type - 对话框操作类型，支持 'openFile'、'saveFile' 等
 * @param {object} args.options - 对话框配置选项
 * @returns {void}
 * @emits event.returnValue - 返回对话框操作结果，格式为 { success: boolean, data: any }
 */
function initDialogIpcHandlers() {
    ipcMain.on('msg-dialog', (event, args) => {
        console.info('args: ', args);
        dialogFactory[args.type](args.options)
            .then(result => {
                event.returnValue = JSON.stringify({ success: true, data: result });
            })
            .catch(err => {
                event.returnValue = JSON.stringify({ success: false, msg: err.message });
            });
    });
}

/**
 * 统一初始化所有 IPC 消息处理逻辑
 */
function initApiIpcHandlers() {
    initDbIpcHandlers();
    createWindowIpcHandlers();
    notificationHandlers();
    initDialogIpcHandlers();
    initElectronStoreIpcHandlers();
}

module.exports = initApiIpcHandlers;
