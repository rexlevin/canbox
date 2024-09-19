const { contextBridge, ipcRenderer, shell } = require('electron');
// const Store  = require('electron-store');
const fs = require("fs");
const package = require('./package.json');

// const storeUsers = new Store({
//     name: 'Users/extensions'
// });

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

let extensionsConfig;
const extensions = {
    test: () => {
        console.info('11111111111111');
    },
    loadExtConfig: () => {
        console.info(extensionsConfig);
    }
}

contextBridge.exposeInMainWorld(
    "api", {
        loadExtension: (id) => {
            extensions.loadExtConfig();
        }
    }
);

// (function() {
//     console.log(require('electron'));
//     extensions.loadExtConfig();
// })();

ipcRenderer.on('userDataPath', (event, arg) => {
    extensionsConfig = arg + '/Users/extensions.json';
});