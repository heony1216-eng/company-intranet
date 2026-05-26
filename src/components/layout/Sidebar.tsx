import { NavLink } from 'react-router-dom'
import {
    Megaphone, ClipboardList, Home, X, User, AlertTriangle, Calendar, CalendarDays,
    ExternalLink, ChevronDown, BookOpen, Palmtree, Smartphone, Building2, Globe, Phone, Menu, Tag
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// 사이드바 메뉴 타입 정의
type IconType = typeof Home

interface NavLeaf {
    to: string
    icon?: IconType
    label: string
    badge?: string | number | null
    badgeTone?: 'gray' | 'red'
}

interface MenuGroup {
    title: string | null
    items: NavLeaf[]
}

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [systemOpen, setSystemOpen] = useState(true)
    // 입소현황 현재 입소 인원 (정원 없이 현재 인원만)
    const [admissionCounts, setAdmissionCounts] = useState<{ ganghwa: number | null; bupyeong: number | null }>({
        ganghwa: null,
        bupyeong: null,
    })
    // 올해 구조 인원
    const [rescueThisYear, setRescueThisYear] = useState<number | null>(null)

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const [g, b] = await Promise.all([
                    supabase.from('admission_records').select('id', { count: 'exact', head: true }).eq('is_discharged', false),
                    supabase.from('bupyeong_admission_records').select('id', { count: 'exact', head: true }).eq('is_discharged', false),
                ])
                setAdmissionCounts({ ganghwa: g.count ?? null, bupyeong: b.count ?? null })
            } catch (error) {
                console.error('Error fetching admission counts:', error)
            }
        }
        fetchCounts()

        const fetchRescueYear = async () => {
            try {
                const { data } = await supabase
                    .from('rescue_summary_stats')
                    .select('stat_key, stat_value')
                    .eq('stat_key', 'this_year')
                    .maybeSingle()
                setRescueThisYear(data?.stat_value ?? null)
            } catch (error) {
                console.error('Error fetching rescue year count:', error)
            }
        }
        fetchRescueYear()
    }, [])

    // 그룹별 메뉴 (실제 라우트 유지, 스크린샷처럼 섹션으로 펼침)
    const menuGroups: MenuGroup[] = [
        {
            title: null,
            items: [{ to: '/', icon: Home, label: '대시보드' }],
        },
        {
            title: '공지 · 일정',
            items: [
                { to: '/notices', icon: Megaphone, label: '공지사항' },
                { to: '/meetings', icon: Calendar, label: '회의록' },
                { to: '/events', icon: CalendarDays, label: '일정' },
            ],
        },
        {
            title: '업무보고',
            items: [
                { to: '/worklogs/daily', icon: ClipboardList, label: '일일 업무보고' },
                { to: '/worklogs/weekly', icon: ClipboardList, label: '주간 업무보고' },
                { to: '/worklogs/monthly', icon: ClipboardList, label: '월간 업무보고' },
            ],
        },
        {
            title: '입소현황',
            items: [
                { to: '/admission/ganghwa', icon: Building2, label: '강화센터', badge: admissionCounts.ganghwa != null ? `${admissionCounts.ganghwa}명` : null, badgeTone: 'gray' },
                { to: '/admission/bupyeong', icon: Building2, label: '부평센터', badge: admissionCounts.bupyeong != null ? `${admissionCounts.bupyeong}명` : null, badgeTone: 'gray' },
                { to: '/admission/nametag', icon: Tag, label: '네임택 출력' },
            ],
        },
        {
            title: '구조 · 동포',
            items: [
                { to: '/rescue', icon: AlertTriangle, label: '구조현황', badge: rescueThisYear != null ? `${rescueThisYear}명` : null, badgeTone: 'gray' },
                { to: '/overseas-korean/status', icon: Globe, label: '재외동포현황' },
            ],
        },
        {
            title: '자료 · 소통',
            items: [
                { to: '/document-ledger', icon: BookOpen, label: '수·발신대장' },
                { to: '/contacts', icon: Phone, label: '연락처' },
            ],
        },
        {
            title: '인사 · 복지',
            items: [{ to: '/mypage', icon: User, label: '마이페이지' }],
        },
    ]

    const leaveManagementLink = {
        href: 'https://leave-management-68t.pages.dev/status',
        icon: Palmtree,
        label: '연차 관리',
        tooltip: '원하시는 분은 관리자에게 문의바랍니다.',
    }

    const externalLinks = [
        { href: 'https://heony1216-eng.github.io/rescue-board/', label: '구조요청서' },
        { href: 'https://login.ecount.com/', label: '이카운트' },
        { href: 'https://www.dropbox.com/home', label: '드롭박스' },
        { href: 'https://auth.worksmobile.com/login/login?accessUrl=https%3A%2F%2Fdrive.worksmobile.com%2Fdrive%2Fweb%2Fmy%3FresourceKey%3Droot&isRefreshed=true', label: '네이버드라이브' },
    ]

    // 배지
    const Badge = ({ value, tone }: { value: string | number; tone?: 'gray' | 'red' }) => (
        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tone === 'red' ? 'bg-red-500 text-white' : 'bg-white/10 text-toss-gray-300'
            }`}>
            {value}
        </span>
    )

    // 단일 네비 항목
    const NavItem = ({ to, icon: Icon, label, badge, badgeTone }: NavLeaf) => (
        <NavLink
            to={to}
            end={to === '/'}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-toss text-sm transition-all ${isActive
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-toss-gray-300 hover:bg-white/5'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    {Icon && <Icon size={18} className={isActive ? 'text-toss-blue-light' : 'text-toss-gray-400'} />}
                    <span className="flex-1 truncate">{label}</span>
                    {badge != null && badge !== '' && <Badge value={badge} tone={badgeTone} />}
                </>
            )}
        </NavLink>
    )

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-toss shadow-toss"
                aria-label="메뉴 열기"
            >
                <Menu className="w-6 h-6 text-toss-gray-700" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-[#0d1a2a] border-r border-white/10 z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0 shadow-toss-lg' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* 로고 영역 */}
                <div className="flex items-center justify-between px-5 h-[73px] border-b border-white/10 flex-shrink-0">
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-white leading-tight truncate">한인구조단</h1>
                        <p className="text-[11px] font-medium text-toss-gray-500 tracking-wider">KOREAN RESCUE ORGANIZATION</p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-toss-gray-500"
                        aria-label="메뉴 닫기"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="px-3 py-4 flex-1 overflow-y-auto sidebar-scroll">
                    {/* 앱 다운로드 버튼 */}
                    <a
                        href="https://www.dropbox.com/scl/fi/vz0zmnbpr1kfzw2w3fu6g/.apk?rlkey=lp7l2m97ssh1nixykcjxwiaqf&st=m08bikmg&dl=1"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded-toss text-sm transition-all bg-white/10 text-toss-gray-200 hover:bg-white/20"
                    >
                        <Smartphone size={18} />
                        <span className="font-medium">앱 다운로드</span>
                    </a>

                    {menuGroups.map((group, gi) => (
                        <div key={group.title ?? `group-${gi}`} className={group.title ? 'mt-5' : ''}>
                            {group.title && (
                                <p className="px-3 mb-1.5 text-xs font-semibold text-toss-gray-500 tracking-wide">
                                    {group.title}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map((item) => <NavItem key={item.to} {...item} />)}

                                {/* 인사·복지 그룹에 연차 관리(외부, 툴팁) 포함 */}
                                {group.title === '인사 · 복지' && (
                                    <div className="relative group">
                                        <a
                                            href={leaveManagementLink.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-toss text-sm transition-all text-toss-gray-300 hover:bg-white/5"
                                        >
                                            <leaveManagementLink.icon size={18} className="text-toss-gray-400" />
                                            <span>{leaveManagementLink.label}</span>
                                        </a>
                                        <div className="absolute bottom-full left-3 mb-2 px-3 py-2 bg-toss-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            {leaveManagementLink.tooltip}
                                            <div className="absolute top-full left-4 border-4 border-transparent border-t-toss-gray-900" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* 시스템 바로가기 (외부 링크, 접기/펴기) */}
                    <div className="mt-5">
                        <button
                            onClick={() => setSystemOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 mb-1.5 text-xs font-semibold text-toss-gray-500 tracking-wide"
                        >
                            <span>시스템 바로가기</span>
                            <ChevronDown
                                size={14}
                                className={`transition-transform ${systemOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {systemOpen && (
                            <div className="space-y-0.5">
                                {externalLinks.map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-toss text-sm transition-all text-toss-gray-300 hover:bg-white/5"
                                    >
                                        <ExternalLink size={18} className="text-toss-gray-400" />
                                        <span>{item.label}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </nav>
            </aside>
        </>
    )
}

export default Sidebar
