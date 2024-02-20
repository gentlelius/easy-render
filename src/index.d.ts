import type * as React from 'react';
import type { RuleItem } from 'async-validator';
import type { ActionType } from '@ant-design/pro-table';
import type { ProFormInstance } from '@ant-design/pro-form';

declare class Event {
    events: object;
    constructor();
    emit(name: string, ...params: any[]): void;
    on(name: string, fn: Function): void;
    off(name: string, fn: Function): void;
    clear(name: string): void;
    clearAll(): void;
}

interface SchemaBase {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'range' | 'html';
    title: string;
    description: string;
    descType: 'text' | 'icon';
    format: 'image' | 'textarea' | 'color' | 'email' | 'url' | 'dateTime' | 'date' | 'time' | 'upload';
    default: any;
    /** 是否必填，支持 `'{{ formData.xxx === "" }}'` 形式的表达式 */
    required: boolean | string;
    placeholder: string;
    bind: false | string | string[];
    dependencies: string[];
    min: number;
    max: number;
    /** 是否禁用，支持 `'{{ formData.xxx === "" }}'` 形式的表达式 */
    disabled: boolean | string;
    /** 是否只读，支持 `'{{ formData.xxx === "" }}'` 形式的表达式 */
    readOnly: boolean | string;
    /** 是否隐藏，隐藏的字段不会在 formData 里透出，支持 `'{{ formData.xxx === "" }}'` 形式的表达式 */
    hidden: boolean | string;
    displayType: 'row' | 'column';
    width: string;
    labelWidth: number | string;
    className: string;
    widget: string;
    readOnlyWidget: string;
    extra: string;
    properties: Record<string, Schema>;
    items: Schema;
    enum: Array<string | number>;
    enumNames: Array<string | number>;
    rules: RuleItem | RuleItem[];
    props: Record<string, any>;
}

type Schema = Partial<SchemaBase>;

export interface Error {
    /** 错误的数据路径 */
    name: string;
    /** 错误的内容 */
    error: string[];
}
export interface FormParams {
    formData?: any;
    onChange?: (data: any) => void;
    onValidate?: (valid: any) => void;
    showValidate?: boolean;
    /** 数据分析接口，表单展示完成渲染时触发 */
    logOnMount?: (stats: any) => void;
    /** 数据分析接口，表单提交成功时触发，获得本次表单填写的总时长 */
    logOnSubmit?: (stats: any) => void;
}

export interface ValidateParams {
    formData: any;
    schema: Schema;
    error: Error[];
    [k: string]: any;
}

export interface ResetParams {
    formData?: any;
    submitData?: any;
    errorFields?: Error[];
    touchedKeys?: any[];
    allTouched?: boolean;
    [k: string]: any;
}

export interface FormInstance {
    formData: any;
    schema: Schema;
    flatten: any;
    touchedKeys: string[];
    touchKey: (key: string) => void;
    onItemChange: (path: string, value: any) => void;
    setValueByPath: (path: string, value: any) => void;
    getSchemaByPath: (path: string) => object;
    setSchemaByPath: (path: string, value: any) => void;
    setSchema: (settings: any) => void;
    setValues: (formData: any) => void;
    getValues: () => any;
    resetFields: (options?: ResetParams) => void;
    submit: () => Promise<{ data: any; errors: Error[] }>;
    submitData: any;
    errorFields: Error[];
    isValidating: boolean;
    outsideValidating: boolean;
    isSubmitting: boolean;
    endValidating: () => void;
    endSubmitting: () => void;
    setErrorFields: (error: Error[]) => void;
    removeErrorField: (path: string) => void;
    removeTouched: (path: string) => void;
    changeTouchedKeys: (pathArray: string[]) => void;
    isEditing: boolean;
    setEditing: (status: boolean) => void;
    syncStuff: (args: any) => void;
    /** 折中升级方案中使用到，正常用不到 */
    init: () => void;
    /** 数据分析接口，表单展示完成渲染时触发 */
    logOnMount: (args: any) => void;
    /** 数据分析接口，表单提交成功时触发，获得本次表单填写的总时长 */
    logOnSubmit: (args: any) => void;
    _setErrors: (args: any) => void;
}

