import axios from 'axios';

export function aRequest(path, options) {
    return axios({
        url: `${window.__er__.BASE_URL}${path}`,
        ...options,
    }).then(res => res.data);
}
