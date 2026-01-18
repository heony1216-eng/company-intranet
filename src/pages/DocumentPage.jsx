import { useState, useEffect, useMemo } from 'react'
import { useDocument } from '../hooks/useDocument'
import { useAuth } from '../hooks/useAuth'
import { useAnnualLeave } from '../hooks/useAnnualLeave'
import { Card, Button } from '../components/common'
import { FileText, ArrowLeft, Plus, Clock, CheckCircle, XCircle, AlertCircle, Upload, X, Paperclip, ExternalLink, Edit3, Trash2, Calendar, Lock, Unlock, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { uploadMultipleToDropbox } from '../lib/dropbox'

const DocumentPage = () => {
    const { user, isAdmin, isSubAdmin } = useAuth()
    const canManage = isAdmin || isSubAdmin
    const {
        documents,
        allDocuments,
        labels,
        users,
        loading,
        createDocument,
        updateDocument,
        deleteDocument
    } = useDocument()
    const { annualLeave, compLeave } = useAnnualLeave()

    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploadingFiles, setUploadingFiles] = useState(false)
    const [attachments, setAttachments] = useState([])
    const [selectedDoc, setSelectedDoc] = useState(null)
    const [editingDoc, setEditingDoc] = useState(null)
    const [formData, setFormData] = useState({
        label_id: '',
        title: '',
        content: '',
        extra_work_hours: 0,
        execution_date: '',
        payment_method: '',
        attendance_type: '',
        leave_type: '',
        leave_start_date: '',
        leave_end_date: '',
        is_private: false
    })
    const [expenseItems, setExpenseItems] = useState([
        { item: '', category: '', vendor: '', amount: '', note: '' }
    ])

    // 검색 상태
    const [searchTerm, setSearchTerm] = useState('')
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
    const [searchFilters, setSearchFilters] = useState({
        year: new Date().getFullYear().toString(),
        month: '',
        label_id: '',
        drafter_id: '',
        status: ''
    })

    // 선택된 라벨이 "근태관련"인지 확인
    const selectedLabel = labels.find(l => l.id === parseInt(formData.label_id))
    const isAttendanceLabel = selectedLabel?.code === 4
    const isExpenseLabel = selectedLabel && [1, 2, 3].includes(selectedLabel.code)

    // 휴가 유형 목록
    const hasCompLeave = compLeave && (compLeave.total_hours - compLeave.used_hours) >= 8
    const compLeaveDays = compLeave ? Math.floor((compLeave.total_hours - compLeave.used_hours) / 8) : 0
    const remainingAnnualDays = annualLeave ? annualLeave.total_days - annualLeave.used_days : 0

    const leaveTypes = [
        { value: 'full', label: '연차', description: '1일 차감', days: 1 },
        { value: 'half_am', label: '오전 반차', description: '0.5일 차감', days: 0.5 },
        { value: 'half_pm', label: '오후 반차', description: '0.5일 차감', days: 0.5 },
        { value: 'out_2h', label: '외출/조퇴 2시간', description: '0.25일 차감', days: 0.25 },
        { value: 'out_3h', label: '외출/조퇴 3시간', description: '0.375일 차감', days: 0.375 },
        { value: 'comp', label: '대체휴무', description: hasCompLeave ? `${compLeaveDays}일 사용가능` : '사용 불가', days: 1, disabled: !hasCompLeave }
    ]

    const getLeaveTypeLabel = (type) => {
        const found = leaveTypes.find(t => t.value === type)
        return found ? found.label : type
    }

    // 년도 목록 생성
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear()
        return Array.from({ length: 5 }, (_, i) => currentYear - i)
    }, [])

    // 월 목록
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    // 필터링된 기안서 목록
    const filteredDocuments = useMemo(() => {
        return allDocuments.filter(doc => {
            // 제목 검색
            if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false
            }

            // 년도 필터
            if (searchFilters.year) {
                const docYear = new Date(doc.created_at).getFullYear()
                if (docYear !== parseInt(searchFilters.year)) return false
            }

            // 월 필터
            if (searchFilters.month) {
                const docMonth = new Date(doc.created_at).getMonth() + 1
                if (docMonth !== parseInt(searchFilters.month)) return false
            }

            // 라벨 필터
            if (searchFilters.label_id && doc.label_id !== parseInt(searchFilters.label_id)) {
                return false
            }

            // 담당자 필터
            if (searchFilters.drafter_id && doc.drafter_id !== searchFilters.drafter_id) {
                return false
            }

            // 상태 필터
            if (searchFilters.status && doc.status !== searchFilters.status) {
                return false
            }

            return true
        })
    }, [allDocuments, searchTerm, searchFilters])

    // 담당자 정보 가져오기
    const getDrafterInfo = (drafterId) => {
        const drafter = users.find(u => u.user_id === drafterId)
        return drafter || { name: '알 수 없음' }
    }

    // 산출내역 항목 추가
    const addExpenseItem = () => {
        setExpenseItems([...expenseItems, { item: '', category: '', vendor: '', amount: '', note: '' }])
    }

    // 산출내역 항목 삭제
    const removeExpenseItem = (index) => {
        if (expenseItems.length === 1) return
        setExpenseItems(expenseItems.filter((_, i) => i !== index))
    }

    // 산출내역 항목 변경
    const updateExpenseItem = (index, field, value) => {
        const newItems = [...expenseItems]
        newItems[index][field] = value
        setExpenseItems(newItems)
    }

    // 총합계 계산
    const totalAmount = expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

    // 파일 선택 핸들러
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setUploadingFiles(true)

        try {
            const uploaded = await uploadMultipleToDropbox(files, '/intranet/documents')
            setAttachments(prev => [...prev, ...uploaded])
        } catch (error) {
            alert('파일 업로드에 실패했습니다: ' + error.message)
        } finally {
            setUploadingFiles(false)
            e.target.value = ''
        }
    }

    // 첨부파일 제거
    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.label_id || !formData.title.trim()) {
            alert('라벨과 제목을 입력해주세요.')
            return
        }

        // 근태관련 유효성 검사
        if (isAttendanceLabel) {
            if (!formData.attendance_type) {
                alert('신청 유형을 선택해주세요.')
                return
            }
            if (formData.attendance_type === 'leave') {
                if (!formData.leave_type) {
                    alert('휴가 유형을 선택해주세요.')
                    return
                }
                if (!formData.leave_start_date) {
                    alert('시작일을 선택해주세요.')
                    return
                }
            }
        }

        setSubmitting(true)

        // 휴가 신청 시 일수 계산
        let leaveDays = 0
        if (isAttendanceLabel && formData.attendance_type === 'leave') {
            const leaveType = leaveTypes.find(t => t.value === formData.leave_type)
            if (formData.leave_type === 'full' || formData.leave_type === 'comp') {
                const start = new Date(formData.leave_start_date)
                const end = new Date(formData.leave_end_date || formData.leave_start_date)
                leaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
            } else {
                leaveDays = leaveType?.days || 0.5
            }
        }

        const documentData = {
            label_id: parseInt(formData.label_id),
            title: formData.title.trim(),
            content: formData.content.trim(),
            extra_work_hours: isAttendanceLabel && formData.attendance_type === 'overtime' ? parseFloat(formData.extra_work_hours) || 0 : 0,
            attachments: attachments.length > 0 ? attachments : null,
            execution_date: isExpenseLabel ? formData.execution_date : null,
            payment_method: isExpenseLabel ? formData.payment_method : null,
            expense_items: isExpenseLabel ? expenseItems.filter(item => item.item || item.amount) : null,
            attendance_type: isAttendanceLabel ? formData.attendance_type : null,
            leave_type: isAttendanceLabel && formData.attendance_type === 'leave' ? formData.leave_type : null,
            leave_start_date: isAttendanceLabel && formData.attendance_type === 'leave' ? formData.leave_start_date : null,
            leave_end_date: isAttendanceLabel && formData.attendance_type === 'leave' ? (formData.leave_end_date || formData.leave_start_date) : null,
            leave_days: isAttendanceLabel && formData.attendance_type === 'leave' ? leaveDays : null,
            is_private: formData.is_private
        }

        let error
        if (editingDoc) {
            const result = await updateDocument(editingDoc.id, documentData)
            error = result.error
        } else {
            const result = await createDocument(documentData)
            error = result.error
        }

        setSubmitting(false)

        if (error) {
            console.error('Document error:', error)
            const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
            alert((editingDoc ? '수정에 실패했습니다: ' : '기안서 작성에 실패했습니다: ') + errorMessage)
        } else {
            handleCloseForm()
        }
    }

    const handleEdit = (doc) => {
        setEditingDoc(doc)
        setFormData({
            label_id: doc.label_id || '',
            title: doc.title || '',
            content: doc.content || '',
            extra_work_hours: doc.extra_work_hours || 0,
            execution_date: doc.execution_date || '',
            payment_method: doc.payment_method || '',
            attendance_type: doc.attendance_type || '',
            leave_type: doc.leave_type || '',
            leave_start_date: doc.leave_start_date || '',
            leave_end_date: doc.leave_end_date || '',
            is_private: doc.is_private || false
        })
        setAttachments(doc.attachments || [])
        setExpenseItems(doc.expense_items?.length > 0 ? doc.expense_items : [{ item: '', category: '', vendor: '', amount: '', note: '' }])
        setShowForm(true)
        setSelectedDoc(null)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingDoc(null)
        setFormData({
            label_id: '',
            title: '',
            content: '',
            extra_work_hours: 0,
            execution_date: '',
            payment_method: '',
            attendance_type: '',
            leave_type: '',
            leave_start_date: '',
            leave_end_date: '',
            is_private: false
        })
        setAttachments([])
        setExpenseItems([{ item: '', category: '', vendor: '', amount: '', note: '' }])
    }

    const handleDocClick = (doc) => {
        // 비공개 기안서는 관리자이거나 본인만 열람 가능
        if (doc.is_private && !canManage && doc.drafter_id !== user?.user_id) {
            return // 클릭 무시
        }
        setSelectedDoc(doc)
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        <CheckCircle size={12} />
                        결재
                    </span>
                )
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                        <XCircle size={12} />
                        반려
                    </span>
                )
            case 'chairman_approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        <Clock size={12} />
                        이사장 대기
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        <AlertCircle size={12} />
                        진행중
                    </span>
                )
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\. /g, '/').replace('.', '')
    }

    const resetFilters = () => {
        setSearchTerm('')
        setSearchFilters({
            year: new Date().getFullYear().toString(),
            month: '',
            label_id: '',
            drafter_id: '',
            status: ''
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-toss-gray-500 hover:text-toss-gray-700 transition-colors"
            >
                <ArrowLeft size={20} />
                대시보드로 돌아가기
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center">
                        <FileText className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-toss-gray-900">기안서</h1>
                        <p className="text-toss-gray-500">기안서를 작성하고 관리합니다</p>
                    </div>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus size={18} className="mr-1" />
                    새 기안서
                </Button>
            </div>

            {/* 기안서 작성 폼 */}
            {showForm && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-toss-gray-900">
                            {editingDoc ? '기안서 수정' : '새 기안서 작성'}
                        </h2>
                        <button
                            onClick={handleCloseForm}
                            className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-toss-gray-500" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 라벨 선택 */}
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                라벨 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {labels.map((label) => (
                                    <button
                                        key={label.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, label_id: label.id })}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            formData.label_id === label.id
                                                ? 'ring-2 ring-offset-2'
                                                : 'opacity-70 hover:opacity-100'
                                        }`}
                                        style={{
                                            backgroundColor: label.color + '20',
                                            color: label.color,
                                            ringColor: label.color
                                        }}
                                    >
                                        {label.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 제목 */}
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                제목 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="기안서 제목을 입력하세요"
                                className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                            />
                        </div>

                        {/* 비공개 설정 */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_private: !formData.is_private })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                                    formData.is_private
                                        ? 'border-red-400 bg-red-50 text-red-700'
                                        : 'border-toss-gray-200 bg-white text-toss-gray-600 hover:border-toss-gray-300'
                                }`}
                            >
                                {formData.is_private ? <Lock size={16} /> : <Unlock size={16} />}
                                <span className="text-sm font-medium">
                                    {formData.is_private ? '비공개' : '공개'}
                                </span>
                            </button>
                            <span className="text-xs text-toss-gray-500">
                                {formData.is_private ? '관리자와 본인만 열람 가능합니다' : '모든 사용자가 열람 가능합니다'}
                            </span>
                        </div>

                        {/* 근태관련일 때 추가근무/휴가 선택 */}
                        {isAttendanceLabel && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                        신청 유형 <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, attendance_type: 'overtime', leave_type: '', leave_start_date: '', leave_end_date: '' })}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                                formData.attendance_type === 'overtime'
                                                    ? 'border-toss-blue bg-blue-50'
                                                    : 'border-toss-gray-200 hover:border-toss-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock size={18} className={formData.attendance_type === 'overtime' ? 'text-toss-blue' : 'text-toss-gray-500'} />
                                                <span className={`font-medium ${formData.attendance_type === 'overtime' ? 'text-toss-blue' : 'text-toss-gray-700'}`}>추가근무 신청</span>
                                            </div>
                                            <p className="text-xs text-toss-gray-500">야근, 주말근무 등</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, attendance_type: 'leave', extra_work_hours: 0 })}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                                formData.attendance_type === 'leave'
                                                    ? 'border-toss-blue bg-blue-50'
                                                    : 'border-toss-gray-200 hover:border-toss-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar size={18} className={formData.attendance_type === 'leave' ? 'text-toss-blue' : 'text-toss-gray-500'} />
                                                <span className={`font-medium ${formData.attendance_type === 'leave' ? 'text-toss-blue' : 'text-toss-gray-700'}`}>휴가 신청</span>
                                            </div>
                                            <p className="text-xs text-toss-gray-500">연차, 반차, 대체휴무</p>
                                        </button>
                                    </div>
                                </div>

                                {formData.attendance_type === 'overtime' && (
                                    <div>
                                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                            추가근무시간 (시간)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.extra_work_hours}
                                            onChange={(e) => setFormData({ ...formData, extra_work_hours: e.target.value })}
                                            placeholder="0"
                                            step="0.5"
                                            min="0"
                                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                        />
                                        <p className="mt-1 text-xs text-toss-gray-500">* 8시간 = 대체휴무 1일</p>
                                    </div>
                                )}

                                {formData.attendance_type === 'leave' && (
                                    <>
                                        <div className="p-3 bg-toss-gray-50 rounded-xl">
                                            <div className="flex gap-4 text-sm">
                                                <span className="text-toss-gray-600">잔여 연차: <strong className="text-toss-blue">{remainingAnnualDays}일</strong></span>
                                                <span className="text-toss-gray-600">남은 대체휴무: <strong className="text-amber-600">{compLeaveDays}일</strong></span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                                휴가 유형 <span className="text-red-500">*</span>
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {leaveTypes.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        disabled={type.disabled}
                                                        onClick={() => setFormData({ ...formData, leave_type: type.value })}
                                                        className={`p-3 rounded-xl border transition-all text-left ${
                                                            type.disabled
                                                                ? 'border-toss-gray-100 bg-toss-gray-50 text-toss-gray-400 cursor-not-allowed'
                                                                : formData.leave_type === type.value
                                                                    ? 'border-toss-blue bg-blue-50'
                                                                    : 'border-toss-gray-200 hover:border-toss-gray-300'
                                                        }`}
                                                    >
                                                        <p className={`font-medium text-sm ${
                                                            type.disabled ? 'text-toss-gray-400' : formData.leave_type === type.value ? 'text-toss-blue' : 'text-toss-gray-700'
                                                        }`}>{type.label}</p>
                                                        <p className="text-xs text-toss-gray-500">{type.description}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                                    시작일 <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.leave_start_date}
                                                    onChange={(e) => setFormData({ ...formData, leave_start_date: e.target.value, leave_end_date: formData.leave_end_date || e.target.value })}
                                                    className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                                    종료일
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.leave_end_date}
                                                    min={formData.leave_start_date}
                                                    onChange={(e) => setFormData({ ...formData, leave_end_date: e.target.value })}
                                                    className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* 지출 관련 필드 */}
                        {isExpenseLabel && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-toss-gray-700 mb-2">집행기간</label>
                                    <input
                                        type="text"
                                        value={formData.execution_date}
                                        onChange={(e) => setFormData({ ...formData, execution_date: e.target.value })}
                                        placeholder="예: 2025년 1월"
                                        className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-toss-gray-700 mb-2">집행방법</label>
                                    <input
                                        type="text"
                                        value={formData.payment_method}
                                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                        placeholder="예: 법인카드"
                                        className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-toss-gray-700">산출내역</label>
                                        <button
                                            type="button"
                                            onClick={addExpenseItem}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-toss-blue text-white rounded-lg hover:bg-toss-blue-dark transition-colors"
                                        >
                                            <Plus size={14} />
                                            항목 추가
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto border border-toss-gray-200 rounded-xl">
                                        <table className="w-full text-sm">
                                            <thead className="bg-toss-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium text-toss-gray-700 w-1/4">적요</th>
                                                    <th className="px-3 py-2 text-left font-medium text-toss-gray-700 w-1/6">사업종류</th>
                                                    <th className="px-3 py-2 text-left font-medium text-toss-gray-700 w-1/6">거래처</th>
                                                    <th className="px-3 py-2 text-left font-medium text-toss-gray-700 w-1/6">금액</th>
                                                    <th className="px-3 py-2 text-left font-medium text-toss-gray-700 w-1/6">비고</th>
                                                    <th className="px-3 py-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {expenseItems.map((item, index) => (
                                                    <tr key={index} className="border-t border-toss-gray-100">
                                                        <td className="p-2">
                                                            <input type="text" value={item.item} onChange={(e) => updateExpenseItem(index, 'item', e.target.value)} placeholder="품목명" className="w-full px-2 py-1.5 bg-white border border-toss-gray-200 rounded-lg text-sm" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" value={item.category} onChange={(e) => updateExpenseItem(index, 'category', e.target.value)} placeholder="사업종류" className="w-full px-2 py-1.5 bg-white border border-toss-gray-200 rounded-lg text-sm" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" value={item.vendor} onChange={(e) => updateExpenseItem(index, 'vendor', e.target.value)} placeholder="거래처" className="w-full px-2 py-1.5 bg-white border border-toss-gray-200 rounded-lg text-sm" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="number" value={item.amount} onChange={(e) => updateExpenseItem(index, 'amount', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 bg-white border border-toss-gray-200 rounded-lg text-sm text-right" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" value={item.note} onChange={(e) => updateExpenseItem(index, 'note', e.target.value)} placeholder="비고" className="w-full px-2 py-1.5 bg-white border border-toss-gray-200 rounded-lg text-sm" />
                                                        </td>
                                                        <td className="p-2">
                                                            <button type="button" onClick={() => removeExpenseItem(index)} disabled={expenseItems.length === 1} className={`p-1.5 rounded-lg transition-colors ${expenseItems.length === 1 ? 'text-toss-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-toss-gray-300 bg-toss-gray-50">
                                                    <td colSpan={3} className="px-3 py-2 text-right font-medium text-toss-gray-700">총 합계</td>
                                                    <td className="px-3 py-2 text-right font-bold text-toss-blue">{totalAmount.toLocaleString()}원</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 내용 */}
                        {!isExpenseLabel && (
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-700 mb-2">내용</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="기안 내용을 입력하세요"
                                    rows={4}
                                    className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none"
                                />
                            </div>
                        )}

                        {/* 첨부파일 */}
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">첨부파일</label>
                            <div className="space-y-3">
                                <label className={`flex items-center justify-center gap-2 px-4 py-3 bg-toss-gray-50 border border-dashed border-toss-gray-300 rounded-xl cursor-pointer hover:bg-toss-gray-100 transition-colors ${uploadingFiles ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {uploadingFiles ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
                                            <span className="text-toss-gray-500">업로드 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} className="text-toss-gray-500" />
                                            <span className="text-toss-gray-500">파일 선택</span>
                                        </>
                                    )}
                                    <input type="file" multiple onChange={handleFileSelect} disabled={uploadingFiles} className="hidden" />
                                </label>

                                {attachments.length > 0 && (
                                    <div className="space-y-2">
                                        {attachments.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Paperclip size={16} className="text-toss-blue flex-shrink-0" />
                                                    <span className="text-sm text-toss-gray-700 truncate">{file.name}</span>
                                                    <span className="text-xs text-toss-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button type="button" onClick={() => removeAttachment(index)} className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0">
                                                    <X size={16} className="text-toss-gray-500" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 버튼 */}
                        <div className="flex gap-3">
                            <Button type="submit" loading={submitting} disabled={submitting} className="flex-1">
                                {submitting ? (editingDoc ? '수정 중...' : '제출 중...') : (editingDoc ? '수정하기' : '기안서 제출')}
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleCloseForm} className="flex-1">취소</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* 검색 영역 */}
            <Card>
                {/* 기본 검색 */}
                <div className="flex gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="제목으로 검색..."
                            className="w-full pl-10 pr-4 py-2.5 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                            showAdvancedSearch ? 'bg-toss-blue text-white border-toss-blue' : 'bg-white border-toss-gray-200 text-toss-gray-700 hover:bg-toss-gray-50'
                        }`}
                    >
                        <Filter size={16} />
                        상세검색
                        {showAdvancedSearch ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* 상세 검색 */}
                {showAdvancedSearch && (
                    <div className="p-4 bg-toss-gray-50 rounded-xl mb-4 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {/* 년도 */}
                            <div>
                                <label className="block text-xs font-medium text-toss-gray-600 mb-1">년도</label>
                                <select
                                    value={searchFilters.year}
                                    onChange={(e) => setSearchFilters({ ...searchFilters, year: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">전체</option>
                                    {years.map(year => (
                                        <option key={year} value={year}>{year}년</option>
                                    ))}
                                </select>
                            </div>

                            {/* 월 */}
                            <div>
                                <label className="block text-xs font-medium text-toss-gray-600 mb-1">월</label>
                                <select
                                    value={searchFilters.month}
                                    onChange={(e) => setSearchFilters({ ...searchFilters, month: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">전체</option>
                                    {months.map(month => (
                                        <option key={month} value={month}>{month}월</option>
                                    ))}
                                </select>
                            </div>

                            {/* 라벨 */}
                            <div>
                                <label className="block text-xs font-medium text-toss-gray-600 mb-1">라벨</label>
                                <select
                                    value={searchFilters.label_id}
                                    onChange={(e) => setSearchFilters({ ...searchFilters, label_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">전체</option>
                                    {labels.map(label => (
                                        <option key={label.id} value={label.id}>{label.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 담당자 */}
                            <div>
                                <label className="block text-xs font-medium text-toss-gray-600 mb-1">담당자</label>
                                <select
                                    value={searchFilters.drafter_id}
                                    onChange={(e) => setSearchFilters({ ...searchFilters, drafter_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">전체</option>
                                    {users.map(u => (
                                        <option key={u.user_id} value={u.user_id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 상태 */}
                            <div>
                                <label className="block text-xs font-medium text-toss-gray-600 mb-1">상태</label>
                                <select
                                    value={searchFilters.status}
                                    onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">전체</option>
                                    <option value="pending">진행중</option>
                                    <option value="chairman_approved">이사장 대기</option>
                                    <option value="approved">결재</option>
                                    <option value="rejected">반려</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={resetFilters}
                                className="text-sm text-toss-gray-500 hover:text-toss-gray-700"
                            >
                                필터 초기화
                            </button>
                        </div>
                    </div>
                )}

                {/* 결과 수 */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-toss-gray-900">전체 기안서</h2>
                    <span className="text-sm text-toss-gray-500">총 {filteredDocuments.length}건</span>
                </div>

                {/* 기안서 목록 */}
                {loading ? (
                    <div className="py-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-toss-blue border-t-transparent"></div>
                    </div>
                ) : filteredDocuments.length === 0 ? (
                    <div className="py-12 text-center text-toss-gray-500">
                        <FileText className="mx-auto mb-3 text-toss-gray-300" size={48} />
                        <p>검색 결과가 없습니다</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-toss-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">기안일자</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">라벨</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">제목</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">담당자</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">진행상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocuments.map((doc) => {
                                    const isLocked = doc.is_private && !canManage && doc.drafter_id !== user?.user_id
                                    const drafter = getDrafterInfo(doc.drafter_id)

                                    return (
                                        <tr
                                            key={doc.id}
                                            onClick={() => handleDocClick(doc)}
                                            className={`border-b border-toss-gray-100 ${
                                                isLocked
                                                    ? 'bg-toss-gray-50 cursor-not-allowed'
                                                    : 'hover:bg-toss-gray-50 cursor-pointer'
                                            }`}
                                        >
                                            <td className="py-3 px-4 text-sm text-toss-gray-600">
                                                {formatDate(doc.created_at)}
                                            </td>
                                            <td className="py-3 px-4">
                                                {doc.document_labels && (
                                                    <span
                                                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                        style={{
                                                            backgroundColor: doc.document_labels.color + '20',
                                                            color: doc.document_labels.color
                                                        }}
                                                    >
                                                        {doc.document_labels.name}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {doc.is_private && (
                                                        <Lock size={14} className={isLocked ? 'text-red-400' : 'text-toss-gray-400'} />
                                                    )}
                                                    <p className={`font-medium truncate max-w-xs ${isLocked ? 'text-toss-gray-400' : 'text-toss-gray-900'}`}>
                                                        {isLocked ? '비공개 기안서' : doc.title}
                                                    </p>
                                                </div>
                                                {!isLocked && doc.attachments && doc.attachments.length > 0 && (
                                                    <p className="text-xs text-toss-gray-500 flex items-center gap-1">
                                                        <Paperclip size={12} />
                                                        첨부 {doc.attachments.length}개
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm text-toss-gray-700">{drafter.name}</span>
                                                {drafter.rank && (
                                                    <span className="text-xs text-toss-gray-500 ml-1">{drafter.rank}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {getStatusBadge(doc.status)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* 상세보기 모달 */}
            {selectedDoc && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedDoc(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-toss-gray-900">기안서 상세</h2>
                                <button
                                    onClick={() => setSelectedDoc(null)}
                                    className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-toss-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* 상태 및 라벨 */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(selectedDoc.status)}
                                    {selectedDoc.document_labels && (
                                        <span
                                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: selectedDoc.document_labels.color + '20',
                                                color: selectedDoc.document_labels.color
                                            }}
                                        >
                                            {selectedDoc.document_labels.name}
                                        </span>
                                    )}
                                    {selectedDoc.is_private && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                                            <Lock size={12} />
                                            비공개
                                        </span>
                                    )}
                                </div>

                                {/* 기안번호 & 담당자 */}
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedDoc.doc_number && (
                                        <div>
                                            <p className="text-sm text-toss-gray-500 mb-1">기안번호</p>
                                            <p className="font-medium text-toss-gray-900">{selectedDoc.doc_number}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-toss-gray-500 mb-1">담당자</p>
                                        <p className="font-medium text-toss-gray-900">
                                            {getDrafterInfo(selectedDoc.drafter_id).name}
                                            {getDrafterInfo(selectedDoc.drafter_id).rank && (
                                                <span className="text-toss-gray-500 font-normal ml-1">
                                                    {getDrafterInfo(selectedDoc.drafter_id).rank}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* 제목 */}
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">제목</p>
                                    <p className="font-bold text-toss-gray-900 text-lg">{selectedDoc.title}</p>
                                </div>

                                {/* 내용 */}
                                {selectedDoc.content && (
                                    <div>
                                        <p className="text-sm text-toss-gray-500 mb-1">내용</p>
                                        <p className="text-toss-gray-900 whitespace-pre-wrap">{selectedDoc.content}</p>
                                    </div>
                                )}

                                {/* 추가근무시간 */}
                                {selectedDoc.extra_work_hours > 0 && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-toss-blue font-medium">
                                            추가근무: {selectedDoc.extra_work_hours}시간 (대체휴무 {(selectedDoc.extra_work_hours / 8).toFixed(1)}일)
                                        </p>
                                    </div>
                                )}

                                {/* 휴가 정보 */}
                                {selectedDoc.attendance_type === 'leave' && selectedDoc.leave_type && (
                                    <div className="p-3 bg-emerald-50 rounded-lg">
                                        <p className="text-sm text-emerald-700 font-medium mb-1">
                                            {getLeaveTypeLabel(selectedDoc.leave_type)} 신청
                                        </p>
                                        <p className="text-sm text-emerald-600">
                                            {selectedDoc.leave_start_date === selectedDoc.leave_end_date
                                                ? new Date(selectedDoc.leave_start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
                                                : `${new Date(selectedDoc.leave_start_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} ~ ${new Date(selectedDoc.leave_end_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}`
                                            }
                                            {selectedDoc.leave_days && ` (${selectedDoc.leave_days}일)`}
                                        </p>
                                    </div>
                                )}

                                {/* 첨부파일 */}
                                {selectedDoc.attachments && selectedDoc.attachments.length > 0 && (
                                    <div>
                                        <p className="text-sm text-toss-gray-500 mb-2">첨부파일 ({selectedDoc.attachments.length}개)</p>
                                        <div className="space-y-2">
                                            {selectedDoc.attachments.map((file, index) => (
                                                <a
                                                    key={index}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 p-3 bg-toss-gray-50 rounded-lg hover:bg-toss-gray-100 transition-colors"
                                                >
                                                    <Paperclip size={16} className="text-toss-blue" />
                                                    <span className="text-sm text-toss-gray-700 flex-1">{file.name}</span>
                                                    <ExternalLink size={14} className="text-toss-gray-400" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 반려 사유 */}
                                {selectedDoc.status === 'rejected' && selectedDoc.rejected_reason && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-600 font-medium mb-1">반려 사유</p>
                                        <p className="text-red-700">{selectedDoc.rejected_reason}</p>
                                    </div>
                                )}

                                {/* 신청일 */}
                                <div className="pt-4 border-t border-toss-gray-200">
                                    <div className="flex items-center gap-1 text-sm text-toss-gray-500">
                                        <Clock size={14} />
                                        {new Date(selectedDoc.created_at).toLocaleString('ko-KR')} 작성
                                    </div>
                                    {selectedDoc.approved_at && (
                                        <div className="flex items-center gap-1 text-sm text-toss-gray-500 mt-1">
                                            <Clock size={14} />
                                            {new Date(selectedDoc.approved_at).toLocaleString('ko-KR')} 결재
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 버튼 */}
                            <div className="mt-6 flex gap-3">
                                {selectedDoc.status === 'pending' && selectedDoc.drafter_id === user?.user_id && (
                                    <>
                                        <Button onClick={() => handleEdit(selectedDoc)} className="flex-1">
                                            <Edit3 size={16} className="mr-1" />
                                            수정
                                        </Button>
                                        <Button
                                            onClick={async () => {
                                                if (confirm('이 기안서를 삭제하시겠습니까?')) {
                                                    const { error } = await deleteDocument(selectedDoc.id, true)
                                                    if (error) {
                                                        alert('삭제에 실패했습니다.')
                                                    } else {
                                                        setSelectedDoc(null)
                                                    }
                                                }
                                            }}
                                            variant="secondary"
                                            className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                                        >
                                            <Trash2 size={16} className="mr-1" />
                                            삭제
                                        </Button>
                                    </>
                                )}
                                <Button
                                    onClick={() => setSelectedDoc(null)}
                                    variant="secondary"
                                    className={selectedDoc.status === 'pending' && selectedDoc.drafter_id === user?.user_id ? '' : 'w-full'}
                                >
                                    닫기
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DocumentPage
