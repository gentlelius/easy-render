import React, { useRef, useEffect, forwardRef } from 'react';
import * as monaco from 'monaco-editor';

// @ts-ignore
self.MonacoEnvironment = {
    getWorkerUrl: function (_moduleId, label) {
        if (label === 'json') {
            return './json.worker.bundle.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return './css.worker.bundle.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './html.worker.bundle.js';
        }
        if (label === 'typescript' || label === 'javascript') {
            return './ts.worker.bundle.js';
        }
        return './editor.worker.bundle.js';
    }
};

monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems() {
        return {
            suggestions: [
                {
                    label: 'request get',
                    kind: monaco.languages.CompletionItemKind['Function'], 
                    insertText: "(params, sorter, filter) => {\n    return request(\n        '${1:select}',\n        {\n            method: 'get',\n            params: {\n                order: 'asc',\n                limit: params.pageSize,\n                offset: (params.current - 1) * params.pageSize,\n                ...getValidParams(params),\n\t\t\t\t${2}                \n            }\n        }\n    ).then((res) => {\n        const { success, rows, total } = res;\n        if (success) {\n            return {\n                success: true,\n                data: rows,\n                pageSize: params.pageSize,\n                current: params.current,\n                total,\n            }\n        }\n    })\n}",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'request get 请求'
                }, 
                {
                    label: 'request post',
                    kind: monaco.languages.CompletionItemKind['Function'],
                    insertText: "(params, sorter, filter) => {\n    return request(\n        '${1:select}',\n        {\n            method: 'post',\n            data: {\n                order: 'asc',\n                limit: params.pageSize,\n                offset: (params.current - 1) * params.pageSize,\n                ...getValidParams(params),\n\t\t\t\t${2}               \n            }\n        }\n    ).then((res) => {\n        const { success, rows, total } = res;\n        if (success) {\n            return {\n                success: true,\n                data: rows,\n                pageSize: params.pageSize,\n                current: params.current,\n                total,\n            }\n        }\n    })\n}",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'request post 请求'
                },
                {
                    label: 'date',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: pretty(`
                        {
                            valueType: 'date',
                            hideInTable: true,
                            initialValue: dayjs().subtract(30, 'day').format('YYYY-MM-DD')$0
                        }
                    `),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'date',
                },
                {
                    label: 'select',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: pretty(`
                        {
                            valueType: 'select',
                            hideInTable: true,
                            fieldProps: {
                                $0
                            },
                        }
                    `),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'select',
                },
                {
                    label: 'options',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: pretty(`
                    options: [
                        {
                            value: $1,
                            label: $2
                        }$0
                    ]
                    `),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'options',
                },
                {
                    label: 'item {}',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: pretty(`
                    {
                        value: $1,
                        label: $2,
                    }$0
                    `),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'options item',
                },
                {
                    label: 'onInit',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: pretty(`
                    onInit() {
                        return request(
                            '\${1:path}',
                            {
                                method: '\${2:post}',
                                params: {$0
                                }
                            }
                        ).then((res) => {
                            const { data } = res;
                            return data.map(item => ({
                                value: item.$3,
                                label: item.$4,
                            }));
                        });
                    }
                    `),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'onInit hook',
                },
                {
                    label: 'onSearch',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: pretty(`
                    onSearch() {
                        return request(
                            '\${1:path}',
                            {
                                method: '\${2:post}',
                                params: {$0
                                }
                            }
                        ).then((res) => {
                            const { data } = res;
                            return data.map(item => ({
                                value: item.$3,
                                label: item.$4,
                            }));
                        });
                    }
                    `),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'onSearch hook',
                },
                ...createDependencyProposals(),
            ]
        };
    },
    triggerCharacters: ['.']  // 写触发提示的字符，可以有多个
});

function pretty(str) {
    const arr = str.split('\n').filter(v => !!v.trim());
    const regex = /^(\s+)/g;
    const found = arr[0].match(regex);
    return arr.map(v => v.replace(found, '')).join('\n');
}

function createDependencyProposals(range, languageService = false, editor, curWord) {
    const esKeys = [
        'async',
        'await',
        'console.log($0)',
        'try {\n\t$0\n} catch(e) {\n \n}',
        'function ${1:funName}() {\n\t$0\n}',
        'dayjs().subtract($1, $2)$0',
        'dayjs().add($1, $2)$0',
        'percentage($0)',
        'getValidParams(${1:params})$0',
        'getValue(\'$0\')',
        'setValue(\'$0\')',
        'precision($0)',
        'genID(\'$0\')',
        'flattenObject($0)',
        'then(() => {\n\t$0\n})',
        'Promise.then(() => $0})',
        'setTimeOut(() => $0, $1)',
    ]
    let keys = [];
    for (const item of esKeys) {
    	keys.push({
        	label: item,
        	kind: monaco.languages.CompletionItemKind.Keyword,
        	documentation: "",
        	insertText: item,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        	range: range
    	});
    }
    return [].concat(keys);
}

const CodeEditor = (props) => {
    const conStyle = {
        width: props.width || 800,
        height: props.height || 100,
        border: '1px solid #ccc',
    }
    const divEl = useRef(null);
    let editor = useRef();

    useEffect(() => {
        if (divEl.current) {
            editor.current = monaco.editor.create(divEl.current, {
                ...props,
                // minimap:{ 
                // 	enabled: false
                // },
            });
        }
        return () => {
            editor.current.dispose();
        };
    }, []);

    useEffect(() => {
        editor.current.onDidBlurEditorWidget((event) => {
            const res = editor.current.getValue();
            props.onChange(res);
        })
    }, [props]);

    return <div style={conStyle} ref={divEl}></div>;
};

export default CodeEditor;