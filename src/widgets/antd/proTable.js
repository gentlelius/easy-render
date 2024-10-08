import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Space, Button, message } from 'antd';
import ProTable from '@ant-design/pro-table';
import { omit, cloneDeep } from 'lodash-es';
import dayjs from 'dayjs';
import { aRequest } from '../../service';
import { getAll as getGlobalAll, getValue, getEvent, setValue, getEnvConfig } from '../../storage';
import { flattenObjectAndMerge, flattenObject } from '../../utils';
import qs from 'query-string';
import { Decimal } from 'decimal.js';
import { 
    getSafeConfig, 
    getSelectionDisabled,
    parseHideExpression4Action,
    parseHideExpression4Column,
    parseHideExpression4Area,
    parseHideExpression4Selection,
    isDayjsOrMoment
} from '../../helper';
import getLocaleMessage from '../../form-render-core/locales/index';

const SERACH_ACTION_CLASS = 'search-action';
const SERACH_ACTION_CLASS2 = 'search-action2';

Number.prototype.toFixed = function(precision) {
    return new Decimal(this).toFixed(precision);
}

const precision = (num, precision = 2, ignoreZero = false) => {
    if (isNaN(num)) {
        return '-';
    }
    const number = +num;
    if (ignoreZero) {
        return number.toLocaleString('zh', {style: 'decimal', maximumFractionDigits: precision, minimumFractionDigits: 0});
    } else {
        return number.toLocaleString('zh', {style: 'decimal', maximumFractionDigits: precision, minimumFractionDigits: precision});
    }
}

const percentage = (num, precisionCount = 2) => {
    if (isNaN(num)) {
        return '-';
    }
    const number = +num;
    return precision(number * 100, precisionCount) + '%';;
}

const genID = (n) => {
    return Math.random().toString(36).slice(3, n + 3)
}

// 检查是否有时分秒
const getSafeDate = (date) => {
    if (date?.$isDayjsObject) {
        // delete date.$isDayjsObject;
        date = dayjs(date.$d)
    }
    let newDate;
    const envConfig = getEnvConfig();
    if (envConfig.dateFormat === 'YYYY-MM-DD') {
        newDate = date.format('YYYY-MM-DD');
    } else if (date.format('HH:mm:ss') === '00:00:00') {
        newDate = date.format('YYYY-MM-DD');
    } else {
        newDate = date.format('YYYY-MM-DD HH:mm:ss');
    }
    return newDate;
}

const getValidParams = (params, removePageInfo = true) => {
    if (!params) {
        return {};
    }
    let payload;
    if (removePageInfo) {
        payload = {...omit(params, ['pageSize', 'current'])};
    } else {
        payload = {...params};
    }
    Object.keys(payload).forEach(key => {
        
        // 解析 obj.x 字段，摘掉 x
        const list = key.split('.');
        if (list.length === 2) {
            const val = payload[key];
            delete payload[key];
            payload[list[0]] = val;
        }
        // 过滤掉 value = '' 
        if (payload[key] === '') {
            payload[key] = undefined;
        }
        if (typeof payload[key] === 'string') {
            // trim
            payload[key] = payload[key].trim();
        } else if (isDayjsOrMoment(payload[key])) {
            payload[key] = getSafeDate(payload[key]);
        } else if (Array.isArray(payload[key])) {
            payload[key] = payload[key].map(item => {
                if (isDayjsOrMoment(item)) {
                    return getSafeDate(item);
                }
                return item;
            })
        }
    });
    return payload;
}

const getPolling = (expression, config) => {

    if (!expression) {
        return undefined;
    }

    if (!isNaN(expression)) {
        return +expression;
    }

    config = cloneDeep(config);

    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        config = getSafeConfig(config, expression);
        return new Function('config', `
            let flag = undefined;

            try {
                with(config) {
                    flag = ${expression};
                }
            } catch(e) {
                console.log(e);
            }
            return flag;
        `
        )(config);
    }
    return undefined;
}

