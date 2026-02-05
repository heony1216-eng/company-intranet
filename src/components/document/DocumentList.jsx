import { useMemo } from 'react'
import { Card } from '../common'
import { FileText, Search, Filter, ChevronDown, ChevronUp, Lock, Paperclip, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

const DocumentList = ({
    documents,
    users,
    labels,
    loading,
    searchTerm,
    setSearchTerm,
    searchFilters,
    setSearchFilters,
    showAdvancedSearch,
    setShowAdvancedSearch,
    onDocClick,
    canManage,
    currentUserId
}) => {
    // 년도 목록 생성
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear()
        return Array.from({ length: 5 }, (_, i) => currentYear - i)
    }, [])

    // 월 목록
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    // 필터링된 기안서 목록
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
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
    }, [documents, searchTerm, searchFilters])

    // 담당자 정보 가져오기
    const getDrafterInfo = (drafterId) => {
        const drafter = users.find(u => u.user_id === drafterId)
        return drafter || { name: '알 수 없음' }
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

    const handleDocClick = (doc) => {
        // 비공개 기안서는 관리자이거나 본인만 열람 가능
        if (doc.is_private && !canManage && doc.drafter_id !== currentUserId) {
            return // 클릭 무시
        }
        onDocClick(doc)
    }

    return (
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
                <h2 className="text-lg font-bold text-toss-gray-900">전체 근태</h2>
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
                <>
                {/* PC: 테이블 */}
                <div className="hidden md:block overflow-x-auto">
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
                                const isLocked = doc.is_private && !canManage && doc.drafter_id !== currentUserId
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

                {/* 모바일: 카드 */}
                <div className="md:hidden space-y-3">
                    {filteredDocuments.map((doc) => {
                        const isLocked = doc.is_private && !canManage && doc.drafter_id !== currentUserId
                        const drafter = getDrafterInfo(doc.drafter_id)

                        return (
                            <div
                                key={doc.id}
                                onClick={() => handleDocClick(doc)}
                                className={`p-4 rounded-xl ${
                                    isLocked
                                        ? 'bg-toss-gray-100 cursor-not-allowed'
                                        : 'bg-toss-gray-50 cursor-pointer active:bg-toss-gray-100'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {doc.document_labels && (
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: doc.document_labels.color + '20',
                                                    color: doc.document_labels.color
                                                }}
                                            >
                                                {doc.document_labels.name}
                                            </span>
                                        )}
                                        {getStatusBadge(doc.status)}
                                    </div>
                                    <span className="text-xs text-toss-gray-400">{formatDate(doc.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    {doc.is_private && (
                                        <Lock size={14} className={isLocked ? 'text-red-400' : 'text-toss-gray-400'} />
                                    )}
                                    <p className={`font-medium ${isLocked ? 'text-toss-gray-400' : 'text-toss-gray-900'}`}>
                                        {isLocked ? '비공개 기안서' : doc.title}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-toss-gray-600">
                                        {drafter.name}
                                        {drafter.rank && <span className="text-toss-gray-400 ml-1">{drafter.rank}</span>}
                                    </span>
                                    {!isLocked && doc.attachments && doc.attachments.length > 0 && (
                                        <span className="text-xs text-toss-gray-500 flex items-center gap-1">
                                            <Paperclip size={12} />
                                            {doc.attachments.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                </>
            )}
        </Card>
    )
}

export default DocumentList
