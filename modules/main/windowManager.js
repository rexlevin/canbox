const { BrowserWindow } = require('electron');

/**
 * 窗口管理模块
 * 维护全局的窗口状态和父子关系
 */
const windowManager = {
    // 存放所有打开的窗口
    appMap: new Map(),

    // 维护窗口父子关系
    windowRelations: new Map(),

    /**
     * 添加窗口到 appMap
     * @param {string} id - 窗口 ID
     * @param {BrowserWindow} win - 窗口实例
     */
    addWindow: function(id, win) {
        this.appMap.set(id, win);
    },

    /**
     * 从 appMap 中移除窗口
     * @param {string} id - 窗口 ID
     */
    removeWindow: function(id) {
        this.appMap.delete(id);
    },

    /**
     * 检查窗口是否存在
     * @param {string} id - 窗口 ID
     * @returns {boolean} - 是否存在
     */
    hasWindow: function(id) {
        return this.appMap.has(id);
    },

    /**
     * 获取窗口实例
     * @param {string} id - 窗口 ID
     * @returns {BrowserWindow} - 窗口实例
     */
    getWindow: function(id) {
        return this.appMap.get(id);
    },

    /**
     * 添加窗口父子关系
     * @param {string} parentId - 父窗口 ID
     * @param {string} childId - 子窗口 ID
     */
    addRelation: function(parentId, childId) {
        if (!this.windowRelations.has(parentId)) {
            this.windowRelations.set(parentId, []);
        }
        this.windowRelations.get(parentId).push(childId);
    },

    /**
     * 移除窗口父子关系
     * @param {string} parentId - 父窗口 ID
     */
    removeRelation: function(parentId) {
        this.windowRelations.delete(parentId);
    },

    /**
     * 移除特定子窗口的父子关系
     * @param {string} parentId - 父窗口 ID
     * @param {string} childId - 子窗口 ID
     */
    removeChildRelation: function(parentId, childId) {
        if (this.windowRelations.has(parentId)) {
            const children = this.windowRelations.get(parentId);
            const index = children.indexOf(childId);
            if (index !== -1) {
                children.splice(index, 1);
                if (children.length === 0) {
                    this.windowRelations.delete(parentId);
                }
            }
        }
    },

    /**
     * 获取子窗口列表
     * @param {string} parentId - 父窗口 ID
     * @returns {Array} - 子窗口 ID 数组
     */
    getChildWindows: function(parentId) {
        return this.windowRelations.get(parentId) || [];
    }
};

module.exports = windowManager;