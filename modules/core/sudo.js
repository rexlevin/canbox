const { platform } = require('os');
const { exec } = require('child_process');
const { BrowserWindow } = require('electron');
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
    async exec(options) {
        if (!options || !options.command) {
            throw new Error('缺少必需参数：command');
        }

        const name = options.name || 'Canbox 需要管理员权限';

        // 验证 name 参数
        if (!this._validateName(name)) {
            throw new Error('options.name 只能包含字母、数字和空格，且长度不超过 70 个字符');
        }

        // 检测是否在 Flatpak 环境中
        const isFlatpak = process.env.FLATPAK_ID !== undefined;
        if (isFlatpak) {
            // 在 Flatpak 环境中，先显示提示框
            await this._showFlatpakPermissionHint();
        }

        return new Promise((resolve, reject) => {
            if (platform() === 'win32') {
                // Windows 使用 electron-sudo
                this._execWindows(options.command, name, resolve, reject);
            } else if (platform() === 'darwin') {
                // macOS 使用 sudo-prompt
                this._execUnix(options.command, name, options.icns, resolve, reject);
            } else if (isFlatpak) {
                // Linux Flatpak 环境
                this._execLinuxFlatpak(options.command, resolve, reject);
            } else {
                // Linux 普通环境
                this._execLinux(options.command, name, resolve, reject);
            }
        });
    }

    /**
     * 在 Flatpak 环境中显示权限配置提示
     */
    _showFlatpakPermissionHint() {
        return new Promise((resolve) => {
            const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (!win) {
                resolve();
                return;
            }

            const { dialog } = require('electron');
            const message = `检测到您正在 Flatpak 环境中运行 Canbox。

由于 Flatpak 的安全沙盒机制，提权操作可能需要额外的文件系统访问权限。

如果提权操作失败，请使用 Flatseal 工具为 Canbox 开启所需权限：
• Filesystem > Other files: 添加需要访问的路径（如 /etc:rw、/tmp:rw 等）

Flatseal 可以在软件中心或 Flathub 安装。`;

            dialog.showMessageBox(win, {
                type: 'info',
                title: 'Flatpak 权限提示',
                message: 'Canbox 提权操作',
                detail: message,
                buttons: ['我已了解', '打开 Flatseal'],
                defaultId: 0
            }).then(({ response }) => {
                if (response === 1) {
                    // 尝试打开 Flatseal
                    exec('flatpak-spawn --host flatpak run com.github.tchx84.Flatseal 2>/dev/null || flatpak run com.github.tchx84.Flatseal 2>/dev/null || echo "Flatseal not installed"');
                }
                resolve();
            });
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
     * Linux Flatpak 环境执行命令（使用 flatpak-spawn --host pkexec）
     */
    _execLinuxFlatpak(command, resolve, reject) {
        const fullCommand = `flatpak-spawn --host pkexec ${command}`;
        exec(fullCommand, (error, stdout, stderr) => {
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
