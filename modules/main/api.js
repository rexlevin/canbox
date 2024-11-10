const { ipcMain } = require('electron');
const DB = require('./core/db');

ipcMain.on('msg-db', (event, arg) => {
    console.info('event', event);
    console.info('arg: ', arg);
    DB[arg.type](arg.data);
    event.returnValue = 'ok';
});
