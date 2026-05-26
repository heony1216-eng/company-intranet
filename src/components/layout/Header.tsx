import { useAuth } from '../../hooks/useAuth'
import {
    LogOut, User, Search, Bell, Bookmark, Megaphone, Calendar, CalendarDays,
    AlertTriangle, Building2, Phone, BookOpen
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

type SearchType = 'notice' | 'meeting' | 'event' | 'rescue' | 'admission' | 'contact' | 'ledger'

// 통합 검색 결과 항목
interface SearchResult {
    type: SearchType
    id: string | number
    title: string
    date?: string
    to: string
}

// 검색 대상 테이블 정의 (RLS로 접근 가능한 데이터만 반환됨)
interface SearchSource {
    type: SearchType
    table: string
    cols: string[]      // 검색할 컬럼들
    titleCol: string    // 제목으로 표시할 컬럼
    dateCol?: string    // 정렬/표시 날짜 컬럼
    to: (row: any) => string
}

const SEARCH_SOURCES: SearchSource[] = [
    { type: 'notice', table: 'notices', cols: ['title', 'content'], titleCol: 'title', dateCol: 'created_at', to: (r) => `/notices/${r.id}` },
    { type: 'meeting', table: 'meetings', cols: ['title', 'content', 'participants'], titleCol: 'title', dateCol: 'meeting_date', to: () => '/meetings' },
    { type: 'event', table: 'events', cols: ['title', 'description', 'location'], titleCol: 'title', dateCol: 'event_date', to: () => '/events' },
    { type: 'rescue', table: 'rescue_situations', cols: ['name', 'location', 'status', 'details'], titleCol: 'name', dateCol: 'request_date', to: () => '/rescue' },
    // 입소현황은 센터별로 테이블/컬럼이 다름
    // 강화: admission_records (ganghwa=성명, bupyeong=성별, location=국가)
    { type: 'admission', table: 'admission_records', cols: ['ganghwa', 'location', 'room', 'notes', 'admin_status'], titleCol: 'ganghwa', dateCol: 'admission_date', to: () => '/admission/ganghwa' },
    // 부평: bupyeong_admission_records (name=성명, nationality=국가, gender=성별)
    { type: 'admission', table: 'bupyeong_admission_records', cols: ['name', 'nationality', 'room', 'notes', 'admin_status'], titleCol: 'name', dateCol: 'admission_date', to: () => '/admission/bupyeong' },
    { type: 'contact', table: 'contacts', cols: ['name', 'department', 'position', 'phone', 'email', 'memo'], titleCol: 'name', to: () => '/contacts' },
    { type: 'ledger', table: 'document_ledger', cols: ['content', 'doc_number', 'receiver_org', 'sender_org', 'note'], titleCol: 'content', to: () => '/document-ledger' },
]

// 알림(최근 공지) 항목
interface NotiItem {
    id: string | number
    title: string
    created_at: string
}

const Header = () => {
    const { profile, signOut, isAdmin } = useAuth()
    const navigate = useNavigate()

    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [searchOpen, setSearchOpen] = useState(false)
    const [searching, setSearching] = useState(false)

    const [notiOpen, setNotiOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotiItem[]>([])

    const searchRef = useRef<HTMLDivElement>(null)
    const notiRef = useRef<HTMLDivElement>(null)

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    // 최근 공지사항 → 알림으로 표시
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data } = await supabase
                    .from('notices')
                    .select('id, title, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5)
                setNotifications(data || [])
            } catch (error) {
                console.error('Error fetching notifications:', error)
            }
        }
        fetchNotifications()
    }, [])

    // 통합 검색 (공지사항 / 회의록 / 일정) - 디바운스
    useEffect(() => {
        const q = query.trim()
        if (!q) {
            setResults([])
            setSearching(false)
            return
        }
        setSearching(true)
        const timer = setTimeout(async () => {
            // PostgREST or() 필터를 깨뜨리는 문자 제거
            const safe = q.replace(/[,()%*\\]/g, ' ').trim()
            if (!safe) {
                setResults([])
                setSearching(false)
                return
            }
            // PostgREST or() 필터에서는 와일드카드로 %가 아닌 *를 사용
            const orFilter = (cols: string[]) => cols.map((c) => `${c}.ilike.*${safe}*`).join(',')

            // 모든 테이블 동시 검색 (개별 실패는 무시)
            const settled = await Promise.allSettled(
                SEARCH_SOURCES.map((src) => {
                    let query = supabase.from(src.table).select('*').or(orFilter(src.cols)).limit(4)
                    if (src.dateCol) query = query.order(src.dateCol, { ascending: false })
                    return query
                })
            )

            const merged: SearchResult[] = []
            settled.forEach((res, i) => {
                if (res.status !== 'fulfilled' || res.value.error || !res.value.data) return
                const src = SEARCH_SOURCES[i]
                res.value.data.forEach((row: any) => {
                    merged.push({
                        type: src.type,
                        id: row.id,
                        title: String(row[src.titleCol] ?? '').trim() || '(제목 없음)',
                        date: src.dateCol ? row[src.dateCol] : undefined,
                        to: src.to(row),
                    })
                })
            })
            setResults(merged)
            setSearching(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
            if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const goToResult = (to: string) => {
        setSearchOpen(false)
        setQuery('')
        setResults([])
        navigate(to)
    }

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (results.length > 0) goToResult(results[0].to)
    }

    const typeMeta: Record<SearchType, { label: string; icon: typeof Megaphone }> = {
        notice: { label: '공지', icon: Megaphone },
        meeting: { label: '회의록', icon: Calendar },
        event: { label: '일정', icon: CalendarDays },
        rescue: { label: '구조', icon: AlertTriangle },
        admission: { label: '입소', icon: Building2 },
        contact: { label: '연락처', icon: Phone },
        ledger: { label: '수발신', icon: BookOpen },
    }

    const formatDate = (d?: string) =>
        d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''

    return (
        <header className="bg-white border-b border-toss-gray-100 sticky top-0 z-30">
            <div className="flex items-center gap-4 px-4 lg:px-8 h-[73px]">
                <div className="lg:hidden w-10" /> {/* 모바일 메뉴 버튼 자리 */}

                {/* 통합 검색 */}
                <div ref={searchRef} className="flex-1 max-w-xl relative">
                    <form onSubmit={handleSearchSubmit}>
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setSearchOpen(true) }}
                                onFocus={() => setSearchOpen(true)}
                                placeholder="공지·회의록·일정·구조·입소·연락처·수발신 통합검색"
                                className="w-full pl-11 pr-4 py-2.5 bg-toss-gray-100 border-0 rounded-full text-sm text-toss-gray-900 placeholder-toss-gray-400 focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
                            />
                        </div>
                    </form>

                    {/* 검색 결과 드롭다운 */}
                    {searchOpen && query.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-toss-lg shadow-toss-lg border border-toss-gray-100 py-2 max-h-[400px] overflow-y-auto z-50">
                            {searching ? (
                                <p className="px-4 py-6 text-center text-sm text-toss-gray-400">검색 중...</p>
                            ) : results.length > 0 ? (
                                results.map((r) => {
                                    const Meta = typeMeta[r.type]
                                    return (
                                        <button
                                            key={`${r.type}-${r.id}`}
                                            onClick={() => goToResult(r.to)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-toss-gray-50 text-left transition-colors"
                                        >
                                            <span className="w-8 h-8 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0 text-toss-gray-500">
                                                <Meta.icon size={16} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-2">
                                                    <span className="text-[10px] text-toss-blue bg-toss-blue/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{Meta.label}</span>
                                                    <span className="text-sm text-toss-gray-800 truncate">{r.title}</span>
                                                </span>
                                                {r.date && <span className="block text-xs text-toss-gray-400 mt-0.5">{formatDate(r.date)}</span>}
                                            </span>
                                        </button>
                                    )
                                })
                            ) : (
                                <p className="px-4 py-6 text-center text-sm text-toss-gray-400">검색 결과가 없습니다</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                    {/* 알림 */}
                    <div ref={notiRef} className="relative">
                        <button
                            onClick={() => setNotiOpen((v) => !v)}
                            className="relative p-2.5 text-toss-gray-500 hover:text-toss-gray-900 hover:bg-toss-gray-100 rounded-full transition-all"
                            title="알림"
                        >
                            <Bell size={20} />
                            {notifications.length > 0 && (
                                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {notifications.length}
                                </span>
                            )}
                        </button>

                        {/* 알림 드롭다운 */}
                        {notiOpen && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-toss-lg shadow-toss-lg border border-toss-gray-100 py-2 z-50">
                                <div className="px-4 py-2 border-b border-toss-gray-100">
                                    <p className="font-bold text-sm text-toss-gray-900">알림 · 최근 공지</p>
                                </div>
                                {notifications.length > 0 ? (
                                    <div className="max-h-[360px] overflow-y-auto">
                                        {notifications.map((n) => (
                                            <button
                                                key={n.id}
                                                onClick={() => { setNotiOpen(false); navigate(`/notices/${n.id}`) }}
                                                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-toss-gray-50 text-left transition-colors"
                                            >
                                                <span className="w-8 h-8 rounded-full bg-toss-blue/10 flex items-center justify-center flex-shrink-0 text-toss-blue">
                                                    <Megaphone size={15} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm text-toss-gray-800 truncate">{n.title}</span>
                                                    <span className="block text-xs text-toss-gray-400 mt-0.5">{formatDate(n.created_at)}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="px-4 py-6 text-center text-sm text-toss-gray-400">새로운 알림이 없습니다</p>
                                )}
                                <div className="px-4 pt-2 border-t border-toss-gray-100">
                                    <button
                                        onClick={() => { setNotiOpen(false); navigate('/notices') }}
                                        className="w-full text-center text-sm text-toss-blue py-1.5 hover:underline"
                                    >
                                        공지사항 전체보기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 즐겨찾기 */}
                    <button
                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-toss-gray-600 hover:text-toss-gray-900 hover:bg-toss-gray-100 rounded-full transition-all"
                        title="즐겨찾기"
                    >
                        <Bookmark size={18} />
                        <span className="hidden md:inline">즐겨찾기</span>
                    </button>

                    <div className="w-px h-6 bg-toss-gray-200 mx-1 hidden sm:block" />

                    {/* 사용자 프로필 */}
                    <div className="flex items-center gap-3 pl-1">
                        <div className="w-10 h-10 bg-toss-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={20} className="text-toss-blue" />
                        </div>
                        <div className="hidden sm:block leading-tight">
                            <p className="font-semibold text-toss-gray-900 text-sm">
                                {profile?.name || '사용자'}
                                {isAdmin && (
                                    <span className="ml-2 text-xs bg-toss-blue text-white px-2 py-0.5 rounded-full align-middle">
                                        관리자
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-toss-gray-500">
                                {profile?.team && `${profile.team} · `}
                                {profile?.rank || ''}
                            </p>
                        </div>
                    </div>

                    {/* 로그아웃 */}
                    <button
                        onClick={handleSignOut}
                        className="p-2.5 text-toss-gray-500 hover:text-toss-gray-900 hover:bg-toss-gray-100 rounded-full transition-all"
                        title="로그아웃"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    )
}

export default Header
