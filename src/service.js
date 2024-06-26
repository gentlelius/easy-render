import axios from 'axios';
import { message } from 'antd';
import { getBaseUrl } from './storage';

axios.defaults.timeout = 10e3;
axios.defaults.withCredentials = true;

let specialConfig = {};

axios.interceptors.response.use(
    (response) => {
        const result = response.data;
        if (result.success !== false) {
            result.success = true;
        }
        // 状态代码 2xx 的响应拦截
        if (!result.success && !specialConfig.ignoreError) {
            message.error(result.msg || result.message);
            return Promise.reject(result);
        }
        return result;
    },
    error => {
        if (!specialConfig.ignoreError) {
            message.error(error.message);
        }
        return Promise.reject(error)
    }
);

export function aRequest(path, options, config) {
    const baseUrl = getBaseUrl();
    specialConfig = config || {};
    return axios({
        url: `${baseUrl || ''}${path}`,
        ...options,
        withCredentials: true,
    });
}

export function setResponseInterceptor(callback, errorCallback) {
    // 清除之前的拦截器
    axios.interceptors.response.eject(0);
    // 设置新的拦截器
    return axios.interceptors.response.use(callback, errorCallback);
}
