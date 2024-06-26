# JSON Schema 渲染器

✨ 此渲染器可承载表格、表单、图表等内容的渲染，轻松实现「配置化」。

通常用在中后台系统中，通过一个 JSON ，表达出各种不同的渲染需求，当然除了固定的渲染模板，它还支持自定义渲染 ✨

## Demo

### 搭建表格
表格一般用来展示 List 中的数据，同时它具备过滤器、分页等基础功能，有时候它还要定制化地展示一些内容。

https://gentlelius.github.io/videos/table-demo.mp4

### 代码补全
代码提示让配置化的体验更好:

https://gentlelius.github.io/videos/snippet-demo.mp4



### 搭建表单
表单搭建要更复杂一点，里面可能会涉及到一些复杂的表单联动、表单数据变动监听等:

https://gentlelius.github.io/videos/form-demo.mp4






## 特点
1. 安全可靠，基于 `form-render`，站在巨人肩膀上增强渲染器的能力；
2. 功能丰富，支持表格、表单、Monaco、富文本等常见物料，并不断拓展；
3. 搭配使用，专门配套的 `vscode` 插件，让开发更有效率；


## 安装
```bash
# npm
npm i react-easy-render
```


## TODO

- [x] 数据变动时的性能优化，更小颗粒度更新
- [x] 加入更多中后台物料
- [ ] 拓展功能，支持更多业务场景如运营活动、大屏可视化等




