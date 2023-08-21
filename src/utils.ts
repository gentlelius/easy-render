import { isString, isNumber, isBoolean, isNull, isPlainObject, isArray, isEmpty } from 'lodash-es';

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
    if (isString(o) || isNumber(o) || isBoolean(o) || (keepNull && isNull(o))) {
        result[prefix] = o;
        return result;
    }
  
    if (isArray(o) || isPlainObject(o)) {
        for (let i in o) {
            let pref = prefix;
            if (isArray(o)) {
                pref = pref + `[${i}]`;
            } else {
                if (isEmpty(prefix)) {
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

export function flattenObjectAndMerge(o) {
    return Object.assign(o, flattenObject(o));
}

export function getUiFormData (formData, flatten) {
    // 从 formData 里面获取 UI 的 formData，只取在 flatten 中的出现的key
    const uiKeys = Object.keys(flatten);
    const uiFormData = {};
    Object.entries(formData).forEach(([key, value]) => {
        if (uiKeys.some(uiKey => uiKey.includes(key) )) {
            uiFormData[key] = value;
        }
    });
    return uiFormData;
}