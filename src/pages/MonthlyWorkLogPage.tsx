import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal, PageHeader } from '../components/common'
import { Plus, FileText, Upload, Trash2, Calendar, Download, File, X, Edit2, ChevronLeft, ChevronRight, Printer, RefreshCw, PlusCircle, Copy, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { uploadMultipleToDropbox, deleteMultipleFilesByUrl } from '../lib/dropbox'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, convertInchesToTwip } from 'docx'
import { saveAs } from 'file-saver'
import { generateMonthlyWorklogPdf } from '../utils/worklogPdf'
import { printReport } from '../utils/printReport'
import {
    WeeklyTask,
    TaskDetail,
    createEmptyWeeklyTask,
    createEmptyDetail,
    weeklyTasksToString,
    parseWeeklyTasks,
    getWeeklyTaskPreview
} from '../utils/weeklyTaskUtils'

// Dropbox URL을 직접 이미지 링크로 변환
const convertDropboxUrl = (url: string) => {
    if (!url) return ''
    return url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '')
        .replace('&dl=0', '')
        .replace('?dl=1', '')
        .replace('&dl=1', '')
}

const getUrl = (item: any) => {
    let url = ''
    if (typeof item === 'string') url = item
    else if (item && item.url) url = item.url
    return convertDropboxUrl(url)
}

const isImageFile = (item: any) => {
    const url = getUrl(item)
    if (!url) return false
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const lowerUrl = url.toLowerCase()
    return imageExtensions.some(ext => lowerUrl.includes(ext))
}

