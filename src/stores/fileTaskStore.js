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
                !['completed', 'cancelled', 'failed', 'interrupted'].includes(t.status)
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
                !['completed', 'cancelled', 'failed', 'interrupted'].includes(t.status)
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
        async clearCompleted() {
            if (!window.api?.fileTask) return;
            try {
                const result = await window.api.fileTask.clearCompleted();
                if (result.success) {
                    Object.keys(this.tasks).forEach((id) => {
                        const task = this.tasks[id];
                        if (['completed', 'cancelled', 'failed', 'interrupted'].includes(task.status)) {
                            delete this.tasks[id];
                        }
                    });
                }
            } catch (err) {
                console.error('[fileTaskStore] clearCompleted failed:', err);
            }
        },

        /**
         * 清空所有任务
         */
        async clearAll() {
            if (!window.api?.fileTask) return;
            try {
                const result = await window.api.fileTask.clearAll();
                if (result.success) {
                    this.tasks = {};
                }
            } catch (err) {
                console.error('[fileTaskStore] clearAll failed:', err);
            }
        },

        /**
         * 删除单个任务
         * @param {string} taskId - 任务ID
         */
        async deleteTask(taskId) {
            if (!window.api?.fileTask) return;
            try {
                const result = await window.api.fileTask.deleteTask(taskId);
                if (result.success) {
                    delete this.tasks[taskId];
                }
            } catch (err) {
                console.error('[fileTaskStore] deleteTask failed:', err);
            }
        },

        /**
         * 按天数清理过期任务
         * @param {number} maxDays - 最大保留天数
         */
        async cleanupByDays(maxDays) {
            if (!window.api?.fileTask) return;
            try {
                const result = await window.api.fileTask.cleanupByDays(maxDays);
                if (result.success && result.count > 0) {
                    Object.keys(this.tasks).forEach((id) => {
                        const task = this.tasks[id];
                        const daysDiff = (Date.now() - task.createdAt) / (24 * 60 * 60 * 1000);
                        if (daysDiff > maxDays) {
                            delete this.tasks[id];
                        }
                    });
                }
                return result;
            } catch (err) {
                console.error('[fileTaskStore] cleanupByDays failed:', err);
                return { success: false };
            }
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
