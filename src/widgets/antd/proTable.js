import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Descriptions, Space, Button, message } from 'antd';
import ProTable from '@ant-design/pro-table';
import { omit, cloneDeep } from 'lodash-es';
import dayjs from 'dayjs';
import { aRequest } from '../../service';
import { getValue } from '../../storage';

if (!window.dayjs) {
    // todo: 考虑占用内存情况，观察占用了多少内存
    window.dayjs = dayjs;
}

const parseHideExpression = (expression, record) => {
    if (!expression) {
        return false;
    }
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        return new Function('record', `return ${expression}`)(record);
    }
    return false;
}

const getValidParams = (params) => {
    if (!params) {
        return {};
    }
    const payload = {...omit(params, ['pageSize', 'current'])};
    Object.keys(payload).forEach(key => {
        // 过滤掉 value = '' 
        if (payload[key] === '') {
            payload[key] = undefined;
        }
        // trim
        if (typeof payload[key] === 'string') {
            payload[key] = payload[key].trim()
        }
        // 解析 obj.description 字段，摘掉 description
        const list = key.split('.');
        if (list.length === 2 && list[1] === 'description') {
            const val = payload[key];
            delete payload[key];
            payload[list[0]] = val;
        }
    });
    return payload;
}


const percentage = (num) => {
    if (isNaN(num)) {
        return '-';
    }
    const number = +num;
    if (number) {
        return number * 100 + '%';
    } else {
        return '0%';
    }
}

let context = null;
const getContext = () => {
    if (!context) {
        const canvas = document.createElement("canvas");
        context = canvas.getContext("2d"); 
    }
    return context;
}

// 默认字体为微软雅黑 Microsoft YaHei,字体大小为 14px
const getTextWidth = (text, font) => {
    font = font || '14px Microsoft YaHei';
    const context = getContext();
    context.font = font
    let textmetrics = context.measureText(text)
    return textmetrics.width;
}

const handleInitCol = (col) => {
    const list = ['select', 'radio', 'radioButton', 'checkbook']
    return col.map(item => {
        if (list.includes(item.valueType) && (item.onSearch || item.onInit)) {
            item.fieldProps = item.fieldProps || {};
            item.fieldProps.options = item.fieldProps.options || [];
        }
        return {
            ...item,
        }
    })
}

