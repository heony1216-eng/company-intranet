import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { WeatherProvider } from '../../hooks/WeatherContext'

const Layout = () => {
    return (
        <WeatherProvider>
            {/* overflow-x-clip: hidden과 달리 스크롤 컨테이너를 만들지 않아 헤더 sticky가 유지된다 */}
            <div className="min-h-screen bg-toss-gray-50 overflow-x-clip">
                <Sidebar />
                {/* px-safe: 가로 모드에서 카메라 노치 영역을 피한다 */}
                <div className="lg:ml-64 min-h-screen px-safe">
                    <Header />
                    {/* 아래쪽은 내비게이션바(안전 영역)만큼 더 띄운다 */}
                    <main className="p-4 lg:p-8 pb-[calc(1rem+var(--sab))] lg:pb-[calc(2rem+var(--sab))] overflow-x-clip">
                        <Outlet />
                    </main>
                </div>
            </div>
        </WeatherProvider>
    )
}

export default Layout
