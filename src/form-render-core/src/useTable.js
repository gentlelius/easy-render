import { useRef } from 'react'

const useTable = (props) => {
    const tableRef = useRef();
    const formRef = useRef();

    const val = {
        tableRef,
        formRef,
    }

    Object.defineProperty(val, 'tableAction', {
        get() {
            return tableRef.current;
        }
    });

    Object.defineProperty(val, 'formAction', {
        get() {
            return formRef.current;
        },
    });

    return val;
}

export default useTable;