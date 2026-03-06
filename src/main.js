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
}).catch(error => {
    console.error('Failed to initialize i18n:', error);
    // 即使失败也要 mount 应用，避免白屏
    app.mount('#app');
});
