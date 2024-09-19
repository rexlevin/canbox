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

let extensionsConfigFile, extensionsConfig;
const extensions = {
    test: () => {
        console.info('11111111111111');
    },
    loadExtConfig: () => {
        console.info(extensionsConfigFile);
        fs.stat(extensionsConfigFile, (err, stats) => {
            if(err) {
                console.error(err);
                return;
            }
            if(stats.isDirectory()) {
                return;
            }
            fs.readFile(extensionsConfigFile, 'utf8', (err, data) => {
                if(err) {
                    console.error(err);
                    return;
                }
                extensionsConfig = JSON.parse(data);
                console.info(extensionsConfig['default']);
            });
        });
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
    extensionsConfigFile = arg + '/Users/extensions.json';
});