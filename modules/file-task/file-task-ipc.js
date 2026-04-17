/**
 * 文件任务 IPC 通信
 * 注册 IPC handlers，推送任务更新到前端
 */
const { ipcMain, BrowserWindow } = require('electron');

let taskManager = null;

/**
 * 初始化 IPC
 * @param {FileTaskManager} manager - 任务管理器实例
 */
function initialize(manager) {
    taskManager = manager;
    register();
}

/**
 * 获取主窗口
 * @returns {BrowserWindow|null}
 */
function getMainWindow() {
    const windows = BrowserWindow.getAllWindows();
    return windows.length > 0 && !windows[0].isDestroyed() ? windows[0] : null;
}

/**
 * 推送任务更新到前端
 * @param {Object} task - 任务对象
 */
function pushTaskUpdate(task) {
    const win = getMainWindow();
    if (win) {
        win.webContents.send('file-task-update', task);
    }
}

/**
 * 推送任务列表到前端
 * @param {Object[]} tasks - 任务列表
 */
function pushTaskList(tasks) {
    const win = getMainWindow();
    if (win) {
        win.webContents.send('file-task-list', tasks);
    }
}

/**
 * 注册 IPC handlers
 */
function register() {
    // 创建任务
    ipcMain.handle('file-task-create', async (event, type, uid, options) => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized' };
        }
        try {
            const task = await taskManager.createTask(type, uid, options || {});
            return { success: true, task };
        } catch (error) {
            return { success: false, error: error.message || error };
        }
    });

    // 取消任务
    ipcMain.handle('file-task-cancel', async (event, taskId) => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized' };
        }
        try {
            await taskManager.cancelTask(taskId);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message || error };
        }
    });

    // 重试任务
    ipcMain.handle('file-task-retry', async (event, taskId) => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized' };
        }
        try {
            const task = await taskManager.retryTask(taskId);
            return { success: true, task };
        } catch (error) {
            return { success: false, error: error.message || error };
        }
    });

    // 获取所有任务
    ipcMain.handle('file-task-get-all', async () => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized', tasks: [] };
        }
        try {
            const tasks = taskManager.getAllTasks();
            return { success: true, tasks };
        } catch (error) {
            return { success: false, error: error.message || error, tasks: [] };
        }
    });

    // 获取运行中的任务
    ipcMain.handle('file-task-get-running', async () => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized', tasks: [] };
        }
        try {
            const tasks = taskManager.getRunningTasks();
            return { success: true, tasks };
        } catch (error) {
            return { success: false, error: error.message || error, tasks: [] };
        }
    });

    // 获取任务统计
    ipcMain.handle('file-task-get-stats', async () => {
        if (!taskManager) {
            return { success: false, error: 'TaskManager not initialized', stats: {} };
        }
        try {
            const stats = taskManager.queue.getStats();
            return { success: true, stats };
        } catch (error) {
            return { success: false, error: error.message || error, stats: {} };
        }
    });

    // 请求推送完整列表
    ipcMain.handle('file-task-request-list', async () => {
        if (!taskManager) {
            return;
        }
        pushTaskList(taskManager.getAllTasks());
    });
}

module.exports = {
    initialize,
    pushTaskUpdate,
    pushTaskList,
    register,
};
