import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * 값의 디바운스 처리
 * @param {any} value - 디바운스할 값
 * @param {number} delay - 딜레이 (ms)
 */
export const useDebounce = (value, delay = 300) => {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

/**
 * 함수의 디바운스 처리
 * @param {Function} fn - 디바운스할 함수
 * @param {number} delay - 딜레이 (ms)
 */
export const useDebouncedCallback = (fn, delay = 300) => {
    const timeoutRef = useRef(null)

    const debouncedFn = useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
            fn(...args)
        }, delay)
    }, [fn, delay])

    // 클린업
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    // 즉시 실행 및 취소 함수
    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
    }, [])

    const flush = useCallback((...args) => {
        cancel()
        fn(...args)
    }, [fn, cancel])

    return { debouncedFn, cancel, flush }
}

export default useDebounce
