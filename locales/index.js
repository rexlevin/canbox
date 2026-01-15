const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname);

/**
 * 获取所有可用的语言
 * @returns {Array<{code: string, name: string}>}
 */
function getAvailableLanguages() {
    const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json') && f !== 'index.js');
    return files.map(f => {
        const code = f.replace('.json', '');
        try {
            const content = require(path.join(LOCALES_DIR, f));
            return { code, name: content.language?.title || code };
        } catch (e) {
            return { code, name: code };
        }
    });
}

/**
 * 获取指定语言的翻译内容
 * @param {string} lang - 语言代码，如 'zh-CN', 'en-US'
 * @returns {Object}
 */
function getTranslations(lang) {
    try {
        const filePath = path.join(LOCALES_DIR, `${lang}.json`);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error(`Failed to load translations for ${lang}:`, error);
        return {};
    }
}

/**
 * 翻译函数（用于主进程）
 * @param {string} key - 翻译键，如 'app.title'
 * @param {string} lang - 语言代码
 * @param {Object} params - 参数
 * @returns {string}
 */
function translate(key, lang = 'zh-CN', params = {}) {
    const translations = getTranslations(lang);
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
    }

    if (typeof value === 'string') {
        // 简单的参数替换
        return Object.keys(params).reduce((str, param) => {
            return str.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        }, value);
    }

    // 未找到翻译，返回 key
    return key;
}

module.exports = {
    getAvailableLanguages,
    getTranslations,
    translate
};
