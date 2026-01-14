import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card, Button } from '../components/common'
import { User, Briefcase, Users, ArrowLeft, Check, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

const MyPage = () => {
    const { profile, updateProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        rank: '',
        team: ''
    })

    // profile이 로드되면 formData 초기화
    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                rank: profile.rank || '',
                team: profile.team || ''
            })
        }
    }, [profile])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            alert('이름을 입력해주세요.')
            return
        }

        setLoading(true)
        setSuccess(false)

        try {
            const { error } = await updateProfile(formData)

            if (!error) {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            } else {
                alert('프로필 저장에 실패했습니다.')
            }
        } catch (error) {
            console.error('Profile update error:', error)
            alert('프로필 저장 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-toss-gray-500 hover:text-toss-gray-700 transition-colors"
            >
                <ArrowLeft size={20} />
                대시보드로 돌아가기
            </Link>

            {/* Header Card */}
            <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl font-bold">
                            {formData.name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-1">마이페이지</h1>
                        <p className="text-white/90 flex items-center gap-2">
                            <Mail size={16} />
                            {profile?.email || '로딩 중...'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Edit Form Card */}
            <Card>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-toss-gray-900">개인정보 수정</h2>
                    <p className="text-sm text-toss-gray-500 mt-1">
                        업무일지 및 공지사항에 표시될 정보를 수정할 수 있습니다
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-toss-gray-700 mb-2">
                            <User size={16} />
                            이름 *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-toss-gray-900 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="이름을 입력하세요"
                            required
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-toss-gray-700 mb-2">
                            <Users size={16} />
                            팀명
                        </label>
                        <input
                            type="text"
                            value={formData.team}
                            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-toss-gray-900 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="팀명을 입력하세요 (예: 기획팀, 개발팀)"
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-toss-gray-700 mb-2">
                            <Briefcase size={16} />
                            직급
                        </label>
                        <input
                            type="text"
                            value={formData.rank}
                            onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-toss-gray-900 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="직급을 입력하세요 (예: 과장, 대리, 팀장)"
                        />
                    </div>

                    {success && (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <Check size={20} />
                            <span className="font-medium">프로필이 성공적으로 저장되었습니다</span>
                        </div>
                    )}

                    <Button type="submit" className="w-full" loading={loading} disabled={loading || !formData.name.trim()}>
                        {loading ? '저장 중...' : '저장하기'}
                    </Button>
                </form>
            </Card>

            {/* Info Card */}
            <Card className="bg-toss-gray-50">
                <div className="space-y-2">
                    <h3 className="font-bold text-toss-gray-900 mb-3">안내사항</h3>
                    <p className="text-sm text-toss-gray-600 leading-relaxed">
                        • 이름은 필수 항목입니다
                    </p>
                    <p className="text-sm text-toss-gray-600 leading-relaxed">
                        • 팀명과 직급은 선택 사항이며, 업무일지 작성 시 표시됩니다
                    </p>
                </div>
            </Card>
        </div>
    )
}

export default MyPage
