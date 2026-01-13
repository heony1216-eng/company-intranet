import { useAuth } from '../hooks/useAuth'
import { Card } from '../components/common'
import { Megaphone, ClipboardList, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
    const { profile, isAdmin } = useAuth()
    const [stats, setStats] = useState({
        notices: 0,
        worklogs: 0,
        users: 0
    })
    const [recentNotices, setRecentNotices] = useState([])

    useEffect(() => {
        fetchStats()
        fetchRecentNotices()
    }, [])

    const fetchStats = async () => {
        try {
            const [noticesRes, worklogsRes, usersRes] = await Promise.all([
                supabase.from('notices').select('id', { count: 'exact' }),
                supabase.from('work_logs').select('id', { count: 'exact' }),
                supabase.from('users').select('id', { count: 'exact' })
            ])

            setStats({
                notices: noticesRes.count || 0,
                worklogs: worklogsRes.count || 0,
                users: usersRes.count || 0
            })
        } catch (error) {
            console.error('Error fetching stats:', error)
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

    const statCards = [
        { icon: Megaphone, label: '공지사항', value: stats.notices, color: 'bg-blue-500', link: '/notices' },
        { icon: ClipboardList, label: '업무일지', value: stats.worklogs, color: 'bg-green-500', link: '/worklogs' },
        { icon: Users, label: '사용자', value: stats.users, color: 'bg-purple-500', link: null },
    ]

    return (
        <div className="space-y-6">
            {/* User Profile Card */}
            <Card className="bg-toss-blue text-white">
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

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((stat, index) => (
                    <Link key={index} to={stat.link || '#'}>
                        <Card className="hover:shadow-toss-lg transition-shadow cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${stat.color} rounded-toss flex items-center justify-center`}>
                                    <stat.icon size={24} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm text-toss-gray-500">{stat.label}</p>
                                    <p className="text-2xl font-bold text-toss-gray-900">{stat.value}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Recent Notices */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-toss-gray-900">최근 공지사항</h3>
                    <Link to="/notices" className="text-sm text-toss-blue hover:underline">
                        전체보기
                    </Link>
                </div>

                {recentNotices.length > 0 ? (
                    <div className="space-y-3">
                        {recentNotices.map((notice) => (
                            <Link
                                key={notice.id}
                                to={`/notices/${notice.id}`}
                                className="block p-3 rounded-toss hover:bg-toss-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {notice.is_pinned && (
                                        <span className="text-xs bg-toss-blue text-white px-2 py-0.5 rounded-full">
                                            고정
                                        </span>
                                    )}
                                    <p className="font-medium text-toss-gray-900 flex-1 truncate">
                                        {notice.title}
                                    </p>
                                    <span className="text-sm text-toss-gray-400">
                                        {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-toss-gray-500 py-8">
                        등록된 공지사항이 없습니다
                    </p>
                )}
            </Card>
        </div>
    )
}

export default Dashboard
