import React, { forwardRef } from 'react';
import useForm from './useForm';

const connectForm = (Component) => forwardRef((props, ref) => {
    const form = useForm();
    return <Component ref={ref} {...props} form={form} />;
});

export default connectForm;
