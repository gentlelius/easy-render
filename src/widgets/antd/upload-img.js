import React, { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Upload, message, Button } from 'antd';

export default function UploadImg({ action, value, name, data, onChange, uploadProps, buttonProps, maxCount = 1 }) {
    const [fileList, setFileList] = useState(value || []);
    console.log('fileList', fileList);
    const props = {
        maxCount,
        listType: 'picture',
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
            setFileList(info.fileList);
        },
        onRemove() {
            onChange('');
        },
        withCredentials: true,
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
        <div>
            <Upload {...props}>
                {/* {fileList.length < maxCount && '点击上传'} */}
                <Button icon={<UploadOutlined />}>上传</Button>
            </Upload>
        </div>
    );
}
