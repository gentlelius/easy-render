const dataMap = {};

export function setValue(key, value) {
    dataMap[key] = value;
}

export function getValue(key) {
    return dataMap[key];
}

export function destroy(key) {
    return delete dataMap[key];
}

export function clearAll() {
    Object.keys(dataMap).forEach(key => {
        delete dataMap[key];
    });
}

export function getAll() {
    return dataMap;
}

// 设置 baseUrl
let baseUrl;
export function setBaseUrl(url) {
    baseUrl = url;
}
export function getBaseUrl() {
    return baseUrl;
}
