const { ipcMain, dialog, shell, app } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const repoIpcHandler = require('./modules/ipc/repoIpcHandler');
const shortcutIpcHandler = require('./modules/ipc/shortcutIpcHandler');
const appManagerIpcHandler = require('./modules/ipc/appManagerIpcHandler');
const initApiIpcHandlers = require('./modules/main/api');
const logger = require('./modules/utils/logger');

/**
 * 初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    // 初始化拆分后的 IPC 处理逻辑
    repoIpcHandler.init(ipcMain);
    shortcutIpcHandler.init(ipcMain);
    appManagerIpcHandler.init(ipcMain);

    // 初始化 API 相关的 IPC 处理逻辑
    initApiIpcHandlers();

    // 打开文件选择窗口
    ipcMain.on('openAppJson', (event, options) => {
        dialog.showOpenDialog(options).then(result => {
            if (result.canceled) {
                event.returnValue = '';
                return;
            }
            event.returnValue = result.filePaths[0];
        });
    });

    // 使用外部浏览器打开 HTML 内容（用于显示 markdown 文档）
    ipcMain.handle('open-html', async (event, htmlContent) => {
        if (!htmlContent) {
            logger.warn('open-html received empty content');
            return { success: false, msg: '内容为空' };
        }
        try {
            // 创建临时目录
            const tempDir = path.join(os.tmpdir(), 'canbox-docs');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // 创建临时 HTML 文件
            const tempFile = path.join(tempDir, `doc-${Date.now()}.html`);
            fs.writeFileSync(tempFile, htmlContent, 'utf8');
            
            logger.info('Opening temporary HTML file: {}', tempFile);
            shell.openExternal(`file://${tempFile}`).catch(error => {
                console.error('Error opening HTML file:', error);
            });
            
            // 30分钟后删除临时文件
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                        logger.info('Deleted temporary file: {}', tempFile);
                    }
                } catch (err) {
                    console.error('Error deleting temp file:', err);
                }
            }, 30 * 60 * 1000);
            
            return { success: true };
        } catch (error) {
            console.error('Error creating temp HTML file:', error);
            return { success: false, msg: error.message };
        }
    });

    // 使用外部浏览器打开 URL
    ipcMain.on('open-url', (event, url) => {
        if (!url) {
            logger.warn('open-url received empty url');
            return;
        }
        logger.info('Opening external URL: {}', url);
        shell.openExternal(url).catch(error => {
            console.error('Error opening external link:', error);
        });
    });

    // 打包 ASAR
    ipcMain.handle('pack-asar', async (event, uid) => {
        console.info('main.js==pack-asar uid: ', uid);
        return require('@modules/build-asar').buildAsar(uid);
    });

    // 选择文件
    ipcMain.handle('select-file', async (event, options) => {
        return dialog.showOpenDialog({
            ...options,
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['zip'] }],
        });
    });

}

module.exports = {
    initIpcHandlers
};