/**
 * 自动更新模块入口
 *
 * 导出模块的所有公共接口
 *
 * 使用方式：
 * const { getAutoUpdateManager, getConfig, saveConfig } = require('@modules/auto-update');
 */

const { getAutoUpdateManager } = require('./autoUpdateManager');
const { UPDATE_EVENTS, IPC_CHANNELS } = require('./autoUpdateEvents');
const { getConfig, saveConfig } = require('./autoUpdateConfig');

module.exports = {
  // 管理器
  getAutoUpdateManager,
  // 事件定义
  UPDATE_EVENTS,
  IPC_CHANNELS,
  // 配置管理
  getConfig,
  saveConfig
};
