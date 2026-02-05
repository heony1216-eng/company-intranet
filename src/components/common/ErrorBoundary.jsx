import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './index'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })
        // 에러 로깅 (프로덕션에서는 에러 리포팅 서비스로 전송)
        if (process.env.NODE_ENV !== 'production') {
            console.error('ErrorBoundary caught an error:', error, errorInfo)
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
        this.props.onReset?.()
    }

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            // 커스텀 fallback이 있으면 사용
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset)
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center">
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-toss-gray-900 mb-2">
                            문제가 발생했습니다
                        </h2>
                        <p className="text-toss-gray-500 mb-6">
                            {this.props.message || '페이지를 표시하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
                        </p>

                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm text-toss-gray-500 hover:text-toss-gray-700">
                                    오류 상세 정보
                                </summary>
                                <pre className="mt-2 p-3 bg-toss-gray-100 rounded-lg text-xs overflow-auto text-red-600">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={this.handleReset}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <RefreshCw size={16} />
                                다시 시도
                            </Button>
                            <Button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2"
                            >
                                <Home size={16} />
                                홈으로
                            </Button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
