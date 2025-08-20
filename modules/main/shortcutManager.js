const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const os = require('os');

const { getAppPath, getAppIconPath } = require('./pathManager');
const APP_PATH = getAppPath();

/**
 * 生成应用快捷方式
 * 
 * 不同系统的快捷方式存储路径：
 * Windows: %APPDATA%/Microsoft/Windows/Start Menu/Programs
 * Linux: ~/.local/share/applications
 * macOS: /Applications
 *
 * @param {Array} appList - 应用列表
 * @returns {Object} - 操作结果
 */
function generateShortcuts(appList) {
    if (!appList || !appList.length) {
        return { success: false, error: '应用列表为空' };
    }

    const execPath = process.env.APPIMAGE || process.execPath;

    try {
        for (const appItem of appList) {
            const appName = 'canbox-' + appItem.appJson.name;
            let shortcutPath, command;

            // 确保图标缓存目录存在
            if (!fs.existsSync(getAppIconPath())) {
                fs.mkdirSync(getAppIconPath(), { recursive: true });
            }

            // 原始图标路径（asar包内）
            const originalIconPath = path.join(APP_PATH, `${appItem.id}.asar`, appItem.appJson.logo);
            const iconExt = path.extname(originalIconPath);
            // 缓存图标路径
            const iconPath = path.join(getAppIconPath(), `${appItem.id}${iconExt}`);

            // 复制图标到缓存目录（如果不存在或需要更新）
            if (!fs.existsSync(iconPath) || 
                (fs.existsSync(originalIconPath) && fs.statSync(originalIconPath).mtimeMs > fs.statSync(iconPath).mtimeMs)) {
                fs.copyFileSync(originalIconPath, iconPath);
            }

            if (process.platform === 'win32') {
                const programsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
                shortcutPath = path.join(programsPath, `${appName}.lnk`);
                const targetPath = `"${execPath}" --no-sandbox id:${appItem.id}`;
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
Comment=${appItem.appJson.description || ''}
Exec="${execPath}" --no-sandbox id:${appItem.id}
Icon=${iconPath}
Type=Application
`;
                fs.writeFileSync(shortcutPath, desktopFile);
            }
        }
        return { success: true };
    } catch (error) {
        console.error('生成快捷方式失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 删除应用快捷方式
 * @param {Array} appList - 应用列表
 * @returns {Object} - 操作结果
 */
function deleteShortcuts(appList) {
    if (!appList || !appList.length) {
        return { success: false, error: '应用列表为空' };
    }

    try {
        for (const appItem of appList) {
            const appName = 'canbox-' + appItem.appJson.name;
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
            const originalIconPath = path.join(APP_PATH, `${appItem.id}.asar`, appItem.appJson.logo);
            const iconExt = path.extname(originalIconPath);
            const iconPath = path.join(getAppIconPath(), `${appItem.id}${iconExt}`);
            if (fs.existsSync(iconPath)) {
                fs.unlinkSync(iconPath);
            }
        }
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