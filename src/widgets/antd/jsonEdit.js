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

const Editor = (props) => {
	const conStyle = {
		width: props.width || 800,
		height: props.height || 100,
		border: '1px solid #ccc',
	}
	const { value, width, height, theme, language, fontSize } = props;
	const divEl = useRef(null);
	let editor;
	useEffect(() => {
		if (divEl.current) {
			monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
				validate: true,
				schemas: []
			});
			editor = monaco.editor.create(divEl.current, {
				value,
				language,
                theme,
                fontSize,
				minimap:{ 
					enabled: false
				},
			});
			editor.onDidBlurEditorWidget((event) => {
				props.onChange(editor.getValue());
			})
		}
		return () => {
			editor.dispose();
		};
	}, [props]);
	return <div style={conStyle} ref={divEl}></div>;
};

export default Editor;