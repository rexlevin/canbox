const Store  = require('electron-store');
const package = require('./package.json');

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

contextBridge.exposeInMainWorld(
    "api", {
        loadExtension: (id) => {
            //
        }
    }
);