/**
 * App配置文件
 * 用于控制App的行为和特性
 */

const fs = require('fs');
const path = require('path');

// 默认配置
const defaultConfig = {
    // 是否启用独立进程模式
    enableSeparateProcess: true,
    
    // 是否在 Linux 上使用独立的 WM_CLASS
    enableLinuxWmClass: true,
    
    // WM_CLASS 前缀
    wmClassPrefix: 'canbox',
    
    // 是否在启动时自动重启上次运行的App
    autoRestartApps: false,
    
    // App进程超时时间（毫秒）
    processTimeout: 30000,
    
    // 是否启用App进程监控
    enableProcessMonitoring: true,
    
    // 开发模式配置
    dev: {
        // 开发模式下是否也使用独立进程
        useSeparateProcessInDev: true,
        
        // 是否在开发模式下显示App进程的控制台输出
        showDevConsole: true
    }
};

/**
 * 获取App配置
 * @returns {Object} 配置对象
 */
function getAppConfig() {
    try {
        // 尝试从配置文件读取
        const configPath = path.join(__dirname, '../../app-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { ...defaultConfig, ...config };
        }
    } catch (error) {
        console.warn('Failed to load app config, using defaults:', error.message);
    }
    
    return defaultConfig;
}

/**
 * 保存App配置
 * @param {Object} config - 配置对象
 */
function saveAppConfig(config) {
    try {
        const configPath = path.join(__dirname, '../../app-config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save app config:', error.message);
        return false;
    }
}

/**
 * 检查是否应该使用独立进程模式
 * @param {boolean} isDev - 是否为开发模式
 * @returns {boolean}
 */
function shouldUseSeparateProcess(isDev = false) {
    const config = getAppConfig();
    
    if (isDev && !config.dev.useSeparateProcessInDev) {
        return false;
    }
    
    return config.enableSeparateProcess;
}

/**
 * 生成 WM_CLASS 名称
 * @param {string} appId - App ID
 * @returns {string}
 */
function generateWmClass(appId) {
    const config = getAppConfig();
    return `${config.wmClassPrefix}-${appId}`;
}

module.exports = {
    getAppConfig,
    saveAppConfig,
    shouldUseSeparateProcess,
    generateWmClass,
    defaultConfig
};