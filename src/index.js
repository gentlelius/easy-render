import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale/zh_CN';
import FRCore from './form-render-core/src';
import { widgets as defaultWidgets } from './widgets/antd';

export { setBaseUrl, setValue, setValueOnce, getValue, clearAll, destroy, getAll, } from './storage';
export { defaultWidgets as widgets };
export { useForm, connectForm, createWidget, mapping } from './form-render-core/src';

const FR = ({ widgets, configProvider, ...rest }) => (
    <ConfigProvider locale={zhCN} {...configProvider}>
        <FRCore widgets={{ ...defaultWidgets, ...widgets }} {...rest} />
    </ConfigProvider>
);

export default FR;
