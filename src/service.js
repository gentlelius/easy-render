import axios from 'axios';

axios.defaults.timeout = 3e3;
axios.defaults.withCredentials = true;

export function aRequest(path, options) {
    return axios({
         url: `${window.__er__.BASE_URL || ''}${path}`,
         ...options,
         withCredentials: true,
    }).then(res => res.data);
}
