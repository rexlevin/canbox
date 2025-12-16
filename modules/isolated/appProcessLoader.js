const appProcessManager = require('@modules/isolated/appProcessManager');

function loadApp (appId, devTag) {
    // 检查App进程是否已运行
    if (appProcessManager.isAppRunning(uid)) {
        console.info(`App ${uid} is already running in separate process`);
        return;
    }
    appProcessManager.startApp(appId, devTag);

    // 启动App进程
    const result = await appProcessManager.startAppProcess(uid, devTag);
    if (result.success) {
        // 成功启动独立进程
        logger.info('App {} started in separate process', uid);
        return true;
    } else {
        logger.error('Failed to start app {}: {}', uid, result.msg);
        // 回退到传统模式
        logger.info('Falling back to traditional window mode');
        return false;
    }
}

module.exports = {
    loadApp
}