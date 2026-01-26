import { useState } from 'react'
import { useAnnualLeave } from '../hooks/useAnnualLeave'
import { useCompLeave } from '../hooks/useCompLeave'
import { Card, Button } from '../components/common'
import { Calendar, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, Plus, X, Edit3 } from 'lucide-react'
import { Link } from 'react-router-dom'

const LeavePage = () => {
    const {
        annualLeave,
        leaveRequests,
        loading,
        submitLeaveRequest,
        cancelLeaveRequest,
        updateLeaveRequest
    } = useAnnualLeave()

    const {
        hasCompLeave,
        remainingDays: compLeaveDays,
        remainingHours: compLeaveHours,
        useCompLeave: consumeCompLeave
    } = useCompLeave()

    const [showForm, setShowForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [editingRequest, setEditingRequest] = useState(null)
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        leaveType: 'full',
        reason: ''
    })

    const leaveTypes = [
        { value: 'full', label: '연차', description: '1일 차감', days: 1 },
        { value: 'half_am', label: '오전 반차', description: '0.5일 차감', days: 0.5 },
        { value: 'half_pm', label: '오후 반차', description: '0.5일 차감', days: 0.5 },
        { value: 'out_2h', label: '외출/조퇴 2시간', description: '0.25일 차감', days: 0.25 },
        { value: 'out_3h', label: '외출/조퇴 3시간', description: '0.375일 차감', days: 0.375 },
        { value: 'comp', label: '대체휴무', description: hasCompLeave ? `${compLeaveDays}일 사용가능` : '사용 불가', days: 1, disabled: !hasCompLeave }
    ]

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        <AlertCircle size={12} />
                        대기중
                    </span>
                )
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        <CheckCircle size={12} />
                        승인
                    </span>
                )
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                        <XCircle size={12} />
                        반려
                    </span>
                )
            default:
                return null
        }
    }

    const getLeaveTypeLabel = (type) => {
        const found = leaveTypes.find(t => t.value === type)
        return found ? found.label : type
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        })
    }

    const formatTableDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\. /g, '/').replace('.', '')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.startDate) {
            alert('시작일을 선택해주세요.')
            return
        }

        // 연차(full) 또는 대체휴무(comp)만 종료일 필요
        const needsEndDate = formData.leaveType === 'full' || formData.leaveType === 'comp'
        if (needsEndDate && !formData.endDate) {
            alert('종료일을 선택해주세요.')
            return
        }

        // 대체휴무일 경우 사용 가능 여부 확인
        if (formData.leaveType === 'comp') {
            const startDate = new Date(formData.startDate)
            const endDate = new Date(formData.endDate)
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
            const hoursNeeded = days * 8

            if (hoursNeeded > compLeaveHours) {
                alert(`대체휴무가 부족합니다. (필요: ${days}일, 가능: ${compLeaveDays}일)`)
                return
            }
        }

        setSubmitting(true)

        let error
        if (editingRequest) {
            // 수정 모드
            const result = await updateLeaveRequest(editingRequest.id, {
                startDate: formData.startDate,
                endDate: needsEndDate ? formData.endDate : formData.startDate,
                leaveType: formData.leaveType,
                reason: formData.reason
            })
            error = result.error
        } else {
            // 새 신청
            const result = await submitLeaveRequest({
                startDate: formData.startDate,
                endDate: needsEndDate ? formData.endDate : formData.startDate,
                leaveType: formData.leaveType,
                reason: formData.reason
            })
            error = result.error
        }

        setSubmitting(false)

        if (error) {
            console.error('Leave request error:', error)
            const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
            alert((editingRequest ? '수정에 실패했습니다: ' : '연차 신청에 실패했습니다: ') + errorMessage)
        } else {
            setShowForm(false)
            setEditingRequest(null)
            setFormData({ startDate: '', endDate: '', leaveType: 'full', reason: '' })
        }
    }

    const handleEdit = (request) => {
        setEditingRequest(request)
        setFormData({
            startDate: request.start_date,
            endDate: request.end_date,
            leaveType: request.leave_type,
            reason: request.reason || ''
        })
        setShowForm(true)
        setSelectedRequest(null)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingRequest(null)
        setFormData({ startDate: '', endDate: '', leaveType: 'full', reason: '' })
    }

    const handleCancel = async (requestId) => {
        if (!confirm('연차 신청을 취소하시겠습니까?')) return

        const { error } = await cancelLeaveRequest(requestId)
        if (error) {
            alert('취소에 실패했습니다.')
        }
    }

    const remainingDays = annualLeave ? annualLeave.total_days - annualLeave.used_days : 0

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Back Button */}
            <Link
                to="/mypage"
                className="inline-flex items-center gap-2 text-toss-gray-500 hover:text-toss-gray-700 transition-colors"
            >
                <ArrowLeft size={20} />
                마이페이지로 돌아가기
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-toss-blue to-blue-600 rounded-2xl flex items-center justify-center">
                        <Calendar className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-toss-gray-900">연차 신청</h1>
                        <p className="text-toss-gray-500">
                            잔여 연차: <span className="font-bold text-emerald-600">{remainingDays}일</span>
                            {hasCompLeave && (
                                <span className="ml-3">
                                    대체휴무: <span className="font-bold text-blue-600">{compLeaveDays}일</span>
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {!showForm && (
                    <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                        <Plus size={18} />
                        연차 신청
                    </Button>
                )}
            </div>

            {/* Leave Request Form */}
            {showForm && (
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-toss-gray-900">
                            {editingRequest ? '연차 수정' : '새 연차 신청'}
                        </h2>
                        <button
                            onClick={handleCloseForm}
                            className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-toss-gray-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Leave Type */}
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-3">
                                연차 유형
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {leaveTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => !type.disabled && setFormData({ ...formData, leaveType: type.value })}
                                        disabled={type.disabled}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            type.disabled
                                                ? 'border-toss-gray-200 bg-toss-gray-100 cursor-not-allowed opacity-50'
                                                : formData.leaveType === type.value
                                                    ? 'border-toss-blue bg-blue-50'
                                                    : 'border-toss-gray-200 hover:border-toss-gray-300'
                                        }`}
                                    >
                                        <p className={`font-medium ${
                                            type.disabled
                                                ? 'text-toss-gray-400'
                                                : formData.leaveType === type.value
                                                    ? 'text-toss-blue'
                                                    : 'text-toss-gray-900'
                                        }`}>
                                            {type.label}
                                        </p>
                                        <p className={`text-xs mt-1 ${type.disabled ? 'text-toss-gray-400' : 'text-toss-gray-500'}`}>{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                    {(formData.leaveType === 'full' || formData.leaveType === 'comp') ? '시작일' : '날짜'}
                                </label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-toss-gray-900 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                            {(formData.leaveType === 'full' || formData.leaveType === 'comp') && (
                                <div>
                                    <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                        종료일
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-toss-gray-900 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                                        required
                                    />
                                </div>
                            )}
                            {formData.leaveType !== 'full' && formData.leaveType !== 'comp' && (
                                <div className="flex items-end">
                                    <div className="p-3 bg-blue-50 rounded-xl text-sm text-toss-blue">
                                        차감: <span className="font-bold">{leaveTypes.find(t => t.value === formData.leaveType)?.days}일</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                사유 (선택)
                            </label>
                            <textarea
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="연차 사유를 입력하세요"
                                rows={3}
                                className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-toss-gray-900 focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all resize-none"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            loading={submitting}
                            disabled={submitting}
                        >
                            {submitting
                                ? (editingRequest ? '수정 중...' : '신청 중...')
                                : (editingRequest ? '수정하기' : '연차 신청하기')
                            }
                        </Button>
                    </form>
                </Card>
            )}

            {/* Leave Requests List */}
            <Card>
                <h2 className="text-lg font-bold text-toss-gray-900 mb-4">신청 내역</h2>

                {loading ? (
                    <div className="py-12 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-toss-blue border-t-transparent"></div>
                    </div>
                ) : leaveRequests.length === 0 ? (
                    <div className="py-12 text-center text-toss-gray-500">
                        <Calendar className="mx-auto mb-3 text-toss-gray-300" size={48} />
                        <p>연차 신청 내역이 없습니다</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="border-b border-toss-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500 w-24">신청일</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500 w-24">유형</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">기간</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500 w-16">일수</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500 w-20">상태</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500 w-16">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.map((request) => (
                                    <tr
                                        key={request.id}
                                        onClick={() => setSelectedRequest(request)}
                                        className="border-b border-toss-gray-100 hover:bg-toss-gray-50 cursor-pointer"
                                    >
                                        <td className="py-3 px-4 text-sm text-toss-gray-600 w-24 truncate">
                                            {formatTableDate(request.created_at)}
                                        </td>
                                        <td className="py-3 px-4 w-24 truncate">
                                            <span className="text-sm font-medium text-toss-gray-900">
                                                {getLeaveTypeLabel(request.leave_type)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="text-sm text-toss-gray-900 truncate">
                                                {formatTableDate(request.start_date)}
                                                {request.start_date !== request.end_date && (
                                                    <> ~ {formatTableDate(request.end_date)}</>
                                                )}
                                            </p>
                                            {request.reason && (
                                                <p className="text-xs text-toss-gray-500 truncate">
                                                    {request.reason}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center w-16">
                                            <span className="text-sm font-medium text-toss-blue">{request.days}일</span>
                                        </td>
                                        <td className="py-3 px-4 text-center w-20">
                                            {getStatusBadge(request.status)}
                                        </td>
                                        <td className="py-3 px-4 text-center w-16" onClick={(e) => e.stopPropagation()}>
                                            {request.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancel(request.id)}
                                                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    취소
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* 상세보기 모달 */}
            {selectedRequest && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedRequest(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-toss-gray-900">연차 상세</h2>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-toss-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* 상태 */}
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(selectedRequest.status)}
                                </div>

                                {/* 유형 */}
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">연차 유형</p>
                                    <p className="font-medium text-toss-gray-900">
                                        {getLeaveTypeLabel(selectedRequest.leave_type)} ({selectedRequest.days}일)
                                    </p>
                                </div>

                                {/* 기간 */}
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">기간</p>
                                    <p className="font-medium text-toss-gray-900">
                                        {formatDate(selectedRequest.start_date)}
                                        {selectedRequest.start_date !== selectedRequest.end_date && (
                                            <> ~ {formatDate(selectedRequest.end_date)}</>
                                        )}
                                    </p>
                                </div>

                                {/* 사유 */}
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">사유</p>
                                    <p className="text-toss-gray-900 whitespace-pre-wrap">
                                        {selectedRequest.reason || '(사유 없음)'}
                                    </p>
                                </div>

                                {/* 반려 사유 */}
                                {selectedRequest.status === 'rejected' && selectedRequest.rejected_reason && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-600 font-medium mb-1">반려 사유</p>
                                        <p className="text-red-700">{selectedRequest.rejected_reason}</p>
                                    </div>
                                )}

                                {/* 신청일 */}
                                <div className="pt-4 border-t border-toss-gray-200">
                                    <div className="flex items-center gap-1 text-sm text-toss-gray-500">
                                        <Clock size={14} />
                                        {new Date(selectedRequest.created_at).toLocaleString('ko-KR')} 신청
                                    </div>
                                    {selectedRequest.updated_at && selectedRequest.status !== 'pending' && (
                                        <div className="flex items-center gap-1 text-sm text-toss-gray-500 mt-1">
                                            <Clock size={14} />
                                            {new Date(selectedRequest.updated_at).toLocaleString('ko-KR')} 처리
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 버튼 */}
                            <div className="mt-6 flex gap-3">
                                {selectedRequest.status === 'pending' && (
                                    <>
                                        <Button
                                            onClick={() => handleEdit(selectedRequest)}
                                            className="flex-1"
                                        >
                                            <Edit3 size={16} className="mr-1" />
                                            수정
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                handleCancel(selectedRequest.id)
                                                setSelectedRequest(null)
                                            }}
                                            className="flex-1 bg-red-500 hover:bg-red-600"
                                        >
                                            취소
                                        </Button>
                                    </>
                                )}
                                <Button
                                    onClick={() => setSelectedRequest(null)}
                                    variant="secondary"
                                    className={selectedRequest.status === 'pending' ? '' : 'flex-1'}
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

export default LeavePage
