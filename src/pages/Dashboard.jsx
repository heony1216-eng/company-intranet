import { useAuth } from '../hooks/useAuth'
import { Card, Modal } from '../components/common'
import { AlertTriangle, MapPin, Phone, User, Calendar, FileText, X, ClipboardList, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
    const { profile, isAdmin } = useAuth()
    const [rescueCount, setRescueCount] = useState(0)
    const [recentNotices, setRecentNotices] = useState([])
    const [activeRescues, setActiveRescues] = useState([])
    const [selectedRescue, setSelectedRescue] = useState(null)
    const [isRescueModalOpen, setIsRescueModalOpen] = useState(false)

    // 업무일지 미작성 알림 상태
    const [worklogAlerts, setWorklogAlerts] = useState({
        daily: false,
        weekly: false,
        monthly: false
    })

    useEffect(() => {
        fetchRescueCount()
        fetchRecentNotices()
        fetchActiveRescues()
        if (profile?.user_id) {
            checkWorklogStatus()
        }
    }, [profile?.user_id])

    // 업무일지 작성 여부 확인
    const checkWorklogStatus = async () => {
        if (!profile?.user_id) return

        const now = new Date()
        const currentHour = now.getHours()
        const dayOfWeek = now.getDay() // 0: 일, 1: 월, ..., 5: 금, 6: 토
        const today = now.toISOString().split('T')[0]

        const alerts = { daily: false, weekly: false, monthly: false }

        // 1. 일일 업무일지: 평일 오후 3시 이후
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && currentHour >= 15) {
            const { data: dailyLog } = await supabase
                .from('work_logs')
                .select('id')
                .eq('user_id', profile.user_id)
                .eq('type', 'daily')
                .eq('work_date', today)
                .limit(1)
                .maybeSingle()

            if (!dailyLog) {
                alerts.daily = true
            }
        }

        // 2. 주간 업무일지: 금요일 오후 3시 이후
        if (dayOfWeek === 5 && currentHour >= 15) {
            // 이번 주 월요일 찾기
            const monday = new Date(now)
            monday.setDate(now.getDate() - (dayOfWeek - 1))
            const mondayStr = monday.toISOString().split('T')[0]

            // 이번 주 금요일
            const friday = new Date(now)
            const fridayStr = friday.toISOString().split('T')[0]

            const { data: weeklyLog } = await supabase
                .from('work_logs')
                .select('id')
                .eq('user_id', profile.user_id)
                .eq('type', 'weekly')
                .gte('work_date', mondayStr)
                .lte('work_date', fridayStr)
                .limit(1)
                .maybeSingle()

            if (!weeklyLog) {
                alerts.weekly = true
            }
        }

        // 3. 월간 업무일지: 월말 마지막 날 오후 3시 이후
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        if (now.getDate() === lastDayOfMonth && currentHour >= 15) {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const monthEnd = today

            const { data: monthlyLog } = await supabase
                .from('work_logs')
                .select('id')
                .eq('user_id', profile.user_id)
                .eq('type', 'monthly')
                .gte('work_date', monthStart)
                .lte('work_date', monthEnd)
                .limit(1)
                .maybeSingle()

            if (!monthlyLog) {
                alerts.monthly = true
            }
        }

        setWorklogAlerts(alerts)
    }

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
                .select('*')
                .eq('is_completed', false)
                .order('created_at', { ascending: false })
                .limit(10)

            setActiveRescues(data || [])
        } catch (error) {
            console.error('Error fetching rescues:', error)
        }
    }

    const handleRescueClick = (rescue) => {
        setSelectedRescue(rescue)
        setIsRescueModalOpen(true)
    }

    const closeRescueModal = () => {
        setIsRescueModalOpen(false)
        setSelectedRescue(null)
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

            {/* 업무일지 미작성 알림 */}
            {(worklogAlerts.daily || worklogAlerts.weekly || worklogAlerts.monthly) && (
                <Card className="bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={20} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-amber-800 mb-2">업무일지 작성이 필요합니다</h3>
                            <div className="space-y-2">
                                {worklogAlerts.daily && (
                                    <Link
                                        to="/worklogs/daily"
                                        className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ClipboardList size={16} className="text-amber-600" />
                                            <span className="text-sm text-amber-800">오늘 일일 업무일지 미작성</span>
                                        </div>
                                        <span className="text-xs text-amber-600 font-medium">작성하기 →</span>
                                    </Link>
                                )}
                                {worklogAlerts.weekly && (
                                    <Link
                                        to="/worklogs/weekly"
                                        className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ClipboardList size={16} className="text-amber-600" />
                                            <span className="text-sm text-amber-800">이번 주 주간 업무일지 미작성</span>
                                        </div>
                                        <span className="text-xs text-amber-600 font-medium">작성하기 →</span>
                                    </Link>
                                )}
                                {worklogAlerts.monthly && (
                                    <Link
                                        to="/worklogs/monthly"
                                        className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ClipboardList size={16} className="text-amber-600" />
                                            <span className="text-sm text-amber-800">이번 달 월간 업무일지 미작성</span>
                                        </div>
                                        <span className="text-xs text-amber-600 font-medium">작성하기 →</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

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
                                <div
                                    key={rescue.id}
                                    onClick={() => handleRescueClick(rescue)}
                                    className="block p-3 rounded-lg hover:bg-toss-gray-50 transition-colors border border-toss-gray-100 cursor-pointer"
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
                                </div>
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

            {/* Rescue Detail Modal (읽기 전용) */}
            <Modal
                isOpen={isRescueModalOpen}
                onClose={closeRescueModal}
                title="구조현황 상세"
            >
                {selectedRescue && (
                    <div className="space-y-4">
                        {/* 기본 정보 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-toss-gray-400" />
                                <div>
                                    <p className="text-xs text-toss-gray-500">이름</p>
                                    <p className="font-medium text-toss-gray-900">{selectedRescue.name || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-toss-gray-400" />
                                <div>
                                    <p className="text-xs text-toss-gray-500">위치</p>
                                    <p className="font-medium text-toss-gray-900">{selectedRescue.location || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={16} className="text-toss-gray-400" />
                                <div>
                                    <p className="text-xs text-toss-gray-500">연락처</p>
                                    <p className="font-medium text-toss-gray-900">{selectedRescue.contact || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-toss-gray-400" />
                                <div>
                                    <p className="text-xs text-toss-gray-500">요청일</p>
                                    <p className="font-medium text-toss-gray-900">{selectedRescue.request_date || '-'}</p>
                                </div>
                            </div>
                        </div>

                        {/* 동물 정보 */}
                        {(selectedRescue.animal_type || selectedRescue.animal_count) && (
                            <div className="p-3 bg-toss-gray-50 rounded-lg">
                                <p className="text-xs text-toss-gray-500 mb-1">동물 정보</p>
                                <p className="text-toss-gray-900">
                                    {selectedRescue.animal_type || '-'}
                                    {selectedRescue.animal_count && ` (${selectedRescue.animal_count}마리)`}
                                </p>
                            </div>
                        )}

                        {/* 현재 상태 */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={16} className="text-toss-gray-400" />
                                <p className="text-sm font-medium text-toss-gray-700">현재 상태</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-lg">
                                <p className="text-toss-gray-900 whitespace-pre-wrap">{selectedRescue.status || '상태 정보 없음'}</p>
                            </div>
                        </div>

                        {/* 비고 */}
                        {selectedRescue.notes && (
                            <div>
                                <p className="text-sm font-medium text-toss-gray-700 mb-2">비고</p>
                                <div className="p-3 bg-toss-gray-50 rounded-lg">
                                    <p className="text-toss-gray-900 whitespace-pre-wrap">{selectedRescue.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* 구조 페이지로 이동 */}
                        <div className="pt-4 border-t border-toss-gray-100">
                            <Link
                                to="/rescue"
                                onClick={closeRescueModal}
                                className="block w-full text-center py-3 bg-toss-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                구조현황 페이지로 이동
                            </Link>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default Dashboard
