import list from './list';
import map from './map';
import { InputNumber, Checkbox, Input, Switch, Rate, TreeSelect } from 'antd';
import ImageInput from './imageInput';
import urlInput from './urlInput';
import Html from './html';
import select from './select';
import checkboxes from './checkboxes';
import multiSelect from './multiSelect';
import radio from './radio';
import time from './time';
import date from './date';
import dateRange from './dateRange';
import timeRange from './timeRange';
import color from './color';
import slider from './slider';
import upload from './upload';
import proTable from './proTable';
import proSelect from './proSelect';
import codeEdit from './codeEdit';
import uploadLazy from './upload-lazy';
import uploadImg from './upload-img';
import { isNil } from 'lodash-es';
// const Cascader = React.lazy(() => import('antd/es/cascader'));

const { TextArea } = Input;

const FrNumber = ({ style, ...rest }) => {
    let formatterProps;
    if (rest.thousand) {
        delete rest.thousand;
        formatterProps = {
            formatter: (value) => `${value}`.replace(/(?<!\.\d*)(?<=\d)(?=(\d{3})+(?!\d))/g, ','),
            parser: (value) => value.replace(/(,*)/g, '')
        }
    }
    // max 默认为 1e14 - 1（99999999999999）
    rest.max = isNil(rest.max) ? 1e14 - 1 : rest.max;
    return (
        <InputNumber
            style={{ width: '100%', ...style }} 
            {...rest}
            {...formatterProps}
        />
    )
};

const FrTextArea = ({ autoSize, ...rest }) => <TextArea autoSize={autoSize ? autoSize : { minRows: 3 }} {...rest} />;

const FrTreeSelect = ({ style, ...rest }) => <TreeSelect style={{ width: '100%', ...style }} {...rest} />;

// const FrCascader = ({ style, ...rest }) => (
//   <Cascader style={{ width: '100%', ...style }} {...rest} />
// );

// key->value 配对
export const widgets = {
    input: Input,
    checkbox: Checkbox,
    checkboxes, // checkbox多选
    color,
    date,
    time,
    dateRange,
    timeRange,
    imageInput: ImageInput,
    url: urlInput,
    list,
    map,
    multiSelect, // 下拉多选
    number: FrNumber,//(props) => <FrNumber {...props.schema.props} />
    radio,
    select,
    slider, // 带滚条的number
    switch: Switch,
    textarea: FrTextArea,
    upload,
    html: Html,
    rate: Rate,
    treeSelect: FrTreeSelect,
    proTable,
    proSelect,
    codeEdit,
    uploadLazy,
    uploadImg,
};

export const defaultWidgetNameList = Object.keys(widgets);
