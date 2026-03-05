const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const logger = require('@modules/utils/logger');

/**
 * 日志相关的 IPC 处理器
 */

// 获取日志列表
ipcMain.handle('get-logs', async (event, options = {}) => {
    try {
        const { source = 'app', count = 100 } = options;
        const logs = logger.getRecentLogs(count);

        return {
            success: true,
            logs: logs.filter(log => log.category === source || source === 'all')
        };
    } catch (error) {
        logger.error('Failed to get logs: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 获取最近 N 条日志
ipcMain.handle('get-recent-logs', async (event, count = 100) => {
    try {
        const logs = logger.getRecentLogs(count);
        return { success: true, logs };
    } catch (error) {
        logger.error('Failed to get recent logs: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 获取指定 ID 之后的日志
ipcMain.handle('get-logs-since', async (event, id) => {
    try {
        const logs = logger.getLogsSince(id);
        return { success: true, logs };
    } catch (error) {
        logger.error('Failed to get logs since: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 获取日志文件列表
ipcMain.handle('get-log-files', async (event, source = 'app') => {
    try {
        const files = logger.getLogFiles(source);
        return { success: true, files };
    } catch (error) {
        logger.error('Failed to get log files: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 导出日志
ipcMain.handle('export-logs', async (event, format = 'txt', range = {}) => {
    try {
        const { source = 'app', startDate, endDate } = range;
        const files = logger.getLogFiles(source);

        // 根据日期范围筛选文件
        let selectedFiles = files;
        if (startDate || endDate) {
            selectedFiles = files.filter(file => {
                const fileDate = new Date(file.date);
                if (startDate && fileDate < new Date(startDate)) return false;
                if (endDate && fileDate > new Date(endDate)) return false;
                return true;
            });
        }

        // 选择保存路径
        const { filePath } = await dialog.showSaveDialog({
            title: 'Export Logs',
            defaultPath: `logs_${source}_${new Date().toISOString().split('T')[0]}.${format}`,
            filters: [
                { name: format.toUpperCase() + ' Files', extensions: [format] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!filePath) {
            return { success: false, error: 'Export cancelled' };
        }

        // 读取并合并日志内容
        let content = '';
        for (const file of selectedFiles) {
            const fileContent = fs.readFileSync(file.path, 'utf-8');
            content += `=== ${file.filename} ===\n${fileContent}\n\n`;
        }

        // 根据格式转换
        if (format === 'json') {
            const logs = logger.getRecentLogs(10000);
            const filteredLogs = logs.filter(log =>
                log.category === source || source === 'all'
            );
            content = JSON.stringify(filteredLogs, null, 2);
        }

        fs.writeFileSync(filePath, content, 'utf-8');

        logger.info(`Logs exported to: ${filePath}`);
        return { success: true, filePath };
    } catch (error) {
        logger.error('Failed to export logs: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 清空日志文件
ipcMain.handle('clear-logs', async (event, source = 'app') => {
    try {
        const { result: confirmed } = await dialog.showMessageBox({
            type: 'warning',
            buttons: ['Cancel', 'Clear'],
            defaultId: 0,
            title: 'Clear Logs',
            message: 'Are you sure you want to clear all logs?',
            detail: 'This action cannot be undone.'
        });

        if (confirmed !== 1) {
            return { success: false, error: 'Clear cancelled' };
        }

        const logDir = path.join(process.cwd(), 'logs');
        const prefix = source === 'monitor' ? 'monitor' : 'app';

        const files = fs.readdirSync(logDir).filter(file =>
            file.startsWith(prefix) && file.endsWith('.log')
        );

        files.forEach(file => {
            fs.writeFileSync(path.join(logDir, file), '', 'utf-8');
        });

        logger.info(`Cleared logs for: ${source}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to clear logs: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 清除内存缓存
ipcMain.handle('clear-cache', async () => {
    try {
        logger.clearCache();
        logger.info('Log cache cleared');
        return { success: true };
    } catch (error) {
        logger.error('Failed to clear cache: ' + error.message);
        return { success: false, error: error.message };
    }
});

// 清理超过保留天数的日志
ipcMain.handle('cleanup-old-logs', async (event, days = 30) => {
    try {
        // 预览将要删除的文件
        const files = logger.getLogFiles('app').concat(logger.getLogFiles('monitor'));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const filesToDelete = files.filter(file => {
            const fileDate = new Date(file.date);
            return fileDate < cutoffDate;
        });

        if (filesToDelete.length === 0) {
            return { success: true, deletedCount: 0, deletedFiles: [] };
        }

        // 显示确认对话框
        const { result: confirmed } = await dialog.showMessageBox({
            type: 'warning',
            buttons: ['Cancel', 'Delete'],
            defaultId: 0,
            title: 'Cleanup Old Logs',
            message: `Delete ${filesToDelete.length} log files older than ${days} days?`,
            detail: filesToDelete.map(f => f.filename).join('\n')
        });

        if (confirmed !== 1) {
            return { success: false, error: 'Cleanup cancelled' };
        }

        // 执行清理
        const result = logger.cleanupOldLogs(days);
        logger.info(`Cleaned up ${result.deletedCount} old log files`);

        return { success: true, ...result };
    } catch (error) {
        logger.error('Failed to cleanup old logs: ' + error.message);
        return { success: false, error: error.message };
    }
});
