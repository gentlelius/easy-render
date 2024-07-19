/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useMemo, useState } from 'react';
import { validateAll } from './validator';
import { useSet } from './hooks';
import { set, sortedUniqBy } from 'lodash-es';
import { processData, transformDataWithBind2 } from './processData';
import { generateDataSkeleton, flattenSchema, clone, schemaContainsExpression, parseAllExpression, trimObjectString } from './utils';

const useForm = (props) => {
    const {
        formData: _formData,
        onChange: _onChange,
        onValidate: _onValidate,
        showValidate: _showValidate,
        /** 数据分析接口，表单展示完成渲染时触发 */
        logOnMount: _logOnMount,
        /** 数据分析接口，表单提交成功时触发，获得本次表单填写的总时长 */
        logOnSubmit: _logOnSubmit,
    } = props || {};

    const logOnMount = _logOnMount || (window.FR_LOGGER?.logOnMount);
    const logOnSubmit = _logOnSubmit || (window.FR_LOGGER?.logOnSubmit);

    const [renderCount, forceRender] = useState(0);

    // 设置一个状态，可直接设置，其余的状态会自动merge
    const [state, setState] = useSet({
        formData: {},
        submitData: {},
        errorFields: [],
        outErrorFields: [],
        isValidating: false, // 是否在提交状态
        outsideValidating: false, // 是否开始外部校验，没有外部校验回传的场景，一直是false
        isSubmitting: false,
        isEditing: false, // 是否在编辑状态。主要用于优化体验，用户编辑时减少不必要的运算
        allTouched: false, // 是否所有表单元素都被碰过了（一键开关，用于提交的时候，默认所有都被touch了）
        touchedKeys: [], // 碰过的key（用于submit之前，判断哪些被碰过了）
        flatten: {}, // schema 的转换结构，便于处理
        finalFlatten: {}, // 表达式等被处理过的flatten，用于渲染
        firstMount: true,
    });

    const schemaRef = useRef();
    const beforeFinishRef = useRef();
    const localeRef = useRef('zh-CN');
    const removeHiddenDataRef = useRef();
    const validateMessagesRef = useRef();
    const _data = useRef({}); // 用ref是为了破除闭包的影响
    const _flatten = useRef({}); // 用ref是为了破除闭包的影响
    const _finalFlatten = useRef({}); // 用ref是为了破除闭包的影响
    const _touchedKeys = useRef([]); // 用ref是为了破除闭包的影响
    const _errorFields = useRef();
    const _outErrorFields = useRef();
    const _allErrors = useRef([]); // 内部和外部的错误的合并

    const {
        formData: innerData,
        submitData,
        errorFields = [],
        outErrorFields = [], // 用户人为输入的errors，可以是直接调用 setErrorField/removeErrorField 方法，或者使用 beforeFinish 钩子
        isValidating,
        outsideValidating,
        isSubmitting,
        isEditing,
        allTouched,
        touchedKeys,
        flatten,
        finalFlatten,
        firstMount,
        // statusTree, // 和formData一个结构，但是每个元素是 { $touched } 存放那些在schema里无需表达的状态, 看看是否只有touched。目前statusTree没有被使用
    } = state;

    _errorFields.current = errorFields;
    _outErrorFields.current = outErrorFields;
    _touchedKeys.current = touchedKeys;
    _flatten.current = flatten;
    _finalFlatten.current = finalFlatten;

    // eslint-disable-next-line no-prototype-builtins
    const dataFromOutside = props?.hasOwnProperty('formData');
    const formData = dataFromOutside ? _formData : innerData;
    // 生成一个基础结构，确保对象内的必填元素也被校验
    _data.current = useMemo(() => {
        if (schemaRef.current) {
            return generateDataSkeleton(schemaRef.current, formData);
        }
        return {};
    }, [JSON.stringify(formData), JSON.stringify(schemaRef.current)]);

    _allErrors.current = useMemo(() => {
        if (
            Array.isArray(_errorFields.current) &&
            Array.isArray(_outErrorFields.current) &&
            _outErrorFields.current.length > 0
        ) {
            const mergeErrors = [..._errorFields.current, ..._outErrorFields.current];
            return sortedUniqBy(mergeErrors, (item) => item.name);
        } 
        return _errorFields.current;
        
    }, [JSON.stringify(_errorFields.current), JSON.stringify(_outErrorFields.current)]);

    /**
     * 只执行一次，在第一次渲染表单的时候执行
     */
    useEffect(() => {
        if (schemaRef.current && firstMount) {
            const flatten = flattenSchema(schemaRef.current);
            setState({ flatten, firstMount: false });
        }
    }, [JSON.stringify(schemaRef.current), firstMount]);

    // 统一的处理expression
    useEffect(() => {
        if (firstMount) {
            return;
        }
        const newFlatten = clone(_flatten.current);
        Object.entries(_flatten.current).forEach(([path, info]) => {
            if (schemaContainsExpression(info.schema)) {
                const arrayLikeIndex = path.indexOf(']');
                const isArrayItem = arrayLikeIndex > -1 && arrayLikeIndex < path.length - 1;
                const hasRootValue = JSON.stringify(info.schema).indexOf('rootValue') > -1;
                if (isArrayItem && hasRootValue) {
                    // do nothing
                } else {
                    newFlatten[path].schema = parseAllExpression(info.schema, _data.current, path);
                }
            }
        });
        setState({ finalFlatten: newFlatten });
    }, [JSON.stringify(_flatten.current), JSON.stringify(_data.current), firstMount]);

    const _setData = (data) => {
        if (typeof _onChange === 'function') {
            _onChange(data);
        } else {
            setState({ formData: data });
        }
    };

    // Allow function to get the old value
    const _setErrors = (errors) => {
        if (typeof _onValidate === 'function') {
            const oldFormatErrors = errors ? errors.map((item) => item.name) : [];
            _onValidate(oldFormatErrors);
        }
        if (typeof errors === 'function') {
            setState(({ errorFields }) => ({ errorFields: errors(errorFields) }));
        } else {
            setState({ errorFields: errors });
        }
    };

    const setFirstMount = (value) => {
        setState({ firstMount: value });
    };

    const touchKey = (key) => {
        if (_touchedKeys.current.indexOf(key) > -1) {
            return;
        }
        const newKeyList = [..._touchedKeys.current, key];
        setState({ touchedKeys: newKeyList });
    };

    const removeTouched = (key) => {
        const newTouch = _touchedKeys.current.filter((item) => item.indexOf(key) === -1);
        setState({ touchedKeys: newTouch });
    };

    const changeTouchedKeys = (newTouchedKeys) => {
        setState({ touchedKeys: newTouchedKeys });
    };

    const setEditing = (isEditing) => {
        setState({ isEditing });
    };

    const onItemChange = (path, value) => {
        if (typeof path !== 'string') return;
        if (path === '#') {
            _setData({ ...value });
            return;
        }
        // 先设置 _data.current[path] = value;
        set(_data.current, path, value);
        // 再更新试图（当有 props.onChange 时，会调用 props.onChange ）
        _setData({ ..._data.current });
    };

    // errorFields: [
    //   { name: 'a.b.c', errors: ['Please input your Password!', 'something else is wrong'] },
    // ]
    /**
     * 这个函数做的事情就是赋值
     * 做的事情单一，但副作用很多
     * 会引发useForm重新执行
     */
    const syncStuff = ({ schema, locale, validateMessages, beforeFinish, removeHiddenData }) => {
        schemaRef.current = schema;
        localeRef.current = locale;
        validateMessagesRef.current = validateMessages;
        beforeFinishRef.current = beforeFinish;
        removeHiddenDataRef.current = removeHiddenData;
        forceRender(renderCount + 1);
    };

    const setSchema = (settings) => {
        const newFlatten = clone(_flatten.current);
        try {
            Object.keys(settings).forEach((path) => {
                if (!_flatten.current[path]) {
                    console.error(`path：'${path}' 不存在(form.setSchemaByPath)`);
                } else {
                    const newSchema = settings[path];
                    const _newSchema = typeof newSchema === 'function' ? newSchema(newFlatten[path].schema) : newSchema;
                    newFlatten[path].schema = {
                        ...newFlatten[path].schema,
                        ..._newSchema,
                    };
                }
            });
            setState({ flatten: newFlatten });
            _flatten.current = newFlatten;
        } catch (error) {
            console.error(error, 'setSchema');
        }
    };

    const setSchemaByPath = (path, newSchema) => {
        if (!_flatten.current[path]) {
            console.error(`path：'${path}' 不存在(form.setSchemaByPath)`);
            return;
        }
        const newFlatten = clone(_flatten.current);

        try {
            const _newSchema = typeof newSchema === 'function' ? newSchema(newFlatten[path].schema) : newSchema;
            newFlatten[path].schema = { ...newFlatten[path].schema, ..._newSchema };
            setState({ flatten: newFlatten });
            _flatten.current = newFlatten;
        } catch (error) {
            console.error(error, 'setSchemaByPath');
        }
    };

    const getSchemaByPath = (path) => {
        try {
            return _flatten.current[path].schema;
        } catch (error) {
            console.log(error, 'getSchemaByPath');
            return {};
        }
    };

    // TODO: better implementation needed
    const setErrorFields = (error) => {
        let newErrorFields = [];
        if (Array.isArray(error)) {
            newErrorFields = [...error, ..._outErrorFields.current];
        } else if (error?.name) {
            newErrorFields = [error, ..._outErrorFields.current];
        } else {
            console.log('error format is wrong');
        }
        newErrorFields = sortedUniqBy(newErrorFields, (item) => item.name);
        setState({ outErrorFields: newErrorFields });
    };

    const removeErrorField = (path) => {
        const newError = _errorFields.current.filter((item) => item.name.indexOf(path) === -1);

        const newOutError = _outErrorFields.current.filter((item) => item.name.indexOf(path) === -1);
        setState({ errorFields: newError, outErrorFields: newOutError });
    };

    const getValues = () => processData(_data.current, _finalFlatten.current, removeHiddenDataRef.current);

    const setValues = (newFormData) => {
        const newData = transformDataWithBind2(newFormData, _flatten.current);
        _setData(newData);
    };

    const submit = () => {
        setState({ isValidating: true, allTouched: true, isSubmitting: false });
        //  https://formik.org/docs/guides/form-submission
        return validateAll({
            formData: _data.current,
            flatten: _finalFlatten.current,
            options: {
                locale: localeRef.current,
                validateMessages: validateMessagesRef.current,
            },
        }).then((errors) => {
            setState({ errorFields: errors });

            const _errors = sortedUniqBy([...(errors || []), ..._outErrorFields.current], (item) => item.name);

            if (typeof beforeFinishRef.current === 'function') {
                return Promise.resolve(
                    processData(_data.current, _finalFlatten.current, removeHiddenDataRef.current)
                ).then((res) => {
                    setState({
                        isValidating: true,
                        isSubmitting: false,
                        outsideValidating: true,
                        submitData: res,
                    });
                    return { data: res, errors: _errors };
                });
            }

            return Promise.resolve(
                processData(_data.current, _finalFlatten.current, removeHiddenDataRef.current)
            ).then((res) => {
                setState({
                    isValidating: false,
                    isSubmitting: true,
                    submitData: res,
                });
                return { data: res, errors: _errors };
            });
        }).catch((err) => {
            console.log('submit error:', err);
            return err;
        });
    };

    const resetFields = (options) => {
        setState({
            formData: options?.formData || {},
            submitData: options?.submitData || {},
            errorFields: options?.errorFields || [],
            touchedKeys: options?.touchedKeys || [],
            allTouched: options?.allTouched || false,
        });
    };

    const endValidating = () =>
        setState({
            isValidating: false,
            outsideValidating: false,
            isSubmitting: true,
        });

    const endSubmitting = () =>
        setState({
            isSubmitting: false,
            isValidating: false,
            outsideValidating: false,
        });

    const form = {
        // state
        formData: _data.current,
        schema: schemaRef.current,
        flatten: finalFlatten,
        touchedKeys: _touchedKeys.current,
        allTouched,
        // methods
        touchKey,
        removeTouched,
        changeTouchedKeys,
        onItemChange,
        setValueByPath: onItemChange, // 单个
        getSchemaByPath,
        setSchemaByPath,
        setSchema,
        setValues,
        getValues,
        resetFields,
        submit,
        init: submit, // 简版的迁移方案里用，正常用不到，换个名字迁移的时候大家更好接受点
        submitData,
        errorFields: _allErrors.current,
        isValidating,
        outsideValidating,
        isSubmitting,
        endValidating,
        endSubmitting,
        setErrorFields,
        removeErrorField,
        isEditing,
        setEditing,
        syncStuff,
        showValidate: _showValidate,
        firstMount,
        setFirstMount,
        // logs
        logOnMount,
        logOnSubmit,
        // inner api, DON'T USE
        _setErrors,
    };

    return form;
};

export default useForm;
