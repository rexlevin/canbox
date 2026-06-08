import { createI18n } from 'vue-i18n';

const messages = {
    'zh-CN': () => import('../locales/zh-CN.json'),
    'en-US': () => import('../locales/en-US.json')
};

const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: 'zh-CN', // 默认语言
    fallbackLocale: 'zh-CN', // 回退语言
    messages: {}
});

/**
 * 加载语言包
 */
export async function loadMessages(locale) {
    try {
        const loadMessages = messages[locale];
        if (loadMessages) {
            const messages = await loadMessages();
            i18n.global.setLocaleMessage(locale, messages);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Failed to load messages for ${locale}:`, error);
        return false;
    }
}

/**
 * 初始化 i18n
 */
export async function initI18n() {
    // 获取当前语言（从主进程或本地存储）
    let currentLang = 'zh-CN';

    // 尝试从主进程获取
    try {
        const lang = await window.api.i18n.getLanguage();
        if (lang) {
            currentLang = lang;
        }
    } catch (error) {
        console.error('Failed to get language from main process:', error);
    }

    // 加载当前语言和回退语言的消息
    await loadMessages(currentLang);
    if (currentLang !== 'zh-CN') {
        await loadMessages('zh-CN');
    }

    i18n.global.locale.value = currentLang;
    console.log(`i18n initialized with locale: ${currentLang}`);

    // 监听语言变化事件
    window.api.on('language-changed', (event, lang) => {
        console.log(`Language changed to: ${lang}`);
        i18n.global.locale.value = lang;
        loadMessages(lang);
    });
}

export default i18n;
