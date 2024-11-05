const { ipcRenderer } = require("electron");

// let appId = null;

/**
 * 通过 ipc 请求主线程中的 db-api，ipc 消息名为：msg-db
 * 
 * @param {String} type api操作方法
 * @param {JSON} data api操作请求数据，要求json格式
 * @returns api操作应答内容
 */
const ipcSendSyncDB = (type, data) => {
    const returnValue = ipcRenderer.sendSync('msg-db', {
        type,
        data,
    });
    if (returnValue instanceof Error) throw returnValue;
    return returnValue;
};

const db = {
    init: (name) => {
        ipcSendSyncDB('init', {});
    }
}

/**
 * 对 app 暴露的 api
 */
window.canbox = {
    hooks: {},
    __event__: {},
    // onAppLoad: (args) => {
    //     console.info('args:', args);
    // },
    hello: () => {
        console.info('appId: ', appId);
        console.info('hello world');
        console.info('appId: ' + appId);
    },
    db
};
