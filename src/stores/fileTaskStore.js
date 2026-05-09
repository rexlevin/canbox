/**
 * 文件任务 Store
 * 管理文件任务的响应式状态
 */
import { defineStore } from 'pinia';

export const useFileTaskStore = defineStore('fileTask', {
    state: () => ({
        /**
         * 任务列表
         * @type {Object.<string, Object>}
         */
        tasks: {},
    }),

    getters: {
        /**
         * 获取任务列表
         * @returns {Object[]}
         */
        taskList: (state) => Object.values(state.tasks),

        /**
         * 获取运行中的任务
         * @returns {Object[]}
         */
        activeTasks: (state) =>
            Object.values(state.tasks).filter((t) =>
                !['completed', 'cancelled', 'failed'].includes(t.status)
            ),

        /**
         * 按类型获取任务
         * @param {string} type - 任务类型
         * @returns {Object[]}
         */
        tasksByType: (state) => (type) =>
            Object.values(state.tasks).filter((t) => t.type === type),

        /**
         * 是否有运行中的任务
         * @returns {boolean}
         */
        hasActiveTasks: (state) =>
            Object.values(state.tasks).some((t) =>
                !['completed', 'cancelled', 'failed'].includes(t.status)
            ),

        /**
         * 获取进行中的下载任务
         * @returns {Object[]}
         */
        downloadingTasks: (state) =>
            Object.values(state.tasks).filter((t) => t.status === 'downloading'),

        /**
         * 获取失败的任务
         * @returns {Object[]}
         */
        failedTasks: (state) =>
            Object.values(state.tasks).filter((t) => t.status === 'failed'),
    },

    actions: {
        /**
         * 更新任务
         * @param {Object} task - 任务对象
         */
        updateTask(task) {
            this.tasks[task.id] = task;
        },

        /**
         * 批量更新任务
         * @param {Object[]} tasks - 任务列表
         */
        updateTasks(tasks) {
            tasks.forEach((task) => {
                this.tasks[task.id] = task;
            });
        },

        /**
         * 移除任务
         * @param {string} taskId - 任务ID
         */
        removeTask(taskId) {
            delete this.tasks[taskId];
        },

        /**
         * 清空已完成的任务
         */
        clearCompleted() {
            Object.keys(this.tasks).forEach((id) => {
                const task = this.tasks[id];
                if (['completed', 'cancelled', 'failed'].includes(task.status)) {
                    delete this.tasks[id];
                }
            });
        },

        /**
         * 清空所有任务
         */
        clearAll() {
            this.tasks = {};
        },

        /**
         * 获取单个任务
         * @param {string} taskId - 任务ID
         * @returns {Object|undefined}
         */
        getTask(taskId) {
            return this.tasks[taskId];
        },
    },
});
