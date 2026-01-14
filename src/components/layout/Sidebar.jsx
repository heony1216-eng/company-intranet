import { NavLink } from 'react-router-dom'
import { Megaphone, ClipboardList, Home, X, User, FileText, AlertTriangle, Calendar, ExternalLink } from 'lucide-react'
import { useState } from 'react'

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false)

    const navItems = [
        { to: '/', icon: Home, label: '대시보드' },
        { to: '/notices', icon: Megaphone, label: '공지사항' },
        { to: '/worklogs', icon: ClipboardList, label: '업무일지' },
        { to: '/rescue', icon: AlertTriangle, label: '구조현황' },
        { to: '/meetings', icon: Calendar, label: '회의록' },
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
                        <NavItem key={item.to} {...item} />
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
