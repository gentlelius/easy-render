import { useReducer, useContext, useRef, useEffect, useState, createContext } from 'react';

export const Ctx = createContext(() => {});
export const StoreCtx = createContext({});
export const Store2Ctx = createContext({});

export const useTools = () => useContext(Ctx);

export const useStore = () => useContext(StoreCtx);

export const useStore2 = () => useContext(Store2Ctx);

export const useSet = (initState) => {
    const [state, setState] = useReducer((state, newState) => {
        let action = newState;
        if (typeof newState === 'function') {
            action = action(state);
        }
        if (newState.action && newState.payload) {
            action = newState.payload;
            if (typeof action === 'function') {
                action = action(state);
            }
        }
        const result = { ...state, ...action };
        return result;
    }, initState);
    return [state, setState];
};

export function useInterval(callback, delay, start) {
    const savedCallback = useRef();
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    const id = useRef();
    useEffect(() => {
        if (!start) {
            return;
        }
        function tick() {
            savedCallback?.current?.();
        }
        tick();
        if (delay !== null) {
            id.current = setInterval(tick, delay);
            return () => clearInterval(id.current);
        }
    }, [delay, start]);
    return () => clearInterval(id.current);
}

export function usePrevious(value) {
    // The ref object is a generic container whose current property is mutable ...
    // ... and can hold any value, similar to an instance property on a class
    const ref = useRef();

    // Store current value in ref
    useEffect(() => {
        ref.current = value;
    }, [value]); // Only re-run if value changes

    // Return previous value (happens before update in useEffect above)
    return ref.current;
}

export const useShowOnce = (localKey) => {
    // 从 localStorage 读取 key 值
    const [show, setShow] = useState(false);
    let localStr;
    try {
        localStr = localStorage.getItem(localKey);
    } catch (error) {}
    if (!localStr) {
        setShow(true);
        localStorage.setItem(localKey, JSON.stringify(true));
    }
    return show;
};

export const useModal = () => {
    const [show, setShow] = useState(false);
    const toggle = () => setShow(!show);
    return [show, toggle];
};

export const useWindowState = (initState) => {
    const [state, setState] = useState(initState);
    return [state, setState];
};

export const useStorageState = (initState = {}, searchKey = 'SAVES') => {
    const readSearchFromStorage = () => {
        const searchStr = localStorage.getItem(searchKey);
        if (searchStr) {
            try {
                return JSON.parse(searchStr);
            } catch (error) {
                return initState;
            }
        }
        return initState;
    };
    const [data, setData] = useState(readSearchFromStorage());
    const setSearchWithStorage = (search) => {
        setData(search);
        localStorage.setItem(searchKey, JSON.stringify(search));
    };
    return [data, setSearchWithStorage];
};
