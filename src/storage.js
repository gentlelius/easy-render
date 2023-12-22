import { isPlainObject } from 'lodash-es';
import Event from './event';

const event = new Event();

const dataMap = {};
const onceMap = {};

export function getEvent() {
    return event;
}

let timeout = null;
export function setValue(key, value) {
    dataMap[key] = value;
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
        event.emit('valueChange', dataMap);
    }, 20);
}

export function setValueOnce(key, value) {
    setValue(key ,value);
    onceMap[key] = true;
}

export function getValue(key) {
    const value = dataMap[key];
    if (onceMap[key]) {
        destroy(key);
        onceMap[key] = undefined;
    }
    return value;
}

export function destroy(key) {
    dataMap[key] = undefined;
}

export function clearAll() {
    Object.keys(dataMap).forEach(key => {
        dataMap[key] = undefined;
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

let envConfig = {};
export function setEnvConfig(config) {
    if (isPlainObject(config)) {
        envConfig = config;
    }
}

export function getEnvConfig() {
    return envConfig;
}
