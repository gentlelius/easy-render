module.exports = {
    env: {
        browser: true,
        es6: true,
        // jest: true,
    },
    extends: [
    ],
    globals: {
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
            strict: true,
        },
        ecmaVersion: 2016,
        sourceType: 'module',
    },
    plugins: [
        'react-hooks',
        '@typescript-eslint',
    ],
    rules: {
        complexity: [1, 14],
        indent: [1, 4],
        '@typescript-eslint/indent': [1, 4],
        camelcase: [0],
        // react hook 的规则: https://reactjs.org/docs/hooks-rules.html
        'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
        'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
        "prettier/prettier": [0],
        '@typescript-eslint/naming-convention': [0],
        '@typescript-eslint/no-unused-vars': [1],
        'no-new-func': [0]
    },
};
