const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    "api", {
        i18n: {
            getLanguage: () => ipcRenderer.invoke('i18n-get-language'),
            setLanguage: (lang) => ipcRenderer.invoke('i18n-set-language', lang),
            getAvailableLanguages: () => ipcRenderer.invoke('i18n-get-available-languages'),
            translate: (key, params) => ipcRenderer.invoke('i18n-translate', key, params)
        },
        font: {
            get: () => ipcRenderer.invoke('font-get'),
            set: (fontValue) => ipcRenderer.invoke('font-set', fontValue)
        },
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
        openHtml: async (htmlContent, docName) => {
            return ipcRenderer.invoke('open-html', htmlContent, docName);
        },
        selectFile: (options) => {
            return ipcRenderer.invoke('select-file', options);
        },
        importApp: (zipPath) => {
            return ipcRenderer.invoke('import-app', zipPath);
        },
        packToAsar: (uid) => {
            return ipcRenderer.invoke('pack-asar', uid);
        },
        app: {
            info: (uid, fn) => {
                ipcRenderer.invoke('getAppInfo', uid).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ success: false, msg: error.message });
                });
            },
            all: (fn) => {
                ipcRenderer.invoke('get-all-apps').then(result => {fn(result)}).catch(error => {fn({success: false, msg: error.message})});
            },
            load: (uid, devTag) => {
                ipcRenderer.send('load-app', uid, devTag);
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
                ipcRenderer.invoke('remove-app', param).then((result) => {
                    fn(result);
                }).catch(err => {
                    console.info('应用删除失败: ', err);
                    fn({success: false, msg: '应用删除失败！' + err.message});
                })
            }
        },
        appDev: {
            all: (fn) => ipcRenderer.invoke('get-apps-dev-data').then(result => fn(result)).catch(error => {
                console.error('IPC call failed:', error);
                fn(null);
            }),
            add: (fn) => ipcRenderer.invoke('handle-app-dev-add').then(result => fn(result)).catch(error => {
                console.error('IPC call failed:', error);
                fn(null);
            }),
            info: (uid, fn) => {
                ipcRenderer.invoke('getAppDevInfo', uid).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ success: false, msg: error.message });
                });
            }
        },
        addAppRepo: (repoUrl, fn) => ipcRenderer.invoke('add-app-repo', repoUrl).then(result => {
            fn(result);
        }).catch(error => {
            console.error('addAppRepo: IPC call failed:', error);
            // 解析错误消息，提取真正的错误类型
            let errorMsg = error.message;
            // 尝试从完整的错误消息中提取错误类型
            const match = errorMsg.match(/Error: (.+)$/);
            if (match && match[1]) {
                errorMsg = match[1];
            }
            fn({ success: false, msg: errorMsg });
        }),
        importAppRepos: (fn) => {
            ipcRenderer.invoke('import-app-repos').then(result => {
                fn(result);
            }).catch(error => {
                console.error('importAppRepos: IPC call failed:', error);
                // 解析错误消息，提取真正的错误类型
                let errorMsg = error.message;
                const match = errorMsg.match(/Error: (.+)$/);
                if (match && match[1]) {
                    errorMsg = match[1];
                }
                fn({ success: false, msg: errorMsg });
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
        exportReposData: (fn) => {
            ipcRenderer.invoke('export-repos-data').then(result => {
                fn(result);
            }).catch(error => {
                console.error('exportReposData: IPC call failed:', error);
                fn({success: false, msg: error.message});
            });
        },
        removeRepo: (uid, fn) => {
            ipcRenderer.invoke('remove-repo', uid).then(result => {
                fn(result);
            }).catch(error => {
                console.error('removeRepo: IPC call failed:', error);
                // 解析错误消息，提取真正的错误类型
                let errorMsg = error.message;
                const match = errorMsg.match(/Error: (.+)$/);
                if (match && match[1]) {
                    errorMsg = match[1];
                }
                fn({ success: false, msg: errorMsg });
            });
        },
        downloadAppsFromRepo: (uid, fn) => {
            ipcRenderer.invoke('download-apps-from-repo', uid).then(result => {
                fn(result);
            }).catch(error => {
                console.error('downloadAppsFromRepo: IPC call failed:', error);
                // 解析错误消息，提取真正的错误类型
                let errorMsg = error.message;
                const match = errorMsg.match(/Error: (.+)$/);
                if (match && match[1]) {
                    errorMsg = match[1];
                }
                fn({ success: false, msg: errorMsg });
            });
        },
        repo: {
            info: (uid, fn) => {
                ipcRenderer.invoke('getRepoInfo', uid).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ success: false, msg: error.message });
                });
            }
        },
        readFile: (filePath) => {
            return ipcRenderer.invoke('msg-readFile', { filePath });
        },
        downloadCanboxTypes: () => {
            return ipcRenderer.invoke('download-canbox-types');
        }
    }
);
