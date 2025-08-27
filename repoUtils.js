const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');

/**
 * 校验仓库地址格式
 * @param {string} repoUrl - 仓库地址
 * @returns {boolean} - 是否有效
 */
exports.validateRepoUrl = function(repoUrl) {
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
exports.getFileUrl = function(repoUrl, branch, file) {
    try {
        const url = new URL(repoUrl);
        const host = url.hostname;
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // GitHub
        if (host.includes('github.com')) {
            return `${repoUrl}/raw/${branch}/${file}`;
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
 * 下载文件并保存到指定路径
 * @param {string} fileUrl - 文件下载 URL
 * @param {string} filePath - 保存路径
 * @returns {Promise<boolean>} - 是否成功
 */
exports.downloadFileFromRepo = async function(fileUrl, filePath) {
    try {
        console.log(`尝试下载文件: ${fileUrl}`);
        const response = await fetch(fileUrl);
        if (!response.ok) {
            console.warn(`下载失败(${response.status}): ${fileUrl}`);
            return false;
        }
        const content = await response.text();
        fs.writeFileSync(filePath, content);
        console.log(`文件下载成功: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`下载文件错误(${fileUrl}):`, error);
        return false;
    }
};