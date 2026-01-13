#!/bin/bash

# Flatpak构建脚本 for Canbox

set -e

echo "开始构建Canbox Flatpak包..."

# 检查flatpak是否安装
if ! command -v flatpak &> /dev/null; then
    echo "错误: flatpak未安装。请先安装flatpak。"
    echo "在Ubuntu/Debian上: sudo apt install flatpak flatpak-builder"
    echo "在Fedora上: sudo dnf install flatpak flatpak-builder"
    exit 1
fi

# 检查是否在Flatpak工作目录中
if [ ! -f "com.github.lizl6.canbox.yaml" ]; then
    echo "错误: 请在flatpak目录中运行此脚本"
    exit 1
fi

# 检查unpacked目录是否存在
if [ ! -d "../../dist/linux-unpacked" ]; then
    echo "错误: 请先构建Linux包 (npm run build-dist:linux)"
    exit 1
fi

# 检查Flathub仓库是否已添加
echo "检查Flathub仓库..."
if ! flatpak remote-list | grep -i flathub; then
    echo "Flathub仓库未添加，请运行以下命令添加："
    echo "flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo"
    exit 1
fi

# 检查必要的运行时和SDK是否已安装
# echo "检查运行时和SDK..."
# if ! flatpak list | grep -i "org.freedesktop.Platform//24.08" || ! flatpak list | grep -i "org.freedesktop.Sdk//24.08"; then
#     echo "必要的运行时或SDK未安装，请运行以下命令安装："
#     echo "flatpak install -y flathub org.freedesktop.Platform//24.08"
#     echo "flatpak install -y flathub org.freedesktop.Sdk//24.08"
#     exit 1
# fi

# 构建Flatpak包
echo "构建Flatpak包..."
flatpak-builder --force-clean build-dir com.github.lizl6.canbox.yaml

# 导出Flatpak包
echo "导出Flatpak包..."
flatpak-builder --repo=repo --force-clean build-dir com.github.lizl6.canbox.yaml

# 构建单文件包到目标目录
echo "创建单文件Flatpak包..."
flatpak build-bundle repo ../../dist/com.github.lizl6.canbox.flatpak com.github.lizl6.canbox

echo "Flatpak构建完成!"
echo "生成的包: dist/com.github.lizl6.canbox.flatpak"
echo "安装命令: flatpak install --user dist/com.github.lizl6.canbox.flatpak"