const path = require('path');

const AppsConfig = new Store({
    cwd: 'Users',
    name: 'apps'
});

module.exports = {
    state: {
        saveWindowState(appId, windowState) {
            const appConfigPath = path.join('Users', 'data', appId);
            console.info('appConfigPath: ', appConfigPath);
            const AppsConfig = new Store({
                cwd: appConfigPath,
                name: 'apps'
            });
        },
        loadWindowState() {
            // 从配置中获取当前应用窗口的原始位置和尺寸
            // 如果配置了默认位置，或配置中的位置和尺寸与窗口当前的位置或尺寸不同，应立即应用新的位置和尺寸
        },
        getSavedState() {
            // 获取已经保存的状态信息
            // 如果返回结果为空，则表明这是第一次运行，应该进行初始化操作：
            // 初始化操作包括：
        },
    },
};

class WindowConfig {
    appId;
    isMax = false;
    position = {};
}