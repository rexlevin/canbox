const { ipcRenderer } = require("electron");

/**
 * 通过 ipc 请求主线程中的 db-api，ipc 消息名为：msg-db
 *
 * @param {String} type api操作方法
 * @param {Object} param api操作请求数据，要求json格式
 * @returns {Object} api操作应答内容
 */
const ipcSendSyncDB = (type, param) => {
    if (!window.appId) {
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
const ipcSendSyncCreateWindow = (options, params) => {
    if (!window.appId) {
        throw new Error('appId is not set');
    }
    let returnValue = ipcRenderer.sendSync('msg-createWindow', {
        options,
        params,
        appId: window.appId
    });
    if (returnValue instanceof Error) throw returnValue;
    return JSON.parse(returnValue);
};

/**
 * 通过 ipc 请求主线程中的 dialog-api，ipc 消息名为：msg-dialog
 *
 * @param {String} type api操作方法
 * @param {Object} options api操作请求数据，要求json格式
 * @returns {Object} api操作应答内容
 */
const ipcSendSyncDialog = (type, options) => {
    if (!window.appId) {
        throw new Error('appId is not set');
    }
    let returnValue = ipcRenderer.sendSync('msg-dialog', {
        type,
        options,
        appId: window.appId
    });
    if (returnValue instanceof Error) throw returnValue;
    return JSON.parse(returnValue);
};

const ipcSendNotification = (options) => {
    if (!window.appId) {
        throw new Error('appId is not set');
    }
    ipcRenderer.send('msg-notification', {
        options,
        appId: window.appId
    });
};

/**
 * 发送 IPC 消息到主进程，操作 electronStore
 * @param {string} type - 操作类型，支持 'get'、'set'、'delete'、'clear'
 * @param {object} param - 参数对象
 * @param {string} param.key - 存储的键
 * @param {any} [param.value] - 存储的值（仅 'set' 操作需要）
 * @returns {object} - 返回操作结果，格式为 { code: string, data: any }
 * @throws {Error} - 如果 appId 未设置或 IPC 通信失败
 */
const ipcSendElectronStore = (type, param) => {
    if (!window.appId) {
        throw new Error('appId is not set');
    }
    let returnValue = ipcRenderer.sendSync('msg-electronStore', {
        type,
        param,
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
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        })
    },
    getSync: (param) => {
        const ret = ipcSendSyncDB('get', param);
        return "0000" === ret.code ? ret.data : null;
    },
    remove: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('remove', param);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        })
    }
}

const dialog = {
    /**
     * 打开文件对话框
     * @param {Object} options - 对话框配置
     * @returns {Promise} 对话框结果
     */
    showOpenDialog: (options) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDialog('showOpenDialog', options);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    },
    /**
     * 打开保存对话框
     * @param {Object} options - 对话框配置
     * @returns {Promise} 对话框结果
     */
    showSaveDialog: (options) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDialog('showSaveDialog', options);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    },
    /**
     * 打开消息对话框
     * @param {Object} options - 对话框配置
     * @returns {Promise} 对话框结果
     */
    showMessageBox: (options) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDialog('showMessageBox', options);
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    }
}

const win = {
    /**
     * 
     * @param {Object} options - 窗口配置
     * @param {Object} params - 其他参数，如：{ url: '', title: '', devTools: false }
     * @returns 
     */
    createWindow: (options, params) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncCreateWindow(options, params);
            console.info('ret: ', ret);
            null !== ret ? resolve(ret) : reject(null);
        });
    },
    notification: (options) => {
        return new Promise((resolve) => {
            ipcSendNotification(options);
            resolve(); // 直接 resolve，表示通知已发送
        });
    }
};

const electronStore = {
    /**
     * 获取存储的值
     * @param {string} key - 存储的键
     * @returns {Promise<any>} - 返回存储的值
     */
    get: (key) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('get', { key });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'get',
            //     key,
            //     appId: window.appId
            // });
            "0000" === ret.code ? resolve(ret.data) : reject(ret.msg);
        });
    },

    /**
     * 设置存储的值
     * @param {string} key - 存储的键
     * @param {any} value - 存储的值
     * @returns {Promise<void>}
     */
    set: (key, value) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('set', { key, value });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'set',
            //     key,
            //     value,
            //     appId: window.appId
            // });
            "0000" === ret.code ? resolve() : reject(ret.msg);
        });
    },

    /**
     * 删除存储的值
     * @param {string} key - 存储的键
     * @returns {Promise<void>}
     */
    delete: (key) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('delete', { key });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'delete',
            //     key,
            //     appId: window.appId
            // });
            "0000" === ret.code ? resolve() : reject(ret.msg);
        });
    },

    /**
     * 清空存储
     * @returns {Promise<void>}
     */
    clear: () => {
        return new Promise((resolve, reject) => {
            const ret = ipcRenderer.sendSync('msg-electronStore', {
                type: 'clear',
                appId: window.appId
            });
            "0000" === ret.code ? resolve() : reject(ret.msg);
        });
    }
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
    win,
    dialog,
    store: electronStore
};

// 从 additionalArguments 读取 ID（主进程传递）
for (const arg of process.argv) {
    if (arg.startsWith('--app-id=')) {
        appId = arg.split('=')[1];
        break;
    }
}
