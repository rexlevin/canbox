const path = require('path');
const fs = require('fs');
const asar = require('asar');

/**
 * 打包应用为 asar 文件
 * @param {Object} appDevItem - 应用开发项
 * @returns {Promise<{success: boolean, msg: string}>} - 打包结果
 */
const buildAsar = async (appDevItem) => {
    try {
        const buildConfigPath = path.join(appDevItem.path, 'cb.build.json');
        const data = await fs.promises.readFile(buildConfigPath, 'utf8');
        const buildConfig = JSON.parse(data);
        
        const outputDir = path.join(appDevItem.path, buildConfig.outputDir);
        const asarPath = path.join(outputDir, `${appDevItem.appJson.id}-${appDevItem.appJson.version}.asar`);
        
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 打包文件到 asar
        await asar.createPackage(appDevItem.path, asarPath, {
            glob: buildConfig.files
        });
        
        return { success: true, msg: '打包成功', asarPath };
    } catch (err) {
        console.error('打包失败:', err);
        return { success: false, msg: err.message };
    }
};

module.exports = { buildAsar };