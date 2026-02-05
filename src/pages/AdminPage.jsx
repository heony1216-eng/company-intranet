import { useState, useEffect } from 'react'
import { useAnnualLeave } from '../hooks/useAnnualLeave'
import { useDocument } from '../hooks/useDocument'
import { useAuth } from '../hooks/useAuth'
import { Card, Button } from '../components/common'
import {
    Calendar, ArrowLeft, CheckCircle, XCircle, AlertCircle, Users, Clock, Search,
    Trash2, History, Edit3, Save, X, FileText, Tag, Plus, Paperclip, ExternalLink,
    Settings, Download, ChevronLeft, ChevronRight, Image
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateLeaveDocumentPdf } from '../utils/leaveDocumentPdf'
import { generateDocumentPdf } from '../utils/documentPdf'

// 연차 유형 정보
const LEAVE_TYPES = {
    full: { label: '연차', days: 1 },
    half_am: { label: '오전 반차', days: 0.5 },
    half_pm: { label: '오후 반차', days: 0.5 },
    out_1h: { label: '외출/조퇴 1시간', days: 0.125 },
    out_2h: { label: '외출/조퇴 2시간', days: 0.25 },
    out_3h: { label: '외출/조퇴 3시간', days: 0.375 },
    comp: { label: '대체휴무', days: 1 }
}

