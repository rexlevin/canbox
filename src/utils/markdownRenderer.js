import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import { ElMessage } from 'element-plus';

/**
 * Markdown 渲染器模块
 * 用于将 Markdown 文件渲染为 HTML 并在浏览器中打开
 */

// 初始化 markdown-it
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
}).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.linkInsideHeader({
        symbol: '#',
        class: 'header-anchor'
    }),
    level: [1, 2, 3]
});

/**
 * 生成目录 HTML
 * @param {string} htmlContent - 渲染后的 HTML 内容
 * @returns {string} 目录 HTML
 */
function generateTocHtml(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const headers = doc.querySelectorAll('h1, h2, h3');

    if (headers.length === 0) return '';

    let tocHtml = '<ul class="toc-list">';
    let lastLevel = 0;
    let levelStack = [];

    headers.forEach((header, index) => {
        const level = parseInt(header.tagName.charAt(1));
        const text = header.textContent;
        const id = header.id || `toc-${index}`;

        // 为没有 id 的标题添加 id
        if (!header.id) {
            header.id = id;
        }

        // 处理层级
        if (level > lastLevel) {
            tocHtml += '<ul class="toc-sublist">';
            levelStack.push(lastLevel);
        } else if (level < lastLevel) {
            while (levelStack.length > 0 && levelStack[levelStack.length - 1] >= level) {
                tocHtml += '</ul></li>';
                levelStack.pop();
            }
            tocHtml += '</li>';
        } else if (lastLevel > 0) {
            tocHtml += '</li>';
        }

        tocHtml += `<li class="toc-item toc-level-${level}"><a class="toc-link" href="#${id}">${text}</a>`;
        lastLevel = level;
    });

    // 关闭所有标签
    while (levelStack.length > 0) {
        tocHtml += '</li></ul>';
        levelStack.pop();
    }
    tocHtml += '</li></ul>';

    return tocHtml;
}

/**
 * 生成完整的 HTML 模板
 * @param {string} title - 文档标题
 * @param {string} htmlContent - 渲染后的 HTML 内容
 * @param {string} tocHtml - 目录 HTML
 * @param {number} maxContentWidth - 内容区域最大宽度
 * @returns {string} 完整的 HTML 模板
 */
function generateHtmlTemplate(title, htmlContent, tocHtml, maxContentWidth = 900) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Canbox</title>
    <style>
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; margin: 0; padding: 0; }
        .container { display: flex; max-width: 1400px; margin: 0 auto; }
        .content { flex: 1; padding: 40px 60px; max-width: ${maxContentWidth}px; }
        .toc-container { width: 280px; padding: 40px 20px 40px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
        .toc-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .toc { padding: 0; margin: 0; }
        .toc ul { padding-left: 12px; margin: 5px 0; list-style: none; }
        .toc li { margin: 5px 0; }
        .toc a { color: #555; text-decoration: none; display: block; padding: 6px 10px; border-radius: 4px; transition: all 0.2s; }
        .toc a:hover { background-color: #e6f7ff; color: #1890ff; }
        .toc a.active { background-color: #1890ff; color: white; }
        .toc-level-1 { font-weight: bold; font-size: 20px; }
        .toc-level-2 { font-size: 17px; }
        .toc-level-3 { font-size: 14px; }
        h1, h2, h3, h4, h5, h6 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; scroll-margin-top: 20px; }
        h1 { font-size: 2.5em; border-bottom-width: 3px; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        .header-anchor { color: #999; text-decoration: none; margin-left: 10px; font-size: 0.8em; opacity: 0; transition: opacity 0.2s; }
        h1:hover .header-anchor, h2:hover .header-anchor, h3:hover .header-anchor { opacity: 1; }
        .header-anchor:hover { color: #1890ff; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.9em; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 15px 0; }
        pre code { background: none; padding: 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; background: #f9f9f9; padding: 10px 20px; border-radius: 4px; }
        a { color: #1890ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="toc-container">
            <div class="toc-title">目录</div>
            <div id="toc">${tocHtml}</div>
        </div>
        <div class="content">
            ${htmlContent}
        </div>
    </div>
    <script>
        // 滚动高亮当前目录项
        window.addEventListener('scroll', () => {
            const headers = document.querySelectorAll('h1, h2, h3');
            const tocLinks = document.querySelectorAll('.toc-link');
            let currentId = '';

            headers.forEach(header => {
                const rect = header.getBoundingClientRect();
                if (rect.top <= 100) {
                    currentId = header.id;
                }
            });

            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + currentId) {
                    link.classList.add('active');
                }
            });
        });
    <\/script>
</body>
</html>`;
}

/**
 * 渲染 Markdown 文件并在浏览器中打开
 * @param {string} filePath - Markdown 文件路径
 * @param {string} title - 文档标题
 * @param {Object} options - 可选配置
 * @param {number} options.maxContentWidth - 内容区域最大宽度，默认 900px
 * @returns {Promise<void>}
 */
export async function renderAndOpenMarkdown(filePath, title, options = {}) {
    const { maxContentWidth = 900 } = options;

    try {
        const result = await window.api.readFile(filePath);
        if (!result || !result.success) {
            ElMessage.error('无法读取文档');
            return;
        }

        const htmlContent = md.render(result.data);
        const tocHtml = generateTocHtml(htmlContent);
        const tempHtml = generateHtmlTemplate(title, htmlContent, tocHtml, maxContentWidth);

        const openResult = await window.api.openHtml(tempHtml);
        if (!openResult.success) {
            ElMessage.error('无法打开文档: ' + openResult.msg);
        }
    } catch (error) {
        console.error('渲染 Markdown 文档失败:', error);
        ElMessage.error('渲染文档失败: ' + error.message);
    }
}

export default {
    renderAndOpenMarkdown
};
