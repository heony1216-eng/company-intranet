import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, Trash2, Edit2, AlertTriangle, Download, Camera, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { uploadToDropbox, deleteFileByUrl } from '../lib/dropbox'

const RescuePage = () => {
    const { profile, isAdmin } = useAuth()
    const [rescueSituations, setRescueSituations] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedRescue, setSelectedRescue] = useState(null)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [uploading, setUploading] = useState(false)
    const photoInputRef = useRef(null)

    const [formData, setFormData] = useState({
        location: '',
        name: '',
        request_date: '',
        status: '',
        details: '',
        is_completed: false,
        photo_url: '',
        photo_file: null
    })

    useEffect(() => {
        fetchRescueSituations()
    }, [])

    const fetchRescueSituations = async () => {
        try {
            const { data, error } = await supabase
                .from('rescue_situations')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setRescueSituations(data || [])
        } catch (error) {
            console.error('Error fetching rescue situations:', error)
            alert('데이터 조회 실패: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            location: '',
            name: '',
            request_date: '',
            status: '',
            details: '',
            is_completed: false,
            photo_url: '',
            photo_file: null
        })
        setIsEditMode(false)
        setSelectedRescue(null)
    }

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.')
                return
            }
            setFormData({ ...formData, photo_file: file })
        }
    }

    const removePhoto = () => {
        setFormData({ ...formData, photo_file: null, photo_url: '' })
        if (photoInputRef.current) {
            photoInputRef.current.value = ''
        }
    }

    const handleCreate = async () => {
        if (!formData.name || !formData.location) {
            alert('성명과 체류지는 필수 입력 항목입니다.')
            return
        }

        try {
            setUploading(true)
            let photoUrl = ''

            // 사진 업로드
            if (formData.photo_file) {
                const result = await uploadToDropbox(formData.photo_file, '/rescue')
                photoUrl = result.url
            }

            const { error } = await supabase
                .from('rescue_situations')
                .insert({
                    location: formData.location,
                    name: formData.name,
                    request_date: formData.request_date,
                    status: formData.status,
                    details: formData.details,
                    is_completed: formData.is_completed,
                    photo_url: photoUrl,
                    user_id: profile.user_id
                })

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchRescueSituations()
            alert('구조현황이 저장되었습니다.')
        } catch (error) {
            console.error('Error creating rescue situation:', error)
            alert('구조현황 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        if (!formData.name || !formData.location) {
            alert('성명과 체류지는 필수 입력 항목입니다.')
            return
        }

        try {
            setUploading(true)
            let photoUrl = formData.photo_url

            // 새 사진이 있으면 업로드
            if (formData.photo_file) {
                const result = await uploadToDropbox(formData.photo_file, '/rescue')
                photoUrl = result.url
            }

            const { error } = await supabase
                .from('rescue_situations')
                .update({
                    location: formData.location,
                    name: formData.name,
                    request_date: formData.request_date,
                    status: formData.status,
                    details: formData.details,
                    is_completed: formData.is_completed,
                    photo_url: photoUrl
                })
                .eq('id', selectedRescue.id)

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchRescueSituations()
            alert('구조현황이 수정되었습니다.')
        } catch (error) {
            console.error('Error updating rescue situation:', error)
            alert('구조현황 수정에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (rescue) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            // Dropbox에서 사진 삭제
            if (rescue.photo_url) {
                await deleteFileByUrl(rescue.photo_url)
            }

            const { error } = await supabase
                .from('rescue_situations')
                .delete()
                .eq('id', rescue.id)

            if (error) throw error

            fetchRescueSituations()
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting rescue situation:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    const toggleComplete = async (rescue) => {
        try {
            const { error } = await supabase
                .from('rescue_situations')
                .update({ is_completed: !rescue.is_completed })
                .eq('id', rescue.id)

            if (error) throw error
            fetchRescueSituations()
        } catch (error) {
            console.error('Error toggling complete:', error)
            alert('상태 변경에 실패했습니다.')
        }
    }

    const openEditModal = (rescue) => {
        setFormData({
            location: rescue.location || '',
            name: rescue.name || '',
            request_date: rescue.request_date || '',
            status: rescue.status || '',
            details: rescue.details || '',
            is_completed: rescue.is_completed || false,
            photo_url: rescue.photo_url || '',
            photo_file: null
        })
        setSelectedRescue(rescue)
        setIsEditMode(true)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openDetailModal = (rescue) => {
        setSelectedRescue(rescue)
        setIsDetailModalOpen(true)
    }

    // 페이지네이션
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = rescueSituations.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(rescueSituations.length / itemsPerPage)

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    // 선택 토글 함수
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    // 전체 선택/해제 (현재 페이지만)
    const toggleSelectAll = () => {
        const currentPageIds = currentItems.map(item => item.id)
        const allSelected = currentPageIds.every(id => selectedIds.has(id))

        setSelectedIds(prev => {
            const newSet = new Set(prev)
            if (allSelected) {
                currentPageIds.forEach(id => newSet.delete(id))
            } else {
                currentPageIds.forEach(id => newSet.add(id))
            }
            return newSet
        })
    }

    // Word 표로 다운로드
    const handleDownloadWord = async () => {
        if (selectedIds.size === 0) {
            alert('다운로드할 항목을 선택해주세요.')
            return
        }

        const selectedItems = rescueSituations.filter(item => selectedIds.has(item.id))

        // 테이블 행 생성
        const tableRows = [
            // 헤더 행
            new TableRow({
                tableHeader: true,
                children: [
                    new TableCell({
                        width: { size: 800, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: 'No', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 2000, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '체류지', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 1500, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '성명', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 1500, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '구조요청', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                    new TableCell({
                        width: { size: 4200, type: WidthType.DXA },
                        shading: { fill: 'E8F0FE' },
                        children: [new Paragraph({
                            children: [new TextRun({ text: '상세 구조진행상황', bold: true })],
                            alignment: AlignmentType.CENTER
                        })]
                    }),
                ]
            }),
            // 데이터 행들
            ...selectedItems.map((item, index) =>
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                text: String(index + 1),
                                alignment: AlignmentType.CENTER
                            })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.location || '-' })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.name || '-' })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.request_date || '-' })]
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: item.details || '-' })]
                        }),
                    ]
                })
            )
        ]

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: '구조현황', bold: true, size: 32 })],
                        alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ text: '' }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows,
                    }),
                ],
            }],
        })

        const blob = await Packer.toBlob(doc)
        const today = new Date().toISOString().split('T')[0]
        saveAs(blob, `구조현황_${today}.docx`)

        // 선택 초기화
        setSelectedIds(new Set())
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">구조현황 관리</h2>
                        <p className="text-white/90">
                            {isAdmin ? '전체 구조현황을 관리할 수 있습니다' : '구조현황을 등록하고 관리하세요'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-toss-gray-900">구조현황</h1>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleDownloadWord} disabled={selectedIds.size === 0}>
                        <Download size={18} />
                        Word 다운로드 {selectedIds.size > 0 && `(${selectedIds.size})`}
                    </Button>
                    <Button onClick={openCreateModal}>
                        <Plus size={18} />
                        새 구조현황 등록
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card padding="p-0 sm:p-6">
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-8">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-toss-blue/10 border-b-2 border-toss-blue/20">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-12">
                                            <input
                                                type="checkbox"
                                                checked={currentItems.length > 0 && currentItems.every(item => selectedIds.has(item.id))}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-16">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">체류지</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">성명</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">구조요청</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">현재 진행상황</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-20">완료</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-100">
                                    {currentItems.map((rescue, index) => (
                                        <tr
                                            key={rescue.id}
                                            className={`hover:bg-toss-gray-50 transition-colors cursor-pointer ${rescue.is_completed ? 'opacity-60' : ''} ${selectedIds.has(rescue.id) ? 'bg-blue-50' : ''}`}
                                            onClick={() => openDetailModal(rescue)}
                                        >
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(rescue.id)}
                                                    onChange={() => toggleSelect(rescue.id)}
                                                    className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-toss-gray-600">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-900">{rescue.location || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-900 font-medium">{rescue.name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-700">{rescue.request_date || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-700">{rescue.status || '-'}</td>
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={rescue.is_completed || false}
                                                    onChange={() => toggleComplete(rescue)}
                                                    className="w-5 h-5 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => openEditModal(rescue)}
                                                        className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                        title="수정"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rescue)}
                                                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-toss-gray-100">
                            {currentItems.map((rescue, index) => (
                                <div
                                    key={rescue.id}
                                    className={`p-4 ${rescue.is_completed ? 'opacity-60' : ''} ${selectedIds.has(rescue.id) ? 'bg-blue-50' : ''}`}
                                    onClick={() => openDetailModal(rescue)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(rescue.id)}
                                                onChange={() => toggleSelect(rescue.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                            />
                                            <span className="text-xs text-toss-gray-500">#{indexOfFirstItem + index + 1}</span>
                                            <span className="text-sm font-medium text-toss-gray-900">{rescue.name || '-'}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${rescue.is_completed ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {rescue.is_completed ? '완료' : '진행중'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={rescue.is_completed || false}
                                                onChange={() => toggleComplete(rescue)}
                                                className="w-4 h-4 text-green-500 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                                title="완료 체크"
                                            />
                                            <button
                                                onClick={() => openEditModal(rescue)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rescue)}
                                                className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-toss-gray-700">
                                            <span className="text-toss-gray-500 mr-1">체류지:</span>
                                            {rescue.location || '-'}
                                        </p>
                                        <p className="text-toss-gray-700">
                                            <span className="text-toss-gray-500 mr-1">구조요청:</span>
                                            {rescue.request_date || '-'}
                                        </p>
                                        <p className="text-toss-gray-700 line-clamp-1">
                                            <span className="text-toss-gray-500 mr-1">상황:</span>
                                            {rescue.status || '-'}
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
                        등록된 구조현황이 없습니다
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
                title={isEditMode ? '구조현황 수정' : '새 구조현황 등록'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            체류지 *
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="체류지를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            성명 *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="성명을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            구조요청 일자
                        </label>
                        <input
                            type="text"
                            value={formData.request_date}
                            onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="예: 25.01.13"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            현재 진행상황 (간략)
                        </label>
                        <input
                            type="text"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="현재 진행상황을 간략히 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            상세 구조진행상황
                        </label>
                        <textarea
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            rows={8}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all leading-relaxed"
                            placeholder="상세한 구조진행상황을 입력하세요"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_completed"
                            checked={formData.is_completed || false}
                            onChange={(e) => setFormData({ ...formData, is_completed: e.target.checked })}
                            className="w-5 h-5 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                        />
                        <label htmlFor="is_completed" className="text-sm font-medium text-toss-gray-700 cursor-pointer">
                            완료 처리
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            사진 첨부 (1장)
                        </label>
                        <input
                            type="file"
                            ref={photoInputRef}
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                        {formData.photo_file || formData.photo_url ? (
                            <div className="relative">
                                <img
                                    src={formData.photo_file ? URL.createObjectURL(formData.photo_file) : formData.photo_url}
                                    alt="첨부 사진"
                                    className="w-full max-h-48 object-contain rounded-xl bg-toss-gray-50"
                                />
                                <button
                                    type="button"
                                    onClick={removePhoto}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full py-8 border-2 border-dashed border-toss-gray-300 rounded-xl text-toss-gray-500 hover:border-toss-blue hover:text-toss-blue transition-colors flex flex-col items-center justify-center gap-2"
                            >
                                <Camera size={24} />
                                <span className="text-sm">클릭하여 사진 첨부</span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsModalOpen(false)
                                resetForm()
                            }}
                            className="flex-1"
                            disabled={uploading}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={isEditMode ? handleEdit : handleCreate}
                            className="flex-1"
                            disabled={uploading}
                        >
                            {uploading ? '업로드 중...' : (isEditMode ? '수정하기' : '저장하기')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false)
                    setSelectedRescue(null)
                }}
                title="구조현황 상세"
            >
                {selectedRescue && (
                    <div className="space-y-4">
                        {/* 상단: 정보 + 사진 */}
                        <div className="flex gap-4">
                            {/* 왼쪽: 기본 정보 */}
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">체류지</label>
                                        <p className="text-toss-gray-900">{selectedRescue.location || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">성명</label>
                                        <p className="text-toss-gray-900 font-medium">{selectedRescue.name || '-'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">구조요청 일자</label>
                                        <p className="text-toss-gray-900">{selectedRescue.request_date || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-500 mb-1">완료 여부</label>
                                        <p className={`font-medium ${selectedRescue.is_completed ? 'text-green-600' : 'text-orange-500'}`}>
                                            {selectedRescue.is_completed ? '완료' : '진행중'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 오른쪽: 사진 */}
                            {selectedRescue.photo_url && (
                                <div className="w-32 h-32 flex-shrink-0">
                                    <img
                                        src={selectedRescue.photo_url}
                                        alt="첨부 사진"
                                        className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(selectedRescue.photo_url, '_blank')}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-1">현재 진행상황 (간략)</label>
                            <p className="text-toss-gray-900">{selectedRescue.status || '-'}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-500 mb-2">상세 구조진행상황</label>
                            <div className="bg-toss-gray-50 rounded-xl p-4 min-h-[150px] whitespace-pre-wrap text-toss-gray-900">
                                {selectedRescue.details || '상세 내용이 없습니다.'}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    setSelectedRescue(null)
                                }}
                                className="flex-1"
                            >
                                닫기
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsDetailModalOpen(false)
                                    openEditModal(selectedRescue)
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

export default RescuePage
// force rebuild Wed Jan 14 12:49:00 KST 2026
