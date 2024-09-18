const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
const package = require('./package.json');

const storeUsers = new Store({
    name: 'Users/extensions'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

contextBridge.exposeInMainWorld(
    "api", {
        loadExtension: (id) => {
            console.info('name===%s', storeUsers.name);
        }
    }
);