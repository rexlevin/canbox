class DateFormat {

    /**
     * 默认提供的一些日期格式
     */
    static DEFAULT_FORMATS = {
        DATE: 'yyyy-MM-dd',
        TIME: 'HH:mm:ss',
        DATETIME: 'yyyy-MM-dd HH:mm:ss'
    };

    /**
     * 格式化日期（静态方法）
     * @param {*} date  要格式化的日期对象
     * @param {*} format  [format="yyyy-MM-dd HH:mm:ss"] - 格式字符串
     * @returns {string} 格式化后的时间字符串
     */
    static format(date, format = DateFormat.DEFAULT_FORMATS.DATETIME) {
        const o = {
            "yyyy": date.getFullYear(), // 4位年份
            "yy": String(date.getFullYear()).slice(-2), // 2位年份
            "MM": String(date.getMonth() + 1).padStart(2, '0'), // 2位月份
            "M": date.getMonth() + 1, // 1位月份（不补0）
            "dd": String(date.getDate()).padStart(2, '0'), // 2位日期
            "d": date.getDate(), // 1位日期（不补0）
            "HH": String(date.getHours()).padStart(2, '0'), // 24小时制，2位小时
            "H": date.getHours(), // 24小时制，1位小时
            "hh": String(date.getHours() % 12 || 12).padStart(2, '0'), // 12小时制，2位小时
            "h": date.getHours() % 12 || 12, // 12小时制，1位小时
            "mm": String(date.getMinutes()).padStart(2, '0'), // 2位分钟
            "m": date.getMinutes(), // 1位分钟（不补0）
            "ss": String(date.getSeconds()).padStart(2, '0'), // 2位秒
            "s": date.getSeconds(), // 1位秒（不补0）
            "SSS": String(date.getMilliseconds()).padStart(3, '0'), // 3位毫秒
            "S": date.getMilliseconds(), // 1位毫秒（不补0）
            "E": ["日", "一", "二", "三", "四", "五", "六"][date.getDay()], // 星期几（中文）
            "q": Math.floor((date.getMonth() + 3) / 3), // 季度（1-4）
        };

        let pattern = format;
        for (const [key, value] of Object.entries(o)) {
            const regex = new RegExp(`(${key.replace('{', '\\{').replace('}', '\\}')})`, 'g');
            pattern = pattern.replace(regex, (match) => {
                const count = parseInt(key.match(/\{(\d+)(?:,(\d+))?\}/)[1]);
                return String(value).padStart(count, '0').slice(-count);
            });
        }
        return pattern;
    }
}

module.exports = DateFormat;