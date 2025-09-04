const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { getAppsStore } = require('./storageManager');
const { getAppPath, getAppTempPath } = require('./pathManager');
const { handleError } = require('./ipc/errorHandler')
const DateFormat = require('../utils/DateFormat');
const logger = require('./utils/logger');

/**
 * 获取所有应用数据
 * @returns {Object} 应用数据
 */
function getAllApps() {
    try {
        const appsData = getAppsStore().get('default') || {};
        if (!appsData || Object.keys(appsData).length === 0) {
            // return handleError(new Error('当前没有应用数据'), 'getAllApps');
            console.info('当前没有应用数据');
            return { success: true, data: {}};
        }
        Object.entries(appsData).forEach(([uid, appItem]) => {
            const appJson = JSON.parse(fs.readFileSync(path.join(getAppPath(), uid + '.asar/app.json'), 'utf8'));
            const iconPath = path.join(getAppPath(), uid + '.asar', appJson.logo);
            const appJsonData = {...appJson, logo: iconPath };
            appItem.appJson = appJsonData;
        });
        return { success: true, data: appsData };
    } catch (err) {
        return handleError(err, 'getAllApps');
    }
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
    logger.info('{} handleImportApp: {}', uid||'', zipPath);
    try {

        // 检查是否有 getAppTempPath() 目录，有则删除
        if (fs.existsSync(getAppTempPath())) {
            if (process.platform === 'win32') {
                await execSync(`del /f /q "${getAppTempPath()}"`, { stdio: 'inherit' });
            } else {
                await execSync(`rm -rf "${getAppTempPath()}"`, { stdio: 'inherit' });
            }
        }
        // 创建 getAppTempPath() 目录
        fs.mkdirSync(getAppTempPath(), { recursive: true });

        // 将文件复制到 getAppTempPath() 目录下
        const uuid = uid || uuidv4().replace(/-/g, '');
        const targetPath = path.join(getAppTempPath(), `${uuid}.zip`);

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

        // 将 getAppTempPath() 目录下的 zip 文件解压
        if (process.platform === 'win32') {
            execSync(`powershell -Command "Expand-Archive -Path '${targetPath}' -DestinationPath '${getAppTempPath()}'"`, { stdio: 'inherit' });
        } else {
            execSync(`unzip -o "${targetPath}" -d "${getAppTempPath()}"`, { stdio: 'inherit' });
        }
        console.info('解压成功:', getAppTempPath());
        // 删除 zip 文件
        fs.rmSync(targetPath, { recursive: true, force: true });
        // 重命名文件：检查 getAppTempPath() 下的文件和目录，如果当前存在 xxxx.asar 则改为 ${uuid}.asar，xxxx.asar.unpacked 改为 ${uuid}.asar.unpacked
        const files = fs.readdirSync(getAppTempPath());
        files.forEach(file => {
            console.info('file:', file);
            if (file.endsWith('.asar')) {
                fs.renameSync(path.join(getAppTempPath(), file), path.join(getAppTempPath(), `${uuid}.asar`));
            } else if (file.endsWith('.asar.unpacked')) {
                fs.renameSync(path.join(getAppTempPath(), file), path.join(getAppTempPath(), `${uuid}.asar.unpacked`));
            }
        });
        // 将 getAppTempPath() 下的所有文件移动到 getAppPath() 下
        if (fs.existsSync(getAppTempPath())) {
            if (process.platform === 'win32') {
                await execSync(`move "${getAppTempPath()}\\*" "${getAppPath()}"`, { stdio: 'inherit' });
            } else {
                await execSync(`mv "${getAppTempPath()}"/* "${getAppPath()}"`, { stdio: 'inherit' });
            }
        }

        console.info(DateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        console.info(DateFormat.format(new Date()));

        const asarTargetPath = path.join(getAppPath(), `${uuid}.asar`);
        const appJson = JSON.parse(fs.readFileSync(path.join(asarTargetPath, 'app.json'), 'utf8'));

        let appsConfig = getAppsStore().get('default') || {};
        appsConfig[uuid] = {
            id: appJson.id || '',
            name: appJson.name || '',
            version: appJson.version || '',
            description: appJson.description || '',
            author: appJson.author || '',
            logo: appJson.logo || '',
            sourceTag: 'import',
            importTime: DateFormat.format(new Date())
        };
        getAppsStore().set('default', appsConfig);

        // 复制logo文件到目标目录
        const logoPathInAsar = path.join(asarTargetPath, appJson.logo);
        const logoExt = path.extname(appJson.logo);
        const logoPathInTarget = path.join(getAppPath(), `${uuid}${logoExt}`);
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
    getAllApps,
    getAppInfo,
    handleImportApp
}