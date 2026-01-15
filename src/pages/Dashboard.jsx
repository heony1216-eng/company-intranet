import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/common'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
    const { profile, isAdmin } = useAuth()
    const [rescueCount, setRescueCount] = useState(0)
    const [recentNotices, setRecentNotices] = useState([])
    const [activeRescues, setActiveRescues] = useState([])

    useEffect(() => {
        fetchRescueCount()
        fetchRecentNotices()
        fetchActiveRescues()
    }, [])

    const fetchRescueCount = async () => {
        try {
            const { count } = await supabase
                .from('rescue_situations')
                .select('id', { count: 'exact' })
                .eq('is_completed', false)
            setRescueCount(count || 0)
        } catch (error) {
            console.error('Error fetching rescue count:', error)
        }
    }

    const fetchActiveRescues = async () => {
        try {
            const { data } = await supabase
                .from('rescue_situations')
                .select('id, location, name, status, request_date')
                .eq('is_completed', false)
                .order('created_at', { ascending: false })
                .limit(10)

            setActiveRescues(data || [])
        } catch (error) {
            console.error('Error fetching rescues:', error)
        }
    }

    const fetchRecentNotices = async () => {
        try {
            const { data } = await supabase
                .from('notices')
                .select('id, title, created_at, is_pinned')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(5)

            setRecentNotices(data || [])
        } catch (error) {
            console.error('Error fetching notices:', error)
        }
    }

    return (
        <div className="space-y-6">
            {/* User Profile Card */}
            <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold">
                            {profile?.name?.charAt(0) || 'U'}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-1">
                            안녕하세요, {profile?.name || '사용자'}님!
                            {isAdmin && (
                                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                                    관리자
                                </span>
                            )}
                        </h2>
                        <p className="text-white/80">
                            {profile?.team && `${profile.team} · `}
                            {profile?.position || '직책 미설정'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Rescue Situations */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-orange-500" />
                            <h3 className="text-base font-bold text-toss-gray-900">진행중인 구조현황</h3>
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                {rescueCount}건
                            </span>
                        </div>
                        <Link to="/rescue" className="text-sm text-toss-blue hover:underline">
                            전체보기
                        </Link>
                    </div>

                    {activeRescues.length > 0 ? (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto">
                            {activeRescues.map((rescue) => (
                                <Link
                                    key={rescue.id}
                                    to="/rescue"
                                    className="block p-3 rounded-lg hover:bg-toss-gray-50 transition-colors border border-toss-gray-100"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-toss-gray-900 text-sm">{rescue.name}</p>
                                            <span className="text-toss-gray-300">|</span>
                                            <p className="text-sm text-toss-gray-600">{rescue.location}</p>
                                        </div>
                                        <p className="text-xs text-toss-gray-400">{rescue.request_date || '-'}</p>
                                    </div>
                                    <p className="text-sm text-toss-gray-700 line-clamp-2">{rescue.status || '-'}</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-toss-gray-500 py-8 text-sm">
                            진행중인 구조현황이 없습니다
                        </p>
                    )}
                </Card>

                {/* Recent Notices */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-toss-gray-900">최근 공지사항</h3>
                        <Link to="/notices" className="text-sm text-toss-blue hover:underline">
                            전체보기
                        </Link>
                    </div>

                    {recentNotices.length > 0 ? (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto">
                            {recentNotices.map((notice) => (
                                <Link
                                    key={notice.id}
                                    to={`/notices/${notice.id}`}
                                    className="block p-3 rounded-lg hover:bg-toss-gray-50 transition-colors border border-toss-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        {notice.is_pinned && (
                                            <span className="text-xs bg-toss-blue text-white px-2 py-0.5 rounded-full">
                                                고정
                                            </span>
                                        )}
                                        <p className="font-medium text-toss-gray-900 flex-1 truncate text-sm">
                                            {notice.title}
                                        </p>
                                    </div>
                                    <p className="text-xs text-toss-gray-400 mt-1">
                                        {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-toss-gray-500 py-8 text-sm">
                            등록된 공지사항이 없습니다
                        </p>
                    )}
                </Card>
            </div>
        </div>
    )
}

export default Dashboard
