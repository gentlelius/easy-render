/* eslint-disable complexity */
import React, { Suspense, useEffect, useRef } from 'react';
import { getWidgetName, extraSchemaList } from '../../mapping';
import { transformProps } from '../../createWidget';

import { isObjType, isListType, isObject } from '../../utils';
import { omit } from 'lodash-es';

const ErrorSchema = (schema) => (
    <div>
        <div style={{ color: 'red' }}>schema未匹配到展示组件：</div>
        <div>{JSON.stringify(schema)}</div>
    </div>
);

const WithExtraPropAddedWidget = (props) => {
    const { Widget, ...rest } = props;
    const hasSetDefaultValue = useRef(false);

    useEffect(() => {
        const { schema } = props;
        if (schema?.props && hasSetDefaultValue.current === false) {
            const { defaultValue } = schema.props;
            if (defaultValue !== undefined && defaultValue !== null) {
                hasSetDefaultValue.current = true;
                props.onChange(defaultValue, true);
            }
        }
    }, [props])

    return <Widget {...rest} />;
}

const ExtendedWidget = ({
    schema,
    onChange,
    value,
    dependValues,
    children,
    onItemChange,
    formData,
    getValue,
    readOnly,
    dataPath,
    disabled,
    dataIndex,
    watch,
    actionsHandler,
    navsHandler,
    searchOptionsHandler,
    tools,
    store
}) => {
    const {
        widgets,
        mapping,
        setValueByPath,
        getSchemaByPath,
        setSchemaByPath,
        setSchema,
        setValues,
        getValues,
        resetFields,
        setErrorFields,
        removeErrorField,
    } = tools;

    const { globalProps } = store;

    let widgetName = getWidgetName(schema, mapping);
    const customName = schema.widget || schema['ui:widget'];
    if (customName && widgets[customName]) {
        widgetName = customName;
    }
    const readOnlyName = schema.readOnlyWidget || 'html';
    if (readOnly && !isObjType(schema) && !isListType(schema)) {
        widgetName = readOnlyName;
    }
    if (!widgetName) {
        widgetName = 'input';
        return <ErrorSchema schema={schema} />;
    }
    const Widget = widgets[widgetName];
    
    const extraSchema = extraSchemaList[widgetName];

    let widgetProps = {
        schema: { ...schema, ...extraSchema },
        onChange,
        value,
        children,
        disabled,
        readOnly,
        ...schema.props,
        ...globalProps,
        actionsHandler,
        navsHandler,
        searchOptionsHandler,
    };

    if (schema.type === 'string' && typeof schema.max === 'number') {
        widgetProps.maxLength = schema.max;
    }

    ['title', 'placeholder', 'disabled', 'format'].forEach((key) => {
        if (schema[key]) {
            widgetProps[key] = schema[key];
        }
    });

    if (schema.props) {
        widgetProps = { ...widgetProps, ...schema.props };
    }

    Object.keys(schema).forEach((key) => {
        if (typeof key === 'string' && key.toLowerCase().indexOf('props') > -1 && key.length > 5) {
            widgetProps[key] = schema[key];
        }
    });

    // 支持 addonAfter 为自定义组件的情况
    if (isObject(widgetProps.addonAfter) && widgetProps.addonAfter.widget) {
        const AddonAfterWidget = widgets[widgetProps.addonAfter.widget];
        widgetProps.addonAfter = <AddonAfterWidget {...schema} />;
    }

    const hideSelf = (hidden = true) => {
        setSchemaByPath(schema.$id, { hidden });
    };

    // 避免传组件不接受的props，按情况传多余的props
    widgetProps.addons = {
        dependValues,
        onItemChange,
        getValue,
        formData,
        dataPath,
        dataIndex,
        setValueByPath,
        setValue: setValueByPath,
        getSchemaByPath,
        setSchemaByPath,
        setSchema,
        setValues,
        getValues,
        resetFields,
        setErrorFields,
        removeErrorField,
        hideSelf,
        watch,
    };

    const finalProps = transformProps(widgetProps);
    if (schema.widget !== 'proTable') {
        delete finalProps.actionsHandler;
        delete finalProps.navsHandler;
        delete finalProps.searchOptionsHandler;
    }

    return (
        <Suspense fallback={<div>render error</div>}>
            <div className="fr-item-wrapper justify-center">
                <WithExtraPropAddedWidget Widget={Widget} className="self-start" {...omit(finalProps, ['contentStyle'])}  />
            </div>
        </Suspense>
    );
};



const areEqual = (prev, current) => {
    if (prev.schema && current.schema) {
        if (prev.schema.$id === '#') {
            return false;
        }
        if (prev.schema.hidden && current.schema.hidden) {
            return true;
        }
    }
    if (prev.readOnly !== current.readOnly) {
        return false;
    }
    if (prev.disabled !== current.disabled) {
        return false;
    }
    if (JSON.stringify(prev.dependValues) !== JSON.stringify(current.dependValues)) {
        return false;
    }
    if (isObjType(prev.schema) && isObjType(current.schema)) {
        return false;
    }
    if (
        JSON.stringify(prev.value) === JSON.stringify(current.value) &&
        JSON.stringify(prev.schema) === JSON.stringify(current.schema)
    ) {
        return true;
    }
    return false;
};

export default React.memo(ExtendedWidget, areEqual);
