const { getWinStateStore } = require('@modules/main/storageManager');

class WinState {
    constructor() {
        this.store = getWinStateStore();
    }

    save(appId, state, callback) {
        const key = `${appId}`;
        this.store.set(key, state);
        callback({ success: true, data: null, msg: '保存成功' });
    }

    load(appId, callback) {
        const key = `${appId}`;
        const state = this.store.get(key);
        callback({ success: true, data: state || null, msg: '加载成功' });
    }

    remove(appId, callback) {
        const key = `${appId}`;
        this.store.delete(key);
        callback({ success: true, data: null, msg: '删除成功' });
    }
}

module.exports = new WinState();