const log4js = require('log4js');
const path = require('path');
const { app } = require('electron');

// 日志文件路径
const logDir = path.join(app.getPath('userData'), 'Users', 'logs');
const logFile = path.join(logDir, 'app.log');

// 配置 log4js
log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: {
      type: 'file',
      filename: logFile,
      maxLogSize: 10485760, // 10MB
      backups: 5, // 保留5个备份
      compress: true,
      keepFileExt: true
    }
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: 'info'
    }
  },
  // 自定义格式
  layout: {
    type: 'pattern',
    pattern: '%[[%d{yyyy-MM-dd hh:mm:ss}] [%p] %f:%l%] - %m'
  }
});

// 创建 logger 实例
const logger = log4js.getLogger();

// 导出与原接口兼容的 logger
module.exports = {
  info: (message) => logger.info(message),
  error: (message) => logger.error(message),
  warn: (message) => logger.warn(message),
  debug: (message) => logger.debug(message)
};