export interface TableInstance {
    tableRef: React.MutableRefObject<ActionType | undefined>,
    formRef: React.MutableRefObject<ProFormInstance | undefined>,
    tableAction: ActionType,
    formAction: ProFormInstance,
    moreAction: {
        getSelectedRows: () => void,
        getDataSource: () => any[],
        setDataSource: (data: any[]) => void,
        setInlineValue: (key: string, value: any) => void,
        getInlineValue: (key: string) => any
    },
}

export type WatchProperties = {
    [path: string]:
    | {
        handler: (value: any) => void;
        immediate?: boolean;
    }
    | ((value: any) => void);
};

export interface ERProps {
    /** 表单 id */
    id?: string | number;
    /** 表单顶层的className */
    className?: string;
    /** 表单顶层的样式 */
    style?: React.CSSProperties;
    /** 表单 schema */
    schema: Schema;
    /** form单例 */
    form?: FormInstance;
    /** 组件和schema的映射规则 */
    mapping?: any;
    /** 自定义组件 */
    widgets?: any;
    /** 标签元素和输入元素的排列方式，column-分两行展示，row-同行展示，inline-自然顺排，默认`'column'` */
    displayType?: 'column' | 'row' | 'inline';
    /** 只读模式 */
    readOnly?: boolean;
    /** 禁用模式 */
    disabled?: boolean;
    /** 标签宽度 */
    labelWidth?: string | number;
    /** antd的全局config */
    configProvider?: any;
    theme?: string | number;
    /** 覆盖默认的校验信息 */
    validateMessages?: any;
    /** 显示当前表单内部状态 */
    debug?: boolean;
    /** 显示css布局提示线 */
    debugCss?: boolean;
    locale?: 'cn' | 'en';
    column?: number;
    debounceInput?: boolean;
    size?: string;
    // 数据会作为 beforeFinish 的第四个参数传入
    config?: any;
    // 类似于 vuejs 的 watch 的用法，监控值的变化，触发 callback
    watch?: WatchProperties;
    /** 对象组件是否折叠（全局的控制） */
    allCollapsed?: boolean;
    /** 表单的全局共享属性 */
    globalProps?: any;
    /** 表单首次加载钩子 */
    onMount?: () => void;
    /** 表单提交前钩子 */
    beforeFinish?: (params: ValidateParams) => Error[] | Promise<Error[]>;
    /** 表单提交后钩子 */
    onFinish?: (formData: any, error: Error[]) => void;
    /** 时时与外部更新同步的钩子 */
    onValuesChange?: (changedValues: any, formData: any) => void;
    /** 隐藏的数据是否去掉，默认不去掉（false） */
    removeHiddenData?: boolean;
    actionsHandler?: Function[],
    navsHandler?: Function[],
    searchOptionsHandler?: Function[],
    table?: TableInstance
}

declare const ER: React.FC<ERProps>;

export declare function useForm(params?: FormParams): FormInstance;
export declare function useTable(params?: FormParams): TableInstance;

export type ConnectedForm<T> = T & {
    form: FormInstance;
};

export declare function connectForm<T extends {} = any>(
    component: React.ComponentType<ConnectedForm<T>>
): React.ComponentType<T>;

export default ER;

export declare function setEnvConfig(config: object): void;
export declare function setBaseUrl(url: string): void;
export declare function setResponseInterceptor(callback: Function, errorCallback: Function): void;
export declare function getBaseUrl(url: string): string;
export declare function setValue(key: string, value: any): void;
export declare function setValueOnce(key: string, value: any): void;
export declare function getValue(key: string): any;
export declare function destroy(key: string): boolean;
export declare function clearAll(): void;
export declare function getAll(): Record<string, any>;
export declare function getEvent(): typeof Event;
