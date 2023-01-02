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
                    label: 'config',
                    kind: monaco.languages.CompletionItemKind['Property'],
                    insertText: "{\n\tvalueType: '${1:select}',\n\tfieldProps(form, config) {\n\t\t${2}\n\t}\n}",
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'config',
                },
                ...createDependencyProposals(),
            ]
        };
    },
    triggerCharacters: ['umi']  // 写触发提示的字符，可以有多个
});

function createDependencyProposals(range, languageService = false, editor, curWord) {
    const esKeys = [
        'async',
        'await',
        'console.log(${1})',
        'try {\n\t${1}\n} catch(e) {\n \n}',
        'function ${1:funName}() {\n\t\n}'
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

const identifierPattern = "([a-zA-Z_]\\w*)";	// 正则表达式定义 注意转义\\w

function getTokens(code) {
    let identifier = new RegExp(identifierPattern, "g");	// 注意加入参数"g"表示多次查找
    let tokens = [];
    let array1;
    while ((array1 = identifier.exec(code)) !== null) {
        tokens.push(array1[0]);
    }
    return Array.from(new Set(tokens));			// 去重
}

function createDependencyProposals2(range, languageService = false, editor, curWord) {
    const esKeys = [
        'async',
        'await',
        'console.log(${1})',
        'try {\n\t${1}\n} catch(e) {\n \n}',
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
    // snippets和keys的定义同上
    let words = [];
    let tokens = getTokens(editor.getModel().getValue());
    for (const item of tokens) {
        if (item != curWord.word) {
            words.push({
                label: item,
                kind: monaco.languages.CompletionItemKind.Text,	// Text 没有特殊意义 这里表示基于文本&单词的补全
                documentation: "",
                insertText: item,
                range: range
            });
        }
    }
    return [].concat(keys).concat(words);
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