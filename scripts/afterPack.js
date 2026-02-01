const fs = require('fs-extra');
const path = require('path');

/**
 * Electron Builder afterPack 钩子
 * 作用：在 Linux 平台上用启动脚本包装可执行文件，自动添加 --no-sandbox 参数
 *
 * 影响：仅限 Linux 平台的所有打包格式（AppImage, DEB, RPM 等）
 * 其他平台（Windows, macOS）不受影响
 */
exports.default = async function(context) {
    // 只在 Linux 平台执行
    if (context.electronPlatformName !== 'linux') {
        console.log('[afterPack] 非Linux平台，跳过可执行文件包装');
        return;
    }

    const appOutDir = context.appOutDir;
    const executableName = context.packager.appInfo.productFilename || 'canbox';
    const originalBinary = path.join(appOutDir, executableName);
    const wrappedBinary = path.join(appOutDir, executableName + '-bin');

    console.log(`[afterPack] Linux平台检测，开始包装可执行文件: ${executableName}`);

    // 启动脚本内容
    const launchScript = `#!/bin/bash
# Canbox启动脚本 - 自动添加 --no-sandbox 参数
# 解决 Linux Electron 应用的沙箱权限问题

# 获取脚本所在目录（支持软链接）
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"

# 调用真正的二进制文件，自动添加 --no-sandbox
# 使用 exec 确保信号正确传递
exec "$SCRIPT_DIR/${executableName}-bin" "$@" --no-sandbox
`;

    try {
        // 检查原始可执行文件是否存在
        if (!await fs.pathExists(originalBinary)) {
            console.warn(`[afterPack] 可执行文件不存在: ${originalBinary}`);
            return;
        }

        // 1. 重命名原可执行文件
        await fs.rename(originalBinary, wrappedBinary);
        console.log(`[afterPack] 已重命名: ${executableName} -> ${executableName}-bin`);

        // 2. 创建新的启动脚本
        await fs.writeFile(originalBinary, launchScript, { mode: 0o755 });
        console.log(`[afterPack] 已创建启动脚本: ${originalBinary}`);

        // 3. 验证文件权限
        const stats = await fs.stat(originalBinary);
        console.log(`[afterPack] 启动脚本权限: ${stats.mode.toString(8)}`);

        // 4. 生成独立的 canbox.desktop 文件到 dist 目录
        const distDir = path.join(process.cwd(), 'dist');
        const desktopFilePath = path.join(distDir, 'canbox.desktop');

        const desktopContent = `[Desktop Entry]
Name=Canbox
Comment=Some useful apps you need for your life
Exec=${executableName} %U
Icon=${executableName}
Terminal=false
Type=Application
Categories=Utility;System;Application
`;
        
        await fs.ensureDir(distDir);
        await fs.writeFile(desktopFilePath, desktopContent, { mode: 0o644 });
        console.log(`[afterPack] 已生成桌面文件: ${desktopFilePath}`);

        console.log('[afterPack] ✓ 可执行文件包装完成');
    } catch (error) {
        console.error('[afterPack] 包装可执行文件时出错:', error);
        throw error;
    }
};
