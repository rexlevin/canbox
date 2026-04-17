/**
 * 文件任务管理器
 * 核心管理器，单例模式，管理所有文件任务的生命周期
 */
const FileTaskState = require('./file-task-state');
const FileTaskQueue = require('./file-task-queue');
const FileOperation = require('./file-operation');
const FileTaskIPC = require('./file-task-ipc');

class FileTaskManager {
    /**
     * 获取单例实例
     * @returns {FileTaskManager}
     */
    static getInstance() {
        if (!FileTaskManager.instance) {
            FileTaskManager.instance = new FileTaskManager();
        }
        return FileTaskManager.instance;
    }

    constructor() {
        /**
         * 所有任务 Map
         * @type {Map<string, Object>}
         */
        this.tasks = new Map();

        /**
         * 任务队列
         * @type {FileTaskQueue}
         */
        this.queue = new FileTaskQueue();

        /**
         * 文件操作服务
         * @type {FileOperation}
         */
        this.fileOp = new FileOperation();

        /**
         * 任务执行器映射
         * @type {Map<string, Function>}
         */
        this.executors = new Map();

        // 初始化 IPC
        FileTaskIPC.initialize(this);
    }

    /**
     * 注册任务执行器
     * @param {string} type - 任务类型
     * @param {Function} executor - 执行器函数，接收 task 参数
     */
    registerExecutor(type, executor) {
        this.executors.set(type, executor);
    }

    /**
     * 创建任务
     * @param {string} type - 任务类型
     * @param {string} uid - 业务标识
     * @param {Object} options - 任务选项
     * @returns {Promise<Object>} 创建的任务
     */
    async createTask(type, uid, options = {}) {
        const id = `${type}-${uid}-${Date.now()}`;

        // 准备临时空间
        const tempPath = await this.fileOp.prepareTempSpace(type, uid);

        const task = {
            id,
            type,
            uid,
            status: FileTaskState.PENDING,
            progress: 0,
            progressText: '',
            speed: 0,
            tempPath,
            error: null,
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
            options,
        };

        this.tasks.set(id, task);
        this.pushTaskUpdate(task);
        this.enqueue(task);

        return task;
    }

    /**
     * 入队
     * @param {Object} task - 任务对象
     */
    enqueue(task) {
        this.queue.enqueue(task);
        this.processQueue(task.type);
    }

    /**
     * 处理队列
     * @param {string} type - 任务类型
     */
    async processQueue(type) {
        // 检查是否有正在执行的任务
        if (this.queue.isRunning(type, this.tasks)) {
            return;
        }

        // 取出下一个任务
        const task = this.queue.dequeue(type);
        if (!task) {
            return;
        }

        await this.executeTask(task);
    }

    /**
     * 执行任务
     * @param {Object} task - 任务对象
     */
    async executeTask(task) {
        // 更新状态为 preparing
        await this.updateStatus(task.id, FileTaskState.PREPARING);

        try {
            task.startedAt = Date.now();
            this.pushTaskUpdate(task);

            // 查找对应的执行器
            const executor = this.executors.get(task.type);
            if (executor) {
                await executor(task);
            } else {
                // 没有注册执行器，任务保持 pending 状态
                console.warn(`No executor registered for task type: ${task.type}`);
            }
        } catch (error) {
            await this.failTask(task.id, error.message || error);
        }
    }

    /**
     * 更新任务状态
     * @param {string} taskId - 任务ID
     * @param {string} status - 新状态
     */
    async updateStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.status = status;
        this.pushTaskUpdate(task);
    }

    /**
     * 更新任务进度
     * @param {string} taskId - 任务ID
     * @param {number} progress - 进度 0-100
     * @param {string} progressText - 进度文本
     * @param {number} speed - 速度 bytes/s
     */
    updateProgress(taskId, progress, progressText = '', speed = 0) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.progress = Math.min(100, Math.max(0, progress));
        task.progressText = progressText;
        task.speed = speed;

        this.pushTaskUpdate(task);
    }

    /**
     * 完成任务
     * @param {string} taskId - 任务ID
     */
    async completeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.status = FileTaskState.COMPLETED;
        task.completedAt = Date.now();
        task.progress = 100;
        task.progressText = 'Completed';

        // 清理临时目录
        await this.fileOp.cleanupTemp(task.tempPath);

        this.pushTaskUpdate(task);

        // 继续处理队列
        await this.processQueue(task.type);
    }

    /**
     * 任务失败
     * @param {string} taskId - 任务ID
     * @param {string} error - 错误信息
     */
    async failTask(taskId, error) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.status = FileTaskState.FAILED;
        task.completedAt = Date.now();
        task.error = error;
        task.progressText = 'Failed';

        this.pushTaskUpdate(task);

        // 继续处理队列
        await this.processQueue(task.type);
    }

    /**
     * 取消任务
     * @param {string} taskId - 任务ID
     */
    async cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        // 如果是运行中状态，清理临时目录
        if (FileTaskState.isRunningState(task.status)) {
            await this.fileOp.cleanupTemp(task.tempPath);
        }

        task.status = FileTaskState.CANCELLED;
        task.completedAt = Date.now();
        task.progressText = 'Cancelled';

        this.pushTaskUpdate(task);

        // 从队列中移除
        this.queue.remove(task.type, taskId);
    }

    /**
     * 重试任务
     * @param {string} taskId - 任务ID
     * @returns {Promise<Object|null>}
     */
    async retryTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return null;

        // 创建新任务
        return await this.createTask(task.type, task.uid, task.options);
    }

    /**
     * 获取任务
     * @param {string} taskId - 任务ID
     * @returns {Object|undefined}
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    /**
     * 获取所有任务
     * @returns {Object[]}
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * 按类型获取任务
     * @param {string} type - 任务类型
     * @returns {Object[]}
     */
    getTasksByType(type) {
        return this.getAllTasks().filter(t => t.type === type);
    }

    /**
     * 获取运行中的任务
     * @returns {Object[]}
     */
    getRunningTasks() {
        return this.getAllTasks().filter(t => FileTaskState.isRunningState(t.status));
    }

    /**
     * 推送任务更新到前端
     * @param {Object} task - 任务对象
     */
    pushTaskUpdate(task) {
        FileTaskIPC.pushTaskUpdate(task);
    }
}

module.exports = FileTaskManager;
