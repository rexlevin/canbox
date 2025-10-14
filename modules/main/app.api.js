const { ipcRenderer } = require("electron");

// 注册窗口关闭回调
let __closeCallback = null;

/**
 * 注册窗口关闭时的回调函数
 * @param {Function} callback - 窗口关闭时执行的回调函数
 */
const registerCloseCallback = (callback) => {
    __closeCallback = callback;
};

// 监听窗口关闭事件
ipcRenderer.on('window-close-callback', () => {
    if (__closeCallback) {
        try {
            __closeCallback();
        } catch (e) {
            console.error('Error executing close callback:', e);
        }
    }
});

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
    console.info('returnValue in app.api==', returnValue);
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
 * @returns {object} - 返回操作结果，格式为 { success: boolean, data: any }
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
    /**
     * 新增或更新文档
     * @param {object} param - 文档对象，必须包含 `_id` 字段
     * @returns {Promise<any>} - 返回操作结果，成功时返回文档数据，失败时返回错误信息
     * @example
     * canbox.db.put({ _id: 'doc1', name: 'test' })
     *   .then(data => console.log(data))
     *   .catch(err => console.error(err));
     */
    put: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('put', param);
            ret.success ? resolve(ret.data) : reject(ret.msg);
        });
    },
    /**
     * 批量新增或更新文档
     * @param {Array<object>} docs - 文档数组，每个文档必须包含 `_id` 字段
     * @returns {Promise<Array<any>>} - 返回操作结果数组，成功时返回文档数据，失败时返回错误信息
     * @example
     * canbox.db.bulkDocs([{ _id: 'doc1', name: 'test1' }, { _id: 'doc2', name: 'test2' }])
     *   .then(data => console.log(data))
     *   .catch(err => console.error(err));
     */
    bulkDocs: (docs) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('bulkDocs', docs);
            ret.success ? resolve(ret.data) : reject(ret.msg);
        });
    },
    /**
     * 获取文档
     * @param {object} param - 查询参数，必须包含 `_id` 字段
     * @returns {Promise<any>} - 返回查询结果，成功时返回文档数据，失败时返回错误信息
     * @example
     * canbox.db.get({ _id: 'doc1' })
     *   .then(data => console.log(data))
     *   .catch(err => console.error(err));
     */
    get: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('get', param);
            ret.success ? resolve(ret.data) : reject(ret.msg);
        })
    },
    /**
     * 同步获取文档
     * @param {object} param - 查询参数，必须包含 `_id` 字段
     * @returns {any|null} - 返回查询结果，成功时返回文档数据，失败时返回 null
     * @example
     * const doc = canbox.db.getSync({ _id: 'doc1' });
     * console.log(doc);
     */
    getSync: (param) => {
        const ret = ipcSendSyncDB('get', param);
        console.log('ret in app.api.js==', ret);
        console.log('ret in app.api.js==ret.success: ', ret.success);
        return ret.success ? ret.data : null;
    },
    /**
     * 删除文档
     * @param {object} param - 删除参数，必须包含 `_id` 字段
     * @returns {Promise<any>} - 返回操作结果，成功时返回删除的文档数据，失败时返回错误信息
     * @example
     * canbox.db.remove({ _id: 'doc1' })
     *   .then(data => console.log(data))
     *   .catch(err => console.error(err));
     */
    remove: (param) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendSyncDB('remove', param);
            ret.success ? resolve(ret.data) : reject(ret.msg);
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
            ret.success ? resolve(ret.data) : reject(ret.msg);
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
            ret.success ? resolve(ret.data) : reject(ret.msg);
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
            ret.success ? resolve(ret.data) : reject(ret.msg);
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
    /**
     * 发出通知
     * @param {Object} options - 窗口配置
     * @param {String} options.title - 窗口标题
     * @param {String} options.body - 窗口内容
     * @returns 
     */
    notification: (options) => {
        console.info('options: ', options);
        return new Promise((resolve) => {
            ipcSendNotification(options);
            resolve(); // 直接 resolve，表示通知已发送
        });
    }
};

const electronStore = {
    /**
     * 获取存储的值
     * @param {string} name 存储的名称
     * @param {string} key - 存储的键
     * @returns {Promise<any>} - 返回存储的值
     */
    get: (name, key) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('get', { name, key });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'get',
            //     key,
            //     appId: window.appId
            // });
            ret.success ? resolve(ret.data) : reject(ret.msg);
        });
    },

    /**
     * 设置存储的值
     * @param {string} name 存储的名称
     * @param {string} key - 存储的键
     * @param {any} value - 存储的值
     * @returns {Promise<void>}
     */
    set: (name, key, value) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('set', { name, key, value });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'set',
            //     key,
            //     value,
            //     appId: window.appId
            // });
            ret.success ? resolve() : reject(ret.msg);
        });
    },

    /**
     * 删除存储的值
     * @param {string} name 存储的名称
     * @param {string} key - 存储的键
     * @returns {Promise<void>}
     */
    delete: (name, key) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('delete', { name, key });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'delete',
            //     key,
            //     appId: window.appId
            // });
            ret.success ? resolve() : reject(ret.msg);
        });
    },

    /**
     * 清空存储
     * @param {string} name 存储的名称
     * @returns {Promise<void>}
     */
    clear: (name) => {
        return new Promise((resolve, reject) => {
            const ret = ipcSendElectronStore('clear', { name });
            // const ret = ipcRenderer.sendSync('msg-electronStore', {
            //     type: 'clear',
            //     appId: window.appId
            // });
            ret.success ? resolve() : reject(ret.msg);
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
    store: electronStore,
    registerCloseCallback,
};

// 从 additionalArguments 读取 ID（主进程传递）
for (const arg of process.argv) {
    if (arg.startsWith('--app-id=')) {
        appId = arg.split('=')[1];
        break;
    }
}
