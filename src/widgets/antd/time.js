import React from 'react';
import dayjs from 'dayjs';
import { TimePicker } from 'antd';
import { getFormat } from '../../utils';

// TODO: 不要使用dayjs，使用dayjs
export default ({ onChange, format, value, style, ...rest }) => {
    const timeFormat = getFormat(format);
    const _value = value ? dayjs(value, timeFormat) : undefined;

    const handleChange = (value, string) => {
        onChange(string);
    };

    const timeParams = {
        value: _value,
        style: { width: '100%', ...style },
        onChange: handleChange,
        format: timeFormat,
        ...rest,
    };

    return <TimePicker {...timeParams} />;
};
