const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const os = require('os');

const { getCanboxStore } = require('@modules/main/storageManager');
const { getAppPath, getAppIconPath } = require('@modules/main/pathManager');
const { handleError } = require('@modules/ipc/errorHandler');
const sharp = require('sharp');

/**
 * 将 PNG/JPEG 图片转换为 ICO 格式
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出 ICO 路径
 */
async function convertToIco(inputPath, outputPath) {
    try {
        // 先转换为 256x256 的 PNG
        const tempPngPath = outputPath.replace('.ico', '.temp.png');
        await sharp(inputPath)
            .resize(256, 256, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(tempPngPath);

        // 创建简单的 ICO 文件
        await createSimpleIco(tempPngPath, outputPath);

        // 删除临时文件
        if (fs.existsSync(tempPngPath)) {
            fs.unlinkSync(tempPngPath);
        }

        console.log(`成功转换图标: ${inputPath} -> ${outputPath}`);
    } catch (error) {
        console.error('转换图标失败:', error);
        // 清理临时文件
        const tempPngPath = outputPath.replace('.ico', '.temp.png');
        if (fs.existsSync(tempPngPath)) {
            try {
                fs.unlinkSync(tempPngPath);
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }
        throw error;
    }
}

/**
 * 使用 PNG 文件创建简单的 ICO 文件
 * @param {string} pngPath - 输入 PNG 路径
 * @param {string} outputPath - 输出 ICO 路径
 */
async function createSimpleIco(pngPath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // 读取 PNG 文件
            const pngData = fs.readFileSync(pngPath);

            // ICO 文件头 (6 bytes)
            const header = Buffer.alloc(6);
            header.writeUInt16LE(0, 0);     // 保留字段
            header.writeUInt16LE(1, 2);     // 图像类型 (1 = ICO)
            header.writeUInt16LE(1, 4);     // 图像数量 (1)

            // ICO 目录条目 (16 bytes)
            const dirEntry = Buffer.alloc(16);
            const width = 256;
            const height = 256;
            dirEntry.writeUInt8(width >= 256 ? 0 : width, 0);   // 宽度 (0 表示 256)
            dirEntry.writeUInt8(height >= 256 ? 0 : height, 1);  // 高度 (0 表示 256)
            dirEntry.writeUInt8(0, 2);                          // 颜色数 (0 = >=8bpp)
            dirEntry.writeUInt8(0, 3);                          // 保留字段
            dirEntry.writeUInt16LE(1, 4);                       // 颜色平面
            dirEntry.writeUInt16LE(32, 6);                      // 每像素位数 (32 = RGBA)
            dirEntry.writeUInt32LE(pngData.length, 8);          // 图像数据大小
            dirEntry.writeUInt32LE(22, 12);                     // 图像数据偏移量 (6 + 16)

            // 组合所有数据
            const icoData = Buffer.concat([header, dirEntry, pngData]);
            fs.writeFileSync(outputPath, icoData);

            console.log(`ICO文件创建成功: ${outputPath} (${pngData.length} bytes)`);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

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
async function generateShortcuts(appsData) {
    if (!appsData || Object.keys(appsData).length === 0) {
        return handleError('应用信息为空', 'generateShortcuts');
    }

    const execPath = process.env.APPIMAGE || process.execPath;

    try {
        for (const [uid, appItem] of Object.entries(appsData)) {
            const appName = 'canbox-' + appItem.name;
            let shortcutPath, command;

            // 确保图标缓存目录存在
            if (!fs.existsSync(getAppIconPath())) {
                fs.mkdirSync(getAppIconPath(), { recursive: true });
            }

            // 图标路径
            // Windows 下使用已生成的 ICO 文件，其他系统使用原始格式
            const logoExt = path.extname(appItem.logo).toLowerCase();
            const sourceIconPath = process.platform === 'win32'
                ? path.join(getAppPath(), `${uid}.ico`)
                : path.join(getAppPath(), `${uid}${logoExt}`);

            // 缓存图标路径（所有系统都缓存到同一个位置）
            const iconPath = path.join(getAppIconPath(), `${uid}${path.extname(sourceIconPath)}`);

            // 复制图标到缓存目录（如果不存在或需要更新）
            const needUpdate = !fs.existsSync(iconPath) ||
                (fs.existsSync(sourceIconPath) && fs.statSync(sourceIconPath).mtimeMs > fs.statSync(iconPath).mtimeMs);

            if (needUpdate) {
                // 直接复制图标文件（Windows 下已经转换过 ICO）
                fs.copyFileSync(sourceIconPath, iconPath);
            }

            if (process.platform === 'win32') {
                const programsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
                shortcutPath = path.join(programsPath, `${appName}.lnk`);
                const targetPath = execPath;
                const arguments = '--no-sandbox --app-id=' + uid;

                // 确保目录存在
                if (!fs.existsSync(programsPath)) {
                    fs.mkdirSync(programsPath, { recursive: true });
                }

                // 使用转义后的路径创建快捷方式，确保图标路径正确
                command = `powershell -Command `
                    + `"$ws = New-Object -ComObject WScript.Shell; `
                    + `$s = $ws.CreateShortcut('${shortcutPath.replace(/\\/g, '\\\\')}'); `
                    + `$s.TargetPath = '${targetPath.replace(/\\/g, '\\\\')}'; `
                    + `$s.Arguments = '${arguments}'; `
                    + `$s.IconLocation = '${iconPath.replace(/\\/g, '\\\\')},0'; `
                    + `$s.Save()"`;
                execSync(command);
            } else if (process.platform === 'darwin') {
                shortcutPath = path.join('/Applications', `${appName}.app`);
                const targetPath = `"${execPath}" --no-sandbox --app-id=${uid}`;
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
Exec="${execPath}" --no-sandbox --app-id=${uid} --class=canbox-app-${uid} --wm-class=canbox-app-${uid} --wm_class=canbox-app-${uid} --app-name=${appItem.name || uid}
Icon=${iconPath}
Type=Application
StartupWMClass=${uid}
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
            const iconExt = path.extname(appItem.logo).toLowerCase();
            // 删除可能的图标文件格式（ICO 或原始格式）
            const possibleIconExts = process.platform === 'win32'
                ? ['.ico', iconExt]
                : [iconExt];

            for (const ext of possibleIconExts) {
                const iconPath = path.join(getAppIconPath(), `${uid}${ext}`);
                if (fs.existsSync(iconPath)) {
                    try {
                        fs.unlinkSync(iconPath);
                        console.log(`删除图标文件: ${iconPath}`);
                    } catch (error) {
                        console.error(`删除图标文件失败: ${iconPath}`, error);
                    }
                }
            }
        });
        return { success: true };
    } catch (error) {
        console.error('删除快捷方式失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 是否需要重新生成快捷方式
 * 
 * @param {string} currentVersion 
 * @returns {boolean} - true：需要，false：不需要
 */
const needRegenerateShortcuts = (currentVersion) => {
    const savedVersion = getCanboxStore().get('version');
    if (savedVersion === currentVersion) {
        return false;
    }

    // 检查是否存在 canbox-*.desktop 文件
    if (process.platform === 'linux') {
        const applicationsPath = path.join(os.homedir(), '.local', 'share', 'applications');
        if (fs.existsSync(applicationsPath)) {
            const files = fs.readdirSync(applicationsPath);
            const hasDesktopFile = files.some(file => file.startsWith('canbox-') && file.endsWith('.desktop'));
            if (hasDesktopFile) {
                return true;
            }
        }
    }

    return false;
};

const markVersion = (currentVersion) => {
    const canboxStore = getCanboxStore();
    canboxStore.set('version', currentVersion);
};

/**
 * 初始化快捷方式（异步）
 * @param {string} currentVersion - 当前版本号
 * @param {Object} appsData - 应用数据
 * @returns {Promise<Object>} - 操作结果
 */
async function initShortcuts(currentVersion, appsData) {
    try {
        if (needRegenerateShortcuts(currentVersion) && appsData) {
            const result = await generateShortcuts(appsData);
            if (result.success) {
                markVersion(currentVersion);
            }
            return result;
        }
        return { success: true, msg: '不需要更新shortcuts' };
    } catch (error) {
        return handleError(new Error('初始化快捷方式失败' + error.message), 'initShortcuts');
    }
}

module.exports = {
    generateShortcuts,
    deleteShortcuts,
    initShortcuts
};