const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    "api", {
        reload: () => {
            ipcRenderer.send('reload');
        },
        openDevTools: () => {
            ipcRenderer.send('openDevTools');
        },
        generateShortcut: (fn) => {
            ipcRenderer.invoke('generate-shortcut').then(result => {
                fn(result);
            }).catch(error => {
                console.error('IPC call failed:', error);
                fn({ success: false, msg: error.message });
            });
        },
        deleteShortcut: (fn) => {
            ipcRenderer.invoke('delete-shortcut').then(result => {
                fn(result);
            }).catch(error => {
                console.error('IPC call failed:', error);
                fn({ success: false, msg: error.message });
            });
        },
        addAppRepo: (repoUrl, branch, fn) => ipcRenderer.invoke('add-app-repo', repoUrl, branch).then(result => {
            fn(result);
        }).catch(error => {
            console.error('addAppRepo: IPC call failed:', error);
            fn({ success: false, msg: error.message });
        }),
        importAppRepos: (fn) => {
            ipcRenderer.invoke('import-app-repos').then(result => {
                fn(result);
            }).catch(error => {
                console.error('importAppRepos: IPC call failed:', error);
                fn({ success: false, msg: error.message });
            });
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
        importApp: (zipPath) => {
            return ipcRenderer.invoke('import-app', zipPath);
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
                    fn({ success: false, msg: error.message });
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
