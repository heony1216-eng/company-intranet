import { NavLink, useLocation } from 'react-router-dom'
import { Megaphone, ClipboardList, Home, X, User, FileText, AlertTriangle, Calendar, CalendarDays, ExternalLink, ChevronDown, Settings, FolderOpen, BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const Sidebar = () => {
    const { isAdmin, isSubAdmin } = useAuth()
    const canManageLeave = isAdmin || isSubAdmin
    const [isOpen, setIsOpen] = useState(false)
    const [worklogOpen, setWorklogOpen] = useState(false)
    const [archiveOpen, setArchiveOpen] = useState(false)
    const location = useLocation()

    // 업무보고 관련 페이지에 있으면 서브메뉴 열기
    useEffect(() => {
        if (location.pathname.startsWith('/worklogs')) {
            setWorklogOpen(true)
        }
        if (location.pathname.startsWith('/archive')) {
            setArchiveOpen(true)
        }
    }, [location.pathname])

    const navItems = [
        { to: '/', icon: Home, label: '대시보드' },
        { to: '/notices', icon: Megaphone, label: '공지사항' },
        { to: '/events', icon: CalendarDays, label: '일정' },
        {
            icon: ClipboardList,
            label: '업무보고',
            isSubmenu: true,
            subItems: [
                { to: '/worklogs/daily', label: '일일 업무보고' },
                { to: '/worklogs/weekly', label: '주간 업무보고' },
                { to: '/worklogs/monthly', label: '월간 업무보고' },
            ]
        },
        { to: '/rescue', icon: AlertTriangle, label: '구조현황' },
        { to: '/meetings', icon: Calendar, label: '회의록' },
        { to: '/document', icon: FileText, label: '기안서' },
        { to: '/document-ledger', icon: BookOpen, label: '수·발신대장' },
        // 자료실 - 비활성화 (나중에 부활 시 주석 해제)
        // {
        //     icon: FolderOpen,
        //     label: '자료실',
        //     isSubmenu: true,
        //     menuKey: 'archive',
        //     subItems: [
        //         { to: '/archive/forms', label: '양식' },
        //         { to: '/archive/rescue', label: '문서' },
        //     ]
        // },
        ...(canManageLeave ? [{ to: '/admin', icon: Settings, label: '관리' }] : []),
        { to: '/mypage', icon: User, label: '마이페이지' },
    ]

    const externalLinks = [
        { href: 'https://heony1216-eng.github.io/rescue-board/', icon: ExternalLink, label: '구조요청서' },
        { href: 'https://login.ecount.com/', icon: ExternalLink, label: '이카운트' },
        { href: 'https://www.dropbox.com/home', icon: ExternalLink, label: '드롭박스' },
        { href: 'https://auth.worksmobile.com/login/login?accessUrl=https%3A%2F%2Fdrive.worksmobile.com%2Fdrive%2Fweb%2Fmy%3FresourceKey%3Droot&isRefreshed=true', icon: ExternalLink, label: '네이버드라이브' },
    ]

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-toss transition-all ${isActive
                    ? 'bg-toss-blue text-white'
                    : 'text-toss-gray-900 hover:bg-toss-blue/10 hover:text-toss-blue'
                }`
            }
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </NavLink>
    )

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-toss shadow-toss"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
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
                className={`fixed top-0 left-0 h-full w-64 bg-white shadow-toss-lg z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex items-center justify-between p-6 border-b border-toss-gray-100">
                    <h1 className="text-xl font-bold text-toss-gray-900">
                        <span className="text-toss-blue">한인구조단</span> 인트라넷
                    </h1>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-toss-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-4 space-y-2">
                    {navItems.map((item) => (
                        item.isSubmenu ? (
                            <div key={item.label}>
                                <button
                                    onClick={() => {
                                        if (item.menuKey === 'archive') {
                                            setArchiveOpen(!archiveOpen)
                                        } else {
                                            setWorklogOpen(!worklogOpen)
                                        }
                                    }}
                                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-toss transition-all ${
                                        (item.menuKey === 'archive' ? location.pathname.startsWith('/archive') : location.pathname.startsWith('/worklogs'))
                                            ? 'bg-toss-blue/10 text-toss-blue'
                                            : 'text-toss-gray-900 hover:bg-toss-blue/10 hover:text-toss-blue'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform ${(item.menuKey === 'archive' ? archiveOpen : worklogOpen) ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {(item.menuKey === 'archive' ? archiveOpen : worklogOpen) && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        {item.subItems.map((subItem) => (
                                            <NavLink
                                                key={subItem.to}
                                                to={subItem.to}
                                                onClick={() => setIsOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-2 rounded-toss transition-all text-sm ${
                                                        isActive
                                                            ? 'bg-toss-blue text-white'
                                                            : 'text-toss-gray-700 hover:bg-toss-blue/10 hover:text-toss-blue'
                                                    }`
                                                }
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                <span className="font-medium">{subItem.label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <NavItem key={item.to} {...item} />
                        )
                    ))}

                    {/* 외부 링크 */}
                    <div className="pt-4 mt-4 border-t border-toss-gray-100">
                        {externalLinks.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-toss transition-all text-toss-gray-900 hover:bg-toss-blue/10 hover:text-toss-blue"
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </a>
                        ))}
                    </div>
                </nav>
            </aside>
        </>
    )
}

export default Sidebar
