/**
 * 自动更新配置管理模块
 *
 * 配置存储位置：Users/canbox.json
 * 配置键：autoUpdate
 *
 * 配置项说明：
 * - enabled: 是否启用自动更新
 * - checkOnStartup: 是否在启动时检查
 * - checkFrequency: 检查频率
 * - autoDownload: 是否自动下载更新包
 * - autoInstall: 更新后是否自动安装
 * - skippedVersions: 跳过的版本列表
 * - lastCheckTime: 上次检查时间（时间戳）
 * - lastVersionChecked: 上次检查的版本号
 */

const { getCanboxStore } = require('@modules/main/storageManager');
const logger = require('@modules/utils/logger');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  enabled: true,                    // 是否启用自动更新
  checkOnStartup: true,             // 是否在启动时检查
  checkFrequency: 'startup',         // 检查频率：startup/daily/weekly/manual
  autoDownload: false,              // 是否自动下载更新包
  autoInstall: false,               // 更新后是否自动安装
  skippedVersions: [],               // 跳过的版本列表
  lastCheckTime: null,              // 上次检查时间（时间戳）
  lastVersionChecked: null          // 上次检查的版本号
};

/**
 * 检查频率对应的间隔时间（毫秒）
 */
const CHECK_FREQUENCY_INTERVALS = {
  startup: 0,                                    // 每次启动都检查
  daily: 24 * 60 * 60 * 1000,                    // 每天一次
  weekly: 7 * 24 * 60 * 60 * 1000,               // 每周一次
  manual: Infinity                               // 手动检查
};

/**
 * 获取更新配置
 * 从 storageManager 读取配置，如果不存在则返回默认配置
 * @returns {Promise<Object>} 更新配置
 */
async function getConfig() {
  try {
    const store = getCanboxStore();
    const config = store.get('autoUpdate', DEFAULT_CONFIG);
    logger.info('[AutoUpdate] 读取配置，enabled: {}, checkFrequency: {}', config.enabled, config.checkFrequency);
    return config;
  } catch (error) {
    logger.error('[AutoUpdate] 读取配置失败: {}', error.message);
    // 读取失败时返回默认配置
    return DEFAULT_CONFIG;
  }
}

/**
 * 保存更新配置
 * 将配置保存到 storageManager
 * @param {Object} config - 要保存的配置
 * @returns {Promise<void>}
 * @throws {Error} 保存失败时抛出异常
 */
async function saveConfig(config) {
  try {
    const store = getCanboxStore();
    logger.info('[AutoUpdate] 保存配置，enabled: {}', config.enabled);
    store.set('autoUpdate', config);
    // 验证保存是否成功
    const savedConfig = store.get('autoUpdate');
    logger.info('[AutoUpdate] 验证保存结果，enabled: {}', savedConfig?.enabled);
  } catch (error) {
    logger.error('[AutoUpdate] 保存配置失败: {}', error.message);
    throw error;
  }
}

/**
 * 检查是否需要进行更新检查
 * 根据配置的检查频率判断是否需要检查更新
 * @param {Object} config - 更新配置
 * @returns {Promise<boolean>} 是否需要检查更新
 */
async function shouldCheckUpdate(config) {
  // 检查是否启用
  if (!config.enabled) {
    logger.debug('[AutoUpdate] 自动更新未启用');
    return false;
  }

  // 手动模式不自动检查
  if (config.checkFrequency === 'manual') {
    logger.debug('[AutoUpdate] 手动检查模式，跳过自动检查');
    return false;
  }

  // startup 模式：每次启动都检查
  if (config.checkFrequency === 'startup') {
    logger.debug('[AutoUpdate] startup 模式，每次启动都检查');
    return true;
  }

  // 首次检查
  if (!config.lastCheckTime) {
    logger.debug('[AutoUpdate] 首次检查更新');
    return true;
  }

  // 根据检查频率计算是否需要检查
  const interval = CHECK_FREQUENCY_INTERVALS[config.checkFrequency] || CHECK_FREQUENCY_INTERVALS.daily;
  const now = Date.now();
  const elapsed = now - config.lastCheckTime;

  const shouldCheck = elapsed >= interval;
  if (shouldCheck) {
    logger.debug('[AutoUpdate] 距离上次检查已超过 {} ms，需要检查更新', elapsed);
  } else {
    logger.debug('[AutoUpdate] 距离上次检查不足 {} ms，跳过检查', interval);
  }

  return shouldCheck;
}

/**
 * 更新最后检查时间
 * 记录本次检查的时间和版本号
 * @param {string} version - 本次检查的版本号
 * @returns {Promise<void>}
 */
async function updateLastCheckTime(version) {
  try {
    const config = await getConfig();
    config.lastCheckTime = Date.now();
    config.lastVersionChecked = version;
    await saveConfig(config);
    logger.debug('[AutoUpdate] 检查时间已更新: v{}，时间戳: {}', version, config.lastCheckTime);
  } catch (error) {
    logger.error('[AutoUpdate] 更新检查时间失败: {}', error.message);
  }
}

/**
 * 添加跳过的版本
 * 将指定版本添加到跳过列表
 * @param {string} version - 要跳过的版本号
 * @returns {Promise<void>}
 * @throws {Error} 添加失败时抛出异常
 */
async function addSkippedVersion(version) {
  try {
    const config = await getConfig();
    if (!config.skippedVersions.includes(version)) {
      config.skippedVersions.push(version);
      await saveConfig(config);
      logger.debug('[AutoUpdate] 版本 v{} 已添加到跳过列表', version);
    } else {
      logger.debug('[AutoUpdate] 版本 v{} 已在跳过列表中', version);
    }
  } catch (error) {
    logger.error('[AutoUpdate] 添加跳过版本失败: {}', error.message);
    throw error;
  }
}

/**
 * 检查版本是否被跳过
 * @param {string} version - 要检查的版本号
 * @returns {Promise<boolean>} 是否被跳过
 */
async function isVersionSkipped(version) {
  try {
    const config = await getConfig();
    const skipped = config.skippedVersions.includes(version);
    if (skipped) {
      logger.debug('[AutoUpdate] 版本 v{} 在跳过列表中', version);
    }
    return skipped;
  } catch (error) {
    logger.error('[AutoUpdate] 检查跳过版本失败: {}', error.message);
    // 出错时返回 false，不阻止更新
    return false;
  }
}

/**
 * 清除跳过的版本列表
 * 清空所有已跳过的版本
 * @returns {Promise<void>}
 * @throws {Error} 清除失败时抛出异常
 */
async function clearSkippedVersions() {
  try {
    const config = await getConfig();
    const count = config.skippedVersions.length;
    config.skippedVersions = [];
    await saveConfig(config);
    logger.debug('[AutoUpdate] 跳过版本列表已清除，共 {} 个版本', count);
  } catch (error) {
    logger.error('[AutoUpdate] 清除跳过版本失败: {}', error.message);
    throw error;
  }
}

module.exports = {
  DEFAULT_CONFIG,
  CHECK_FREQUENCY_INTERVALS,
  getConfig,
  saveConfig,
  shouldCheckUpdate,
  updateLastCheckTime,
  addSkippedVersion,
  isVersionSkipped,
  clearSkippedVersions
};
