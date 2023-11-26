/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/prefer-for-of */
import React, { useEffect, useRef } from 'react';
import { useStore, useStore2, useTools } from '../../hooks';
import useDebouncedCallback from '../../useDebounce';
import { getValueByPath, isCheckBoxType, isObjType, isProTableType } from '../../utils';
import ErrorMessage from './ErrorMessage';
import Extra from './Extra';
import FieldTitle from './Title';
import { validateField } from '../../validator';
import ExtendedWidget from './ExtendedWidget';

const RenderField = (props) => {
    const {
        $id,
        dataIndex,
        dataPath,
        _value,
        dependValues,
        _schema,
        labelClass,
        labelStyle,
        contentClass: _contentClass,
        children,
        errorFields = [],
        hideTitle,
        hideErrorWhenNil,
        displayType,
    } = props;

    const store = useStore();
    const { formData, flatten, actionsHandler, navsHandler, searchOptionsHandler, } = store;
    const { debounceInput, readOnly, disabled, showValidate, validateMessages, locale, watch } = useStore2();
    const tools = useTools();
    const { onValuesChange, onItemChange, setEditing, touchKey, _setErrors } = tools;
    const formDataRef = useRef();
    formDataRef.current = formData;
    // console.log('<renderField>', $id);

    const errObj = errorFields.find((err) => err.name === dataPath);
    const errorMessage = errObj?.error; // 是一个list
    const hasError = Array.isArray(errorMessage) && errorMessage.length > 0;
    // 补上这个class，会自动让下面所有的展示ui变红！
    const contentClass = hasError && showValidate ? `${_contentClass  } ant-form-item-has-error` : _contentClass;

    const contentStyle = props.contentStyle;

    const debouncedSetEditing = useDebouncedCallback(setEditing, 350);

    const _readOnly = readOnly !== undefined ? readOnly : _schema.readOnly;
    const _disabled = disabled !== undefined ? disabled : _schema.disabled;

    const removeDupErrors = (arr) => {
        if (!Array.isArray(arr)) {
            console.log('in removeDups: param is not an array');
            return;
        }
        const array = [];
        for (let i = 0; i < arr.length; i++) {
            const sameNameIndex = array.findIndex((item) => item.name === arr[i].name);
            if (sameNameIndex > -1) {
                const sameNameItem = array[sameNameIndex];
                const error1 = sameNameItem.error;
                const error2 = arr[i].error;
                array[sameNameIndex] = {
                    name: sameNameItem.name,
                    error: error1.length > 0 && error2.length > 0 ? error2 : [],
                };
            } else {
                array.push(arr[i]);
            }
        }
        return array.filter((item) => Array.isArray(item.error) && item.error.length > 0);
    };

    // TODO: 优化一下，只有touch还是false的时候，setTouched
    const onChange = (value, isFirstChange) => {
        // 动过的key，算被touch了, 这里之后要考虑动的来源
        touchKey(dataPath);
        // 开始编辑，节流
        if (debounceInput) {
            setEditing(true);
            debouncedSetEditing(false);
        }
        if (typeof dataPath === 'string') {
            onItemChange(dataPath, value);
        }
        // 先不暴露给外部，这个api
        if (typeof onValuesChange === 'function') {
            onValuesChange({ [dataPath]: value }, formDataRef.current);
        }

        // TODO: 校验时机应该延迟，后面研究下提 PR
        setTimeout(() => {
            // TODO: 首次渲染会触发 onChange，不校验表单规则。这个是暂时的规则，后面看看能不能优化
            // if (isFirstChange) {
            //     return;
            // }
            validateField({
                path: dataPath,
                formData: formDataRef.current,
                flatten,
                options: {
                    locale,
                    validateMessages,
                },
            }).then((res) => {
                _setErrors((errors) => removeDupErrors([...errors, ...res]));
            });
        }, 0);
    };

    const titleProps = {
        labelClass,
        labelStyle,
        schema: _schema,
        displayType,
    };

    const messageProps = {
        message: errorMessage,
        schema: _schema,
        displayType,
        softHidden: displayType === 'inline', // 这个是如果没有校验信息时，展示与否
        hardHidden: showValidate === false || _readOnly === true, // 这个是强制的展示与否
    };

    const placeholderTitleProps = {
        className: labelClass,
        style: labelStyle,
    };

    const _showTitle = !hideTitle && typeof _schema.title === 'string';
    // TODO: 这块最好能判断上一层是list1，
    if (hideTitle && _schema.title) {
        _schema.placeholder = _schema.placeholder || _schema.title;
    }

    const _getValue = (path) => getValueByPath(formData, path);

    const widgetProps = {
        $id,
        schema: _schema,
        readOnly: _readOnly,
        disabled: _disabled,
        onChange,
        getValue: _getValue,
        formData,
        value: _value,
        dependValues,
        onItemChange,
        dataIndex,
        dataPath,
        children,
        watch,
        store,
        tools,
    };

    // if (_schema && _schema.default !== undefined) {
    //   widgetProps.value = _schema.default;
    // }

    // checkbox必须单独处理，布局太不同了
    if (isCheckBoxType(_schema, _readOnly)) {
        return (
            <>
                {_showTitle && <div {...placeholderTitleProps} />}
                <div className={contentClass} style={contentStyle}>
                    <ExtendedWidget {...widgetProps} />
                    <Extra {...widgetProps} />
                    {
                        hideErrorWhenNil && !hasError ? null : (
                            <ErrorMessage {...messageProps} />
                        )
                    }
                </div>
            </>
        );
    }
    if (isProTableType(_schema)) {
        widgetProps.actionsHandler = actionsHandler || [];
        widgetProps.navsHandler = navsHandler || [];
        widgetProps.searchOptionsHandler = searchOptionsHandler || [];
    }   

    let titleElement = <FieldTitle {...titleProps} />;

    if (isObjType(_schema)) {
        titleElement = (
            <div style={{ display: 'flex' }}>
                {titleElement}
                {
                    hideErrorWhenNil && !hasError ? null : (
                        <ErrorMessage {...messageProps} />
                    )
                }
            </div>
        );
        return (
            <div className={contentClass} style={contentStyle}>
                <ExtendedWidget {...widgetProps} message={errorMessage} title={_showTitle ? titleElement : undefined} />
                <Extra {...widgetProps} />
            </div>
        );
    }

    const isHTML = _schema.widget === 'html';

    return (
        <>
            {_showTitle && titleElement}
            <div className={`${contentClass} ${hideTitle ? 'fr-content-no-title' : ''}`} style={contentStyle}>
                <ExtendedWidget {...widgetProps} />
                <Extra {...widgetProps} />
                {
                    isHTML 
                        ? <div style={{ paddingBottom: 12}}></div> 
                        : (
                            hideErrorWhenNil && !hasError ? null : (
                                <ErrorMessage {...messageProps} />
                            )
                        )
                }
            </div>
        </>
    );
};

export default RenderField;
