import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, FileText, Upload, Trash2, Calendar, Download, File, X, Edit2, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { uploadMultipleToDropbox, deleteMultipleFilesByUrl } from '../lib/dropbox'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

// Dropbox URL을 직접 이미지 링크로 변환
const convertDropboxUrl = (url) => {
    if (!url) return ''
    return url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '')
        .replace('&dl=0', '')
        .replace('?dl=1', '')
        .replace('&dl=1', '')
}

const getUrl = (item) => {
    let url = ''
    if (typeof item === 'string') url = item
    else if (item && item.url) url = item.url
    return convertDropboxUrl(url)
}

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

        const threshold = 100

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
            {imageUrls.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-toss-gray-500 mb-2">
                        사진 ({imageUrls.length}장)
                    </label>
                    <div className="relative">
                        {canScrollLeft && (
                            <button
                                onClick={() => scroll('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-1.5 hover:bg-white"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
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
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                    </div>
                                )
                            })}
                        </div>
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
                    <button
                        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={closeModal}
                    >
                        <X size={24} />
                    </button>

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

                        {/* 확대된 이미지 */}
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

const MonthlyWorkLogPage = () => {
    const { profile, isAdmin } = useAuth()
    const [worklogs, setWorklogs] = useState([])
    const [filteredWorklogs, setFilteredWorklogs] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedWorklog, setSelectedWorklog] = useState(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedUserId, setSelectedUserId] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        work_date: new Date().toISOString().split('T')[0],
        monthly_work: '',
        special_notes: '',
        files: [],
        existingFileUrls: []
    })

    const startYear = 2026
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)

    useEffect(() => {
        fetchWorklogs()
    }, [])

    useEffect(() => {
        filterWorklogsByDate()
    }, [worklogs, selectedYear, selectedUserId])

    const filterWorklogsByDate = () => {
        const filtered = worklogs.filter(log => {
            const logDate = new Date(log.work_date)
            const dateMatch = logDate.getFullYear() === selectedYear
            const userMatch = selectedUserId === 'all' || log.user_id === selectedUserId
            return dateMatch && userMatch
        })
        setFilteredWorklogs(filtered)
        setCurrentPage(1)
    }

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
                .eq('type', 'monthly')
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

            const worklogsWithUsers = (worklogsData || []).map(worklog => {
                const user = usersData.find(u => u.user_id === worklog.user_id)
                return {
                    ...worklog,
                    user: user || { name: '알 수 없음', team: '-', rank: '-' }
                }
            })

            setWorklogs(worklogsWithUsers)
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
        const folder = `/intranet/worklogs/monthly/${profile.user_id}`
        const results = await uploadMultipleToDropbox(
            files.map(f => f.file),
            folder
        )
        return results.map(r => r.url)
    }

    const handleCreate = async () => {
        if (!formData.monthly_work) {
            alert('월간 업무를 입력해주세요.')
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
                morning_work: formData.monthly_work,
                special_notes: formData.special_notes,
                file_urls: fileUrls,
                user_id: profile.user_id,
                type: 'monthly',
                is_read: false
            })

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('월간 업무일지가 저장되었습니다.')
        } catch (error) {
            console.error('Error creating worklog:', error)
            alert('월간 업무일지 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        if (!formData.monthly_work) {
            alert('월간 업무를 입력해주세요.')
            return
        }

        if (!selectedWorklog?.id) {
            alert('수정할 업무일지를 찾을 수 없습니다.')
            return
        }

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
                    morning_work: formData.monthly_work,
                    special_notes: formData.special_notes,
                    file_urls: allFileUrls
                })
                .eq('id', worklogId)

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('월간 업무일지가 수정되었습니다.')
        } catch (error) {
            console.error('Error updating worklog:', error)
            alert('월간 업무일지 수정에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            work_date: new Date().toISOString().split('T')[0],
            monthly_work: '',
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
            monthly_work: worklog.morning_work || '',
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

    const getMonthLabel = (dateString) => {
        const date = new Date(dateString)
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
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

    const handleSaveAsWord = async (worklog) => {
        const processedImages = []
        const failedImages = []
        if (worklog.file_urls && worklog.file_urls.length > 0) {
            const imageUrls = worklog.file_urls.filter(item => isImageFile({ url: getUrl(item) }))
            for (const item of imageUrls) {
                try {
                    const url = getUrl(item)
                    const arrayBuffer = await loadImageAsArrayBuffer(url)

                    // ArrayBuffer를 Blob으로 변환하여 이미지 로드
                    const blob = new Blob([arrayBuffer])
                    const blobUrl = URL.createObjectURL(blob)
                    const img = new Image()
                    img.src = blobUrl
                    await new Promise((resolve, reject) => {
                        img.onload = resolve
                        img.onerror = reject
                    })

                    // 이미지 크기 계산 (2열 배치를 위해 최대 240px 너비)
                    const maxWidth = 240
                    const maxHeight = 320

                    // 원본 크기에서 비율 계산
                    let width = img.width
                    let height = img.height
                    const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)

                    // Canvas를 사용하여 리사이즈 + EXIF 회전 적용 + 압축
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')

                    // 리사이즈된 크기로 Canvas 설정
                    canvas.width = width
                    canvas.height = height
                    ctx.drawImage(img, 0, 0, width, height)

                    // JPEG로 변환하여 용량 압축
                    let quality = 0.7
                    let compressedBlob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/jpeg', quality)
                    })

                    // 300KB 초과시 품질 낮춰서 재압축
                    const targetSize = 300 * 1024
                    while (compressedBlob.size > targetSize && quality > 0.3) {
                        quality -= 0.1
                        compressedBlob = await new Promise(resolve => {
                            canvas.toBlob(resolve, 'image/jpeg', quality)
                        })
                    }

                    const compressedArrayBuffer = await compressedBlob.arrayBuffer()

                    // Blob URL 해제
                    URL.revokeObjectURL(blobUrl)

                    processedImages.push({ data: compressedArrayBuffer, width, height })
                } catch (error) {
                    console.error('이미지 로드 실패:', error)
                    const fileName = typeof item === 'string' ? item.split('/').pop() : (item.name || '이미지')
                    failedImages.push(fileName)
                }
            }
        }

        if (failedImages.length > 0) {
            alert(`일부 이미지(${failedImages.length}개)를 Word에 포함시키지 못했습니다.`)
        }

        // 이미지를 2열 테이블로 배치
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
                                    transformation: { width: processedImages[i].width, height: processedImages[i].height },
                                    type: 'jpg',
                                }),
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
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
                                        transformation: { width: processedImages[i + 1].width, height: processedImages[i + 1].height },
                                        type: 'jpg',
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                            }),
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    })
                )
            } else {
                cells.push(
                    new TableCell({
                        children: [new Paragraph({ text: '' })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    })
                )
            }
            imageTableRows.push(new TableRow({ children: cells }))
        }

        const imageTable = processedImages.length > 0 ? [
            new Table({ rows: imageTableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
        ] : []

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: '월간 업무일지',
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '작성일: ', bold: true }),
                            new TextRun(formatDate(worklog.work_date)),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '해당 월: ', bold: true }),
                            new TextRun(getMonthLabel(worklog.work_date)),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '작성자: ', bold: true }),
                            new TextRun(`${worklog.user?.name || '-'} (${worklog.user?.team || '팀 미설정'})`),
                        ],
                    }),
                    new Paragraph({ text: '' }),
                    new Paragraph({
                        text: '월간 업무',
                        heading: HeadingLevel.HEADING_2,
                    }),
                    new Paragraph({
                        text: worklog.morning_work || '-',
                    }),
                    ...(worklog.special_notes ? [
                        new Paragraph({ text: '' }),
                        new Paragraph({
                            text: '특이사항',
                            heading: HeadingLevel.HEADING_2,
                        }),
                        new Paragraph({
                            text: worklog.special_notes,
                        }),
                    ] : []),
                    ...(processedImages.length > 0 ? [
                        new Paragraph({ text: '' }),
                        new Paragraph({
                            text: '첨부 사진',
                            heading: HeadingLevel.HEADING_2,
                        }),
                        ...imageTable,
                    ] : []),
                ],
            }],
        })

        const blob = await Packer.toBlob(doc)
        saveAs(blob, `월간업무일지_${getMonthLabel(worklog.work_date)}_${worklog.user?.name || '작성자'}.docx`)
    }

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredWorklogs.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredWorklogs.length / itemsPerPage)

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">
                            {isAdmin ? '전체 월간 업무일지' : `${profile?.name || '사용자'}님의 월간 업무일지`}
                        </h2>
                        <p className="text-white/90">
                            {isAdmin ? '관리자 권한으로 모든 직원의 월간 업무일지를 확인할 수 있습니다' :
                             `${profile?.team ? `${profile.team} · ` : ''}${profile?.rank || '직급 미설정'}`}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-toss-gray-900">월간 업무일지</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}년</option>
                        ))}
                    </select>

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

                    <Button onClick={openCreateModal} className="bg-purple-500 hover:bg-purple-600">
                        <Plus size={18} />
                        새 월간 업무일지
                    </Button>
                </div>
            </div>

            <Card padding="p-0 sm:p-6">
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-8">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-toss-gray-100 border-b-2 border-toss-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-700 w-16">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">해당 월</th>
                                        {isAdmin && (
                                            <>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">작성자</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">팀</th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">월간 업무</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-700 w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-200">
                                    {currentItems.map((log, index) => (
                                        <tr
                                            key={log.id}
                                            className={`hover:bg-toss-gray-50 transition-colors ${
                                                isAdmin && !log.is_read ? 'bg-purple-50' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-sm text-center text-toss-gray-600">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            <td
                                                className="px-4 py-3 text-sm text-toss-gray-900 cursor-pointer hover:text-purple-600"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-toss-gray-400" />
                                                    {getMonthLabel(log.work_date)}
                                                    {isAdmin && !log.is_read && (
                                                        <span className="inline-block bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-medium ml-2">
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <>
                                                    <td className="px-4 py-3 text-sm text-toss-gray-900">
                                                        {log.user?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-toss-gray-600">{log.user?.team || '-'}</td>
                                                </>
                                            )}
                                            <td
                                                className="px-4 py-3 text-sm text-toss-gray-700 max-w-xs truncate cursor-pointer"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                {log.morning_work || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
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
                                                                className="p-2 text-purple-500 hover:bg-purple-100 rounded-lg transition-colors"
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
                                    className={`p-4 ${isAdmin && !log.is_read ? 'bg-purple-50' : ''}`}
                                    onClick={() => viewWorklogDetail(log)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-toss-gray-500">#{indexOfFirstItem + index + 1}</span>
                                            <Calendar size={14} className="text-toss-gray-400" />
                                            <span className="text-sm font-medium text-toss-gray-900">
                                                {getMonthLabel(log.work_date)}
                                            </span>
                                            {isAdmin && !log.is_read && (
                                                <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleSaveAsWord(log)}
                                                className="p-1.5 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg"
                                            >
                                                <Download size={14} />
                                            </button>
                                            {(profile?.user_id === log.user_id || isAdmin) && (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(log)}
                                                        className="p-1.5 text-purple-500 hover:bg-purple-100 rounded-lg"
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
                                    <p className="text-sm text-toss-gray-700 line-clamp-2">
                                        {log.morning_work || '-'}
                                    </p>
                                </div>
                            ))}
                        </div>

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
                                                ? 'bg-purple-500 text-white'
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
                        {selectedYear}년에 등록된 월간 업무일지가 없습니다
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
                title={isEditMode ? '월간 업무일지 수정' : '새 월간 업무일지 작성'}
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
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
                            {getMonthLabel(formData.work_date)} 업무일지
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            월간 업무 *
                        </label>
                        <textarea
                            value={formData.monthly_work}
                            onChange={(e) => setFormData({ ...formData, monthly_work: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all leading-relaxed"
                            placeholder="이번 달에 수행한 업무를 입력하세요"
                        />
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
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedWorklog && !isModalOpen}
                onClose={() => setSelectedWorklog(null)}
                title="월간 업무일지 상세"
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

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">월간 업무</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[100px] whitespace-pre-wrap text-toss-gray-900">
                                {selectedWorklog.morning_work || '-'}
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

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => handleSaveAsWord(selectedWorklog)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors text-sm font-medium"
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
