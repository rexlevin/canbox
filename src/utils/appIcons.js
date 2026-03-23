/**
 * APP 图标配置
 * 用于 APP 列表 UI 升级
 */

// 分类图标映射
export const CATEGORY_ICONS = {
  education: '🎓',
  office: '📄',
  audio: '🎵',
  video: '🎬',
  game: '🎮',
  utility: '🛠️',
  development: '💻',
  graphics: '🎨',
  network: '🌐'
}

// 平台图标映射
export const PLATFORM_ICONS = {
  windows: '🪟',
  darwin: '🍎',
  linux: '🐧'
}

// 平台名称映射（用于 tooltip）
export const PLATFORM_NAMES = {
  windows: 'Windows',
  darwin: 'macOS',
  linux: 'Linux'
}

// 分类名称映射（用于 tooltip）
export const CATEGORY_NAMES = {
  education: '教育',
  office: '办公',
  audio: '音频',
  video: '视频',
  game: '游戏',
  utility: '工具',
  development: '开发工具',
  graphics: '图形',
  network: '网络'
}

// 功能按钮图标
export const ACTION_ICONS = {
  run: '▶️',
  delete: '🗑️',
  clear: '🧹',
  pack: '📦',
  copy: '📋',
  download: '⬇️',
  update: '🔄',
  downloaded: '✅'
}

// 功能按钮名称（用于 tooltip）
export const ACTION_NAMES = {
  run: '运行',
  delete: '删除',
  clear: '清空数据',
  pack: '打包',
  copy: '复制链接',
  download: '下载',
  update: '更新',
  downloaded: '已下载'
}

/**
 * 获取分类图标
 * @param {string} category - 分类 key
 * @returns {string} 图标
 */
export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '📦'
}

/**
 * 获取分类名称
 * @param {string} category - 分类 key
 * @returns {string} 名称
 */
export function getCategoryName(category) {
  return CATEGORY_NAMES[category] || category
}

/**
 * 获取平台图标
 * @param {string} platform - 平台 key
 * @returns {string} 图标
 */
export function getPlatformIcon(platform) {
  return PLATFORM_ICONS[platform] || '💻'
}

/**
 * 获取平台名称
 * @param {string} platform - 平台 key
 * @returns {string} 名称
 */
export function getPlatformName(platform) {
  return PLATFORM_NAMES[platform] || platform
}

/**
 * 获取功能按钮图标
 * @param {string} action - 操作 key
 * @returns {string} 图标
 */
export function getActionIcon(action) {
  return ACTION_ICONS[action] || '⚡'
}

/**
 * 获取功能按钮名称
 * @param {string} action - 操作 key
 * @returns {string} 名称
 */
export function getActionName(action) {
  return ACTION_NAMES[action] || action
}
