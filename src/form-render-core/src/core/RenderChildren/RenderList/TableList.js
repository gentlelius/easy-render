import React from 'react';
import Core from '../../index';
import { Button, Table, Popconfirm } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const FIELD_LENGTH = 170;

const TableList = ({
    displayList = [],
    dataIndex,
    children,
    deleteItem,
    copyItem,
    addItem,
    moveItemUp,
    moveItemDown,
    flatten,
    schema,
    listData,
    changeList,
}) => {
    const { props = {}, itemProps = {} } = schema;
    const { buttons, ...columnProps } = itemProps;
    const { pagination = {}, ...rest } = props;

    const paginationConfig = pagination && {
        size: 'small',
        hideOnSinglePage: true,
        ...pagination,
    };

    const dataSource = displayList.map((item, idx) => ({ index: idx }));
    const colWidth = props.colWidth || {};
    const columns = children.map((child) => {
        const item = flatten[child];
        const schema = (item?.schema) || {};
        const keyList = child.split('.');
        return {
            dataIndex: child,
            title: schema.required ? (
                <>
                    <span className="fr-label-required"> *</span>
                    <span>{schema.title}</span>
                </>
            ) : (
                schema.title
            ),
            width: colWidth[keyList[keyList.length - 1]] || FIELD_LENGTH,
            render: (value, record, index) => {
                const childIndex = [...dataIndex, record.index];
                return (
                    <Core
                        hideTitle={true}
                        displayType="inline"
                        key={index.toString()}
                        id={child}
                        dataIndex={childIndex}
                    />
                );
            },
            ...columnProps,
        };
    });

    if (!props.hideDelete || !props.hideAdd || !props.hideCopy || !props.hideMove) {
        columns.push({
            title: '操作',
            key: '$action',
            fixed: 'right',
            width: 120,
            render: (value, record) => {
                const idx = record.index;
                return (
                    <div>
                        {!props.hideAdd && !props.hideCopy && <a onClick={() => copyItem(idx)}>复制</a>}
                        {!props.hideDelete && (
                            <Popconfirm
                                title="确定删除?"
                                onConfirm={() => deleteItem(idx)}
                                okText="确定"
                                cancelText="取消"
                            >
                                <a style={{ marginLeft: 8 }}>删除</a>
                            </Popconfirm>
                        )}
                        {
                            props.moreBtns?.length && props.moreBtns.map(item => <a onClick={() => {
                                if (typeof item.action === 'function') {
                                    item.action(record);
                                }
                            }} style={{ marginLeft: 8 }}>{item.name}</a>)
                        }
                        {!props.hideMove && (
                            <>
                                <ArrowUpOutlined
                                    style={{ color: '#1890ff', fontSize: 16, marginLeft: 8 }}
                                    onClick={() => moveItemUp(idx)}
                                />
                                <ArrowDownOutlined
                                    style={{ color: '#1890ff', fontSize: 16, marginLeft: 8 }}
                                    onClick={() => moveItemDown(idx)}
                                />
                            </>
                        )}
                    </div>
                );
            },
        });
    }

    return (
        <>
            <div className="w-100 mb2 tr">
                {!props.hideAdd && (
                    <Button type="primary" size="small" onClick={addItem}>
                        新增
                    </Button>
                )}
                {Array.isArray(props.buttons)
                    ? props.buttons.map((item, idx) => {
                        const { callback, text, html } = item;
                        let onClick = () => {
                            console.log({
                                value: listData,
                                onChange: changeList,
                                schema,
                            });
                        };
                        if (typeof window[callback] === 'function') {
                            onClick = () => {
                                window[callback]({
                                    value: listData,
                                    onChange: changeList,
                                    schema,
                                });
                            };
                        }
                        return (
                            <Button key={idx.toString()} style={{ marginLeft: 8 }} size="small" onClick={onClick}>
                                <span dangerouslySetInnerHTML={{ __html: html || text }} />
                            </Button>
                        );
                    })
                    : null}
            </div>
            <Table
                scroll={{ x: 'max-content' }}
                columns={columns}
                dataSource={dataSource}
                rowKey="index"
                size="small"
                pagination={paginationConfig}
                {...rest}
            />
        </>
    );
};

export default TableList;
