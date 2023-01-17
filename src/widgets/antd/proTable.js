import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Space, Button, message } from 'antd';
import ProTable from '@ant-design/pro-table';
import { omit, cloneDeep } from 'lodash-es';
import dayjs from 'dayjs';
import { aRequest } from '../../service';
import { getAll, getValue } from '../../storage';
import { flattenObject } from '../../utils';

if (!window.dayjs) {
    // todo: 考虑占用内存情况，观察占用了多少内存
    window.dayjs = dayjs;
}

const getSelectionDisabled = (record, expression) => {
    if (!expression || typeof expression !== 'string') {
        return false;
    }
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        const fn = new Function('record', `return ${expression}`);
        return fn(record);
    } else {
        return false;
    }
}

const parseHideExpression4Action = (expression, record, config) => {
    if (typeof expression === 'boolean') {
        return expression;
    }
    if (!expression) {
        return false;
    }
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        return new Function('record', 'config', `
            let flag = false;
            try {
                with(config) {
                    flag = ${expression};
                }
            } catch(e) {
            }
            return flag;
        `
        )(record, config);
    }
    return false;
}

const parseHideExpression4Column = (expression, config) => {
    if (typeof expression === 'boolean') {
        return expression;
    }
    if (!expression) {
        return false;
    }
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        return new Function('config', `
            let flag = false;
            try {
                with(config) {
                    flag = ${expression};
                }
            } catch(e) {
            }
            return flag;
        `
        )(config);
    }
    return false;
}

const parseHideExpression4Area = (expression, config) => {
    return parseHideExpression4Column(expression, config);
}

