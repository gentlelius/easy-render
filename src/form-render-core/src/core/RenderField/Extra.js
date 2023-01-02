import React from 'react';
import { useTools } from '../../hooks';
import './Extra.less';

const Extra = ({ schema }) => {
    const { extra } = schema;
    const { widgets } = useTools();

    if (!extra) return null;

    const widgetName = extra.widget;
    const Widget = widgets[widgetName];
    if (Widget) return <Widget schema={schema} />;

    let __html = '';
    if (typeof extra === 'string') {
        __html = extra;
    }
    if (typeof extra === 'object' && extra.text) {
        __html = extra.text;
    }
    return __html && <div className="fr-form-item-extra" dangerouslySetInnerHTML={{ __html }}></div>;
};

export default Extra;
