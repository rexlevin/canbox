const { app } = require('electron');
const path = require('path')
const PouchDB = require('pouchdb');
const { customAlphabet } = require('nanoid-cjs');
const DateFormat = require('../../utils/DateFormat');

/*
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/config/canbox/
 */
const userDataPath = app.getPath('userData');
// const canboxDB = new PouchDB(path.join(userDataPath, 'Users', 'data', 'default'), {auto_compaction: true});

// nanoid
const nanoid = customAlphabet('1234567890abcdef', 10)

module.exports = {
    put: (appId, param, callback) => {
        param._id = param._id || nanoid();
        param.createTime = param.createTime || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        if (param._rev) {
            param.updateTime = param.updateTime || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        }
        const db = new DB({name: appId});
        db.put(param, (res) => {
            db.close(); // 关闭数据库连接
            callback(res);
        });
    },
    bulkDocs: () => {},
    get: (appId, param, callback) => {
        const db = new DB({name: appId});
        db.get(param, res => {
            db.close();
            callback(res);
        })
    },
    getAll: () => {},
    remove: (appId, param, callback) => {
        const db = new DB({name: appId});
        db.remove(param, result => {
            db.close(); // 关闭数据库连接
            callback(result);
        });
    },
    destroy: (param) => {
        const db = new DB({name: param.appId});
        db.destroy();
    }
}

class DB {
    db;
    constructor(option) {
        this.db = new PouchDB(
            path.join( userDataPath, 'Users', 'data', option.name, 'default' ),
            {auto_compaction: true}
        );
    }
    destroy() {
        this.db.destroy();
    }
    put(param, callback) {
        this.db.put(param).then(result => {
            console.info('res: ', result);
            callback({code: '0000', data: result});
        }).catch(error => {
            console.error('err: ', error);
            callback({code: '9100', msg: error.message});
        });
    }
    bulkDocs() {}
    get(param, callback) {
        this.db.get(param._id).then(result => {
            console.info('res: ', result);
            callback({code: '0000', data: result});
        }).catch(error => {
            console.error('error: ', error);
            callback({code: '9100', msg: error.message});});
    }
    remove(param, callback) {
        this.db.remove(param._id, param._rev).then(result => {
            console.info('res: ', result);
            callback({code: '0000', data: result});
        }).catch(error => {
            console.error('remove err: ', error);
            callback({code: '9100', msg: error.message});
        });
    }
    close() {
        this.db.close();
    }
}
