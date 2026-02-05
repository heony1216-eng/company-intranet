import { useState, useEffect, useCallback } from 'react'
import { useDocument } from '../hooks/useDocument'
import { useAuth } from '../hooks/useAuth'
import { useAnnualLeave } from '../hooks/useAnnualLeave'
import { Button } from '../components/common'
import { FileText, ArrowLeft, Plus, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ATTENDANCE_LABEL_CODE } from '../constants/leave'
import {
    DocumentForm,
    DocumentList,
    DocumentDetailModal,
    LeaveSettingsTab
} from '../components/document'

const DocumentPage = () => {
    const { user, isAdmin, isSubAdmin } = useAuth()
    const canManage = isAdmin || isSubAdmin
    const {
        allDocuments,
        labels,
        users,
        loading,
        createDocument,
        updateDocument,
        deleteDocument,
        approveDocument,
        rejectDocument,
        refresh
    } = useDocument()
    const { annualLeave, compLeave } = useAnnualLeave()

    // 폼 상태
    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
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

    // 탭 상태
    const [activeTab, setActiveTab] = useState('list')

    // 연차 설정 관련 상태
    const [allLeaves, setAllLeaves] = useState([])

    // 승인/반려 관련 상태
    const [processing, setProcessing] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // 근태관련 라벨
    const attendanceLabel = labels.find(l => l.code === 4)

    // 휴가 유형 목록
    const hasCompLeave = compLeave && (compLeave.total_hours - compLeave.used_hours) >= 8
    const compLeaveDays = compLeave ? Math.floor((compLeave.total_hours - compLeave.used_hours) / 8) : 0
    const remainingAnnualDays = annualLeave ? annualLeave.total_days - annualLeave.used_days : 0

    const leaveTypes = [
        { value: 'full', label: '연차', description: '1일 차감', days: 1 },
        { value: 'half_am', label: '오전 반차', description: '0.5일 차감', days: 0.5 },
        { value: 'half_pm', label: '오후 반차', description: '0.5일 차감', days: 0.5 },
        { value: 'out_1h', label: '외출/조퇴 1시간', description: '0.125일 차감', days: 0.125 },
        { value: 'out_2h', label: '외출/조퇴 2시간', description: '0.25일 차감', days: 0.25 },
        { value: 'out_3h', label: '외출/조퇴 3시간', description: '0.375일 차감', days: 0.375 },
        { value: 'comp', label: '대체휴무', description: hasCompLeave ? `${compLeaveDays}일 사용가능` : '사용 불가', days: 1, disabled: !hasCompLeave }
    ]

    // 연차 정보 조회 (관리자용)
    const fetchAllLeaves = useCallback(async () => {
        if (!canManage) return
        try {
            const currentYear = new Date().getFullYear()
            const yearStart = `${currentYear}-01-01`
            const yearEnd = `${currentYear}-12-31`

            const { data: leavesData, error } = await supabase
                .from('annual_leaves')
                .select('*')
                .eq('year', currentYear)
            if (error) throw error

            const { data: labelData } = await supabase
                .from('document_labels')
                .select('id')
                .eq('code', ATTENDANCE_LABEL_CODE)
                .single()

            let approvedLeaves = []
            if (labelData) {
                const { data: docs } = await supabase
                    .from('documents')
                    .select('drafter_id, leave_days, leave_type')
                    .eq('label_id', labelData.id)
                    .eq('attendance_type', 'leave')
                    .eq('status', 'approved')
                    .gte('leave_start_date', yearStart)
                    .lte('leave_start_date', yearEnd)
                    .not('leave_type', 'is', null)
                    .neq('leave_type', 'comp')
                approvedLeaves = docs || []
            }

            const usedDaysMap = {}
            approvedLeaves.forEach(doc => {
                usedDaysMap[doc.drafter_id] = (usedDaysMap[doc.drafter_id] || 0) + (doc.leave_days || 0)
            })

            const leavesWithUsed = (leavesData || []).map(leave => ({
                ...leave,
                used_days: usedDaysMap[leave.user_id] || 0
            }))

            setAllLeaves(leavesWithUsed)
        } catch (err) {
            console.error('연차 정보 조회 에러:', err)
        }
    }, [canManage])

    useEffect(() => {
        if (activeTab === 'leaveSettings' && canManage) {
            fetchAllLeaves()
        }
    }, [activeTab, canManage, fetchAllLeaves])

    // 연차 저장
    const handleSaveTotalDays = async (userId, totalDays) => {
        const currentYear = new Date().getFullYear()
        const existingLeave = allLeaves.find(l => l.user_id === userId)
        if (existingLeave) {
            await supabase
                .from('annual_leaves')
                .update({ total_days: totalDays, updated_at: new Date().toISOString() })
                .eq('id', existingLeave.id)
        } else {
            await supabase
                .from('annual_leaves')
                .insert({ user_id: userId, year: currentYear, total_days: totalDays, used_days: 0 })
        }
        await fetchAllLeaves()
    }

    // 승인 처리
    const handleApprove = async () => {
        if (!selectedDoc || !canManage) return
        setProcessing(true)
        try {
            const { error } = await approveDocument(selectedDoc.id)
            if (error) {
                alert('승인에 실패했습니다: ' + error)
            } else {
                alert('승인되었습니다.')
                setSelectedDoc(null)
                refresh()
            }
        } catch (err) {
            console.error('승인 에러:', err)
            alert('승인 중 오류가 발생했습니다')
        } finally {
            setProcessing(false)
        }
    }

    // 반려 처리
    const handleReject = async () => {
        if (!selectedDoc || !canManage || !rejectReason.trim()) {
            alert('반려 사유를 입력해주세요')
            return
        }
        setProcessing(true)
        try {
            const { error } = await rejectDocument(selectedDoc.id, rejectReason)
            if (error) {
                alert('반려에 실패했습니다: ' + error)
            } else {
                alert('반려되었습니다.')
                setSelectedDoc(null)
                setShowRejectModal(false)
                setRejectReason('')
                refresh()
            }
        } catch (err) {
            console.error('반려 에러:', err)
            alert('반려 중 오류가 발생했습니다')
        } finally {
            setProcessing(false)
        }
    }

    // 삭제 처리
    const handleDelete = async () => {
        if (!selectedDoc) return
        setProcessing(true)
        try {
            const { error } = await deleteDocument(selectedDoc.id, true)
            if (error) {
                alert('삭제에 실패했습니다.')
            } else {
                setSelectedDoc(null)
                setShowDeleteModal(false)
            }
        } catch (err) {
            console.error('삭제 에러:', err)
            alert('삭제 중 오류가 발생했습니다')
        } finally {
            setProcessing(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!attendanceLabel) {
            alert('근태관련 라벨을 찾을 수 없습니다.')
            return
        }
        if (!formData.title.trim()) {
            alert('제목을 입력해주세요.')
            return
        }

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

        setSubmitting(true)

        let leaveDays = 0
        if (formData.attendance_type === 'leave') {
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
            label_id: attendanceLabel.id,
            title: formData.title.trim(),
            content: formData.content.trim(),
            extra_work_hours: formData.attendance_type === 'overtime' ? parseFloat(formData.extra_work_hours) || 0 : 0,
            attachments: attachments.length > 0 ? attachments : null,
            execution_date: null,
            payment_method: null,
            expense_items: null,
            attendance_type: formData.attendance_type,
            leave_type: formData.attendance_type === 'leave' ? formData.leave_type : null,
            leave_start_date: formData.attendance_type === 'leave' ? formData.leave_start_date : null,
            leave_end_date: formData.attendance_type === 'leave' ? (formData.leave_end_date || formData.leave_start_date) : null,
            leave_days: formData.attendance_type === 'leave' ? leaveDays : null,
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
                        <h1 className="text-2xl font-bold text-toss-gray-900">근태 관리</h1>
                        <p className="text-toss-gray-500">근태를 관리합니다</p>
                    </div>
                </div>
                {activeTab === 'list' && (
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus size={18} className="mr-1" />
                        신청
                    </Button>
                )}
            </div>

            {/* 탭 (관리자만 연차 설정 탭 표시) */}
            {canManage && (
                <div className="flex gap-2 border-b border-toss-gray-200">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'list' ? 'border-toss-blue text-toss-blue' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                        }`}
                    >
                        전체 근태
                    </button>
                    <button
                        onClick={() => setActiveTab('leaveSettings')}
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === 'leaveSettings' ? 'border-toss-blue text-toss-blue' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                        }`}
                    >
                        <Settings size={16} className="inline mr-1" />
                        연차 설정
                    </button>
                </div>
            )}

            {/* 전체 근태 탭 */}
            {activeTab === 'list' && (
                <>
                    {/* 기안서 작성 폼 */}
                    {showForm && (
                        <DocumentForm
                            formData={formData}
                            setFormData={setFormData}
                            editingDoc={editingDoc}
                            onSubmit={handleSubmit}
                            onClose={handleCloseForm}
                            submitting={submitting}
                            attachments={attachments}
                            setAttachments={setAttachments}
                            expenseItems={expenseItems}
                            setExpenseItems={setExpenseItems}
                            isAttendanceLabel={true}
                            isExpenseLabel={false}
                            leaveTypes={leaveTypes}
                            remainingAnnualDays={remainingAnnualDays}
                            compLeaveDays={compLeaveDays}
                        />
                    )}

                    {/* 기안서 목록 */}
                    <DocumentList
                        documents={allDocuments}
                        users={users}
                        labels={labels}
                        loading={loading}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        searchFilters={searchFilters}
                        setSearchFilters={setSearchFilters}
                        showAdvancedSearch={showAdvancedSearch}
                        setShowAdvancedSearch={setShowAdvancedSearch}
                        onDocClick={setSelectedDoc}
                        canManage={canManage}
                        currentUserId={user?.user_id}
                    />
                </>
            )}

            {/* 연차 설정 탭 (관리자 전용) */}
            {activeTab === 'leaveSettings' && canManage && (
                <LeaveSettingsTab
                    users={users}
                    allLeaves={allLeaves}
                    onSaveTotalDays={handleSaveTotalDays}
                />
            )}

            {/* 상세보기 모달 */}
            <DocumentDetailModal
                doc={selectedDoc}
                onClose={() => setSelectedDoc(null)}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canManage={canManage}
                currentUserId={user?.user_id}
                processing={processing}
                showRejectModal={showRejectModal}
                setShowRejectModal={setShowRejectModal}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                showDeleteModal={showDeleteModal}
                setShowDeleteModal={setShowDeleteModal}
                users={users}
                leaveTypes={leaveTypes}
            />
        </div>
    )
}

export default DocumentPage
