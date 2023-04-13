import copy from 'rollup-plugin-copy';

export default {
  // cjs: 'rollup',

  // esm: {
  //   type: 'rollup',
  //   importLibToEs: true,
  // },
  disableTypeCheck: true,
  cjs: 'babel',
  esm: {
    type: 'babel',
    importLibToEs: true,
  },
  lessInBabelMode: true,
  extraRollupPlugins: [
    copy({
      targets: [{ src: 'src/index.d.ts', dest: 'dist/' }],
    }),
  ],
  extraBabelPlugins: [
    [
      'import',
      {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: false,
      },
      'antd',
    ],
    [
      'import',
      {
        libraryName: '@ant-design/icons',
        libraryDirectory: 'lib/icons',
        camel2DashComponentName: false,
      },
      '@ant-design/icons',
    ],
  ],
};
