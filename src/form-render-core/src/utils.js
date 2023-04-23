/* eslint-disable indent */
/* eslint-disable complexity */
/* eslint-disable no-param-reassign */
import { get, set, cloneDeep, isEmpty, functionsIn, isString, isArray } from 'lodash-es';

export function getParamByName(name, url = window.location.href) {
    // eslint-disable-next-line no-useless-escape
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${  name  }(=([^&#]*)|&|#|$)`);
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

export function isUrl(string) {
    const protocolRE = /^(?:\w+:)?\/\/(\S+)$/;
    // const domainRE = /^[^\s\.]+\.\S{2,}$/;
    if (typeof string !== 'string') return false;
    return protocolRE.test(string);
}

export function isCheckBoxType(schema, readOnly) {
    if (readOnly) return false;
    if (schema.widget === 'checkbox') return true;
    if (schema && schema.type === 'boolean') {
        if (schema.enum) return false;
        if (schema.widget === undefined) return true;
        return false;
    }
}

export function isProTableType(schema) {
    return schema.widget === 'proTable';
}

// a[].b.c => a.b.c
function removeBrackets(string) {
    if (typeof string === 'string') {
        return string.replace(/\[\]/g, '');
    } 
    return string;
    
}

export function getParentPath(path) {
    if (typeof path === 'string') {
        const pathArr = path.split('.');
        if (pathArr.length === 1) {
            return '#';
        }
        pathArr.pop();
        return pathArr.join('.');
    }
    return '#';
}

export function getValueByPath(formData, path) {
    if (path === '#' || !path) {
        return formData || {};
    } if (typeof path === 'string') {
        return get(formData, path);
    } 
    console.error('path has to be a string');
    
}

//  path: 'a.b[1].c[0]' => { id: 'a.b[].c[]'  dataIndex: [1,0] }
export function destructDataPath(path) {
    let id;
    let dataIndex;
    if (path === '#') {
        return { id: '#', dataIndex: [] };
    }
    if (typeof path !== 'string') {
        throw Error(`path ${path} is not a string!!! Something wrong here`);
    }
    const pattern = /\[[0-9]+\]/g;
    const matchList = path.match(pattern);
    if (!matchList) {
        id = path;
    } else {
        id = path.replace(pattern, '[]');
        // 这个是match下来的结果，可安全处理
        dataIndex = matchList.map((item) => Number(item.substring(1, item.length - 1)));
    }
    return { id, dataIndex };
}

// id: 'a.b[].c[]'  dataIndex: [1,0] =>  'a.b[1].c[0]'
export function getDataPath(id, dataIndex) {
    if (id === '#') {
        return id;
    }
    if (typeof id !== 'string') {
        throw Error(`id ${id} is not a string!!! Something wrong here`);
    }
    let _id = id;
    if (Array.isArray(dataIndex)) {
        // const matches = id.match(/\[\]/g) || [];
        // const count = matches.length;
        dataIndex.forEach((item) => {
            _id = _id.replace(/\[\]/, `[${item}]`);
        });
    }
    return removeBrackets(_id);
}

export function isObjType(schema) {
    return schema && schema.type === 'object' && schema.properties && !schema.widget;
}

// TODO: to support case that item is not an object
export function isListType(schema) {
    return schema && schema.type === 'array' && isObjType(schema.items) && schema.enum === undefined;
}

function isNotFill(schema) {
    return schema && schema.notFill;
}

// TODO: more tests to make sure weird & wrong schema won't crush
export function flattenSchema(_schema = {}, name = '#', parent, result = {}) {
    const schema = clone(_schema);
    const _name = name;
    if (!schema.$id) {
        schema.$id = _name; // path as $id, for easy access to path in schema
    }
    const children = [];
    if (isObjType(schema)) {
        Object.entries(schema.properties).forEach(([key, value]) => {
            const _key = isListType(value) ? `${key  }[]` : key;
            const uniqueName = _name === '#' ? _key : `${_name  }.${  _key}`;
            children.push(uniqueName);
            flattenSchema(value, uniqueName, _name, result);
        });
        schema.properties = {};
    }
    if (isListType(schema)) {
        Object.entries(schema.items.properties).forEach(([key, value]) => {
            const _key = isListType(value) ? `${key  }[]` : key;
            const uniqueName = _name === '#' ? _key : `${_name  }.${  _key}`;
            children.push(uniqueName);
            flattenSchema(value, uniqueName, _name, result);
        });
        schema.items.properties = {};
    }

    if (schema.type) {
        result[_name] = { parent, schema, children };
    }
    return result;
}

export function getSchemaFromFlatten(flatten, path = '#') {
    let schema = {};
    const item = clone(flatten[path]);
    if (item) {
        schema = item.schema;
        // schema.$id && delete schema.$id;
        if (item.children.length > 0) {
            item.children.forEach((child) => {
                if (!flatten[child]) return;
                const key = getKeyFromPath(child);
                if (isObjType(schema)) {
                    schema.properties[key] = getSchemaFromFlatten(flatten, child);
                }
                if (isListType(schema)) {
                    schema.items.properties[key] = getSchemaFromFlatten(flatten, child);
                }
            });
        }
    }
    return schema;
}

function stringContains(str, text) {
    return str.indexOf(text) > -1;
}

export const isObject = (a) => stringContains(Object.prototype.toString.call(a), 'Object');

export const clone = cloneDeep;

// '3' => true, 3 => true, undefined => false
export function isLooselyNumber(num) {
    if (typeof num === 'number') return true;
    if (typeof num === 'string') {
        return !Number.isNaN(Number(num));
    }
    return false;
}

export function isCssLength(str) {
    if (typeof str !== 'string') return false;
    return str.match(/^([0-9])*(%|px|rem|em)$/i);
}

export function isDeepEqual(param1, param2) {
    if (param1 === undefined && param2 === undefined) return true;
    if (param1 === undefined || param2 === undefined) return false;
    if (param1 === null && param2 === null) return true;
    if (param1 === null || param2 === null) return false;
    if (param1.constructor !== param2.constructor) return false;

    if (param1.constructor === Array) {
        if (param1.length !== param2.length) return false;
        for (let i = 0; i < param1.length; i++) {
            if (param1[i].constructor === Array || param1[i].constructor === Object) {
                if (!isDeepEqual(param1[i], param2[i])) return false;
            } else if (param1[i] !== param2[i]) return false;
        }
    } else if (param1.constructor === Object) {
        if (Object.keys(param1).length !== Object.keys(param2).length) return false;
        for (let i = 0; i < Object.keys(param1).length; i++) {
            const key = Object.keys(param1)[i];
            if (
                param1[key] &&
                typeof param1[key] !== 'number' &&
                (param1[key].constructor === Array || param1[key].constructor === Object)
            ) {
                if (!isDeepEqual(param1[key], param2[key])) return false;
            } else if (param1[key] !== param2[key]) return false;
        }
    } else if (param1.constructor === String || param1.constructor === Number) {
        return param1 === param2;
    }
    return true;
}

export function getFormat(format) {
    let dateFormat;
    switch (format) {
        case 'date':
            dateFormat = 'YYYY-MM-DD';
            break;
        case 'time':
            dateFormat = 'HH:mm:ss';
            break;
        case 'dateTime':
            dateFormat = 'YYYY-MM-DD HH:mm:ss';
            break;
        case 'week':
            dateFormat = 'YYYY-w';
            break;
        case 'year':
            dateFormat = 'YYYY';
            break;
        case 'quarter':
            dateFormat = 'YYYY-Q';
            break;
        case 'month':
            dateFormat = 'YYYY-MM';
            break;
        default:
        // dateTime
            if (typeof format === 'string') {
                dateFormat = format;
            } else {
                dateFormat = 'YYYY-MM-DD';
            }
    }
    return dateFormat;
}

export function hasRepeat(list) {
    return list.find((x, i, self) => i !== self.findIndex((y) => JSON.stringify(x) === JSON.stringify(y)));
}

export function combineSchema(propsSchema = {}, uiSchema = {}) {
    const propList = getChildren(propsSchema);
    const newList = propList.map((p) => {
        const { name } = p;
        const { type, enum: options, properties, items } = p.schema;
        const isObj = type === 'object' && properties;
        const isArr = type === 'array' && items && !options; // enum + array 代表的多选框，没有sub
        const ui = name && uiSchema[p.name];
        if (!ui) {
            return p;
        }
        // 如果是list，递归合并items
        if (isArr) {
            const newItems = combineSchema(items, ui.items || {});
            return { ...p, schema: { ...p.schema, ...ui, items: newItems } };
        }
        // object递归合并整个schema
        if (isObj) {
            const newSchema = combineSchema(p.schema, ui);
            return { ...p, schema: newSchema };
        }
        return { ...p, schema: { ...p.schema, ...ui } };
    });

    const newObj = {};
    newList.forEach((s) => {
        newObj[s.name] = s.schema;
    });

    const topLevelUi = {};
    Object.keys(uiSchema).forEach((key) => {
        if (typeof key === 'string' && key.substring(0, 3) === 'ui:') {
            topLevelUi[key] = uiSchema[key];
        }
    });
    if (isEmpty(newObj)) {
        return { ...propsSchema, ...topLevelUi };
    }
    return { ...propsSchema, ...topLevelUi, properties: newObj };
}

// export function isEmpty(obj) {
//   return Object.keys(obj).length === 0;
// }

function getChildren(schema) {
    if (!schema) return [];
    const {
        // object
        properties,
        // array
        items,
        type,
    } = schema;
    if (!properties && !items) {
        return [];
    }
    let schemaSubs = {};
    if (type === 'object') {
        schemaSubs = properties;
    }
    if (type === 'array') {
        schemaSubs = items;
    }
    return Object.keys(schemaSubs).map((name) => ({
        schema: schemaSubs[name],
        name,
    }));
}

export const parseString = (string) => Function(`"use strict";return (${  string  })`)();

export const evaluateString = (string, formData, rootValue) =>
    Function(`"use strict";
    const rootValue = ${JSON.stringify(rootValue)};
    const formData = ${JSON.stringify(formData)};
    return (${string})`)();

export function isExpression(func) {
    // if (typeof func === 'function') {
    //   const funcString = func.toString();
    //   return (
    //     funcString.indexOf('formData') > -1 ||
    //     funcString.indexOf('rootValue') > -1
    //   );
    // }
    if (typeof func !== 'string') return false;
    const pattern = /^{{(.+)}}$/;
    const reg1 = /^{{function\(.+}}$/;
    // const reg2 = /^{{(.+=>.+)}}$/;
    if (typeof func === 'string' && func.match(pattern) && !func.match(reg1)) {
        return true;
    }
    return false;
}

export const parseRootValueInSchema = (schema, rootValue) => {
    const result = clone(schema);
    if (isObject(schema)) {
        Object.keys(schema).forEach((key) => {
            const item = schema[key];
            if (isObject(item)) {
                result[key] = parseRootValueInSchema(item, rootValue);
            } else if (typeof item === 'string') {
                result[key] = parseSingleRootValue(item, rootValue);
            }
        });
    } else {
        console.error('schema is not an object:', schema);
    }
    return result;
};

// handle rootValue inside List
export const parseSingleRootValue = (expression, rootValue = {}) => {
    if (typeof expression === 'string' && expression.indexOf('rootValue') > 0) {
        const funcBody = expression.substring(2, expression.length - 2);
        const str = `
    return ${funcBody.replace(/rootValue/g, JSON.stringify(rootValue))}`;

        try {
            return Function(str)();
        } catch (error) {
            console.error(error, 'expression:', expression, 'rootValue:', rootValue);
            return null; // 如果计算有错误，return null 最合适
        }
    } else {
        return expression;
    }
};

export function parseSingleExpression(func, formData = {}, dataPath) {
    const parentPath = getParentPath(dataPath);
    const parent = getValueByPath(formData, parentPath) || {};
    if (typeof func === 'string') {
        const funcBody = func.substring(2, func.length - 2);
        const str = `
    return ${funcBody.replace(/formData/g, JSON.stringify(formData)).replace(/rootValue/g, JSON.stringify(parent))}`;

        try {
            return Function(str)();
        } catch (error) {
            console.log(error, func, dataPath);
            return null; // 如果计算有错误，return null 最合适
        }
        // const funcBody = func.substring(2, func.length - 2);
        // //TODO: 这样有问题，例如 a.b.indexOf(), 会把 a.b.indexOf 当做值
        // const match1 = /formData.([a-zA-Z0-9.$_\[\]]+)/g;
        // const match2 = /rootValue.([a-zA-Z0-9.$_\[\]]+)/g;
        // const str = `
        // return (${funcBody
        //   .replaceAll(match1, (v, m1) =>
        //     JSON.stringify(getValueByPath(formData, m1))
        //   )
        //   .replaceAll(match2, (v, m1) =>
        //     JSON.stringify(getValueByPath(parent, m1))
        //   )})`;
        // try {
        //   return Function(str)();
        // } catch (error) {
        //   console.log(error);
        //   return func;
        // }
    } else return func;
}

export const schemaContainsExpression = (schema) => {
    if (isObject(schema)) {
        return Object.keys(schema).some((key) => {
            const value = schema[key];
            if (typeof value === 'string') {
                return isExpression(value);
            } if (isObject(value)) {
                return schemaContainsExpression(value);
            } 
            return false;
            
        });
    }
    return false;
};

export const parseAllExpression = (_schema, formData, dataPath) => {
    const schema = clone(_schema);
    Object.keys(schema).forEach((key) => {
        const value = schema[key];
        if (isObject(value)) {
            schema[key] = parseAllExpression(value, formData, dataPath);
        } else if (isExpression(value)) {
            schema[key] = parseSingleExpression(value, formData, dataPath);
        } else if (typeof key === 'string' && key.toLowerCase().indexOf('props') > -1) {
            // 有可能叫 xxxProps
            const propsObj = schema[key];
            if (isObject(propsObj)) {
                Object.keys(propsObj).forEach((k) => {
                    schema[key][k] = parseSingleExpression(propsObj[k], formData, dataPath);
                });
            }
        }
    });
    return schema;
};

export function isFunctionSchema(schema) {
    return Object.keys(schema).some((key) => {
        if (typeof schema[key] === 'function') {
            return true;
        } if (typeof schema[key] === 'string') {
            return isExpression(schema[key]);
        } if (typeof schema[key] === 'object') {
            return isFunctionSchema(schema[key]);
        } 
        return false;
        
    });
}

export const getParentProps = (propName, id, flatten) => {
    try {
        const item = flatten[id];
        if (item.schema[propName] !== undefined) return item.schema[propName];
        if (item?.parent) {
            const parentSchema = flatten[item.parent].schema;
            if (parentSchema[propName] !== undefined) {
                return parentSchema[propName];
            } 
            return getParentProps(propName, item.parent, flatten);
            
        }
    } catch (error) {
        return undefined;
    }
};

export const getSaveNumber = () => {
    const searchStr = localStorage.getItem('SAVES');
    if (searchStr) {
        try {
            const saves = JSON.parse(searchStr);
            const {length} = saves;
            if (length) return length + 1;
        } catch (error) {
            return 1;
        }
    } else {
        return 1;
    }
};

export function looseJsonParse(obj) {
    return Function(`"use strict";return (${  obj  })`)();
}

export const isFunctionString = (fString) => typeof fString === 'string' && fString.indexOf('function(') === 0;

export function parseFunction(fString) {
    if (isFunctionString(fString)) {
        return Function(`return ${  fString}`)();
    }
    return fString;
}

// 获得propsSchema的children
// function getChildren2(schema) {
//   if (!schema) return [];
//   const {
//     // object
//     properties,
//     // array
//     items,
//     type,
//   } = schema;
//   if (!properties && !items) {
//     return [];
//   }
//   let schemaSubs = {};
//   if (type === 'object') {
//     schemaSubs = properties;
//   }
//   if (type === 'array') {
//     schemaSubs = items.properties;
//   }
//   return Object.keys(schemaSubs).map(name => ({
//     schema: schemaSubs[name],
//     name,
//   }));
// }

export const oldSchemaToNew = (schema) => {
    if (schema?.propsSchema) {
        const { propsSchema, ...rest } = schema;
        return { schema: propsSchema, ...rest };
    }
    return schema;
};

export const newSchemaToOld = (setting) => {
    if (setting?.schema) {
        const { schema, ...rest } = setting;
        return { propsSchema: schema, ...rest };
    }
    return setting;
};

// from FR

export const getEnum = (schema) => {
    if (!schema) return undefined;
    const itemEnum = schema?.items?.enum;
    const schemaEnum = schema?.enum;
    return itemEnum ? itemEnum : schemaEnum;
};

export const getArray = (arr, defaultValue = []) => {
    if (Array.isArray(arr)) return arr;
    return defaultValue;
};

export const isEmail = (value) => {
    const regex = '^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(.[a-zA-Z0-9_-]+)+$';
    if (value && new RegExp(regex).test(value)) {
        return true;
    }
    return false;
};

export function defaultGetValueFromEvent(valuePropName, ...args) {
    const event = args[0];
    if (event?.target && valuePropName in event.target) {
        return event.target[valuePropName];
    }
    return event;
}

export const getKeyFromPath = (path = '#') => {
    try {
        const arr = path.split('.');
        const last = arr.slice(-1)[0];
        const result = last.replace('[]', '');
        return result;
    } catch (error) {
        console.error(error, 'getKeyFromPath');
        return '';
    }
};

// 更多的值获取
export const getDisplayValue = (value, schema) => {
    if (typeof value === 'boolean') {
        return value ? 'yes' : 'no';
    }
    if (isObjType(schema) || isListType(schema)) {
        return '-';
    }
    if (Array.isArray(schema.enum) && Array.isArray(schema.enumNames)) {
        try {
            return schema.enumNames[schema.enum.indexOf(value)];
        } catch (error) {
            return value;
        }
    }
    return JSON.stringify(value);
};

// 去掉数组里的空元素 {a: [null, {x:1}]} => {a: [{x:1}]}
export const removeEmptyItemFromList = (formData) => {
    let result = {};
    if (isObject(formData)) {
        Object.keys(formData).forEach((key) => {
            result[key] = removeEmptyItemFromList(formData[key]);
        });
    } else if (Array.isArray(formData)) {
        result = formData.filter((item) => {
            if ([false, 0, ''].indexOf(item) > -1) return true;
            if (item && JSON.stringify(item) !== '{}') {
                return true;
            }
            return false;
        });
    } else {
        result = formData;
    }
    return result;
};

export const getDescriptorSimple = (schema = {}, path, formData) => {
    let result = {};
    if (isObject(schema)) {
        if (schema.type) {
            switch (schema.type) {
                case 'range':
                    result.type = 'array';
                    break;
                case 'html':
                    result.type = 'string';
                    break;
                default:
                    result.type = schema.type;
                    break;
            }
        }
        ['pattern', 'min', 'max', 'len', 'required'].forEach((key) => {
            if (Object.keys(schema).indexOf(key) > -1) {
                result[key] = schema[key];
            }
        });

        switch (schema.format) {
            case 'email':
            case 'url':
                result.type = schema.format;
                break;
            default:
                break;
        }

        const handleRegx = (desc) => {
            if (desc.pattern && typeof desc.pattern === 'string') {
                desc.pattern = new RegExp(desc.pattern);
            }
            return desc;
        };

        const handleFunString = r => {
            if (!r.validator) {
                return r;
            }
            const fun = parseFunctionString(r.validator);
            if (fun) {
                r.validator = (rule, value, callback, source, options) => new Function('rule', 'value', 'callback', 'source', 'options',`
                var formData = ${JSON.stringify(formData)}
                return (${fun})(rule, value, callback, source, options)`
                )(rule, value, callback, source, options);
            }
            return r;
        }

        // result be array
        if (schema.rules) {
            if (Array.isArray(schema.rules)) {
                const requiredRule = schema.rules.find((rule) => rule.required === true);
                if (requiredRule) {
                    result = { ...result, ...requiredRule };
                }
                result = [result, ...schema.rules];
                result = result
                    .map((r) => handleRegx(r))
                    .map(handleFunString);
            } else if (isObject(schema.rules)) {
                result = [result, schema.rules];
                result = result
                    .map((r) => handleRegx(r))
                    .map(handleFunString);
            }
        } else {
            result = [result];
        }
    }
    return { [path]: result };
};

// _path 只供内部递归使用
export const generateDataSkeleton = (schema, formData) => {
    let _formData = clone(formData);
    let result = _formData;
    if (isObjType(schema)) {
        if (_formData === undefined || typeof _formData !== 'object') {
            _formData = {};
            result = {};
        }
        Object.keys(schema.properties).forEach((key) => {
            const childSchema = schema.properties[key];
            const childData = _formData[key];
            const childResult = generateDataSkeleton(childSchema, childData);
            result[key] = childResult;
        });
    } else if (_formData !== undefined) {
        // result = _formData;
    } else if (schema.default !== undefined) {
        result = clone(schema.default);
    } else if (isListType(schema)) {
        result = isNotFill(schema) ? [] : [generateDataSkeleton(schema.items)];
    } else if (schema.type === 'boolean' && !schema.widget) {
        // result = false;
        result = undefined;
    } else {
        result = undefined;
    }
    return result;
};

export const translateMessage = (msg, schema) => {
    if (typeof msg !== 'string') {
        return '';
    }
    if (!schema) return msg;
    msg = msg.replace('${title}', schema.title);
    msg = msg.replace('${type}', schema.format || schema.type);
    // 兼容代码
    if (typeof schema.min === 'number') {
        msg = msg.replace('${min}', schema.min);
    }
    if (typeof schema.max === 'number') {
        msg = msg.replace('${max}', schema.max);
    }
    if (schema.rules) {
        const minRule = schema.rules.find((r) => r.min !== undefined);
        if (minRule) {
            msg = msg.replace('${min}', minRule.min);
        }
        const maxRule = schema.rules.find((r) => r.max !== undefined);
        if (maxRule) {
            msg = msg.replace('${max}', maxRule.max);
        }
        const lenRule = schema.rules.find((r) => r.len !== undefined);
        if (lenRule) {
            msg = msg.replace('${len}', lenRule.len);
        }
        const patternRule = schema.rules.find((r) => r.pattern !== undefined);
        if (patternRule) {
            msg = msg.replace('${pattern}', patternRule.pattern);
        }
    }
    return msg;
};

const changeSchema = (_schema, singleChange) => {
    let schema = clone(_schema);
    schema = singleChange(schema);
    if (isObjType(schema)) {
        let requiredKeys = [];
        if (Array.isArray(schema.required)) {
            requiredKeys = schema.required;
            delete schema.required;
        }
        Object.keys(schema.properties).forEach((key) => {
            const item = schema.properties[key];
            if (requiredKeys.indexOf(key) > -1) {
                item.required = true;
            }
            schema.properties[key] = changeSchema(item, singleChange);
        });
    } else if (isListType(schema)) {
        Object.keys(schema.items.properties).forEach((key) => {
            const item = schema.items.properties[key];
            schema.items.properties[key] = changeSchema(item, singleChange);
        });
    }
    return schema;
};

export const updateSchemaToNewVersion = (schema) => changeSchema(schema, updateSingleSchema);

const updateSingleSchema = (schema) => {
    try {
        schema.rules = schema.rules || [];
        schema.props = schema.props || {};
        if (schema['ui:options']) {
            schema.props = schema['ui:options'];
            delete schema['ui:options'];
        }
        if (schema.pattern) {
            const validItem = { pattern: schema.pattern };
            if (schema.message?.pattern) {
                validItem.message = schema.message.pattern;
            }
            schema.rules.push(validItem);
            delete schema.pattern;
            delete schema.message;
        }
        // min / max
        if (schema.minLength) {
            schema.min = schema.minLength;
            delete schema.minLength;
        }
        if (schema.maxLength) {
            schema.max = schema.maxLength;
            delete schema.maxLength;
        }
        if (schema.minItems) {
            schema.min = schema.minItems;
            delete schema.minItems;
        }
        if (schema.maxItems) {
            schema.max = schema.maxItems;
            delete schema.maxItems;
        }
        if (schema.step) {
            schema.props.step = schema.step;
            delete schema.step;
        }
        // ui:xxx
        if (schema['ui:className']) {
            schema.className = schema['ui:className'];
            delete schema['ui:className'];
        }
        if (schema['ui:hidden']) {
            schema.hidden = schema['ui:hidden'];
            delete schema['ui:hidden'];
        }
        if (schema['ui:readonly']) {
            schema.readOnly = schema['ui:readonly']; // 改成驼峰了
            delete schema['ui:readonly'];
        }
        if (schema['ui:disabled']) {
            schema.disabled = schema['ui:disabled'];
            delete schema['ui:disabled'];
        }
        if (schema['ui:width']) {
            schema.width = schema['ui:width'];
            delete schema['ui:width'];
        }
        if (schema['ui:displayType']) {
            schema.displayType = schema['ui:displayType'];
            delete schema['ui:displayType'];
        }
        if (schema['ui:column']) {
            schema.column = schema['ui:column'];
            delete schema['ui:column'];
        }
        if (schema['ui:widget']) {
            schema.widget = schema['ui:widget'];
            delete schema['ui:widget'];
        }
        if (schema['ui:labelWidth']) {
            schema.labelWidth = schema['ui:labelWidth'];
            delete schema['ui:labelWidth'];
        }
        if (schema.rules && schema.rules.length === 0) {
            delete schema.rules;
        }
        if (typeof schema.props === 'function' || (isObject(schema.props) && Object.keys(schema.props).length > 0)) {
        } else {
            delete schema.props;
        }
        return schema;
    } catch (error) {
        console.error('schema转换失败！', error);
        return schema;
    }
};

// 检验一个string是 function（传统活箭头函数）
export const parseFunctionString = (string) => {
    if (typeof string !== 'string') return false;
    const reg1 = /^{{(function.+)}}$/;
    const reg2 = /^{{(.+=>.+)}}$/;
    if (string.match(reg1)) {
        return string.match(reg1)[1];
    }
    if (string.match(reg2)) {
        return string.match(reg2)[1];
    }
    return false;
};

export const completeSchemaWithTheme = (schema = {}, theme = {}) => {
    let result = {};
    if (isObject(schema)) {
        if (schema.theme && theme[schema.theme]) {
            result = { ...schema, ...theme[schema.theme] };
        }
        Object.keys(schema).forEach((key) => {
            result[key] = completeSchemaWithTheme(schema[key], theme);
        });
    } else {
        result = schema;
    }
    return result;
};

export const cleanEmpty = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map((v) => (v && isObject(v) ? cleanEmpty(v) : v)).filter((v) => !(v == undefined));
    } if (isObject(obj)) {
        return Object.entries(obj)
            .map(([k, v]) => [k, v && isObject(v) ? cleanEmpty(v) : v])
            .reduce((a, [k, v]) => (v == undefined ? a : ((a[k] = v), a)), {});
    } 
    return obj;
    
};

// const x = { a: 1, b: { c: 2 }, d: [{ e: 3, f: [{ g: 5 }] }, { e: 4 }] };
// ['a', 'b.c', 'd[0].e', 'd[0].f[0].g', 'd[1].e']

export const dataToKeys = (data, rootKey = '') => {
    let result = [];
    if (rootKey && rootKey.slice(-1) !== ']') {
        result.push(rootKey);
    }

    const isComplex = (data) => isObject(data) || Array.isArray(data);
    if (isObject(data)) {
        Object.keys(data).forEach((key) => {
            const item = data[key];
            const itemRootKey = rootKey ? `${rootKey  }.${  key}` : key;
            if (isComplex(item)) {
                const itemKeys = dataToKeys(item, itemRootKey);
                result = [...result, ...itemKeys];
            } else {
                result.push(itemRootKey);
            }
        });
    } else if (Array.isArray(data)) {
        data.forEach((item, idx) => {
            const itemRootKey = rootKey ? `${rootKey}[${idx}]` : `[${idx}]`;
            if (isComplex(item)) {
                const itemKeys = dataToKeys(item, itemRootKey);
                result = [...result, ...itemKeys];
            } else {
                result.push(itemRootKey);
            }
        });
    } else {
    }
    return result;
};

export const removeHiddenFromResult = (data, flatten) => {
    const result = clone(data);

    const keys = dataToKeys(result);

    keys.forEach((key) => {
        const { id, dataIndex } = destructDataPath(key);
        if (flatten[id]) {
            let { hidden } = flatten[id].schema || {};
            if (isExpression(hidden)) {
                hidden = parseSingleExpression(hidden, result, key);
            }
            if (get(result, key) !== undefined && hidden) {
                set(result, key, undefined);
            }
        }
    });
    return result;
};

export function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? `0${  hours}` : hours;
    minutes = minutes < 10 ? `0${  minutes}` : minutes;
    seconds = seconds < 10 ? `0${  seconds}` : seconds;
    return `${hours  }:${  minutes  }:${  seconds}`;
}

export function yymmdd(timeStamp) {
    const date_ob = new Date(Number(timeStamp));
    const adjustZero = (num) => (`0${  num}`).slice(-2);
    const day = adjustZero(date_ob.getDate());
    const month = adjustZero(date_ob.getMonth());
    const year = date_ob.getFullYear();
    const hours = adjustZero(date_ob.getHours());
    const minutes = adjustZero(date_ob.getMinutes());
    const seconds = adjustZero(date_ob.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function allPromiseFinish(promiseList) {
    let hasError = false;
    let count = promiseList.length;
    const results = [];

    if (!promiseList.length) {
        return Promise.resolve([]);
    }

    return new Promise((resolve, reject) => {
        promiseList.forEach((promise, index) => {
            promise
                .catch((e) => {
                    hasError = true;
                    return e;
                })
                .then((result) => {
                    count -= 1;
                    results[index] = result;

                    if (count > 0) {
                        return;
                    }

                    if (hasError) {
                        reject(results);
                    }
                    resolve(results);
                });
        });
    });
}

export const removeDups = (arr) => {
    if (!Array.isArray(arr)) {
        console.log('in removeDups: param is not an array');
        return;
    }
    const array = [];
    for (let i = 0; i < arr.length; i++) {
        if (array.indexOf(arr[i]) === -1) {
            array.push(arr[i]);
        }
    }
    return array;
};

export const trimObjectString = (value) => {
    if (isArray(value)) {
        return value.map(item => trimObjectString(item));
    } else if (isObject(value)) {
        let newValue = {};
        Object.keys(value).forEach((key) => {
            newValue[key] = trimObjectString(value[key]);
        });
        return newValue;
    } else if (isString(value)) {
        return value.trim();
    } else {
        return value;
    }
}