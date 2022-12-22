import axios from 'axios';
import { getBaseUrl } from './storage';

axios.defaults.timeout = 3e3;
axios.defaults.withCredentials = true;

export function aRequest(path, options) {
    const baseUrl = getBaseUrl();
    return axios({
        url: `${baseUrl || ''}${path}`,
        ...options,
        withCredentials: true,
    }).then(res => res.data);
}
