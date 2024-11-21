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
    init: (appId, data) => {
        const db = new PouchDB(
            path.join( userDataPath, 'Users', 'data', appId, 'default' ),
            {auto_compaction: true}
        );
    },
    put: (appId, data) => {
        console.info('user data:', data);
        data._id = data._id || nanoid();
        data.createTime = data.create_time || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        data.updateTime = data.update_time || (new DateFormat('yyyyMMddHHmmss')).format(new Date());
        console.info('user data:', data);
        const db = new DB({name: appId});
        db.put(data);
    },
    get: (appId, data) => {
        const db = new DB({name: appId});
        db.get(data._id).then(response => {
            console.info(response);
        }).catch(error => {
            console.error(error);
        });
    },
    getAll: () => {},
    remove: (id) => {},
    destroy: (data) => {
        const db = new DB({name: data.appId});
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
    put(data) {
        this.db.put(data).then(res => {
            console.info('res: ', res);
            return {_id: res.id, _rev: res.rev};
        }).catch(err => {
            console.error('err: ', err);
        });
    }
    get(data) {
        this.db.get(data).then(res => {}).catch(err => {});
    }
}
// module.exports = DB;