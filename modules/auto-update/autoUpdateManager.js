/**
 * 自动更新管理器
 * 负责管理自动更新的核心逻辑
 *
 * 功能：
 * - 检查更新
 * - 下载更新
 * - 安装更新
 * - 版本跳过
 * - 事件通知
 */

const { autoUpdater } = require('electron-updater');
const semver = require('semver');
const { ipcMain } = require('electron');
const logger = require('@modules/utils/logger');
const { UPDATE_EVENTS } = require('./autoUpdateEvents');
const {
  getConfig,
  saveConfig,
  shouldCheckUpdate,
  updateLastCheckTime,
  addSkippedVersion,
  isVersionSkipped
} = require('./autoUpdateConfig');

/**
 * 自动更新管理器类
 * 使用单例模式确保全局只有一个实例
 */
class AutoUpdateManager {
  constructor() {
    // 更新信息
    this.updateInfo = null;

    // 更新状态
    this.status = {
      state: 'idle',        // idle/checking/downloading/ready/installing/error
      progress: 0,
      error: null,
      updateInfo: null
    };

    // 主窗口引用（用于发送事件）
    this.mainWindow = null;

    // 标记是否为启动时检查
    this.isStartupCheck = false;

    // 初始化 autoUpdater
    this._initAutoUpdater();
  }

  /**
   * 初始化 electron-updater
   * 配置自动更新行为
   * @private
   */
  _initAutoUpdater() {
    // 不自动下载更新包，由用户手动触发
    autoUpdater.autoDownload = false;
    // 不允许降级更新
    autoUpdater.allowDowngrade = false;

    // 检测当前平台
    const { platform } = process;
    logger.info('[AutoUpdate] 当前平台: {}, 已打包: {}', platform, process.windowsStore);

    // AppImage 平台需要在退出时自动安装更新
    const isAppImage = platform === 'linux' && process.env.APPIMAGE !== undefined;
    autoUpdater.autoInstallOnAppQuit = isAppImage;
    logger.info('[AutoUpdate] autoInstallOnAppQuit: {} (AppImage: {})', autoUpdater.autoInstallOnAppQuit, isAppImage);

    // 输出 App 路径用于调试
    const appPath = process.argv[0];
    const appPathResolved = require('path').resolve(appPath);
    logger.info('[AutoUpdate] 应用路径: {}', appPath);
    logger.info('[AutoUpdate] 应用路径（绝对）: {}', appPathResolved);

    // 输出 feedURL 用于调试
    const feedUrl = autoUpdater.getFeedURL();
    logger.info('[AutoUpdate] Feed URL: {}', feedUrl || '未设置（将使用 package.json 配置）');

    // 输出缓存目录
    const { app } = require('electron');
    logger.info('[AutoUpdate] 用户数据目录: {}', app.getPath('userData'));
    logger.info('[AutoUpdate] 临时目录: {}', app.getPath('temp'));

    // 设置更新事件监听器
    this._setupUpdateEventListeners();

    logger.info('[AutoUpdate] 自动更新管理器已初始化');
  }

