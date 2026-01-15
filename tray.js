const { app, dialog, Menu, Tray } = require('electron');
const path = require('path')
const package = require('./package.json');
const { translate } = require('./locales');

module.exports = {
    createTray: (win) => {
        // console.info(1, __dirname);
        const currentLang = require('./ipcHandlers').getCurrentLanguage?.() || 'zh-CN';

        let trayMenuTemplate = [{
            label: translate('tray.showWindow', currentLang),
            type: 'normal',
            click: function() {
                win.show();
            }
        }, {
            label: translate('tray.hideWindow', currentLang),
            type: 'normal',
            click: function() {
                win.hide();
            }
        }, {
            label: translate('tray.toggleDevTools', currentLang),
            type: 'normal',
            click: function() {
                win.webContents.openDevTools({mode: 'detach'});
            }
        }, {
            label: translate('tray.reloadCanbox', currentLang),
            type: 'normal',
            click: function() {
                win.webContents.reload();
            }
        }, {
            label: translate('tray.about', currentLang),
            type: 'normal',
            click: function() {
                dialog.showMessageBox({
                    type: 'info',
                    title: translate('tray.about', currentLang),
                    message: package.name + ':' + package.version + '\n' + package.description + '\nnode:' + process.versions['node'] + '\nchrome:' + process.versions['chrome'] + '\nelectron:' + process.versions['electron']
                });
            }
        }, {
            label: translate('tray.projectRepository', currentLang),
            type: 'normal',
            click: function() {
                let exec = require('child_process').exec
                    , locale = app.getLocale()
                    , url = ''
                // 使用ip的话要么自己维护一个ip库放在外部（太大，没必要放项目里），要么使用第三方，都需要进行网络交互
                // 所以这里使用一个最粗略的方式"语言环境"来判断是否是中国大陆
                if(locale.indexOf('zh-CN') == -1) {
                    url = 'https://github.com/rexlevin/canbox'
                } else {
                    url = 'https://gitee.com/lizl6/canbox'
                }
                exec('open ' + url)
            }
        }, {
            label: translate('tray.quit', currentLang),
            type: 'normal',
            click: function() {
                // 退出canbox
                win.destroy(); // 强制关闭窗口，会触发win的closed事件，不会触发close事件
            }
        }]
        let tray;
        tray = new Tray(path.join(__dirname, './logo.png'));
        const menu = Menu.buildFromTemplate(trayMenuTemplate);
        tray.setContextMenu(menu);
        tray.on('click', () => {
            win.isVisible() ? win.hide() : win.show();
            win.isVisible() ? win.setSkipTaskbar(false) : win.setSkipTaskbar(true);
        });
    },
}
