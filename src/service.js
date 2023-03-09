import axios from 'axios';
import { message } from 'antd';
import { getBaseUrl } from './storage';

axios.defaults.timeout = 6e3;
axios.defaults.withCredentials = true;

let specialConfig = {};

axios.interceptors.response.use(
    (response) => {
        const result = response.data;
        // 状态代码 2xx 的响应拦截
        if (!result.success && result.msg && !specialConfig.ignoreError) {
            message.error(result.msg);
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
