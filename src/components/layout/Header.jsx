import { useAuth } from '../../hooks/useAuth'
import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Header = () => {
    const { profile, signOut, isAdmin } = useAuth()
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <header className="bg-white shadow-toss sticky top-0 z-30">
            <div className="flex items-center justify-between px-4 lg:px-8 py-4">
                <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}

                <div className="flex items-center gap-4 ml-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-toss-blue/10 rounded-full flex items-center justify-center">
                            <User size={20} className="text-toss-blue" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="font-semibold text-toss-gray-900">
                                {profile?.name || '사용자'}
                                {isAdmin && (
                                    <span className="ml-2 text-xs bg-toss-blue text-white px-2 py-0.5 rounded-full">
                                        관리자
                                    </span>
                                )}
                            </p>
                            <p className="text-sm text-toss-gray-500">
                                {profile?.team && `${profile.team} · `}
                                {profile?.rank || ''}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="p-2 text-toss-gray-500 hover:text-toss-gray-700 hover:bg-toss-gray-100 rounded-toss transition-all"
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