const getParsedRequest = (requestFnStr, 
    thenFn = res => res,
    catchFn = res => console.error(res),
    getInlineValue,
    setInlineValue,
) => (params, sorter, filter) => (
    new Function(
        'request', 
        'percentage', 
        'precision',
        'getValidParams',
        'getValue',
        'setValue',
        'flattenObject',
        'genID',
        'dayjs',
        'qs',
        'getInlineValue',
        'setInlineValue',
        `return (${requestFnStr})(${JSON.stringify(getValidParams(params, false))},${JSON.stringify(sorter)},${JSON.stringify(filter)})`
    )
    (
        aRequest,
        percentage,
        precision,
        getValidParams,
        getValue,
        setValue,
        flattenObject,
        genID,
        dayjs,
        qs,
        getInlineValue,
        setInlineValue,
    ).then(thenFn, catchFn)
);

const accept = (fnstr, getInlineValue) => {
    return new Function(
        'getValue',
        'getInlineValue',
        'h',
        'percentage',
        'precision',
        'dayjs',
        'qs',
        `return ${fnstr}`
    )(
        getValue,
        getInlineValue,
        React.createElement,
        percentage,
        precision,
        dayjs,
        qs,
    );
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
    let textmetrics = context.measureText(text);
    return textmetrics.width;
}

