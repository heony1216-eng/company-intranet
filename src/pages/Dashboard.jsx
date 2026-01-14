import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/common'
import { Megaphone, ClipboardList, Users, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
    const { profile, isAdmin } = useAuth()
    const [stats, setStats] = useState({
        notices: 0,
        worklogs: 0,
        users: 0,
        rescues: 0
    })
    const [recentNotices, setRecentNotices] = useState([])
    const [activeRescues, setActiveRescues] = useState([])

    useEffect(() => {
        fetchStats()
        fetchRecentNotices()
        fetchActiveRescues()
    }, [])

    const fetchStats = async () => {
        try {
            const [noticesRes, worklogsRes, usersRes, rescuesRes] = await Promise.all([
                supabase.from('notices').select('id', { count: 'exact' }),
                supabase.from('work_logs').select('id', { count: 'exact' }).neq('type', 'rescue'),
                supabase.from('users').select('id', { count: 'exact' }),
                supabase.from('rescue_situations').select('id', { count: 'exact' }).eq('is_completed', false)
            ])

            setStats({
                notices: noticesRes.count || 0,
                worklogs: worklogsRes.count || 0,
                users: usersRes.count || 0,
                rescues: rescuesRes.count || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
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

            {/* 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Stats */}
                <div className="space-y-4">
                    <Link to="/notices" className="block">
                        <Card>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Megaphone size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-toss-gray-600">공지사항</p>
                                    <p className="text-2xl font-bold text-toss-gray-900">{stats.notices}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to="/worklogs" className="block">
                        <Card>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                    <ClipboardList size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-toss-gray-600">업무일지</p>
                                    <p className="text-2xl font-bold text-toss-gray-900">{stats.worklogs}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                                <Users size={24} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-toss-gray-600">사용자</p>
                                <p className="text-2xl font-bold text-toss-gray-900">{stats.users}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Center Column - Active Rescue Situations */}
                <Card className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-orange-500" />
                            <h3 className="text-base font-bold text-toss-gray-900">진행중인 구조현황</h3>
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                {stats.rescues}건
                            </span>
                        </div>
                        <Link to="/rescue" className="text-sm text-toss-blue hover:underline">
                            전체보기
                        </Link>
                    </div>

                    {activeRescues.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto">
                            {activeRescues.map((rescue) => (
                                <Link
                                    key={rescue.id}
                                    to="/rescue"
                                    className="block p-3 rounded-lg hover:bg-toss-gray-50 transition-colors border border-toss-gray-100"
                                >
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-toss-gray-900 text-sm">{rescue.name}</p>
                                        <span className="text-toss-gray-300">|</span>
                                        <p className="text-sm text-toss-gray-600 flex-1">{rescue.location}</p>
                                        <p className="text-xs text-toss-gray-700">{rescue.status || '-'}</p>
                                    </div>
                                    <p className="text-xs text-toss-gray-400 mt-1">{rescue.request_date || '-'}</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-toss-gray-500 py-8 text-sm">
                            진행중인 구조현황이 없습니다
                        </p>
                    )}
                </Card>

                {/* Right Column - Recent Notices */}
                <Card className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-toss-gray-900">최근 공지사항</h3>
                        <Link to="/notices" className="text-sm text-toss-blue hover:underline">
                            전체보기
                        </Link>
                    </div>

                    {recentNotices.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto">
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
