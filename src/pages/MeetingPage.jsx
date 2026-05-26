import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Button, Modal, PageHeader } from '../components/common'
import { ChevronLeft, ChevronRight, FileText, Upload, File, X, Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { uploadMultipleToDropbox, deleteMultipleFilesByUrl } from '../lib/dropbox'

// Dropbox URL을 직접 이미지 링크로 변환 (Safari 호환)
const convertDropboxUrl = (url) => {
    if (!url) return ''
    return url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '')
        .replace('&dl=0', '')
        .replace('?dl=1', '')
        .replace('&dl=1', '')
}

// 이미지 파일인지 확인하는 함수
const isImageFile = (url) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const lowerUrl = url.toLowerCase()
    return imageExtensions.some(ext => lowerUrl.includes(ext))
}

// 이미지 갤러리 컴포넌트 (드래그 스크롤 지원) - MeetingPage용 (file_urls가 {url, name} 객체 배열)
const MeetingImageGallery = ({ files }) => {
    const scrollRef = useRef(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const [selectedImage, setSelectedImage] = useState(null)

    const imageFiles = files.filter(f => isImageFile(f.url)).map(f => ({
        ...f,
        url: convertDropboxUrl(f.url)
    }))
    const otherFiles = files.filter(f => !isImageFile(f.url)).map(f => ({
        ...f,
        url: convertDropboxUrl(f.url)
    }))

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            setCanScrollLeft(scrollLeft > 0)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    useEffect(() => {
        checkScroll()
        window.addEventListener('resize', checkScroll)
        return () => window.removeEventListener('resize', checkScroll)
    }, [files])

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = 200
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
            setTimeout(checkScroll, 300)
        }
    }

    if (imageFiles.length === 0 && otherFiles.length === 0) return null

    return (
        <div className="space-y-3">
            {/* 이미지 갤러리 */}
            {imageFiles.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">
                        사진 ({imageFiles.length}장)
                    </label>
                    <div className="relative">
                        {/* 왼쪽 스크롤 버튼 */}
                        {canScrollLeft && (
                            <button
                                onClick={() => scroll('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-1.5 hover:bg-white"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}

                        {/* 이미지 스크롤 컨테이너 */}
                        <div
                            ref={scrollRef}
                            onScroll={checkScroll}
                            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {imageFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 cursor-pointer w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-toss-gray-100"
                                    onClick={() => setSelectedImage(file.url)}
                                >
                                    <img
                                        src={file.url}
                                        alt={file.name || `첨부 이미지 ${index + 1}`}
                                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* 오른쪽 스크롤 버튼 */}
                        {canScrollRight && (
                            <button
                                onClick={() => scroll('right')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-1.5 hover:bg-white"
                            >
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 기타 파일 */}
            {otherFiles.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">
                        기타 파일 ({otherFiles.length}개)
                    </label>
                    <div className="space-y-2">
                        {otherFiles.map((file, index) => (
                            <a
                                key={index}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-toss-gray-50 rounded-xl hover:bg-toss-gray-100 transition-colors"
                            >
                                <File size={16} className="text-toss-gray-500" />
                                <span className="text-sm text-toss-blue hover:underline flex-1 truncate">{file.name || '파일'}</span>
                                <Download size={16} className="text-toss-gray-500" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* 이미지 확대 모달 - Portal처럼 동작하도록 z-index 높임 */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center p-4"
                    style={{ zIndex: 9999 }}
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        style={{ zIndex: 10000 }}
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="확대 이미지"
                        className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}

const MeetingPage = () => {
    const { profile } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedMeeting, setSelectedMeeting] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [meetings, setMeetings] = useState([])
    const [recentMeetings, setRecentMeetings] = useState([])
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        participants: '',
        files: [],
        existingFileUrls: []
    })
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchMeetings()
        fetchRecentMeetings()
    }, [currentDate])

    const fetchMeetings = async () => {
        try {
            const year = currentDate.getFullYear()
            const month = currentDate.getMonth()
            const pad = (n) => String(n).padStart(2, '0')
            const startDate = `${year}-${pad(month + 1)}-01`
            const lastDay = new Date(year, month + 1, 0).getDate()
            const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`

            const { data } = await supabase
                .from('meetings')
                .select('*')
                .gte('meeting_date', startDate)
                .lte('meeting_date', endDate)
                .order('meeting_date', { ascending: true })

            setMeetings(data || [])
        } catch (error) {
            console.error('Error fetching meetings:', error)
        }
    }

    const fetchRecentMeetings = async () => {
        try {
            const { data } = await supabase
                .from('meetings')
                .select('*')
                .order('meeting_date', { ascending: false })
                .limit(10)

            setRecentMeetings(data || [])
        } catch (error) {
            console.error('Error fetching recent meetings:', error)
        }
    }

    const handleDateClick = (date) => {
        setSelectedDate(date)
        const existingMeeting = meetings.find(m => m.meeting_date === date)
        if (existingMeeting) {
            // 회의록이 있으면 상세보기 모달 열기
            setSelectedMeeting(existingMeeting)
            setIsDetailModalOpen(true)
        } else {
            // 회의록이 없으면 작성 모달 열기
            setFormData({ title: '', content: '', participants: '', files: [], existingFileUrls: [] })
            setIsModalOpen(true)
        }
    }

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        const fileData = selectedFiles.map(file => ({
            file,
            name: file.name,
            size: (file.size / 1024).toFixed(0) + 'KB'
        }))
        setFormData(prev => ({
            ...prev,
            files: [...prev.files, ...fileData]
        }))
    }

    const removeFile = (index) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }))
    }

    const removeExistingFile = (index) => {
        setFormData(prev => ({
            ...prev,
            existingFileUrls: prev.existingFileUrls.filter((_, i) => i !== index)
        }))
    }

    const handleMeetingClick = (meeting) => {
        setSelectedMeeting(meeting)
        setIsDetailModalOpen(true)
    }

    // 통합검색에서 ?open=<id>로 진입 시 해당 회의록 달로 이동 후 상세 모달 자동 오픈
    const [searchParams, setSearchParams] = useSearchParams()
    useEffect(() => {
        const openId = searchParams.get('open')
        if (!openId) return
        let active = true
        ;(async () => {
            const { data } = await supabase.from('meetings').select('*').eq('id', openId).single()
            if (active && data) {
                if (data.meeting_date) setCurrentDate(new Date(data.meeting_date))
                setSelectedMeeting(data)
                setIsDetailModalOpen(true)
            }
            searchParams.delete('open')
            setSearchParams(searchParams, { replace: true })
        })()
        return () => { active = false }
    }, [searchParams])

    const handleSave = async () => {
        if (!formData.content.trim()) {
            alert('회의 내용을 입력해주세요.')
            return
        }

        setLoading(true)
        setUploading(true)
        try {
            // Dropbox에 새 파일 업로드
            let newFileUrls = []
            if (formData.files.length > 0) {
                const folder = `/intranet/meetings/${selectedDate}`
                const uploadResults = await uploadMultipleToDropbox(
                    formData.files.map(f => f.file),
                    folder
                )
                newFileUrls = uploadResults.map(r => ({
                    url: r.url,
                    name: r.name,
                    size: r.size
                }))
            }

            // 기존 파일 URL과 새 파일 URL 합치기
            const allFileUrls = [...formData.existingFileUrls, ...newFileUrls]

            const existingMeeting = meetings.find(m => m.meeting_date === selectedDate)

            if (existingMeeting) {
                const { error } = await supabase
                    .from('meetings')
                    .update({
                        title: formData.title,
                        content: formData.content,
                        participants: formData.participants,
                        file_urls: allFileUrls,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingMeeting.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('meetings')
                    .insert([{
                        meeting_date: selectedDate,
                        title: formData.title,
                        content: formData.content,
                        participants: formData.participants,
                        file_urls: allFileUrls
                    }])
                    .select()
                if (error) throw error
            }

            await fetchMeetings()
            await fetchRecentMeetings()
            setIsModalOpen(false)
        } catch (error) {
            console.error('Error saving meeting:', error)
            alert('저장 중 오류가 발생했습니다: ' + (error.message || JSON.stringify(error)))
        } finally {
            setLoading(false)
            setUploading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('이 회의록을 삭제하시겠습니까?')) return

        setLoading(true)
        try {
            const existingMeeting = meetings.find(m => m.meeting_date === selectedDate)
            if (existingMeeting) {
                // Dropbox에서 첨부파일 삭제
                if (existingMeeting.file_urls && existingMeeting.file_urls.length > 0) {
                    await deleteMultipleFilesByUrl(existingMeeting.file_urls)
                }

                await supabase
                    .from('meetings')
                    .delete()
                    .eq('id', existingMeeting.id)

                await fetchMeetings()
                await fetchRecentMeetings()
            }
            setIsModalOpen(false)
        } catch (error) {
            console.error('Error deleting meeting:', error)
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

    const hasMeeting = (date) => {
        const dateStr = formatDateString(date)
        return meetings.some(m => m.meeting_date === dateStr)
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

    return (
        <div className="space-y-6">
            <PageHeader
                title="회의록"
                subtitle="날짜를 클릭하여 회의 내용을 기록하세요"
                icon={FileText}
            />

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Calendar */}
                <Card className="lg:col-span-2">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={20} className="text-toss-gray-600" />
                        </button>
                        <h3 className="text-lg font-bold text-toss-gray-900">
                            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight size={20} className="text-toss-gray-600" />
                        </button>
                    </div>

                    {/* Calendar Grid (일정 달력과 동일한 디자인) */}
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
                            const dayMeetings = meetings.filter(m => m.meeting_date === dateStr)
                            const dayOfWeek = day.date.getDay()

                            return (
                                <div
                                    key={index}
                                    onClick={() => day.isCurrentMonth && handleDateClick(dateStr)}
                                    className={`
                                        min-h-[80px] p-1 border border-toss-gray-100 rounded-lg cursor-pointer
                                        transition-all hover:bg-toss-gray-50
                                        ${!day.isCurrentMonth && 'opacity-40'}
                                        ${isToday(day.date) && 'ring-2 ring-toss-blue ring-inset'}
                                    `}
                                >
                                    <div className={`text-sm font-medium mb-1 ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''
                                        }`}>
                                        {day.date.getDate()}
                                    </div>
                                    {/* 회의록 내용 표시 */}
                                    <div className="space-y-0.5">
                                        {dayMeetings.slice(0, 3).map((meeting, idx) => (
                                            <div
                                                key={idx}
                                                onClick={(e) => { e.stopPropagation(); handleMeetingClick(meeting) }}
                                                className="text-xs px-1 py-0.5 rounded truncate bg-toss-blue/10 text-toss-blue"
                                            >
                                                {meeting.title || '회의록'}
                                            </div>
                                        ))}
                                        {dayMeetings.length > 3 && (
                                            <div className="text-xs text-toss-gray-500 pl-1">
                                                +{dayMeetings.length - 3}개 더
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-toss-gray-100 flex items-center gap-4 text-xs text-toss-gray-500">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-toss-blue rounded-full"></div>
                            <span>회의록</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full ring-1 ring-toss-blue"></div>
                            <span>오늘</span>
                        </div>
                    </div>
                </Card>

                {/* Right Column - Recent Meetings */}
                <Card className="lg:col-span-1">
                    <h3 className="text-base font-bold text-toss-gray-900 mb-4">최근 회의록</h3>

                    {recentMeetings.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {recentMeetings.map((meeting) => (
                                <button
                                    key={meeting.id}
                                    onClick={() => handleMeetingClick(meeting)}
                                    className="block w-full text-left p-3 rounded-lg hover:bg-toss-gray-50 transition-colors border border-toss-gray-100"
                                >
                                    <p className="font-medium text-toss-gray-900 text-sm truncate">
                                        {meeting.title || '제목 없음'}
                                    </p>
                                    <p className="text-xs text-toss-gray-400 mt-1">
                                        {formatDisplayDate(meeting.meeting_date)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-toss-gray-500 py-8 text-sm">
                            작성된 회의록이 없습니다
                        </p>
                    )}
                </Card>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={`회의록 - ${selectedDate}`}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            회의 제목
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="회의 제목을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            참석자
                        </label>
                        <input
                            type="text"
                            value={formData.participants}
                            onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="참석자를 입력하세요 (예: 홍길동, 김철수)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            회의 내용 *
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all min-h-[200px] resize-none leading-relaxed"
                            placeholder="회의 내용을 입력하세요"
                        />
                    </div>

                    {/* 파일 업로드 섹션 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            첨부파일
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-dashed border-toss-gray-300 rounded-xl hover:bg-toss-gray-100 transition-colors flex items-center justify-center gap-2 text-toss-gray-600"
                        >
                            <Upload size={18} />
                            <span>파일 선택 (이미지, 문서)</span>
                        </button>

                        {/* 기존 첨부파일 목록 */}
                        {formData.existingFileUrls.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs text-toss-gray-500">기존 첨부파일</p>
                                {formData.existingFileUrls.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-toss-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <File size={16} className="text-toss-gray-400" />
                                            <span className="text-sm text-toss-gray-700 truncate max-w-[200px]">
                                                {file.name || '파일'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeExistingFile(index)}
                                            className="p-1 hover:bg-toss-gray-200 rounded"
                                        >
                                            <X size={14} className="text-toss-gray-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 새 첨부파일 목록 */}
                        {formData.files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs text-toss-gray-500">새 첨부파일</p>
                                {formData.files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <File size={16} className="text-blue-400" />
                                            <span className="text-sm text-toss-gray-700 truncate max-w-[180px]">
                                                {file.name}
                                            </span>
                                            <span className="text-xs text-toss-gray-400">{file.size}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="p-1 hover:bg-blue-100 rounded"
                                        >
                                            <X size={14} className="text-toss-gray-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        {meetings.find(m => m.meeting_date === selectedDate) && (
                            <Button
                                variant="secondary"
                                onClick={handleDelete}
                                disabled={loading}
                                className="text-red-500 hover:bg-red-50"
                            >
                                삭제
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading || uploading}
                            className="flex-1"
                        >
                            {uploading ? '업로드 중...' : loading ? '저장 중...' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setSelectedMeeting(null)
                }}
                title="회의록 상세"
            >
                {selectedMeeting && (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto -mx-2 px-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">회의 날짜</label>
                                <p className="text-toss-gray-900">{formatDisplayDate(selectedMeeting.meeting_date)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">참석자</label>
                                <p className="text-toss-gray-900">{selectedMeeting.participants || '-'}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-1">회의 제목</label>
                            <p className="text-toss-gray-900 font-medium">{selectedMeeting.title || '제목 없음'}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">회의 내용</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[150px] whitespace-pre-wrap text-toss-gray-900">
                                {selectedMeeting.content || '-'}
                            </div>
                        </div>

                        {/* 첨부파일 표시 */}
                        {selectedMeeting.file_urls && selectedMeeting.file_urls.length > 0 && (
                            <MeetingImageGallery files={selectedMeeting.file_urls} />
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    setSelectedMeeting(null)
                                }}
                                className="flex-1"
                            >
                                닫기
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    setSelectedDate(selectedMeeting.meeting_date)
                                    setFormData({
                                        title: selectedMeeting.title || '',
                                        content: selectedMeeting.content || '',
                                        participants: selectedMeeting.participants || '',
                                        files: [],
                                        existingFileUrls: selectedMeeting.file_urls || []
                                    })
                                    setIsModalOpen(true)
                                    setSelectedMeeting(null)
                                }}
                                className="flex-1"
                            >
                                수정하기
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default MeetingPage
