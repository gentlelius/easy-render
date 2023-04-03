import React, { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Upload, message, Button } from 'antd';

export default function UploadImg({ action, value, name, data, onChange, uploadProps, disabled, maxCount = 1 }) {
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
            let newFileList = [...info.fileList];
            newFileList = newFileList.map((file) => {
                if (file.status === 'done') {
                    if (file.response.success) {
                        file.url = file.response.data.filepath;
                    } else {
                        file.status = 'error';
                        message.error('上传失败');
                    }
                }
                return file;
            });
            onChange(newFileList);
            setFileList(info.fileList);
        },
        onRemove() {
            onChange([]);
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
    
    return (
        <div>
            <Upload {...props}>
                {/* {fileList.length < maxCount && '点击上传'} */}
                <Button icon={<UploadOutlined />} disabled={disabled}>上传</Button>
            </Upload>
        </div>
    );
}
