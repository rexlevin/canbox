const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { getAppsStore, getAppsDevStore } = require('./storageManager');
const shortcutManager = require('./shortcutManager');
const { getAppPath, getAppDataPath, getReposTempPath } = require('./pathManager');
const appWindow = require('./app.window');
const { handleError } = require('./ipc/errorHandler')
const ObjectUtils = require('../utils/ObjectUtils');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();
const APP_PATH = getAppPath();
const APP_DATA_PATH = getAppDataPath();
const APP_TEMP_PATH = getReposTempPath();

/**
 * 获取应用列表
 * @returns {*[Object]} app信息集合
 */
function getAppList() {
    if (undefined === AppsConfig.get('default')) {
        return [];
    }
    const appInfoList = AppsConfig.get('default');
    let appList = [];
    for (const appInfo of appInfoList) {
        const appJson = JSON.parse(fs.readFileSync(path.join(APP_PATH, appInfo.id + '.asar/app.json'), 'utf8'));
        const iconPath = path.join(APP_PATH, appInfo.id + '.asar', appJson.logo);
        const app = {
            id: appInfo.id,
            appJson: appJson,
            logo: iconPath,
            path: path.join(APP_PATH, appInfo.id + '.asar')
        };
        appList.push(app);
    }
    return appList;
}

/**
 * 获取应用信息
 */
function getAppInfo(appItemJsonStr) {
    const appItem = JSON.parse(appItemJsonStr);
    const readFileWithErrorHandling = (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            return null;
        } catch (err) {
            console.error(`文件操作失败: ${err.path}`, err);
            return null;
        }
    };

    const [readme, history] = [
        readFileWithErrorHandling(path.join(appItem.path, 'README.md')),
        readFileWithErrorHandling(path.join(appItem.path, 'HISTORY.md'))
    ];

    const msg = (readme || history) ? null : '部分文件读取失败';
    return { success: null === msg, data: { readme, history }, msg };
}

async function handleImportApp(event, zipPath, uid) {
    try {

        // 检查是否有 APP_TEMP_PATH 目录，有则删除
        if (fs.existsSync(APP_TEMP_PATH)) {
            if (process.platform === 'win32') {
                await execSync(`del /f /q "${APP_TEMP_PATH}"`, { stdio: 'inherit' });
            } else {
                await execSync(`rm -rf "${APP_TEMP_PATH}"`, { stdio: 'inherit' });
            }
        }
        // 创建 APP_TEMP_PATH 目录
        fs.mkdirSync(APP_TEMP_PATH, { recursive: true });

        // 将文件复制到 APP_TEMP_PATH 目录下
        const uuid = uid || uuidv4().replace(/-/g, '');
        const targetPath = path.join(APP_TEMP_PATH, `${uuid}.zip`);

        if (!fs.existsSync(zipPath)) {
            return handleError(new Error(`源文件不存在: ${zipPath}`), 'handleImportApp');
        }
        const absoluteAsarPath = path.resolve(zipPath);
        if (!fs.existsSync(absoluteAsarPath)) {
            const error =  new Error(`解析后的路径无效: ${absoluteAsarPath}`);
            return handleError(error, 'handleImportApp');
        }
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        try {
            const command = process.platform === 'win32'
                ? `copy "${absoluteAsarPath}" "${targetPath}"`
                : `cp "${absoluteAsarPath}" "${targetPath}"`;
            execSync(command, { stdio: 'inherit' });
            console.log('ZIP 文件复制成功！');
        } catch (err) {
            console.error('复制失败:', err);
        }

        // 将 APP_TEMP_PATH 目录下的 zip 文件解压
        if (process.platform === 'win32') {
            execSync(`powershell -Command "Expand-Archive -Path '${targetPath}' -DestinationPath '${APP_TEMP_PATH}'"`, { stdio: 'inherit' });
        } else {
            execSync(`unzip -o "${targetPath}" -d "${APP_TEMP_PATH}"`, { stdio: 'inherit' });
        }
        console.info('解压成功:', APP_TEMP_PATH);
        // 删除 zip 文件
        fs.rmSync(targetPath, { recursive: true, force: true });
        // 重命名文件：检查 APP_TEMP_PATH 下的文件和目录，如果当前存在 xxxx.asar 则改为 ${uuid}.asar，xxxx.asar.unpacked 改为 ${uuid}.asar.unpacked
        const files = fs.readdirSync(APP_TEMP_PATH);
        files.forEach(file => {
            console.info('file:', file);
            if (file.endsWith('.asar')) {
                fs.renameSync(path.join(APP_TEMP_PATH, file), path.join(APP_TEMP_PATH, `${uuid}.asar`));
            } else if (file.endsWith('.asar.unpacked')) {
                fs.renameSync(path.join(APP_TEMP_PATH, file), path.join(APP_TEMP_PATH, `${uuid}.asar.unpacked`));
            }
        });
        // 将 APP_TEMP_PATH 下的所有文件移动到 APP_PATH 下
        if (fs.existsSync(APP_TEMP_PATH)) {
            if (process.platform === 'win32') {
                await execSync(`move "${APP_TEMP_PATH}\\*" "${APP_PATH}"`, { stdio: 'inherit' });
            } else {
                await execSync(`mv "${APP_TEMP_PATH}"/* "${APP_PATH}"`, { stdio: 'inherit' });
            }
        }

        console.info(DateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        console.info(DateFormat.format(new Date()));

        const asarTargetPath = path.join(APP_PATH, `${uuid}.asar`);
        const appJson = JSON.parse(fs.readFileSync(path.join(asarTargetPath, 'app.json'), 'utf8'));
        let appConfigArr = AppsConfig.get('default') ? AppsConfig.get('default') : [];
        appConfigArr.push({
            id: uuid,
            name: appJson.name || '',
            version: appJson.version || '',
            description: appJson.description || '',
            author: appJson.author || '',
            logo: appJson.logo || '',
            sourceTag: 'import',
            importTime: DateFormat.format(new Date())
        });
        AppsConfig.set('default', appConfigArr);

        // 复制logo文件到目标目录
        const logoPathInAsar = path.join(asarTargetPath, appJson.logo);
        const logoExt = path.extname(appJson.logo);
        const logoPathInTarget = path.join(APP_PATH, `${uuid}${logoExt}`);
        try {
            fs.copyFileSync(logoPathInAsar, logoPathInTarget);
            console.log('Logo 文件复制成功！');
        } catch (err) {
            console.error('复制logo文件失败:', err);
        }

        return { success: true, uuid };
    } catch (error) {
        console.error('导入应用失败:', error);
        return handleError(error, 'handleImportApp');
    }
}

module.exports = {
    getAppList,
    getAppInfo,
    handleImportApp
}