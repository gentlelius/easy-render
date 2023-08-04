import React from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Upload, message, Button } from 'antd';

export default function FrUpload({ action, value, name, data, onChange, uploadProps, buttonProps, disabled, schema }) {

    const props = {
        name: name || 'data',
        data: data,
        type: 'file',
        action, // 旧的兼容
        onChange(info) {
            if (info.file.status === 'done') {
                message.success(`${info.file.name} 上传成功`);
                onChange(JSON.stringify(info.file.response));
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} 上传失败`);
            }
        },
        onRemove() {
            onChange('');
        },
        withCredentials: true,
        ...uploadProps,
        ...schema?.props,
    };

    const defaultBtnProps = {
        icon: <UploadOutlined />,
        children: '点我选择文件',
    };

    const btnProps = {
        ...defaultBtnProps,
        ...buttonProps,
    };

    return (
        <div className="fr-upload-mod">
            <Upload {...props} className="fr-upload-file">
                <Button {...btnProps} disabled={disabled} />
            </Upload>
            {value && (
                <a href={value} target="_blank" rel="noopener noreferrer" className="fr-upload-preview">
                    已上传地址
                </a>
            )}
        </div>
    );
}
