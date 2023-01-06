/* eslint-disable indent */
export function isUrl(string) {
    const protocolRE = /^(?:\w+:)?\/\/(\S+)$/;
    // const domainRE = /^[^\s\.]+\.\S{2,}$/;
    if (typeof string !== 'string') return false;
    return protocolRE.test(string);
}

export const getArray = (arr, defaultValue = []) => {
    if (Array.isArray(arr)) return arr;
    return defaultValue;
};

export function getFormat(format) {
    let dateFormat;
    switch (format) {
        case 'date':
            dateFormat = 'YYYY-MM-DD';
            break;
        case 'time':
            dateFormat = 'HH:mm:ss';
            break;
        case 'dateTime':
            dateFormat = 'YYYY-MM-DD HH:mm:ss';
            break;
        case 'week':
            dateFormat = 'YYYY-w';
            break;
        case 'year':
            dateFormat = 'YYYY';
            break;
        case 'quarter':
            dateFormat = 'YYYY-Q';
            break;
        case 'month':
            dateFormat = 'YYYY-MM';
            break;
        default:
            if (typeof format === 'string') {
                dateFormat = format;
            } else {
                dateFormat = 'YYYY-MM-DD';
            }
    }
    return dateFormat;
}

export function flattenObject(o, prefix = '', result = {}, keepNull = true) {
    if (_.isString(o) || _.isNumber(o) || _.isBoolean(o) || (keepNull && _.isNull(o))) {
        result[prefix] = o;
        return result;
    }
  
    if (_.isArray(o) || _.isPlainObject(o)) {
        for (let i in o) {
            let pref = prefix;
            if (_.isArray(o)) {
                pref = pref + `[${i}]`;
            } else {
                if (_.isEmpty(prefix)) {
                    pref = i;
                } else {
                    pref = prefix + '.' + i;
                }
            }
            flattenObject(o[i], pref, result, keepNull);
        }
        return result;
    }
    return result;
}