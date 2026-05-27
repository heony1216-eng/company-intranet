import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { WeatherProvider } from '../../hooks/WeatherContext'

const Layout = () => {
    return (
        <WeatherProvider>
            <div className="min-h-screen bg-toss-gray-50 overflow-x-hidden">
                <Sidebar />
                <div className="lg:ml-64 min-h-screen">
                    <Header />
                    <main className="p-4 lg:p-8 overflow-x-hidden">
                        <Outlet />
                    </main>
                </div>
            </div>
        </WeatherProvider>
    )
}

export default Layout
