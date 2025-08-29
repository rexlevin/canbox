const { app, dialog, Menu, Tray } = require('electron');
const path = require('path')
const package = require('../../package.json');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

module.exports = {
    createTray: (win) => {
        // console.info(1, __dirname);
        let trayMenuTemplate = [{
            label: '显示窗口',
            type: 'normal',
            click: function() {
                win.show();
            }
        }, {
            label: 'Toggle DevTools',
            type: 'normal',
            click: function() {
                win.webContents.openDevTools({mode: 'detach'});
            }
        }, {
            label: 'Reload Canbox',
            type: 'normal',
            click: function() {
                win.webContents.reload();
            }
        }, {
            label: 'About',
            type: 'normal',
            click: function() {
                dialog.showMessageBox({
                    type: 'info',
                    title: '关于',
                    message: package.name + ':' + package.version + '\n' + package.description + '\nnode:' + process.versions['node'] + '\nchrome:' + process.versions['chrome'] + '\nelectron:' + process.versions['electron']
                });
            }
        }, {
            label: 'Project Repository',
            type: 'normal',
            click: function() {
                let exec = require('child_process').exec
                    , locale = app.getLocale()
                    , url = ''
                // 使用ip的话要么自己维护一个ip库放在外部（太大，没必要放项目里），要么使用第三方，都需要进行网络交互
                // 所以这里使用一个最粗略的方式“语言环境”来判断是否是中国大陆
                if(locale.indexOf('zh-CN') == -1) {
                    url = 'https://github.com/rexlevin/coderbox'
                } else {
                    url = 'https://gitee.com/rexlevin/coderbox'
                }
                exec('open ' + url)
            }
        }, {
            label: 'Quit',
            type: 'normal',
            click: function() {
                // 退出canbox
                win.destroy(); // 强制关闭窗口，会触发win的closed事件，不会触发close事件
            }
        }]
        let tray;
        tray = new Tray(path.join(__dirname, '../../logo.png'));
        const menu = Menu.buildFromTemplate(trayMenuTemplate);
        tray.setContextMenu(menu);
        tray.on('click', () => {
            win.isVisible() ? win.hide() : win.show();
            win.isVisible() ? win.setSkipTaskbar(false) : win.setSkipTaskbar(true);
        });
    },
}
