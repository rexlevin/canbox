/**
 * 自动更新事件定义
 *
 * 定义了自动更新功能中使用的所有事件名称和 IPC 通道
 *
 * 事件流向：
 * - UPDATE_EVENTS: 主进程 -> 渲染进程（通知事件）
 * - IPC_CHANNELS: 渲染进程 -> 主进程（调用接口）
 */

/**
 * 更新事件
 * 主进程发送给渲染进程的通知事件
 */
const UPDATE_EVENTS = {
  // 发现新版本
  UPDATE_AVAILABLE: 'update-available',
  // 已是最新版本
  UPDATE_NOT_AVAILABLE: 'update-not-available',
  // 下载进度更新
  DOWNLOAD_PROGRESS: 'download-progress',
  // 更新包下载完成（通用平台，可以自动更新并重启）
  UPDATE_DOWNLOADED: 'update-downloaded',
  // 更新包下载完成（Linux AppImage，需要用户退出并手动重启）
  UPDATE_DOWNLOADED_RESTART: 'update-downloaded-restart',
  // 更新错误
  UPDATE_ERROR: 'update-error',
  // 安装进度更新（预留）
  INSTALL_PROGRESS: 'install-progress',
  // 更新被取消
  UPDATE_CANCELLED: 'update-cancelled',
  // 安装完成（Linux 上需要手动重启）
  UPDATE_INSTALL_COMPLETE: 'update-install-complete'
};

/**
 * IPC 通道
 * 渲染进程调用主进程的接口
 */
const IPC_CHANNELS = {
  // 检查更新
  CHECK_FOR_UPDATE: 'check-for-update',
  // 下载更新
  DOWNLOAD_UPDATE: 'download-update',
  // 安装更新
  INSTALL_UPDATE: 'install-update',
  // 取消下载
  CANCEL_DOWNLOAD: 'cancel-download',
  // 获取更新状态
  GET_UPDATE_STATUS: 'get-update-status',
  // 获取更新配置
  GET_UPDATE_CONFIG: 'get-update-config',
  // 保存更新配置
  SAVE_UPDATE_CONFIG: 'save-update-config',
  // 跳过指定版本
  SKIP_VERSION: 'skip-version',
  // 显示更新对话框（由 About.vue 触发，转发给 App.vue）
  SHOW_UPDATE_DIALOG: 'show-update-dialog'
};

module.exports = {
  UPDATE_EVENTS,
  IPC_CHANNELS
};
