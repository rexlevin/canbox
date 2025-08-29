const log4js = require('log4js');
const path = require('path');
const { app } = require('electron');

// 日志文件路径
const logDir = path.join(app.getPath('userData'), 'Users', 'logs');
const logFile = path.join(logDir, 'app.log');

// 配置 log4js
log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[[%d{yyyy-MM-dd hh:mm:ss}] [%p] %f:%l : %m%]'
            }
        },
        file: {
            type: 'file',
            filename: logFile,
            maxLogSize: 10485760, // 10MB
            backups: 5, // 保留5个备份
            compress: true,
            keepFileExt: true,
            layout: {
                type: 'pattern',
                pattern: '[%d{yyyy-MM-dd hh:mm:ss}] [%p] %f:%l : %m'
            }
        }
    },
    categories: {
        default: {
            appenders: ['console', 'file'],
            level: 'info'
        }
    }
});

// 创建 logger 实例
const logger = log4js.getLogger();

// 动态获取调用位置
const getCallerFileAndLine = () => {
    const stack = new Error().stack.split('\n');
    // 跳过当前函数和 logger.js 的调用栈
    const callerLine = stack[3] || '';
    const match = callerLine.match(/\/([^\/]+):(\d+):(\d+)\)?$/);
    if (match) {
        return { file: match[1], line: match[2] };
    }
    return { file: 'unknown', line: '0' };
};

// 导出接口，支持动态传递调用位置
module.exports = {
    info: (message) => {
        const { file, line } = getCallerFileAndLine();
        logger.info(`${file}:${line} : ${message}`);
    },
    error: (message) => {
        const { file, line } = getCallerFileAndLine();
        logger.error(`${file}:${line} : ${message}`);
    },
    warn: (message) => {
        const { file, line } = getCallerFileAndLine();
        logger.warn(`${file}:${line} : ${message}`);
    },
    debug: (message) => {
        const { file, line } = getCallerFileAndLine();
        logger.debug(`${file}:${line} : ${message}`);
    }
};