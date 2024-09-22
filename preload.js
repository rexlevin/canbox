const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
// const fs = require("fs");
const package = require('./package.json');

const extensionsConfig = new Store({
    cwd: 'Users',
    name: 'extensions'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

contextBridge.exposeInMainWorld(
    "api", {
        getExtensionList: () => {
            // console.log("extension===%o", extensionsConfig.get('default'));
            let extIdList = extensionsConfig.get('default'), extList = [];
            for(let id of extIdList) {
                // extensions[id] = require(`./extensions/${id}/main`);
                const currentStore = new Store({
                    cwd: 'Users/default/' + id,
                    name: 'plugin'
                });
                // console.info(currentStore.path);
                // console.info('store=====%o', currentStore.store);
                // console.log(currentStore.path.substring(0, currentStore.path.lastIndexOf('plugin.json')));
                const ext = {
                    'id': id,
                    'config': currentStore.store,
                    'path': currentStore.path.substring(0, currentStore.path.lastIndexOf('plugin.json'))
                };
                extList.push(ext);
            }
            // console.info('returnList=====%o', returnList);
            return extList;
        },
        loadExt: (appItem) => {
            ipcRenderer.send('loadExt', appItem);
        }
    }
);
