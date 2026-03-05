const log4js = require('log4js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const pathManager = require('@modules/main/pathManager');

// 内存缓存配置
const MEMORY_CACHE_SIZE = 1000; // 默认缓存 1000 条日志

// 内存缓存 Appender
class MemoryAppender {
    constructor() {
        this.logs = [];
        this.maxSize = MEMORY_CACHE_SIZE;
    }

    append(level, message, category) {
        const now = new Date();
        const logEntry = {
            id: `${now.getTime()}${now.getMilliseconds().toString().padStart(3, '0')}`,
            level: level,
            message: message,
            timestamp: now.toISOString(),
            category: category
        };

        this.logs.push(logEntry);

        // 限制缓存大小
        if (this.logs.length > this.maxSize) {
            this.logs.shift();
        }
    }

    getRecentLogs(count = 100) {
        return this.logs.slice(-count);
    }

    getLogsSince(id) {
        const index = this.logs.findIndex(log => log.id === id);
        if (index === -1) {
            return [];
        }
        return this.logs.slice(index + 1);
    }

    clear() {
        this.logs = [];
    }
}

// 创建全局内存 appender 实例
const memoryAppender = new MemoryAppender();

// 获取日志目录路径
function getLogDir() {
    try {
        return path.join(pathManager.getUsersPath(), 'logs');
    } catch (error) {
        // 如果 pathManager 还没准备好，使用默认路径
        return path.join(app.getPath('userData'), 'Users', 'logs');
    }
}

// 初始配置：只有 console appender
log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[[%d{yyyy-MM-dd hh:mm:ss}] [%p] %m%]'
            }
        }
    },
    categories: {
        default: {
            appenders: ['console'],
            level: 'info'
        },
        monitor: {
            appenders: ['console'],
            level: 'info'
        }
    }
});

// 添加文件 appender（延迟配置）
function configureFileAppenders() {
    const logDir = getLogDir();
    const logFile = path.join(logDir, 'app.log');

    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // 执行自动日志清理
    cleanupOldLogs();

    // 重新配置 log4js，添加 dateFile appender
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
                type: 'dateFile',
                filename: logFile,
                pattern: 'yyyy-MM-dd',
                compress: true,
                keepFileExt: true,
                layout: {
                    type: 'pattern',
                    pattern: '[%d{yyyy-MM-dd hh:mm:ss}] [%p] %m'
                }
            },
            monitor: {
                type: 'dateFile',
                filename: path.join(logDir, 'monitor.log'),
                pattern: 'yyyy-MM-dd',
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
}

// 创建 logger 实例
const logger = log4js.getLogger();

// 获取调用位置信息
const getCallerInfo = () => {
    const err = new Error();
    Error.captureStackTrace(err);
    const stack = err.stack.split('\n');

    // 跳过当前函数和 logger.js 的调用栈
    for (let i = 3; i < stack.length; i++) {
        const callerLine = stack[i] || '';
        // 支持多种调用栈格式（同步/异步/Electron主进程）
        const match = callerLine.match(/\(?(.+):(\d+):(\d+)\)?/) || callerLine.match(/at (.+):(\d+):(\d+)/);
        if (match) {
            const file = path.basename(match[1]);
            return { file, line: match[2] };
        }
    }

    // 如果无法解析，返回默认值
    return { file: 'unknown', line: '0' };
};

// 创建 monitor logger 实例
const monitorLogger = log4js.getLogger('monitor');

// 创建日志方法的公共函数
const formatMessage = (message, ...args) => {
    let formatted = message;
    args.forEach(arg => {
        formatted = formatted.replace(/{}/, arg);
    });
    return formatted;
};

const createLoggerMethods = (loggerInstance, category = 'default') => {
    return {
        info: (message, ...args) => {
            const { file, line } = getCallerInfo();
            const formattedMessage = formatMessage(message, ...args);
            const logMessage = `[${file}:${line}] : ${formattedMessage}`;
            loggerInstance.info(logMessage);
            // 同时记录到内存缓存
            memoryAppender.append('INFO', logMessage, category);
        },
        error: (message, ...args) => {
            const { file, line } = getCallerInfo();
            const formattedMessage = formatMessage(message, ...args);
            const logMessage = `[${file}:${line}] : ${formattedMessage}`;
            loggerInstance.error(logMessage);
            // 同时记录到内存缓存
            memoryAppender.append('ERROR', logMessage, category);
        },
        warn: (message, ...args) => {
            const { file, line } = getCallerInfo();
            const formattedMessage = formatMessage(message, ...args);
            const logMessage = `[${file}:${line}] : ${formattedMessage}`;
            loggerInstance.warn(logMessage);
            // 同时记录到内存缓存
            memoryAppender.append('WARN', logMessage, category);
        },
        debug: (message, ...args) => {
            const { file, line } = getCallerInfo();
            const formattedMessage = formatMessage(message, ...args);
            const logMessage = `[${file}:${line}] : ${formattedMessage}`;
            loggerInstance.debug(logMessage);
            // 同时记录到内存缓存
            memoryAppender.append('DEBUG', logMessage, category);
        }
    };
};

// 获取所有日志文件列表
function getLogFiles(source = 'app') {
    const logDir = getLogDir();
    const prefix = source === 'monitor' ? 'monitor' : 'app';
    const files = [];

    try {
        const allFiles = fs.readdirSync(logDir);
        const logFiles = allFiles.filter(file =>
            file.startsWith(prefix) && (file.endsWith('.log') || file.endsWith('.log.gz'))
        );

        // 按日期排序（最新的在前）
        logFiles.sort((a, b) => b.localeCompare(a));

        // 提取日期信息
        logFiles.forEach(file => {
            const match = file.match(new RegExp(`${prefix}\\.?(\\d{4}-\\d{2}-\\d{2})?`));
            const date = match && match[1] ? match[1] : new Date().toISOString().split('T')[0];
            const isCompressed = file.endsWith('.gz');

            files.push({
                filename: file,
                path: path.join(logDir, file),
                date: date,
                source: source,
                compressed: isCompressed
            });
        });
    } catch (error) {
        console.error('Failed to get log files:', error);
    }

    return files;
}

// 清理超过保留天数的日志
function cleanupOldLogs(days = 30) {
    const logDir = getLogDir();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deletedCount = 0;
    const deletedFiles = [];

    try {
        const files = fs.readdirSync(logDir);

        files.forEach(file => {
            // 只处理日志文件
            if (!file.match(/^(app|monitor)\.?\d{4}-\d{2}-\d{2}\.log(\.gz)?$/)) {
                return;
            }

            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            const fileDate = stats.mtime;

            if (fileDate < cutoffDate) {
                fs.unlinkSync(filePath);
                deletedCount++;
                deletedFiles.push(file);
            }
        });

        if (deletedCount > 0) {
            console.log(`Cleaned up ${deletedCount} old log files:`, deletedFiles);
        }
    } catch (error) {
        console.error('Failed to cleanup old logs:', error);
    }

    return { deletedCount, deletedFiles };
}

// 导出接口
module.exports = {
    ...createLoggerMethods(logger, 'app'),
    monitor: createLoggerMethods(monitorLogger, 'monitor'),
    configureFileAppenders,
    getRecentLogs: (count) => memoryAppender.getRecentLogs(count),
    getLogsSince: (id) => memoryAppender.getLogsSince(id),
    getLogFiles,
    cleanupOldLogs,
    clearCache: () => memoryAppender.clear()
};