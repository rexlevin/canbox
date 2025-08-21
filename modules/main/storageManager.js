const Store = require('electron-store');

/**
 * 统一管理 electron-store 的配置和操作
 */
class Storage {
    constructor(options = {}) {
        this.store = new Store({
            name: options.name || 'default',
            cwd: options.cwd || 'Users',
            encryptionKey: options.encryptionKey
        });
    }

    /**
     * 获取存储的值
     * @param {string} key
     * @param {any} defaultValue
     * @returns {any}
     */
    get(key, defaultValue) {
        return this.store.get(key, defaultValue);
    }

    /**
     * 设置存储的值
     * @param {string} key
     * @param {any} value
     */
    set(key, value) {
        this.store.set(key, value);
    }

    /**
     * 删除存储的值
     * @param {string} key
     */
    delete(key) {
        this.store.delete(key);
    }

    /**
     * 检查键是否存在
     * @param {string} key
     * @returns {boolean}
     */
    has(key) {
        return this.store.has(key);
    }
}

/**
 * 获取 winState 存储实例
 * @returns {Storage}
 */
function getWinStateStore() {
    return new Storage({
        name: 'winState',
        cwd: 'Users/data'
    });
}

/**
 * 获取 apps 存储实例
 * @returns {Storage}
 */
function getAppsStore() {
    return new Storage({
        name: 'apps',
        cwd: 'Users'
    });
}

/**
 * 获取 appsDev 存储实例
 * @returns {Storage}
 */
function getAppsDevStore() {
    return new Storage({
        name: 'appsDev',
        cwd: 'Users'
    });
}

/**
 * 获取 repos 存储实例
 * @returns {Storage}
 */
function getReposStore() {
    return new Storage({
        name: 'repos',
        cwd: 'Users'
    });
}

module.exports = {
    getWinStateStore,
    getAppsStore,
    getAppsDevStore,
    getReposStore
};
