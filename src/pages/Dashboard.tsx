import { useAuth } from '../hooks/useAuth'
import { Card, Modal } from '../components/common'
import {
    AlertTriangle, MapPin, Phone, User, Calendar, FileText, ClipboardList, AlertCircle,
    Megaphone, CalendarDays, Building2, Globe, BookOpen, ChevronRight, Clock,
    Sun, Cloud
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// 진행중 구조현황 레코드
interface RescueSituation {
    id: string | number
    name?: string
    location?: string
    contact?: string
    request_date?: string
    status?: string
    notes?: string
    animal_type?: string
    animal_count?: number
}

// 회의록 레코드
interface Meeting {
    id: string | number
    title?: string
    meeting_date: string
}

// 일정 레코드
interface EventItem {
    id: string | number
    title: string
    event_date: string
    start_time?: string
    end_time?: string
    location?: string
}

const Dashboard = () => {
    const { profile, isAdmin } = useAuth()
    const [rescueCount, setRescueCount] = useState(0)
    const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([])
    const [weekEvents, setWeekEvents] = useState<EventItem[]>([])
    const [activeRescues, setActiveRescues] = useState<RescueSituation[]>([])
    const [selectedRescue, setSelectedRescue] = useState<RescueSituation | null>(null)
    const [isRescueModalOpen, setIsRescueModalOpen] = useState(false)

    // 업무일지 미작성 알림 상태
    const [worklogAlerts, setWorklogAlerts] = useState({
        daily: false,
        weekly: false,
        monthly: false
    })

    useEffect(() => {
        fetchRescueCount()
        fetchRecentMeetings()
        fetchWeekEvents()
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

    // 회의록 최신순
    const fetchRecentMeetings = async () => {
        try {
            const { data } = await supabase
                .from('meetings')
                .select('id, title, meeting_date')
                .order('meeting_date', { ascending: false })
                .limit(6)

            setRecentMeetings(data || [])
        } catch (error) {
            console.error('Error fetching meetings:', error)
        }
    }

    // 이번 주(월~일) 일정
    const fetchWeekEvents = async () => {
        try {
            const base = new Date()
            const monday = new Date(base)
            monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
            const sunday = new Date(monday)
            sunday.setDate(monday.getDate() + 6)
            const mondayStr = monday.toISOString().split('T')[0]
            const sundayStr = sunday.toISOString().split('T')[0]

            const { data } = await supabase
                .from('events')
                .select('id, title, event_date, start_time, end_time, location')
                .gte('event_date', mondayStr)
                .lte('event_date', sundayStr)
                .neq('event_type', 'leave')
                .order('event_date', { ascending: true })
                .order('start_time', { ascending: true })

            setWeekEvents(data || [])
        } catch (error) {
            console.error('Error fetching week events:', error)
        }
    }

    const handleRescueClick = (rescue: RescueSituation) => {
        setSelectedRescue(rescue)
        setIsRescueModalOpen(true)
    }

    const closeRescueModal = () => {
        setIsRescueModalOpen(false)
        setSelectedRescue(null)
    }

    // 오늘 날짜 (한국어)
    const todayLabel = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    })

    // 퀵 액션 (실제 라우트 링크)
    const quickActions = [
        { to: '/notices', icon: Megaphone, label: '공지사항' },
        { to: '/events', icon: CalendarDays, label: '일정' },
        { to: '/worklogs/daily', icon: ClipboardList, label: '업무보고' },
        { to: '/rescue', icon: AlertTriangle, label: '구조현황' },
        { to: '/admission/ganghwa', icon: Building2, label: '입소현황' },
        { to: '/overseas-korean/status', icon: Globe, label: '재외동포현황' },
        { to: '/document-ledger', icon: BookOpen, label: '수·발신대장' },
    ]

    // 이번 주 날짜 스트립 (일정 있는 날 표시)
    const weekStrip = Array.from({ length: 7 }, (_, i) => {
        const base = new Date()
        const monday = new Date(base)
        monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = d.toISOString().split('T')[0]
        return {
            day: d.getDate(),
            label: ['월', '화', '수', '목', '금', '토', '일'][i],
            isToday: d.toDateString() === base.toDateString(),
            hasEvent: weekEvents.some((e) => e.event_date === dateStr),
        }
    })

    // 날씨 (정적 placeholder - 강화도 / 인천 부평구)
    const weatherList = [
        { name: '강화도', temp: 22, condition: '맑음', icon: Sun, iconColor: 'text-amber-400' },
        { name: '인천 부평구', temp: 24, condition: '구름조금', icon: Cloud, iconColor: 'text-toss-gray-400' },
    ]

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\.$/, '')

    const eventDayLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        return `${d.getMonth() + 1}/${d.getDate()}(${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`
    }

    return (
        <div className="space-y-6">
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
                                    <Link to="/worklogs/daily" className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList size={16} className="text-amber-600" />
                                            <span className="text-sm text-amber-800">오늘 일일 업무일지 미작성</span>
                                        </div>
                                        <span className="text-xs text-amber-600 font-medium">작성하기 →</span>
                                    </Link>
                                )}
                                {worklogAlerts.weekly && (
                                    <Link to="/worklogs/weekly" className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <ClipboardList size={16} className="text-amber-600" />
                                            <span className="text-sm text-amber-800">이번 주 주간 업무일지 미작성</span>
                                        </div>
                                        <span className="text-xs text-amber-600 font-medium">작성하기 →</span>
                                    </Link>
                                )}
                                {worklogAlerts.monthly && (
                                    <Link to="/worklogs/monthly" className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-amber-100 transition-colors">
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

            {/* 인사말 + 배너 */}
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-stretch">
                <div className="flex flex-col justify-center">
                    <h2 className="text-2xl font-bold text-toss-gray-900 leading-snug">
                        {profile?.name || '사용자'}님,
                        <br />좋은 하루 보내세요!
                    </h2>
                    <p className="mt-3 text-sm text-toss-gray-400">{todayLabel}</p>
                    {isAdmin && (
                        <span className="mt-2 inline-block w-fit text-xs bg-toss-blue/10 text-toss-blue px-2 py-0.5 rounded-full">
                            관리자
                        </span>
                    )}
                </div>
                <div className="relative overflow-hidden rounded-toss-lg bg-gradient-to-br from-toss-blue to-blue-700 text-white p-8 min-h-[180px] flex flex-col justify-center">
                    <h3 className="text-2xl lg:text-3xl font-bold leading-tight">
                        We build the<br />future together
                    </h3>
                    <p className="mt-3 text-white/70 text-sm">함께 만들어가는 한인구조단</p>
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full" />
                    <div className="absolute right-10 top-6 w-20 h-20 bg-white/10 rounded-full" />
                </div>
            </div>

            {/* 퀵 액션 아이콘 그리드 */}
            <Card padding="p-5">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {quickActions.map((action) => (
                        <Link
                            key={action.to}
                            to={action.to}
                            className="flex flex-col items-center gap-2 py-3 rounded-toss hover:bg-toss-gray-50 transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-toss bg-toss-gray-100 flex items-center justify-center text-toss-gray-700 group-hover:bg-toss-blue/10 group-hover:text-toss-blue transition-colors">
                                <action.icon size={22} />
                            </div>
                            <span className="text-xs text-toss-gray-700 text-center">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </Card>

            {/* 회의록 + 진행중 구조현황 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 회의록 (최신순) */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-toss-gray-900">회의록</h3>
                        <Link to="/meetings" className="text-sm text-toss-gray-400 hover:text-toss-blue flex items-center gap-0.5">
                            더보기 <ChevronRight size={14} />
                        </Link>
                    </div>
                    {recentMeetings.length > 0 ? (
                        <ul className="divide-y divide-toss-gray-100">
                            {recentMeetings.map((m) => (
                                <li key={m.id}>
                                    <Link to="/meetings" className="flex items-center justify-between gap-3 py-2.5 group">
                                        <span className="text-sm text-toss-gray-700 truncate group-hover:text-toss-blue">{m.title || '제목 없음'}</span>
                                        <span className="text-xs text-toss-gray-400 flex-shrink-0">{formatDate(m.meeting_date)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-toss-gray-400 py-10 text-sm">등록된 회의록이 없습니다</p>
                    )}
                </Card>

                {/* 진행중 구조현황 */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-orange-500" />
                            <h3 className="text-base font-bold text-toss-gray-900">진행중인 구조현황</h3>
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">{rescueCount}건</span>
                        </div>
                        <Link to="/rescue" className="text-sm text-toss-gray-400 hover:text-toss-blue flex items-center gap-0.5">
                            더보기 <ChevronRight size={14} />
                        </Link>
                    </div>
                    {activeRescues.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto">
                            {activeRescues.map((rescue) => (
                                <div
                                    key={rescue.id}
                                    onClick={() => handleRescueClick(rescue)}
                                    className="block p-3 rounded-toss hover:bg-toss-gray-50 transition-colors border border-toss-gray-100 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="font-medium text-toss-gray-900 text-sm truncate">{rescue.name}</p>
                                            <span className="text-toss-gray-300">|</span>
                                            <p className="text-sm text-toss-gray-600 truncate">{rescue.location}</p>
                                        </div>
                                        <p className="text-xs text-toss-gray-400 flex-shrink-0">{rescue.request_date || '-'}</p>
                                    </div>
                                    <p className="text-sm text-toss-gray-700 line-clamp-2">{rescue.status || '-'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-toss-gray-400 py-10 text-sm">진행중인 구조현황이 없습니다</p>
                    )}
                </Card>
            </div>

            {/* My Schedule + 날씨 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Schedule (이번 주 일정) */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-toss-gray-900">My Schedule</h3>
                        <Link to="/events" className="text-sm text-toss-gray-400 hover:text-toss-blue flex items-center gap-0.5">
                            일정추가 <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="flex justify-between mb-4">
                        {weekStrip.map((d) => (
                            <div
                                key={d.day}
                                className={`relative flex flex-col items-center justify-center w-9 h-12 rounded-toss text-xs ${d.isToday ? 'bg-toss-blue text-white font-bold' : 'text-toss-gray-500'}`}
                            >
                                <span className="text-[15px] font-semibold">{d.day}</span>
                                <span className="text-[10px] mt-0.5">{d.label}</span>
                                {d.hasEvent && (
                                    <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${d.isToday ? 'bg-white' : 'bg-toss-blue'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                    {weekEvents.length > 0 ? (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                            {weekEvents.map((e) => (
                                <Link
                                    key={e.id}
                                    to="/events"
                                    className="flex items-center gap-3 p-2.5 rounded-toss border border-toss-gray-100 hover:bg-toss-gray-50 transition-colors"
                                >
                                    <span className="text-xs font-semibold text-toss-blue w-14 flex-shrink-0">{eventDayLabel(e.event_date)}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm text-toss-gray-800 truncate">{e.title}</span>
                                        {(e.start_time || e.location) && (
                                            <span className="flex items-center gap-2 text-xs text-toss-gray-400 mt-0.5">
                                                {e.start_time && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={11} />
                                                        {e.start_time}{e.end_time && ` ~ ${e.end_time}`}
                                                    </span>
                                                )}
                                                {e.location && (
                                                    <span className="flex items-center gap-1 truncate">
                                                        <MapPin size={11} />{e.location}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-toss-gray-400 py-8 text-sm">이번 주 일정이 없습니다</p>
                    )}
                </Card>

                {/* 오늘의 날씨 (강화도 / 인천 부평구) */}
                <Card>
                    <h3 className="text-base font-bold text-toss-gray-900 mb-4">오늘의 날씨</h3>
                    <div className="space-y-3">
                        {weatherList.map((w) => (
                            <div key={w.name} className="flex items-center justify-between p-4 rounded-toss bg-toss-gray-50">
                                <div>
                                    <p className="text-sm font-semibold text-toss-gray-700">{w.name}</p>
                                    <p className="text-xs text-toss-gray-400 mt-0.5">{w.condition}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-baseline gap-0.5">
                                        <span className="text-3xl font-bold text-toss-gray-900">{w.temp}</span>
                                        <span className="text-base text-toss-gray-500">℃</span>
                                    </span>
                                    <w.icon size={36} className={w.iconColor} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* 구조현황 상세 모달 (읽기 전용) */}
            <Modal isOpen={isRescueModalOpen} onClose={closeRescueModal} title="구조현황 상세">
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
