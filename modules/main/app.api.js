const { ipcRenderer } = require("electron");

/**
 * 通过 ipc 请求主线程中的 db-api，ipc 消息名为：msg-db
 *
 * @param {String} type api操作方法
 * @param {Object} param api操作请求数据，要求json格式
 * @returns {Object} api操作应答内容
 */
const ipcSendSyncDB = (type, param) => {
    if(!window.appId) {
        throw new Error('appId is not set');
    }
    let returnValue = ipcRenderer.sendSync('msg-db', {
        type,
        param,
        appId: window.appId
    });
    // console.info('returnValue in app.api==', returnValue);
    if (returnValue instanceof Error) throw returnValue;
    return JSON.parse(returnValue);
};

/**
 * 通过 ipc 请求主线程中的 window-api，ipc 消息名为：msg-window
 *
 * @param {String} type api操作方法
 * @param {Object} param api操作请求数据，要求json格式
 * @returns {Object} api操作应答内容
 */
const ipcSendSyncCreateWindow = (options, url, devTools) => {
    if(!window.appId) {
        throw new Error('appId is not set');
    }
    let returnValue = ipcRenderer.sendSync('msg-createWindow', {
        options,
        url,
        devTools,
        appId: window.appId
    });
    if (returnValue instanceof Error) throw returnValue;
    return JSON.parse(returnValue);
};

const db = {
    put: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('put', param);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    },
    bulkDocs: (docs) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('bulkDocs', docs);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    },
    get: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('get', param);
            "0000" === ret.code? resolve(ret.data) : reject(ret.msg);
        })
    },
    getSync: (param) => {
        const ret = ipcSendSyncDB('get', param);
        return "0000" === ret.code ? ret.data : null;
    },
    remove: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('remove', param);
            "0000" === ret.code? resolve(ret.data) : reject(ret.msg);
        })
    }
}

const win = {
    createWindow: (options, url, devTools) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncCreateWindow(options, url, devTools);
            console.info('ret: ', ret);
            null !== ret ? resolve(ret) : reject(null);
        });
    },
}

/**
 * 对 app 暴露的 api
 */
window.appId = null;
window.canbox = {
    hooks: {},
    hello: () => {
        console.info('hello, hope you have a nice day');
        // console.info('hello, appId: ', appId);
    },
    db,
    win
};

// 从 additionalArguments 读取 ID（主进程传递）
for (const arg of process.argv) {
    if (arg.startsWith('--app-id=')) {
        appId = arg.split('=')[1];
        break;
    }
}
