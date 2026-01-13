const path = require('path');
const fs = require('fs');
const originalFs = require('original-fs'); // 使用 original-fs 来操作 asar 文件
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');
const { getAppPath, getAppTempPath, getAppIconPath } = require('@modules/main/pathManager');
const { handleError } = require('@modules/ipc/errorHandler')
const DateFormat = require('@modules/utils/DateFormat');
const logger = require('@modules/utils/logger');
const fsUtils = require('@modules/utils/fs-utils');

// 延迟加载 sharp 的缓存，只在需要时动态加载（仅 Windows）
let sharpCache = null;

/**
 * 动态加载 sharp 模块
 * @returns {sharp|null} sharp 实例或 null
 */
function getSharp() {
    if (process.platform !== 'win32') {
        return null;
    }

    if (sharpCache === null) {
        try {
            // 使用动态 require，避免在非 Windows 平台加载
            const sharpModule = require('sharp');
            sharpCache = sharpModule;
        } catch (error) {
            console.warn('sharp 模块加载失败，图标转换功能将不可用:', error.message);
            sharpCache = false; // 标记为已尝试加载但失败
        }
    }

    return sharpCache || null;
}

/**
 * 将 PNG/JPEG 图片转换为 ICO 格式
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出 ICO 路径
 */
async function convertToIco(inputPath, outputPath) {
    const sharp = getSharp();
    if (!sharp) {
        console.warn('sharp 模块未加载，跳过图标转换');
        return false;
    }

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
        return true;
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
        return false;
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
            originalFs.rmSync(getAppTempPath(), { recursive: true, force: true });
            logger.info(`${getAppTempPath()} 目录已删除（使用 original-fs）`);
        } else {
            logger.info(`${getAppTempPath()} 目录不存在，跳过删除`);
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
        // 使用 fs.copyFileSync 替代命令行复制
        fs.copyFileSync(absoluteAsarPath, targetPath);
        console.log('ZIP 文件复制成功！');

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
        // 将 getAppTempPath() 下的所有文件移动到 getAppPath() 下，使用 original-fs 来操作 asar 文件
        if (fs.existsSync(getAppTempPath())) {
            if (!fs.existsSync(getAppPath())) {
                fs.mkdirSync(getAppPath(), { recursive: true });
            }
            // 使用 original-fs 复制文件，然后删除源文件（避免跨目录移动的权限问题）
            const filesToMove = originalFs.readdirSync(getAppTempPath());
            filesToMove.forEach(file => {
                const srcPath = path.join(getAppTempPath(), file);
                const destPath = path.join(getAppPath(), file);
                // 先复制文件，设置权限
                originalFs.cpSync(srcPath, destPath, { dereference: true });
                // 删除源文件
                originalFs.rmSync(srcPath, { recursive: true, force: true });
            });
            // 删除临时目录
            originalFs.rmSync(getAppTempPath(), { recursive: true, force: true });
        }

        console.info(DateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        console.info(DateFormat.format(new Date()));

        const asarTargetPath = path.join(getAppPath(), `${uuid}.asar`);
        // 使用 original-fs 读取 asar 文件内部内容（Flatpak 环境中必需）
        const appJson = JSON.parse(originalFs.readFileSync(path.join(asarTargetPath, 'app.json'), 'utf8'));

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
        const logoExt = path.extname(appJson.logo).toLowerCase();
        const logoPathInTarget = path.join(getAppPath(), `${uuid}${logoExt}`);

        try {
            fs.copyFileSync(logoPathInAsar, logoPathInTarget);
            console.log('Logo 文件复制成功！');

            // Windows 下生成 ICO 格式的图标
            if (process.platform === 'win32' && (logoExt === '.png' || logoExt === '.jpg' || logoExt === '.jpeg')) {
                const icoPath = path.join(getAppPath(), `${uuid}.ico`);
                console.log('开始生成 ICO 文件...');
                await convertToIco(logoPathInTarget, icoPath);
            }
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