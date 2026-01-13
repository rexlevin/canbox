#!/bin/bash

# 测试Flatpak配置脚本
echo "=== Flatpak配置测试 ==="

# 检查必要的工具
echo "1. 检查工具..."
command -v flatpak &> /dev/null && echo "✓ flatpak 已安装" || echo "✗ flatpak 未安装"
command -v flatpak-builder &> /dev/null && echo "✓ flatpak-builder 已安装" || echo "✗ flatpak-builder 未安装"

# 检查配置文件
echo "2. 检查配置文件..."
[ -f "com.github.lizl6.canbox.yaml" ] && echo "✓ manifest文件存在" || echo "✗ manifest文件不存在"

# 检查项目结构
echo "3. 检查项目结构..."
[ -f "../package.json" ] && echo "✓ package.json存在" || echo "✗ package.json不存在"
[ -d "../dist" ] && echo "✓ dist目录存在" || echo "✗ dist目录不存在"

# 检查Flatpak配置文件语法
echo "4. 检查Flatpak配置语法..."
if command -v flatpak-builder &> /dev/null && [ -f "com.github.lizl6.canbox.yaml" ]; then
    flatpak-builder --show-manifest com.github.lizl6.canbox.yaml && echo "✓ 配置语法正确" || echo "✗ 配置语法有误"
else
    echo "⚠ 无法检查语法，flatpak-builder未安装"
fi

echo "=== 测试完成 ==="