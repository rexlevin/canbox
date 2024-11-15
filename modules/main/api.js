const { ipcMain } = require('electron');
const DB = require('./core/db');

ipcMain.on('msg-db', (event, args) => {
    // console.info('event', event);
    console.info('args: ', args);
    DB[args.type](args.data);
    event.returnValue = 'ok';
});
