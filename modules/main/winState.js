const Store = require('electron-store');
const path = require('path');

class WinState {
    constructor() {
        this.store = new Store({
            name: 'winState',
            cwd: path.join(require('electron').app.getPath('userData'), 'Users', 'data')
        });
    }

    save(appId, state, callback) {
        const key = `${appId}`;
        this.store.set(key, state);
        callback({ code: '0000', data: null, msg: '保存成功' });
    }

    load(appId, callback) {
        const key = `${appId}`;
        const state = this.store.get(key);
        callback({ code: '0000', data: state || null, msg: '加载成功' });
    }

    remove(appId, callback) {
        const key = `${appId}`;
        const state = this.store.delete(key);
        callback({ code: '0000', data: null, msg: '删除成功' });
    }
}

module.exports = new WinState();