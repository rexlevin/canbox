const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 递归创建目录
 * @param {string} dirPath - 目录路径
 */
exports.ensureDirExists = function(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * 删除目录及其内容
 * @param {string} dirPath - 目录路径
 */
exports.removeDir = function(dirPath) {
    fs.rmSync(dirPath, { recursive: true, force: true });
};

/**
 * 复制文件
 * @param {string} source - 源文件路径
 * @param {string} target - 目标文件路径
 */
exports.copyFile = function(source, target) {
    fs.copyFileSync(source, target);
};

/**
 * 执行系统命令
 * @param {string} command - 命令字符串
 */
exports.executeCommand = function(command) {
    execSync(command, { stdio: 'inherit' });
};