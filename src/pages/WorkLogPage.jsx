import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, FileText, Upload, Trash2, Calendar, Download, File, X, Edit2, ChevronLeft, ChevronRight, FileDown, PlusCircle, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { uploadMultipleToDropbox, deleteMultipleFilesByUrl } from '../lib/dropbox'
import { Document, Packer, Paragraph, TextRun, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, convertInchesToTwip } from 'docx'
import { saveAs } from 'file-saver'
import { generateDailyWorklogPdf } from '../utils/worklogPdf'

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

// URL 추출 함수 (문자열 또는 {url, name} 객체 모두 지원)
const getUrl = (item) => {
    let url = ''
    if (typeof item === 'string') url = item
    else if (item && item.url) url = item.url
    return convertDropboxUrl(url)
}

// 이미지 파일인지 확인하는 함수
const isImageFile = (item) => {
    const url = getUrl(item)
    if (!url) return false
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const lowerUrl = url.toLowerCase()
    return imageExtensions.some(ext => lowerUrl.includes(ext))
}

// 이미지 갤러리 컴포넌트 (드래그 스크롤 + 스와이프 지원)
const ImageGallery = ({ urls }) => {
    const scrollRef = useRef(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(null)

    // 드래그/스와이프 관련 상태
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [translateX, setTranslateX] = useState(0)

    const imageUrls = urls.filter(isImageFile)
    const otherUrls = urls.filter(item => !isImageFile(item))

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
    }, [urls])

    // 키보드 네비게이션
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedIndex === null) return
            if (e.key === 'ArrowLeft') goToPrevious()
            if (e.key === 'ArrowRight') goToNext()
            if (e.key === 'Escape') closeModal()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndex, imageUrls.length])

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

    const openImage = (index) => {
        setSelectedIndex(index)
        setTranslateX(0)
    }

    const closeModal = () => {
        setSelectedIndex(null)
        setTranslateX(0)
    }

    const goToPrevious = () => {
        setTranslateX(0)
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : imageUrls.length - 1))
    }

    const goToNext = () => {
        setTranslateX(0)
        setSelectedIndex((prev) => (prev < imageUrls.length - 1 ? prev + 1 : 0))
    }

    // 마우스 드래그 시작
    const handleMouseDown = (e) => {
        if (imageUrls.length <= 1) return
        setIsDragging(true)
        setStartX(e.clientX)
    }

    // 터치 드래그 시작
    const handleTouchStart = (e) => {
        if (imageUrls.length <= 1) return
        setIsDragging(true)
        setStartX(e.touches[0].clientX)
    }

    // 마우스/터치 드래그 중
    const handleMove = (clientX) => {
        if (!isDragging) return
        const diff = clientX - startX
        setTranslateX(diff)
    }

    const handleMouseMove = (e) => {
        handleMove(e.clientX)
    }

    const handleTouchMove = (e) => {
        handleMove(e.touches[0].clientX)
    }

    // 드래그 종료
    const handleDragEnd = () => {
        if (!isDragging) return
        setIsDragging(false)

        const threshold = 100 // 스와이프 감지 임계값

        if (translateX > threshold) {
            goToPrevious()
        } else if (translateX < -threshold) {
            goToNext()
        } else {
            setTranslateX(0)
        }
    }

    if (imageUrls.length === 0 && otherUrls.length === 0) return null

    return (
        <div className="space-y-3">
            {/* 이미지 갤러리 */}
            {imageUrls.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">
                        사진 ({imageUrls.length}장)
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
                            {imageUrls.map((item, index) => {
                                const url = getUrl(item)
                                return (
                                    <div
                                        key={index}
                                        className="flex-shrink-0 cursor-pointer w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-toss-gray-100"
                                        onClick={() => openImage(index)}
                                    >
                                        <img
                                            src={url}
                                            alt={`첨부 이미지 ${index + 1}`}
                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                            }}
                                        />
                                    </div>
                                )
                            })}
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
            {otherUrls.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">
                        기타 파일 ({otherUrls.length}개)
                    </label>
                    <div className="space-y-2">
                        {otherUrls.map((item, index) => {
                            const url = getUrl(item)
                            const fileName = typeof item === 'string' ? url.split('/').pop() : (item.name || url.split('/').pop())
                            return (
                                <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 bg-toss-gray-50 rounded-xl hover:bg-toss-gray-100 transition-colors"
                                >
                                    <File size={16} className="text-toss-gray-500" />
                                    <span className="text-sm text-toss-blue hover:underline flex-1 truncate">{fileName}</span>
                                    <Download size={16} className="text-toss-gray-500" />
                                </a>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* 이미지 확대 모달 - 드래그/스와이프 지원 */}
            {selectedIndex !== null && (
                <div
                    className="fixed inset-0 bg-black/95 flex items-center justify-center select-none"
                    style={{ zIndex: 9999 }}
                    onClick={closeModal}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchEnd={handleDragEnd}
                >
                    {/* 닫기 버튼 */}
                    <button
                        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={closeModal}
                    >
                        <X size={24} />
                    </button>

                    {/* 이미지 카운터 */}
                    <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                        {selectedIndex + 1} / {imageUrls.length}
                    </div>

                    {/* 이미지 + 화살표 컨테이너 */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* 이전 버튼 */}
                        {imageUrls.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                                className="flex-shrink-0 p-2 sm:p-3 text-white/80 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={36} strokeWidth={3} />
                            </button>
                        )}

                        {/* 확대된 이미지 (드래그/스와이프 지원) */}
                        <div
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            className="max-w-[70vw] sm:max-w-[80vw] max-h-[90vh] relative cursor-grab active:cursor-grabbing"
                            style={{
                                transform: `translateX(${translateX}px)`,
                                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                            }}
                        >
                            <img
                                src={getUrl(imageUrls[selectedIndex])}
                                alt={`확대 이미지 ${selectedIndex + 1}`}
                                className="max-w-full max-h-[90vh] object-contain rounded-lg pointer-events-none"
                                draggable={false}
                            />
                        </div>

                        {/* 다음 버튼 */}
                        {imageUrls.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                className="flex-shrink-0 p-2 sm:p-3 text-white/80 hover:text-white transition-colors"
                            >
                                <ChevronRight size={36} strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    {/* 페이지 인디케이터 (이미지 2개 이상일 때) */}
                    {imageUrls.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            {imageUrls.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        index === selectedIndex ? 'bg-white' : 'bg-white/30'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const WorkLogPage = () => {
    const { profile, isAdmin } = useAuth()
    const [worklogs, setWorklogs] = useState([])
    const [filteredWorklogs, setFilteredWorklogs] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedWorklog, setSelectedWorklog] = useState(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedUserId, setSelectedUserId] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const fileInputRef = useRef(null)

    // 오전/오후 업무 항목 구조: [{ content: '', progress: '' }]
    const [formData, setFormData] = useState({
        work_date: new Date().toISOString().split('T')[0],
        morning_tasks: [{ content: '', progress: '' }],
        afternoon_tasks: [{ content: '', progress: '' }],
        next_day_work: '',
        special_notes: '',
        files: [],
        existingFileUrls: []
    })

    // 업무 항목 추가
    const addTask = (type) => {
        setFormData(prev => ({
            ...prev,
            [type]: [...prev[type], { content: '', progress: '' }]
        }))
    }

    // 업무 항목 삭제
    const removeTask = (type, index) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }))
    }

    // 업무 항목 수정
    const updateTask = (type, index, field, value) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].map((task, i) =>
                i === index ? { ...task, [field]: value } : task
            )
        }))
    }

    // 업무 배열을 문자열로 변환 (저장용)
    const tasksToString = (tasks) => {
        return tasks
            .filter(t => t.content.trim())
            .map(t => t.progress ? `${t.content} (${t.progress}%)` : t.content)
            .join('\n')
    }

    // 문자열을 업무 배열로 변환 (불러오기용)
    const stringToTasks = (str) => {
        if (!str) return [{ content: '', progress: '' }]
        const lines = str.split('\n').filter(line => line.trim())
        if (lines.length === 0) return [{ content: '', progress: '' }]

        return lines.map(line => {
            // "내용 (50%)" 형식에서 진척도 추출
            const match = line.match(/^(.+?)\s*\((\d+)%\)$/)
            if (match) {
                return { content: match[1].trim(), progress: match[2] }
            }
            return { content: line, progress: '' }
        })
    }

    // 연도 목록 생성 (2026년부터 현재 연도까지)
    const startYear = 2026
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    useEffect(() => {
        fetchWorklogs()
    }, [])

    useEffect(() => {
        filterWorklogsByDate()
    }, [worklogs, selectedYear, selectedMonth, selectedUserId])

    const filterWorklogsByDate = () => {
        const filtered = worklogs.filter(log => {
            const logDate = new Date(log.work_date)
            const dateMatch = logDate.getFullYear() === selectedYear && logDate.getMonth() + 1 === selectedMonth
            const userMatch = selectedUserId === 'all' || log.user_id === selectedUserId
            return dateMatch && userMatch
        })
        setFilteredWorklogs(filtered)
        setCurrentPage(1) // 필터 변경 시 첫 페이지로 이동
    }

    // 고유한 사용자 목록 추출
    const uniqueUsers = Array.from(new Set(worklogs.map(log => log.user_id)))
        .map(userId => {
            const log = worklogs.find(l => l.user_id === userId)
            return { user_id: userId, name: log?.user?.name || '알 수 없음' }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

    const fetchWorklogs = async () => {
        try {
            let query = supabase
                .from('work_logs')
                .select('*')
                .not('type', 'in', '("weekly","monthly","rescue")')
                .order('work_date', { ascending: false })

            if (!isAdmin && profile) {
                query = query.eq('user_id', profile.user_id)
            }

            const { data: worklogsData, error: worklogsError } = await query

            if (worklogsError) throw worklogsError

            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('user_id, name, team, rank')

            if (usersError) throw usersError

            const worklogsWithUsers = worklogsData.map(worklog => {
                const user = usersData.find(u => u.user_id === worklog.user_id)
                return {
                    ...worklog,
                    user: user || { name: '알 수 없음', team: '-', rank: '-' }
                }
            })

            setWorklogs(worklogsWithUsers || [])
        } catch (error) {
            console.error('Error fetching worklogs:', error)
        } finally {
            setLoading(false)
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

    const uploadFiles = async (files) => {
        // Dropbox에 업로드
        const folder = `/intranet/worklogs/${profile.user_id}`
        const results = await uploadMultipleToDropbox(
            files.map(f => f.file),
            folder
        )
        return results.map(r => r.url)
    }

    const handleCreate = async () => {
        const morningWork = tasksToString(formData.morning_tasks)
        const afternoonWork = tasksToString(formData.afternoon_tasks)

        if (!morningWork && !afternoonWork) {
            alert('오전 또는 오후 업무 중 하나는 입력해주세요.')
            return
        }

        try {
            setUploading(true)
            let fileUrls = []

            if (formData.files.length > 0) {
                fileUrls = await uploadFiles(formData.files)
            }

            const { error } = await supabase.from('work_logs').insert({
                work_date: formData.work_date,
                morning_work: morningWork,
                afternoon_work: afternoonWork,
                next_day_work: formData.next_day_work,
                special_notes: formData.special_notes,
                file_urls: fileUrls,
                user_id: profile.user_id,
                type: 'daily',
                is_read: false
            })

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('업무보고가 저장되었습니다.')
        } catch (error) {
            console.error('Error creating worklog:', error)
            alert('업무보고 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        const morningWork = tasksToString(formData.morning_tasks)
        const afternoonWork = tasksToString(formData.afternoon_tasks)

        if (!morningWork && !afternoonWork) {
            alert('오전 또는 오후 업무 중 하나는 입력해주세요.')
            return
        }

        if (!selectedWorklog?.id) {
            alert('수정할 업무보고를 찾을 수 없습니다. 다시 시도해주세요.')
            return
        }

        // 수정 중 selectedWorklog가 변경되지 않도록 ID를 미리 저장
        const worklogId = selectedWorklog.id

        try {
            setUploading(true)
            let newFileUrls = []

            if (formData.files.length > 0) {
                newFileUrls = await uploadFiles(formData.files)
            }

            const allFileUrls = [...formData.existingFileUrls, ...newFileUrls]

            const { error } = await supabase
                .from('work_logs')
                .update({
                    work_date: formData.work_date,
                    morning_work: morningWork,
                    afternoon_work: afternoonWork,
                    next_day_work: formData.next_day_work,
                    special_notes: formData.special_notes,
                    file_urls: allFileUrls
                })
                .eq('id', worklogId)

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('업무보고가 수정되었습니다.')
        } catch (error) {
            console.error('Error updating worklog:', error)
            alert('업무보고 수정에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            work_date: new Date().toISOString().split('T')[0],
            morning_tasks: [{ content: '', progress: '' }],
            afternoon_tasks: [{ content: '', progress: '' }],
            next_day_work: '',
            special_notes: '',
            files: [],
            existingFileUrls: []
        })
        setIsEditMode(false)
        setSelectedWorklog(null)
    }

    const openEditModal = (worklog) => {
        setFormData({
            work_date: worklog.work_date,
            morning_tasks: stringToTasks(worklog.morning_work),
            afternoon_tasks: stringToTasks(worklog.afternoon_work),
            next_day_work: worklog.next_day_work || '',
            special_notes: worklog.special_notes || '',
            files: [],
            existingFileUrls: worklog.file_urls || []
        })
        setSelectedWorklog(worklog)
        setIsEditMode(true)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const handleDelete = async (worklog) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            // Dropbox에서 첨부파일 삭제
            if (worklog.file_urls && worklog.file_urls.length > 0) {
                await deleteMultipleFilesByUrl(worklog.file_urls)
            }

            const { error } = await supabase.from('work_logs').delete().eq('id', worklog.id)
            if (error) throw error
            fetchWorklogs()
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting worklog:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    const viewWorklogDetail = async (worklog) => {
        setSelectedWorklog(worklog)

        if (isAdmin && !worklog.is_read) {
            await supabase
                .from('work_logs')
                .update({ is_read: true })
                .eq('id', worklog.id)
            fetchWorklogs()
        }
    }

    // PDF 다운로드
    const handleDownloadPdf = (worklog) => {
        generateDailyWorklogPdf(worklog, formatDate)
    }

    // Supabase Edge Function 프록시를 통해 이미지를 ArrayBuffer로 가져오기
    const loadImageAsArrayBuffer = async (url) => {
        const proxyUrl = `https://khwzdwewgadvpglptvua.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`
        const response = await fetch(proxyUrl)
        if (!response.ok) {
            throw new Error(`이미지 로드 실패: ${response.status}`)
        }
        return await response.arrayBuffer()
    }

    // Word 파일로 저장 (전문적인 테이블 기반 디자인)
    const handleSaveAsWord = async (worklog) => {
        // 공통 테이블 셀 테두리 스타일
        const tableBorders = {
            top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
        }

        // 업무 항목을 테이블 행으로 변환
        const parseTasksToRows = (taskString) => {
            if (!taskString) {
                return [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ text: '-', alignment: AlignmentType.CENTER })],
                                width: { size: 600, type: WidthType.DXA },
                                borders: tableBorders,
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: '' })],
                                borders: tableBorders,
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: '-', alignment: AlignmentType.CENTER })],
                                width: { size: 1000, type: WidthType.DXA },
                                borders: tableBorders,
                            }),
                        ],
                    }),
                ]
            }

            const lines = taskString.split('\n').filter(line => line.trim())
            if (lines.length === 0) {
                return [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ text: '-', alignment: AlignmentType.CENTER })],
                                width: { size: 600, type: WidthType.DXA },
                                borders: tableBorders,
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: '' })],
                                borders: tableBorders,
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: '-', alignment: AlignmentType.CENTER })],
                                width: { size: 1000, type: WidthType.DXA },
                                borders: tableBorders,
                            }),
                        ],
                    }),
                ]
            }

            return lines.map((line, index) => {
                const match = line.match(/^(.+?)\s*\((\d+)%\)$/)
                let content = line
                let progress = '-'

                if (match) {
                    content = match[1].trim()
                    progress = match[2] + '%'
                }

                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ text: String(index + 1), alignment: AlignmentType.CENTER })],
                            width: { size: 600, type: WidthType.DXA },
                            borders: tableBorders,
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: content })],
                            borders: tableBorders,
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: progress, alignment: AlignmentType.CENTER })],
                            width: { size: 1000, type: WidthType.DXA },
                            borders: tableBorders,
                        }),
                    ],
                })
            })
        }

        // 이미지 처리
        const processedImages = []
        const failedImages = []

        if (worklog.file_urls && worklog.file_urls.length > 0) {
            const imageUrls = worklog.file_urls.filter(item => {
                const url = getUrl(item)
                return isImageFile({ url })
            })

            for (const item of imageUrls) {
                try {
                    const url = getUrl(item)
                    const arrayBuffer = await loadImageAsArrayBuffer(url)

                    const blob = new Blob([arrayBuffer])
                    const blobUrl = URL.createObjectURL(blob)
                    const img = new Image()
                    img.src = blobUrl
                    await new Promise((resolve, reject) => {
                        img.onload = resolve
                        img.onerror = reject
                    })

                    const maxWidth = 240
                    const maxHeight = 320

                    let width = img.width
                    let height = img.height
                    const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)

                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    canvas.width = width
                    canvas.height = height
                    ctx.drawImage(img, 0, 0, width, height)

                    let quality = 0.7
                    let compressedBlob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/jpeg', quality)
                    })

                    const targetSize = 300 * 1024
                    while (compressedBlob.size > targetSize && quality > 0.3) {
                        quality -= 0.1
                        compressedBlob = await new Promise(resolve => {
                            canvas.toBlob(resolve, 'image/jpeg', quality)
                        })
                    }

                    const compressedArrayBuffer = await compressedBlob.arrayBuffer()
                    URL.revokeObjectURL(blobUrl)

                    processedImages.push({
                        data: compressedArrayBuffer,
                        width,
                        height
                    })
                } catch (error) {
                    console.error('이미지 로드 실패:', error)
                    const fileName = typeof item === 'string' ? item.split('/').pop() : (item.name || '이미지')
                    failedImages.push(fileName)
                }
            }
        }

        // 이미지 테이블 행 생성
        const imageTableRows = []
        for (let i = 0; i < processedImages.length; i += 2) {
            const cells = []
            cells.push(
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: processedImages[i].data,
                                    transformation: {
                                        width: processedImages[i].width,
                                        height: processedImages[i].height,
                                    },
                                    type: 'jpg',
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.NONE },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE },
                    },
                })
            )

            if (i + 1 < processedImages.length) {
                cells.push(
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: processedImages[i + 1].data,
                                        transformation: {
                                            width: processedImages[i + 1].width,
                                            height: processedImages[i + 1].height,
                                        },
                                        type: 'jpg',
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                        },
                    })
                )
            } else {
                cells.push(
                    new TableCell({
                        children: [new Paragraph({ text: '' })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                            left: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                        },
                    })
                )
            }

            imageTableRows.push(new TableRow({ children: cells }))
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // 제목
                    new Paragraph({
                        children: [
                            new TextRun({ text: '일 일 업 무 보 고 서', bold: true, size: 48 }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        border: {
                            bottom: { style: BorderStyle.SINGLE, size: 12, color: '333333' },
                        },
                    }),
                    new Paragraph({ text: '', spacing: { after: 200 } }),

                    // 기본 정보 테이블
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: '보고일자', alignment: AlignmentType.CENTER })],
                                        width: { size: 1500, type: WidthType.DXA },
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: formatDate(worklog.work_date) })],
                                        width: { size: 3000, type: WidthType.DXA },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: '소속', alignment: AlignmentType.CENTER })],
                                        width: { size: 1500, type: WidthType.DXA },
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: worklog.user?.team || '-' })],
                                        width: { size: 3000, type: WidthType.DXA },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: '직급', alignment: AlignmentType.CENTER })],
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: worklog.user?.rank || '-' })],
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: '성명', alignment: AlignmentType.CENTER })],
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: worklog.user?.name || '-' })],
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    new Paragraph({ text: '', spacing: { after: 300 } }),

                    // 오전 업무 테이블
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: 'Ⅰ. 오전 업무', bold: true })] })],
                                        columnSpan: 3,
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'No', alignment: AlignmentType.CENTER })],
                                        width: { size: 600, type: WidthType.DXA },
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: '업무 내용', alignment: AlignmentType.CENTER })],
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: '진척률', alignment: AlignmentType.CENTER })],
                                        width: { size: 1000, type: WidthType.DXA },
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            ...parseTasksToRows(worklog.morning_work),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    new Paragraph({ text: '', spacing: { after: 200 } }),

                    // 오후 업무 테이블
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: 'Ⅱ. 오후 업무', bold: true })] })],
                                        columnSpan: 3,
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: 'No', alignment: AlignmentType.CENTER })],
                                        width: { size: 600, type: WidthType.DXA },
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: '업무 내용', alignment: AlignmentType.CENTER })],
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: '진척률', alignment: AlignmentType.CENTER })],
                                        width: { size: 1000, type: WidthType.DXA },
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            ...parseTasksToRows(worklog.afternoon_work),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    new Paragraph({ text: '', spacing: { after: 200 } }),

                    // 익일 업무 테이블
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: 'Ⅲ. 익일 업무', bold: true })] })],
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: worklog.next_day_work || '-' })],
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    new Paragraph({ text: '', spacing: { after: 200 } }),

                    // 특이사항 테이블
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: 'Ⅳ. 특이사항 및 비고', bold: true })] })],
                                        shading: { fill: 'F8F9FA' },
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: worklog.special_notes || '-' })],
                                        borders: tableBorders,
                                    }),
                                ],
                            }),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    new Paragraph({ text: '', spacing: { after: 400 } }),

                    // 푸터
                    new Paragraph({
                        children: [new TextRun({ text: '한인구조단', bold: true, size: 28 })],
                        alignment: AlignmentType.CENTER,
                    }),

                    // 이미지 첨부
                    ...(processedImages.length > 0 ? [
                        new Paragraph({ text: '', spacing: { after: 300 } }),
                        new Paragraph({
                            children: [new TextRun({ text: '첨부 사진', bold: true, size: 24 })],
                        }),
                        new Table({
                            rows: imageTableRows,
                            width: { size: 100, type: WidthType.PERCENTAGE },
                        }),
                    ] : []),

                    // 실패한 이미지
                    ...(failedImages.length > 0 ? [
                        new Paragraph({ text: '' }),
                        new Paragraph({
                            children: [new TextRun({ text: '(일부 이미지는 링크로 대체되었습니다)', italics: true, color: '666666' })],
                        }),
                        ...failedImages.map((fileName, index) =>
                            new Paragraph({
                                children: [new TextRun({ text: `${index + 1}. ${fileName}`, color: '0066CC' })],
                            })
                        ),
                    ] : []),
                ],
            }],
        })

        const blob = await Packer.toBlob(doc)
        saveAs(blob, `일일업무보고_${worklog.work_date}_${worklog.user?.name || '작성자'}.docx`)
    }

    const getWeekday = (dateString) => {
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
        const date = new Date(dateString)
        return days[date.getDay()]
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) + ` (${getWeekday(dateString)})`
    }

    // 페이지네이션
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredWorklogs.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredWorklogs.length / itemsPerPage)

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    return (
        <div className="space-y-6">
            {/* User Info Header */}
            <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">
                            {isAdmin ? '전체 일일 업무보고' : `${profile?.name || '사용자'}님의 일일 업무보고`}
                        </h2>
                        <p className="text-white/90">
                            {isAdmin ? '관리자 권한으로 모든 직원의 일일 업무보고를 확인할 수 있습니다' :
                             `${profile?.team ? `${profile.team} · ` : ''}${profile?.rank || '직급 미설정'}`}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Header with Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-toss-gray-900">일일 업무보고</h1>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Year Filter */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}년</option>
                        ))}
                    </select>

                    {/* Month Filter */}
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                    >
                        {months.map(month => (
                            <option key={month} value={month}>{month}월</option>
                        ))}
                    </select>

                    {/* User Filter (관리자만) */}
                    {isAdmin && uniqueUsers.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                        >
                            <option value="all">전체 작성자</option>
                            {uniqueUsers.map(user => (
                                <option key={user.user_id} value={user.user_id}>{user.name}</option>
                            ))}
                        </select>
                    )}

                    <Button onClick={openCreateModal}>
                        <Plus size={18} />
                        새 일일 업무보고
                    </Button>
                </div>
            </div>

            {/* Board-style Table */}
            <Card padding="p-0 sm:p-6">
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-8">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead className="bg-toss-gray-100 border-b-2 border-toss-gray-300">
                                    <tr>
                                        <th className="px-3 py-3 text-center text-sm font-semibold text-toss-gray-700 whitespace-nowrap">No</th>
                                        <th className="px-3 py-3 text-left text-sm font-semibold text-toss-gray-700 whitespace-nowrap">작업일</th>
                                        {isAdmin && (
                                            <>
                                                <th className="px-3 py-3 text-left text-sm font-semibold text-toss-gray-700 whitespace-nowrap">작성자</th>
                                                <th className="px-3 py-3 text-left text-sm font-semibold text-toss-gray-700 whitespace-nowrap">팀</th>
                                            </>
                                        )}
                                        <th className="px-3 py-3 text-left text-sm font-semibold text-toss-gray-700">오전 업무</th>
                                        <th className="px-3 py-3 text-left text-sm font-semibold text-toss-gray-700">오후 업무</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold text-toss-gray-700 whitespace-nowrap">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-200">
                                    {currentItems.map((log, index) => (
                                        <tr
                                            key={log.id}
                                            className={`hover:bg-toss-gray-50 transition-colors ${
                                                isAdmin && !log.is_read ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <td className="px-3 py-3 text-sm text-center text-toss-gray-600 whitespace-nowrap">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            <td
                                                className="px-3 py-3 text-sm text-toss-gray-900 cursor-pointer hover:text-toss-blue whitespace-nowrap"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} className="text-toss-gray-400 flex-shrink-0" />
                                                    <span>{new Date(log.work_date).toLocaleDateString('ko-KR')}</span>
                                                    {isAdmin && !log.is_read && (
                                                        <span className="inline-block bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                                                            N
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <>
                                                    <td
                                                        className="px-3 py-3 text-sm text-toss-gray-900 cursor-pointer hover:text-toss-blue hover:underline whitespace-nowrap"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedUserId(log.user_id)
                                                        }}
                                                    >
                                                        {log.user?.name || '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-toss-gray-600 whitespace-nowrap">{log.user?.team || '-'}</td>
                                                </>
                                            )}
                                            <td
                                                className="px-3 py-3 text-sm text-toss-gray-700 cursor-pointer max-w-[200px] truncate"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                {log.morning_work || '-'}
                                            </td>
                                            <td
                                                className="px-3 py-3 text-sm text-toss-gray-700 cursor-pointer max-w-[200px] truncate"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                {log.afternoon_work || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDownloadPdf(log)
                                                        }}
                                                        className="p-2 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg transition-colors"
                                                        title="PDF 다운로드"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleSaveAsWord(log)
                                                        }}
                                                        className="p-2 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg transition-colors"
                                                        title="Word 다운로드"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    {(profile?.user_id === log.user_id || isAdmin) && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(log)}
                                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                                title="수정"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(log)}
                                                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                                title="삭제"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-toss-gray-100">
                            {currentItems.map((log, index) => (
                                <div
                                    key={log.id}
                                    className={`p-4 ${isAdmin && !log.is_read ? 'bg-blue-50' : ''}`}
                                    onClick={() => viewWorklogDetail(log)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-toss-gray-500">#{indexOfFirstItem + index + 1}</span>
                                            <Calendar size={14} className="text-toss-gray-400" />
                                            <span className="text-sm font-medium text-toss-gray-900">
                                                {new Date(log.work_date).toLocaleDateString('ko-KR')}
                                            </span>
                                            {isAdmin && !log.is_read && (
                                                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleDownloadPdf(log)}
                                                className="p-1.5 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg"
                                                title="PDF 다운로드"
                                            >
                                                <Printer size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleSaveAsWord(log)}
                                                className="p-1.5 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg"
                                                title="Word 다운로드"
                                            >
                                                <Download size={14} />
                                            </button>
                                            {(profile?.user_id === log.user_id || isAdmin) && (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(log)}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(log)}
                                                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className="text-xs text-toss-gray-600 mb-2">
                                            <span className="font-medium">{log.user?.name || '-'}</span>
                                            <span className="mx-1">·</span>
                                            <span>{log.user?.team || '-'}</span>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-sm text-toss-gray-700 line-clamp-1">
                                            <span className="text-toss-gray-500 mr-1">오전:</span>
                                            {log.morning_work || '-'}
                                        </p>
                                        <p className="text-sm text-toss-gray-700 line-clamp-1">
                                            <span className="text-toss-gray-500 mr-1">오후:</span>
                                            {log.afternoon_work || '-'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-toss-gray-200">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    이전
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => goToPage(i + 1)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                            currentPage === i + 1
                                                ? 'bg-toss-blue text-white'
                                                : 'text-toss-gray-700 hover:bg-toss-gray-100'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded-lg text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-toss-gray-500 py-8">
                        {selectedYear}년 {selectedMonth}월에 등록된 업무보고가 없습니다
                    </div>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    resetForm()
                }}
                title={isEditMode ? '일일 업무보고 수정' : '새 일일 업무보고 작성'}
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* 작업일 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            작업일 *
                        </label>
                        <input
                            type="date"
                            value={formData.work_date}
                            onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                        />
                        <p className="text-sm text-toss-gray-500 mt-1">
                            {formatDate(formData.work_date)}
                        </p>
                    </div>

                    {/* 오전 업무 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            오전 업무
                        </label>
                        <div className="space-y-2">
                            {formData.morning_tasks.map((task, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <span className="w-6 text-center text-sm font-medium text-toss-gray-500 pt-3">{index + 1}</span>
                                    <textarea
                                        value={task.content}
                                        onChange={(e) => updateTask('morning_tasks', index, 'content', e.target.value)}
                                        data-morning-task={index}
                                        rows={2}
                                        className="flex-1 px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all resize-none leading-relaxed"
                                        placeholder="업무 상세 내용 (Enter로 줄바꿈)"
                                    />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={task.progress}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                                                updateTask('morning_tasks', index, 'progress', val)
                                            }
                                        }}
                                        className="w-16 px-2 self-stretch bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all text-center"
                                        placeholder="%"
                                    />
                                    {formData.morning_tasks.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTask('morning_tasks', index)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addTask('morning_tasks')}
                                className="flex items-center gap-2 px-4 py-2 text-toss-blue hover:bg-toss-blue/10 rounded-xl transition-colors text-sm font-medium"
                            >
                                <PlusCircle size={16} />
                                업무 추가
                            </button>
                        </div>
                    </div>

                    {/* 오후 업무 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            오후 업무
                        </label>
                        <div className="space-y-2">
                            {formData.afternoon_tasks.map((task, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <span className="w-6 text-center text-sm font-medium text-toss-gray-500 pt-3">{index + 1}</span>
                                    <textarea
                                        value={task.content}
                                        onChange={(e) => updateTask('afternoon_tasks', index, 'content', e.target.value)}
                                        data-afternoon-task={index}
                                        rows={2}
                                        className="flex-1 px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all resize-none leading-relaxed"
                                        placeholder="업무 상세 내용 (Enter로 줄바꿈)"
                                    />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={task.progress}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                            if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                                                updateTask('afternoon_tasks', index, 'progress', val)
                                            }
                                        }}
                                        className="w-16 px-2 self-stretch bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all text-center"
                                        placeholder="%"
                                    />
                                    {formData.afternoon_tasks.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeTask('afternoon_tasks', index)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addTask('afternoon_tasks')}
                                className="flex items-center gap-2 px-4 py-2 text-toss-blue hover:bg-toss-blue/10 rounded-xl transition-colors text-sm font-medium"
                            >
                                <PlusCircle size={16} />
                                업무 추가
                            </button>
                        </div>
                    </div>

                    {/* 익일 업무 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            익일 업무
                        </label>
                        <textarea
                            value={formData.next_day_work}
                            onChange={(e) => setFormData({ ...formData, next_day_work: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all leading-relaxed"
                            placeholder="다음날 수행할 업무를 입력하세요"
                        />
                    </div>

                    {/* 특이사항(비고) */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            특이사항(비고)
                        </label>
                        <textarea
                            value={formData.special_notes}
                            onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all leading-relaxed"
                            placeholder="특이사항이나 비고사항을 입력하세요"
                        />
                    </div>

                    {/* 기존 파일 목록 (수정 모드일 때만) */}
                    {isEditMode && formData.existingFileUrls.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                기존 파일
                            </label>
                            <div className="space-y-2">
                                {formData.existingFileUrls.map((url, index) => {
                                    const fileName = url.split('/').pop()
                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 bg-toss-gray-50 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <File size={16} className="text-toss-gray-500" />
                                                <span className="text-sm text-toss-gray-700">{fileName}</span>
                                            </div>
                                            <button
                                                onClick={() => removeExistingFile(index)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* 파일 첨부 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            파일 첨부 (모든 파일 형식)
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-6 border-2 border-dashed border-toss-gray-300 rounded-2xl hover:border-toss-blue hover:bg-toss-blue/5 transition-all"
                        >
                            <div className="flex flex-col items-center gap-2 text-toss-gray-600">
                                <Upload size={28} />
                                <span className="font-medium">파일 선택하기</span>
                                <span className="text-xs text-toss-gray-500">여러 파일 선택 가능</span>
                            </div>
                        </button>

                        {formData.files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {formData.files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-toss-gray-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <File size={16} className="text-toss-gray-500" />
                                            <span className="text-sm text-toss-gray-700">{file.name}</span>
                                            <span className="text-xs text-toss-gray-500">({file.size})</span>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsModalOpen(false)
                                resetForm()
                            }}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={isEditMode ? handleEdit : handleCreate}
                            className="flex-1"
                            loading={uploading}
                            disabled={uploading}
                        >
                            {uploading ? '업로드 중...' : isEditMode ? '수정하기' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedWorklog && !isModalOpen}
                onClose={() => setSelectedWorklog(null)}
                title="일일 업무보고 상세"
            >
                {selectedWorklog && (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto -mx-2 px-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">작성일</label>
                                <p className="text-toss-gray-900">{formatDate(selectedWorklog.work_date)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">작성자</label>
                                <p className="text-toss-gray-900 font-medium">
                                    {selectedWorklog.user ? `${selectedWorklog.user.name} · ${selectedWorklog.user.team || '팀 미설정'}` : '-'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">오전 업무</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[80px]">
                                {selectedWorklog.morning_work ? (
                                    <div className="space-y-2">
                                        {stringToTasks(selectedWorklog.morning_work).map((task, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <span className="w-6 text-center text-sm font-medium text-toss-gray-500 flex-shrink-0">{index + 1}</span>
                                                <span className="flex-1 text-toss-gray-900">{task.content}</span>
                                                {task.progress && (
                                                    <span className="text-sm font-medium text-toss-blue flex-shrink-0">{task.progress}%</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-toss-gray-500">-</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">오후 업무</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[80px]">
                                {selectedWorklog.afternoon_work ? (
                                    <div className="space-y-2">
                                        {stringToTasks(selectedWorklog.afternoon_work).map((task, index) => (
                                            <div key={index} className="flex items-start gap-3">
                                                <span className="w-6 text-center text-sm font-medium text-toss-gray-500 flex-shrink-0">{index + 1}</span>
                                                <span className="flex-1 text-toss-gray-900">{task.content}</span>
                                                {task.progress && (
                                                    <span className="text-sm font-medium text-toss-blue flex-shrink-0">{task.progress}%</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-toss-gray-500">-</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">익일 업무</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[80px] whitespace-pre-wrap text-toss-gray-900">
                                {selectedWorklog.next_day_work || '-'}
                            </div>
                        </div>

                        {selectedWorklog.special_notes && (
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-2">특이사항(비고)</label>
                                <div className="bg-toss-gray-50 rounded-xl p-4 whitespace-pre-wrap text-toss-gray-900">
                                    {selectedWorklog.special_notes}
                                </div>
                            </div>
                        )}

                        {selectedWorklog.file_urls && selectedWorklog.file_urls.length > 0 && (
                            <ImageGallery urls={selectedWorklog.file_urls} />
                        )}

                        {/* 저장 버튼 */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => handleDownloadPdf(selectedWorklog)}
                                className="flex items-center gap-2 px-4 py-2 bg-toss-gray-100 text-toss-gray-700 rounded-xl hover:bg-toss-gray-200 transition-colors text-sm font-medium"
                            >
                                <Printer size={16} />
                                PDF 저장
                            </button>
                            <button
                                onClick={() => handleSaveAsWord(selectedWorklog)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                                <FileDown size={16} />
                                Word 저장
                            </button>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedWorklog(null)}
                                className="flex-1"
                            >
                                닫기
                            </Button>
                            <Button
                                onClick={() => openEditModal(selectedWorklog)}
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

export default WorkLogPage
