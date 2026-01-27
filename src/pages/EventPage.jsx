import { useState, useEffect } from 'react'
import { Card, Button, Modal } from '../components/common'
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Clock, Plus, Edit3, Trash2, X, Settings, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// 색상 옵션 목록
const COLOR_OPTIONS = [
    { key: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    { key: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    { key: 'green', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    { key: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    { key: 'red', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    { key: 'orange', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    { key: 'gray', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
    { key: 'pink', bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
    { key: 'teal', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
    { key: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' }
]

// 기본 일정 유형 (DB에 없을 경우 사용)
const DEFAULT_EVENT_TYPES = {
    general: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: '일반' },
    meeting: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: '회의' },
    training: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: '교육' },
    rescue: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: '구조' },
    holiday: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: '휴일' },
    event: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', label: '행사' },
    leave: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500', label: '휴가' },
    other: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', label: '기타' }
}

const EventPage = () => {
    const { user, isAdmin } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [events, setEvents] = useState([])
    const [recentEvents, setRecentEvents] = useState([])
    const [holidays, setHolidays] = useState({})
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        location: '',
        description: '',
        event_type: 'general',
        start_time: '',
        end_time: ''
    })

    // 일정 유형 관리
    const [eventTypes, setEventTypes] = useState(DEFAULT_EVENT_TYPES)
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
    const [typeFormData, setTypeFormData] = useState({ key: '', label: '', color: 'blue' })
    const [editingTypeKey, setEditingTypeKey] = useState(null)

    // 알림 모달
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'info' })
    const showAlert = (message, type = 'info') => {
        setAlertModal({ isOpen: true, message, type })
    }

    // 일정 유형 불러오기
    const fetchEventTypes = async () => {
        try {
            const { data } = await supabase
                .from('event_types')
                .select('*')
                .order('created_at')

            if (data && data.length > 0) {
                const typesObj = {}
                data.forEach(type => {
                    const colorOption = COLOR_OPTIONS.find(c => c.key === type.color) || COLOR_OPTIONS[0]
                    typesObj[type.key] = {
                        bg: colorOption.bg,
                        text: colorOption.text,
                        dot: colorOption.dot,
                        label: type.label
                    }
                })
                setEventTypes(typesObj)
            }
        } catch (error) {
            console.error('Error fetching event types:', error)
            // DB 테이블이 없으면 기본값 사용
        }
    }

    // 일정 유형 저장
    const handleSaveType = async () => {
        if (!typeFormData.key.trim() || !typeFormData.label.trim()) {
            showAlert('유형 코드와 이름을 입력해주세요.', 'error')
            return
        }

        try {
            if (editingTypeKey) {
                // 수정
                await supabase
                    .from('event_types')
                    .update({
                        label: typeFormData.label,
                        color: typeFormData.color,
                        updated_at: new Date().toISOString()
                    })
                    .eq('key', editingTypeKey)
            } else {
                // 새로 추가
                await supabase
                    .from('event_types')
                    .insert({
                        key: typeFormData.key.toLowerCase().replace(/\s/g, '_'),
                        label: typeFormData.label,
                        color: typeFormData.color
                    })
            }

            await fetchEventTypes()
            setIsTypeModalOpen(false)
            setTypeFormData({ key: '', label: '', color: 'blue' })
            setEditingTypeKey(null)
            showAlert(editingTypeKey ? '일정 유형이 수정되었습니다.' : '일정 유형이 추가되었습니다.', 'success')
        } catch (error) {
            console.error('Error saving event type:', error)
            showAlert('저장에 실패했습니다.', 'error')
        }
    }

    // 일정 유형 삭제
    const handleDeleteType = async (key) => {
        if (!confirm('이 일정 유형을 삭제하시겠습니까?')) return

        try {
            await supabase
                .from('event_types')
                .delete()
                .eq('key', key)

            await fetchEventTypes()
            showAlert('일정 유형이 삭제되었습니다.', 'success')
        } catch (error) {
            console.error('Error deleting event type:', error)
            showAlert('삭제에 실패했습니다.', 'error')
        }
    }

    // 일정 유형 수정 모달 열기
    const openEditTypeModal = (key) => {
        const type = eventTypes[key]
        const colorKey = COLOR_OPTIONS.find(c => c.bg === type.bg)?.key || 'blue'
        setTypeFormData({ key, label: type.label, color: colorKey })
        setEditingTypeKey(key)
        setIsTypeModalOpen(true)
    }

    // 공휴일 데이터 가져오기
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const response = await fetch('https://holidays.hyunbin.page/basic.json')
                const data = await response.json()
                setHolidays(data)
            } catch (error) {
                console.error('Error fetching holidays:', error)
            }
        }
        fetchHolidays()
    }, [])

    useEffect(() => {
        fetchEventTypes()
        fetchEvents()
        fetchRecentEvents()
    }, [currentDate])

    const fetchEvents = async () => {
        try {
            const year = currentDate.getFullYear()
            const month = currentDate.getMonth()
            const startDate = new Date(year, month, 1).toISOString().split('T')[0]
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

            const { data } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', startDate)
                .lte('event_date', endDate)
                .order('event_date', { ascending: true })

            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
        }
    }

    const fetchRecentEvents = async () => {
        try {
            const today = new Date().toISOString().split('T')[0]
            const { data } = await supabase
                .from('events')
                .select('*')
                .gte('event_date', today)
                .order('event_date', { ascending: true })
                .limit(10)

            setRecentEvents(data || [])
        } catch (error) {
            console.error('Error fetching recent events:', error)
        }
    }

    const handleDateClick = (date) => {
        setSelectedDate(date)
        const dateEvents = events.filter(e => e.event_date === date)
        if (dateEvents.length > 0) {
            // 해당 날짜에 일정이 있으면 첫 번째 일정 상세보기
            setSelectedEvent(dateEvents[0])
            setIsDetailModalOpen(true)
        } else {
            // 일정이 없으면 새 일정 작성
            resetForm()
            setIsEditMode(false)
            setIsModalOpen(true)
        }
    }

    const handleAddNew = () => {
        if (!selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0])
        }
        resetForm()
        setIsEditMode(false)
        setIsModalOpen(true)
    }

    const handleEdit = () => {
        if (selectedEvent) {
            setFormData({
                title: selectedEvent.title || '',
                location: selectedEvent.location || '',
                description: selectedEvent.description || '',
                event_type: selectedEvent.event_type || 'general',
                start_time: selectedEvent.start_time || '',
                end_time: selectedEvent.end_time || ''
            })
            setSelectedDate(selectedEvent.event_date)
            setIsEditMode(true)
            setIsDetailModalOpen(false)
            setIsModalOpen(true)
        }
    }

    const resetForm = () => {
        setFormData({
            title: '',
            location: '',
            description: '',
            event_type: 'general',
            start_time: '',
            end_time: ''
        })
    }

    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert('일정명을 입력해주세요.')
            return
        }

        setLoading(true)
        try {
            if (isEditMode && selectedEvent) {
                // 수정
                const { error } = await supabase
                    .from('events')
                    .update({
                        title: formData.title,
                        location: formData.location || null,
                        description: formData.description || null,
                        event_type: formData.event_type,
                        start_time: formData.start_time || null,
                        end_time: formData.end_time || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', selectedEvent.id)
                if (error) throw error
            } else {
                // 새로 생성
                const { error } = await supabase
                    .from('events')
                    .insert([{
                        event_date: selectedDate,
                        title: formData.title,
                        location: formData.location || null,
                        description: formData.description || null,
                        event_type: formData.event_type,
                        start_time: formData.start_time || null,
                        end_time: formData.end_time || null,
                        created_by: user?.user_id
                    }])
                if (error) throw error
            }

            await fetchEvents()
            await fetchRecentEvents()
            setIsModalOpen(false)
            setSelectedEvent(null)
        } catch (error) {
            console.error('Error saving event:', error)
            alert('저장 중 오류가 발생했습니다: ' + (error.message || JSON.stringify(error)))
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('이 일정을 삭제하시겠습니까?')) return

        setLoading(true)
        try {
            if (selectedEvent) {
                await supabase
                    .from('events')
                    .delete()
                    .eq('id', selectedEvent.id)

                await fetchEvents()
                await fetchRecentEvents()
            }
            setIsDetailModalOpen(false)
            setSelectedEvent(null)
        } catch (error) {
            console.error('Error deleting event:', error)
            alert('삭제 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    // Calendar helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDay = firstDay.getDay()

        const days = []

        for (let i = 0; i < startingDay; i++) {
            const prevDate = new Date(year, month, -startingDay + i + 1)
            days.push({ date: prevDate, isCurrentMonth: false })
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true })
        }

        const remainingDays = 42 - days.length
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
        }

        return days
    }

    const formatDateString = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const formatDisplayDate = (dateStr) => {
        const date = new Date(dateStr)
        return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`
    }

    const getEventsForDate = (date) => {
        const dateStr = formatDateString(date)
        return events.filter(e => e.event_date === dateStr)
    }

    // 특정 날짜의 공휴일 가져오기
    const getHolidayForDate = (date) => {
        const year = date.getFullYear().toString()
        const dateStr = formatDateString(date)
        if (holidays[year] && holidays[year][dateStr]) {
            return holidays[year][dateStr] // 배열 형태로 반환 (예: ["설날"])
        }
        return null
    }

    const isToday = (date) => {
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    const days = getDaysInMonth(currentDate)
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']

    // 해당 날짜의 모든 일정 보기
    const handleViewAllEvents = (date) => {
        const dateEvents = events.filter(e => e.event_date === date)
        if (dateEvents.length > 1) {
            // 여러 일정이 있으면 목록 표시 (간단하게 첫 번째 일정 표시)
            setSelectedEvent(dateEvents[0])
            setSelectedDate(date)
            setIsDetailModalOpen(true)
        }
    }

    const handleEventClick = (event, e) => {
        e.stopPropagation()
        setSelectedEvent(event)
        setSelectedDate(event.event_date)
        setIsDetailModalOpen(true)
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <CalendarDays size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">일정</h2>
                        <p className="text-white/90">
                            날짜를 클릭하여 일정을 등록하세요
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={prevMonth}
                            className="p-2 hover:bg-toss-gray-100 rounded-full transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="text-lg font-bold">
                            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="p-2 hover:bg-toss-gray-100 rounded-full transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Week days header */}
                        {weekDays.map((day, index) => (
                            <div
                                key={day}
                                className={`text-center text-sm font-medium py-2 ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-toss-gray-500'
                                    }`}
                            >
                                {day}
                            </div>
                        ))}

                        {/* Days */}
                        {days.map((day, index) => {
                            const dateStr = formatDateString(day.date)
                            const dayEvents = getEventsForDate(day.date)
                            const hasEvents = dayEvents.length > 0
                            const dayOfWeek = day.date.getDay()
                            const holidayNames = getHolidayForDate(day.date)
                            const isHoliday = holidayNames !== null

                            return (
                                <div
                                    key={index}
                                    onClick={() => day.isCurrentMonth && handleDateClick(dateStr)}
                                    className={`
                                        min-h-[80px] p-1 border border-toss-gray-100 rounded-lg cursor-pointer
                                        transition-all hover:bg-toss-gray-50
                                        ${!day.isCurrentMonth && 'opacity-40'}
                                        ${isToday(day.date) && 'ring-2 ring-toss-blue ring-inset'}
                                        ${isHoliday && day.isCurrentMonth && 'bg-red-50'}
                                    `}
                                >
                                    <div className={`text-sm font-medium mb-1 ${isHoliday ? 'text-red-500' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''
                                        }`}>
                                        {day.date.getDate()}
                                    </div>
                                    {/* 공휴일 표시 */}
                                    {isHoliday && (
                                        <div className="text-xs px-1 py-0.5 rounded truncate bg-red-100 text-red-600 mb-0.5">
                                            {holidayNames.join(', ')}
                                        </div>
                                    )}
                                    {/* 일정 표시 (공휴일 있으면 1개, 없으면 2개) */}
                                    <div className="space-y-0.5">
                                        {dayEvents.slice(0, isHoliday ? 1 : 2).map((event, idx) => {
                                            const typeStyle = eventTypes[event.event_type] || eventTypes.general
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={(e) => handleEventClick(event, e)}
                                                    className={`text-xs px-1 py-0.5 rounded truncate ${typeStyle.bg} ${typeStyle.text}`}
                                                >
                                                    {event.title}
                                                </div>
                                            )
                                        })}
                                        {dayEvents.length > (isHoliday ? 1 : 2) && (
                                            <div className="text-xs text-toss-gray-500 pl-1">
                                                +{dayEvents.length - (isHoliday ? 1 : 2)}개 더
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* 범례 */}
                    <div className="mt-4 pt-4 border-t border-toss-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-3 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="text-toss-gray-600">공휴일</span>
                                </div>
                                {Object.entries(eventTypes).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${value.dot}`}></div>
                                        <span className="text-toss-gray-600">{value.label}</span>
                                    </div>
                                ))}
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setTypeFormData({ key: '', label: '', color: 'blue' })
                                        setEditingTypeKey(null)
                                        setIsTypeModalOpen(true)
                                    }}
                                    className="flex items-center gap-1 text-xs text-toss-gray-500 hover:text-toss-blue transition-colors"
                                >
                                    <Settings size={14} />
                                    유형 관리
                                </button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Upcoming Events */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">다가오는 일정</h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddNew}
                            className="flex items-center gap-1"
                        >
                            <Plus size={16} />
                            새 일정
                        </Button>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {recentEvents.length === 0 ? (
                            <p className="text-toss-gray-500 text-center py-8">
                                예정된 일정이 없습니다.
                            </p>
                        ) : (
                            recentEvents.map((event) => {
                                const typeStyle = eventTypes[event.event_type] || eventTypes.general
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => {
                                            setSelectedEvent(event)
                                            setSelectedDate(event.event_date)
                                            setIsDetailModalOpen(true)
                                        }}
                                        className="p-3 bg-toss-gray-50 rounded-xl hover:bg-toss-gray-100 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-1 h-full min-h-[40px] rounded-full ${typeStyle.dot}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${typeStyle.bg} ${typeStyle.text}`}>
                                                        {typeStyle.label}
                                                    </span>
                                                    <span className="text-xs text-toss-gray-500">
                                                        {formatDisplayDate(event.event_date)}
                                                    </span>
                                                </div>
                                                <h4 className="font-medium text-toss-gray-900 truncate">
                                                    {event.title}
                                                </h4>
                                                {event.location && (
                                                    <p className="text-sm text-toss-gray-500 flex items-center gap-1 mt-1">
                                                        <MapPin size={12} />
                                                        {event.location}
                                                    </p>
                                                )}
                                                {event.start_time && (
                                                    <p className="text-sm text-toss-gray-500 flex items-center gap-1 mt-1">
                                                        <Clock size={12} />
                                                        {event.start_time}{event.end_time && ` ~ ${event.end_time}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Card>
            </div>

            {/* 일정 작성/수정 모달 */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditMode ? '일정 수정' : '새 일정 등록'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            날짜
                        </label>
                        <input
                            type="date"
                            value={selectedDate || ''}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            일정명 *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="일정명을 입력하세요"
                            className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            일정 유형
                        </label>
                        <select
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                            className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue"
                        >
                            {Object.entries(eventTypes).map(([key, value]) => (
                                <option key={key} value={key}>{value.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            장소
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="장소를 입력하세요"
                            className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                시작 시간
                            </label>
                            <input
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                종료 시간
                            </label>
                            <input
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            상세 내용
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="상세 내용을 입력하세요"
                            rows={4}
                            className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setIsModalOpen(false)}
                        >
                            취소
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? '저장 중...' : isEditMode ? '수정' : '저장'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* 일정 상세 모달 */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setSelectedEvent(null)
                }}
                title="일정 상세"
            >
                {selectedEvent && (
                    <div className="space-y-4">
                        <div>
                            <span className={`inline-block text-xs px-2 py-1 rounded ${eventTypes[selectedEvent.event_type]?.bg || 'bg-gray-100'} ${eventTypes[selectedEvent.event_type]?.text || 'text-gray-700'}`}>
                                {eventTypes[selectedEvent.event_type]?.label || '일반'}
                            </span>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-1">날짜</label>
                            <p className="text-toss-gray-900">{formatDisplayDate(selectedEvent.event_date)}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-1">일정명</label>
                            <p className="text-lg font-bold text-toss-gray-900">{selectedEvent.title}</p>
                        </div>

                        {selectedEvent.location && (
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">장소</label>
                                <p className="text-toss-gray-900 flex items-center gap-2">
                                    <MapPin size={16} className="text-toss-gray-400" />
                                    {selectedEvent.location}
                                </p>
                            </div>
                        )}

                        {(selectedEvent.start_time || selectedEvent.end_time) && (
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">시간</label>
                                <p className="text-toss-gray-900 flex items-center gap-2">
                                    <Clock size={16} className="text-toss-gray-400" />
                                    {selectedEvent.start_time}{selectedEvent.end_time && ` ~ ${selectedEvent.end_time}`}
                                </p>
                            </div>
                        )}

                        {selectedEvent.description && (
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">상세 내용</label>
                                <p className="text-toss-gray-900 whitespace-pre-wrap bg-toss-gray-50 p-3 rounded-xl">
                                    {selectedEvent.description}
                                </p>
                            </div>
                        )}

                        {/* 같은 날짜의 다른 일정들 */}
                        {selectedDate && events.filter(e => e.event_date === selectedDate && e.id !== selectedEvent.id).length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-2">같은 날 다른 일정</label>
                                <div className="space-y-2">
                                    {events.filter(e => e.event_date === selectedDate && e.id !== selectedEvent.id).map((event) => {
                                        const typeStyle = eventTypes[event.event_type] || eventTypes.general
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className="p-2 bg-toss-gray-50 rounded-lg cursor-pointer hover:bg-toss-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${typeStyle.dot}`}></div>
                                                    <span className="text-sm font-medium">{event.title}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 border-t border-toss-gray-100">
                            <Button
                                variant="secondary"
                                className="flex-1 flex items-center justify-center gap-2"
                                onClick={handleEdit}
                            >
                                <Edit3 size={16} />
                                수정
                            </Button>
                            <Button
                                variant="secondary"
                                className="flex-1 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                <Trash2 size={16} />
                                삭제
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* 일정 유형 관리 모달 */}
            <Modal
                isOpen={isTypeModalOpen}
                onClose={() => {
                    setIsTypeModalOpen(false)
                    setEditingTypeKey(null)
                    setTypeFormData({ key: '', label: '', color: 'blue' })
                }}
                title="일정 유형 관리"
            >
                <div className="space-y-4">
                    {/* 기존 유형 목록 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            등록된 유형
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {Object.entries(eventTypes).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-2 bg-toss-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${value.dot}`}></div>
                                        <span className="text-sm font-medium">{value.label}</span>
                                        <span className="text-xs text-toss-gray-500">({key})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditTypeModal(key)}
                                            className="p-1 text-toss-gray-500 hover:text-toss-blue transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteType(key)}
                                            className="p-1 text-toss-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-toss-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-toss-gray-700 mb-3">
                            {editingTypeKey ? '유형 수정' : '새 유형 추가'}
                        </h4>

                        {!editingTypeKey && (
                            <div className="mb-3">
                                <label className="block text-xs text-toss-gray-500 mb-1">
                                    유형 코드 (영문)
                                </label>
                                <input
                                    type="text"
                                    value={typeFormData.key}
                                    onChange={(e) => setTypeFormData({ ...typeFormData, key: e.target.value })}
                                    placeholder="예: workshop"
                                    className="w-full px-3 py-2 border border-toss-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue text-sm"
                                />
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="block text-xs text-toss-gray-500 mb-1">
                                유형 이름
                            </label>
                            <input
                                type="text"
                                value={typeFormData.label}
                                onChange={(e) => setTypeFormData({ ...typeFormData, label: e.target.value })}
                                placeholder="예: 워크숍"
                                className="w-full px-3 py-2 border border-toss-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue text-sm"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs text-toss-gray-500 mb-1">
                                색상
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_OPTIONS.map((color) => (
                                    <button
                                        key={color.key}
                                        onClick={() => setTypeFormData({ ...typeFormData, color: color.key })}
                                        className={`w-8 h-8 rounded-full ${color.dot} ${
                                            typeFormData.color === color.key ? 'ring-2 ring-offset-2 ring-toss-blue' : ''
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {editingTypeKey && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setEditingTypeKey(null)
                                        setTypeFormData({ key: '', label: '', color: 'blue' })
                                    }}
                                    className="flex-1"
                                >
                                    취소
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleSaveType}
                                className="flex-1"
                            >
                                {editingTypeKey ? '수정' : '추가'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Alert Modal */}
            {alertModal.isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
                    style={{ zIndex: 10000 }}
                    onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
                >
                    <div
                        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                                alertModal.type === 'success' ? 'bg-green-100' :
                                alertModal.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                                {alertModal.type === 'success' ? (
                                    <CheckCircle className="w-7 h-7 text-green-600" />
                                ) : alertModal.type === 'error' ? (
                                    <AlertCircle className="w-7 h-7 text-red-600" />
                                ) : (
                                    <AlertCircle className="w-7 h-7 text-blue-600" />
                                )}
                            </div>
                            <p className="text-toss-gray-900 font-medium mb-6 leading-relaxed">
                                {alertModal.message}
                            </p>
                            <button
                                onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
                                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                                    alertModal.type === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' :
                                    alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600 text-white' :
                                    'bg-toss-blue hover:bg-blue-600 text-white'
                                }`}
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EventPage
