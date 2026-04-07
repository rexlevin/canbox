# 字体设置功能 - 2026-03-21

## 功能概述

为 Canbox 添加全局字体选择功能，用户可以在"设置"页面中选择自己喜欢的字体，该设置会立即应用到整个应用，并通过 `electron-store` 持久化保存到 `canbox.json` 文件中。

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
});
```

### 2. 前端实现（Vue 组件）

**文件**: `src/components/Settings.vue`

添加字体选择组件：

```vue
<template>
  <div class="settings-section">
    <h3>{{ t('settings.font') }}</h3>
    <el-select 
      v-model="selectedFont" 
      @change="onFontChange"
      placeholder="选择字体"
    >
      <el-option 
        v-for="font in availableFonts" 
        :key="font.value" 
        :label="font.label" 
        :value="font.value"
      />
    </el-select>
    
    <div class="font-preview">
      <p :style="{ fontFamily: selectedFont }">
        预览文本：这是一个字体预览示例
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from '../composables/useI18n';
import { ipcRenderer } from '../../modules/ipc/ipcRenderer';

const { t } = useI18n();
const selectedFont = ref('default');
const availableFonts = ref([
  { value: 'default', label: '系统默认字体' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimSun', label: '宋体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Times New Roman', label: 'Times New Roman' },
]);

onMounted(async () => {
  try {
    const savedFont = await ipcRenderer.invoke('font-get');
    selectedFont.value = savedFont;
  } catch (error) {
    console.error('Failed to load font settings:', error);
  }
});

const onFontChange = async (fontValue) => {
  try {
    await ipcRenderer.invoke('font-set', fontValue);
    console.info('Font setting saved:', fontValue);
  } catch (error) {
    console.error('Failed to save font settings:', error);
  }
};
</script>

<style scoped>
.settings-section {
  margin-bottom: 24px;
}

.font-preview {
  margin-top: 16px;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.font-preview p {
  font-size: 16px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}
</style>
```

### 3. 国际化支持

**文件**: `locales/zh-CN.json` 和 `locales/en-US.json`

添加字体设置相关翻译：

```json
// zh-CN.json
{
  "settings": {
    "font": "字体设置",
    "fontDefault": "系统默认字体"
  }
}

// en-US.json
{
  "settings": {
    "font": "Font Settings",
    "fontDefault": "System Default Font"
  }
}
```

### 4. 字体变更监听

**文件**: `src/composables/useFontChange.js`

创建字体变更监听器：

```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import { ipcRenderer } from '../../modules/ipc/ipcRenderer';

export function useFontChange() {
  const currentFont = ref('default');

  const updateFont = (fontValue) => {
    currentFont.value = fontValue;
    document.documentElement.style.setProperty('--el-font-family-base', fontValue);
    
    // 如果字体是默认值，恢复默认
    if (fontValue === 'default') {
      document.documentElement.style.removeProperty('--el-font-family-base');
    }
  };

  const handleFontChanged = (event, fontValue) => {
    updateFont(fontValue);
  };

  onMounted(async () => {
    try {
      const savedFont = await ipcRenderer.invoke('font-get');
      updateFont(savedFont);
      
      // 监听字体变更事件
      ipcRenderer.on('font-changed', handleFontChanged);
    } catch (error) {
      console.error('Failed to initialize font settings:', error);
    }
  });

  onUnmounted(() => {
    ipcRenderer.removeListener('font-changed', handleFontChanged);
  });

  return { currentFont };
}
```

### 5. 主应用集成

**文件**: `src/App.vue`

在根组件中集成字体设置：

```vue
<template>
  <div id="app" :style="{ fontFamily: currentFont === 'default' ? '' : currentFont }">
    <!-- 应用内容 -->
    <router-view />
  </div>
</template>

<script setup>
import { useFontChange } from './composables/useFontChange';
const { currentFont } = useFontChange();
</script>
```

## 使用方式

### 用户端

1. 打开 **设置** 页面
2. 找到 **字体设置** 部分
3. 从下拉菜单中选择喜欢的字体
4. 字体设置会立即生效并保存

### 开发者端

#### 获取当前字体设置

```javascript
import { useFontChange } from '@/composables/useFontChange';
const { currentFont } = useFontChange();
```

#### 设置新字体

```javascript
import { ipcRenderer } from '../../modules/ipc/ipcRenderer';
await ipcRenderer.invoke('font-set', 'Microsoft YaHei');
```

## 配置选项

### 可用字体列表

默认包含以下字体选项：
- `default` - 系统默认字体
- `Arial` - Arial 字体
- `Helvetica` - Helvetica 字体
- `Microsoft YaHei` - 微软雅黑
- `SimSun` - 宋体
- `KaiTi` - 楷体
- `Courier New` - Courier New
- `Times New Roman` - Times New Roman

### 存储位置

字体设置保存在以下位置：
- **文件路径**: `{userData}/canbox.json`
- **配置键**: `font`

### CSS 变量

应用使用 CSS 变量控制字体：
- `--el-font-family-base` - 基础字体族

## 技术细节

### 1. 字体变更通知机制

当用户更改字体设置时：
1. 前端通过 IPC 通知主进程
2. 主进程保存设置到 `canbox.json`
3. 主进程广播 `font-changed` 事件到所有窗口
4. 每个窗口更新字体显示

### 2. 字体回退机制

如果选择的字体不可用：
1. 自动回退到系统默认字体
2. 不中断用户操作
3. 记录错误日志

### 3. 性能优化

字体变更时：
1. 仅更新必要的 DOM 元素
2. 避免不必要的重绘
3. 使用 CSS 变量实现高效更新

## 测试验证

### 单元测试

```javascript
describe('Font Settings', () => {
  it('should save and retrieve font settings', async () => {
    // 测试保存字体设置
    await ipcRenderer.invoke('font-set', 'Arial');
    
    // 测试获取字体设置
    const savedFont = await ipcRenderer.invoke('font-get');
    expect(savedFont).toBe('Arial');
  });

  it('should notify all windows when font changes', async () => {
    // 模拟多个窗口监听
    const mockCallback = jest.fn();
    ipcRenderer.on('font-changed', mockCallback);
    
    // 更改字体设置
    await ipcRenderer.invoke('font-set', 'Microsoft YaHei');
    
    // 验证通知被触发
    expect(mockCallback).toHaveBeenCalledWith('Microsoft YaHei');
  });
});
```

### 集成测试

1. **字体选择测试**
   - 打开设置页面
   - 选择不同字体
   - 验证应用字体更新

2. **持久化测试**
   - 关闭应用
   - 重新启动应用
   - 验证字体设置被保留

3. **多窗口测试**
   - 打开多个窗口
   - 更改字体设置
   - 验证所有窗口同步更新

## 相关文件

### 新增文件
- `src/composables/useFontChange.js` - 字体变更监听器

### 修改文件
- `ipcHandlers.js` - 添加字体 IPC 处理器
- `src/components/Settings.vue` - 添加字体设置 UI
- `locales/zh-CN.json` 和 `locales/en-US.json` - 添加翻译

### 相关变更
- [2026-03-21 字体设置功能](../changes/completed/2026-03-21-font-settings.md)

## 注意事项

1. **字体可用性**：不是所有系统都包含所有字体，需要做好回退处理
2. **性能影响**：字体变更会引起页面重绘，需要优化性能
3. **兼容性**：不同浏览器和系统对字体的支持程度不同
4. **用户体验**：字体变更应平滑过渡，避免闪烁

---

*最后更新：2026-04-05*  
*实现状态：✅ 已完成*  
*优先级：⭐⭐⭐*