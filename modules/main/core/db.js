const { app } = require('electron');
const path = require('path')
const PouchDB = require('pouchdb');

/*
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/config/canbox/
 */
const userDataPath = app.getPath('userData');
const canboxDB = new PouchDB(path.join(userDataPath, 'canbox.db'), {auto_compaction: true});

module.exports = {
    // db: new PouchDB('canbox_db'),
    init: (data) => {
        const dataPath = path.join( userDataPath, 'data', data.appId + '.db' );
        const db = new PouchDB(
            path.join( userDataPath, 'data', data.appId + '.db' ),
            {auto_compaction: true}
        );
        canboxDB.put();
    },
    put: (data) => {
        console.info('user data path', userDataPath);
        console.info('app data path', path.join(userDataPath, 'data'));
    },
    update: (id, data) => {},
    get: (id) => {},
    getAll: () => {},
    delete: (id) => {}
}

// class DB {
//     db;
//     constructor(option) {
//         this.db = new PouchDB(path.join(userDataPath, 'data', option.name));
//     }
//     init() {}
//     put(data) {}
// }
// module.exports = DB;