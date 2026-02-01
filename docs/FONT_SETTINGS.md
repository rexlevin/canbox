# 字体设置功能说明

## 功能概述

为 Canbox 添加了全局字体选择功能，用户可以在"设置"页面中选择自己喜欢的字体，该设置会立即应用到整个应用，并通过 `electron-store` 持久化保存到 `canbox.json` 文件中。

## 实现方式

### 1. 后端实现（Electron 主进程）

**文件**: `ipcHandlers.js`

添加了两个 IPC 处理器：

```javascript
// 获取字体设置
ipcMain.handle('font-get', () => {
    const canboxStore = getCanboxStore();
    const savedFont = canboxStore.get('font', 'default');
    return savedFont;
});

// 设置字体
ipcMain.handle('font-set', async (event, fontValue) => {
    const canboxStore = getCanboxStore();
    canboxStore.set('font', fontValue);

    // 通知所有窗口字体已更改
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('font-changed', fontValue);
    });

    return { success: true };
});
```

**存储位置**: `canbox.json`（通过 `electron-store`）

### 2. Preload 层（API 暴露）

**文件**: `preload.js`

在 `window.api` 对象中添加了 `font` 命名空间：

```javascript
font: {
    get: () => ipcRenderer.invoke('font-get'),
    set: (fontValue) => ipcRenderer.invoke('font-set', fontValue)
}
```

### 3. 前端实现（Vue 组件）

**文件**: `src/components/Settings.vue`

- 添加了字体选择下拉框
- 通过 IPC 与主进程通信
- 监听 `font-changed` 事件同步所有窗口
- 通过 CSS 的 `font-family` 属性应用字体

**关键代码**:
```javascript
// 加载字体设置
const savedFont = await window.api.font.get();
applyFont(savedFont);

// 保存字体设置
async function handleFontChange(fontValue) {
    const result = await window.api.font.set(fontValue);
    applyFont(fontValue);
}

// 监听字体更改事件
window.api.on('font-changed', (fontValue) => {
    applyFont(fontValue);
});
```

### 4. 语言文件

**更新文件**:
- `locales/zh-CN.json` - 中文翻译
- `locales/en-US.json` - 英文翻译

**新增字段**:
```json
{
    "settings": {
        "font": "字体",
        "defaultFont": "默认字体",
        "fontSetSuccess": "字体设置已保存"
    }
}
```

## 支持的字体列表

### 中文推荐字体

1. **Microsoft YaHei (微软雅黑)** - Windows 默认中文字体
2. **SimSun (宋体)** - 传统中文字体
3. **SimHei (黑体)** - 中文字体
4. **Noto Sans CJK** - Google 开源中文字体
5. **Source Han Sans (思源黑体)** - Adobe 开源中文字体
6. **WenQuanYi Zen Hei (文泉驿正黑)** - Linux 常用中文字体

### 英文/通用字体

1. **Arial** - 通用无衬线字体
2. **Helvetica** - macOS 通用字体
3. **Liberation Sans** - Linux 常用字体
4. **DejaVu Sans** - Linux 开源字体
5. **Ubuntu** - Ubuntu 系统字体
6. **Roboto** - Android 和 Google 通用字体
7. **Times New Roman** - 通用衬线字体
8. **Courier New** - 等宽字体

### 默认字体

"默认字体" 选项会移除自定义字体设置，使用浏览器的默认字体。

## 用户使用方法

1. 打开 Canbox
2. 进入"设置"页面
3. 在"字体"下拉框中选择喜欢的字体
4. 设置立即生效，会看到提示"字体设置已保存"
5. 字体应用到整个应用，包括所有页面和组件

## 字体回退机制

CSS 字体定义使用了回退机制，确保如果用户选择的字体不存在，会使用系统默认字体：

```css
font-family: "Microsoft YaHei", sans-serif;
```

如果 "Microsoft YaHei" 不存在，会回退到系统的无衬线字体。

## 技术细节

### 字体应用方式

使用 JavaScript 动态修改根元素的 CSS：

```javascript
function applyFont(fontValue) {
    if (fontValue === 'default') {
        document.documentElement.style.fontFamily = '';
    } else {
        document.documentElement.style.fontFamily = fontValue;
    }
}
```

### 存储方式

