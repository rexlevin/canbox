const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const glob = require('glob'); 
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
        const buildConfig = JSON.parse(fs.readFileSync(buildConfigPath, 'utf8'));
        
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
            const matchedFiles = glob.sync(fullPattern, { nodir: true }); // 匹配所有文件（不包括目录）
            if (matchedFiles.length === 0) {
                console.warn(`Warning: No files matched "${filePattern}", skipping.`);
                return;
            }

            matchedFiles.forEach((filePath) => {
                const relativePath = path.relative(appDevItem.path, filePath); // 计算相对路径（如 "build/main.js"）
                const destPath = path.join(tmpDir, relativePath); // 目标路径（保持目录结构）

                // 确保目标目录存在
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }

                // 复制文件
                fs.copyFileSync(filePath, destPath);
            });
            // const files = fs.globSync(fullPattern, { nodir: true });
            // files.forEach((file) => {
            //     console.info('file: ', path.resolve(file));
            //     console.info('path.relative of file: ', path.relative('./', file));
            //     const dest = path.join(tmpDir, pattern);
            //     fs.mkdirSync(path.resolve(tmpDir), { recursive: true });
            //     fs.cpSync(file, dest, { recursive: true });
            // });
        });

        copyNodeModulesWithoutDevDeps(appDevItem, buildConfig);
        
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

function copyNodeModulesWithoutDevDeps(appDevItem, buildConfig) {
    const workDir = appDevItem.path;
    const tmpDir = path.join(workDir, buildConfig.outputDir, 'tmp');
    console.info('tmpDir:', tmpDir);
    // const buildConfig = JSON.parse(fs.readFileSync(buildConfigPath, 'utf8'));
    const packageJson = JSON.parse(fs.readFileSync(path.join(workDir, 'package.json'), 'utf8'));
    // path.join(workDir, 'package.json');
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    const optionalDependencies = Object.keys(packageJson.optionalDependencies || {});

    // 要排除的依赖（devDependencies + optionalDependencies）
    const excludedDeps = [...devDependencies, ...optionalDependencies];

    // 确保 node_modules 存在
    const nodeModulesSrc = path.join(workDir, 'node_modules');
    const nodeModulesDest = path.join(tmpDir, 'node_modules');

    if (!fs.existsSync(nodeModulesSrc)) {
        console.warn('Warning: node_modules not found, skipping.');
        return;
    }

    console.info('dependencies length: ', dependencies.length);
    // 遍历 dependencies 并复制
    dependencies.forEach((dep) => {
        if (excludedDeps.includes(dep)) {
            console.log(`⚠️ Skipping devDependency: ${dep}`);
            return;
        }

        const depSrc = path.join(nodeModulesSrc, dep);
        const depDest = path.join(nodeModulesDest, dep);

        if (fs.existsSync(depSrc)) {
            fse.copySync(depSrc, depDest); // 递归复制整个依赖目录
        } else {
            console.warn(`Warning: Dependency "${dep}" not found in node_modules.`);
        }
    });

    console.log('✅ node_modules copied (excluding devDependencies).');
}

module.exports = { buildAsar };