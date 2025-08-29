const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { app } = require('electron');

// 初始化日志目录
const userDir = path.join(app.getPath('userData'), 'Users');
const logDir = path.join(userDir, 'logs');

// 确保日志目录存在
if (!require('fs').existsSync(logDir)) {
    require('fs').mkdirSync(logDir, { recursive: true });
}

// 创建日志实例
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message }) => {
            // 获取调用堆栈信息
            const stack = new Error().stack.split('\n');
            // 解析调用位置（跳过第一行 Error 信息和第二行 logger.js 内部调用）
            const callerLine = stack[2].trim();
            // 提取文件名和行号
            const matches = callerLine.match(/\/([^/]+):(\d+):(\d+)\)?$/);
            const filename = matches ? matches[1] : 'unknown';
            const lineNumber = matches ? matches[2] : 'unknown';
            return `[${timestamp}] ${level} (${filename}:${lineNumber}): ${message}`;
        })
    ),
    transports: [
        new DailyRotateFile({
            filename: path.join(logDir, 'application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m',
            maxFiles: '7d',
            zippedArchive: true
        }),
        new winston.transports.Console()
    ]
});

module.exports = logger;