const parseHideExpression4Selection = (expression, config) => {
    return parseHideExpression4Column(expression, config);
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

const getParsedRequest = (requestFnStr, thenFn = res => res, catchFn = res => res) => (params, sorter, filter) => (
    new Function(
        'request', 
        'percentage', 
        'getValidParams',
        'getValue',
        'flattenObject',
        `return (${requestFnStr})(${JSON.stringify(params)},${JSON.stringify(sorter)},${JSON.stringify(filter)})`
    )
    (
        aRequest,
        percentage,
        getValidParams,
        getValue,
        flattenObject,
    ).then(thenFn, catchFn)
);

const accept = (fnstr) => {
    return new Function('getValue', 'h', `return ${fnstr}`)(getValue, React.createElement);
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

const Pro= (props) => {
    const actionRef = useRef();
    const formRef = useRef();
    const [prettyCols, setPrettyCols] = useState(props.columns|| []);
    const tableVisible = useRef(false);
    const [optionsMap, setMap] = useState({});

    // 搜索表单项 options 设置
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
        console.log('reqThen', res);

        let cols;
        if (res?.data?.length) {
            // 智能宽度
            const autoWidth = (col) => {
                if (col.valueType === 'option') {
                    return col;
                }
                if (col.render) {
                    return col;
                }
                if (col.width) {
                    return col;
                }
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
            };
            // 处理 record.a.b 嵌套型数据结构
            const flattenField = (item) => {
                if (!item.dataIndex) {
                    return item;
                }
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
            }
            // nothing todo
            const noop = item => item;
            // map start
            cols = prettyCols
                .map(props.widthDefault ? noop : autoWidth)
                .map(flattenField)
        } else {
            const config = getAll();
            cols = prettyCols
                // 过滤掉隐藏的
                .filter((item) => !parseHideExpression4Column(item.hidden, config))
                // 合并 otherConfig
                .map(item => {
                    if (!item.useOtherConfig) {
                        return item;
                    }
                    const newItem = { ...item };
                    const other = newItem.otherConfig;
                    try {
                        const otherObj = accept(other);
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

            if (props.actions?.length && !cols.find(item => item.valueType === 'option')) {
                const dispatch = (method) => cols[method]({
                    title: '操作',
                    valueType: 'option',
                    key: 'option',
                    width: props.actionsWidth || 100,
                    fixed: props.actionsPostion || 'right',
                    render: (text, record, _, tableRef) => props.actions.map((item, index) => (
                        !parseHideExpression4Action(item.hidden, record, config) && (
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
            }
        }

        if (cols) {
            tableVisible.current = true;
            setPrettyCols(cols);
        }
        return res;
    }, [props, prettyCols])

    // mock onMount
    useEffect(() => {
        reqThen();
    }, []);

    let request = useMemo(() => props.request 
        ? getParsedRequest(
            props.request, 
            reqThen,
            (error) => {
                message.error(error.response.data);
                console.log(error.response.data);
            },
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

    // nav区域的按钮组
    const tools = useMemo(() => (
        props.navs?.map((item, index) => (
            !parseHideExpression4Area(item.hidden, getAll()) && (
                <Button 
                    onClick={() => {
                        if (typeof props.navsHandler?.[index] === 'function') {
                            props.navsHandler[index](formRef.current.getFieldsValue(), actionRef.current);
                        } else {
                            console.warn(`nav ${index} is not function`);
                        }
                    }}
                    type={item.type || 'primary'}
                >{item.navName}</Button>
            )
        ))
    ), [props.navs, props.navsHandler])

    // 搜索表单区域的按钮组
    const getSearchOptions = useCallback(() => {
        return props.searchOptions?.map((item, index) => (
            !parseHideExpression4Area(item.hidden, getAll()) && (
                <Button
                    key={item.name}
                    onClick={() => {
                        if (typeof props.searchOptionsHandler?.[index] === 'function') {
                            props.searchOptionsHandler[index](formRef.current.getFieldsValue(), actionRef.current);
                        } else {
                            console.warn(`searchOptions ${index} is not function`);
                        }
                    }}
                    type={item.type || 'default'}
                >{item.name}</Button>
            )
        ))
    }, [props.searchOptions, props.searchOptionsHandler]);

    console.log('prettyCols', prettyCols);

    // 行展开内容
    const expandedRowRender = props.expandable ? (record) => {

        const config = props.expandable;

        if (config.sourceDataType === 'request') {
            const requestFn = getParsedRequest(config.request);
            return (
                <ProTable
                    headerTitle={false}
                    search={false}
                    options={false}
                    pagination={false}
                    request={() => requestFn(record)}
                    columns={config.tableColumn}
                    rowKey={config.rowKey}
                />
            )
        } else if (config.sourceDataType === 'record') {
            const dataSource = Array.isArray(record[config.fieldName]) ? record[config.fieldName] : [];
            if (config.tableColumn.length) {
                return (
                    <ProTable
                        headerTitle={false}
                        search={false}
                        options={false}
                        pagination={false}
                        columns={config.tableColumn}
                        dataSource={dataSource}
                        rowKey={config.rowKey}
                    />
                );
            } else {
                if (dataSource[0]) {
                    return (
                        <ProTable
                            headerTitle={false}
                            search={false}
                            options={false}
                            pagination={false}
                            columns={Object.keys(dataSource[0])}
                            dataSource={dataSource}
                            rowKey={config.rowKey}
                        />
                    )
                } else {
                    return '无内容';
                }
            }
        }
        return null;
    } : null;

    // 行选中内容
    let rowSelectionProps = {};
    if (props.rowSelectionConfig?.length) {
        const rowSelectionConfig = props.rowSelectionConfig
            .filter(item => !parseHideExpression4Selection(item.hidden, getAll()))
            .map(item => {
                const actionStr = item.action;
                let action = () => { console.warn('没有设置对应的事件函数，请设置')}
                if (actionStr?.trim()) {
                    action = new Function('options', 'request', `return (${actionStr})(options)`);
                }
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
                getCheckboxProps(record) {
                    return {
                        disabled: getSelectionDisabled(record, props.rowSelectionDisabled),
                    }
                },
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
                        {rowSelectionConfig.map(expanderItem => <a key={expanderItem.name} onClick={() => expanderItem.action(options, aRequest)}>{expanderItem.name}</a>)}
                    </Space>
                );
            },
        }
    }

    if (!tableVisible.current) {
        return <div></div>;
    }

    if (props.disabled) {
        request = null;
    }

    return (
        <div style={{flex: 1, overflow: 'auto'}}>
            <ProTable
                formRef={formRef}
                actionRef={actionRef}
                defaultCollapsed={false}
                rowKey={prettyCols[0] ? prettyCols[0].dataIndex : 'id'}
                search={{
                    labelWidth: props.labelWidth || 'auto',
                    defaultCollapsed: props.defaultCollapsed || false,
                    span: props.span || 6,
                    optionRender: (searchConfig, formProps, dom) => (
                        <div className="flex gap12">
                            {getSearchOptions(searchConfig, formProps)}
                            {dom}
                        </div>
                    ),
                    className: 'search-action',
                }}
                toolBarRender={() => tools}
                scroll={{
                    x: 'max-content',
                }}
                pagination={{
                    defaultPageSize: props.defaultPageSize || 20,
                }}
                {...props}
                columns={prettyCols}
                onChange={() => {}}
                expandable={{expandedRowRender}}
                {...rowSelectionProps}
                request={request}
            />
        </div>
    );
};

export default Pro;
