const { ipcRenderer } = require("electron");

// var appId = null;

/**
 * 通过 ipc 请求主线程中的 db-api，ipc 消息名为：msg-db
 * 
 * @param {String} type api操作方法
 * @param {JSON} param api操作请求数据，要求json格式
 * @returns api操作应答内容
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
    if (returnValue instanceof Error) throw returnValue;
    return returnValue;
};

const db = {
    // init: () => {
    //     ipcSendSyncDB('init', {});
    // },
    putSync: (param) => {
        return ipcSendSyncDB('put', param);
    },
    put: (param) => {
        return new Promise((resolve, reject) => {
            //
        });
    },
    get: (param) => {
        return ipcSendSyncDB('get', param);
    }
}

/**
 * 对 app 暴露的 api
 */
window.canbox = {
    hooks: {},
    // onAppLoad: (id) => {
    //     console.info('id:', id);
    // },
    hello: (name) => {
        name = name || 'world'
        console.info(`hello, ${name}`);
    },
    db
};
