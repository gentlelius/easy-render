import React from 'react';
import { aRequest } from '../../service';
import {
    ProFormSelect,
    ProFormSelectProps
} from "@ant-design/pro-components";


/**
 * 
 * @param props 这里的 props 时指的 schema renderer 对应的属性，而不是组件的属性！
 * 因此这里需要做一层拆解，拿到对应的组件属性
 * 通常，props的 数据结构为：
 * {
    "schema": {
        "title": "交易方式",
        "type": "string",
        "widget": "proSelect",
        "props": {
            "options": [
                {
                    "value": "1",
                    "label": "普通交易"
                },
                {
                    "value": "2",
                    "label": "过券交易"
                }
            ]
        },
        "required": true,
        "$id": "tradeWay"
    },
    "children": null,
    "options": [
        {
            "value": "1",
            "label": "普通交易"
        },
        {
            "value": "2",
            "label": "过券交易"
        }
    ],
    "title": "交易方式",
    "addons": {
        "dependValues": [],
        "formData": {},
        "dataPath": "tradeWay",
        "dataIndex": [],
        "watch": {}
    }
}
 * 
 * @returns 
 */
const ProSelect: React.FC<ProFormSelectProps> = (props) => {
    const { schema, style, value, onChange,  request, ...rest } = props;
    // 解析 props.request 
    let req;
    if (request) {
        // eslint-disable-next-line no-new-func
        req = (val: { keyWords: string }) => {
            return new Function(
                'request',
                `return (${props.request})(${JSON.stringify(val.keyWords)})`
            )(
                aRequest,
            )
        }
    }

    const params: any = {
        fieldProps: {
            filterOption: true,
        },
    };
    if (props.showSearch) {
        params.showSearch = props.showSearch;
    }
    if (props.options) {
        params.options = props.options;
    }
    if (req) {
        params.request = req;
    }
    if (onChange) {
        params.onChange = onChange;
    }
    if (value !== undefined) {
        params.value = value;
    }

    console.log(params, '11pselect.prop');
    return (
        <div className="fr-pro-select">
            <ProFormSelect
                {...params}
            />
        </div>
    )
}

export default ProSelect;