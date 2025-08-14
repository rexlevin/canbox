const { contextBridge, ipcRenderer } = require('electron');
const PackageJson = require('./package.json');

const AppShortcut = require('./modules/main/app.shortcut');
const AppRepo = require('./modules/main/app.repo');

window.addEventListener('DOMContentLoaded', () => {
    document.title = PackageJson.description + ' - v' + PackageJson.version;
});

ipcRenderer.on('loadAppDirect', (e, appId) => {
    console.info('loadAppDirect: %s',appId);
    for(let appItem of getAppList()) {
        if(appItem.id === appId) {
            ipcRenderer.send('loadApp', JSON.stringify(appItem));
        }
    }
});

contextBridge.exposeInMainWorld(
    "api", {
        reload: () => {
            ipcRenderer.send('reload');
        },
        openDevTools: () => {
            ipcRenderer.send('openDevTools');
        },
        getRepoInfo: () => {
            console.info('AppRepo.info==', AppRepo.info());
            return AppRepo.info();
        },
        generateShortcut: () => {
            // console.info('222222222222222process.execPath==', process.execPath);
            // ipcRenderer.send('generateStartupShortcut', JSON.stringify(getAppList()));
            AppShortcut.generateStartupShortcut(JSON.stringify(getAppList()));
        },
        deleteShortcut: () => {
            AppShortcut.deleteStartupShortcut();
        },
        openUrl: (url) => {
            console.info('url====', url);
            ipcRenderer.send('open-url', url);
        },
        showDialog: (options) => {
            return ipcRenderer.invoke('show-dialog', options);
        },
        selectDirectory: (options) => {
            return ipcRenderer.invoke('select-directory', options);
        },
        selectFile: (options) => {
            return ipcRenderer.invoke('select-file', options);
        },
        importApp: (asarPath) => {
            return ipcRenderer.invoke('import-app', asarPath);
        },
        packToAsar: (appDevItemStr) => {
            return ipcRenderer.invoke('pack-asar', appDevItemStr);
        },
        app: {
            info: (appItemJsonStr, fn) => {
                ipcRenderer.invoke('getAppInfo', appItemJsonStr).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ code: '9101', msg: error.message });
                });
            },
            all: (fn) => {
                ipcRenderer.invoke('getAppList').then(result => {fn(result)}).catch(error => {fn([])});
            },
            load: (appItemStr, devTag) => {
                ipcRenderer.send('loadApp', appItemStr, devTag);
            },
            clearData: (id, fn) => {
                ipcRenderer.invoke('clearAppData', id).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ code: '9201', msg: error.message });
                });
            },
            remove: (param, fn) => {
                console.info('remove app param======', param);
                ipcRenderer.invoke('remove-app', param).then(() => {
                    fn({success: true, msg: '应用删除成功！'});
                }).catch(err => {
                    console.info('应用删除失败: ', err);
                    fn({success: false, msg: '应用删除失败！' + err.message});
                })
            }
        },
        appDev: {
            all: (fn) => ipcRenderer.invoke('getAppDevList').then(result => fn(result)).catch(error => {
                console.error('IPC call failed:', error);
                fn(null);
            }),
            add: (fn) => ipcRenderer.invoke('handleAppAdd').then(result => fn(result)).catch(error => {
                console.error('IPC call failed:', error);
                fn(null);
            })
        }
    }
);
