import jsep from 'jsep';
import { cloneDeep } from 'lodash-es';
import dayjs from 'dayjs';

export const getSafeConfig = (config, expression) => {
    const ast = jsep(expression)
    const collection = traverseAstAndGetIdentifier(ast as AstType);
    config = collection.filter(name => !config.hasOwnProperty(name)).reduce((pre, cur) => ({...pre, [cur]: undefined}), config)
    return config;
}

export const getSelectionDisabled = (expression, record, config) => {
    if (!expression || typeof expression !== 'string') {
        return false;
    }
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        config = getSafeConfig(config, expression);
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

    } else {
        return false;
    }
}

export const parseHideExpression4Action = (expression, record, config) => {
    if (typeof expression === 'boolean') {
        return expression;
    }
    if (!expression) {
        return false;
    }
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        config = getSafeConfig(config, expression);
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

type AstType = {
    type: string;
    name: string;
    left?: AstType;
    right?: AstType;
    argument?: AstType;
}

export const traverseAstAndGetIdentifier = (ast: AstType, collection: string[] = []) => {
    if (ast.type === 'Identifier') {
        if (collection.includes(ast.name)) {
            return collection;
        }
        collection.push(ast.name);
        return collection;
    }
    if (ast.type === 'BinaryExpression' || ast.type === 'LogicalExpression') {
        ast.left &&traverseAstAndGetIdentifier(ast.left, collection);
        ast.right && traverseAstAndGetIdentifier(ast.right, collection);
    } else if (ast.type === 'UnaryExpression') {
        ast.argument && traverseAstAndGetIdentifier(ast.argument, collection);
    }
    return collection;
}

export const parseHideExpression4Column = (expression, config) => {
    if (typeof expression === 'boolean') {
        return expression;
    }
    if (!expression) {
        return false;
    }
    config = cloneDeep(config);
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
        expression = expression.slice(2, -2);
        config = getSafeConfig(config, expression);
        return new Function('config', `
            let flag = false;
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
    return false;
}

export const parseHideExpression4Area = (expression, config) => {
    return parseHideExpression4Column(expression, config);
}

export const parseHideExpression4Selection = (expression, config) => {
    return parseHideExpression4Column(expression, config);
}

export const isDayjsOrMoment = (date) => {
    return date?._isAMomentObject || dayjs.isDayjs(date) || date?.$isDayjsObject;
}
