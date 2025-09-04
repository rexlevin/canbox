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
                pattern: '%[[%d{yyyy-MM-dd hh:mm:ss}] [%p] %m%]'
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
                pattern: '[%d{yyyy-MM-dd hh:mm:ss}] [%p] %m'
            }
        },
        monitor: {
            type: 'file',
            filename: path.join(logDir, 'monitor.log'),
            maxLogSize: 10485760, // 10MB
            backups: 5, // 保留5个备份
            compress: true,
            keepFileExt: true,
            layout: {
                type: 'pattern',
                pattern: '[%d{yyyy-MM-dd hh:mm:ss}] [%p] %m'
            }
        }
    },
    categories: {
        default: {
            appenders: ['console', 'file'],
            level: 'info'
        },
        monitor: {
            appenders: ['monitor'],
            level: 'info'
        }
    }
});

// 创建 logger 实例
const logger = log4js.getLogger();

// 获取调用位置信息
const getCallerInfo = () => {
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack.split('\n');
    // 跳过当前函数和 logger.js 的调用栈
    const callerLine = stack[3] || '';
    const match = callerLine.match(/\((.+):(\d+):(\d+)\)/);
    if (match) {
        const file = path.basename(match[1]);
        return { file, line: match[2] };
    }
    return { file: 'unknown', line: '0' };
};

// 创建 monitor logger 实例
const monitorLogger = log4js.getLogger('monitor');

// 创建日志方法的公共函数
const createLoggerMethods = (loggerInstance) => {
    return {
        info: (message) => {
            const { file, line } = getCallerInfo();
            loggerInstance.info(`[${file}:${line}] : ${message}`);
        },
        error: (message) => {
            const { file, line } = getCallerInfo();
            loggerInstance.error(`[${file}:${line}] : ${message}`);
        },
        warn: (message) => {
            const { file, line } = getCallerInfo();
            loggerInstance.warn(`[${file}:${line}] : ${message}`);
        },
        debug: (message) => {
            const { file, line } = getCallerInfo();
            loggerInstance.debug(`[${file}:${line}] : ${message}`);
        }
    };
};

// 导出接口
module.exports = {
    ...createLoggerMethods(logger),
    monitor: createLoggerMethods(monitorLogger)
};