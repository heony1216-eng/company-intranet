import { useState } from 'react'
import { Card, Button } from '../common'
import { X, Clock, Calendar, Upload, Paperclip, Plus, Trash2, Lock, Unlock } from 'lucide-react'
import { uploadMultipleToDropbox } from '../../lib/dropbox'

const DocumentForm = ({
    formData,
    setFormData,
    editingDoc,
    onSubmit,
    onClose,
    submitting,
    attachments,
    setAttachments,
    expenseItems,
    setExpenseItems,
    isAttendanceLabel = true,
    isExpenseLabel = false,
    leaveTypes,
    remainingAnnualDays,
    compLeaveDays
}) => {
    const [uploadingFiles, setUploadingFiles] = useState(false)

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

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-toss-gray-900">
                    {editingDoc ? '기안서 수정' : '새 기안서 작성'}
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-toss-gray-100 rounded-lg transition-colors"
                >
                    <X size={20} className="text-toss-gray-500" />
                </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
                {/* 제목 */}
                <div>
                    <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                        제목 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="제목을 입력하세요"
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
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">취소</Button>
                </div>
            </form>
        </Card>
    )
}

export default DocumentForm
