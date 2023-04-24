import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import { getFormat } from '../../utils';

export default ({ onChange, format, value, style, allowStart, allowEnd, ...rest }) => {
    const dateFormat = getFormat(format);

    const valueObj = useMemo(() => {
        // week 的时候会返回 2020-31周 quarter 会返回 2020-Q2 需要处理之后才能被 dayjs
        let _value = value || undefined;
        if (typeof _value === 'string') {
            if (format === 'week') {
                _value = _value ? _value.substring(0, _value.length - 1) : _value;
            }
            if (format === 'quarter') {
                _value = _value.replace('Q', '');
            }
        }
        if (_value) {
            _value = dayjs(_value, dateFormat);
        }
        return _value;
    }, [value]);

    const handleChange = (value, string) => {
        onChange(string);
    };

    const dateParams = {
        value: valueObj,
        style: { width: '100%', ...style },
        onChange: handleChange,
    };

    // TODO: format 是在 options 里自定义的情况，是否要判断一下要不要 showTime
    if (format === 'dateTime') {
        dateParams.showTime = true;
    }

    if (['week', 'month', 'quarter', 'year'].indexOf(format) > -1) {
        dateParams.picker = format;
    }

    if (dateFormat === format) {
        dateParams.format = format;
    }

    const disabledDate = (current) => {
        allowStart = allowStart || '1900-01-01';
        allowEnd = allowEnd || '2100-01-01';
        return !(current && current >= dayjs(allowStart).startOf('day') && current <= dayjs(allowEnd).endOf('day'));
    }

    return <DatePicker {...dateParams} {...rest} disabledDate={disabledDate} />;
};
