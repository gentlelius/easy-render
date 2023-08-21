/* eslint-disable react-hooks/exhaustive-deps */
import {
    getDescriptorSimple,
    destructDataPath,
    getDataPath,
    isExpression,
    parseSingleExpression,
    isObject,
    allPromiseFinish,
    removeDups,
    dataToKeys,
} from './utils';
import { defaultValidateMessagesCN } from './validateMessageCN';
import { defaultValidateMessages } from './validateMessage';
import Validator from 'async-validator';
import { get, merge } from 'lodash-es';
import { getUiFormData } from '../../utils';

export const parseSchemaExpression = (schema, formData, path) => {
    if (!isObject(schema)) return schema;
    const result = {};
    Object.keys(schema).forEach((key) => {
        const item = schema[key];
        if (isObject(item)) {
            result[key] = parseSchemaExpression(item, formData, path);
        } else if (isExpression(item)) {
            result[key] = parseSingleExpression(item, formData, path);
        } else {
            result[key] = item;
        }
    });
    return result;
};

const getRelatedPaths = (path, flatten) => {
    const parentPaths = [];
    const pathArr = path.split('.');
    while (pathArr.length > 0) {
        parentPaths.push(pathArr.join('.'));
        pathArr.pop();
    }

    let result = [...parentPaths];

    parentPaths.forEach((path) => {
        const { id, dataIndex } = destructDataPath(path);
        if (flatten[id]?.schema && Array.isArray(flatten[id].schema.dependecies)) {
            const deps = flatten[id].schema.dependecies;
            const fullPathDeps = deps.map((dep) => getDataPath(dep, dataIndex));
            result = [...result, ...fullPathDeps];
        }
    });
    return removeDups(result).map((path) => {
        if (path.slice(-1) === ']') {
            const pattern = /\[[0-9]+\]$/;
            return path.replace(pattern, '');
        } 
        return path;
        
    });
};

export const validateField = ({ path, formData, flatten, options }) => {
    const paths = getRelatedPaths(path, flatten);
    const promiseArray = paths.map((path) => {
        const { id, dataIndex } = destructDataPath(path);
        if (flatten[id] || flatten[`${id}[]`]) {
            const item = flatten[id] || flatten[`${id}[]`];
            const singleData = get(formData, path);
            const schema = item.schema || {};
            const finalSchema = parseSchemaExpression(schema, formData, path);
            return validateSingle(singleData, finalSchema, path, options, formData); // is a promise
        } 
        return Promise.resolve();
        
    });

    return allPromiseFinish(promiseArray)
        .then((res) => {
            const errorFields = res
                .filter((item) => Array.isArray(item) && item.length > 0)
                .map((item) => {
                    const name = item[0].field;
                    const error = item.map((m) => m.message).filter((m) => !!m);
                    return { name, error };
                });
            return errorFields;
        })
        .catch((e) => {
            console.log(e);
        });
};

// pathFromData => allPath
const getAllPaths = (paths, flatten) => {
    if (!Array.isArray(paths)) return [];
    const result = [...paths]
        .filter((p) => p.indexOf(']') > -1)
        .map((p1) => {
            const last = p1.lastIndexOf(']');
            return p1.substring(0, last + 1);
        });
    const uniqueResult = removeDups(result);

    const allFlattenPath = Object.keys(flatten);
    let res = [...paths];
    uniqueResult.forEach((result) => {
        const { id, dataIndex } = destructDataPath(result);
        if (flatten[id]) {
            const children = allFlattenPath.filter((f) => f.indexOf(id) === 0 && f !== id);
            const childrenWithIndex = children
                .map((child) => {
                    const p = getDataPath(child, dataIndex);
                    return p.split('[]')[0];
                })
                .filter((i) => !!i);
            res = [...res, ...removeDups(childrenWithIndex)];
        }
    });
    return removeDups(res);
};

export const validateAll = ({
    formData,
    flatten,
    options,
}) => {
    // 这里的校验不能是 flatten，flatten 里面没法对数组具体的某一项进行校验，但也不能直接用 formData，因为 formData 里面的数据可能有多余的，会多出很多计算量
    const uiFormData = getUiFormData(formData, flatten);
    const paths = dataToKeys(uiFormData);
    const allPaths = getAllPaths(paths, flatten);
    allPaths.sort();
    const hiddenMemory = [];
    const promiseArray = allPaths.map((path) => {
        const { id } = destructDataPath(path);
        if (flatten[id] || flatten[`${id}[]`]) {
            const item = flatten[id] || flatten[`${id}[]`];
            const singleData = get(formData, path);
            const schema = item.schema || {};
            const finalSchema = parseSchemaExpression(schema, formData, path);
            // 存入 memory
            if (finalSchema.hidden === true) {
                hiddenMemory.push(path);
            }
            // 遍历 memory ，如果 path 是 memory 中的某个 path 的子集，那么也无须校验，直接返回，同时存入 memory
            for (const p of hiddenMemory) {
                if (path.startsWith(p)) {
                    hiddenMemory.push(path);
                    return Promise.resolve();
                }
            }
            return validateSingle(singleData, finalSchema, path, options, formData);
        } 
        return Promise.resolve();
    });

    return allPromiseFinish(promiseArray)
        .then((res) => {
            const errorFields = res
                .filter((item) => Array.isArray(item) && item.length > 0 && item[0].message !== null) // NOTICE: different from validateField
                .map((item) => {
                    const name = item[0].field;
                    const error = item.map((m) => m.message).filter((m) => !!m);
                    return { name, error };
                });
            return errorFields;
        })
        .catch((e) => {
            console.log(e);
        });
};

const validateSingle = (data, schema = {}, path, options = {}, formData) => {
    if (schema.hidden) {
        return Promise.resolve();
    }
    if (schema.hideRules === true) {
        return Promise.resolve();
    }

    const { validateMessages = {}, locale = 'cn' } = options;
    const cn = defaultValidateMessagesCN;
    const en = defaultValidateMessages;
    const descriptor = getDescriptorSimple(schema, path, formData);
    // TODO: 有些情况会出现没有rules，需要看一下，先兜底
    let validator;
    try {
        validator = new Validator(descriptor);
    } catch (error) {
        return Promise.resolve();
    }
    const messageFeed = locale === 'en' ? en : cn;
    merge(messageFeed, validateMessages);
    validator.messages(messageFeed);
    const trimData = typeof data === 'string' ? data.trim() : data;
    return validator
        .validate({ [path]: trimData })
        .then((res) => [{ field: path, message: null }])
        .catch(({ errors, fields }) => errors);
};
