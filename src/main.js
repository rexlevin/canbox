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

// 初始化 i18n
initI18n().then(() => {
    console.log('i18n loaded');
}).catch(error => {
    console.error('Failed to initialize i18n:', error);
});

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(ElementPlus).use(router).use(pinia).use(i18n).mount('#app')
