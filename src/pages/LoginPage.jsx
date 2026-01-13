import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Card } from '../components/common'
import { Mail, Lock, ArrowRight } from 'lucide-react'

const LoginPage = () => {
    const [mode, setMode] = useState('user') // 'user' or 'admin'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const { signInWithMagicLink, signInWithPassword } = useAuth()
    const navigate = useNavigate()

    const handleUserLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        const { error } = await signInWithMagicLink(email)

        if (error) {
            setError(error.message)
        } else {
            setMessage('로그인 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요!')
        }
        setLoading(false)
    }

    const handleAdminLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await signInWithPassword(email, password)

        if (error) {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        } else {
            navigate('/')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-toss-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-toss-gray-900 mb-2">
                        <span className="text-toss-blue">사내</span> 인트라넷
                    </h1>
                    <p className="text-toss-gray-500">업무를 더 편리하게</p>
                </div>

                {/* Login Card */}
                <Card className="mb-4">
                    {/* Tab Switch */}
                    <div className="flex mb-6 bg-toss-gray-100 p-1 rounded-toss">
                        <button
                            onClick={() => setMode('user')}
                            className={`flex-1 py-2 px-4 rounded-toss text-sm font-medium transition-all ${mode === 'user'
                                    ? 'bg-white text-toss-gray-900 shadow-sm'
                                    : 'text-toss-gray-500'
                                }`}
                        >
                            일반 로그인
                        </button>
                        <button
                            onClick={() => setMode('admin')}
                            className={`flex-1 py-2 px-4 rounded-toss text-sm font-medium transition-all ${mode === 'admin'
                                    ? 'bg-white text-toss-gray-900 shadow-sm'
                                    : 'text-toss-gray-500'
                                }`}
                        >
                            관리자 로그인
                        </button>
                    </div>

                    {mode === 'user' ? (
                        /* Magic Link Login */
                        <form onSubmit={handleUserLogin} className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="이메일 주소"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-toss-gray-100 border-0 rounded-toss text-toss-gray-900 placeholder-toss-gray-500 focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 p-3 rounded-toss">{error}</p>
                            )}

                            {message && (
                                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-toss">{message}</p>
                            )}

                            <Button type="submit" className="w-full" loading={loading}>
                                이메일로 로그인 링크 받기
                                <ArrowRight size={18} />
                            </Button>
                        </form>
                    ) : (
                        /* Admin Password Login */
                        <form onSubmit={handleAdminLogin} className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="관리자 이메일"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-toss-gray-100 border-0 rounded-toss text-toss-gray-900 placeholder-toss-gray-500 focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                                />
                            </div>

                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호"
                                required
                            />

                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 p-3 rounded-toss">{error}</p>
                            )}

                            <Button type="submit" className="w-full" loading={loading}>
                                로그인
                                <ArrowRight size={18} />
                            </Button>
                        </form>
                    )}
                </Card>

                {/* Helper Text */}
                <p className="text-center text-sm text-toss-gray-500">
                    {mode === 'user'
                        ? '이메일을 통해 안전하게 로그인하세요'
                        : '관리자 계정으로 로그인합니다'
                    }
                </p>
            </div>
        </div>
    )
}

export default LoginPage
