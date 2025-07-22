const { app } = require('electron');
const path = require('path')
const PouchDB = require('pouchdb');
const { customAlphabet } = require('nanoid-cjs');
const DateFormat = require('../../utils/DateFormat');

/**
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
        if (param._rev) {
            param.updateTime = param.updateTime || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        } else {
            param.createTime = param.createTime || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        }
        const db = new DB({name: appId});
        db.put(param, (res) => {
            db.close(); // 关闭数据库连接
            callback(res);
        });
    },
    bulkDocs: (appId, docs, callback) => {
        for(let doc of docs) {
            doc._id = doc._id || nanoid();
            if (doc._rev) {
                doc.updateTime = doc.updateTime || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
            } else {
                doc.createTime = doc.createTime || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
            }
        }
        const db = new DB({name: appId});
        db.bulkDocs(docs, res => {
            db.close();
            callback(res);
        });
    },
    get: (appId, param, callback) => {
        const db = new DB({name: appId});
        db.get(param, res => {
            db.close();
            callback(res);
        })
    },
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
    bulkDocs(docs, callback) {
        this.db.bulkDocs(docs).then(result => {
            console.info('bulkDocs res: ', result);
            callback({code: '0000', msg: result});
        }).catch(error => {
            console.error('bulkDocs err: ', error);
            callback({code: '9100', msg: error.message});
        });
    }
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
