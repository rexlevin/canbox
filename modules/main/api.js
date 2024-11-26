const { ipcMain } = require('electron');
const DB = require('./core/db');

ipcMain.on('msg-db', (event, args) => {
    // console.info('event', event);
    console.info('args: ', args);
    const ret = DB[args.type](args.appId, args.data);
    console.info('ret====', ret)
    event.returnValue = JSON.stringify(ret);
});
