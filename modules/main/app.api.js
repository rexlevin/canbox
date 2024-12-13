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
    // console.info('returnValue in app.api==', returnValue);
    if (returnValue instanceof Error) throw returnValue;
    return JSON.parse(returnValue);
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
            const ret = ipcSendSyncDB('put', param);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    },
    get: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('get', param);
            "0000" === ret.code? resolve(ret.data) : reject(ret.msg);
        })
    },
    remove: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('remove', param);
            "0000" === ret.code? resolve(ret.data) : reject(ret.msg);
        })
    }
}

/**
 * 对 app 暴露的 api
 */
window.canbox = {
    hooks: {},
    hello: (name) => {
        name = name || 'world'
        console.info(`hello, ${name}`);
    },
    db
};