// 이미지 갤러리 컴포넌트 (드래그 스크롤 + 스와이프 지원)
const ImageGallery = ({ urls }: { urls: any[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    // 드래그/스와이프 관련 상태
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [translateX, setTranslateX] = useState(0)

    const imageUrls = urls.filter(isImageFile)
    const otherUrls = urls.filter((item: any) => !isImageFile(item))

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return
            if (e.key === 'ArrowLeft') goToPrevious()
            if (e.key === 'ArrowRight') goToNext()
            if (e.key === 'Escape') closeModal()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndex, imageUrls.length])

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 200
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
            setTimeout(checkScroll, 300)
        }
    }

    const openImage = (index: number) => {
        setSelectedIndex(index)
        setTranslateX(0)
    }

    const closeModal = () => {
        setSelectedIndex(null)
        setTranslateX(0)
    }

    const goToPrevious = () => {
        setTranslateX(0)
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : imageUrls.length - 1))
    }

    const goToNext = () => {
        setTranslateX(0)
        setSelectedIndex((prev) => (prev !== null && prev < imageUrls.length - 1 ? prev + 1 : 0))
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (imageUrls.length <= 1) return
        setIsDragging(true)
        setStartX(e.clientX)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (imageUrls.length <= 1) return
        setIsDragging(true)
        setStartX(e.touches[0].clientX)
    }

    const handleMove = (clientX: number) => {
        if (!isDragging) return
        const diff = clientX - startX
        setTranslateX(diff)
    }

    const handleMouseMove = (e: React.MouseEvent) => { handleMove(e.clientX) }
    const handleTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }

    const handleDragEnd = () => {
        if (!isDragging) return
        setIsDragging(false)
        const threshold = 100
        if (translateX > threshold) goToPrevious()
        else if (translateX < -threshold) goToNext()
        else setTranslateX(0)
    }

    if (imageUrls.length === 0 && otherUrls.length === 0) return null

    return (
        <div className="space-y-3">
            {imageUrls.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">
                        사진 ({imageUrls.length}장)
                    </label>
                    <div className="relative">
                        {canScrollLeft && (
                            <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-1.5 hover:bg-white">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div ref={scrollRef} onScroll={checkScroll} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as any}>
                            {imageUrls.map((item: any, index: number) => {
                                const url = getUrl(item)
                                return (
                                    <div key={index} className="flex-shrink-0 cursor-pointer w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-toss-gray-100" onClick={() => openImage(index)}>
                                        <img src={url} alt={`첨부 이미지 ${index + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                    </div>
                                )
                            })}
                        </div>
                        {canScrollRight && (
                            <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-1.5 hover:bg-white">
                                <ChevronRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {otherUrls.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">기타 파일 ({otherUrls.length}개)</label>
                    <div className="space-y-2">
                        {otherUrls.map((item: any, index: number) => {
                            const url = getUrl(item)
                            const fileName = typeof item === 'string' ? url.split('/').pop() : (item.name || url.split('/').pop())
                            return (
                                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-toss-gray-50 rounded-xl hover:bg-toss-gray-100 transition-colors">
                                    <File size={16} className="text-toss-gray-500" />
                                    <span className="text-sm text-toss-blue hover:underline flex-1 truncate">{fileName}</span>
                                    <Download size={16} className="text-toss-gray-500" />
                                </a>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* 이미지 확대 모달 */}
            {selectedIndex !== null && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center select-none" style={{ zIndex: 9999 }} onClick={closeModal} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchEnd={handleDragEnd}>
                    <button className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={closeModal}>
                        <X size={24} />
                    </button>
                    <div className="absolute top-4 left-4 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                        {selectedIndex + 1} / {imageUrls.length}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        {imageUrls.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); goToPrevious(); }} className="flex-shrink-0 p-2 sm:p-3 text-white/80 hover:text-white transition-colors">
                                <ChevronLeft size={36} strokeWidth={3} />
                            </button>
                        )}
                        <div onClick={(e) => e.stopPropagation()} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} className="max-w-[70vw] sm:max-w-[80vw] max-h-[90vh] relative cursor-grab active:cursor-grabbing" style={{ transform: `translateX(${translateX}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}>
                            <img src={getUrl(imageUrls[selectedIndex])} alt={`확대 이미지 ${selectedIndex + 1}`} className="max-w-full max-h-[90vh] object-contain rounded-lg pointer-events-none" draggable={false} />
                        </div>
                        {imageUrls.length > 1 && (
                            <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="flex-shrink-0 p-2 sm:p-3 text-white/80 hover:text-white transition-colors">
                                <ChevronRight size={36} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                    {imageUrls.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            {imageUrls.map((_: any, index: number) => (
                                <div key={index} className={`w-2 h-2 rounded-full transition-colors ${index === selectedIndex ? 'bg-white' : 'bg-white/30'}`} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const MonthlyWorkLogPage = () => {
    const { profile, isAdmin } = useAuth()
    const [worklogs, setWorklogs] = useState<any[]>([])
    const [filteredWorklogs, setFilteredWorklogs] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showWriteTip, setShowWriteTip] = useState(true)
    const [isEditMode, setIsEditMode] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedWorklog, setSelectedWorklog] = useState<any>(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedUserId, setSelectedUserId] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [loadingWeeklyLogs, setLoadingWeeklyLogs] = useState(false)
    const [weeklyPreviewOpen, setWeeklyPreviewOpen] = useState(false)
    const [weeklyPreviewTasks, setWeeklyPreviewTasks] = useState<WeeklyTask[]>([])
    const [formData, setFormData] = useState({
        work_date: new Date().toISOString().split('T')[0],
        monthly_tasks: [createEmptyWeeklyTask()] as WeeklyTask[],
        special_notes: '',
        files: [] as { file: File; name: string; size: string }[],
        existingFileUrls: [] as string[]
    })

    const startYear = 2026
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)

    useEffect(() => { fetchWorklogs() }, [])

    useEffect(() => { filterWorklogsByDate() }, [worklogs, selectedYear, selectedUserId])

    const filterWorklogsByDate = () => {
        const filtered = worklogs.filter((log: any) => {
            const logDate = new Date(log.work_date)
            const dateMatch = logDate.getFullYear() === selectedYear
            const userMatch = selectedUserId === 'all' || log.user_id === selectedUserId
            return dateMatch && userMatch
        })
        setFilteredWorklogs(filtered)
        setCurrentPage(1)
    }

    const uniqueUsers = Array.from(new Set(worklogs.map((log: any) => log.user_id)))
        .map(userId => {
            const log = worklogs.find((l: any) => l.user_id === userId)
            return { user_id: userId, name: log?.user?.name || '알 수 없음' }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

    const fetchWorklogs = async () => {
        try {
            let query = supabase
                .from('work_logs')
                .select('*')
                .eq('type', 'monthly')
                .order('work_date', { ascending: false })

            // 모든 사용자가 전체 보고서 열람 가능

            const { data: worklogsData, error: worklogsError } = await query
            if (worklogsError) throw worklogsError

            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('user_id, name, team, rank')
            if (usersError) throw usersError

            const worklogsWithUsers = (worklogsData || []).map((worklog: any) => {
                const user = (usersData || []).find((u: any) => u.user_id === worklog.user_id)
                return { ...worklog, user: user || { name: '알 수 없음', team: '-', rank: '-' } }
            })

            setWorklogs(worklogsWithUsers)
        } catch (error) {
            console.error('Error fetching worklogs:', error)
        } finally {
            setLoading(false)
        }
    }

    // === 업무 항목 관리 함수 ===
    const addMonthlyTask = () => {
        setFormData(prev => ({
            ...prev,
            monthly_tasks: [...prev.monthly_tasks, createEmptyWeeklyTask()]
        }))
    }

    const removeMonthlyTask = (index: number) => {
        setFormData(prev => ({
            ...prev,
            monthly_tasks: prev.monthly_tasks.filter((_, i) => i !== index)
        }))
    }

    const updateTaskTitle = (taskIndex: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            monthly_tasks: prev.monthly_tasks.map((task, i) =>
                i === taskIndex ? { ...task, title: value } : task
            )
        }))
    }

    const addTaskDetail = (taskIndex: number) => {
        setFormData(prev => ({
            ...prev,
            monthly_tasks: prev.monthly_tasks.map((task, i) =>
                i === taskIndex ? { ...task, details: [...task.details, createEmptyDetail()] } : task
            )
        }))
    }

    const removeTaskDetail = (taskIndex: number, detailIndex: number) => {
        setFormData(prev => ({
            ...prev,
            monthly_tasks: prev.monthly_tasks.map((task, i) =>
                i === taskIndex ? { ...task, details: task.details.filter((_, di) => di !== detailIndex) } : task
            )
        }))
    }

    const updateTaskDetail = (taskIndex: number, detailIndex: number, field: keyof TaskDetail, value: string) => {
        setFormData(prev => ({
            ...prev,
            monthly_tasks: prev.monthly_tasks.map((task, i) =>
                i === taskIndex ? {
                    ...task,
                    details: task.details.map((detail, di) =>
                        di === detailIndex ? { ...detail, [field]: value } : detail
                    )
                } : task
            )
        }))
    }

    // === 파일 관리 ===
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        const fileData = selectedFiles.map(file => ({
            file,
            name: file.name,
            size: (file.size / 1024).toFixed(0) + 'KB'
        }))
        setFormData(prev => ({ ...prev, files: [...prev.files, ...fileData] }))
    }

    const removeFile = (index: number) => {
        setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
    }

    const removeExistingFile = (index: number) => {
        setFormData(prev => ({ ...prev, existingFileUrls: prev.existingFileUrls.filter((_, i) => i !== index) }))
    }

    const uploadFiles = async (files: { file: File }[]) => {
        const folder = `/intranet/worklogs/monthly/${(profile as any).user_id}`
        const results = await uploadMultipleToDropbox(files.map(f => f.file), folder)
        return results.map((r: any) => r.url)
    }

    // === 생성/수정 ===
    const handleCreate = async () => {
        const serialized = weeklyTasksToString(formData.monthly_tasks)
        if (!serialized) {
            alert('월간 업무를 하나 이상 입력해주세요.')
            return
        }

        try {
            setUploading(true)
            let fileUrls: string[] = []
            if (formData.files.length > 0) {
                fileUrls = await uploadFiles(formData.files)
            }

            const { error } = await supabase.from('work_logs').insert({
                work_date: formData.work_date,
                morning_work: serialized,
                special_notes: formData.special_notes,
                file_urls: fileUrls,
                user_id: (profile as any).user_id,
                type: 'monthly',
                is_read: false
            })

            if (error) throw error
            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('월간 업무보고가 저장되었습니다.')
        } catch (error: any) {
            console.error('Error creating worklog:', error)
            alert('월간 업무보고 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        const serialized = weeklyTasksToString(formData.monthly_tasks)
        if (!serialized) {
            alert('월간 업무를 하나 이상 입력해주세요.')
            return
        }

        if (!selectedWorklog?.id) {
            alert('수정할 업무보고를 찾을 수 없습니다.')
            return
        }

        const worklogId = selectedWorklog.id

        try {
            setUploading(true)
            let newFileUrls: string[] = []
            if (formData.files.length > 0) {
                newFileUrls = await uploadFiles(formData.files)
            }

            const allFileUrls = [...formData.existingFileUrls, ...newFileUrls]

            const { error } = await supabase
                .from('work_logs')
                .update({
                    work_date: formData.work_date,
                    morning_work: serialized,
                    special_notes: formData.special_notes,
                    file_urls: allFileUrls
                })
                .eq('id', worklogId)

            if (error) throw error
            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('월간 업무보고가 수정되었습니다.')
        } catch (error: any) {
            console.error('Error updating worklog:', error)
            alert('월간 업무보고 수정에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    // 해당 월의 시작일과 종료일 계산
    const getMonthRange = (dateString: string) => {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = date.getMonth()
        const start = new Date(year, month, 1).toISOString().split('T')[0]
        const end = new Date(year, month + 1, 0).toISOString().split('T')[0]
        return { start, end }
    }

    // 주간 업무 불러오기 (주간 데이터를 월간 tasks에 병합)
    const fetchWeeklyWorklogs = async () => {
        if (!(profile as any)?.user_id) return

        setLoadingWeeklyLogs(true)
        try {
            const { start, end } = getMonthRange(formData.work_date)

            const { data, error } = await supabase
                .from('work_logs')
                .select('work_date, morning_work')
                .eq('user_id', (profile as any).user_id)
                .eq('type', 'weekly')
                .gte('work_date', start)
                .lte('work_date', end)
                .order('work_date', { ascending: true })

            if (error) throw error

            if (!data || data.length === 0) {
                alert('해당 월에 작성된 주간 업무가 없습니다.')
                return
            }

            // 주간 데이터를 파싱해서 월간 tasks로 병합
            const mergedTasks: WeeklyTask[] = []
            data.forEach(log => {
                const date = new Date(log.work_date)
                const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
                const weekNumber = Math.ceil((date.getDate() + firstDayOfMonth.getDay()) / 7)
                const weekLabel = `${weekNumber}주차`

                const weeklyTasks = parseWeeklyTasks(log.morning_work)
                weeklyTasks.forEach(task => {
                    mergedTasks.push({
                        title: task.title ? `[${weekLabel}] ${task.title}` : `[${weekLabel}]`,
                        details: task.details
                    })
                })
            })

            if (mergedTasks.length === 0) {
                alert('해당 월에 작성된 주간 업무 내용이 없습니다.')
                return
            }

            setWeeklyPreviewTasks(mergedTasks)
            setWeeklyPreviewOpen(true)
        } catch (error) {
            console.error('Error fetching weekly worklogs:', error)
            alert('주간 업무를 불러오는데 실패했습니다.')
        } finally {
            setLoadingWeeklyLogs(false)
        }
    }

    const resetForm = () => {
        setFormData({
            work_date: new Date().toISOString().split('T')[0],
            monthly_tasks: [createEmptyWeeklyTask()],
            special_notes: '',
            files: [],
            existingFileUrls: []
        })
        setIsEditMode(false)
        setSelectedWorklog(null)
        setWeeklyPreviewOpen(false)
        setWeeklyPreviewTasks([])
    }

    const openEditModal = (worklog: any) => {
        setFormData({
            work_date: worklog.work_date,
            monthly_tasks: parseWeeklyTasks(worklog.morning_work || ''),
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

    const handleDelete = async (worklog: any) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
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

    const viewWorklogDetail = async (worklog: any) => {
        setSelectedWorklog(worklog)

        if (isAdmin && !worklog.is_read) {
            await supabase
                .from('work_logs')
                .update({ is_read: true })
                .eq('id', worklog.id)
            fetchWorklogs()
        }
    }

    const getMonthLabel = (dateString: string) => {
        const date = new Date(dateString)
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    // === Word 저장 (4열 테이블) ===
    const handleSaveAsWord = async (worklog: any) => {
        const tableBorders = {
            top: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        }

        const headerCellStyle = {
            shading: { fill: 'F8F9FA' },
            borders: tableBorders,
            verticalAlign: 'center' as const,
        }

        const createContentParagraphs = (text: string) => {
            if (!text) return [new Paragraph({ text: '' })]
            return text.split('\n').map(line =>
                new Paragraph({ children: [new TextRun({ text: line || ' ', size: 24 })], spacing: { line: 360 } })
            )
        }

        // 기본 정보 테이블
        const infoTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '보고기간', bold: true, size: 24 })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE }, ...headerCellStyle }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getMonthLabel(worklog.work_date), size: 24 })] })], width: { size: 35, type: WidthType.PERCENTAGE }, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '소속', bold: true, size: 24 })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE }, ...headerCellStyle }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: worklog.user?.team || '-', size: 24 })] })], width: { size: 35, type: WidthType.PERCENTAGE }, borders: tableBorders }),
                    ],
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '직급', bold: true, size: 24 })], alignment: AlignmentType.CENTER })], ...headerCellStyle }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: worklog.user?.rank || '-', size: 24 })] })], borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '성명', bold: true, size: 24 })], alignment: AlignmentType.CENTER })], ...headerCellStyle }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: worklog.user?.name || '-', size: 24 })] })], borders: tableBorders }),
                    ],
                }),
            ],
        })

        // 월간 업무 파싱 후 4열 테이블 생성
        const tasks = parseWeeklyTasks(worklog.morning_work)

        const workContentTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                // 섹션 제목
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ children: [new TextRun({ text: 'Ⅰ. 금월 업무 수행 내용', bold: true, size: 24 })] })],
                            columnSpan: 4,
                            ...headerCellStyle,
                        }),
                    ],
                }),
                // 컬럼 헤더
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 7, type: WidthType.PERCENTAGE }, shading: { fill: 'F0F0F0' }, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '업무내용', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 58, type: WidthType.PERCENTAGE }, shading: { fill: 'F0F0F0' }, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '진척률', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE }, shading: { fill: 'F0F0F0' }, borders: tableBorders }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '비고', bold: true, size: 22 })], alignment: AlignmentType.CENTER })], width: { size: 23, type: WidthType.PERCENTAGE }, shading: { fill: 'F0F0F0' }, borders: tableBorders }),
                    ],
                }),
                // 데이터 행 (제목은 별도 행, detail별로 행 분리하여 진척률/비고 매칭)
                ...tasks.flatMap((task, idx) => {
                    const totalRows = (task.title ? 1 : 0) + task.details.length
                    const lightBorders = {
                        top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                        left: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
                        right: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
                    }
                    const rows: any[] = []
                    // 제목 행 (진척률/비고 비움)
                    if (task.title) {
                        rows.push(new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 22 })], alignment: AlignmentType.CENTER })],
                                    borders: tableBorders,
                                    verticalAlign: 'top' as any,
                                    rowSpan: totalRows,
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: `[${task.title}]`, bold: true, size: 22 })] })],
                                    borders: lightBorders,
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                }),
                                new TableCell({ children: [new Paragraph({ text: '' })], borders: lightBorders }),
                                new TableCell({ children: [new Paragraph({ text: '' })], borders: lightBorders }),
                            ],
                        }))
                    }
                    // detail 행들
                    task.details.forEach((detail, dIdx) => {
                        const contentParagraphs: any[] = []
                        detail.content.split('\n').forEach(line => {
                            if (line.trim()) {
                                contentParagraphs.push(new Paragraph({ children: [new TextRun({ text: `- ${line}`, size: 22 })] }))
                            }
                        })
                        const isLast = dIdx === task.details.length - 1
                        const rowBorders = isLast ? tableBorders : lightBorders
                        rows.push(new TableRow({
                            children: [
                                ...(!task.title && dIdx === 0 ? [new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 22 })], alignment: AlignmentType.CENTER })],
                                    borders: tableBorders,
                                    verticalAlign: 'top' as any,
                                    rowSpan: totalRows,
                                })] : []),
                                new TableCell({
                                    children: contentParagraphs,
                                    borders: rowBorders,
                                    margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: detail.progress ? detail.progress + '%' : '-', size: 22 })], alignment: AlignmentType.CENTER })], borders: rowBorders, verticalAlign: 'top' as any }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: detail.remark || '-', size: 22 })] })],
                                    borders: rowBorders,
                                    margins: { left: 100, right: 100 },
                                    verticalAlign: 'top' as any,
                                }),
                            ],
                        }))
                    })
                    return rows
                }),
            ],
        })

        // 특이사항 테이블
        const notesTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ⅱ. 특이사항 및 건의사항', bold: true, size: 24 })] })], ...headerCellStyle })] }),
                new TableRow({ children: [new TableCell({ children: createContentParagraphs(worklog.special_notes || ' '), borders: tableBorders, margins: { top: convertInchesToTwip(0.15), bottom: convertInchesToTwip(0.15), left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) } })] }),
            ],
        })

        const doc = new Document({
            sections: [{
                properties: {
                    page: { margin: { top: convertInchesToTwip(0.6), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.8), right: convertInchesToTwip(0.8) } },
                },
                children: [
                    new Paragraph({ children: [new TextRun({ text: `작성일: ${formatDate(worklog.work_date)}`, size: 22, color: '666666' })], alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
                    new Paragraph({ children: [new TextRun({ text: '월 간 업 무 보 고 서', bold: true, size: 44 })], alignment: AlignmentType.CENTER, spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '333333' } } }),
                    new Paragraph({ text: '', spacing: { after: 300 } }),
                    infoTable,
                    new Paragraph({ text: '', spacing: { after: 300 } }),
                    workContentTable,
                    new Paragraph({ text: '', spacing: { after: 300 } }),
                    notesTable,
                    new Paragraph({ text: '', spacing: { after: 400 } }),
                    new Paragraph({ children: [new TextRun({ text: '한인구조단', bold: true, size: 26 })], alignment: AlignmentType.CENTER }),
                ],
            }],
        })

        const blob = await Packer.toBlob(doc)
        saveAs(blob, `월간업무보고_${getMonthLabel(worklog.work_date)}_${worklog.user?.name || '작성자'}.docx`)
    }

    // PDF 다운로드
    const handleDownloadPdf = (worklog: any) => {
        generateMonthlyWorklogPdf(worklog, getMonthLabel, formatDate)
    }

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = [...filteredWorklogs]
        .sort((a, b) => {
            const dateCmp = (b.work_date || '').localeCompare(a.work_date || '') // 최신 날짜 먼저(그룹 유지)
            if (dateCmp !== 0) return dateCmp
            return (a.user?.name || '').localeCompare(b.user?.name || '', 'ko') // 같은 날짜는 작성자 가나다
        })
        .slice(indexOfFirstItem, indexOfLastItem)

    // 작업일이 오늘인 경우에만 NEW 표시 (다음날 자동 사라짐)
    const isNew = (log: any) => {
        const n = new Date()
        const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
        return log?.work_date === today
    }

    // 월별로 묶어 두 가지 회색으로 번갈아 표시 (가독성)
    const monthParity: Record<string, number> = {}
    let parityToggle = 0
    currentItems.forEach((log: any) => {
        const key = getMonthLabel(log.work_date)
        if (!(key in monthParity)) { monthParity[key] = parityToggle % 2; parityToggle += 1 }
    })
    const rowBg = (log: any) => (monthParity[getMonthLabel(log.work_date)] === 1 ? 'bg-toss-gray-100' : 'bg-toss-gray-50')
    const totalPages = Math.ceil(filteredWorklogs.length / itemsPerPage)
    const goToPage = (pageNumber: number) => { setCurrentPage(pageNumber) }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }
    const toggleSelectAll = () => {
        if (currentItems.length > 0 && currentItems.every((item: any) => selectedIds.has(item.id))) {
            setSelectedIds(prev => {
                const next = new Set(prev)
                currentItems.forEach((item: any) => next.delete(item.id))
                return next
            })
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev)
                currentItems.forEach((item: any) => next.add(item.id))
                return next
            })
        }
    }

    // === 인쇄 (4열 테이블) ===
    const handlePrintList = () => {
        const printList = selectedIds.size > 0
            ? filteredWorklogs.filter((r: any) => selectedIds.has(r.id))
            : filteredWorklogs
        const label = selectedIds.size > 0 ? `선택 항목 (${printList.length}건)` : `전체 (${printList.length}건)`

        const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')

        const content = `
            <div class="section-title">월간 업무보고 - ${label}</div>
            ${printList.map((r: any, i: number) => {
                const tasks = parseWeeklyTasks(r.morning_work)
                return `
                    <div style="margin-bottom: 24px; page-break-inside: avoid;">
                        <div style="font-weight: bold; font-size: 13px; margin-bottom: 6px; color: #333;">
                            ${i + 1}. ${getMonthLabel(r.work_date)} - ${r.user?.name || '-'} (${r.user?.team || '-'})
                        </div>
                        <table>
                            <colgroup><col style="width:5%"/><col style="width:58%"/><col style="width:10%"/><col style="width:27%"/></colgroup>
                            <thead><tr><th>No</th><th>업무내용</th><th>진척률</th><th>비고</th></tr></thead>
                            <tbody>
                                ${tasks.map((t, idx) => {
                                    const totalRows = (t.title ? 1 : 0) + t.details.length
                                    const rows: string[] = []
                                    // 제목 행 (진척률/비고 비움)
                                    if (t.title) {
                                        rows.push(`<tr>
                                            <td style="text-align:center;vertical-align:top" rowspan="${totalRows}">${idx + 1}</td>
                                            <td style="text-align:left;font-weight:bold;border-bottom:1px solid #ccc">[${escapeHtml(t.title)}]</td>
                                            <td style="border-bottom:1px solid #ccc"></td>
                                            <td style="border-bottom:1px solid #ccc"></td>
                                        </tr>`)
                                    }
                                    // detail 행들
                                    t.details.forEach((d: any, di: number) => {
                                        const contentLines = (d.content || '-').split('\n').map((line: string) => line.trim() ? `- ${escapeHtml(line)}` : '').filter(Boolean).join('<br/>')
                                        const isLast = di === t.details.length - 1
                                        const borderBottom = isLast ? '' : 'border-bottom:1px solid #ccc'
                                        const noCell = !t.title && di === 0 ? `<td style="text-align:center;vertical-align:top" rowspan="${totalRows}">${idx + 1}</td>` : ''
                                        rows.push(`<tr>
                                            ${noCell}
                                            <td style="text-align:left;white-space:pre-line;${borderBottom}">${contentLines}</td>
                                            <td style="text-align:center;vertical-align:top;${borderBottom}">${d.progress ? d.progress + '%' : '-'}</td>
                                            <td style="text-align:left;vertical-align:top;${borderBottom}">${escapeHtml(d.remark || '') || '-'}</td>
                                        </tr>`)
                                    })
                                    return rows.join('')
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `
            }).join('')}
        `
        printReport({ title: '월간 업무보고', content })
    }

    // === 상세 보기 업무 테이블 렌더링 ===
    const renderTaskDetailTable = (morningWork: string) => {
        const tasks = parseWeeklyTasks(morningWork)

        return (
            <div className="bg-toss-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-toss-gray-200">
                        <tr>
                            <th className="px-3 py-2 text-center font-semibold text-toss-gray-700 whitespace-nowrap w-10">No</th>
                            <th className="px-3 py-2 text-left font-semibold text-toss-gray-700 whitespace-nowrap">제목</th>
                            <th className="px-3 py-2 text-left font-semibold text-toss-gray-700">업무내용</th>
                            <th className="px-3 py-2 text-center font-semibold text-toss-gray-700 whitespace-nowrap w-16">진척률</th>
                            <th className="px-3 py-2 text-left font-semibold text-toss-gray-700 whitespace-nowrap">비고</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-toss-gray-100">
                        {tasks.map((task, idx) =>
                            task.details.map((detail, dIdx) => (
                                <tr key={`${idx}-${dIdx}`}>
                                    {dIdx === 0 && (
                                        <>
                                            <td className="px-3 py-2 text-center text-toss-gray-500" rowSpan={task.details.length}>{idx + 1}</td>
                                            <td className="px-3 py-2 text-toss-gray-900 font-medium whitespace-nowrap" rowSpan={task.details.length}>{task.title || '-'}</td>
                                        </>
                                    )}
                                    <td className="px-3 py-2 text-toss-gray-900 whitespace-pre-wrap">{detail.content}</td>
                                    <td className="px-3 py-2 text-center">
                                        {detail.progress ? (
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                Number(detail.progress) >= 100 ? 'bg-green-100 text-green-700' :
                                                Number(detail.progress) >= 50 ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {detail.progress}%
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-toss-gray-600">{detail.remark || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={isAdmin ? '전체 월간 업무보고' : '월간 업무보고'}
                subtitle={isAdmin ? '관리자 권한으로 모든 직원의 월간 업무보고를 확인할 수 있습니다' :
                    `${(profile as any)?.name || '사용자'}님 · ${(profile as any)?.team ? `${(profile as any).team} · ` : ''}${(profile as any)?.rank || '직급 미설정'}`}
                icon={FileText}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-3.5 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm text-toss-gray-700 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}년</option>
                        ))}
                    </select>

                    {uniqueUsers.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="px-3.5 py-2 bg-white border border-toss-gray-200 rounded-toss text-sm text-toss-gray-700 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                        >
                            <option value="all">전체 작성자</option>
                            {uniqueUsers.map(user => (
                                <option key={user.user_id} value={user.user_id}>{user.name}</option>
                            ))}
                        </select>
                    )}

                    <Button variant="secondary" onClick={handlePrintList}>
                        <Printer size={18} />
                        인쇄 {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </Button>
                    <Button onClick={openCreateModal} className="bg-purple-500 hover:bg-purple-600">
                        <Plus size={18} />
                        새 월간 업무보고
                    </Button>
                </div>
            </div>

            <Card padding="p-0 sm:p-6">
                {loading ? (
                    <div className="text-center text-toss-gray-400 py-12">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                                <thead className="bg-toss-gray-50 border-b border-toss-gray-200">
                                    <tr>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase w-10">
                                            <input type="checkbox" checked={currentItems.length > 0 && currentItems.every((item: any) => selectedIds.has(item.id))} onChange={toggleSelectAll} className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer" />
                                        </th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase whitespace-nowrap">No</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase whitespace-nowrap">해당 월</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase whitespace-nowrap">작성자</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase whitespace-nowrap">팀</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">월간 업무</th>
                                        <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase whitespace-nowrap">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-100">
                                    {currentItems.map((log: any, index: number) => (
                                        <tr key={log.id} className={`${rowBg(log)} hover:bg-toss-blue/5 transition-colors`}>
                                            <td className="px-3 py-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => toggleSelect(log.id)} className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer" />
                                            </td>
                                            <td className="px-3 py-3 text-sm text-center text-toss-gray-600 whitespace-nowrap">{indexOfFirstItem + index + 1}</td>
                                            <td className="px-3 py-3 text-sm text-toss-gray-900 cursor-pointer hover:text-purple-600 whitespace-nowrap" onClick={() => viewWorklogDetail(log)}>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} className="text-toss-gray-400 flex-shrink-0" />
                                                    <span>{getMonthLabel(log.work_date)}</span>
                                                    {isNew(log) && (
                                                        <span className="inline-block bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0">N</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-toss-gray-900 whitespace-nowrap">{log.user?.name || '-'}</td>
                                            <td className="px-3 py-3 text-sm text-toss-gray-600 whitespace-nowrap">{log.user?.team || '-'}</td>
                                            <td className="px-3 py-3 text-sm text-toss-gray-700 cursor-pointer max-w-xs truncate" onClick={() => viewWorklogDetail(log)}>
                                                {getWeeklyTaskPreview(log.morning_work)}
                                            </td>
                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadPdf(log) }} className="p-2 text-purple-500 hover:bg-purple-100 rounded-lg transition-colors" title="인쇄">
                                                        <Printer size={16} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleSaveAsWord(log) }} className="p-2 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg transition-colors" title="Word 다운로드">
                                                        <Download size={16} />
                                                    </button>
                                                    {((profile as any)?.user_id === log.user_id || isAdmin) && (
                                                        <>
                                                            <button onClick={() => openEditModal(log)} className="p-2 text-purple-500 hover:bg-purple-100 rounded-lg transition-colors" title="수정">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(log)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="삭제">
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
                            {currentItems.map((log: any, index: number) => (
                                <div
                                    key={log.id}
                                    className={`p-4 ${rowBg(log)}`}
                                    onClick={() => viewWorklogDetail(log)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => toggleSelect(log.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer" />
                                            <span className="text-xs text-toss-gray-500">#{indexOfFirstItem + index + 1}</span>
                                            <Calendar size={14} className="text-toss-gray-400" />
                                            <span className="text-sm font-medium text-toss-gray-900">
                                                {getMonthLabel(log.work_date)}
                                            </span>
                                            {isNew(log) && (
                                                <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleDownloadPdf(log)} className="p-1.5 text-purple-500 hover:bg-purple-100 rounded-lg">
                                                <Printer size={14} />
                                            </button>
                                            <button onClick={() => handleSaveAsWord(log)} className="p-1.5 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg">
                                                <Download size={14} />
                                            </button>
                                            {((profile as any)?.user_id === log.user_id || isAdmin) && (
                                                <>
                                                    <button onClick={() => openEditModal(log)} className="p-1.5 text-purple-500 hover:bg-purple-100 rounded-lg">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(log)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-toss-gray-600 mb-2">
                                        <span className="font-medium">{log.user?.name || '-'}</span>
                                        <span className="mx-1">·</span>
                                        <span>{log.user?.team || '-'}</span>
                                    </div>
                                    <p className="text-sm text-toss-gray-700 line-clamp-2">
                                        {getWeeklyTaskPreview(log.morning_work)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-toss-gray-200">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-toss text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    이전
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => goToPage(i + 1)}
                                        className={`px-3 py-1 rounded-toss text-sm font-medium ${
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
                                    className="px-3 py-1 rounded-toss text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-toss-gray-400 py-12">
                        {selectedYear}년에 등록된 월간 업무보고가 없습니다
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
                title={isEditMode ? '월간 업무보고 수정' : '새 월간 업무보고 작성'}
                size={weeklyPreviewOpen ? 'xl' : 'default'}
            >
                <div className={`flex gap-6`}>
                <div className={`space-y-6 max-h-[70vh] overflow-y-auto pr-2 ${weeklyPreviewOpen ? 'flex-1 min-w-0' : 'w-full'}`}>
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            작성일 *
                        </label>
                        <input
                            type="date"
                            value={formData.work_date}
                            onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                        <p className="text-sm text-toss-gray-500 mt-1">
                            {getMonthLabel(formData.work_date)} 업무보고
                        </p>
                    </div>

                    {/* 작성 가이드 */}
                    <div className="rounded-toss border border-toss-blue/20 bg-toss-blue/5 overflow-hidden">
                        <button type="button" onClick={() => setShowWriteTip(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-toss-blue">
                            <span className="flex items-center gap-2"><AlertCircle size={16} /> 작성 팁 — 누가 읽어도 알 수 있게</span>
                            <ChevronRight size={16} className={`transition-transform ${showWriteTip ? 'rotate-90' : ''}`} />
                        </button>
                        {showWriteTip && (
                            <div className="px-4 pb-3 text-xs text-toss-gray-600 space-y-1.5">
                                <p>업무를 <b className="text-toss-gray-800">무엇을 · 왜·대상 · 결과</b> 순서로 적으면 명확해져요.</p>
                                <p className="text-green-600">○ 좋은 예: 강화센터 입소자 3명 주민등록 신청 완료 (OO주민센터 방문, 처리 완료)</p>
                                <p className="text-toss-gray-400">△ 아쉬운 예: 주민등록 처리함</p>
                                <p className="text-toss-gray-500">대상·수량·결과가 드러나게 적으면 누가 읽어도 이해하기 쉬워요.</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-toss-gray-700">
                                월간 업무 *
                            </label>
                            <button
                                type="button"
                                onClick={fetchWeeklyWorklogs}
                                disabled={loadingWeeklyLogs}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={loadingWeeklyLogs ? 'animate-spin' : ''} />
                                {loadingWeeklyLogs ? '불러오는 중...' : '주간 업무 불러오기'}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.monthly_tasks.map((task, index) => (
                                <div key={index} className="bg-toss-gray-50 rounded-xl p-3 space-y-2">
                                    {/* 제목 + 항목 삭제 버튼 */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={task.title}
                                            onChange={(e) => updateTaskTitle(index, e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                            placeholder="제목"
                                        />
                                        {formData.monthly_tasks.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeMonthlyTask(index)}
                                                className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 w-[28px] flex items-center justify-center"
                                                title="항목 삭제"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        {formData.monthly_tasks.length <= 1 && <div className="w-[28px] flex-shrink-0"></div>}
                                    </div>

                                    {/* 업무내용 행 헤더 */}
                                    <div className="hidden sm:grid sm:grid-cols-[1fr_50px_100px_28px] gap-2 px-1">
                                        <span className="text-xs font-medium text-toss-gray-500">업무내용</span>
                                        <span className="text-xs font-medium text-toss-gray-500 text-center">진척률</span>
                                        <span className="text-xs font-medium text-toss-gray-500">비고</span>
                                        <span></span>
                                    </div>

                                    {/* 업무내용 행들 */}
                                    {task.details.map((detail, dIdx) => (
                                        <div key={dIdx} className="grid grid-cols-1 sm:grid-cols-[1fr_50px_100px_28px] gap-2 items-stretch">
                                            <div className="flex flex-col">
                                                <label className="sm:hidden text-xs text-toss-gray-500 mb-1 block">업무내용</label>
                                                <textarea
                                                    value={detail.content}
                                                    onChange={(e) => updateTaskDetail(index, dIdx, 'content', e.target.value)}
                                                    rows={2}
                                                    className="w-full flex-1 px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none leading-relaxed"
                                                    placeholder="예: 9월 강화 신규 입소 8명·퇴소 5명 처리, 재외동포 행사 1회 지원 완료"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="sm:hidden text-xs text-toss-gray-500 mb-1 block">진척률(%)</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={detail.progress}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '')
                                                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                                                            updateTaskDetail(index, dIdx, 'progress', val)
                                                        }
                                                    }}
                                                    className="w-full flex-1 px-2 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                                    placeholder="%"
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <label className="sm:hidden text-xs text-toss-gray-500 mb-1 block">비고</label>
                                                <input
                                                    type="text"
                                                    value={detail.remark}
                                                    onChange={(e) => updateTaskDetail(index, dIdx, 'remark', e.target.value)}
                                                    className="w-full flex-1 px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                                    placeholder="비고"
                                                />
                                            </div>
                                            <div className="flex items-center justify-center">
                                                {task.details.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTaskDetail(index, dIdx)}
                                                        className="p-1 text-toss-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        title="내용 삭제"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* 내용 추가 버튼 */}
                                    <button
                                        type="button"
                                        onClick={() => addTaskDetail(index)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                    >
                                        <Plus size={14} /> 내용 추가
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addMonthlyTask}
                                className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors text-sm font-medium"
                            >
                                <PlusCircle size={16} /> 항목 추가
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            특이사항(비고)
                        </label>
                        <textarea
                            value={formData.special_notes}
                            onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all leading-relaxed"
                            placeholder="특이사항이나 비고사항을 입력하세요"
                        />
                    </div>

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

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            파일 첨부
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
                            className="w-full p-6 border-2 border-dashed border-toss-gray-300 rounded-2xl hover:border-purple-500 hover:bg-purple-50/50 transition-all"
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
                            className="flex-1 bg-purple-500 hover:bg-purple-600"
                            loading={uploading}
                            disabled={uploading}
                        >
                            {uploading ? '업로드 중...' : isEditMode ? '수정하기' : '저장하기'}
                        </Button>
                    </div>
                </div>

                {/* 오른쪽: 주간 업무 미리보기 패널 */}
                {weeklyPreviewOpen && (
                    <div className="flex-1 min-w-0 flex flex-col max-h-[70vh]">
                        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border border-purple-200 rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-purple-600" />
                                <span className="text-sm font-semibold text-purple-800">주간 업무 내역</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setWeeklyPreviewOpen(false); setWeeklyPreviewTasks([]) }}
                                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto border-x border-purple-200 bg-white px-4 py-3">
                            {weeklyPreviewTasks.length > 0 ? (
                                <div className="space-y-3">
                                    {weeklyPreviewTasks.map((task, idx) => {
                                        // title에서 주차와 제목 분리: "[1주차] 제목" → 주차: "1주차", 제목: "제목"
                                        const weekMatch = (task.title || '').match(/^\[(\d+주차)\]\s*(.*)$/)
                                        const weekLabel = weekMatch ? weekMatch[1] : ''
                                        const taskTitle = weekMatch ? weekMatch[2] : (task.title || '')
                                        // 이전 항목과 같은 주차면 주차 라벨 생략
                                        const prevMatch = idx > 0 ? (weeklyPreviewTasks[idx - 1].title || '').match(/^\[(\d+주차)\]/) : null
                                        const prevWeekLabel = prevMatch ? prevMatch[1] : ''
                                        const showWeekLabel = weekLabel && weekLabel !== prevWeekLabel
                                        return (
                                            <div key={idx} className="bg-purple-50/50 rounded-lg p-3">
                                                {showWeekLabel && <div className="text-sm font-semibold text-purple-600 mb-0.5">[{weekLabel}]</div>}
                                                {taskTitle && <div className="text-sm font-semibold text-purple-800 mb-1">[{taskTitle}]</div>}
                                                {!showWeekLabel && !taskTitle && <div className="text-sm font-semibold text-purple-800 mb-1">[-]</div>}
                                                {task.details.map((d, di) => (
                                                    <div key={di} className="text-sm text-toss-gray-700 ml-2 mb-1">
                                                        {(d.content || '-').split('\n').map((line, li) => (
                                                            <div key={li}>{line.trim() ? `- ${line.trim()}` : ''}</div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-toss-gray-400 text-sm">
                                    불러오는 중...
                                </div>
                            )}
                        </div>
                        {/* 하단 복사하기 버튼 */}
                        {weeklyPreviewTasks.length > 0 && (
                            <div className="border-x border-b border-purple-200 rounded-b-xl bg-purple-50/30 px-4 py-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        let lastWeekLabel = ''
                                        const text = weeklyPreviewTasks.map(task => {
                                            const weekMatch = (task.title || '').match(/^\[(\d+주차)\]\s*(.*)$/)
                                            const weekLabel = weekMatch ? weekMatch[1] : ''
                                            const taskTitle = weekMatch ? weekMatch[2] : (task.title || '')
                                            const lines: string[] = []
                                            if (weekLabel && weekLabel !== lastWeekLabel) lines.push(`[${weekLabel}]`)
                                            lastWeekLabel = weekLabel
                                            if (taskTitle) lines.push(`[${taskTitle}]`)
                                            task.details.forEach(d => {
                                                (d.content || '-').split('\n').forEach(line => {
                                                    if (line.trim()) lines.push(`- ${line.trim()}`)
                                                })
                                            })
                                            return lines.join('\n')
                                        }).join('\n\n')
                                        navigator.clipboard.writeText(text).then(() => {
                                            alert('클립보드에 복사되었습니다.')
                                        })
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    <Copy size={15} />
                                    복사하기
                                </button>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedWorklog && !isModalOpen}
                onClose={() => setSelectedWorklog(null)}
                title="월간 업무보고 상세"
            >
                {selectedWorklog && (
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto -mx-2 px-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">해당 월</label>
                                <p className="text-toss-gray-900">{getMonthLabel(selectedWorklog.work_date)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-500 mb-1">작성자</label>
                                <p className="text-toss-gray-900 font-medium">
                                    {selectedWorklog.user ? `${selectedWorklog.user.name} · ${selectedWorklog.user.team || '팀 미설정'}` : '-'}
                                </p>
                            </div>
                        </div>

                        {/* 월간 업무 테이블 */}
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">월간 업무</label>
                            {renderTaskDetailTable(selectedWorklog.morning_work)}
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

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => handleDownloadPdf(selectedWorklog)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors text-sm font-medium"
                            >
                                <Printer size={16} />
                                인쇄
                            </button>
                            <button
                                onClick={() => handleSaveAsWord(selectedWorklog)}
                                className="flex items-center gap-2 px-4 py-2 bg-toss-gray-100 text-toss-gray-700 rounded-xl hover:bg-toss-gray-200 transition-colors text-sm font-medium"
                            >
                                <Download size={16} />
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
                                className="flex-1 bg-purple-500 hover:bg-purple-600"
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

export default MonthlyWorkLogPage
