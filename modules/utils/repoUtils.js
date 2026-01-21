const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');

/**
 * 校验仓库地址格式
 * @param {string} repoUrl - 仓库地址
 * @returns {boolean} - 是否有效
 */
exports.validateRepoUrl = function (repoUrl) {
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlPattern.test(repoUrl);
};

/**
 * 根据仓库类型生成文件下载 URL
 * @param {string} repoUrl - 仓库地址
 * @param {string} branch - 分支
 * @param {string} file - 文件路径
 * @returns {string} - 文件下载 URL
 */
exports.getFileUrl = function (repoUrl, branch, file) {
    try {
        const url = new URL(repoUrl);
        const host = url.hostname;
        const pathParts = url.pathname.split('/').filter(Boolean);

        // GitHub
        if (host.includes('github.com')) {
            return `https://raw.githubusercontent.com/${repoUrl.split('/').slice(3).join('/')}/${branch}/${file}`;
        }
        // GitLab
        else if (host.includes('gitlab.com') || host.includes('gitlab.')) {
            return `${repoUrl}/-/raw/${branch}/${file}`;
        }
        // Bitbucket
        else if (host.includes('bitbucket.org')) {
            return `${repoUrl}/raw/${branch}/${file}`;
        }
        // Gitee
        else if (host.includes('gitee.com')) {
            return `${repoUrl}/raw/${branch}/${file}`;
        }
        // 自托管服务（如Gitea/GitLab CE）
        else {
            // 尝试常见模式
            return `${repoUrl}/raw/branch/${branch}/${file}`;
        }
    } catch (e) {
        console.error('解析仓库URL失败:', e);
        return `${repoUrl}/raw/${branch}/${file}`; // 默认回退
    }
};

/**
 * 根据仓库类型生成下载 URL（用于版本文件或归档文件）
 * @param {string} repo - 仓库地址
 * @param {string} version - 版本号
 * @param {string} fileName - 文件名
 * @returns {string} - 下载 URL
 */
exports.getDownloadUrl = function (repo, version, fileName) {
    try {
        const url = new URL(repo);
        const host = url.hostname;

        // GitHub
        if (host.includes('github.com')) {
            return `${repo}/releases/download/${version}/${fileName}`;
        }
        // GitLab
        else if (host.includes('gitlab.com')) {
            return `${repo}/-/archive/v${version}/${fileName}`;
        }
        // Bitbucket
        else if (host.includes('bitbucket.org')) {
            return `${repo}/downloads/${fileName}`;
        }
        // Gitee
        else if (host.includes('gitee.com')) {
            return `${repo}/releases/download/${version}/${fileName}`;
        }
        // 自托管服务（如 Gitea/GitLab CE）
        else {
            return `${repo}/archive/${fileName}`;
        }
    } catch (e) {
        console.error('解析仓库URL失败:', e);
        return `${repo}/archive/${fileName}`; // 默认回退
    }
};

/**
 * 下载文件并保存到指定路径
 * @param {string} fileUrl - 文件下载 URL
 * @param {string} filePath - 保存路径
 * @returns {Promise<boolean>} - 是否成功
 */
exports.downloadFileFromRepo = async function (fileUrl, filePath) {
    try {
        console.log(`尝试下载文件: ${fileUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        const response = await fetch(fileUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.warn(`下载失败(${response.status}): ${fileUrl}`);
            return false;
        }
        const content = await response.text();
        fs.writeFileSync(filePath, content);
        console.log(`文件下载成功: ${filePath}`);
        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`下载超时: ${fileUrl}`);
        } else {
            console.error(`下载文件错误(${fileUrl}):`, error);
        }
        return false;
    }
};

/**
 * 下载图片并保存到指定路径
 * @param {string} fileUrl - 文件下载 URL
 * @param {string} filePath - 保存路径
 * @returns {Promise<boolean>} - 是否成功
 */
exports.downloadLogoFromRepo = async function (fileUrl, filePath) {
    try {
        console.log(`尝试下载文件: ${fileUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
        const response = await fetch(fileUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.warn(`下载失败(${response.status}): ${fileUrl}`);
            return false;
        }
        // 根据文件类型选择处理方式
        const isBinary = filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.gif');
        if (isBinary) {
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));
        } else {
            const content = await response.text();
            fs.writeFileSync(filePath, content);
        }
        console.log(`文件下载成功: ${filePath}`);
        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`下载超时: ${fileUrl}`);
        } else {
            console.error(`下载文件错误(${fileUrl}):`, error);
        }
        return false;
    }
};