const ProTableWidget = (props) => {
    const { tableRef: tableRefIn, formRef: formRefIn, moreAction } = props.table || {};
    
    const backupTableRef = useRef();
    const backupFormRef = useRef();

    let actionRef = tableRefIn || backupTableRef;
    let formRef = formRefIn || backupFormRef;
    
    // 内部数据源
    const inlineValue = useRef({});
    // 做一层安全转换
    const safeColumns = useMemo(() => {
        return props.columns ? props.columns.map(item => {
            if (!item.useOtherConfig) {
                return item;
            }
            try {
                const other = item.otherConfig;
                const otherObj = accept(other, moreAction?.getInlineValue);
                const { initialValue } = otherObj || {};
                return {
                    ...item,
                    initialValue
                }
            } catch (error) {
                console.error('请检查 JSON 配置是否有误，借助于 JSON 格式化查看工具更有效', item, error)
            }
        }) : [];
    }, [props.columns, moreAction?.getInlineValue]);

    const prettyCols = useRef(safeColumns);
    const tableVisible = useRef(false);
    const [optionsMap, setMap] = useState({});
    const [code, forceUpdate] = useState(0);
    const [selRowKeys, setSelRowKeys] = useState(props.selectedRowKeys ?? []);
    const selectedRowsRef = useRef([]);
    const [dataSource, setDataSourceNative] = useState([]);
    const dataSourceRef = useRef(dataSource);

    const setDataSource = (data) => {
        dataSourceRef.current = data;
        setDataSourceNative(data);
    }

    const timeout = useRef(null);
    if (moreAction) {
        moreAction.getSelectedRows = () => selectedRowsRef.current;
        moreAction.setSelRowKeys = (keys) => {
            setSelRowKeys(keys);
            selectedRowsRef.current = keys.map(key => dataSourceRef.current.find(item => item[props.rowKey] === key));
        }
        moreAction.setDataSource = setDataSource;
        moreAction.getDataSource = () => dataSourceRef.current;
        moreAction.setInlineValue = (key, value) => {
            inlineValue.current[key] = value;

            const event = getEvent();
            if (timeout.current) {
                clearTimeout(timeout.current);
                timeout.current = null;
            }
            timeout.current = setTimeout(() => {
                event.emit('valueChange', inlineValue.current);
            }, 20);
        }
        moreAction.getInlineValue = (key) => {
            return inlineValue.current[key];
        }
        moreAction.getInlineAll = () => {
            return inlineValue.current;
        }
    }

    const getAll = useCallback(() => {
        return {
            ...getGlobalAll(),
            ...moreAction?.getInlineAll(),
        };
    }, [moreAction])

    useEffect(() => {
        selectedRowsRef.current = dataSource.filter(item => selectedRowsRef.current.find(selectedItem => selectedItem[props.rowKey] === item[props.rowKey]));
    }, [dataSource])

    const handleRowSelectChange = useCallback((selectedRowKeys, selectedRows) => {
        setSelRowKeys(selectedRowKeys);
        selectedRowsRef.current = selectedRows;
    }, [])

    const onSubmit = useCallback(() => {
        actionRef.current?.clearSelected();
    }, []);

    // 搜索表单项 options 设置
    useEffect(() => {
        // 找到改变的项，然后设置 options
        if (Object.keys(optionsMap).length === 0) {
            return;
        }
        console.log('pretty changes');
        prettyCols.current = prettyCols.current.map(item => {
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
        forceUpdate(state => state + 1);

    }, [optionsMap]);

    const optionsMapRef = useRef(optionsMap);
    optionsMapRef.current = optionsMap;
    const getColumn = () => {
        let cols = prettyCols.current
            // 合并 otherConfig
            // eslint-disable-next-line complexity
            .map(item => {
                if (!item.useOtherConfig) {
                    return item;
                }
                const other = item.otherConfig;
                const newItem = { ...item };

                try {
                    const otherObj = accept(other, moreAction?.getInlineValue);
                    // otherObj 打平后合并到 newItem，然后对 newItem 进行处理
                    Object.assign(newItem, otherObj);
                    if (!props.disabled) {
                        // 处理 onSearch，如果 有声明 fieldProps 为函数，则忽略 onSearch
                        if (typeof otherObj.onSearch === 'function' && typeof newItem.fieldProps !== 'function') {
                            let fn = otherObj.onSearch.toString();
                            fn = fn.replace(/\s*(async)?\s*onSearch/, 'async function');
                            const funstr = `
                            const fn = ${fn};
                            return fn(val);
                        `.trim();
                            const newOnSearch = new Function('request', 'getValue', 'val', funstr);

                            if (!newItem.fieldProps) {
                                newItem.fieldProps = {};
                            }
                            newItem.fieldProps.showSearch = true;
                            newItem.fieldProps.onSearch = (val) => {
                                // todo: 防抖处理 竞态处理
                                const p = newOnSearch(aRequest, getValue, val);
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
                            if (newItem.initHasDone && newItem.fieldProps) {
                                newItem.fieldProps.options = optionsMapRef.current?.[newItem.dataIndex];
                                return newItem;
                            }
                            // 暂时给它设置 options，避免控制台报错
                            let fn = otherObj.onInit.toString();
                            fn = fn.replace(/\s*(async)?\s*onInit/, 'async function');
                            const funstr = `
                                const fn = ${fn};
                                return fn();
                            `.trim();
                            const newOnInit = new Function('request', 'getValue', funstr);
                            const p = newOnInit(aRequest, getValue);
                            if (p instanceof Promise) {
                                newItem.initHasDone = true;
                                p.then((res) => {
                                    if (Array.isArray(res)) {
                                        setMap((optionsMap) => ({
                                            ...optionsMap,
                                            [newItem.dataIndex]: res,
                                        }));
                                    }
                                }).catch(() => {
                                    newItem.initHasDone = false;
                                });
                            }
                        }
                        // 处理 onChange
                        if (typeof otherObj.onChange === 'function') {
                            let fn = otherObj.onChange.toString();
                            fn = fn.replace(/\s*(async)?\s*onChange/, 'function');
                            const funstr = `
                                const fn = ${fn};
                                return fn(val);
                            `.trim();
                            const newOnChange = new Function('request', 'getValue', 'setValue', 'val', funstr);
                            if (!newItem.fieldProps) {
                                newItem.fieldProps = {};
                            }
                            newItem.fieldProps.onChange = (val) => {
                                newOnChange(aRequest, getValue, setValue, val);
                            }
                        }
                    }
                    Object.assign(newItem, otherObj);
                } catch (error) {
                    console.error('请检查 JSON 配置是否有误，借助于 JSON 格式化查看工具更有效', item, error)
                }
                delete newItem.onSearch;
                delete newItem.onInit;
                delete newItem.onChange;
                return newItem;
            })
            .map(item => {
                // 处理 render，如果有 render 则忽略
                if (item.render) {
                    return item;
                }

                const newItem = { ...item };
                
                // precision
                if (typeof newItem.precision === 'number') {
                    newItem.render = (text) => precision(text, newItem.precision, newItem.ignoreZero);
                }
                // percentage
                if (newItem.percentage) {
                    const precisionCount = typeof newItem.precision === 'number' ? newItem.precision : 2;
                    newItem.render = (text) => percentage(text, precisionCount);
                }
                return newItem;
            });

        
        const renderActions = () => {
            if (!props.actions?.length || props.hiddenActions) {
                return;
            }
            const config = getAll();
            const dispatch = (method) => cols[method]({
                title: getLocaleMessage(props.locale, '操作'),
                valueType: 'option',
                key: 'option',
                width: props.actionsWidth || 100,
                fixed: props.actionsPostion || 'right',
                render: (text, record, _, tableRef) => (
                    props.actions.map((item, index) => (
                        !parseHideExpression4Action(item.hidden, record, config) && (
                            <a
                                key={item.actionName}
                                onClick={() => {
                                    if (typeof props.actionsHandler?.[index] === 'function') {
                                        props.actionsHandler[index](
                                            record, 
                                            {
                                                ...tableRef,
                                                ...moreAction,
                                            },
                                            selectedRowsRef.current,
                                        );
                                    } else {
                                        console.warn(`action ${index} is not function`);
                                    }
                                }}
                                style={item.style}
                            >{item.actionName}</a>
                        )
                    ))
                )
            });
            // 再次更新
            if (cols.find(item => item.valueType === 'option')) {
                if (props.actionsPostion === 'left') {
                    cols.shift();
                } else {
                    cols.pop();
                }
            }
            if (props.actionsPostion === 'left') {
                dispatch('unshift');
            } else {
                dispatch('push');
            }
        }

        // 渲染 actions 区域，即添加表格右（或左）侧的操作按钮
        renderActions();

        // 解析 hideActions 表达式，隐藏操作列
        const hideActions = parseHideExpression4Column(props.hideActions, getAll());
        if (hideActions) {
            cols = cols.filter(item => item.valueType !== 'option');
        }
        // 返回最后的列配置
        return cols;
    }

    const reqThen = useCallback(async res => {
        
        let cols;

        if (res?.data?.length) {
            // 保存 dataSource
            dataSourceRef.current = res.data;
            // 智能宽度
            const autoWidth = (col) => {
                if (col.width) {
                    return col;
                }

                if (col.valueType === 'option') {
                    return col;
                }

                const key = col.dataIndex;
                const textList = res.data.map(item => item[key]);
                const textWidthList = textList.map(item => getTextWidth(item));
                // 取表头宽度
                const titleWidth = getTextWidth(col.title);
                // 取最大宽度
                const avgWidth = textWidthList.reduce((pre, cur) => Math.max(pre, cur));
                // or 取第一个？
                // const avgWidth = ~~textWidthList[0];
               
                return {
                    ...col,
                    width: Math.max(avgWidth, titleWidth || 0) + 20,
                }
            };
            // nothing todo
            const noop = item => item;
            // map
            cols = prettyCols.current
                .map(props.widthDefault ? noop : autoWidth);
            
            // 表格 data 打平 & 合并
            if (!props.notFlatten) {
                res.data = res.data.map(flattenObjectAndMerge)
            }

            // 是否默认全选
            if (props.rowAllChecked === true) {
                const keys = res.data.map(item => item[props.rowKey]);
                setSelRowKeys(keys)
                selectedRowsRef.current = res.data;
            }
        } else {
            cols = getColumn();
        }

        if (cols) {
            tableVisible.current = true;
            prettyCols.current = cols;
            forceUpdate(state => state + 1);
        }

        return res;
    }, [props])

    const hasEnterBackground = useRef(false);
    // onMount
    useEffect(() => {
        // 初始化 columns
        reqThen();
        
        // 订阅 valueChange 事件
        const event = getEvent();
        const handleValueChange = () => {
            prettyCols.current = getColumn(1);
            forceUpdate(state => state + 1);
        }
        event.on('valueChange', handleValueChange);

        // 订阅 visibilityStateChange 事件
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && hasEnterBackground.current && !props.manualRequest && props.forbitReload !== true) {
                actionRef.current.reload();
            }
            if (!hasEnterBackground.current) {
                hasEnterBackground.current = true;
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            event.off('valueChange', handleValueChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, []);


    // // 渲染后重新排版
    // useEffect(() => {
    //     if (tableVisible.current === true) {
    //         setTimeout(() => {
    //             const toolBarEl = document.querySelector('.ant-pro-table-list-toolbar');
    //             const innerHeight = window.innerHeight;
    //             if (toolBarEl) {
    //                 const topHeight = toolBarEl.getBoundingClientRect().bottom;
    //                 const bottomHeight = 80;
    //                 const tableHeight = innerHeight - topHeight - bottomHeight;
    //                 const tableEl = document.querySelector('.ant-pro-table .ant-table-content');
    //                 tableEl.style = `max-height: ${tableHeight}px; overflow: auto;`;
    //             }
    //         }, 10);
    //     }
    // }, [tableVisible.current]);

    let request = useMemo(() => props.request 
        ? getParsedRequest(
            props.request, 
            reqThen,
            (error) => {
                message.error(error.response.data);
            },
            moreAction?.getInlineValue,
            moreAction?.setInlineValue,
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
        ), [props, reqThen, moreAction]);

    // 在没有 columns 的时候得清空 request
    if (!props.columns) {
        request = null;
    }

    // nav区域的按钮组
    const tools = useMemo(() => (
        props.navs?.map((item, index) => (
            !parseHideExpression4Area(item.hidden, getAll()) && (
                <Button 
                    key={item.navName}
                    onClick={() => {
                        if (typeof props.navsHandler?.[index] === 'function') {
                            props.navsHandler[index](
                                getValidParams(formRef.current?.getFieldsValue()),
                                { 
                                    ...actionRef.current,
                                    ...moreAction,
                                }, 
                                selectedRowsRef.current
                            );
                        } else {
                            console.warn(`nav ${index} is not function`);
                        }
                    }}
                    type={item.type || 'primary'}
                >{item.navName}</Button>
            )
        ))
    ), [props.navs, props.navsHandler, code, moreAction]);

    // 搜索表单区域的按钮组
    const getSearchOptions = useCallback(() => {
        return Array.isArray(props.searchOptions) ? props.searchOptions.map((item, index) => (
            !parseHideExpression4Area(item.hidden, getAll()) && (
                <Button
                    key={item.name}
                    onClick={() => {
                        if (typeof props.searchOptionsHandler?.[index] === 'function') {
                            props.searchOptionsHandler[index](
                                formRef.current.getFieldsValue(), 
                                {
                                    ...actionRef.current,
                                    ...moreAction,
                                }, 
                                selectedRowsRef.current
                            );
                        } else {
                            console.warn(`searchOptions ${index} is not function`);
                        }
                    }}
                    type={item.type || 'default'}
                >{item.name}</Button>
            )
        )) : []
    }, [props.searchOptions, props.searchOptionsHandler, moreAction]);

    // 行展开内容
    const expandedRowRender = props.expandable ? (record) => {

        const expandableConfig = props.expandable;
        const $updateKey = record.$updateKey || 'id';


        let tableColumn = Array.isArray(expandableConfig.tableColumn) ? expandableConfig.tableColumn : [];
        tableColumn = tableColumn.map(item => {
            if (typeof item.precision === 'number') {
                item.render = (text) => isNaN(text) ? text : precision(text, item.precision, item.ignoreZero);
            }
            return item;
        })

        if (expandableConfig.sourceDataType === 'request') {
            const requestFn = getParsedRequest(expandableConfig.request,
                undefined,
                undefined,
                moreAction?.getInlineValue,
                moreAction?.setInlineValue
            );
            return (
                <ProTable
                    key={$updateKey}
                    headerTitle={false}
                    search={false}
                    options={false}
                    pagination={false}
                    request={() => requestFn(record)}
                    columns={tableColumn}
                    rowKey={expandableConfig.subRowKey}
                    scroll={{
                        x: 'max-content',
                    }}
                />
            )
        } else if (expandableConfig.sourceDataType === 'record') {
            const dataSource = Array.isArray(record[expandableConfig.fieldName]) ? record[expandableConfig.fieldName] : [];
            if (tableColumn.length) {
                return (
                    <ProTable
                        key={$updateKey} 
                        headerTitle={false}
                        search={false}
                        options={false}
                        pagination={false}
                        columns={tableColumn}
                        dataSource={dataSource}
                        rowKey={expandableConfig.subRowKey}
                        scroll={{
                            x: 'max-content',
                        }}
                    />
                );
            } else {
                if (dataSource[0]) {
                    return (
                        <ProTable
                            key={$updateKey}
                            headerTitle={false}
                            search={false}
                            options={false}
                            pagination={false}
                            columns={Object.keys(dataSource[0]).map(key => ({ title: key, dataIndex: key}))}
                            dataSource={dataSource}
                            rowKey={expandableConfig.subRowKey}
                            scroll={{
                                x: 'max-content',
                            }}
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
                    action = new Function('options', 'request', 'getValue', 'tableRef', `return (${actionStr})(options, tableRef)`);
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
                selectedRowKeys: selRowKeys, // 使用 state 中的 selectedRowKeys
                onChange: handleRowSelectChange, // 更新选中行的 keys
                getCheckboxProps(record) {
                    return {
                        disabled: getSelectionDisabled(props.rowSelectionDisabled, record, getAll()),
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
                        {rowSelectionConfig.map(expanderItem => <a key={expanderItem.name} onClick={() => {
                            expanderItem.action(options, aRequest, getValue, actionRef.current)?.then((res) => {
                                if (res) {
                                    actionRef.current.reload();
                                    actionRef.current.clearSelected();
                                }
                            })
                        }}>{expanderItem.name}</a>)}
                    </Space>
                );
            },
        }
    }

    // if (!tableVisible.current) {
    //     debugger
    //     return <div>loading...</div>;
    // }

    if (props.disabled) {
        request = null;
    }

    const polling = getPolling(props.polling, getAll());

    
    const pureProps = omit(props, ['request', 'columns', 'actions', 'actionsHandler', 'navs', 'navsHandler', 'searchOptions', 'searchOptionsHandler', 'rowSelectionConfig', 'rowSelectionDisabled', 'polling', 'labelWidth', 'defaultCollapsed', 'actionsWidth', 'actionsPostion', 'notFlatten', 'disabled', 'manualRequest', 'widthDefault']);
    const config = getAll();
    const pureColumns = prettyCols.current
        // 过滤掉隐藏的
        .filter((item) => {
            const res = !parseHideExpression4Column(item.hidden, config)
            return res;
        }).map(item => omit(item, ['otherConfig', 'useOtherConfig', 'hidden', 'precision', 'percentage', 'ignoreZero']));  

    const x = pureColumns.reduce((pre, cur) => {
        if (cur.width) {
            return pre + cur.width;
        }
        return pre + 100;
    }, 0);

    
    // useEffect(() => {
    //     if (props.searchAction2 === true) {
    //         const btnList = document.querySelector(`.${SERACH_ACTION_CLASS}`).lastChild.lastChild.lastChild;
    //         if (btnList) {
    //             btnList.className = '';
    //             const collBtn = document.querySelector(`.${SERACH_ACTION_CLASS} .ant-pro-query-filter-collapse-button`)
    //             collBtn?.parentElement?.removeChild(collBtn);
    //         }
    //         document.querySelector(`.${SERACH_ACTION_CLASS}`).lastChild.appendChild(btnList);
    //     }
    // }, [props.searchAction2])

    const searchCount = pureColumns.filter(item => item.hideInSearch !== true && item.valueType !== 'option').length;
    const [y, setY] = useState('calc(50vh)');
    const containerRef = useRef();
    
    const rerenderScorll = useCallback(() => {
        const getOpHeight = () => {
            // toolbar
            const tool = document.querySelector('.ant-pro-table-list-toolbar'); 
            const toolHeight = tool?.getBoundingClientRect().height ?? 0;
            // search
            const search = document.querySelector('.ant-pro-table-search-query-filter');
            const searchHeight = search?.getBoundingClientRect().height ?? 0;
            const marginBottom = search ? parseInt(getComputedStyle(search).marginBottom, 10) || 0 : 0;
            // pagation
            const pagination = document.querySelector('.ant-table-pagination');
            const paginationHeight = pagination?.getBoundingClientRect().height ?? 0;
            const marginBottom2 = pagination ? parseInt(getComputedStyle(pagination).marginBottom, 10) || 0 : 0;

            // table header
            const tableHeader = document.querySelector('.ant-table-header');
            const tableHeaderHeight = tableHeader?.getBoundingClientRect().height ?? 0;

            return toolHeight + searchHeight + marginBottom + paginationHeight + marginBottom2 + tableHeaderHeight + 18;
        }
        setTimeout(() => {
            const envConfig = getEnvConfig();
            const pageHeight = window.innerHeight;
            const header = document.querySelector('.ant-layout-header')
            const headerHeight = envConfig.headerHeight ?? header?.getBoundingClientRect().height ?? 0;
            const extraHeight = envConfig.extraHeight ?? 0;

            const opHeight = getOpHeight();
            setY(pageHeight - extraHeight - headerHeight - opHeight);
        }, 4);
    }, []);

    const hasRerenderScorll = useRef(false);
    const onLoadingChange = useCallback((loading) => {
        if (loading === false && !hasRerenderScorll.current) {
            hasRerenderScorll.current = true;
            rerenderScorll();
        }
    }, [rerenderScorll])

    return (
        <div style={{flex: 1}} ref={containerRef}>
            <ProTable
                formRef={formRef}
                actionRef={actionRef}
                onLoadingChange={onLoadingChange}
                rowKey={'id'}
                search={{
                    labelWidth: props.labelWidth || 'auto',
                    // defaultCollapsed: props.defaultCollapsed || false,
                    defaultCollapsed: false,
                    collapseRender: () => null,
                    // span: props.span || 6,
                    optionRender: (searchConfig, formProps, dom) => (
                        [
                            ...getSearchOptions(searchConfig, formProps),
                            ...(props.hideSearchAndReset ? [] : dom),
                        ]
                    ),
                    className: `${SERACH_ACTION_CLASS} ${props.searchAction2 === true ? SERACH_ACTION_CLASS2 : ''} ${searchCount < 4 ? 'search-action-direction-row' : ''}`,
                }}
                toolBarRender={() => tools}
                scroll={{
                    // x: 'max-content',
                    // 解决 ellipsis 不生效问题
                    x,
                    y,
                }}
                pagination={{
                    defaultPageSize: props.defaultPageSize || 20,
                    showSizeChanger: true
                }}
                {...pureProps}
                columns={pureColumns}
                expandable={{expandedRowRender}}
                {...rowSelectionProps}
                dataSource={dataSource?.length ? dataSource : undefined}
                request={request}
                polling={polling}
                onSubmit={onSubmit}
            />
        </div>
    );
};

export default ProTableWidget;
