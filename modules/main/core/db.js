const { app } = require('electron');
const path = require('path')
const PouchDB = require('pouchdb');

/*
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/config/canbox/
 */
const userDataPath = app.getPath('userData');
const canboxDB = new PouchDB(path.join(userDataPath, 'Users', 'canbox.db'), {auto_compaction: true});

module.exports = {
    // db: new PouchDB('canbox_db'),
    init: (data) => {
        const db = new PouchDB(
            path.join( userDataPath, 'Users', 'data', data.appId, 'default' ),
            {auto_compaction: true}
        );
    },
    put: (data) => {
        console.info('user data path', userDataPath);
        console.info('app data path', path.join(userDataPath, 'data'));
        const db = new DB({name: data.appId});
        db.put();
    },
    get: (id) => {},
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
        this.db.put(data);
    }
}
// module.exports = DB;