const Pro= (props) => {
    const actionRef = useRef();
    const [prettyCols, setPrettyCols] = useState(props.columns|| []);
    const [optionsMap, setMap] = useState({});

    useEffect(() => {
        // 找到改变的项，然后设置 options
        if (Object.keys(optionsMap).length === 0) {
            return;
        }
        setPrettyCols((cols) => {
            const newCols = cols.map(item => {
                const newItem = cloneDeep(item);
                const options = optionsMap[newItem.dataIndex];
                if (!newItem.fieldProps) {
                    newItem.fieldProps = {};
                }
                // map 里面有 options 时，说明 onInit onSearch 被调用，此时应该更新 options
                if (options) {
                    newItem.fieldProps.options = options;
                }
                return newItem;
            });
            return newCols;
        });
    }, [optionsMap]);

    const reqThen = useCallback(async res => {
        console.log('req', res);
        if (!res?.data?.length) {
            return res;
        }
        const cols = props.columns
            // 智能宽度
            .map(col => {
                const key = col.dataIndex;
                const textList = res.data.map(item => item[key]);
                const textWidthList = textList.map(item => getTextWidth(item));
                // 取最大宽度
                const avgWidth = textWidthList.reduce((pre, cur) => Math.max(pre, cur));
                // or 取第一个？
                // const avgWidth = ~~textWidthList[0];
                return {
                    ...col,
                    width: Math.max(avgWidth, col.width) + 32,
                }
            })
            // 处理 record.a.b 嵌套型数据结构
            .map(item => {
                const keys = item.dataIndex.split('.');
                if (keys.length < 2) {
                    return item;
                }
                // render 函数处理
                item.render = (dom, record) => {
                    let label = record;
                    for (const k of keys) {
                        if (label !== undefined && label !== null) {
                            label = label[k];
                        } else {
                            break;
                        }
                    }
                    return label || '-';
                }
                return item;
            })
            // 合并 otherConfig
            .map(item => {
                if (!item.useOtherConfig) {
                    return item;
                }
                const newItem = { ...item };
                const other = newItem.otherConfig;
                try {
                    const otherObj = eval('(' + other + ')');
                    // 函数单独处理
                    if (typeof otherObj.fieldProps === 'function') {
                        const fn = otherObj.fieldProps.toString();
                        const newFieldProps = new Function('form', 'config', `const request = ${aRequest};return (function ${fn})(form, config)`)
                        otherObj.fieldProps = newFieldProps;
                    }
                    // 处理 onSearch
                    if (typeof otherObj.onSearch === 'function' && typeof newItem.fieldProps !== 'function') {
                        let fn = otherObj.onSearch.toString();
                        fn = fn.replace(/\s*(async)?\s*onSearch/, 'async function');
                        const funstr = `
                            const fn = ${fn};
                            return fn(val);
                        `.trim();
                        const newOnSearch = new Function('request', 'val', funstr);

                        if (!newItem.fieldProps) {
                            newItem.fieldProps = {};
                        }
                        newItem.fieldProps.showSearch = true;
                        newItem.fieldProps.onSearch = (val) => {
                            // todo: 防抖处理 竞态处理
                            const p = newOnSearch(aRequest, val);
                            if (p instanceof Promise) {
                                p.then((res) => {
                                    if (Array.isArray(res)) {
                                        setMap((optionsMap) => ({
                                            ...optionsMap,
                                            [newItem.dataIndex]: res,
                                        }));
                                    }
                                });
                            }
                        }
                    }
                    // 处理 onInit
                    if (typeof otherObj.onInit === 'function') {
                        // 暂时给它设置 options，避免控制台报错
                        let fn = otherObj.onInit.toString();
                        fn = fn.replace(/\s*(async)?\s*onInit/, 'async function');
                        const funstr = `
                            const fn = ${fn};
                            return fn();
                        `.trim();
                        const newOnInit = new Function('request', funstr);
                        const p = newOnInit(aRequest);
                        
                        if (p instanceof Promise) {
                            p.then((res) => {
                                if (Array.isArray(res)) {
                                    setMap((optionsMap) => ({
                                        ...optionsMap,
                                        [newItem.dataIndex]: res,
                                    }));
                                }
                            });
                        }
                    }
                    
                    Object.assign(newItem, otherObj);
                } catch (error) {
                    console.error('解析gg...\n', item, error)
                }
                delete newItem.otherConfig;
                delete newItem.useOtherConfig;
                delete newItem.onSearch;
                delete newItem.onInit;
                return newItem;
            });

        if (props.actions?.length) {
            const dispatch = (method) => cols[method]({
                title: '操作',
                valueType: 'option',
                key: 'option',
                width: props.actionsWidth || 100,
                fixed: method || 'right',
                render: (text, record, _, tableRef) => props.actions.map((item, index) => (
                    !parseHideExpression(item.hidden, record) && (
                        <a
                            key={item.actionName}
                            onClick={() => {
                                if (typeof props.actionsHandler?.[index] === 'function') {
                                    props.actionsHandler[index](record, tableRef);
                                } else {
                                    console.warn(`action ${index} is not function`);
                                }
                            }}
                        >{item.actionName}</a>
                    )
                ))
            });
            if (props.actionsPostion === 'left') {
                dispatch('unshift');
            } else {
                dispatch('push');
            }
            cols.push();
        }

        if (cols) {
            setPrettyCols(cols);
        }
        return res;
    }, [props])

    let request = useMemo(() => props.request 
        ? (params, sorter, filter) => (
            new Function(
                'request', 
                'percentage', 
                'getValidParams',
                'getValue',
                `return (${props.request})(${JSON.stringify(params)},${JSON.stringify(sorter)},${JSON.stringify(filter)})`
            )
            (
                aRequest, 
                percentage,
                getValidParams,
                getValue,
            ).then(reqThen, (error) => {
                message.error(error.response.data);
                console.log(error.response.data);
            })
        )
        : (
            // 没有 request 就走默认的，默认的得传url ，没有 URL则什么都不请求
            props.url 
                ? (params, sorter) => aRequest(
                    props.url,
                    {
                        method: props.method ? 'get' : props.method.toLowerCase(),
                        params: {
                        // sort: '',
                            order: 'asc',
                            limit: params.pageSize,
                            offset: (params.current - 1) * params.pageSize,
                            ...getValidParams(params),
                        }
                    }
                ).then((res) => {
                    const { success, rows, total } = res;
                    if (success) {
                        return {
                            success: true,
                            data: rows,
                            pageSize: params.pageSize,
                            current: params.current,
                            total,
                        }
                    }
                }).then(reqThen)
                : () => Promise.resolve(({ data: [], success: true }))
        ), [props, reqThen]);

    // 在没有 columns 的时候得清空 request
    if (!props.columns) {
        request = null;
    }

    const tools = useMemo(() => {
        return props.navs?.map((item, index) => (
            <Button 
                onClick={() => {
                    if (typeof props.navsHandler?.[index] === 'function') {
                        props.navsHandler[index](actionRef);
                    } else {
                        console.warn(`nav ${index} is not function`);
                    }
                }}
                type={item.type || 'primary'}
            >{item.navName}</Button>
        ));
    }, [props.navs, props.navsHandler])

    const mapKeyToLabel = prettyCols.reduce((pre, cur) => {
        return Object.assign(pre, { [cur.dataIndex]: cur.title })
    }, {});

    console.log('prettyCols', prettyCols);

    const expandedRowRender = props.expandedRowRender ? (record) => {
        return (
            <Descriptions title="">
                {
                    record && Object.keys(record).map(key => (
                        <Descriptions.Item labelStyle={{fontWeight: 500,}} key={key} label={mapKeyToLabel[key]}>{record[key]}</Descriptions.Item>
                    ))
                }
            </Descriptions>
        )
    } : null;

    let rowSelectionProps = {};
    if (props.rowSelectionConfig?.length) {
        const rowSelectionConfig = props.rowSelectionConfig.map(item => {
            const actionStr = item.action;
            const action = new Function('options', 'request', `return (${actionStr.trim()})(options)`);
            return {
                ...item,
                action,
            }
        });
        rowSelectionProps = {
            rowSelection: {
                // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                // 注释该行则默认不显示下拉选项
                // selections: [ProTable.SELECTION_ALL, ProTable.SELECTION_INVERT],
            },
            tableAlertRender: ({ selectedRowKeys, selectedRows, onCleanSelected }) => (
                <Space size={24}>
                    <span>
                        已选 {selectedRowKeys.length} 项
                        <a style={{ marginInlineStart: 8 }} onClick={onCleanSelected}>
                         取消选择
                        </a>
                    </span>
                </Space>
            ),
            tableAlertOptionRender: (options) => {
                return (
                    <Space size={16}>
                        {rowSelectionConfig.map(expanderItem => <a onClick={() => expanderItem.action(options, aRequest)}>{expanderItem.name}</a>)}
                    </Space>
                );
            },
        }
    }

    return (
        <div style={{flex: 1, overflow: 'auto'}}>
            <ProTable
                actionRef={actionRef}
                defaultCollapsed={false}
                rowKey={prettyCols[0] ? prettyCols[0].key : 'id'}
                search={{
                    labelWidth: props.labelWidth || 80,
                    defaultCollapsed: props.defaultCollapsed || false,
                    span: props.span || 6,
                }}
                toolBarRender={() => tools}
                {...props}
                request={request}
                columns={prettyCols}
                scroll={{
                    x: 'max-content',
                }}
                pagination={{
                    defaultPageSize: props.defaultPageSize || 20,
                }}
                onChange={() => {}}
                expandable={{expandedRowRender}}
                {...rowSelectionProps}
            />
        </div>
    );
};

export default Pro;
