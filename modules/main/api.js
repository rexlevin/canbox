const { ipcMain } = require('electron');
const DB = require('./db');

ipcMain.on('msg-db', (event, args) => {
    // console.info('event', event);
    console.info('args: ', args);
    DB[args.type](args.appId, args.param, (res) => {
        event.returnValue = JSON.stringify(res);
    });
});
