import { createApp } from 'vue'
import './style.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { createPinia } from 'pinia'
import i18n, { initI18n } from './i18n'

const app = createApp(App)
const pinia = createPinia()

// 注册 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(ElementPlus).use(router).use(pinia).use(i18n)

// 初始化 i18n 并等待完成后 mount 应用
initI18n().then(() => {
    console.log('i18n loaded');
    app.mount('#app');

    // 初始化全局缩放功能 (Ctrl + 滚轮)
    initZoomFeature();
}).catch(error => {
    console.error('Failed to initialize i18n:', error);
    // 即使失败也要 mount 应用，避免白屏
    app.mount('#app');
    initZoomFeature();
});

// 全局缩放功能
function initZoomFeature() {
    // 当前缩放比例
    let currentZoom = 1.0;
    
    // 从主进程获取当前缩放比例
    window.api.zoom.get().then(result => {
        if (result.success) {
            currentZoom = result.factor;
        }
    }).catch(err => {
        console.error('Failed to get zoom factor:', err);
    });

    // 监听滚轮事件
    document.addEventListener('wheel', (e) => {
        // 检查是否按下 Ctrl 键
        if (e.ctrlKey) {
            e.preventDefault();
            
            // 根据滚轮方向调整缩放
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            let newZoom = currentZoom + delta;
            
            // 限制范围 0.5 - 2.0
            newZoom = Math.max(0.5, Math.min(2.0, newZoom));
            
            // 保留一位小数
            newZoom = Math.round(newZoom * 10) / 10;
            
            if (newZoom !== currentZoom) {
                currentZoom = newZoom;
                window.api.zoom.set(currentZoom).then(result => {
                    if (result.success) {
                        console.log('Zoom factor set to:', currentZoom);
                    }
                }).catch(err => {
                    console.error('Failed to set zoom factor:', err);
                });
            }
        }
    }, { passive: false });

    console.log('Zoom feature initialized (Ctrl + Wheel)');
}
