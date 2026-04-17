/**
 * 文件操作服务
 * 封装文件操作，提供统一的文件操作接口
 */
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const FileTaskPath = require('./file-path');

class FileOperation {
    /**
     * 准备临时空间
     * @param {string} type - 任务类型
     * @param {string} uid - 业务标识
     * @returns {Promise<string>} 临时目录路径
     */
    async prepareTempSpace(type, uid) {
        const tempPath = FileTaskPath.getTaskTempPath(type, uid);

        // 确保基础目录存在
        const basePath = FileTaskPath.getTempBasePath(type);
        await fse.ensureDir(basePath);

        // 清理可能存在的旧目录
        await fse.remove(tempPath);

        // 创建新的临时目录
        await fse.ensureDir(tempPath);

        return tempPath;
    }

    /**
     * 清空目录内容
     * @param {string} dirPath - 目录路径
     * @returns {Promise<void>}
     */
    async emptyDir(dirPath) {
        await fse.emptyDir(dirPath);
    }

    /**
     * 删除目录
     * @param {string} dirPath - 目录路径
     * @returns {Promise<void>}
     */
    async removeDir(dirPath) {
        await fse.remove(dirPath);
    }

    /**
     * 解压 zip 文件
     * @param {string} zipPath - zip 文件路径
     * @param {string} destPath - 目标目录
     * @param {Function} onProgress - 进度回调
     * @returns {Promise<void>}
     */
    async extractZip(zipPath, destPath, onProgress) {
        // 确保目标目录存在
        await fse.ensureDir(destPath);

        if (process.platform === 'win32') {
            // Windows 使用 PowerShell
            execSync(
                `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`,
                { stdio: 'inherit' }
            );
        } else {
            // Linux/macOS 使用 unzip
            execSync(`unzip -o "${zipPath}" -d "${destPath}"`, { stdio: 'inherit' });
        }

        if (onProgress) {
            onProgress(100, 'Extraction completed', 0);
        }
    }

    /**
     * 移动目录内容
     * @param {string} src - 源路径
     * @param {string} dest - 目标路径
     * @returns {Promise<void>}
     */
    async moveDir(src, dest) {
        await fse.move(src, dest, { overwrite: true });
    }

    /**
     * 复制文件
     * @param {string} src - 源文件路径
     * @param {string} dest - 目标文件路径
     * @returns {Promise<void>}
     */
    async copyFile(src, dest) {
        // 确保目标目录存在
        await fse.ensureDir(path.dirname(dest));
        await fse.copyFile(src, dest);
    }

    /**
     * 复制目录
     * @param {string} src - 源目录路径
     * @param {string} dest - 目标目录路径
     * @returns {Promise<void>}
     */
    async copyDir(src, dest) {
        await fse.copy(src, dest, { overwrite: true });
    }

    /**
     * 清理任务临时目录
     * @param {string} tempPath - 临时目录路径
     * @returns {Promise<void>}
     */
    async cleanupTemp(tempPath) {
        if (tempPath && fs.existsSync(tempPath)) {
            await fse.remove(tempPath);
        }
    }

    /**
     * 读取目录内容
     * @param {string} dirPath - 目录路径
     * @returns {Promise<string[]>}
     */
    async readDir(dirPath) {
        return await fse.readdir(dirPath);
    }

    /**
     * 检查路径是否存在
     * @param {string} filePath - 文件路径
     * @returns {boolean}
     */
    exists(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * 读取文件
     * @param {string} filePath - 文件路径
     * @param {string} encoding - 编码
     * @returns {string|Buffer}
     */
    async readFile(filePath, encoding = 'utf8') {
        return await fse.readFile(filePath, encoding);
    }

    /**
     * 写入文件
     * @param {string} filePath - 文件路径
     * @param {string|Buffer} content - 内容
     * @returns {Promise<void>}
     */
    async writeFile(filePath, content) {
        await fse.ensureDir(path.dirname(filePath));
        await fse.writeFile(filePath, content);
    }

    /**
     * 删除文件
     * @param {string} filePath - 文件路径
     * @returns {Promise<void>}
     */
    async removeFile(filePath) {
        if (fs.existsSync(filePath)) {
            await fse.remove(filePath);
        }
    }
}

module.exports = FileOperation;
