import { NavLink, useLocation } from 'react-router-dom'
import {
    Megaphone, ClipboardList, Home, X, User, AlertTriangle, Calendar, CalendarDays,
    ExternalLink, ChevronDown, BookOpen, Palmtree, Smartphone, Building2, Globe, Phone, Menu
} from 'lucide-react'
import { useState, useEffect } from 'react'

// 사이드바 메뉴 타입 정의
type IconType = typeof Home

interface NavLeaf {
    to: string
    icon?: IconType
    label: string
}

interface NavSubmenu {
    icon: IconType
    label: string
    isSubmenu: true
    menuKey: string
    pathPrefix: string
    subItems: { to: string; label: string }[]
}

type NavEntry = NavLeaf | NavSubmenu

interface MenuGroup {
    title: string | null
    items: NavEntry[]
}

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState<Record<string, boolean>>({ system: true })
    const location = useLocation()

    const toggleMenu = (key: string) => {
        setMenuOpen(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // 관련 페이지에 있으면 서브메뉴 열기
    useEffect(() => {
        if (location.pathname.startsWith('/worklogs')) {
            setMenuOpen(prev => ({ ...prev, worklogs: true }))
        }
        if (location.pathname.startsWith('/admission')) {
            setMenuOpen(prev => ({ ...prev, admission: true }))
        }
        if (location.pathname.startsWith('/overseas-korean')) {
            setMenuOpen(prev => ({ ...prev, overseasKorean: true }))
        }
    }, [location.pathname])

    // 그룹별 메뉴 구성 (실제 라우트/메뉴 유지, 스크린샷 스타일로 섹션 그룹화)
    const menuGroups: MenuGroup[] = [
        {
            title: null,
            items: [
                { to: '/', icon: Home, label: '대시보드' },
            ],
        },
        {
            title: '업무',
            items: [
                { to: '/notices', icon: Megaphone, label: '공지사항' },
                { to: '/events', icon: CalendarDays, label: '일정' },
                {
                    icon: ClipboardList,
                    label: '업무보고',
                    isSubmenu: true,
                    menuKey: 'worklogs',
                    pathPrefix: '/worklogs',
                    subItems: [
                        { to: '/worklogs/daily', label: '일일 업무보고' },
                        { to: '/worklogs/weekly', label: '주간 업무보고' },
                        { to: '/worklogs/monthly', label: '월간 업무보고' },
                    ],
                },
                { to: '/meetings', icon: Calendar, label: '회의록' },
            ],
        },
        {
            title: '구조 · 입소',
            items: [
                { to: '/rescue', icon: AlertTriangle, label: '구조현황' },
                {
                    icon: Building2,
                    label: '입소현황',
                    isSubmenu: true,
                    menuKey: 'admission',
                    pathPrefix: '/admission',
                    subItems: [
                        { to: '/admission/ganghwa', label: '강화센터' },
                        { to: '/admission/bupyeong', label: '부평센터' },
                        { to: '/admission/nametag', label: '네임택 출력' },
                    ],
                },
                { to: '/overseas-korean/status', icon: Globe, label: '재외동포현황' },
            ],
        },
        {
            title: '자료 · 소통',
            items: [
                { to: '/contacts', icon: Phone, label: '연락처' },
                { to: '/document-ledger', icon: BookOpen, label: '수·발신대장' },
            ],
        },
        {
            title: '인사 · 복지',
            items: [
                { to: '/mypage', icon: User, label: '마이페이지' },
            ],
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

    // 단일 네비 항목
    const NavItem = ({ to, icon: Icon, label }: NavLeaf) => (
        <NavLink
            to={to}
            end={to === '/'}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-toss text-sm transition-all ${isActive
                    ? 'bg-toss-blue text-white font-semibold shadow-toss'
                    : 'text-toss-gray-700 hover:bg-toss-gray-100'
                }`
            }
        >
            {Icon && <Icon size={18} />}
            <span>{label}</span>
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
                className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-toss-gray-100 z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0 shadow-toss-lg' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* 로고 영역 */}
                <div className="flex items-center justify-between px-6 h-[73px] border-b border-toss-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="한인구조단" className="w-8 h-8 object-contain" />
                        <h1 className="text-lg font-extrabold tracking-tight">
                            <span className="text-toss-blue">한인구조단</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-toss-gray-500"
                        aria-label="메뉴 닫기"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="px-3 py-4 flex-1 overflow-y-auto">
                    {/* 앱 다운로드 버튼 */}
                    <a
                        href="https://www.dropbox.com/scl/fi/vz0zmnbpr1kfzw2w3fu6g/.apk?rlkey=lp7l2m97ssh1nixykcjxwiaqf&st=m08bikmg&dl=1"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded-toss text-sm transition-all bg-toss-gray-100 text-toss-gray-600 hover:bg-toss-gray-200"
                    >
                        <Smartphone size={18} />
                        <span className="font-medium">앱 다운로드</span>
                    </a>

                    {menuGroups.map((group, gi) => (
                        <div key={group.title ?? `group-${gi}`} className={group.title ? 'mt-5' : ''}>
                            {group.title && (
                                <p className="px-3 mb-1.5 text-xs font-semibold text-toss-gray-400 tracking-wide">
                                    {group.title}
                                </p>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    'isSubmenu' in item ? (
                                        <div key={item.label}>
                                            <button
                                                onClick={() => toggleMenu(item.menuKey)}
                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-toss text-sm transition-all ${location.pathname.startsWith(item.pathPrefix)
                                                    ? 'bg-toss-blue/10 text-toss-blue font-semibold'
                                                    : 'text-toss-gray-700 hover:bg-toss-gray-100'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon size={18} />
                                                    <span>{item.label}</span>
                                                </div>
                                                <ChevronDown
                                                    size={15}
                                                    className={`transition-transform ${menuOpen[item.menuKey] ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                            {menuOpen[item.menuKey] && (
                                                <div className="ml-3 mt-0.5 pl-3 border-l border-toss-gray-100 space-y-0.5">
                                                    {item.subItems.map((subItem) => (
                                                        <NavLink
                                                            key={subItem.to}
                                                            to={subItem.to}
                                                            onClick={() => setIsOpen(false)}
                                                            className={({ isActive }) =>
                                                                `flex items-center gap-2.5 px-3 py-2 rounded-toss text-sm transition-all ${isActive
                                                                    ? 'text-toss-blue font-semibold bg-toss-blue/5'
                                                                    : 'text-toss-gray-500 hover:text-toss-gray-900 hover:bg-toss-gray-100'
                                                                }`
                                                            }
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                                            <span>{subItem.label}</span>
                                                        </NavLink>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <NavItem key={item.to} {...item} />
                                    )
                                ))}

                                {/* 인사·복지 그룹에 연차 관리(외부, 툴팁) 포함 */}
                                {group.title === '인사 · 복지' && (
                                    <div className="relative group">
                                        <a
                                            href={leaveManagementLink.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-toss text-sm transition-all text-toss-gray-700 hover:bg-toss-gray-100"
                                        >
                                            <leaveManagementLink.icon size={18} />
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
                            onClick={() => toggleMenu('system')}
                            className="w-full flex items-center justify-between px-3 mb-1.5 text-xs font-semibold text-toss-gray-400 tracking-wide"
                        >
                            <span>시스템 바로가기</span>
                            <ChevronDown
                                size={14}
                                className={`transition-transform ${menuOpen.system ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {menuOpen.system && (
                            <div className="space-y-0.5">
                                {externalLinks.map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-toss text-sm transition-all text-toss-gray-700 hover:bg-toss-gray-100"
                                    >
                                        <ExternalLink size={18} />
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
