/**
 * GitHub Release 提供商
 *
 * 用于从 GitHub Releases API 获取更新信息
 *
 * 注意：
 * - electron-updater 已经内置了 GitHub 提供商支持
 * - 此文件主要用于扩展功能或自定义逻辑
 * - 当前版本暂未使用，保留用于未来扩展
 */

const axios = require('axios');
const semver = require('semver');
const logger = require('@modules/utils/logger');

/**
 * GitHub Release 提供商类
 * 提供从 GitHub Releases 获取更新信息的功能
 */
class GitHubProvider {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {string} options.owner - GitHub 用户名或组织名
   * @param {string} options.repo - 仓库名称
   * @param {string} options.apiBaseUrl - GitHub API 基础 URL
   */
  constructor(options = {}) {
    this.owner = options.owner || 'rexlevin';
    this.repo = options.repo || 'canbox';
    this.apiBaseUrl = options.apiBaseUrl || 'https://api.github.com';
    logger.debug('[GitHubProvider] 初始化: {}/{}', this.owner, this.repo);
  }

  /**
   * 获取最新版本信息
   * 从 GitHub Releases API 获取最新版本，并与当前版本比较
   * @param {string} currentVersion - 当前应用版本号
   * @returns {Promise<Object|null>} 最新版本信息，如果没有新版本则返回 null
   * @throws {Error} API 请求失败时抛出异常
   */
  async getLatestRelease(currentVersion) {
    try {
      const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/latest`;
      logger.debug('[GitHubProvider] 获取最新版本: {}', url);

      const response = await axios.get(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json'
        },
        timeout: 10000 // 10 秒超时
      });

      const release = response.data;
      const latestVersion = release.tag_name.replace(/^v/, '');

      logger.debug('[GitHubProvider] 最新版本: v{}，当前版本: v{}', latestVersion, currentVersion);

      // 比较版本号
      if (semver.valid(currentVersion) && semver.valid(latestVersion)) {
        if (semver.gt(latestVersion, currentVersion)) {
          logger.info('[GitHubProvider] 发现新版本: v{} -> v{}', currentVersion, latestVersion);
          return this._formatReleaseInfo(release);
        } else {
          logger.debug('[GitHubProvider] 当前版本已是最新');
          return null;
        }
      } else {
        logger.warn('[GitHubProvider] 版本号格式无效: current={}, latest={}', currentVersion, latestVersion);
        return null;
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logger.error('[GitHubProvider] 仓库不存在或没有发布任何版本');
      } else {
        logger.error('[GitHubProvider] 获取最新版本失败: {}', error.message);
      }
      throw error;
    }
  }

  /**
   * 格式化 Release 信息
   * 将 GitHub API 返回的 Release 数据转换为统一格式
   * @param {Object} release - GitHub API 返回的 Release 对象
   * @returns {Object} 格式化后的 Release 信息
   * @private
   */
  _formatReleaseInfo(release) {
    return {
      version: release.tag_name.replace(/^v/, ''),
      releaseName: release.name || release.tag_name,
      releaseDate: release.published_at,
      releaseNotes: release.body,
      url: release.html_url,
      assets: release.assets.map(asset => ({
        name: asset.name,
        size: asset.size,
        downloadUrl: asset.browser_download_url,
        contentType: asset.content_type
      }))
    };
  }

  /**
   * 根据平台和架构获取对应的更新包
   * 从最新 Release 的 assets 中查找匹配当前平台和架构的更新包
   * @param {string} platform - 平台 (linux, win32, darwin)
   * @param {string} arch - 架构 (x64, arm64, ia32)
   * @returns {Promise<Object|null>} 匹配的更新包信息，未找到则返回 null
   * @throws {Error} API 请求失败时抛出异常
   */
  async getUpdateAsset(platform, arch) {
    try {
      logger.debug('[GitHubProvider] 获取更新包: platform={}, arch={}', platform, arch);

      const url = `${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/releases/latest`;
      const response = await axios.get(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });

      const release = response.data;
      const assets = release.assets;

      // 平台映射
      const platformMap = {
        linux: 'linux',
        win32: 'win',
        darwin: 'darwin'
      };

      // 架构映射
      const archMap = {
        x64: 'x64',
        x64_64: 'x64',
        arm64: 'arm64',
        ia32: 'ia32'
      };

      const platformKey = platformMap[platform] || platform;
      const archKey = archMap[arch] || arch;

      // 查找匹配的资产
      const asset = assets.find(a => {
        const name = a.name.toLowerCase();
        return name.includes(platformKey.toLowerCase()) &&
               name.includes(archKey.toLowerCase());
      });

      if (!asset) {
        logger.warn('[GitHubProvider] 未找到匹配的更新包: {} {}', platform, arch);
        logger.debug('[GitHubProvider] 可用的更新包: {}', assets.map(a => a.name).join(', '));
        return null;
      }

      logger.debug('[GitHubProvider] 找到匹配的更新包: {} ({} MB)', asset.name, (asset.size / 1024 / 1024).toFixed(2));

      return {
        name: asset.name,
        size: asset.size,
        downloadUrl: asset.browser_download_url,
        contentType: asset.content_type
      };
    } catch (error) {
      logger.error('[GitHubProvider] 获取更新包失败: {}', error.message);
      throw error;
    }
  }
}

module.exports = GitHubProvider;
