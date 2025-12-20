/**
 * AppWindowBuilder 使用示例
 * 
 * 这个文件展示了如何使用模块化后的 AppWindowBuilder 来创建应用窗口
 */

const AppWindowBuilder = require('./appWindowBuilder');

/**
 * 创建一个生产环境的应用窗口
 * @param {string} appId - 应用ID
 */
async function createProductionAppWindow(appId) {
    const window = await AppWindowBuilder.createWindow(
        appId,    // uid
        false     // devTag - 生产模式
    );
    
    if (window) {
        console.log(`应用 ${appId} 窗口创建成功`);
    } else {
        console.error(`应用 ${appId} 窗口创建失败`);
    }
    
    return window;
}

/**
 * 创建一个开发环境的应用窗口
 * @param {string} appId - 应用ID
 */
async function createDevelopmentAppWindow(appId) {
    const window = await AppWindowBuilder.createWindow(
        appId,    // uid
        true      // devTag - 开发模式
    );
    
    if (window) {
        console.log(`开发应用 ${appId} 窗口创建成功`);
    } else {
        console.error(`开发应用 ${appId} 窗口创建失败`);
    }
    
    return window;
}

/**
 * 批量创建应用窗口
 * @param {Array} appIds - 应用ID数组
 * @param {boolean} isDev - 是否为开发模式
 */
async function createMultipleAppWindows(appIds, isDev = false) {
    const windows = [];
    
    for (const appId of appIds) {
        try {
            const window = await AppWindowBuilder.createWindow(appId, isDev);
            if (window) {
                windows.push({ appId, window });
            }
        } catch (error) {
            console.error(`创建应用 ${appId} 窗口失败:`, error);
        }
    }
    
    console.log(`成功创建 ${windows.length} 个应用窗口`);
    return windows;
}

// 使用示例：
// createProductionAppWindow('my-app-id');
// createDevelopmentAppWindow('my-dev-app-id');
// createMultipleAppWindows(['app1', 'app2', 'app3'], false);

module.exports = {
    createProductionAppWindow,
    createDevelopmentAppWindow,
    createMultipleAppWindows
};