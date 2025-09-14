const Store = require('electron-store');

const { getAppDataPath } = require('../pathManager');

class ElectronStore {
    constructor() {
        this.store = new Store();
    }

    /**
     * 获取存储的值
     * @param {string} key - 存储的键
     * @returns {Promise<any>} - 返回存储的值
     */
    get(key) {
        return new Promise((resolve) => {
            const value = this.store.get(key);
            resolve(value);
        });
    }

    /**
     * 设置存储的值
     * @param {string} key - 存储的键
     * @param {any} value - 存储的值
     * @returns {Promise<void>}
     */
    set(key, value) {
        return new Promise((resolve) => {
            this.store.set(key, value);
            resolve();
        });
    }

    /**
     * 删除存储的值
     * @param {string} key - 存储的键
     * @returns {Promise<void>}
     */
    delete(key) {
        return new Promise((resolve) => {
            this.store.delete(key);
            resolve();
        });
    }

    /**
     * 清空存储
     * @returns {Promise<void>}
     */
    clear() {
        return new Promise((resolve) => {
            this.store.clear();
            resolve();
        });
    }
}

module.exports = new ElectronStore();