  /**
   * 设置更新事件监听器
   * 监听 electron-updater 的各种事件，并通过 IPC 转发到渲染进程
   * @private
   */
  _setupUpdateEventListeners() {
    // 发现新版本
    autoUpdater.on('update-available', (info) => {
      logger.info('[AutoUpdate] ✅ 事件触发: update-available - 发现新版本: v{}', info.version);
      this.updateInfo = info;
      this.status.updateInfo = info;
      this.status.state = 'ready';

      // 通知渲染进程显示更新对话框
      this._sendEvent(UPDATE_EVENTS.UPDATE_AVAILABLE, this._formatUpdateInfo(info));
    });

    // 无可用更新
    autoUpdater.on('update-not-available', (info) => {
      logger.info('[AutoUpdate] ✅ 事件触发: update-not-available - 已是最新版本: v{}', info.version);
      this.status.state = 'idle';

      // 通知渲染进程（可选）
      this._sendEvent(UPDATE_EVENTS.UPDATE_NOT_AVAILABLE, {
        version: info.version
      });
    });

    // 下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      logger.debug('[AutoUpdate] 下载进度: {}% ({} KB/s)', progressObj.percent.toFixed(2), Math.floor(progressObj.bytesPerSecond / 1024));
      this.status.state = 'downloading';
      this.status.progress = progressObj.percent;

      // 通知渲染进程更新进度条
      this._sendEvent(UPDATE_EVENTS.DOWNLOAD_PROGRESS, {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    });

    // 下载完成
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('[AutoUpdate] 更新包下载完成');
      this.status.state = 'ready';
      this.status.progress = 100;

      // 检测是否为 Linux AppImage 平台
      const isAppImage = process.platform === 'linux' && process.env.APPIMAGE !== undefined;
      logger.info('[AutoUpdate] 平台检测: {}, 是否为 AppImage: {}', process.platform, isAppImage);

      // 根据 platform 发送不同事件
      if (isAppImage) {
        // Linux AppImage：发送特殊事件，提示用户退出并手动重启
        logger.info('[AutoUpdate] Linux AppImage 检测到，发送 UPDATE_DOWNLOADED_RESTART 事件');
        this._sendEvent(UPDATE_EVENTS.UPDATE_DOWNLOADED_RESTART, {
          ...this._formatUpdateInfo(info),
          isAppImage: true
        });
      } else {
        // 其他平台：发送普通事件，可以自动更新并重启
        logger.info('[AutoUpdate] 发送 UPDATE_DOWNLOADED 事件');
        this._sendEvent(UPDATE_EVENTS.UPDATE_DOWNLOADED, this._formatUpdateInfo(info));
      }
    });

    // 更新错误
    autoUpdater.on('error', (error) => {
      logger.error('[AutoUpdate] ❌ 事件触发: error - 更新错误: {} (代码: {})', error.message, error.code || 'UNKNOWN');
      logger.error('[AutoUpdate] ❌ 错误堆栈: {}', error.stack);
      this.status.state = 'error';
      this.status.error = error;

      // 根据是否为启动时检查决定事件内容
      const errorData = {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        isStartupCheck: this.isStartupCheck  // 标记是否为启动时检查
      };

      logger.info('[AutoUpdate] 发送错误事件，启动时检查: {}', this.isStartupCheck);

      // 通知渲染进程显示错误信息
      this._sendEvent(UPDATE_EVENTS.UPDATE_ERROR, errorData);
    });
  }

  /**
   * 设置主窗口引用
   * 用于向渲染进程发送事件
   * @param {BrowserWindow} win - Electron BrowserWindow 实例
   */
  setMainWindow(win) {
    this.mainWindow = win;
    logger.debug('[AutoUpdate] 主窗口引用已设置');
  }

  /**
   * 设置启动时检查标志
   * 用于区分启动时错误和手动检查错误
   * @param {boolean} isStartup - 是否为启动时检查
   */
  setStartupCheck(isStartup) {
    this.isStartupCheck = isStartup;
    logger.debug('[AutoUpdate] 设置启动时检查标志: {}', isStartup);
  }

  /**
   * 检查更新
   * 根据 GitHub Releases 检查是否有新版本
   * @returns {Promise<Object>} 检查结果
   */
  async checkForUpdates() {
    // 保存当前的 isStartupCheck 状态，避免竞态条件
    const isStartupCheck = this.isStartupCheck;
    logger.debug('[AutoUpdate] checkForUpdates 开始，isStartupCheck: {}', isStartupCheck);

    try {
      logger.info('[AutoUpdate] 开始检查更新');

      // 读取配置
      const config = await getConfig();
      if (!config.enabled) {
        logger.info('[AutoUpdate] 检查结果: 自动更新已禁用，跳过检查');
        return { available: false, reason: 'disabled' };
      }

      // 检查是否需要根据频率进行检查
      if (!(await shouldCheckUpdate(config))) {
        logger.info('[AutoUpdate] 检查结果: 不需要检查更新（检查频率限制）');
        return { available: false, reason: 'not-yet' };
      }

      this.status.state = 'checking';

      // 调用 electron-updater 检查更新，添加 30 秒超时保护
      logger.debug('[AutoUpdate] 调用 electron-updater 检查更新（30秒超时）');
      const checkPromise = autoUpdater.checkForUpdates();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          logger.warn('[AutoUpdate] 更新检查超时（30秒）');
          reject(new Error('net::ERR_CONNECTION_TIMED_OUT'));
        }, 30000);
      });

      const updateCheckResult = await Promise.race([checkPromise, timeoutPromise]);

      logger.info('[AutoUpdate] electron-updater 检查完成，结果: {}', JSON.stringify(updateCheckResult ? {
        updateInfo: updateCheckResult.updateInfo ? {
          version: updateCheckResult.updateInfo.version,
          releaseDate: updateCheckResult.updateInfo.releaseDate
        } : null,
        downloadPromise: updateCheckResult.downloadPromise ? 'exists' : 'none',
        cancellationToken: updateCheckResult.cancellationToken ? 'exists' : 'none'
      } : 'null'));

      // 获取当前应用版本
      const { app } = require('electron');
      const currentVersion = app.getVersion();
      logger.info('[AutoUpdate] 当前版本: {}', currentVersion);

      // 检查更新结果
      if (!updateCheckResult || !updateCheckResult.updateInfo) {
        logger.info('[AutoUpdate] 检查结果: 无可用更新，当前已是最新版本');
        return { available: false, reason: 'no-update' };
      }

      const updateInfo = updateCheckResult.updateInfo;

      // 比较版本号，只有新版本才继续处理
      if (!semver.gt(updateInfo.version, currentVersion)) {
        logger.info('[AutoUpdate] 检查结果: 当前版本 {} 已是最新（服务器版本: {}）', currentVersion, updateInfo.version);
        return { available: false, reason: 'up-to-date', currentVersion, serverVersion: updateInfo.version };
      }

      logger.info('[AutoUpdate] 检测到新版本: {} (当前版本: {})', updateInfo.version, currentVersion);

      // 检查该版本是否被用户跳过
      if (updateInfo.version && (await isVersionSkipped(updateInfo.version))) {
        logger.info('[AutoUpdate] 检查结果: 版本 v{} 已被用户跳过', updateInfo.version);
        return { available: false, reason: 'skipped', version: updateInfo.version };
      }

      // 更新最后检查时间
      await updateLastCheckTime(updateInfo.version);

      // 返回检查结果
      const result = {
        available: true,
        version: updateInfo.version,
        releaseDate: updateInfo.releaseDate,
        releaseNotes: updateInfo.releaseNotes
      };

      logger.info('[AutoUpdate] 检查结果: 成功，发现新版本 v{}，需要进行升级', updateInfo.version);
      return result;
    } catch (error) {
      logger.error('[AutoUpdate] 检查结果: 失败 - {}', error.message);
      this.status.state = 'error';
      this.status.error = error;

      // 手动发送错误事件（超时等同步错误不会触发 autoUpdater.on('error')）
      const errorData = {
        message: error.message,
        code: error.code || error.message.replace('net::', '') || 'UNKNOWN_ERROR',
        isStartupCheck: isStartupCheck  // 使用保存的值，避免竞态条件
      };
      logger.info('[AutoUpdate] 手动发送错误事件，启动时检查: {}', isStartupCheck);
      this._sendEvent(UPDATE_EVENTS.UPDATE_ERROR, errorData);

      throw error;
    }
  }

  /**
   * 下载更新
   * 从 GitHub Releases 下载更新包
   * @returns {Promise<void>}
   */
  async downloadUpdate() {
    try {
      logger.info('[AutoUpdate] 开始下载更新包');

      if (!this.updateInfo) {
        throw new Error('没有可用的更新信息，请先检查更新');
      }

      this.status.state = 'downloading';

      // 调用 electron-updater 下载更新
      await autoUpdater.downloadUpdate();

      logger.info('[AutoUpdate] 下载完成');
    } catch (error) {
      logger.error('[AutoUpdate] 下载更新失败: {}', error.message);
      this.status.state = 'error';
      this.status.error = error;
      throw error;
    }
  }

  /**
   * 安装更新
   * 退出应用并安装更新
   * @returns {Promise<void>}
   */
  async installUpdate() {
    try {
      logger.info('[AutoUpdate] 开始安装更新');

      if (this.status.state !== 'ready' || this.status.progress !== 100) {
        throw new Error('更新包未下载，请先下载更新');
      }

      // 检测当前平台和是否为 AppImage
      const { platform } = process;
      const isAppImage = platform === 'linux' && process.env.APPIMAGE !== undefined;

      logger.info('[AutoUpdate] 当前平台: {}, 是否为 AppImage: {}', platform, isAppImage);

      if (isAppImage) {
        // Linux AppImage：正常退出，让 electron-updater 的 autoInstallOnAppQuit 处理文件替换
        const { app } = require('electron');
        logger.info('[AutoUpdate] Linux AppImage 检测到，调用 app.quit() 退出应用');
        logger.info('[AutoUpdate] electron-updater 将在应用退出后自动替换文件');
        app.quit();
      } else {
        // 其他平台：调用 quitAndInstall() 自动更新并重启
        logger.info('[AutoUpdate] 调用 quitAndInstall() 退出应用并更新');
        // 注意：应用会立即退出，后续代码不会执行
        autoUpdater.quitAndInstall();
      }
    } catch (error) {
      logger.error('[AutoUpdate] 安装更新失败: {}', error.message);
      this.status.state = 'error';
      this.status.error = error;
      throw error;
    }
  }

  /**
   * 取消下载
   * 注意：electron-updater 不支持直接取消下载，此方法保留用于未来扩展
   * @returns {Promise<void>}
   */
  async cancelDownload() {
    try {
      logger.info('[AutoUpdate] 用户请求取消下载');
      // electron-updater 不支持取消下载，这里仅发送取消事件
      // 未来可以考虑使用其他方案实现取消功能
      this._sendEvent(UPDATE_EVENTS.UPDATE_CANCELLED, {});
      logger.warn('[AutoUpdate] electron-updater 不支持取消下载，已发送取消事件');
    } catch (error) {
      logger.error('[AutoUpdate] 取消下载失败: {}', error.message);
      throw error;
    }
  }

  /**
   * 获取当前更新状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      ...this.status,
      updateInfo: this.updateInfo ? this._formatUpdateInfo(this.updateInfo) : null
    };
  }

  /**
   * 跳过指定版本
   * 用户不再收到该版本的更新提醒
   * @param {string} version - 要跳过的版本号
   * @returns {Promise<void>}
   */
  async skipVersion(version) {
    try {
      logger.info('[AutoUpdate] 用户跳过版本: v{}', version);
      await addSkippedVersion(version);
      logger.info('[AutoUpdate] 已将版本 v{} 添加到跳过列表', version);
    } catch (error) {
      logger.error('[AutoUpdate] 跳过版本失败: {}', error.message);
      throw error;
    }
  }

  /**
   * 格式化更新信息
   * 将 electron-updater 的更新信息转换为统一的格式
   * @param {Object} info - electron-updater 的更新信息
   * @returns {Object} 格式化后的更新信息
   * @private
   */
  _formatUpdateInfo(info) {
    return {
      version: info.version,
      releaseName: info.releaseName || `v${info.version}`,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
      downloaded: this.status.state === 'ready' && this.status.progress === 100,
      size: info.size
    };
  }

  /**
   * 发送事件到渲染进程
   * 通过 IPC 向主窗口发送更新相关事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   * @private
   */
  _sendEvent(eventName, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      logger.info('[AutoUpdate] ✅ 发送事件: {}', eventName);
      this.mainWindow.webContents.send(eventName, data);
    } else {
      logger.warn('[AutoUpdate] ❌ 主窗口不可用，无法发送事件: {}', eventName);
      logger.warn('[AutoUpdate] mainWindow = {}, isDestroyed = {}', this.mainWindow, this.mainWindow ? this.mainWindow.isDestroyed() : 'N/A');
    }
  }
}

// 单例模式
let managerInstance = null;

/**
 * 获取自动更新管理器单例
 * @returns {AutoUpdateManager}
 */
function getAutoUpdateManager() {
  if (!managerInstance) {
    managerInstance = new AutoUpdateManager();
  }
  return managerInstance;
}

module.exports = {
  AutoUpdateManager,
  getAutoUpdateManager
};
