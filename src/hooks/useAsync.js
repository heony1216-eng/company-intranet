import { useState, useCallback } from 'react'

/**
 * 비동기 작업을 처리하는 공통 훅
 * @param {Function} asyncFunction - 실행할 비동기 함수
 * @param {Object} options - 옵션
 * @param {boolean} options.immediate - 마운트 시 즉시 실행 여부
 * @param {Function} options.onSuccess - 성공 콜백
 * @param {Function} options.onError - 에러 콜백
 */
export const useAsync = (asyncFunction, options = {}) => {
    const { onSuccess, onError } = options

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const execute = useCallback(async (...args) => {
        setLoading(true)
        setError(null)

        try {
            const result = await asyncFunction(...args)
            setData(result)
            onSuccess?.(result)
            return { data: result, error: null }
        } catch (err) {
            const errorMessage = err.message || '오류가 발생했습니다.'
            setError(errorMessage)
            onError?.(err)
            return { data: null, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }, [asyncFunction, onSuccess, onError])

    const reset = useCallback(() => {
        setData(null)
        setError(null)
        setLoading(false)
    }, [])

    return {
        data,
        loading,
        error,
        execute,
        reset,
        isSuccess: !loading && !error && data !== null,
        isError: !loading && error !== null
    }
}

/**
 * 비동기 상태만 관리하는 간단한 훅
 */
export const useLoadingState = (initialLoading = false) => {
    const [loading, setLoading] = useState(initialLoading)
    const [error, setError] = useState(null)

    const withLoading = useCallback(async (asyncFn) => {
        setLoading(true)
        setError(null)
        try {
            const result = await asyncFn()
            return { data: result, error: null }
        } catch (err) {
            const errorMessage = err.message || '오류가 발생했습니다.'
            setError(errorMessage)
            return { data: null, error: errorMessage }
        } finally {
            setLoading(false)
        }
    }, [])

    const reset = useCallback(() => {
        setLoading(false)
        setError(null)
    }, [])

    return { loading, error, withLoading, reset, setLoading, setError }
}

export default useAsync
