const path = require('path');
const fs = require('fs');
const asar = require('asar');
const { execSync } = require('child_process');

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
        const tmpDir = path.join(outputDir, 'tmp');
        const asarPath = path.join(outputDir, `${appDevItem.appJson.id}-${appDevItem.appJson.version}.asar`);

        // 创建输出目录和临时目录
        if (fs.existsSync(outputDir)) {
            // app.asar 有其特殊性，它是文件，在linux使用fs.rmSync时代码会尝试以目录方式删除它，实际上它是个文件（fs.state(xxx.asar)）
            // fs.rmSync(outputDir, { recursive: true });
            if (process.platform === 'win32') {
                // Windows
                execSync(`del /s /q "${outputDir}"`, { stdio: 'inherit' });
                execSync(`rmdir /s /q "${outputDir}"`, { stdio: 'inherit' });
            } else {
                // Linux/macOS
                execSync(`rm -rf "${outputDir}"`, { stdio: 'inherit' });
            }
        }
        // fs.mkdirSync(outputDir, { recursive: true });
        fs.mkdirSync(tmpDir, { recursive: true });
        console.info('outputDir:', outputDir, '\ntmpDir:', tmpDir);

        // 复制文件到临时目录
        buildConfig.files.forEach((pattern) => {
            console.info('partten: ', pattern);
            const fullPattern = path.join(appDevItem.path, pattern);
            console.info('fullPartten: ', fullPattern);
            const files = fs.globSync(fullPattern, { nodir: true });
            files.forEach((file) => {
                console.info('file: ', path.resolve(file));
                console.info('path.relative of file: ', path.relative('./', file));
                const dest = path.join(tmpDir, pattern);
                // fs.mkdirSync(path.resolve(tmpDir), { recursive: true });
                fs.cpSync(file, dest, { recursive: true });
            });
        });
        
        // 在临时目录中打包
        const tmpAsarPath = path.join(tmpDir, 'app.asar');
        await asar.createPackage(tmpDir, tmpAsarPath, {
            glob: ['**/*']
        });
        
        // 移动 asar 文件到输出目录
        fs.renameSync(tmpAsarPath, asarPath);
        
        // 删除临时目录
        // await fs.remove(tmpDir);
        
        return { success: true, msg: '打包成功', asarPath };
    } catch (err) {
        console.error('打包失败:', err);
        return { success: false, msg: err.message };
    }
};

module.exports = { buildAsar };