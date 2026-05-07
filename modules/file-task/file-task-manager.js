/**
 * 文件任务管理器
 * 核心管理器，单例模式，管理所有文件任务的生命周期
 */
const FileTaskState = require('./file-task-state');
const FileTaskQueue = require('./file-task-queue');
const FileOperation = require('./file-operation');
const FileTaskIPC = require('./file-task-ipc');
const logger = require('@modules/utils/logger');

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
        logger.info(`[FileTaskManager] createTask: 准备临时空间 type=${type}, uid=${uid}`);
        const tempPath = await this.fileOp.prepareTempSpace(type, uid);
        logger.info(`[FileTaskManager] createTask: 临时空间准备完成 ${tempPath}`);

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
            logger.info(`[FileTaskManager] 队列 ${type} 有正在执行的任务，跳过`);
            return;
        }

        // 取出下一个任务
        const task = this.queue.dequeue(type);
        if (!task) {
            logger.info(`[FileTaskManager] 队列 ${type} 没有待执行的任务`);
            return;
        }

        logger.info(`[FileTaskManager] 开始执行任务: ${task.id}, type: ${task.type}`);
        await this.executeTask(task);
    }

    /**
     * 执行任务
     * @param {Object} task - 任务对象
     */
    async executeTask(task) {
        // 确保 task 是 this.tasks 中的同一个引用
        const existingTask = this.tasks.get(task.id);
        if (existingTask !== task) {
            logger.warn(`[FileTaskManager] executeTask: 任务引用不一致，强制使用 this.tasks 中的版本`);
            task = existingTask;
        }

        // 更新状态为 preparing
        task.status = FileTaskState.PREPARING;
        task.startedAt = Date.now();
        this.pushTaskUpdate(task);

        try {
            // 查找对应的执行器
            const executor = this.executors.get(task.type);
            logger.info(`[FileTaskManager] 查找 executor: type=${task.type}, found=${!!executor}, registered executors: ${Array.from(this.executors.keys()).join(', ')}`);
            
            if (!executor) {
                task.status = FileTaskState.FAILED;
                task.error = `No executor registered for task type: ${task.type}`;
                this.pushTaskUpdate(task);
                return;
            }

            // 调用执行器
            logger.info(`[FileTaskManager] 开始调用 executor: ${task.type}`);
            await executor(task);
            logger.info(`[FileTaskManager] executor 执行完成: ${task.type}, 当前状态: ${task.status}`);

            // 执行器成功，完成任务
            logger.info(`[FileTaskManager] 准备调用 completeTask: ${task.id}`);
            await this.completeTask(task);
            logger.info(`[FileTaskManager] completeTask 执行完成: ${task.id}`);
        } catch (error) {
            logger.error(`[FileTaskManager] executor 执行失败: ${error.message}`, error.stack);
            await this.failTask(task, error.message || error);
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
     * @param {Object} task - 任务对象
     */
    async completeTask(task) {
        if (!task || !task.id) {
            logger.error(`[FileTaskManager] completeTask: 任务不存在`);
            return;
        }

        logger.info(`[FileTaskManager] completeTask: 开始完成任务 ${task.id}`);
        task.status = 'completed';  // 直接用字符串，避免模块缓存问题
        task.completedAt = Date.now();
        task.progress = 100;
        task.progressText = 'Completed';

        // 清理临时目录
        logger.info(`[FileTaskManager] completeTask: 清理临时目录 ${task.tempPath}`);
        await this.fileOp.cleanupTemp(task.tempPath);

        logger.info(`[FileTaskManager] completeTask: 推送任务更新, status=${task.status}`);
        this.pushTaskUpdate(task);

        // 继续处理队列
        await this.processQueue(task.type);
    }

    /**
     * 任务失败
     * @param {Object} task - 任务对象
     * @param {string} error - 错误信息
     */
    async failTask(task, error) {
        if (!task || !task.id) {
            logger.error(`[FileTaskManager] failTask: 任务不存在`);
            return;
        }

        // 再次确认 task 引用
        const currentTask = this.tasks.get(task.id);
        logger.info(`[FileTaskManager] failTask: 开始, task.id=${task.id}, task===currentTask=${task === currentTask}, currentTask.status=${currentTask ? currentTask.status : 'N/A'}`);
        
        logger.info(`[FileTaskManager] failTask: 任务失败 ${task.id}, error: ${error}`);
        logger.info(`[FileTaskManager] failTask: FileTaskState.FAILED = ${FileTaskState.FAILED}, typeof = ${typeof FileTaskState.FAILED}`);
        currentTask.status = 'failed';  // 直接用字符串，避免模块缓存问题
        logger.info(`[FileTaskManager] failTask: 赋值后 status = ${currentTask.status}`);
        currentTask.completedAt = Date.now();
        currentTask.error = error;
        currentTask.progressText = 'Failed';

        // 清理临时目录
        await this.fileOp.cleanupTemp(currentTask.tempPath);

        logger.info(`[FileTaskManager] failTask: 推送任务更新, status=${currentTask.status}, error=${currentTask.error}`);
        this.pushTaskUpdate(currentTask);

        // 继续处理队列
        await this.processQueue(currentTask.type);
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
