import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button, Card } from '../components/common'
import { Mail, Lock, User, Briefcase, Award, ArrowRight, ArrowLeft } from 'lucide-react'

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        id: '',
        password: '',
        confirmPassword: '',
        name: '',
        position: '',  // 직책
        rank: ''       // 직급
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.')
            setLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError('비밀번호는 6자 이상이어야 합니다.')
            setLoading(false)
            return
        }

        const { error } = await signUp({
            id: formData.id,
            password: formData.password,
            name: formData.name,
            position: formData.position,
            rank: formData.rank
        })

        if (error) {
            setError(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.')
        } else {
            setSuccess(true)
            setTimeout(() => {
                navigate('/login')
            }, 2000)
        }
        setLoading(false)
    }

    const inputClasses = "w-full pl-12 pr-4 py-3 bg-toss-gray-100 border-0 rounded-toss text-toss-gray-900 placeholder-toss-gray-500 focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"

    return (
        <div className="min-h-screen bg-toss-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-toss-gray-900 mb-2">
                        <span className="text-toss-blue">사내</span> 인트라넷
                    </h1>
                    <p className="text-toss-gray-500">회원가입</p>
                </div>

                {/* Register Card */}
                <Card className="mb-4">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-toss-gray-900 mb-2">가입 완료!</h2>
                            <p className="text-toss-gray-500">로그인 페이지로 이동합니다...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* ID */}
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="text"
                                    name="id"
                                    value={formData.id}
                                    onChange={handleChange}
                                    placeholder="아이디 *"
                                    required
                                    className={inputClasses}
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="비밀번호 * (6자 이상)"
                                    required
                                    className={inputClasses}
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="비밀번호 확인 *"
                                    required
                                    className={inputClasses}
                                />
                            </div>

                            {/* Divider */}
                            <div className="border-t border-toss-gray-200 pt-4" />

                            {/* Name */}
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="이름 *"
                                    required
                                    className={inputClasses}
                                />
                            </div>

                            {/* Position (직책) */}
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="text"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                    placeholder="직책 (예: 개발팀장)"
                                    className={inputClasses}
                                />
                            </div>

                            {/* Rank (직급) */}
                            <div className="relative">
                                <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" size={20} />
                                <input
                                    type="text"
                                    name="rank"
                                    value={formData.rank}
                                    onChange={handleChange}
                                    placeholder="직급 (예: 대리, 과장)"
                                    className={inputClasses}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 p-3 rounded-toss">{error}</p>
                            )}

                            <Button type="submit" className="w-full" loading={loading}>
                                회원가입
                                <ArrowRight size={18} />
                            </Button>
                        </form>
                    )}
                </Card>

                {/* Back to Login */}
                <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 text-sm text-toss-gray-500 hover:text-toss-blue transition-colors"
                >
                    <ArrowLeft size={16} />
                    로그인으로 돌아가기
                </Link>
            </div>
        </div>
    )
}

export default RegisterPage
