const path = require('path');
const fs = require('fs');
const originalFs = require('original-fs'); // 使用 original-fs 来操作 asar 文件
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');
const { getAppPath, getAppTempPath } = require('@modules/main/pathManager');
const { handleError } = require('@modules/ipc/errorHandler')
const DateFormat = require('@modules/utils/DateFormat');
const logger = require('@modules/utils/logger');
const fsUtils = require('@modules/utils/fs-utils');

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
function getAppInfo(uid) {
    console.info('uid:', uid);
    if (!uid) {
        return handleError(new Error('uid 不能为空'), 'getAppInfo');
    }
    // 判断是否为开发中的应用
    const devFlag = JSON.stringify(getAppsStore().get('default')[uid] || {}) === '{}';
    const appItem = getAppsStore().get('default')[uid] || getAppsDevStore().get('default')[uid];
    const appPath = devFlag ? appItem.path : path.join(getAppPath(), uid + '.asar');

    // const appItemJsonStr = fs.readFileSync(path.join(appPath, 'app.json'), 'utf8');
    // const appItem = JSON.parse(appItemJsonStr);
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
        readFileWithErrorHandling(path.join(appPath, 'README.md')),
        readFileWithErrorHandling(path.join(appPath, 'HISTORY.md'))
    ];

    const msg = (readme || history) ? null : '部分文件读取失败';
    return { success: null === msg, data: { readme, history }, msg };
}

/**
 * 导入应用
 * @param {*} event 
 * @param {string} zipPath 
 * @param {string} uid 
 * @returns 
 */
async function handleImportApp(event, zipPath, uid) {
    logger.info('{} handleImportApp: {}', uid||'', zipPath);
    // 如果uid有值说明是从repos下载的，importTag为false，否则是导入的，importTag为true
    const importTag = !uid?.trim();
    try {
        // 检查是否有 getAppTempPath() 目录，有则删除，使用 original-fs 来操作 asar 文件
        if (fs.existsSync(getAppTempPath())) {
            logger.info(`${getAppTempPath()} 目录开始删除`);
            try {
                originalFs.rmSync(getAppTempPath(), { recursive: true, force: true });
                logger.info(`${getAppTempPath()} 目录已删除（使用 original-fs）`);
            } catch (error) {
                // 如果 original-fs 删除失败，回退到系统命令
                logger.warn(`original-fs 删除失败，回退到系统命令: ${error}`);
                if (process.platform === 'win32') {
                    await execSync(`del /f /q "${getAppTempPath()}"`, { stdio: 'inherit' });
                } else {
                    await execSync(`rm -rf "${getAppTempPath()}"`, { stdio: 'inherit' });
                }
                logger.info(`${getAppTempPath()} 目录已删除（使用系统命令）`);
            }
        } else {
            logger.info(`${getAppTempPath()} 目录不存在，跳过删除`);
        }
        // 创建 getAppTempPath() 目录
        fs.mkdirSync(getAppTempPath(), { recursive: true });
        logger.info('11111111111');

        // 将文件复制到 getAppTempPath() 目录下
        const uuid = uid || uuidv4().replace(/-/g, '');
        const targetPath = path.join(getAppTempPath(), `${uuid}.zip`);
        logger.info('22222222222');

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
        logger.info('333333333333333');

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
        // 将 getAppTempPath() 下的所有文件移动到 getAppPath() 下，由于asar文件的特殊性，这里使用系统命令来进行移动操作
        if (fs.existsSync(getAppTempPath())) {
            if (!fs.existsSync(getAppPath())) {
                fs.mkdirSync(getAppPath(), { recursive: true });
            }
            if (process.platform === 'win32') {
                await execSync(`move "${getAppTempPath()}\\*" "${getAppPath()}\\"`, { stdio: 'inherit' });
            } else {
                await execSync(`mv "${getAppTempPath()}"/* "${getAppPath()}"`, { stdio: 'inherit' });
            }
        }
        logger.info('4444444444444444');

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
            logo: appJson.logo || ''
        };
        if (importTag) {
            appsConfig[uuid].sourceTag = 'import';
            appsConfig[uuid].importTime = DateFormat.format(new Date());
        }
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