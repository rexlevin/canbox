const { ipcMain } = require('electron');

const winFactory = require('@modules/core/win');
const dialogFactory = require('@modules/core/dialog');
const ElectronStore = require('@modules/core/electronStore');
const DB = require('@modules/core/db');

/**
 * 初始化数据库相关的 IPC 消息处理逻辑
 */
function initDbIpcHandlers() {
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
 * 初始化文件读取相关的 IPC 消息处理逻辑
 * @description 处理来自渲染进程的 IPC 消息，读取文件内容
 * @listens ipcMain.handle('msg-readFile')
 * @param {object} args - IPC 消息参数
 * @param {string} args.filePath - 文件路径
 * @returns {Promise} 返回文件内容，格式为 { success: boolean, data: string }
 */
function initReadFileIpcHandlers() {
    ipcMain.handle('msg-readFile', async (event, args) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const { app } = require('electron');

            // 获取应用路径：开发环境使用项目根目录，打包后使用 app.getAppPath()
            let appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '../../');

            // Flatpak 环境特殊处理：docs 目录在 /app/bin/docs/
            if (process.env.FLATPAK_ID || (process.env.container && process.env.container.includes('flatpak'))) {
                // 如果是 docs 目录下的文件，使用 Flatpak 中的路径
                if (args.filePath && args.filePath.startsWith('docs/')) {
                    const fileName = args.filePath.replace('docs/', '');
                    appPath = '/app/bin';
                    args.filePath = `docs/${fileName}`;
                }
            }

            // 构建完整的文件路径
            const filePath = path.join(appPath, args.filePath);

            console.info('[api.js] 尝试读取文件: ', filePath);

            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                console.error('[api.js] 文件不存在: ', filePath);
                return {
                    success: false,
                    msg: `文件不存在: ${args.filePath}`
                };
            }

            // 读取文件内容
            const content = fs.readFileSync(filePath, 'utf8');
            console.info('[api.js] 文件读取成功: ', args.filePath);
            return {
                success: true,
                data: content
            };
        } catch (error) {
            console.error('[api.js] 读取文件失败:', error);
            return {
                success: false,
                msg: `读取文件失败: ${error.message}`
            };
        }
    });
}

/**
 * 初始化下载 canbox.d.ts 的 IPC 消息处理逻辑
 * @description 处理来自渲染进程的下载 canbox.d.ts 请求
 * @listens ipcMain.handle('download-canbox-types')
 * @returns {Promise} 返回下载结果，格式为 { success: boolean, msg: string }
 */
function initDownloadCanboxTypesIpcHandlers() {
    ipcMain.handle('download-canbox-types', async () => {
        try {
            const fs = require('fs');
            const path = require('path');
            const { app, dialog } = require('electron');
            const logger = require('@modules/utils/logger');

            // 获取应用路径：开发环境使用项目根目录，打包后使用 app.getAppPath()
            let appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '../../');

            // Flatpak 环境特殊处理
            if (process.env.FLATPAK_ID || (process.env.container && process.env.container.includes('flatpak'))) {
                appPath = '/app/bin';
            }

            // canbox.d.ts 文件路径
            const canboxTypesPath = path.join(appPath, 'types', 'canbox.d.ts');

            // 检查文件是否存在
            if (!fs.existsSync(canboxTypesPath)) {
                logger.error('[api.js] canbox.d.ts 文件不存在: ' + canboxTypesPath);
                return {
                    success: false,
                    msg: 'canbox.d.ts 文件不存在'
                };
            }

            // 打开文件保存对话框
            const result = await dialog.showSaveDialog({
                title: '保存 canbox.d.ts',
                defaultPath: 'canbox.d.ts',
                filters: [
                    { name: 'TypeScript Declaration Files', extensions: ['d.ts'] }
                ]
            });

            if (result.canceled || !result.filePath) {
                logger.info('[api.js] 用户取消保存 canbox.d.ts');
                return {
                    success: true,
                    msg: 'canceled'
                };
            }

            // 读取 canbox.d.ts 文件内容
            const content = fs.readFileSync(canboxTypesPath, 'utf8');

            // 写入用户选择的路径
            fs.writeFileSync(result.filePath, content);

            logger.info('[api.js] canbox.d.ts 保存成功: ' + result.filePath);
            return {
                success: true,
                msg: '保存成功'
            };
        } catch (error) {
            console.error('[api.js] 下载 canbox.d.ts 失败:', error);
            return {
                success: false,
                msg: `下载失败: ${error.message}`
            };
        }
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
    initReadFileIpcHandlers();
    initDownloadCanboxTypesIpcHandlers();
}

module.exports = initApiIpcHandlers;
