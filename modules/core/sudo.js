const { platform } = require('os');
const sudo = require('sudo-prompt');
const electronSudo = require('electron-sudo');

/**
 * Sudo 模块 - 提供跨平台的提权执行命令功能
 * 支持 Linux/macOS (sudo-prompt) 和 Windows (electron-sudo)
 */
class Sudo {
    /**
     * 验证操作名称是否符合要求
     * @param {string} name - 操作名称
     * @returns {boolean} 是否符合要求
     */
    _validateName(name) {
        // name 只能包含字母、数字和空格，且长度不超过 70
        const regex = /^[a-zA-Z0-9\s]*$/;
        return regex.test(name) && name.length <= 70;
    }

    /**
     * 执行需要提权的命令
     * @param {object} options - 选项
     * @param {string} options.command - 要执行的命令
     * @param {string} options.name - 操作名称（用于提示用户）
     * @param {string} [options.icns] - macOS 图标路径（可选）
     * @returns {Promise} - 返回执行结果
     */
    exec(options) {
        return new Promise((resolve, reject) => {
            if (!options || !options.command) {
                reject(new Error('缺少必需参数：command'));
                return;
            }

            const name = options.name || 'Canbox 需要管理员权限';

            // 验证 name 参数
            if (!this._validateName(name)) {
                reject(new Error('options.name 只能包含字母、数字和空格，且长度不超过 70 个字符'));
                return;
            }

            if (platform() === 'win32') {
                // Windows 使用 electron-sudo
                this._execWindows(options.command, name, resolve, reject);
            } else if (platform() === 'darwin') {
                // macOS 使用 sudo-prompt
                this._execUnix(options.command, name, options.icns, resolve, reject);
            } else {
                // Linux 使用 sudo-prompt
                this._execLinux(options.command, name, resolve, reject);
            }
        });
    }

    /**
     * Windows 平台执行命令（使用 electron-sudo）
     */
    _execWindows(command, name, resolve, reject) {
        electronSudo.exec(command, { name }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    }

    /**
     * Linux 平台执行命令（使用 sudo-prompt）
     */
    _execLinux(command, name, resolve, reject) {
        sudo.exec(command, { name }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    }

    /**
     * macOS 平台执行命令（使用 sudo-prompt）
     */
    _execUnix(command, name, icns, resolve, reject) {
        const options = { name };
        if (icns) {
            options.icns = icns;
        }

        sudo.exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    }
}

module.exports = new Sudo();
