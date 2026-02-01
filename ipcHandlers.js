const { ipcMain, dialog, shell, app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const repoIpcHandler = require('./modules/ipc/repoIpcHandler');
const shortcutIpcHandler = require('./modules/ipc/shortcutIpcHandler');
const appManagerIpcHandler = require('./modules/ipc/appManagerIpcHandler');
const initApiIpcHandlers = require('./modules/main/api');
const logger = require('./modules/utils/logger');
const i18nModule = require('./locales');
const { getCanboxStore } = require('./modules/main/storageManager');

// 默认语言为英文
let currentLanguage = 'en-US';

// 缓存已创建的临时文件，避免重复创建
let cachedTempFiles = new Map();

// 初始化时读取保存的语言设置
function initLanguage() {
    try {
        const canboxStore = getCanboxStore();
        const savedLanguage = canboxStore.get('language');
        if (savedLanguage) {
            currentLanguage = savedLanguage;
        } else {
            // 使用系统默认语言
            const systemLocale = app.getLocale();
            if (systemLocale.startsWith('zh')) {
                currentLanguage = 'zh-CN';
            } else {
                currentLanguage = 'en-US';
            }
        }
        logger.info(`Initialized language: ${currentLanguage}`);
    } catch (error) {
        logger.error('Failed to initialize language:', error);
    }
}

/**
 * 获取文档目录名称
 * @returns {string} 中文环境返回"文档"，其他返回"Documents"
 */
function getDocumentsDirName() {
    return currentLanguage === 'zh-CN' ? '文档' : 'Documents';
}

/**
 * 获取文档目录路径
 * @returns {string} 文档目录的完整路径
 */
function getDocumentsDir() {
    const docsDirName = getDocumentsDirName();
    return path.join(os.homedir(), docsDirName);
}

/**
 * 初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    // i18n 相关 IPC 处理
    ipcMain.handle('i18n-get-language', () => {
        return currentLanguage;
    });

    ipcMain.handle('i18n-set-language', async (event, lang) => {
        try {
            const availableLanguages = i18nModule.getAvailableLanguages();
            const isValidLang = availableLanguages.some(l => l.code === lang);

            if (!isValidLang) {
                logger.warn(`Invalid language code: ${lang}`);
                return { success: false, msg: '不支持的语言' };
            }

            currentLanguage = lang;
            const canboxStore = getCanboxStore();
            canboxStore.set('language', lang);
            logger.info(`Language changed to: ${lang}`);

            // 通知所有窗口语言已更改
            BrowserWindow.getAllWindows().forEach(win => {
                if (win.webContents) {
                    win.webContents.send('language-changed', lang);
                }
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to set language:', error);
            return { success: false, msg: error.message };
        }
    });

    ipcMain.handle('i18n-get-available-languages', () => {
        return i18nModule.getAvailableLanguages();
    });

    ipcMain.handle('i18n-translate', (event, key, params = {}) => {
        return i18nModule.translate(key, currentLanguage, params);
    });

    // 字体设置相关 IPC 处理
    ipcMain.handle('font-get', () => {
        try {
            const canboxStore = getCanboxStore();
            const savedFont = canboxStore.get('font', 'default');
            logger.info(`Get font setting: ${savedFont}`);
            return savedFont;
        } catch (error) {
            logger.error('Failed to get font setting:', error);
            return 'default';
        }
    });

    ipcMain.handle('font-set', async (event, fontValue) => {
        try {
            const canboxStore = getCanboxStore();
            canboxStore.set('font', fontValue);
            logger.info(`Font changed to: ${fontValue}`);

            // 通知所有窗口字体已更改
            BrowserWindow.getAllWindows().forEach(win => {
                if (win.webContents) {
                    win.webContents.send('font-changed', fontValue);
                }
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to set font:', error);
            return { success: false, msg: error.message };
        }
    });

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
    ipcMain.handle('open-html', async (event, htmlContent, docName) => {
        if (!htmlContent) {
            logger.warn('open-html received empty content');
            return { success: false, msg: '内容为空' };
        }
        try {
            // 创建临时文件并打开
            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `doc-${Date.now()}.html`);
            fs.writeFileSync(tempFile, htmlContent, 'utf8');

            logger.info('Opening temporary HTML file: {}', tempFile);
            shell.openExternal(`file://${tempFile}`).catch(error => {
                console.error('Error opening HTML file:', error);
            });

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

// 初始化语言
initLanguage();

module.exports = {
    initIpcHandlers,
    getCurrentLanguage: () => currentLanguage
};