const path = require('path');
const fs = require('fs');
const originalFs = require('original-fs');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');
const { getAppPath, getAppDataPath } = require('@modules/main/pathManager');
const { handleError } = require('@modules/ipc/errorHandler');
const logger = require('@modules/utils/logger');
const { handleImportApp } = require('@modules/main/appManager');
const { deleteShortcuts } = require('@modules/main/shortcutManager');

class AppManagerIpcHandler {
    constructor() {
        this.handlers = new Map();
        this.registerHandlers();
    }

    registerHandlers() {
        // 获取所有应用（异步版本，避免阻塞主线程）
        this.handlers.set('get-all-apps', async () => {
            const startTime = Date.now();
            try {
                const appsData = getAppsStore().get('default') || {};
                const appCount = Object.keys(appsData).length;
                logger.info(`IPC get-all-apps: Starting to process ${appCount} apps`);
                
                if (appCount === 0) {
                    logger.info('当前没有应用数据');
                    return { success: true, data: {}};
                }

                // 使用异步并发读取所有应用的 app.json 文件
                const readStartTime = Date.now();
                const appPromises = Object.entries(appsData).map(async ([uid, appItem]) => {
                    try {
                        const appJsonPath = path.join(getAppPath(), uid + '.asar/app.json');
                        const appJsonContent = await fs.promises.readFile(appJsonPath, 'utf8');
                        const appJson = JSON.parse(appJsonContent);
                        const iconPath = path.join(getAppPath(), uid + '.asar', appJson.logo);
                        const appJsonData = { ...appJson, logo: iconPath };
                        return [uid, { ...appItem, appJson: appJsonData }];
                    } catch (error) {
                        logger.error(`Failed to read app.json for ${uid}:`, error);
                        return [uid, appItem]; // 保持原始 appItem
                    }
                });

                // 等待所有应用数据读取完成
                const resolvedApps = await Promise.all(appPromises);
                const readTime = Date.now() - readStartTime;
                
                // 重新构建 appsData 对象
                const buildStartTime = Date.now();
                const updatedAppsData = {};
                resolvedApps.forEach(([uid, appItem]) => {
                    updatedAppsData[uid] = appItem;
                });
                const buildTime = Date.now() - buildStartTime;

                const totalTime = Date.now() - startTime;
                logger.info(`IPC get-all-apps success: ${appCount} apps processed, read: ${readTime}ms, build: ${buildTime}ms, total: ${totalTime}ms`);
                return { success: true, data: updatedAppsData };
            } catch (error) {
                logger.error('IPC get-all-apps error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 获取开发应用数据（异步版本，避免阻塞主线程）
        this.handlers.set('get-apps-dev-data', async () => {
            const startTime = Date.now();
            try {
                let appDevInfoData = getAppsDevStore().get('default') || {};
                const appCount = Object.keys(appDevInfoData).length;
                logger.info(`IPC get-apps-dev-data: Starting to process ${appCount} dev apps`);
                
                if (appCount === 0) {
                    return { success: true, data: {}, wrong: {} };
                }
                
                let appDevData = {};
                let appDevFalseData = {};
                
                // 使用异步并发读取，避免阻塞主线程
                const appPromises = Object.entries(appDevInfoData).map(async ([key, appInfo]) => {
                    try {
                        const appJsonPath = path.join(appInfo.path, 'app.json');
                        const appJsonContent = await fs.promises.readFile(appJsonPath, 'utf8');
                        const appJson = JSON.parse(appJsonContent);
                        
                        // 使用浅拷贝替代深拷贝，性能更好
                        appDevData[key] = { ...appInfo, appJson: { ...appJson } };
                        return { key, success: true };
                    } catch (error) {
                        appDevFalseData[key] = { ...appInfo };
                        return { key, success: false, error };
                    }
                });

                // 等待所有应用数据读取完成
                await Promise.all(appPromises);

                // 异步删除有问题的应用（不阻塞返回）
                if (Object.keys(appDevFalseData).length > 0) {
                    setImmediate(() => {
                        try {
                            for (const key in appDevFalseData) {
                                delete appDevInfoData[key];
                            }
                            getAppsDevStore().set('default', appDevInfoData);
                            logger.info('Cleaned up invalid dev apps:', Object.keys(appDevFalseData));
                        } catch (error) {
                            logger.error('Failed to cleanup invalid dev apps:', error);
                        }
                    });
                }
                
                const totalTime = Date.now() - startTime;
                logger.info(`IPC get-apps-dev-data success: ${appCount} dev apps processed, valid: ${Object.keys(appDevData).length}, invalid: ${Object.keys(appDevFalseData).length}, total: ${totalTime}ms`);
                return { success: true, data: appDevData, wrong: appDevFalseData };
            } catch (error) {
                logger.error('IPC get-apps-dev-data error:', error);
                return { success: false, msg: error.message, data: {}, wrong: {} };
            }
        });

        // 导入应用（从 zip 文件）
        this.handlers.set('import-app', async (event, zipPath) => {
            try {
                const ret = await handleImportApp(null, zipPath, null);
                return ret;
            } catch (error) {
                return handleError(error, 'import-app');
            }
        });

        // 删除应用
        this.handlers.set('remove-app', async (event, param) => {
            try {
                const { id, devTag } = param;
                if (!id) {
                    return handleError(new Error('应用 ID 不能为空'), 'remove-app');
                }

                const store = devTag ? getAppsDevStore() : getAppsStore();
                const appsData = store.get('default') || {};
                const appItem = appsData[id];

                if (!appItem) {
                    return handleError(new Error('应用不存在'), 'remove-app');
                }

                // 删除应用文件
                let appPath;
                if (devTag) {
                    // 开发环境：只从数据中移除，不删除用户的项目源代码目录
                    logger.info(`开发应用移除: ${id}, path: ${appItem.path}`);
                } else {
                    appPath = path.join(getAppPath(), `${id}.asar`);

                    // 使用 original-fs 删除 asar 文件
                    try {
                        originalFs.rmSync(appPath, { recursive: true, force: true });
                        logger.info(`应用文件已删除: ${appPath}`);
                    } catch (error) {
                        logger.warn(`删除应用文件失败: ${error}`);
                    }

                    // 删除 .asar.unpacked 目录
                    try {
                        const unpackedPath = path.join(getAppPath(), `${id}.asar.unpacked`);
                        originalFs.rmSync(unpackedPath, { recursive: true, force: true });
                        logger.info(`asar.unpacked 目录已删除: ${unpackedPath}`);
                    } catch (error) {
                        logger.warn(`删除 asar.unpacked 目录失败: ${error}`);
                    }

                    // 删除 logo 文件（文件名可能是 uuid.png, uuid.jpg 等）
                    try {
                        const appsData = store.get('default') || {};
                        const appItem = appsData[id];
                        if (appItem && appItem.logo) {
                            // 尝试删除常见的 logo 文件扩展名
                            const logoExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
                            for (const ext of logoExtensions) {
                                const logoPath = path.join(getAppPath(), `${id}${ext}`);
                                if (fs.existsSync(logoPath)) {
                                    originalFs.unlinkSync(logoPath);
                                    logger.info(`Logo 文件已删除: ${logoPath}`);
                                }
                            }
                        }
                    } catch (error) {
                        logger.warn(`删除 logo 文件失败: ${error}`);
                    }

                    // 删除快捷方式（仅生产环境应用）
                    try {
                        const result = deleteShortcuts({ [id]: appItem });
                        if (result.success) {
                            logger.info(`应用快捷方式已删除: ${id}`);
                        } else {
                            logger.warn(`删除应用快捷方式失败: ${id}, ${result.error}`);
                        }
                    } catch (error) {
                        logger.warn(`删除应用快捷方式异常: ${id}, ${error}`);
                    }
                }

                // 从存储中删除
                delete appsData[id];
                store.set('default', appsData);

                logger.info(`应用已删除: ${id}, devTag: ${devTag}`);
                return { success: true };
            } catch (error) {
                return handleError(error, 'remove-app');
            }
        });

        // 清除应用数据
        this.handlers.set('clearAppData', async (event, id) => {
            try {
                if (!id) {
                    return handleError(new Error('应用 ID 不能为空'), 'clearAppData');
                }

                const appDataPath = getAppDataPath(id);

                // 使用 original-fs 删除应用数据目录
                if (fs.existsSync(appDataPath)) {
                    originalFs.rmSync(appDataPath, { recursive: true, force: true });
                    logger.info(`应用数据已清除: ${appDataPath}`);
                } else {
                    logger.info(`应用数据目录不存在: ${appDataPath}`);
                }

                return { success: true };
            } catch (error) {
                return handleError(error, 'clearAppData');
            }
        });

        // 添加开发应用（选择 app.json）
        this.handlers.set('handle-app-dev-add', async () => {
            try {
                const { dialog } = require('electron');

                // 显示文件选择对话框
                const result = await dialog.showOpenDialog({
                    title: '选择 app.json 文件',
                    properties: ['openFile'],
                    filters: [
                        { name: 'App JSON', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || result.filePaths.length === 0) {
                    logger.info('用户取消选择 app.json 文件');
                    return { correct: {} };
                }

                const selectedPath = result.filePaths[0];
                const appDir = path.dirname(selectedPath);
                const { v4: uuidv4 } = require('uuid');
                const uid = uuidv4().replace(/-/g, '');

                // 验证 app.json 文件
                try {
                    const appJsonContent = fs.readFileSync(selectedPath, 'utf8');
                    const appJson = JSON.parse(appJsonContent);

                    // 验证必需字段
                    if (!appJson.name || !appJson.version) {
                        return { correct: {}, wrong: { error: 'app.json 缺少必需字段 (name, version)' } };
                    }

                    // 保存到开发应用存储（只保存 path，appJson 由 get-apps-dev-data 动态读取）
                    let appDevInfoData = getAppsDevStore().get('default') || {};
                    appDevInfoData[uid] = {
                        path: appDir
                    };
                    getAppsDevStore().set('default', appDevInfoData);

                    logger.info(`开发应用添加成功: ${uid}, name: ${appJson.name}`);

                    // 返回包含 appJson 的数据用于前端立即显示
                    const appDevDataWithJson = {};
                    for (const [key, value] of Object.entries(appDevInfoData)) {
                        if (key === uid) {
                            appDevDataWithJson[key] = { ...value, appJson };
                        } else {
                            // 读取其他应用的 app.json
                            try {
                                const jsonPath = path.join(value.path, 'app.json');
                                const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                                appDevDataWithJson[key] = { ...value, appJson: JSON.parse(jsonContent) };
                            } catch (e) {
                                appDevDataWithJson[key] = { ...value };
                            }
                        }
                    }
                    return { correct: appDevDataWithJson };
                } catch (error) {
                    logger.error(`解析 app.json 失败: ${selectedPath}`, error);
                    return { correct: {}, wrong: { error: error.message } };
                }
            } catch (error) {
                logger.error('添加开发应用失败:', error);
                return { correct: {}, wrong: { error: error.message } };
            }
        });
    }

    /**
     * 初始化 IPC 处理器
     * @param {Electron.IpcMain} ipcMain 
     */
    init(ipcMain) {
        for (const [channel, handler] of this.handlers) {
            ipcMain.handle(channel, handler);
            logger.info(`Registered IPC handler: ${channel}`);
        }
        
        // 注册 load-app 处理器（使用 ipcMain.on 因为前端使用 ipcRenderer.send）
        ipcMain.on('load-app', async (event, uid, devTag = false) => {
            try {
                const appLoader = require('@modules/main/appLoader');
                await appLoader.loadApp(uid, devTag);
                logger.info('App {} loaded successfully', uid);
            } catch (error) {
                logger.error('Failed to load app {}, error: {}', uid, error);
                event.reply('load-app-error', { uid, error: error.message });
            }
        });
        logger.info('Registered IPC handler: load-app');
    }
}

module.exports = new AppManagerIpcHandler();