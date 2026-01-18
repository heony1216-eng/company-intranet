import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import NoticePage from './pages/NoticePage'
import WorkLogPage from './pages/WorkLogPage'
import WeeklyWorkLogPage from './pages/WeeklyWorkLogPage'
import MonthlyWorkLogPage from './pages/MonthlyWorkLogPage'
import RescuePage from './pages/RescuePage'
import MeetingPage from './pages/MeetingPage'
import EventPage from './pages/EventPage'
import MyPage from './pages/MyPage'
import DocumentPage from './pages/DocumentPage'
import AdminPage from './pages/AdminPage'

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-toss-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-toss-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-toss-gray-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-toss-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-toss-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/notices" element={<NoticePage />} />
        <Route path="/notices/:id" element={<NoticePage />} />
        <Route path="/events" element={<EventPage />} />
        <Route path="/worklogs" element={<Navigate to="/worklogs/daily" replace />} />
        <Route path="/worklogs/daily" element={<WorkLogPage />} />
        <Route path="/worklogs/weekly" element={<WeeklyWorkLogPage />} />
        <Route path="/worklogs/monthly" element={<MonthlyWorkLogPage />} />
        <Route path="/rescue" element={<RescuePage />} />
        <Route path="/meetings" element={<MeetingPage />} />
        <Route path="/document" element={<DocumentPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/mypage" element={<MyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
