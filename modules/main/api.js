const { ipcMain } = require('electron');
const DB = require('./core/db');

ipcMain.on('msg-trigger', (event, arg) => {
    console.info('arg: ', arg);
    DB[arg.method](arg.data);
    event.returnValue = 'ok';
});
