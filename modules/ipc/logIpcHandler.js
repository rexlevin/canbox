const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('@modules/utils/logger');

/**
 * 日志相关的 IPC 处理器
 */

// 解析日志文件内容
function parseLogContent(content, source) {
    const lines = content.split('\n').filter(line => line.trim());
    const logs = [];

    lines.forEach(line => {
        // 格式1: [2024-01-15 14:30:45] [INFO] [file.js:123] : message
        let match = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] (\[.+\]) : (.+)$/);
        if (match) {
            const [, timestamp, level, location, message] = match;
            const now = new Date(timestamp);
            logs.push({
                id: `${now.getTime()}${now.getMilliseconds().toString().padStart(3, '0')}`,
                level: level.toLowerCase(),  // 转换为小写，与前端一致
                message: `${location} : ${message}`,
                timestamp: now.toISOString(),
                category: source
            });
            return;
        }

        // 格式2: [2024-01-15 14:30:45] [INFO] [file.js:123] message (没有冒号)
        match = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] (\[.+\])\s+(.+)$/);
        if (match) {
            const [, timestamp, level, location, message] = match;
            const now = new Date(timestamp);
            logs.push({
                id: `${now.getTime()}${now.getMilliseconds().toString().padStart(3, '0')}`,
                level: level.toLowerCase(),  // 转换为小写，与前端一致
                message: `${location} ${message}`,
                timestamp: now.toISOString(),
                category: source
            });
        }
    });

    return logs;
}

// 获取日志列表
ipcMain.handle('get-logs', async (event, options = {}) => {
    try {
        const { source = 'app', count = 100, date, afterId } = options;

        console.log('[get-logs] options:', options);

        let logs;

        if (date && date !== 'today') {
            // 从文件读取指定日期的日志
            console.log(`[get-logs] Reading logs from file for date: ${date}, source: ${source}`);
            logs = logger.getLogsFromFile(date, source);
            console.log(`[get-logs] Read ${logs.length} logs from file for date: ${date}`);
        } else {
            // 今天的日志：从文件读取
            console.log(`[get-logs] Reading logs for today, source: ${source}`);
            logs = logger.getLogsFromFile('today', source);
            console.log(`[get-logs] File logs count: ${logs.length}`);
        }

        // 按 source 过滤
        let filteredLogs = logs.filter(log => log.category === source || source === 'all');
        console.log(`[get-logs] Filtered logs count: ${filteredLogs.length}`);

        // 如果提供了 afterId，只返回 ID 更大的日志
        if (afterId) {
            filteredLogs = filteredLogs.filter(log => log.id > afterId);
            console.log(`[get-logs] After filtering by afterId (${afterId}): ${filteredLogs.length} logs`);
        }

        return {
            success: true,
            logs: filteredLogs
        };
    } catch (error) {
        console.error('[get-logs] Error:', error);
        logger.error('Failed to get logs: ' + error.message);
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
            let fileContent;
            if (file.compressed) {
                // 压缩文件需要使用 zlib 解压
                const zlib = require('zlib');
                fileContent = zlib.gunzipSync(fs.readFileSync(file.path)).toString('utf-8');
            } else {
                fileContent = fs.readFileSync(file.path, 'utf-8');
            }
            content += `=== ${file.filename} ===\n${fileContent}\n\n`;
        }

        // 根据格式转换
        if (format === 'json') {
            // 从文件中读取日志并转换为 JSON
            const allLogs = [];
            for (const file of selectedFiles) {
                if (file.compressed) {
                    const zlib = require('zlib');
                    const fileContent = zlib.gunzipSync(fs.readFileSync(file.path)).toString('utf-8');
                    const logs = parseLogContent(fileContent, source);
                    allLogs.push(...logs);
                } else {
                    const fileContent = fs.readFileSync(file.path, 'utf-8');
                    const logs = parseLogContent(fileContent, source);
                    allLogs.push(...logs);
                }
            }
            content = JSON.stringify(allLogs, null, 2);
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