使用 `electron-store` 存储（通过 IPC 通信）：

```javascript
// 主进程（ipcHandlers.js）
const canboxStore = getCanboxStore();  // 从 storageManager 获取
canboxStore.set('font', fontValue);     // 保存到 canbox.json

// 渲染进程（Settings.vue）
const savedFont = await window.api.font.get();  // 通过 IPC 读取
```

**存储文件**: `~/.config/canbox/Users/canbox.json`

```json
{
    "language": "zh-CN",
    "font": "\"Microsoft YaHei\", sans-serif"
}
```

### IPC 通信流程

```
渲染进程 (Vue)
    ↓ invoke('font-get')
主进程 (ipcHandlers.js)
    ↓ getCanboxStore().get('font')
electron-store
    ↓ 读取 canbox.json
文件系统
```

```
渲染进程 (Vue)
    ↓ invoke('font-set', fontValue)
主进程 (ipcHandlers.js)
    ↓ getCanboxStore().set('font', fontValue)
electron-store
    ↓ 写入 canbox.json
文件系统
    ↓ send('font-changed', fontValue)
所有窗口 (BrowserWindow)
    ↓ webContents.send()
渲染进程 (Vue)
    ↓ 监听事件
更新 CSS
```

### 多窗口同步

当在一个窗口更改字体时，主进程会通知所有其他窗口：

```javascript
ipcMain.handle('font-set', async (event, fontValue) => {
    // 保存设置
    canboxStore.set('font', fontValue);

    // 通知所有窗口
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('font-changed', fontValue);
    });
});
```

### 优点

- ✅ 使用 electron-store 持久化存储
- ✅ 多窗口同步更新
- ✅ 重启应用后设置保留
- ✅ 设置即时生效
- ✅ 不增加应用体积
- ✅ 跨平台支持
- ✅ 符合 Electron 最佳实践

## 未来扩展建议

### 1. 字体大小设置

可以添加字体大小调整功能：

```vue
<el-form-item label="字体大小">
    <el-slider v-model="fontSize" :min="12" :max="24" @change="handleFontSizeChange"/>
</el-form-item>
```

### 2. 字体粗细

```vue
<el-form-item label="字体粗细">
    <el-select v-model="fontWeight">
        <el-option label="正常" value="normal"/>
        <el-option label="粗体" value="bold"/>
    </el-select>
</el-form-item>
```

### 3. 自定义字体上传

允许用户上传自己的字体文件（.ttf, .otf）：

```javascript
function handleFontUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const fontFace = new FontFace('customFont', e.target.result);
        fontFace.load().then(loadedFont => {
            document.fonts.add(loadedFont);
            applyFont('customFont');
        });
    };
    reader.readAsArrayBuffer(file);
}
```

### 4. 暗色模式字体适配

根据主题自动调整字体颜色：

```css
:root {
    --text-color: #333;
}

.dark-mode {
    --text-color: #f0f0f0;
}
```

## 测试建议

### 跨平台测试

1. **Windows**
   - 测试微软雅黑、宋体、黑体
   - 验证字体正确显示

2. **Linux**
   - 测试 Ubuntu、Liberation Sans、DejaVu Sans
   - 验证中文显示

3. **macOS**
   - 测试 Helvetica、Apple 系统字体
   - 验证字体渲染效果

### 浏览器兼容性测试

确保在不同 Electron 版本（基于 Chromium）下都能正常工作。

## 常见问题

### Q1: 我选择的字体没有生效？

**A**: 可能原因：
- 系统未安装该字体
- 字体名称拼写错误

**解决**: 选择"默认字体"或选择系统中存在的字体。

### Q2: 中文显示为方框？

**A**: 说明系统缺少中文字体支持。

**解决**:
1. Linux: `sudo apt install fonts-wqy-microhei`
2. 选择支持中文的字体

### Q3: 如何添加更多字体？

**A**: 你可以：

1. 修改 `availableFonts` 数组添加新字体
2. 在系统中安装新字体
3. 重新启动应用

## 相关文件

- `src/components/Settings.vue` - 设置界面
- `locales/zh-CN.json` - 中文翻译
- `locales/en-US.json` - 英文翻译
- `docs/FONT_SETTINGS.md` - 本文档

## 版本历史

- v1.0.0 (2025-12-07) - 初始版本
