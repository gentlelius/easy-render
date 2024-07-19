import enUS from './en-US.json';

const map = {
    'en-US': enUS,
}

export default (locale = 'zh-CN', key) => {
    if (!map[locale]) {
        return key;
    }
    return map[locale][key] ?? key;
}
