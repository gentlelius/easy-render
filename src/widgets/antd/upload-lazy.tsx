import React, { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Upload, Button } from 'antd';
import { UploadFile, UploadProps } from 'antd/es/upload/interface';

export default function UploadLazy({ value, onChange, ...rest }) {
    const [fileList, setFileList] = useState<Array<UploadFile>>([]);
    const props: UploadProps = {
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
            onChange(newFileList);
        },
        beforeUpload: (file) => {
            setFileList([file]);
            onChange({file});
            return false;
        },
        fileList,
        ...rest,
    };

    return (
        <div className="fr-upload-mod">
            <Upload {...props} className="fr-upload-file">
                <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            {typeof value === 'string' && (
                <div>
                    <span className="ml3">已上传地址：</span>
                    <a href={value} target="_blank" rel="noopener noreferrer" className="">{value}</a>
                </div>
            )}
        </div>
    );
}
