# Changelog

本文件记录 Canbox 项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.4.2] - Unreleased

### Added

- 新增双源更新系统（update-center），支持 GitHub/Gitee 双源自动更新与智能切换
- 新增地区检测功能，根据系统语言智能推荐更新源
- 新增更新源速度测试功能，自动选择最优源
- 增强 Zoom 功能，支持键盘快捷键和设置界面控制

### Fixed

- 修复 IPC handler 重复注册导致启动报错的问题
- 修复 ASAR 文件读取时使用 fs 而非 original-fs 导致的 ENOENT 错误
- 修复 AppImage 启动后界面空白的问题（loadFile 替换为 loadURL）
- 修复 update-source:get IPC 返回 Promise 对象无法序列化的问题
- 修复 GET_UPDATE_CONFIG handler 中 getConfig/saveConfig 未导入的问题
- 修复 Gitee 发布大文件上传超时问题，改为只推送增量包

### Changed

- 重构 updateSource API 调用方式
- 拆分跨平台构建流程，支持 Windows 独立发布
- 移除 differentialPackagePolicy 配置

## [0.4.0] - 2026-05-09

### Added

- 新增文件任务管理模块（file-task），统一管理下载、导入等文件操作任务

### Changed

- 更新变更文档指南和 Electron 升级记录

## [0.3.4] - 2026-04-16

### Added

- 添加 getLocale API，支持 APP 获取当前语言设置
- 支持中英文文档切换
- 添加加载状态提示和国际化文本
- 新增卡片式应用列表 UI 和设置页面

### Fixed

- 修复存储路径配置异常

### Changed

- 重构文档目录结构并更新变更记录

## [0.2.7] - 2026-03-21

### Changed

- 优化自动更新错误处理和配置管理

## [0.2.6] - 2026-03-21

### Added

- 为关于标签添加更新状态提示

### Changed

- 增强自动更新错误处理和超时保护

## [0.2.5] - 2026-03-18

### Added

- 支持 Linux AppImage 更新模式
- 新增关于页面及版本信息功能

### Changed

- 优化自动更新流程并支持手动重启
- 重构 About 页面布局样式

## [0.2.4] - 2026-03-09

### Added

- 添加自动更新功能

## [0.2.3] - 2026-03-06

### Added

- 添加子进程模式支持应用启动

## [0.2.0-pre] - 2026-02-06

### Added

- 恢复 APP 窗口位置和最大化状态

### Changed

- 更新 README 文档添加 APP 导入功能说明

## [0.1.4] - 2026-02-03

### Added

- 添加窗口状态保存和恢复功能
- 添加窗口最大化状态保存与恢复
- 添加全局字体设置功能
- 为 CustomDrawer 添加 ESC 键关闭功能
- 为应用和仓库添加信息展示功能
- 为应用列表添加 Markdown 渲染功能
- 为 Linux 平台添加自动处理 --no-sandbox 的打包后脚本

### Fixed

- 修复窗口最大化时的位置和闪烁问题
- 使用 getBounds 替代 getContentBounds 获取窗口边界
- 优化窗口状态保存和位置验证逻辑

### Changed

- 使用 CustomDrawer 组件替换 el-drawer
- 提取并行获取应用详情的公共方法
- 完善打包环境下 canbox.d.ts 文件的路径处理逻辑

## [0.0.4] - 2025-10-30

### Added

- 初始版本基础功能
