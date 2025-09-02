const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    "api", {
        on: (eventName, callback) => {
            ipcRenderer.on(eventName, callback);
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
        updateReposStatus: (appId, fn) => ipcRenderer.invoke('update-repos-status', appId).then(result => {
            fn(result);
        }).catch(error => {
            fn({ success: false, msg: error.message });
        }),
        openUrl: (url) => {
            console.info('url====', url);
            ipcRenderer.send('open-url', url);
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
                // ipcRenderer.invoke('getAppList').then(result => {fn(result)}).catch(error => {fn([])});
                ipcRenderer.invoke('get-apps-data').then(result => {fn(result)}).catch(error => {fn({})});
            },
            load: (appItemStr, devTag) => {
                ipcRenderer.send('loadApp', appItemStr, devTag);
            },
            clearData: (id, fn) => {
                ipcRenderer.invoke('clearAppData', id).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ success: false, msg: error.message });
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
        getReposData: (fn) => {
            ipcRenderer.invoke('get-repos-data').then(result => {
                fn(result);
            }).catch(error => {
                console.error('getReposList: IPC call failed:', error);
                fn({success: false, msg: error.message});
            });
        },
        removeRepo: (uid, fn) => {
            ipcRenderer.invoke('remove-repo', uid).then(result => {
                fn(result);
            }).catch(error => {
                console.error('removeRepo: IPC call failed:', error);
                fn({ success: false, msg: error.message });
            });
        },
        downloadAppsFromRepo: (uid, fn) => {
            ipcRenderer.invoke('download-apps-from-repo', uid).then(result => {
                fn(result);
            }).catch(error => {
                console.error('downloadAppsFromRepo: IPC call failed:', error);
                fn({ success: false, msg: error.message });
            });
        }
    }
);
