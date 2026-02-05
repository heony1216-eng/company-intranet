import { Button } from '../common'
import { X, Lock, Clock, CheckCircle, XCircle, AlertCircle, Paperclip, ExternalLink, Edit3, Trash2 } from 'lucide-react'

const DocumentDetailModal = ({
    doc,
    onClose,
    onApprove,
    onReject,
    onEdit,
    onDelete,
    canManage,
    currentUserId,
    processing,
    showRejectModal,
    setShowRejectModal,
    rejectReason,
    setRejectReason,
    showDeleteModal,
    setShowDeleteModal,
    users,
    leaveTypes
}) => {
    if (!doc) return null

    const getDrafterInfo = (drafterId) => {
        const drafter = users.find(u => u.user_id === drafterId)
        return drafter || { name: '알 수 없음' }
    }

    const getLeaveTypeLabel = (type) => {
        const found = leaveTypes.find(t => t.value === type)
        return found ? found.label : type
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

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-toss-gray-900">기안서 상세</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-toss-gray-500" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* 상태 및 라벨 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(doc.status)}
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
                            {doc.is_private && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                                    <Lock size={12} />
                                    비공개
                                </span>
                            )}
                        </div>

                        {/* 기안번호 & 담당자 */}
                        <div className="grid grid-cols-2 gap-4">
                            {doc.doc_number && (
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">기안번호</p>
                                    <p className="font-medium text-toss-gray-900">{doc.doc_number}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-toss-gray-500 mb-1">담당자</p>
                                <p className="font-medium text-toss-gray-900">
                                    {getDrafterInfo(doc.drafter_id).name}
                                    {getDrafterInfo(doc.drafter_id).rank && (
                                        <span className="text-toss-gray-500 font-normal ml-1">
                                            {getDrafterInfo(doc.drafter_id).rank}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* 제목 */}
                        <div>
                            <p className="text-sm text-toss-gray-500 mb-1">제목</p>
                            <p className="font-bold text-toss-gray-900 text-lg">{doc.title}</p>
                        </div>

                        {/* 내용 */}
                        {doc.content && (
                            <div>
                                <p className="text-sm text-toss-gray-500 mb-1">내용</p>
                                <p className="text-toss-gray-900 whitespace-pre-wrap">{doc.content}</p>
                            </div>
                        )}

                        {/* 추가근무시간 */}
                        {doc.extra_work_hours > 0 && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-toss-blue font-medium">
                                    추가근무: {doc.extra_work_hours}시간 (대체휴무 {(doc.extra_work_hours / 8).toFixed(1)}일)
                                </p>
                            </div>
                        )}

                        {/* 휴가 정보 */}
                        {doc.attendance_type === 'leave' && doc.leave_type && (
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <p className="text-sm text-emerald-700 font-medium mb-1">
                                    {getLeaveTypeLabel(doc.leave_type)} 신청
                                </p>
                                <p className="text-sm text-emerald-600">
                                    {doc.leave_start_date === doc.leave_end_date
                                        ? new Date(doc.leave_start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
                                        : `${new Date(doc.leave_start_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} ~ ${new Date(doc.leave_end_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}`
                                    }
                                    {doc.leave_days && ` (${doc.leave_days}일)`}
                                </p>
                            </div>
                        )}

                        {/* 첨부파일 */}
                        {doc.attachments && doc.attachments.length > 0 && (
                            <div>
                                <p className="text-sm text-toss-gray-500 mb-2">첨부파일 ({doc.attachments.length}개)</p>
                                <div className="space-y-2">
                                    {doc.attachments.map((file, index) => (
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
                        {doc.status === 'rejected' && doc.rejected_reason && (
                            <div className="p-3 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-600 font-medium mb-1">반려 사유</p>
                                <p className="text-red-700">{doc.rejected_reason}</p>
                            </div>
                        )}

                        {/* 신청일 */}
                        <div className="pt-4 border-t border-toss-gray-200">
                            <div className="flex items-center gap-1 text-sm text-toss-gray-500">
                                <Clock size={14} />
                                {new Date(doc.created_at).toLocaleString('ko-KR')} 작성
                            </div>
                            {doc.approved_at && (
                                <div className="flex items-center gap-1 text-sm text-toss-gray-500 mt-1">
                                    <Clock size={14} />
                                    {new Date(doc.approved_at).toLocaleString('ko-KR')} 결재
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div className="mt-6 space-y-3">
                        {/* 관리자/부관리자: 승인 대기중일 때 승인/반려 버튼 */}
                        {doc.status === 'pending' && canManage && !showRejectModal && (
                            <div className="flex gap-3">
                                <Button
                                    onClick={onApprove}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : (
                                        <CheckCircle size={16} className="mr-1" />
                                    )}
                                    승인
                                </Button>
                                <Button
                                    onClick={() => setShowRejectModal(true)}
                                    variant="secondary"
                                    className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                                    disabled={processing}
                                >
                                    <XCircle size={16} className="mr-1" />
                                    반려
                                </Button>
                            </div>
                        )}

                        {/* 반려 사유 입력 */}
                        {showRejectModal && (
                            <div className="p-4 bg-red-50 rounded-lg space-y-3">
                                <p className="text-sm font-medium text-red-700">반려 사유를 입력해주세요</p>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="반려 사유를 입력하세요"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={onReject}
                                        className="flex-1 bg-red-500 hover:bg-red-600"
                                        disabled={processing || !rejectReason.trim()}
                                    >
                                        {processing ? '처리 중...' : '반려 확인'}
                                    </Button>
                                    <Button
                                        onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                                        variant="secondary"
                                        className="flex-1"
                                        disabled={processing}
                                    >
                                        취소
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 본인 작성 문서 (대기중): 수정/삭제 버튼 */}
                        {doc.status === 'pending' && doc.drafter_id === currentUserId && !showRejectModal && !showDeleteModal && (
                            <div className="flex gap-3">
                                <Button onClick={() => onEdit(doc)} variant="secondary" className="flex-1">
                                    <Edit3 size={16} className="mr-1" />
                                    수정
                                </Button>
                                <Button
                                    onClick={() => setShowDeleteModal(true)}
                                    variant="secondary"
                                    className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                                >
                                    <Trash2 size={16} className="mr-1" />
                                    삭제
                                </Button>
                            </div>
                        )}

                        {/* 관리자: 결재된 문서도 삭제 가능 */}
                        {doc.status !== 'pending' && canManage && !showRejectModal && !showDeleteModal && (
                            <Button
                                onClick={() => setShowDeleteModal(true)}
                                variant="secondary"
                                className="w-full text-red-500 border-red-200 hover:bg-red-50"
                            >
                                <Trash2 size={16} className="mr-1" />
                                삭제
                            </Button>
                        )}

                        {/* 삭제 확인 모달 */}
                        {showDeleteModal && (
                            <div className="p-4 bg-red-50 rounded-lg space-y-3">
                                <p className="text-sm font-medium text-red-700">
                                    {doc.status === 'pending'
                                        ? '이 기안서를 삭제하시겠습니까?'
                                        : '결재된 문서를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={onDelete}
                                        className="flex-1 bg-red-500 hover:bg-red-600"
                                        disabled={processing}
                                    >
                                        {processing ? '삭제 중...' : '삭제'}
                                    </Button>
                                    <Button
                                        onClick={() => setShowDeleteModal(false)}
                                        variant="secondary"
                                        className="flex-1"
                                        disabled={processing}
                                    >
                                        취소
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 닫기 버튼 */}
                        {!showRejectModal && !showDeleteModal && (
                            <Button
                                onClick={onClose}
                                variant="secondary"
                                className="w-full"
                            >
                                닫기
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DocumentDetailModal
