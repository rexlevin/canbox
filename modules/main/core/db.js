const { app } = require('electron');
const PouchDB = require('pouchdb');

/*
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/config/canbox/
 */
const userDataPath = app.getPath('userData');

module.exports = {
    // db: new PouchDB('canbox_db'),
    init: (name) => {
        console.info('user data path', userDataPath);
    }
}
