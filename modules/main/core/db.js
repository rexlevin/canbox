const { app } = require('electron');
const PouchDB = require('pouchdb');

const userDataPath = app.getPath('userData');

module.exports = {
    // db: new PouchDB('canbox_db'),
    init: (name) => {
        console.info('user data path', userDataPath);
    }
}
