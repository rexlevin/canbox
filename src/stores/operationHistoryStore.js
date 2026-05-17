/**
 * 操作历史 Store
 * 管理操作历史的响应式状态
 */
import { defineStore } from 'pinia';

export const useOperationHistoryStore = defineStore('operationHistory', {
    state: () => ({
        /**
         * 未读记录数
         * @type {number}
         */
        unreadCount: 0,

        /**
         * 是否显示面板
         * @type {boolean}
         */
        showPanel: false,
    }),

    actions: {
        /**
         * 添加操作记录
         * @param {Object} options - 记录选项
         * @param {string} options.type - 类型：success | error | warning | info
         * @param {string} options.message - 消息内容
         * @param {string} [options.module] - 来源模块
         * @param {Object} [options.details] - 额外详情
         */
        async addRecord(options) {
            try {
                await window.api.canboxDb.put(options);
                this.unreadCount++;
            } catch (error) {
                console.error('Failed to add operation record:', error);
            }
        },

        /**
         * 增加未读数
         */
        incrementUnread() {
            this.unreadCount++;
        },

        /**
         * 清除未读数
         */
        clearUnread() {
            this.unreadCount = 0;
        },

        /**
         * 显示面板
         */
        openPanel() {
            this.showPanel = true;
            this.clearUnread();
        },

        /**
         * 关闭面板
         */
        closePanel() {
            this.showPanel = false;
        },
    },
});
