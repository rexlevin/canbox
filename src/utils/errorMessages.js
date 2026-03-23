/**
 * 错误消息映射系统
 * 提供用户友好的错误消息和解决建议
 */

export const ERROR_MESSAGES = {
    'zh-CN': {
        NETWORK_ERROR: {
            title: '网络连接失败',
            message: '无法连接到更新服务器',
            hint: '请检查网络连接或稍后重试'
        },
        DOWNLOAD_FAILED: {
            title: '下载失败',
            message: '更新包下载过程中发生错误',
            hint: '请点击重试按钮再次尝试'
        },
        SERVER_ERROR: {
            title: '服务器错误',
            message: '更新服务器暂时不可用',
            hint: '请稍后重试或联系支持'
        },
        PERMISSION_ERROR: {
            title: '权限不足',
            message: '没有足够的权限安装更新',
            hint: '请以管理员身份运行应用'
        },
        DISK_SPACE_ERROR: {
            title: '磁盘空间不足',
            message: '磁盘空间不足以安装更新',
            hint: '请清理磁盘空间后重试'
        },
        CHECKSUM_FAILED: {
            title: '文件校验失败',
            message: '下载的文件校验和不匹配',
            hint: '请重新下载更新包'
        },
        INSTALL_FAILED: {
            title: '安装失败',
            message: '更新安装过程中发生错误',
            hint: '请手动下载并安装最新版本'
        },
        VERSION_PARSE_ERROR: {
            title: '版本解析错误',
            message: '无法解析更新版本号',
            hint: '请联系开发者获取支持'
        },
        DEFAULT: {
            title: '更新失败',
            message: '更新过程中发生未知错误',
            hint: '请查看详情或手动下载安装'
        }
    },
    'en-US': {
        NETWORK_ERROR: {
            title: 'Network Connection Failed',
            message: 'Unable to connect to update server',
            hint: 'Please check your network connection'
        },
        DOWNLOAD_FAILED: {
            title: 'Download Failed',
            message: 'An error occurred while downloading',
            hint: 'Please click retry to try again'
        },
        SERVER_ERROR: {
            title: 'Server Error',
            message: 'Update server is temporarily unavailable',
            hint: 'Please try again later or contact support'
        },
        PERMISSION_ERROR: {
            title: 'Permission Denied',
            message: 'Insufficient permissions to install update',
            hint: 'Please run as administrator'
        },
        DISK_SPACE_ERROR: {
            title: 'Insufficient Disk Space',
            message: 'Not enough disk space for update',
            hint: 'Please free up disk space and retry'
        },
        CHECKSUM_FAILED: {
            title: 'Checksum Verification Failed',
            message: 'Downloaded file checksum mismatch',
            hint: 'Please re-download the update package'
        },
        INSTALL_FAILED: {
            title: 'Installation Failed',
            message: 'An error occurred during installation',
            hint: 'Please manually download and install the latest version'
        },
        VERSION_PARSE_ERROR: {
            title: 'Version Parse Error',
            message: 'Unable to parse update version',
            hint: 'Please contact developer for support'
        },
        DEFAULT: {
            title: 'Update Failed',
            message: 'An unknown error occurred',
            hint: 'Please view details or download manually'
        }
    }
};

/**
 * 获取用户友好的错误消息
 * @param {string} errorCode - 错误代码
 * @param {string} locale - 语言代码 ('zh-CN' 或 'en-US')
 * @returns {Object} 包含 title, message, hint 的对象
 */
export function getErrorMessage(errorCode, locale = 'zh-CN') {
    const messages = ERROR_MESSAGES[locale] || ERROR_MESSAGES['zh-CN'];
    return messages[errorCode] || messages['DEFAULT'];
}

/**
 * 格式化错误信息用于显示
 * @param {Object} errorInfo - 错误信息对象
 * @param {string} locale - 语言代码
 * @returns {Object} 格式化后的错误信息
 */
export function formatErrorForDisplay(errorInfo, locale = 'zh-CN') {
    const errorMessage = getErrorMessage(errorInfo.code, locale);

    return {
        title: errorMessage.title,
        message: errorMessage.message,
        hint: errorMessage.hint,
        code: errorInfo.code,
        timestamp: errorInfo.timestamp
    };
}
