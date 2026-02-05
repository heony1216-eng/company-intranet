/**
 * 환경에 따라 로깅을 제어하는 유틸리티
 * 개발 환경에서만 콘솔 출력
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

export const logger = {
    log: (...args) => {
        if (isDev) {
            console.log(...args)
        }
    },
    error: (...args) => {
        if (isDev) {
            console.error(...args)
        }
    },
    warn: (...args) => {
        if (isDev) {
            console.warn(...args)
        }
    },
    info: (...args) => {
        if (isDev) {
            console.info(...args)
        }
    },
    debug: (...args) => {
        if (isDev) {
            console.debug(...args)
        }
    },
    // 에러 리포팅이 필요한 경우 (프로덕션에서도 수집 가능)
    reportError: (error, context = {}) => {
        if (isDev) {
            console.error('[Error Report]', error, context)
        }
        // 프로덕션에서는 에러 리포팅 서비스로 전송할 수 있음
        // 예: Sentry, LogRocket 등
    }
}

export default logger
