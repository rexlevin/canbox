const { app } = require('electron');
const path = require('path')
const PouchDB = require('pouchdb');
const { customAlphabet } = require('nanoid');
const DateFormat = require('../utils/DateFormat');

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
    // db: new PouchDB('canbox_db'),
    // init: (appId, data) => {
    //     const db = new PouchDB(
    //         path.join( userDataPath, 'Users', 'data', appId, 'default' ),
    //         {auto_compaction: true}
    //     );
    // },
    put: (appId, param, callback) => {
        console.info('user data 01:', param);
        param._id = param._id || nanoid();
        param.createTime = param.create_time || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        if (param._rev) {
            param.updateTime = param.update_time || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        }
        console.info('user data 02:', param);
        const db = new DB({name: appId});
        db.put(param, (res) => {
            db.close(); // 关闭数据库连接
            console.info('res==', res);
            callback(res);
        });
        // const ret = db.put(data);
        // console.info('ret ret: ', ret);
        // return ret;
    },
    bulkDocs: () => {},
    get: (appId, param) => {
        const db = new DB({name: appId});
        db.get(param._id, () => {
            //
        })
    },
    getAll: () => {},
    remove: (id) => {},
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
            // return {code: '0000', _id: result.id, _rev: result.rev};
            callback({code: '0000', _id: result.id, _rev: result.rev});
        }).catch(error => {
            console.error('err: ', error);
            // return {code: '9100', message: 'Database operate, put error, ' + error.message};
            callback({code: '9100', message: 'Database operate, put error, ' + error.message});
        });
    }
    bulkDocs() {}
    get(param, callback) {
        this.db.get(param).then(result => {
            console.info('res: ', result);
        }).catch(error => {});
    }
    close() {
        this.db.close();
    }
}
// module.exports = DB;