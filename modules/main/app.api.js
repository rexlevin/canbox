const { ipcRenderer } = require("electron");

// var appId = null;

/**
 * 通过 ipc 请求主线程中的 db-api，ipc 消息名为：msg-db
 * 
 * @param {String} type api操作方法
 * @param {JSON} data api操作请求数据，要求json格式
 * @returns api操作应答内容
 */
const ipcSendSyncDB = (type, data) => {
    let returnValue = ipcRenderer.sendSync('msg-db', {
        type,
        data,
        appId: window.appId
    });
    if (returnValue instanceof Error) throw returnValue;
    return returnValue;
};

const db = {
    init: (data) => {
        // console.info('window = ', window);
        // console.info('window.appId = ', window.appId);
        // setTimeout("console.info('window.appId = ', window.appId)", 100);
        ipcSendSyncDB('init', data);
    }
}

/**
 * 对 app 暴露的 api
 */
window.canbox = {
    hooks: {},
    onAppLoad: (id) => {
        console.info('id:', id);
    },
    hello: (param) => {
        param = param || 'world'
    },
    db
};
