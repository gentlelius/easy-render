import React, { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Upload, message, Button } from 'antd';

export default function UploadImg({ action, value, name, data, onChange, uploadProps, buttonProps }) {
    const [fileList, setFileList] = useState(value || []);
    console.log('fileList', fileList);
    const props = {
        listType: 'picture-card',
        fileList,
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
        onChange: ({ fileList: newFileList }) => {
            console.log('fileList', fileList);
            setFileList(newFileList);
        },
        onPreview: async (file) => {
            let src = file.url;
            if (!src) {
                src = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file.originFileObj);
                    reader.onload = () => resolve(reader.result);
                });
            }
            const image = new Image();
            image.src = src;
            const imgWindow = window.open(src);
            imgWindow?.document.write(image.outerHTML);
        },
        ...uploadProps,
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
                {fileList.length < 2 && '点击上传'}
            </Upload>
        </div>
    );
}
