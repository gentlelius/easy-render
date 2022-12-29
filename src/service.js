import axios from 'axios';
import { message } from 'antd';
import { getBaseUrl } from './storage';

axios.defaults.timeout = 3e3;
axios.defaults.withCredentials = true;

axios.interceptors.response.use(
    (response) => {
        const result = response.data;
        // 状态代码 2xx 的响应拦截
        if (!result.success && result.msg) {
            message.error(result.msg);
        }
        return result;
    },
    error => {
        message.error(error.message);
        return Promise.reject(error)
    }
);

export function aRequest(path, options) {
    const baseUrl = getBaseUrl();
    return axios({
        url: `${baseUrl || ''}${path}`,
        ...options,
        withCredentials: true,
    })
}
