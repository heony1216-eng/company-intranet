import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal, ImageGallery } from '../components/common'
import { Plus, FileText, Upload, Trash2, Calendar, Download, Image, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { compressImageToWebP, compressImagesToWebP, isValidImageFile } from '../utils/imageCompression'

const WorkLogPage = () => {
    const { profile, isAdmin } = useAuth()
    const [worklogs, setWorklogs] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedWorklog, setSelectedWorklog] = useState(null)
    const fileInputRef = useRef(null)
    const imageInputRef = useRef(null)

    // 박호정 전용 구조현황 활성화 여부
    const canEditRescue = profile?.name === '박호정'

    const [formData, setFormData] = useState({
        title: '',
        work_date: new Date().toISOString().split('T')[0],
        pdf_file: null,
        images: [],
        special_notes: '',
        false_dispatch: '',
        // 구조현황 (박호정 전용)
        rescue_situations: []
    })

    const emptyRescueRow = {
        number: '',
        location: '',
        name: '',
        request_date: '',
        status: ''
    }

    useEffect(() => {
        fetchWorklogs()
    }, [])

    const fetchWorklogs = async () => {
        try {
            let query = supabase
                .from('work_logs')
                .select('*, user:users(name, team, position)')
                .order('work_date', { ascending: false })

            // Non-admin users can only see their own logs
            if (!isAdmin && profile) {
                query = query.eq('user_id', profile.id)
            }

            const { data, error } = await query

            if (error) throw error
            setWorklogs(data || [])
        } catch (error) {
            console.error('Error fetching worklogs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file && file.type === 'application/pdf') {
            setFormData({ ...formData, pdf_file: file })
        } else {
            alert('PDF 파일만 업로드 가능합니다.')
        }
    }

    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files)
        const validImages = files.filter(isValidImageFile)

        if (validImages.length === 0) {
            alert('유효한 이미지 파일을 선택해주세요. (최대 10MB)')
            return
        }

        if (validImages.length !== files.length) {
            alert(`${files.length - validImages.length}개의 파일이 유효하지 않아 제외되었습니다.`)
        }

        try {
            setUploading(true)
            // 이미지를 WebP로 압축 (300KB 이하)
            const compressedImages = await compressImagesToWebP(validImages)

            const imageData = compressedImages.map((compressed) => ({
                file: compressed,
                preview: URL.createObjectURL(compressed),
                name: compressed.name
            }))

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...imageData]
            }))
        } catch (error) {
            console.error('이미지 압축 실패:', error)
            alert('이미지 압축에 실패했습니다.')
        } finally {
            setUploading(false)
        }
    }

    const removeImage = (index) => {
        // 메모리 정리
        URL.revokeObjectURL(formData.images[index].preview)

        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }))
    }

    const addRescueRow = () => {
        setFormData(prev => ({
            ...prev,
            rescue_situations: [...prev.rescue_situations, { ...emptyRescueRow, number: prev.rescue_situations.length + 1 }]
        }))
    }

    const updateRescueRow = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            rescue_situations: prev.rescue_situations.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        }))
    }

    const removeRescueRow = (index) => {
        setFormData(prev => ({
            ...prev,
            rescue_situations: prev.rescue_situations.filter((_, i) => i !== index)
                .map((row, i) => ({ ...row, number: i + 1 }))
        }))
    }

    const uploadPDF = async (file) => {
        const fileName = `${profile.id}/${Date.now()}_${file.name}`
        const { data, error } = await supabase.storage
            .from('work_logs_pdfs')
            .upload(fileName, file)

        if (error) throw error

        const { data: urlData } = supabase.storage
            .from('work_logs_pdfs')
            .getPublicUrl(fileName)

        return urlData.publicUrl
    }

    const uploadImages = async (images) => {
        const urls = await Promise.all(
            images.map(async (img) => {
                const fileName = `${profile.id}/${Date.now()}_${Math.random().toString(36).substring(7)}_${img.name}`
                const { error } = await supabase.storage
                    .from('work_log_images')
                    .upload(fileName, img.file, {
                        contentType: 'image/webp',
                        cacheControl: '3600',
                        upsert: false
                    })

                if (error) throw error

                const { data: urlData } = supabase.storage
                    .from('work_log_images')
                    .getPublicUrl(fileName)

                return urlData.publicUrl
            })
        )
        return urls
    }

    const handleCreate = async () => {
        if (!formData.title.trim()) {
            alert('제목을 입력해주세요.')
            return
        }

        try {
            setUploading(true)
            let pdfUrl = null
            let imageUrls = []

            if (formData.pdf_file) {
                pdfUrl = await uploadPDF(formData.pdf_file)
            }

            if (formData.images.length > 0) {
                imageUrls = await uploadImages(formData.images)
            }

            const { error } = await supabase.from('work_logs').insert({
                title: formData.title,
                work_date: formData.work_date,
                pdf_url: pdfUrl,
                images: imageUrls,
                rescue_situations: formData.rescue_situations,
                special_notes: formData.special_notes,
                false_dispatch: formData.false_dispatch,
                user_id: profile.id
            })

            if (error) throw error

            // 메모리 정리
            formData.images.forEach(img => URL.revokeObjectURL(img.preview))

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('업무일지가 저장되었습니다.')
        } catch (error) {
            console.error('Error creating worklog:', error)
            alert('업무일지 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            title: '',
            work_date: new Date().toISOString().split('T')[0],
            pdf_file: null,
            images: [],
            special_notes: '',
            false_dispatch: '',
            rescue_situations: []
        })
    }

    const handleDelete = async (worklogId) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const { error } = await supabase.from('work_logs').delete().eq('id', worklogId)
            if (error) throw error
            fetchWorklogs()
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting worklog:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    const viewWorklogDetail = (worklog) => {
        setSelectedWorklog(worklog)
    }

    return (
        <div className="space-y-6">
            {/* User Info Header */}
            <Card className="bg-toss-blue text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">
                            {isAdmin ? '전체 업무일지' : `${profile?.name || '사용자'}님의 업무일지`}
                        </h2>
                        <p className="text-white/90">
                            {isAdmin ? '관리자 권한으로 모든 직원의 업무일지를 확인할 수 있습니다' :
                             `${profile?.team && `${profile.team} · `}${profile?.position || '직책 미설정'}`}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-toss-gray-900">업무일지</h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    새 업무일지 작성
                </Button>
            </div>

            {/* Worklog List */}
            <div className="grid gap-4">
                {loading ? (
                    <Card>
                        <div className="text-center text-toss-gray-500 py-8">
                            로딩 중...
                        </div>
                    </Card>
                ) : worklogs.length > 0 ? (
                    worklogs.map((log) => (
                        <Card key={log.id} className="hover:shadow-toss-lg transition-shadow cursor-pointer" onClick={() => viewWorklogDetail(log)}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-sm bg-toss-gray-100 text-toss-gray-600 px-3 py-1 rounded-full flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(log.work_date).toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        {isAdmin && log.user && (
                                            <span className="text-sm text-toss-gray-500">
                                                {log.user.name} · {log.user.team}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-lg text-toss-gray-900 mb-2">
                                        {log.title}
                                    </h3>

                                    <div className="flex items-center gap-3">
                                        {log.pdf_url && (
                                            <a
                                                href={log.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-2 text-toss-blue hover:underline text-sm"
                                            >
                                                <FileText size={16} />
                                                PDF
                                            </a>
                                        )}
                                        {log.images && log.images.length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-toss-gray-500 text-sm">
                                                <Image size={16} />
                                                사진 {log.images.length}장
                                            </span>
                                        )}
                                        {log.rescue_situations && log.rescue_situations.length > 0 && (
                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-sm font-medium">
                                                구조현황 {log.rescue_situations.length}건
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {(profile?.id === log.user_id || isAdmin) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl ml-4 transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <div className="text-center text-toss-gray-500 py-8">
                            등록된 업무일지가 없습니다
                        </div>
                    </Card>
                )}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="새 업무일지 작성"
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* 기본 정보 */}
                    <div className="space-y-4">
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
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                제목 *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                                placeholder="업무 제목을 입력하세요"
                            />
                        </div>
                    </div>

                    {/* 구조현황 (박호정 전용) */}
                    {canEditRescue && (
                        <div className="space-y-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-emerald-900 text-lg">구조 현황</h3>
                                <Button size="sm" onClick={addRescueRow} variant="primary">
                                    <Plus size={16} />
                                    행 추가
                                </Button>
                            </div>

                            {formData.rescue_situations.length > 0 && (
                                <div className="space-y-3">
                                    {formData.rescue_situations.map((row, index) => (
                                        <div key={index} className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-toss-gray-900">#{row.number}</span>
                                                <button
                                                    onClick={() => removeRescueRow(index)}
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    placeholder="체류지"
                                                    value={row.location}
                                                    onChange={(e) => updateRescueRow(index, 'location', e.target.value)}
                                                    className="px-3 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="성명"
                                                    value={row.name}
                                                    onChange={(e) => updateRescueRow(index, 'name', e.target.value)}
                                                    className="px-3 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="구조요청일 (예: 25.01.12)"
                                                    value={row.request_date}
                                                    onChange={(e) => updateRescueRow(index, 'request_date', e.target.value)}
                                                    className="col-span-2 px-3 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                                />
                                            </div>
                                            <textarea
                                                placeholder="구조 진행 상황"
                                                value={row.status}
                                                onChange={(e) => updateRescueRow(index, 'status', e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.rescue_situations.length === 0 && (
                                <p className="text-sm text-emerald-700 text-center py-6">
                                    구조 현황을 추가하려면 '행 추가' 버튼을 클릭하세요
                                </p>
                            )}
                        </div>
                    )}

                    {/* 특이사항 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            특이사항
                        </label>
                        <textarea
                            value={formData.special_notes}
                            onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="특이사항을 입력하세요"
                        />
                    </div>

                    {/* 착오출동 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            착오출동
                        </label>
                        <textarea
                            value={formData.false_dispatch}
                            onChange={(e) => setFormData({ ...formData, false_dispatch: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="착오출동 내용을 입력하세요"
                        />
                    </div>

                    {/* 이미지 업로드 */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            사진 첨부 (자동으로 WebP 300KB 이하로 압축됩니다)
                        </label>
                        <input
                            type="file"
                            ref={imageInputRef}
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full p-6 border-2 border-dashed border-toss-gray-300 rounded-2xl hover:border-toss-blue hover:bg-toss-blue/5 transition-all disabled:opacity-50"
                        >
                            <div className="flex flex-col items-center gap-2 text-toss-gray-600">
                                <Image size={28} />
                                <span className="font-medium">사진 선택하기</span>
                                <span className="text-xs text-toss-gray-500">클릭하여 여러 장 선택 가능</span>
                            </div>
                        </button>

                        {formData.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                {formData.images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={img.preview}
                                            alt={img.name}
                                            className="w-full h-24 object-cover rounded-xl"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded-lg truncate">
                                            {(img.file.size / 1024).toFixed(0)}KB
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* PDF Upload */}
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            PDF 첨부
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf"
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
                                {formData.pdf_file ? (
                                    <span className="text-toss-blue font-medium">
                                        {formData.pdf_file.name}
                                    </span>
                                ) : (
                                    <>
                                        <span className="font-medium">PDF 파일 선택하기</span>
                                        <span className="text-xs text-toss-gray-500">클릭하여 파일 선택</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                        <Button
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="flex-1"
                            loading={uploading}
                            disabled={!formData.title || uploading}
                        >
                            {uploading ? '업로드 중...' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedWorklog}
                onClose={() => setSelectedWorklog(null)}
                title="업무일지 상세"
            >
                {selectedWorklog && (
                    <div className="space-y-5 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm bg-toss-gray-100 text-toss-gray-700 px-3 py-1.5 rounded-full font-medium">
                                {new Date(selectedWorklog.work_date).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                            {selectedWorklog.user && (
                                <span className="text-sm text-toss-gray-600">
                                    {selectedWorklog.user.name} · {selectedWorklog.user.team}
                                </span>
                            )}
                        </div>

                        <h3 className="text-2xl font-bold text-toss-gray-900">{selectedWorklog.title}</h3>

                        {selectedWorklog.rescue_situations && selectedWorklog.rescue_situations.length > 0 && (
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 space-y-3">
                                <h4 className="font-bold text-emerald-900 text-lg">구조 현황</h4>
                                {selectedWorklog.rescue_situations.map((situation, index) => (
                                    <div key={index} className="bg-white p-4 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-toss-gray-900">#{situation.number}</span>
                                            <span className="text-toss-gray-600">{situation.location}</span>
                                            <span className="font-medium">{situation.name}</span>
                                        </div>
                                        <div className="text-sm text-toss-gray-500 mb-1">
                                            구조요청일: {situation.request_date}
                                        </div>
                                        <p className="text-sm text-toss-gray-700 bg-toss-gray-50 p-3 rounded-lg">
                                            {situation.status}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedWorklog.special_notes && (
                            <div className="bg-toss-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-toss-gray-900 mb-2">특이사항</h4>
                                <p className="text-toss-gray-700 whitespace-pre-wrap">{selectedWorklog.special_notes}</p>
                            </div>
                        )}

                        {selectedWorklog.false_dispatch && (
                            <div className="bg-red-50 p-4 rounded-xl">
                                <h4 className="font-bold text-red-900 mb-2">착오출동</h4>
                                <p className="text-red-700 whitespace-pre-wrap">{selectedWorklog.false_dispatch}</p>
                            </div>
                        )}

                        {selectedWorklog.images && selectedWorklog.images.length > 0 && (
                            <div>
                                <h4 className="font-bold text-toss-gray-900 mb-3">첨부 사진 ({selectedWorklog.images.length}장)</h4>
                                <ImageGallery
                                    images={selectedWorklog.images}
                                    className={`grid-cols-${selectedWorklog.images.length === 1 ? '1' : '2'} gap-3`}
                                />
                            </div>
                        )}

                        {selectedWorklog.pdf_url && (
                            <a
                                href={selectedWorklog.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-toss-blue hover:underline font-medium"
                            >
                                <FileText size={18} />
                                첨부 PDF 보기
                                <Download size={16} />
                            </a>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default WorkLogPage
