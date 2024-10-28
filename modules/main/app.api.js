const { ipcRenderer } = require("electron");

/**
 * 通过 ipc 请求主线程中的 api，ipc 消息名为：msg-trigger
 * 
 * @param {String} method api操作方法
 * @param {JSON} data api操作请求数据，要求json格式
 * @returns api操作应答内容
 */
const ipcSendSync = (method, data) => {
    const returnValue = ipcRenderer.sendSync('msg-trigger', {
        method,
        data,
    });
    if (returnValue instanceof Error) throw returnValue;
    return returnValue;
};

const db = {
    init: (name) => {
        ipcSendSync('init', {});
    }
}

/**
 * 对 app 暴露的 api
 */
window.canbox = {
    hooks: {},
    __event__: {},
    hello: () => {
        console.info('hello world');
    },
    db
};
