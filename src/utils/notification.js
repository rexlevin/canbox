import { ElMessage, ElNotification } from 'element-plus';

/**
 * 通知配置选项
 * @typedef {Object} NotificationOptions
 * @property {string} type - 消息类型：success | error | warning | info
 * @property {string} message - 消息内容
 * @property {string} [title] - 通知标题（可选，默认使用类型对应的中文标题）
 * @property {string} [module] - 来源模块
 * @property {object} [details] - 额外详情
 * @property {number} [duration] - 显示时长（毫秒），默认根据类型不同
 * @property {boolean} [showClose] - 是否显示关闭按钮
 */

/**
 * 通知类型对应的默认标题
 */
const DEFAULT_TITLES = {
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '提示'
};

/**
 * 通知类型对应的显示时长（毫秒）
 */
const DEFAULT_DURATIONS = {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000
};

/**
 * 当前 ElNotification 实例
 */
let currentNotification = null;

/**
 * 显示通知
 * @param {NotificationOptions} options - 通知选项
 */
function show(options) {
    const {
        type = 'info',
        message,
        title,
        module,
        details,
        duration,
        showClose = true
    } = options;

    if (!message) {
        console.warn('[notification] message is required');
        return;
    }

    const finalTitle = title || DEFAULT_TITLES[type] || '提示';
    const finalDuration = duration !== undefined ? duration : DEFAULT_DURATIONS[type];

    // 如果有相同类型的通知正在显示，先关闭它
    if (currentNotification) {
        currentNotification.close();
        currentNotification = null;
    }

    currentNotification = ElNotification({
        type,
        title: finalTitle,
        message,
        duration: finalDuration,
        showClose,
        onClose: () => {
            currentNotification = null;
        }
    });
}

/**
 * 显示成功通知
 * @param {string} message - 消息内容
 * @param {object} [options] - 额外选项
 */
function success(message, options = {}) {
    show({ type: 'success', message, ...options });
}

/**
 * 显示错误通知
 * @param {string} message - 消息内容
 * @param {object} [options] - 额外选项
 */
function error(message, options = {}) {
    show({ type: 'error', message, ...options });
}

/**
 * 显示警告通知
 * @param {string} message - 消息内容
 * @param {object} [options] - 额外选项
 */
function warning(message, options = {}) {
    show({ type: 'warning', message, ...options });
}

/**
 * 显示信息通知
 * @param {string} message - 消息内容
 * @param {object} [options] - 额外选项
 */
function info(message, options = {}) {
    show({ type: 'info', message, ...options });
}

/**
 * 关闭当前通知
 */
function close() {
    if (currentNotification) {
        currentNotification.close();
        currentNotification = null;
    }
}

export default {
    show,
    success,
    error,
    warning,
    info,
    close
};
