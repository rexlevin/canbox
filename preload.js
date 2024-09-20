const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
const fs = require("fs");
const package = require('./package.json');

const extensionsConfig = new Store({
    cwd: 'Users',
    name: 'extensions'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

const extensions = {
    test: () => {
        console.info('11111111111111');
    }
}

contextBridge.exposeInMainWorld(
    "api", {
        getExtensionList: () => {
            // extensions.loadExtConfig();
            console.log("extension===%o", extensionsConfig.get('default'));
            return extensionsConfig.get('default');
        }
    }
);
