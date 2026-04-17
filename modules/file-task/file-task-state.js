/**
 * 文件任务状态枚举
 * 定义任务的生命周期状态
 */
const FileTaskState = {
    IDLE: 'idle',                    // 初始状态
    PENDING: 'pending',              // 等待中（排队中）
    PREPARING: 'preparing',          // 准备中（创建临时目录）
    DOWNLOADING: 'downloading',      // 下载中
    EXTRACTING: 'extracting',        // 解压中
    MOVING: 'moving',                // 移动中
    COMPLETED: 'completed',          // 已完成
    FAILED: 'failed',                // 失败
    CANCELLED: 'cancelled',          // 已取消
};

/**
 * 运行中的状态列表
 */
const RUNNING_STATES = [
    FileTaskState.PENDING,
    FileTaskState.PREPARING,
    FileTaskState.DOWNLOADING,
    FileTaskState.EXTRACTING,
    FileTaskState.MOVING,
];

/**
 * 终止状态列表
 */
const TERMINAL_STATES = [
    FileTaskState.COMPLETED,
    FileTaskState.FAILED,
    FileTaskState.CANCELLED,
];

/**
 * 判断状态是否为运行中
 * @param {string} status - 状态
 * @returns {boolean}
 */
function isRunningState(status) {
    return RUNNING_STATES.includes(status);
}

/**
 * 判断状态是否为终止状态
 * @param {string} status - 状态
 * @returns {boolean}
 */
function isTerminalState(status) {
    return TERMINAL_STATES.includes(status);
}

module.exports = {
    FileTaskState,
    RUNNING_STATES,
    TERMINAL_STATES,
    isRunningState,
    isTerminalState,
};
