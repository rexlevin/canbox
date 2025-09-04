const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const os = require('os');

const { getAppPath, getAppIconPath } = require('./pathManager');
const { handleError } = require('./ipc/errorHandler');

/**
 * 生成应用快捷方式
 * 
 * 不同系统的快捷方式存储路径：
 * Windows: %APPDATA%/Microsoft/Windows/Start Menu/Programs
 * Linux: ~/.local/share/applications
 * macOS: /Applications
 *
 * @param {Object} appsData - 所有应用
 * @returns {Object} - 操作结果
 */
function generateShortcuts(appsData) {
    if (!appsData || Object.keys(appsData).length === 0) {
        return handleError('应用信息为空', 'generateShortcuts');
    }

    const execPath = process.env.APPIMAGE || process.execPath;

    try {
        Object.entries(appsData).forEach(([uid, appItem]) => {
            const appName = 'canbox-' + appItem.name;
            let shortcutPath, command;

            // 确保图标缓存目录存在
            if (!fs.existsSync(getAppIconPath())) {
                fs.mkdirSync(getAppIconPath(), { recursive: true });
            }

            // 原始图标路径（asar包内）
            const originalIconPath = path.join(getAppPath(), `${uid}.asar`, appItem.logo);
            const iconExt = path.extname(originalIconPath);
            // 缓存图标路径
            const iconPath = path.join(getAppIconPath(), `${uid}${iconExt}`);

            // 复制图标到缓存目录（如果不存在或需要更新）
            if (!fs.existsSync(iconPath) || 
                (fs.existsSync(originalIconPath) && fs.statSync(originalIconPath).mtimeMs > fs.statSync(iconPath).mtimeMs)) {
                fs.copyFileSync(originalIconPath, iconPath);
            }

            if (process.platform === 'win32') {
                const programsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
                shortcutPath = path.join(programsPath, `${appName}.lnk`);
                const targetPath = `"${execPath}" --no-sandbox id:${uid}`;
                command = `powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('${shortcutPath}'); $Shortcut.TargetPath = '${targetPath}'; $Shortcut.IconLocation = '${iconPath}'; $Shortcut.Save()"`;
                execSync(command);
            } else if (process.platform === 'darwin') {
                shortcutPath = path.join('/Applications', `${appName}.app`);
                const targetPath = `"${execPath}" --no-sandbox id:${appItem.id}`;
                command = `osascript -e 'tell application "Finder" to make alias file to POSIX file "${targetPath}" at POSIX file "/Applications"'`;
                execSync(command);
            } else if (process.platform === 'linux') {
                const applicationsPath = path.join(os.homedir(), '.local', 'share', 'applications');
                if (!fs.existsSync(applicationsPath)) {
                    fs.mkdirSync(applicationsPath, { recursive: true });
                }
                shortcutPath = path.join(applicationsPath, `${appName}.desktop`);
                const desktopFile = `[Desktop Entry]
Name=${appName}
Comment=${appItem.description || ''}
Exec="${execPath}" --no-sandbox id:${uid}
Icon=${iconPath}
Type=Application
`;
                fs.writeFileSync(shortcutPath, desktopFile);
            }
        });
        return { success: true };
    } catch (error) {
        console.error('生成快捷方式失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 删除应用快捷方式
 * @param {Object} appsData - 所有应用
 * @returns {Object} - 操作结果
 */
function deleteShortcuts(appsData) {
    if (!appsData || Object.keys(appsData).length === 0) {
        return handleError('应用信息为空', 'deleteShortcuts');
    }

    try {
        Object.entries(appsData).forEach(([uid, appItem]) => {
            const appName = 'canbox-' + appItem.name;
            let shortcutPath;

            if (process.platform === 'win32') {
                const programsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
                shortcutPath = path.join(programsPath, `${appName}.lnk`);
            } else if (process.platform === 'darwin') {
                shortcutPath = path.join('/Applications', `${appName}.app`);
            } else if (process.platform === 'linux') {
                shortcutPath = path.join(os.homedir(), '.local', 'share', 'applications', `${appName}.desktop`);
            }

            if (fs.existsSync(shortcutPath)) {
                fs.unlinkSync(shortcutPath);
            }
            
            // 删除缓存的图标文件
            const originalIconPath = path.join(getAppPath(), `${uid}.asar`, appItem.logo);
            const iconExt = path.extname(originalIconPath);
            const iconPath = path.join(getAppIconPath(), `${uid}${iconExt}`);
            if (fs.existsSync(iconPath)) {
                fs.unlinkSync(iconPath);
            }
        });
        return { success: true };
    } catch (error) {
        console.error('删除快捷方式失败:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    generateShortcuts,
    deleteShortcuts
};