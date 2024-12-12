class DateFormat {
    fmt;
    constructor(format) {
        this.fmt = format;
    }
    parse() { }
    format(date) {
        const o = {
            "y{4}|y{2}" : date.getFullYear(), //year
            "M{1,2}" : date.getMonth() + 1, //month
            "d{1,2}" : date.getDate(),      //day
            "H{1,2}" : date.getHours(),     //hour 24
            "h{1,2}" : date.getHours() % 12,  //hour 12
            "m{1,2}" : date.getMinutes(),   //minute
            "s{1,2}" : date.getSeconds(),   //second
            "E" : date.getDay(),   //day in week
            "q" : Math.floor((date.getMonth() + 3) / 3),  //quarter
            "S{3}|S{1}"  : date.getMilliseconds() //millisecond
        }
        let pattern = this.fmt;
        for(const k in o ){
            pattern = pattern.replace(new RegExp("("+ k +")"), function(m){
                return ("0".repeat(m.length) + o[k]).substring(("" + o[k]).length);
            })
        }
        return pattern;
    }
}

module.exports = DateFormat;