const AdminPage = () => {
    const { isAdmin, isSubAdmin, user } = useAuth()

    // 현재 사용자가 회장(admin)인지 이사장(admin2)인지 확인
    // user_id가 'admin' = 회장, 'admin2' = 이사장
    // 그 외 관리자(isAdmin || isSubAdmin)는 회장 권한으로 처리
    const isChairman = user?.user_id === 'admin' || ((isAdmin || isSubAdmin) && user?.user_id !== 'admin2') // 회장 또는 일반 관리자
    const isDirector = user?.user_id === 'admin2' // 이사장

    // 연차 관련
    const {
        pendingRequests: pendingLeaveRequests,
        loading: leaveLoading,
        approveLeaveRequest,
        rejectLeaveRequest,
        refresh: refreshLeave
    } = useAnnualLeave()

    // 기안서 관련
    const {
        pendingDocuments,
        labels,
        loading: docLoading,
        approveDocument,
        rejectDocument,
        deleteDocument,
        addLabel,
        updateLabel,
        deleteLabel,
        refresh: refreshDoc
    } = useDocument()

    // 공통 상태
    const [users, setUsers] = useState([])
    const [activeSection, setActiveSection] = useState('document') // 'document' | 'leave'

    // 기안서 관련 상태
    const [docActiveTab, setDocActiveTab] = useState('pending')
    const [allDocuments, setAllDocuments] = useState([])
    const [docSearchTerm, setDocSearchTerm] = useState('')
    const [docRejectingId, setDocRejectingId] = useState(null)
    const [docRejectReason, setDocRejectReason] = useState('')
    const [docProcessingId, setDocProcessingId] = useState(null)
    const [selectedDoc, setSelectedDoc] = useState(null)

    // 라벨 관리 상태
    const [newLabelName, setNewLabelName] = useState('')
    const [newLabelColor, setNewLabelColor] = useState('#3B82F6')
    const [editingLabelId, setEditingLabelId] = useState(null)
    const [editLabelName, setEditLabelName] = useState('')
    const [editLabelColor, setEditLabelColor] = useState('')

    // 연차 관련 상태
    const [leaveActiveTab, setLeaveActiveTab] = useState('pending')
    const [allLeaves, setAllLeaves] = useState([])
    const [processedRequests, setProcessedRequests] = useState([])
    const [processedAttendanceDocs, setProcessedAttendanceDocs] = useState([]) // 승인/반려된 근태 기안서
    const [leaveSearchTerm, setLeaveSearchTerm] = useState('')
    const [historySearchTerm, setHistorySearchTerm] = useState('')
    const [leaveRejectingId, setLeaveRejectingId] = useState(null)
    const [leaveRejectReason, setLeaveRejectReason] = useState('')
    const [leaveProcessingId, setLeaveProcessingId] = useState(null)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [editingUserId, setEditingUserId] = useState(null)
    const [editTotalDays, setEditTotalDays] = useState('')
    const [savingUserId, setSavingUserId] = useState(null)

    // 이미지 갤러리 상태
    const [galleryOpen, setGalleryOpen] = useState(false)
    const [galleryImages, setGalleryImages] = useState([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    // 관리자/부관리자가 아니면 리다이렉트
    if (!isAdmin && !isSubAdmin) {
        return <Navigate to="/" replace />
    }

    // 데이터 조회
    useEffect(() => {
        const fetchData = async () => {
            // 사용자 목록
            const { data: usersData } = await supabase
                .from('users')
                .select('user_id, name, team, rank')
                .order('name')

            if (usersData) {
                setUsers(usersData)
            }

            // 전체 기안서
            const { data: docsData } = await supabase
                .from('documents')
                .select('*, document_labels(*)')
                .order('created_at', { ascending: false })

            if (docsData) {
                setAllDocuments(docsData)
            }

            // 모든 연차 정보
            const { data: leavesData } = await supabase
                .from('annual_leaves')
                .select('*')
                .eq('year', new Date().getFullYear())

            if (leavesData) {
                setAllLeaves(leavesData)
            }

            // 처리된 연차 신청 내역
            const { data: processedData } = await supabase
                .from('leave_requests')
                .select('*')
                .in('status', ['approved', 'rejected'])
                .order('updated_at', { ascending: false })

            if (processedData) {
                setProcessedRequests(processedData)
            }

            // 처리된 근태 기안서 (code=4인 라벨, approved/rejected 상태)
            const { data: processedAttendanceData } = await supabase
                .from('documents')
                .select('*, document_labels(*)')
                .eq('document_labels.code', 4)
                .in('status', ['approved', 'rejected'])
                .order('updated_at', { ascending: false })

            if (processedAttendanceData) {
                setProcessedAttendanceDocs(processedAttendanceData.filter(d => d.document_labels?.code === 4))
            }
        }

        fetchData()
    }, [pendingDocuments, pendingLeaveRequests])

    const getUserInfo = (userId) => {
        return users.find(u => u.user_id === userId) || { name: userId, team: '', rank: '' }
    }

    const getLeaveInfo = (userId) => {
        return allLeaves.find(l => l.user_id === userId)
    }

    // 기안서 핸들러
    const handleDocApprove = async (docId, approvalType = 'chairman') => {
        setDocProcessingId(docId)
        const { error } = await approveDocument(docId, approvalType)
        setDocProcessingId(null)
        if (error) alert('승인에 실패했습니다.')
    }

    // 기안서 총액 계산
    const getDocumentTotalAmount = (doc) => {
        return (doc.expense_items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    }

    const handleDocReject = async (docId) => {
        if (!docRejectReason.trim()) {
            alert('반려 사유를 입력해주세요.')
            return
        }
        setDocProcessingId(docId)
        const { error } = await rejectDocument(docId, docRejectReason)
        setDocProcessingId(null)
        setDocRejectingId(null)
        setDocRejectReason('')
        if (error) alert('반려에 실패했습니다.')
    }

    const handleDocDelete = async (docId) => {
        if (!confirm('기안서를 삭제하시겠습니까?')) return
        setDocProcessingId(docId)
        const { error } = await deleteDocument(docId)
        setDocProcessingId(null)
        if (error) {
            console.error('Delete document error:', error)
            const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
            alert('삭제에 실패했습니다: ' + errorMessage)
        } else {
            setAllDocuments(prev => prev.filter(d => d.id !== docId))
        }
    }

    // 라벨 핸들러
    const handleAddLabel = async () => {
        if (!newLabelName.trim()) {
            alert('라벨 이름을 입력해주세요.')
            return
        }
        const { error } = await addLabel(newLabelName.trim(), newLabelColor)
        if (error) {
            alert('라벨 추가에 실패했습니다.')
        } else {
            setNewLabelName('')
            setNewLabelColor('#3B82F6')
        }
    }

    const handleUpdateLabel = async (labelId) => {
        if (!editLabelName.trim()) {
            alert('라벨 이름을 입력해주세요.')
            return
        }
        const { error } = await updateLabel(labelId, editLabelName.trim(), editLabelColor)
        if (error) {
            alert('라벨 수정에 실패했습니다.')
        } else {
            setEditingLabelId(null)
        }
    }

    const handleDeleteLabel = async (labelId) => {
        if (!confirm('라벨을 삭제하시겠습니까?')) return
        const { error } = await deleteLabel(labelId)
        if (error) alert('라벨 삭제에 실패했습니다.')
    }

    // 연차 핸들러
    const handleLeaveApprove = async (requestId) => {
        setLeaveProcessingId(requestId)
        const { error } = await approveLeaveRequest(requestId)
        setLeaveProcessingId(null)
        if (error) alert('승인에 실패했습니다.')
    }

    const handleLeaveReject = async (requestId) => {
        if (!leaveRejectReason.trim()) {
            alert('반려 사유를 입력해주세요.')
            return
        }
        setLeaveProcessingId(requestId)
        const { error } = await rejectLeaveRequest(requestId, leaveRejectReason)
        setLeaveProcessingId(null)
        setLeaveRejectingId(null)
        setLeaveRejectReason('')
        if (error) alert('반려에 실패했습니다.')
    }

    const handleLeaveDelete = async (request) => {
        if (!confirm(`${getUserInfo(request.user_id).name}님의 연차 신청을 삭제하시겠습니까?${request.status === 'approved' ? '\n(승인된 연차는 복원됩니다)' : ''}`)) {
            return
        }

        setLeaveProcessingId(request.id)

        if (request.status === 'approved') {
            const { data: leaveData } = await supabase
                .from('annual_leaves')
                .select('*')
                .eq('user_id', request.user_id)
                .eq('year', new Date().getFullYear())
                .single()

            if (leaveData) {
                await supabase
                    .from('annual_leaves')
                    .update({
                        used_days: Math.max(0, leaveData.used_days - request.days),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', leaveData.id)
            }
        }

        const { error } = await supabase
            .from('leave_requests')
            .delete()
            .eq('id', request.id)

        setLeaveProcessingId(null)

        if (error) {
            console.error('Delete leave request error:', error)
            const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
            alert('삭제에 실패했습니다: ' + errorMessage)
        } else {
            setProcessedRequests(prev => prev.filter(r => r.id !== request.id))
            refreshLeave()
        }
    }

    // 총 연차 수정
    const handleEditStart = (userId, currentTotal) => {
        setEditingUserId(userId)
        setEditTotalDays(currentTotal.toString())
    }

    const handleSaveTotalDays = async (userId) => {
        const totalDays = parseFloat(editTotalDays)
        if (isNaN(totalDays) || totalDays < 0) {
            alert('유효한 연차 일수를 입력해주세요.')
            return
        }

        setSavingUserId(userId)
        const existingLeave = allLeaves.find(l => l.user_id === userId)

        if (existingLeave) {
            const { error } = await supabase
                .from('annual_leaves')
                .update({ total_days: totalDays, updated_at: new Date().toISOString() })
                .eq('id', existingLeave.id)
            if (error) {
                alert('저장에 실패했습니다.')
                setSavingUserId(null)
                return
            }
        } else {
            const { error } = await supabase
                .from('annual_leaves')
                .insert({ user_id: userId, year: new Date().getFullYear(), total_days: totalDays, used_days: 0 })
            if (error) {
                alert('저장에 실패했습니다.')
                setSavingUserId(null)
                return
            }
        }

        if (existingLeave) {
            setAllLeaves(prev => prev.map(l => l.user_id === userId ? { ...l, total_days: totalDays } : l))
        } else {
            setAllLeaves(prev => [...prev, { user_id: userId, year: new Date().getFullYear(), total_days: totalDays, used_days: 0 }])
        }

        setSavingUserId(null)
        setEditingUserId(null)
    }

    // 유틸리티
    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })
    }

    const formatTableDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
            .replace(/\. /g, '/').replace('.', '')
    }

    const getDocStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium"><CheckCircle size={12} />결재</span>
            case 'chairman_approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"><CheckCircle size={12} />회장승인</span>
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium"><XCircle size={12} />반려</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium"><AlertCircle size={12} />진행중</span>
        }
    }

    const getLeaveStatusBadge = (status) => {
        if (status === 'approved') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium"><CheckCircle size={12} />승인</span>
        } else if (status === 'rejected') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium"><XCircle size={12} />반려</span>
        }
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium"><AlertCircle size={12} />대기중</span>
    }

    const filteredDocuments = allDocuments.filter(doc => {
        // 근태(code=4) 라벨 제외
        if (doc.document_labels?.code === 4) return false
        const userDoc = getUserInfo(doc.drafter_id)
        return userDoc.name?.toLowerCase().includes(docSearchTerm.toLowerCase()) ||
               doc.title?.toLowerCase().includes(docSearchTerm.toLowerCase())
    })

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(leaveSearchTerm.toLowerCase()) ||
        u.team?.toLowerCase().includes(leaveSearchTerm.toLowerCase())
    )

    const colorOptions = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280']

    // 근태 라벨(code=4) 기안서 필터링 (연차 관리에서 승인)
    const pendingAttendanceDocs = pendingDocuments.filter(doc => doc.document_labels?.code === 4)
    // 기안서 관리에서 표시할 목록 (근태 제외)
    const pendingNonAttendanceDocs = pendingDocuments.filter(doc => doc.document_labels?.code !== 4)

    const totalPending = pendingNonAttendanceDocs.length + pendingLeaveRequests.length + pendingAttendanceDocs.length

    // 첨부파일 관련 유틸리티
    const isImageFile = (filename) => {
        const ext = filename.split('.').pop().toLowerCase()
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)
    }

    const openGallery = (attachments, startIndex = 0) => {
        const images = attachments.filter(file => isImageFile(file.name))
        if (images.length > 0) {
            setGalleryImages(images)
            setCurrentImageIndex(startIndex)
            setGalleryOpen(true)
        }
    }

    const handleDownloadFile = async (file) => {
        try {
            const response = await fetch(file.url)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = file.name
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download failed:', error)
            window.open(file.url, '_blank')
        }
    }

    const handleDownloadAll = async (attachments) => {
        for (const file of attachments) {
            await handleDownloadFile(file)
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-toss-gray-500 hover:text-toss-gray-700 transition-colors"
            >
                <ArrowLeft size={20} />
                대시보드로 돌아가기
            </Link>

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <Settings className="text-white" size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-toss-gray-900">관리</h1>
                    <p className="text-toss-gray-500">
                        기안서와 연차를 관리합니다
                        {totalPending > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {totalPending}건 대기
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Section Toggle */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveSection('document')}
                    className={`flex-1 py-4 rounded-xl font-medium transition-all ${
                        activeSection === 'document'
                            ? 'bg-indigo-500 text-white'
                            : 'bg-toss-gray-100 text-toss-gray-600 hover:bg-toss-gray-200'
                    }`}
                >
                    <FileText size={20} className="inline mr-2" />
                    기안서 관리
                    {pendingNonAttendanceDocs.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            activeSection === 'document' ? 'bg-white/20' : 'bg-red-500 text-white'
                        }`}>
                            {pendingNonAttendanceDocs.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveSection('leave')}
                    className={`flex-1 py-4 rounded-xl font-medium transition-all ${
                        activeSection === 'leave'
                            ? 'bg-purple-500 text-white'
                            : 'bg-toss-gray-100 text-toss-gray-600 hover:bg-toss-gray-200'
                    }`}
                >
                    <Calendar size={20} className="inline mr-2" />
                    연차 관리
                    {(pendingLeaveRequests.length + pendingAttendanceDocs.length) > 0 && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            activeSection === 'leave' ? 'bg-white/20' : 'bg-red-500 text-white'
                        }`}>
                            {pendingLeaveRequests.length + pendingAttendanceDocs.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ==================== 기안서 관리 섹션 ==================== */}
            {activeSection === 'document' && (
                <>
                    {/* Document Tabs */}
                    <div className="flex gap-2 border-b border-toss-gray-200">
                        <button
                            onClick={() => setDocActiveTab('pending')}
                            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                docActiveTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                            }`}
                        >
                            승인 대기
                            {pendingNonAttendanceDocs.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingNonAttendanceDocs.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setDocActiveTab('all')}
                            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                docActiveTab === 'all' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                            }`}
                        >
                            전체 기안서
                        </button>
                        <button
                            onClick={() => setDocActiveTab('labels')}
                            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                docActiveTab === 'labels' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                            }`}
                        >
                            라벨 관리
                        </button>
                    </div>

                    {/* 기안서 승인 대기 */}
                    {docActiveTab === 'pending' && (
                        <Card>
                            <h2 className="text-lg font-bold text-toss-gray-900 mb-4 flex items-center gap-2">
                                <AlertCircle className="text-amber-500" size={20} />
                                승인 대기중인 기안서
                            </h2>

                            {docLoading ? (
                                <div className="py-12 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                                </div>
                            ) : pendingNonAttendanceDocs.length === 0 ? (
                                <div className="py-12 text-center text-toss-gray-500">
                                    <CheckCircle className="mx-auto mb-3 text-emerald-400" size={48} />
                                    <p>대기중인 기안서가 없습니다</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingNonAttendanceDocs.map((doc) => {
                                        const userInfo = getUserInfo(doc.drafter_id)
                                        const isRejecting = docRejectingId === doc.id
                                        const isProcessing = docProcessingId === doc.id
                                        const totalAmount = getDocumentTotalAmount(doc)
                                        const needsDirectorApproval = totalAmount >= 1000000
                                        const isChairmanApproved = doc.status === 'chairman_approved'

                                        return (
                                            <div key={doc.id} className="p-5 bg-toss-gray-50 rounded-xl">
                                                {/* 클릭 가능한 상세 보기 영역 */}
                                                <div
                                                    onClick={() => setSelectedDoc({ ...doc, userInfo })}
                                                    className="cursor-pointer hover:bg-toss-gray-100 -mx-5 -mt-5 px-5 pt-5 pb-3 rounded-t-xl transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {doc.document_labels && (
                                                                    <span
                                                                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                                        style={{ backgroundColor: doc.document_labels.color + '20', color: doc.document_labels.color }}
                                                                    >
                                                                        {doc.document_labels.name}
                                                                    </span>
                                                                )}
                                                                {isChairmanApproved && (
                                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                                        회장승인완료
                                                                    </span>
                                                                )}
                                                                <span className="text-sm text-toss-gray-500">{doc.doc_number}</span>
                                                            </div>
                                                            <p className="font-bold text-toss-gray-900">{doc.title}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-base font-semibold text-toss-gray-900">{userInfo.name} <span className="font-normal text-toss-gray-600">{userInfo.rank}</span></p>
                                                            <p className="text-sm text-toss-gray-500">{userInfo.team}</p>
                                                        </div>
                                                    </div>

                                                    {doc.content && <p className="text-sm text-toss-gray-600 mb-3 line-clamp-2">{doc.content}</p>}

                                                    {totalAmount > 0 && (
                                                        <p className={`text-sm font-medium mb-2 ${needsDirectorApproval ? 'text-orange-600' : 'text-indigo-600'}`}>
                                                            총액: {totalAmount.toLocaleString()}원
                                                            {needsDirectorApproval && ' (이사장 결재 필요)'}
                                                        </p>
                                                    )}

                                                    {doc.extra_work_hours > 0 && (
                                                        <p className="text-sm text-toss-blue mb-3">
                                                            추가근무: {doc.extra_work_hours}시간 (대체휴무 {(doc.extra_work_hours / 8).toFixed(1)}일)
                                                        </p>
                                                    )}

                                                    {/* 휴가 정보 */}
                                                    {doc.attendance_type === 'leave' && doc.leave_type && (
                                                        <div className="p-2 bg-emerald-50 rounded-lg mb-3">
                                                            <p className="text-sm text-emerald-700 font-medium">
                                                                {LEAVE_TYPES[doc.leave_type]?.label || doc.leave_type} 신청
                                                                <span className="ml-2">
                                                                    {doc.leave_start_date === doc.leave_end_date
                                                                        ? formatDate(doc.leave_start_date)
                                                                        : `${formatDate(doc.leave_start_date)} ~ ${formatDate(doc.leave_end_date)}`
                                                                    }
                                                                    {doc.leave_days && ` (${doc.leave_days}일)`}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 첨부파일 표시 */}
                                                    {doc.attachments && doc.attachments.length > 0 && (
                                                        <div className="mb-3">
                                                            <p className="text-xs text-toss-gray-500 mb-2 flex items-center gap-1">
                                                                <Paperclip size={12} />
                                                                첨부파일 ({doc.attachments.length}개)
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {doc.attachments.map((file, idx) => {
                                                                    const isImage = isImageFile(file.name)
                                                                    const imageIndex = doc.attachments.filter(f => isImageFile(f.name)).findIndex(f => f.name === file.name)
                                                                    return (
                                                                        <div key={idx} className="relative group">
                                                                            {isImage ? (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        openGallery(doc.attachments, imageIndex)
                                                                                    }}
                                                                                    className="w-16 h-16 rounded-lg overflow-hidden border border-toss-gray-200 hover:border-toss-blue transition-colors"
                                                                                >
                                                                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                                                </button>
                                                                            ) : (
                                                                                <a
                                                                                    href={file.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="flex items-center gap-1 px-2 py-1 bg-toss-gray-100 rounded-lg text-xs text-toss-gray-700 hover:bg-toss-gray-200 transition-colors"
                                                                                >
                                                                                    <FileText size={12} />
                                                                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1 text-xs text-toss-gray-400">
                                                        <Clock size={12} />
                                                        {new Date(doc.created_at).toLocaleString('ko-KR')} 작성
                                                    </div>
                                                </div>

                                                {/* 승인/반려 버튼 영역 */}
                                                <div className="mt-4 pt-4 border-t border-toss-gray-200">
                                                    {isRejecting ? (
                                                        <div className="space-y-3">
                                                            <textarea
                                                                value={docRejectReason}
                                                                onChange={(e) => setDocRejectReason(e.target.value)}
                                                                placeholder="반려 사유를 입력하세요"
                                                                rows={2}
                                                                className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button onClick={() => handleDocReject(doc.id)} className="flex-1 bg-red-500 hover:bg-red-600" loading={isProcessing} disabled={isProcessing}>
                                                                    반려 확인
                                                                </Button>
                                                                <Button onClick={() => { setDocRejectingId(null); setDocRejectReason('') }} variant="secondary" className="flex-1" disabled={isProcessing}>
                                                                    취소
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            {/* 100만원 이상: 회장/이사장 분리 승인 */}
                                                            {needsDirectorApproval ? (
                                                                <>
                                                                    {/* 회장 승인 버튼: 아직 회장승인 안된 경우에만 */}
                                                                    {!isChairmanApproved && (
                                                                        <Button
                                                                            onClick={() => handleDocApprove(doc.id, 'chairman')}
                                                                            className="flex-1 bg-blue-500 hover:bg-blue-600"
                                                                            loading={isProcessing}
                                                                            disabled={isProcessing}
                                                                        >
                                                                            <CheckCircle size={16} className="mr-1" />회장 승인
                                                                        </Button>
                                                                    )}
                                                                    {/* 이사장 승인 버튼: 회장승인 완료된 경우에만 */}
                                                                    {isChairmanApproved && (
                                                                        <Button
                                                                            onClick={() => handleDocApprove(doc.id, 'director')}
                                                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                                                            loading={isProcessing}
                                                                            disabled={isProcessing}
                                                                        >
                                                                            <CheckCircle size={16} className="mr-1" />이사장 승인
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                /* 100만원 미만: 일반 승인 */
                                                                <Button
                                                                    onClick={() => handleDocApprove(doc.id, 'chairman')}
                                                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                                                    loading={isProcessing}
                                                                    disabled={isProcessing}
                                                                >
                                                                    <CheckCircle size={16} className="mr-1" />승인
                                                                </Button>
                                                            )}
                                                            {/* 반려 버튼 */}
                                                            <Button
                                                                onClick={() => setDocRejectingId(doc.id)}
                                                                variant="secondary"
                                                                className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                                                                disabled={isProcessing}
                                                            >
                                                                <XCircle size={16} className="mr-1" />반려
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* 전체 기안서 */}
                    {docActiveTab === 'all' && (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-toss-gray-900">전체 기안서</h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={docSearchTerm}
                                        onChange={(e) => setDocSearchTerm(e.target.value)}
                                        placeholder="이름 또는 제목으로 검색"
                                        className="pl-9 pr-4 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-toss-gray-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">기안일자</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">라벨</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">제목</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">기안자</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">진행상태</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDocuments.map((doc) => {
                                            const userInfo = getUserInfo(doc.drafter_id)
                                            const isProcessing = docProcessingId === doc.id

                                            return (
                                                <tr
                                                    key={doc.id}
                                                    onClick={() => setSelectedDoc({ ...doc, userInfo })}
                                                    className="border-b border-toss-gray-100 hover:bg-toss-gray-50 cursor-pointer"
                                                >
                                                    <td className="py-3 px-4 text-sm text-toss-gray-600">{formatTableDate(doc.created_at)}</td>
                                                    <td className="py-3 px-4">
                                                        {doc.document_labels && (
                                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: doc.document_labels.color + '20', color: doc.document_labels.color }}>
                                                                {doc.document_labels.name}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <p className="font-medium text-toss-gray-900 truncate max-w-xs">{doc.title}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-toss-gray-600">{userInfo.name}</td>
                                                    <td className="py-3 px-4 text-center">{getDocStatusBadge(doc.status)}</td>
                                                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {doc.status === 'approved' && (
                                                                <button
                                                                    onClick={() => {
                                                                        const totalAmt = getDocumentTotalAmount(doc)
                                                                        const directorName = totalAmt >= 1000000 ? '권태일' : ''
                                                                        generateDocumentPdf(doc, userInfo, '이정숙', directorName)
                                                                    }}
                                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                    title="기안서 PDF 다운로드"
                                                                >
                                                                    <FileText size={18} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDocDelete(doc.id)}
                                                                disabled={isProcessing}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                title="삭제"
                                                            >
                                                                {isProcessing ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={18} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* 라벨 관리 */}
                    {docActiveTab === 'labels' && (
                        <Card>
                            <h2 className="text-lg font-bold text-toss-gray-900 mb-4 flex items-center gap-2">
                                <Tag className="text-purple-500" size={20} />
                                라벨 관리
                            </h2>

                            {/* 새 라벨 추가 */}
                            <div className="p-4 bg-toss-gray-50 rounded-xl mb-6">
                                <h3 className="font-medium text-toss-gray-900 mb-3">새 라벨 추가</h3>
                                <div className="flex gap-3 items-end flex-wrap">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm text-toss-gray-500 mb-1">라벨 이름</label>
                                        <input
                                            type="text"
                                            value={newLabelName}
                                            onChange={(e) => setNewLabelName(e.target.value)}
                                            placeholder="라벨 이름"
                                            className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-toss-gray-500 mb-1">색상</label>
                                        <div className="flex gap-1">
                                            {colorOptions.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setNewLabelColor(color)}
                                                    className={`w-8 h-8 rounded-lg transition-all ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <Button onClick={handleAddLabel}>
                                        <Plus size={16} className="mr-1" />추가
                                    </Button>
                                </div>
                            </div>

                            {/* 라벨 목록 */}
                            <div className="space-y-3">
                                {labels.map((label) => {
                                    const isEditing = editingLabelId === label.id
                                    return (
                                        <div key={label.id} className="flex items-center justify-between p-4 bg-toss-gray-50 rounded-xl">
                                            {isEditing ? (
                                                <div className="flex gap-3 items-center flex-1 flex-wrap">
                                                    <input
                                                        type="text"
                                                        value={editLabelName}
                                                        onChange={(e) => setEditLabelName(e.target.value)}
                                                        className="flex-1 min-w-[150px] px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                    />
                                                    <div className="flex gap-1">
                                                        {colorOptions.map((color) => (
                                                            <button
                                                                key={color}
                                                                onClick={() => setEditLabelColor(color)}
                                                                className={`w-6 h-6 rounded transition-all ${editLabelColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <button onClick={() => handleUpdateLabel(label.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingLabelId(null)} className="p-2 text-toss-gray-500 hover:bg-toss-gray-100 rounded-lg"><X size={18} /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-toss-gray-500">{label.code}</span>
                                                        <span className="px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: label.color + '20', color: label.color }}>{label.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => { setEditingLabelId(label.id); setEditLabelName(label.name); setEditLabelColor(label.color) }} className="p-2 text-toss-gray-500 hover:bg-toss-gray-100 rounded-lg"><Edit3 size={18} /></button>
                                                        <button onClick={() => handleDeleteLabel(label.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* ==================== 연차 관리 섹션 ==================== */}
            {activeSection === 'leave' && (
                <>
                    {/* Leave Tabs */}
                    <div className="flex gap-2 border-b border-toss-gray-200">
                        <button
                            onClick={() => setLeaveActiveTab('pending')}
                            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                leaveActiveTab === 'pending' ? 'border-purple-500 text-purple-600' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                            }`}
                        >
                            승인 대기
                            {(pendingLeaveRequests.length + pendingAttendanceDocs.length) > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingLeaveRequests.length + pendingAttendanceDocs.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setLeaveActiveTab('history')}
                            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                leaveActiveTab === 'history' ? 'border-purple-500 text-purple-600' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                            }`}
                        >
                            처리 내역
                        </button>
                        <button
                            onClick={() => setLeaveActiveTab('overview')}
                            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                leaveActiveTab === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-toss-gray-500 hover:text-toss-gray-700'
                            }`}
                        >
                            전체 현황
                        </button>
                    </div>

                    {/* 연차 승인 대기 */}
                    {leaveActiveTab === 'pending' && (
                        <div className="space-y-6">
                            {/* 근태 기안서 섹션 */}
                            {pendingAttendanceDocs.length > 0 && (
                                <Card>
                                    <h2 className="text-lg font-bold text-toss-gray-900 mb-4 flex items-center gap-2">
                                        <FileText className="text-purple-500" size={20} />
                                        승인 대기중인 근태 기안서
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{pendingAttendanceDocs.length}</span>
                                    </h2>
                                    <div className="space-y-4">
                                        {pendingAttendanceDocs.map((doc) => {
                                            const userInfo = getUserInfo(doc.drafter_id)
                                            const isRejecting = docRejectingId === doc.id
                                            const isProcessing = docProcessingId === doc.id
                                            const totalAmount = getDocumentTotalAmount(doc)
                                            const needsDirectorApproval = totalAmount >= 1000000
                                            const isChairmanApproved = doc.status === 'chairman_approved'

                                            return (
                                                <div key={doc.id} className="p-5 bg-toss-gray-50 rounded-xl">
                                                    <div
                                                        onClick={() => setSelectedDoc({ ...doc, userInfo })}
                                                        className="cursor-pointer hover:bg-toss-gray-100 -mx-5 -mt-5 px-5 pt-5 pb-3 rounded-t-xl transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {doc.document_labels && (
                                                                        <span
                                                                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                                            style={{ backgroundColor: doc.document_labels.color + '20', color: doc.document_labels.color }}
                                                                        >
                                                                            {doc.document_labels.name}
                                                                        </span>
                                                                    )}
                                                                    {doc.attendance_type && (
                                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                                            doc.attendance_type === 'overtime' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                                        }`}>
                                                                            {doc.attendance_type === 'overtime' ? '추가근무' : '휴가'}
                                                                        </span>
                                                                    )}
                                                                    {isChairmanApproved && (
                                                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                                            회장승인완료
                                                                        </span>
                                                                    )}
                                                                    <span className="text-sm text-toss-gray-500">{doc.doc_number}</span>
                                                                </div>
                                                                <p className="font-bold text-toss-gray-900">{doc.title}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-base font-semibold text-toss-gray-900">{userInfo.name} <span className="font-normal text-toss-gray-600">{userInfo.rank}</span></p>
                                                                <p className="text-sm text-toss-gray-500">{userInfo.team}</p>
                                                            </div>
                                                        </div>

                                                        {/* 휴가 정보 표시 */}
                                                        {doc.leave_type && (
                                                            <div className="mb-3 p-3 bg-green-50 rounded-lg">
                                                                <p className="text-sm text-green-800">
                                                                    <span className="font-medium">휴가 유형:</span> {LEAVE_TYPES[doc.leave_type]?.label || doc.leave_type}
                                                                </p>
                                                                {doc.leave_start_date && (
                                                                    <p className="text-sm text-green-800">
                                                                        <span className="font-medium">기간:</span> {formatDate(doc.leave_start_date)}
                                                                        {doc.leave_end_date && doc.leave_start_date !== doc.leave_end_date && <> ~ {formatDate(doc.leave_end_date)}</>}
                                                                    </p>
                                                                )}
                                                                {doc.leave_days && (
                                                                    <p className="text-sm text-green-800">
                                                                        <span className="font-medium">일수:</span> {doc.leave_days}일
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {doc.content && <p className="text-sm text-toss-gray-600 mb-3 line-clamp-2">{doc.content}</p>}

                                                        <div className="flex items-center gap-1 text-xs text-toss-gray-400">
                                                            <Clock size={12} />
                                                            {new Date(doc.created_at).toLocaleString('ko-KR')} 작성
                                                        </div>
                                                    </div>

                                                    {isRejecting ? (
                                                        <div className="space-y-3 mt-4">
                                                            <textarea
                                                                value={docRejectReason}
                                                                onChange={(e) => setDocRejectReason(e.target.value)}
                                                                placeholder="반려 사유를 입력하세요"
                                                                rows={2}
                                                                className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button onClick={() => handleDocReject(doc.id)} className="flex-1 bg-red-500 hover:bg-red-600" loading={isProcessing} disabled={isProcessing}>
                                                                    반려 확인
                                                                </Button>
                                                                <Button onClick={() => { setDocRejectingId(null); setDocRejectReason('') }} variant="secondary" className="flex-1" disabled={isProcessing}>
                                                                    취소
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 mt-4">
                                                            {needsDirectorApproval && !isChairmanApproved && isChairman && (
                                                                <Button onClick={() => handleDocApprove(doc.id, 'chairman')} className="flex-1 bg-blue-500 hover:bg-blue-600" loading={isProcessing} disabled={isProcessing}>
                                                                    <CheckCircle size={16} className="mr-1" />회장 승인
                                                                </Button>
                                                            )}
                                                            {needsDirectorApproval && isChairmanApproved && isDirector && (
                                                                <Button onClick={() => handleDocApprove(doc.id, 'director')} className="flex-1 bg-emerald-500 hover:bg-emerald-600" loading={isProcessing} disabled={isProcessing}>
                                                                    <CheckCircle size={16} className="mr-1" />이사장 결재
                                                                </Button>
                                                            )}
                                                            {!needsDirectorApproval && (
                                                                <Button onClick={() => handleDocApprove(doc.id, 'chairman')} className="flex-1 bg-emerald-500 hover:bg-emerald-600" loading={isProcessing} disabled={isProcessing}>
                                                                    <CheckCircle size={16} className="mr-1" />승인
                                                                </Button>
                                                            )}
                                                            <Button onClick={() => setDocRejectingId(doc.id)} variant="secondary" className="flex-1 text-red-500 border-red-200 hover:bg-red-50" disabled={isProcessing}>
                                                                <XCircle size={16} className="mr-1" />반려
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>
                            )}

                            {/* 연차 신청 섹션 */}
                            <Card>
                                <h2 className="text-lg font-bold text-toss-gray-900 mb-4 flex items-center gap-2">
                                    <AlertCircle className="text-amber-500" size={20} />
                                    승인 대기중인 연차 신청
                                    {pendingLeaveRequests.length > 0 && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">{pendingLeaveRequests.length}</span>
                                    )}
                                </h2>

                                {leaveLoading ? (
                                    <div className="py-12 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                                    </div>
                                ) : pendingLeaveRequests.length === 0 ? (
                                    <div className="py-12 text-center text-toss-gray-500">
                                        <CheckCircle className="mx-auto mb-3 text-emerald-400" size={48} />
                                        <p>대기중인 연차 신청이 없습니다</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingLeaveRequests.map((request) => {
                                        const userInfo = getUserInfo(request.user_id)
                                        const isRejecting = leaveRejectingId === request.id
                                        const isProcessing = leaveProcessingId === request.id

                                        return (
                                            <div key={request.id} className="p-5 bg-toss-gray-50 rounded-xl">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-lg font-bold text-toss-gray-900">
                                                            {userInfo.name}
                                                            {userInfo.rank && <span className="text-base font-normal text-toss-gray-600 ml-1">{userInfo.rank}</span>}
                                                        </p>
                                                        {userInfo.team && <p className="text-sm text-toss-gray-500">{userInfo.team}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">{request.days}일</span>
                                                        <p className="text-xs text-toss-gray-500 mt-1">{LEAVE_TYPES[request.leave_type]?.label || request.leave_type}</p>
                                                    </div>
                                                </div>

                                                <div className="mb-3">
                                                    <p className="text-toss-gray-900">
                                                        {formatDate(request.start_date)}
                                                        {request.start_date !== request.end_date && <> ~ {formatDate(request.end_date)}</>}
                                                    </p>
                                                    {request.reason && <p className="text-sm text-toss-gray-500 mt-1">사유: {request.reason}</p>}
                                                </div>

                                                <div className="flex items-center gap-1 text-xs text-toss-gray-400 mb-4">
                                                    <Clock size={12} />
                                                    {new Date(request.created_at).toLocaleString('ko-KR')} 신청
                                                </div>

                                                {isRejecting ? (
                                                    <div className="space-y-3">
                                                        <textarea
                                                            value={leaveRejectReason}
                                                            onChange={(e) => setLeaveRejectReason(e.target.value)}
                                                            placeholder="반려 사유를 입력하세요"
                                                            rows={2}
                                                            className="w-full px-3 py-2 bg-white border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button onClick={() => handleLeaveReject(request.id)} className="flex-1 bg-red-500 hover:bg-red-600" loading={isProcessing} disabled={isProcessing}>
                                                                반려 확인
                                                            </Button>
                                                            <Button onClick={() => { setLeaveRejectingId(null); setLeaveRejectReason('') }} variant="secondary" className="flex-1" disabled={isProcessing}>
                                                                취소
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button onClick={() => handleLeaveApprove(request.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600" loading={isProcessing} disabled={isProcessing}>
                                                            <CheckCircle size={16} className="mr-1" />승인
                                                        </Button>
                                                        <Button onClick={() => setLeaveRejectingId(request.id)} variant="secondary" className="flex-1 text-red-500 border-red-200 hover:bg-red-50" disabled={isProcessing}>
                                                            <XCircle size={16} className="mr-1" />반려
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            </Card>
                        </div>
                    )}

                    {/* 처리 내역 */}
                    {leaveActiveTab === 'history' && (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-toss-gray-900 flex items-center gap-2">
                                    <History className="text-purple-500" size={20} />
                                    처리 내역
                                </h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={historySearchTerm}
                                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                                        placeholder="이름으로 검색"
                                        className="pl-9 pr-4 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {processedRequests.length === 0 && processedAttendanceDocs.length === 0 ? (
                                <div className="py-12 text-center text-toss-gray-500">
                                    <History className="mx-auto mb-3 text-toss-gray-300" size={48} />
                                    <p>처리된 내역이 없습니다</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-toss-gray-200">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">처리일</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">신청자</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">구분</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">유형/제목</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">기간</th>
                                                <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">상태</th>
                                                <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* 연차 신청 내역과 근태 기안서를 통합하여 시간순 정렬 */}
                                            {[
                                                ...processedRequests.map(r => ({ ...r, _type: 'leave', _sortDate: new Date(r.updated_at) })),
                                                ...processedAttendanceDocs.map(d => ({ ...d, _type: 'document', _sortDate: new Date(d.updated_at || d.approved_at || d.created_at) }))
                                            ]
                                                .sort((a, b) => b._sortDate - a._sortDate)
                                                .filter(item => {
                                                    const userId = item._type === 'leave' ? item.user_id : item.drafter_id
                                                    return getUserInfo(userId).name?.toLowerCase().includes(historySearchTerm.toLowerCase())
                                                })
                                                .map((item) => {
                                                    if (item._type === 'leave') {
                                                        // 연차 신청
                                                        const request = item
                                                        const userInfo = getUserInfo(request.user_id)
                                                        const isProcessing = leaveProcessingId === request.id

                                                        return (
                                                            <tr
                                                                key={`leave-${request.id}`}
                                                                onClick={() => setSelectedRequest({ ...request, userInfo })}
                                                                className="border-b border-toss-gray-100 hover:bg-toss-gray-50 cursor-pointer"
                                                            >
                                                                <td className="py-3 px-4 text-sm text-toss-gray-600">{formatTableDate(request.updated_at)}</td>
                                                                <td className="py-3 px-4">
                                                                    <p className="text-sm font-medium text-toss-gray-900">{userInfo.name}</p>
                                                                    {userInfo.rank && <p className="text-xs text-toss-gray-500">{userInfo.rank}</p>}
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">연차</span>
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-toss-gray-900">
                                                                    {LEAVE_TYPES[request.leave_type]?.label}
                                                                    {request.days && <span className="text-purple-600 ml-1">({request.days}일)</span>}
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <p className="text-sm text-toss-gray-900">
                                                                        {formatTableDate(request.start_date)}
                                                                        {request.start_date !== request.end_date && <> ~ {formatTableDate(request.end_date)}</>}
                                                                    </p>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">{getLeaveStatusBadge(request.status)}</td>
                                                                <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        {request.status === 'approved' && (
                                                                            <button
                                                                                onClick={() => generateLeaveDocumentPdf(request, userInfo)}
                                                                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                                title="연차신청서 PDF 다운로드"
                                                                            >
                                                                                <FileText size={18} />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleLeaveDelete(request)}
                                                                            disabled={isProcessing}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                            title="삭제"
                                                                        >
                                                                            {isProcessing ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={18} />}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    } else {
                                                        // 근태 기안서
                                                        const doc = item
                                                        const userInfo = getUserInfo(doc.drafter_id)
                                                        const isProcessing = docProcessingId === doc.id

                                                        return (
                                                            <tr
                                                                key={`doc-${doc.id}`}
                                                                onClick={() => setSelectedDoc({ ...doc, userInfo })}
                                                                className="border-b border-toss-gray-100 hover:bg-toss-gray-50 cursor-pointer"
                                                            >
                                                                <td className="py-3 px-4 text-sm text-toss-gray-600">{formatTableDate(doc.updated_at || doc.approved_at || doc.created_at)}</td>
                                                                <td className="py-3 px-4">
                                                                    <p className="text-sm font-medium text-toss-gray-900">{userInfo.name}</p>
                                                                    {userInfo.rank && <p className="text-xs text-toss-gray-500">{userInfo.rank}</p>}
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        doc.attendance_type === 'overtime' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                                    }`}>
                                                                        {doc.attendance_type === 'overtime' ? '추가근무' : '휴가'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-sm text-toss-gray-900">
                                                                    {doc.attendance_type === 'leave' ? (
                                                                        <>
                                                                            {LEAVE_TYPES[doc.leave_type]?.label || doc.leave_type}
                                                                            {doc.leave_days && <span className="text-purple-600 ml-1">({doc.leave_days}일)</span>}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {doc.title}
                                                                            {doc.extra_work_hours > 0 && <span className="text-blue-600 ml-1">({doc.extra_work_hours}시간)</span>}
                                                                        </>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    {doc.leave_start_date ? (
                                                                        <p className="text-sm text-toss-gray-900">
                                                                            {formatTableDate(doc.leave_start_date)}
                                                                            {doc.leave_start_date !== doc.leave_end_date && doc.leave_end_date && <> ~ {formatTableDate(doc.leave_end_date)}</>}
                                                                        </p>
                                                                    ) : (
                                                                        <span className="text-sm text-toss-gray-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 px-4 text-center">{getDocStatusBadge(doc.status)}</td>
                                                                <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        {doc.status === 'approved' && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    const totalAmt = getDocumentTotalAmount(doc)
                                                                                    const directorName = totalAmt >= 1000000 ? '권태일' : ''
                                                                                    generateDocumentPdf(doc, userInfo, '이정숙', directorName)
                                                                                }}
                                                                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                                title="기안서 PDF 다운로드"
                                                                            >
                                                                                <FileText size={18} />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDocDelete(doc.id)}
                                                                            disabled={isProcessing}
                                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                            title="삭제"
                                                                        >
                                                                            {isProcessing ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={18} />}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    }
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* 전체 현황 */}
                    {leaveActiveTab === 'overview' && (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-toss-gray-900 flex items-center gap-2">
                                    <Users className="text-purple-600" size={20} />
                                    직원별 연차 현황
                                </h2>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={leaveSearchTerm}
                                        onChange={(e) => setLeaveSearchTerm(e.target.value)}
                                        placeholder="이름 또는 팀으로 검색"
                                        className="pl-9 pr-4 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-toss-gray-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">이름</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">팀</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">총 연차</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">사용</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">잔여</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u) => {
                                            const leave = getLeaveInfo(u.user_id)
                                            const total = leave?.total_days || 15
                                            const used = leave?.used_days || 0
                                            const remaining = total - used
                                            const isEditing = editingUserId === u.user_id
                                            const isSaving = savingUserId === u.user_id

                                            return (
                                                <tr key={u.user_id} className="border-b border-toss-gray-100 hover:bg-toss-gray-50">
                                                    <td className="py-3 px-4">
                                                        <p className="font-medium text-toss-gray-900">{u.name}</p>
                                                        {u.rank && <p className="text-xs text-toss-gray-500">{u.rank}</p>}
                                                    </td>
                                                    <td className="py-3 px-4 text-toss-gray-600">{u.team || '-'}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        {isEditing ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={editTotalDays}
                                                                    onChange={(e) => setEditTotalDays(e.target.value)}
                                                                    step="0.5"
                                                                    min="0"
                                                                    className="w-16 px-2 py-1 text-center bg-white border border-toss-gray-300 rounded-lg text-sm"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleSaveTotalDays(u.user_id)} disabled={isSaving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                    {isSaving ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                                                                </button>
                                                                <button onClick={() => setEditingUserId(null)} disabled={isSaving} className="p-1 text-toss-gray-500 hover:bg-toss-gray-100 rounded"><X size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => handleEditStart(u.user_id, total)} className="inline-flex items-center gap-1 text-toss-gray-900 hover:text-purple-600 transition-colors group">
                                                                {total}일<Edit3 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-purple-600 font-medium">{used}일</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`font-bold ${remaining <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>{remaining}일</span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {filteredUsers.length === 0 && (
                                <div className="py-12 text-center text-toss-gray-500">검색 결과가 없습니다</div>
                            )}
                        </Card>
                    )}
                </>
            )}

            {/* 기안서 상세보기 모달 */}
            {selectedDoc && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-toss-gray-900">기안서 상세</h2>
                                <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-toss-gray-100 rounded-lg"><X size={20} className="text-toss-gray-500" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    {getDocStatusBadge(selectedDoc.status)}
                                    {selectedDoc.document_labels && (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: selectedDoc.document_labels.color + '20', color: selectedDoc.document_labels.color }}>
                                            {selectedDoc.document_labels.name}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">기안자</p>
                                    <p className="font-bold text-toss-gray-900">{selectedDoc.userInfo?.name}{selectedDoc.userInfo?.rank && <span className="font-normal text-toss-gray-500 ml-1">{selectedDoc.userInfo.rank}</span>}</p>
                                    {selectedDoc.userInfo?.team && <p className="text-sm text-toss-gray-500">{selectedDoc.userInfo.team}</p>}
                                </div>
                                {selectedDoc.doc_number && <div><p className="text-sm text-toss-gray-500 mb-1">기안번호</p><p className="font-medium text-toss-gray-900">{selectedDoc.doc_number}</p></div>}
                                <div><p className="text-sm text-toss-gray-500 mb-1">제목</p><p className="font-bold text-toss-gray-900 text-lg">{selectedDoc.title}</p></div>
                                <div><p className="text-sm text-toss-gray-500 mb-1">내용</p><p className="text-toss-gray-900 whitespace-pre-wrap">{selectedDoc.content || '(내용 없음)'}</p></div>
                                {/* 산출내역 표시 */}
                                {selectedDoc.expense_items && selectedDoc.expense_items.length > 0 && (
                                    <div>
                                        <p className="text-sm text-toss-gray-500 mb-2">산출내역</p>
                                        <div className="overflow-x-auto border border-toss-gray-200 rounded-lg">
                                            <table className="w-full text-sm">
                                                <thead className="bg-toss-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-medium text-toss-gray-700">적요</th>
                                                        <th className="px-3 py-2 text-left font-medium text-toss-gray-700">사업종류</th>
                                                        <th className="px-3 py-2 text-left font-medium text-toss-gray-700">거래처</th>
                                                        <th className="px-3 py-2 text-right font-medium text-toss-gray-700">금액</th>
                                                        <th className="px-3 py-2 text-left font-medium text-toss-gray-700">비고</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedDoc.expense_items.map((item, idx) => (
                                                        <tr key={idx} className="border-t border-toss-gray-100">
                                                            <td className="px-3 py-2">{item.item}</td>
                                                            <td className="px-3 py-2">{item.category}</td>
                                                            <td className="px-3 py-2">{item.vendor}</td>
                                                            <td className="px-3 py-2 text-right">{Number(item.amount).toLocaleString()}원</td>
                                                            <td className="px-3 py-2">{item.note}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="border-t-2 border-toss-gray-300 bg-toss-gray-50 font-medium">
                                                        <td colSpan={3} className="px-3 py-2 text-right">총 합계</td>
                                                        <td className="px-3 py-2 text-right text-indigo-600">{selectedDoc.expense_items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString()}원</td>
                                                        <td></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                {selectedDoc.extra_work_hours > 0 && (
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-toss-blue font-medium">추가근무: {selectedDoc.extra_work_hours}시간 (대체휴무 {(selectedDoc.extra_work_hours / 8).toFixed(1)}일)</p>
                                    </div>
                                )}

                                {/* 휴가 정보 */}
                                {selectedDoc.attendance_type === 'leave' && selectedDoc.leave_type && (
                                    <div className="p-3 bg-emerald-50 rounded-lg">
                                        <p className="text-sm text-emerald-700 font-medium mb-1">
                                            {LEAVE_TYPES[selectedDoc.leave_type]?.label || selectedDoc.leave_type} 신청
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
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm text-toss-gray-500 flex items-center gap-1">
                                                <Paperclip size={14} />
                                                첨부파일 ({selectedDoc.attachments.length}개)
                                            </p>
                                            <button
                                                onClick={() => handleDownloadAll(selectedDoc.attachments)}
                                                className="flex items-center gap-1 text-xs text-toss-blue hover:underline"
                                            >
                                                <Download size={12} />
                                                모두 다운로드
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {/* 이미지 파일 그리드 */}
                                            {selectedDoc.attachments.filter(f => isImageFile(f.name)).length > 0 && (
                                                <div className="grid grid-cols-4 gap-2 mb-2">
                                                    {selectedDoc.attachments.filter(f => isImageFile(f.name)).map((file, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => openGallery(selectedDoc.attachments, idx)}
                                                            className="aspect-square rounded-lg overflow-hidden border border-toss-gray-200 hover:border-toss-blue transition-colors relative group"
                                                        >
                                                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Image size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {/* 기타 파일 목록 */}
                                            {selectedDoc.attachments.filter(f => !isImageFile(f.name)).map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-toss-gray-50 rounded-lg">
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm text-toss-gray-700 hover:text-toss-blue transition-colors flex-1 min-w-0"
                                                    >
                                                        <FileText size={16} className="flex-shrink-0" />
                                                        <span className="truncate">{file.name}</span>
                                                        <ExternalLink size={12} className="flex-shrink-0" />
                                                    </a>
                                                    <button
                                                        onClick={() => handleDownloadFile(file)}
                                                        className="p-1.5 text-toss-gray-500 hover:text-toss-blue hover:bg-toss-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedDoc.status === 'rejected' && selectedDoc.rejected_reason && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-600 font-medium mb-1">반려 사유</p>
                                        <p className="text-red-700">{selectedDoc.rejected_reason}</p>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-toss-gray-200">
                                    <div className="flex items-center gap-1 text-sm text-toss-gray-500"><Clock size={14} />{new Date(selectedDoc.created_at).toLocaleString('ko-KR')} 작성</div>
                                    {selectedDoc.approved_at && <div className="flex items-center gap-1 text-sm text-toss-gray-500 mt-1"><Clock size={14} />{new Date(selectedDoc.approved_at).toLocaleString('ko-KR')} 결재</div>}
                                </div>
                            </div>
                            <div className="mt-6 flex gap-2">
                                {selectedDoc.status === 'approved' && (
                                    <Button onClick={() => {
                                        const totalAmt = getDocumentTotalAmount(selectedDoc)
                                        const directorName = totalAmt >= 1000000 ? '권태일' : ''
                                        generateDocumentPdf(selectedDoc, selectedDoc.userInfo, '이정숙', directorName)
                                    }} className="flex-1">
                                        <FileText size={16} className="mr-1" />PDF 다운로드
                                    </Button>
                                )}
                                <Button onClick={() => setSelectedDoc(null)} variant="secondary" className={selectedDoc.status === 'approved' ? 'flex-1' : 'w-full'}>닫기</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 연차 상세보기 모달 */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-toss-gray-900">연차 상세</h2>
                                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-toss-gray-100 rounded-lg"><X size={20} className="text-toss-gray-500" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">{getLeaveStatusBadge(selectedRequest.status)}</div>
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">신청자</p>
                                    <p className="font-bold text-toss-gray-900">{selectedRequest.userInfo?.name}{selectedRequest.userInfo?.rank && <span className="font-normal text-toss-gray-500 ml-1">{selectedRequest.userInfo.rank}</span>}</p>
                                    {selectedRequest.userInfo?.team && <p className="text-sm text-toss-gray-500">{selectedRequest.userInfo.team}</p>}
                                </div>
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">연차 유형</p>
                                    <p className="font-medium text-toss-gray-900">{LEAVE_TYPES[selectedRequest.leave_type]?.label || selectedRequest.leave_type}<span className="text-purple-600 ml-2">({selectedRequest.days}일)</span></p>
                                </div>
                                <div>
                                    <p className="text-sm text-toss-gray-500 mb-1">기간</p>
                                    <p className="font-medium text-toss-gray-900">{formatDate(selectedRequest.start_date)}{selectedRequest.start_date !== selectedRequest.end_date && <> ~ {formatDate(selectedRequest.end_date)}</>}</p>
                                </div>
                                {selectedRequest.reason && <div><p className="text-sm text-toss-gray-500 mb-1">사유</p><p className="text-toss-gray-900 whitespace-pre-wrap">{selectedRequest.reason}</p></div>}
                                {selectedRequest.status === 'rejected' && selectedRequest.rejected_reason && (
                                    <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm text-red-600 font-medium mb-1">반려 사유</p>
                                        <p className="text-red-700">{selectedRequest.rejected_reason}</p>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-toss-gray-200">
                                    <div className="flex items-center gap-1 text-sm text-toss-gray-500"><Clock size={14} />{new Date(selectedRequest.created_at).toLocaleString('ko-KR')} 신청</div>
                                    {selectedRequest.updated_at && selectedRequest.status !== 'pending' && <div className="flex items-center gap-1 text-sm text-toss-gray-500 mt-1"><Clock size={14} />{new Date(selectedRequest.updated_at).toLocaleString('ko-KR')} 처리</div>}
                                </div>
                            </div>
                            <div className="mt-6 flex gap-2">
                                {selectedRequest.status === 'approved' && (
                                    <Button onClick={() => generateLeaveDocumentPdf(selectedRequest, selectedRequest.userInfo)} className="flex-1">
                                        <FileText size={16} className="mr-1" />PDF 다운로드
                                    </Button>
                                )}
                                <Button onClick={() => setSelectedRequest(null)} variant="secondary" className="flex-1">닫기</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 이미지 갤러리 모달 */}
            {galleryOpen && galleryImages.length > 0 && (
                <div
                    className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center"
                    onClick={() => setGalleryOpen(false)}
                >
                    {/* 닫기 버튼 */}
                    <button
                        onClick={() => setGalleryOpen(false)}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <X size={28} />
                    </button>

                    {/* 다운로드 버튼 */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadFile(galleryImages[currentImageIndex])
                        }}
                        className="absolute top-4 right-16 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                    >
                        <Download size={24} />
                    </button>

                    {/* 이전 버튼 */}
                    {galleryImages.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setCurrentImageIndex(prev => prev === 0 ? galleryImages.length - 1 : prev - 1)
                            }}
                            className="absolute left-4 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    {/* 이미지 */}
                    <div className="max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={galleryImages[currentImageIndex].url}
                            alt={galleryImages[currentImageIndex].name}
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                    </div>

                    {/* 다음 버튼 */}
                    {galleryImages.length > 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setCurrentImageIndex(prev => prev === galleryImages.length - 1 ? 0 : prev + 1)
                            }}
                            className="absolute right-4 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ChevronRight size={32} />
                        </button>
                    )}

                    {/* 이미지 카운터 */}
                    {galleryImages.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
                            {currentImageIndex + 1} / {galleryImages.length}
                        </div>
                    )}

                    {/* 파일명 */}
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 rounded-lg text-white/80 text-sm">
                        {galleryImages[currentImageIndex].name}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminPage
