import { useState, useEffect, useMemo } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, Check, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Settings } from 'lucide-react'
import { useLeave } from '../hooks/useLeave'

// 휴가 유형 정보
const LEAVE_TYPES = {
  full: { label: '연차', days: 1 },
  half_am: { label: '오전 반차', days: 0.5 },
  half_pm: { label: '오후 반차', days: 0.5 },
  out_1h: { label: '외출/조퇴 1시간', days: 0.125 },
  out_2h: { label: '외출/조퇴 2시간', days: 0.25 },
  out_3h: { label: '외출/조퇴 3시간', days: 0.375 },
  comp: { label: '대체휴무', days: 1 }
}

const LeavePage = () => {
  const {
    annualLeave,
    compLeave,
    myRequests,
    myOvertimeRequests,
    allRequests,
    allOvertimeRequests,
    allAnnualLeaves,
    allUsers,
    documentLeaves,
    loading,
    canManage,
    currentYear,
    createRequest,
    cancelRequest,
    createOvertimeRequest,
    cancelOvertimeRequest,
    approveRequest,
    rejectRequest,
    approveOvertimeRequest,
    rejectOvertimeRequest,
    updateUserLeave,
    fetchApprovedLeaves,
    fetchAllRequests,
    fetchAllOvertimeRequests,
    fetchAllAnnualLeaves,
    fetchDocumentLeaves,
    approveDocumentLeave,
    rejectDocumentLeave,
  } = useLeave()

  // 탭 상태
  const [activeTab, setActiveTab] = useState('my') // 'my', 'calendar', 'manage', 'settings'

  // 신청 모달
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestType, setRequestType] = useState('leave') // 'overtime' | 'leave'
  const [requestForm, setRequestForm] = useState({
    leave_type: 'full',
    start_date: '',
    end_date: '',
    reason: '',
  })
  const [overtimeForm, setOvertimeForm] = useState({
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    reason: '',
  })

  // 반려 모달
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  // 연차 수정 모달
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editDays, setEditDays] = useState(15)

  // 캘린더 상태
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarLeaves, setCalendarLeaves] = useState([])

  // 관리자 필터
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')

  // 잔여 연차/대체휴무 계산
  const remainingLeave = (annualLeave?.total_days || 15) - (annualLeave?.used_days || 0)
  const remainingComp = compLeave ? Math.floor((compLeave.total_hours - compLeave.used_hours) / 8) : 0

  // 사용자 맵 생성
  const userMap = useMemo(() => {
    const map = {}
    allUsers.forEach(u => { map[u.id] = u })
    return map
  }, [allUsers])

  // 사용 일수 계산
  const calculateDays = (type, startDate, endDate) => {
    if (!startDate) return 0

    // 반차/외출/조퇴는 고정 일수
    if (LEAVE_TYPES[type] && type !== 'full' && type !== 'comp') {
      return LEAVE_TYPES[type].days
    }

    // 연차/대체휴무는 날짜 범위로 계산
    if (!endDate) return 1
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  // 연차 신청 처리
  const handleCreateRequest = async () => {
    if (!requestForm.start_date) {
      alert('날짜를 선택해주세요.')
      return
    }

    const days = calculateDays(
      requestForm.leave_type,
      requestForm.start_date,
      ['full', 'comp'].includes(requestForm.leave_type) ? requestForm.end_date : requestForm.start_date
    )

    // 연차 부족 체크 (대체휴무 제외)
    if (requestForm.leave_type !== 'comp' && days > remainingLeave) {
      alert(`잔여 연차가 부족합니다. (잔여: ${remainingLeave}일)`)
      return
    }

    const result = await createRequest({
      ...requestForm,
      end_date: ['full', 'comp'].includes(requestForm.leave_type) ? (requestForm.end_date || requestForm.start_date) : requestForm.start_date,
      days,
    })

    if (result.success) {
      setIsRequestModalOpen(false)
      setRequestForm({ leave_type: 'full', start_date: '', end_date: '', reason: '' })
      setRequestType('leave')
      alert('신청이 완료되었습니다.')
    } else {
      alert('신청 실패: ' + result.error)
    }
  }

  // 추가근무 신청 처리
  const handleCreateOvertimeRequest = async () => {
    if (!overtimeForm.start_date || !overtimeForm.start_time) {
      alert('시작 날짜와 시간을 선택해주세요.')
      return
    }
    if (!overtimeForm.end_date || !overtimeForm.end_time) {
      alert('종료 날짜와 시간을 선택해주세요.')
      return
    }
    if (!overtimeForm.reason.trim()) {
      alert('사유를 입력해주세요.')
      return
    }

    const startDatetime = `${overtimeForm.start_date}T${overtimeForm.start_time}:00`
    const endDatetime = `${overtimeForm.end_date}T${overtimeForm.end_time}:00`

    // 종료 시간이 시작 시간보다 이전인지 체크
    if (new Date(endDatetime) <= new Date(startDatetime)) {
      alert('종료 시간은 시작 시간 이후여야 합니다.')
      return
    }

    const result = await createOvertimeRequest({
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      reason: overtimeForm.reason,
    })

    if (result.success) {
      setIsRequestModalOpen(false)
      setOvertimeForm({ start_date: '', start_time: '', end_date: '', end_time: '', reason: '' })
      setRequestType('leave')
      alert('추가근무 신청이 완료되었습니다.')
    } else {
      alert('신청 실패: ' + result.error)
    }
  }

  // 추가근무 취소
  const handleCancelOvertimeRequest = async (id) => {
    if (!confirm('신청을 취소하시겠습니까?')) return
    const result = await cancelOvertimeRequest(id)
    if (!result.success) {
      alert('취소 실패: ' + result.error)
    }
  }

  // 추가근무 승인
  const handleApproveOvertime = async (id) => {
    const result = await approveOvertimeRequest(id)
    if (!result.success) {
      alert('승인 실패: ' + result.error)
    }
  }

  // 연차 취소
  const handleCancelRequest = async (id) => {
    if (!confirm('신청을 취소하시겠습니까?')) return
    const result = await cancelRequest(id)
    if (!result.success) {
      alert('취소 실패: ' + result.error)
    }
  }

  // 연차 승인
  const handleApprove = async (id) => {
    const result = await approveRequest(id)
    if (!result.success) {
      alert('승인 실패: ' + result.error)
    }
  }

  // 연차/추가근무 반려
  const handleReject = async () => {
    if (!rejectTarget) return

    let result
    if (rejectTarget.isDocument) {
      result = await rejectDocumentLeave(rejectTarget.id, rejectReason)
    } else if (rejectTarget.isOvertime) {
      result = await rejectOvertimeRequest(rejectTarget.id, rejectReason)
    } else {
      result = await rejectRequest(rejectTarget.id, rejectReason)
    }

    if (result.success) {
      setIsRejectModalOpen(false)
      setRejectTarget(null)
      setRejectReason('')
    } else {
      alert('반려 실패: ' + result.error)
    }
  }

  // 기안서 근태 승인
  const handleApproveDocument = async (id) => {
    const result = await approveDocumentLeave(id)
    if (!result.success) {
      alert('승인 실패: ' + result.error)
    }
  }

  // 연차 수정 저장
  const handleUpdateLeave = async () => {
    if (!editTarget) return
    const result = await updateUserLeave(editTarget.id, parseFloat(editDays))
    if (result.success) {
      setEditTarget(null)
    } else {
      alert('수정 실패: ' + result.error)
    }
  }

  // 캘린더 데이터 로드
  useEffect(() => {
    const loadCalendarLeaves = async () => {
      const leaves = await fetchApprovedLeaves(
        calendarDate.getFullYear(),
        calendarDate.getMonth()
      )
      setCalendarLeaves(leaves)
    }
    loadCalendarLeaves()
  }, [calendarDate, fetchApprovedLeaves])

  // 필터 변경 시 다시 조회
  useEffect(() => {
    if (canManage && activeTab === 'manage') {
      fetchAllRequests(statusFilter === 'all' ? null : statusFilter)
      fetchAllOvertimeRequests(statusFilter === 'all' ? null : statusFilter)
      fetchDocumentLeaves(statusFilter === 'all' ? null : statusFilter)
    }
  }, [statusFilter, activeTab, canManage, fetchAllRequests, fetchAllOvertimeRequests, fetchDocumentLeaves])

  // 연차 설정 탭 진입 시 데이터 로드
  useEffect(() => {
    if (canManage && activeTab === 'settings') {
      fetchAllAnnualLeaves()
    }
  }, [activeTab, canManage, fetchAllAnnualLeaves])

  // 상태 라벨
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return { text: '대기중', color: 'bg-yellow-100 text-yellow-700' }
      case 'approved': return { text: '승인', color: 'bg-green-100 text-green-700' }
      case 'rejected': return { text: '반려', color: 'bg-red-100 text-red-700' }
      default: return { text: status, color: 'bg-gray-100 text-gray-700' }
    }
  }

  // 연차 유형 라벨
  const getTypeLabel = (type) => {
    return LEAVE_TYPES[type]?.label || type
  }

  // 캘린더 렌더링
  const renderCalendar = () => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()

    const days = []
    const weeks = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let d = 1; d <= lastDate; d++) {
      days.push(d)
    }

    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }

    const getLeavesForDay = (day) => {
      if (!day) return []
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return calendarLeaves.filter(leave => {
        return dateStr >= leave.start_date && dateStr <= leave.end_date
      })
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
            className="p-2 hover:bg-toss-gray-100 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-bold text-toss-gray-900">
            {year}년 {month + 1}월
          </h3>
          <button
            onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
            className="p-2 hover:bg-toss-gray-100 rounded-full"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="border border-toss-gray-200 rounded-toss overflow-hidden">
          <div className="grid grid-cols-7 bg-toss-gray-50">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div
                key={day}
                className={`p-2 text-center text-sm font-medium ${
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-toss-gray-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="divide-y divide-toss-gray-100">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x divide-toss-gray-100">
                {week.map((day, di) => {
                  const leaves = getLeavesForDay(day)
                  const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString()
                  return (
                    <div
                      key={di}
                      className={`min-h-[80px] p-1 ${!day ? 'bg-toss-gray-50' : ''}`}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${
                            di === 0 ? 'text-red-500' : di === 6 ? 'text-blue-500' : 'text-toss-gray-700'
                          } ${isToday ? 'bg-toss-blue text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {leaves.slice(0, 3).map((leave, li) => (
                              <div
                                key={li}
                                className={`text-xs px-1 py-0.5 rounded truncate ${
                                  leave.leave_type === 'full' ? 'bg-toss-blue/10 text-toss-blue' :
                                  leave.leave_type === 'half_am' || leave.leave_type === 'am' ? 'bg-orange-100 text-orange-700' :
                                  'bg-purple-100 text-purple-700'
                                }`}
                                title={`${leave.user?.name} ${getTypeLabel(leave.leave_type)}`}
                              >
                                {leave.user?.name}
                              </div>
                            ))}
                            {leaves.length > 3 && (
                              <div className="text-xs text-toss-gray-400">
                                +{leaves.length - 3}명
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 통합 신청 목록 (leave_requests + overtime_requests + 기안서)
  const getCombinedRequests = () => {
    // leave_requests 테이블 데이터
    const leaveRequestItems = allRequests.map(r => {
      const user = userMap[r.user_id]
      return {
        ...r,
        _source: 'leave_requests',
        _type: 'leave',
        _sortDate: new Date(r.created_at),
        _name: user?.name || '알 수 없음',
        _team: user?.team,
        _position: user?.position,
      }
    })

    // overtime_requests 테이블 데이터
    const overtimeRequestItems = allOvertimeRequests.map(r => {
      const user = userMap[r.user_id]
      const startDt = new Date(r.start_datetime)
      const endDt = new Date(r.end_datetime)
      const diffHours = (endDt - startDt) / (1000 * 60 * 60)
      const hours = Math.floor(diffHours)
      const minutes = Math.round((diffHours - hours) * 60)

      return {
        ...r,
        _source: 'overtime_requests',
        _type: 'overtime',
        _sortDate: new Date(r.created_at),
        _name: user?.name || '알 수 없음',
        _team: user?.team,
        _position: user?.position,
        _overtimeHours: minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`,
        _startDt: startDt,
        _endDt: endDt,
      }
    })

    // 기안서 근태 데이터
    const docRequestItems = documentLeaves.map(d => ({
      ...d,
      _source: 'document',
      _type: 'leave',
      _sortDate: new Date(d.created_at),
      _name: d.drafter?.name,
      _team: d.drafter?.team,
      _position: d.drafter?.position,
      leave_type: d.leave_type,
      days: d.leave_days,
      start_date: d.leave_start_date,
      end_date: d.leave_end_date,
      reason: d.content || d.title,
    }))

    return [...leaveRequestItems, ...overtimeRequestItems, ...docRequestItems].sort((a, b) => b._sortDate - a._sortDate)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-toss-gray-900">근태 관리</h1>
          <p className="text-toss-gray-500 mt-1">{currentYear}년</p>
        </div>
        {activeTab === 'my' && (
          <Button onClick={() => setIsRequestModalOpen(true)}>
            <Plus size={18} />
            신청
          </Button>
        )}
      </div>

      {/* 내 연차 현황 */}
      {activeTab === 'my' && annualLeave && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <p className="text-sm text-toss-gray-500 mb-1">총 연차</p>
            <p className="text-2xl font-bold text-toss-gray-900">{annualLeave.total_days}일</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-toss-gray-500 mb-1">사용</p>
            <p className="text-2xl font-bold text-toss-blue">{annualLeave.used_days}일</p>
          </Card>
          <Card className="text-center">
            <p className="text-sm text-toss-gray-500 mb-1">잔여</p>
            <p className="text-2xl font-bold text-green-600">
              {annualLeave.total_days - annualLeave.used_days}일
            </p>
          </Card>
        </div>
      )}

      {/* 탭 */}
      <div className="flex items-center gap-2 border-b border-toss-gray-200">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'my' ? 'text-toss-blue' : 'text-toss-gray-500 hover:text-toss-gray-700'
          }`}
        >
          <Clock size={16} className="inline mr-1" />
          내 근태
          {activeTab === 'my' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-blue" />}
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'calendar' ? 'text-toss-blue' : 'text-toss-gray-500 hover:text-toss-gray-700'
          }`}
        >
          <CalendarIcon size={16} className="inline mr-1" />
          캘린더
          {activeTab === 'calendar' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-blue" />}
        </button>
        {canManage && (
          <>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'manage' ? 'text-toss-blue' : 'text-toss-gray-500 hover:text-toss-gray-700'
              }`}
            >
              <Users size={16} className="inline mr-1" />
              승인 관리
              {activeTab === 'manage' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-blue" />}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                activeTab === 'settings' ? 'text-toss-blue' : 'text-toss-gray-500 hover:text-toss-gray-700'
              }`}
            >
              <Settings size={16} className="inline mr-1" />
              연차 설정
              {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-blue" />}
            </button>
          </>
        )}
      </div>

      {/* 내 근태 탭 */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {/* 휴가 신청 내역 */}
          <Card padding="p-0">
            <div className="p-4 border-b border-toss-gray-100">
              <h3 className="font-medium text-toss-gray-900">휴가 신청 내역</h3>
            </div>
            {myRequests.length > 0 ? (
              <div className="divide-y divide-toss-gray-100">
                {myRequests.map((request) => {
                  const status = getStatusLabel(request.status)
                  return (
                    <div key={request.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                            <span className="text-sm font-medium text-toss-gray-900">
                              {getTypeLabel(request.leave_type)}
                            </span>
                            <span className="text-sm text-toss-gray-500">
                              {request.days}일
                            </span>
                          </div>
                          <p className="text-sm text-toss-gray-700">
                            {request.start_date === request.end_date
                              ? request.start_date
                              : `${request.start_date} ~ ${request.end_date}`}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-toss-gray-500 mt-1">{request.reason}</p>
                          )}
                          {request.status === 'rejected' && request.rejected_reason && (
                            <p className="text-sm text-red-500 mt-1">반려 사유: {request.rejected_reason}</p>
                          )}
                        </div>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request.id)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-toss-gray-400">
                휴가 신청 내역이 없습니다
              </div>
            )}
          </Card>

          {/* 추가근무 신청 내역 */}
          <Card padding="p-0">
            <div className="p-4 border-b border-toss-gray-100">
              <h3 className="font-medium text-toss-gray-900">추가근무 신청 내역</h3>
            </div>
            {myOvertimeRequests.length > 0 ? (
              <div className="divide-y divide-toss-gray-100">
                {myOvertimeRequests.map((request) => {
                  const status = getStatusLabel(request.status)
                  const startDt = new Date(request.start_datetime)
                  const endDt = new Date(request.end_datetime)
                  const diffHours = (endDt - startDt) / (1000 * 60 * 60)
                  const hours = Math.floor(diffHours)
                  const minutes = Math.round((diffHours - hours) * 60)

                  return (
                    <div key={request.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                            <span className="text-sm font-medium text-toss-gray-900">
                              추가근무
                            </span>
                            <span className="text-sm text-toss-gray-500">
                              {minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`}
                            </span>
                          </div>
                          <p className="text-sm text-toss-gray-700">
                            {startDt.toLocaleDateString('ko-KR')} {startDt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~{' '}
                            {endDt.toLocaleDateString('ko-KR')} {endDt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-toss-gray-500 mt-1">{request.reason}</p>
                          )}
                          {request.status === 'rejected' && request.rejected_reason && (
                            <p className="text-sm text-red-500 mt-1">반려 사유: {request.rejected_reason}</p>
                          )}
                        </div>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelOvertimeRequest(request.id)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-toss-gray-400">
                추가근무 신청 내역이 없습니다
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 캘린더 탭 */}
      {activeTab === 'calendar' && (
        <Card>
          {renderCalendar()}
        </Card>
      )}

      {/* 승인 관리 탭 */}
      {activeTab === 'manage' && canManage && (
        <>
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-toss-blue text-white'
                    : 'bg-toss-gray-100 text-toss-gray-600 hover:bg-toss-gray-200'
                }`}
              >
                {status === 'pending' ? '대기중' : status === 'approved' ? '승인' : status === 'rejected' ? '반려' : '전체'}
              </button>
            ))}
          </div>

          <Card padding="p-0">
            {getCombinedRequests().length > 0 ? (
              <div className="divide-y divide-toss-gray-100">
                {getCombinedRequests().map((item) => {
                  const status = getStatusLabel(item.status)
                  const isDocument = item._source === 'document'
                  const isOvertime = item._source === 'overtime_requests'

                  return (
                    <div key={`${item._source}-${item.id}`} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-toss-gray-900">
                              {item._name}
                            </span>
                            <span className="text-sm text-toss-gray-500">
                              {item._team} {item._position}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.text}
                            </span>
                            {isDocument && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                기안서
                              </span>
                            )}
                            {isOvertime && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                추가근무
                              </span>
                            )}
                          </div>
                          {isOvertime ? (
                            <>
                              <p className="text-sm text-toss-gray-700">
                                추가근무 {item._overtimeHours} ·{' '}
                                {item._startDt.toLocaleDateString('ko-KR')} {item._startDt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~{' '}
                                {item._endDt.toLocaleDateString('ko-KR')} {item._endDt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-toss-gray-700">
                              {getTypeLabel(item.leave_type)} {item.days}일 ·{' '}
                              {item.start_date === item.end_date
                                ? item.start_date
                                : `${item.start_date} ~ ${item.end_date}`}
                            </p>
                          )}
                          {item.reason && (
                            <p className="text-sm text-toss-gray-500 mt-1">{item.reason}</p>
                          )}
                          {item.status === 'rejected' && item.rejected_reason && (
                            <p className="text-sm text-red-500 mt-1">반려 사유: {item.rejected_reason}</p>
                          )}
                        </div>
                        {item.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (isDocument) handleApproveDocument(item.id)
                                else if (isOvertime) handleApproveOvertime(item.id)
                                else handleApprove(item.id)
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setRejectTarget({
                                  ...item,
                                  isDocument,
                                  isOvertime
                                })
                                setIsRejectModalOpen(true)
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-toss-gray-400">
                            {item.approved_at && new Date(item.approved_at).toLocaleDateString('ko-KR')}
                            {item.updated_at && !item.approved_at && new Date(item.updated_at).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-toss-gray-400">
                해당하는 신청이 없습니다
              </div>
            )}
          </Card>
        </>
      )}

      {/* 연차 설정 탭 */}
      {activeTab === 'settings' && canManage && (
        <Card padding="p-0">
          <div className="p-4 border-b border-toss-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-toss-gray-500" />
              <h3 className="font-medium text-toss-gray-900">직원별 연차 현황</h3>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="이름 또는 팀으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-toss-gray-100 border-0 rounded-toss text-sm focus:ring-2 focus:ring-toss-blue w-56"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-toss-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-toss-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-toss-gray-500 uppercase tracking-wider">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-toss-gray-500 uppercase tracking-wider">팀</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-toss-gray-500 uppercase tracking-wider">총 연차</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-toss-gray-500 uppercase tracking-wider">사용</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-toss-gray-500 uppercase tracking-wider">잔여</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-gray-100">
                {allUsers
                  .filter(user => {
                    if (!searchQuery) return true
                    const query = searchQuery.toLowerCase()
                    return user.name?.toLowerCase().includes(query) || user.team?.toLowerCase().includes(query)
                  })
                  .map((user) => {
                    const leave = allAnnualLeaves.find(l => l.user_id === user.id)
                    const total = leave?.total_days ?? 15
                    const used = leave?.used_days ?? 0
                    const remaining = total - used
                    const isEditing = editTarget?.id === user.id

                    return (
                      <tr key={user.id} className="hover:bg-toss-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-toss-gray-900">{user.name}</p>
                        </td>
                        <td className="px-6 py-3 text-sm text-toss-gray-700">{user.team || '-'}</td>
                        <td className="px-6 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editDays}
                              onChange={(e) => setEditDays(e.target.value)}
                              onBlur={async () => {
                                await handleUpdateLeave()
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  await handleUpdateLeave()
                                } else if (e.key === 'Escape') {
                                  setEditTarget(null)
                                }
                              }}
                              min={0}
                              step={0.5}
                              className="w-16 px-2 py-1 text-center bg-white border border-toss-blue rounded text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditTarget(user)
                                setEditDays(total)
                              }}
                              className="cursor-pointer hover:text-toss-blue font-medium"
                            >
                              {total}일
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center text-sm text-toss-blue font-medium">{used}일</td>
                        <td className="px-6 py-3 text-center text-sm text-green-600 font-bold">{remaining}일</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 근태 신청 모달 */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false)
          setRequestType('leave')
          setRequestForm({ leave_type: 'full', start_date: '', end_date: '', reason: '' })
        }}
        title="근태 신청"
        size="lg"
      >
        <div className="space-y-6">
          {/* 신청 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
              신청 유형 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRequestType('overtime')}
                className={`p-4 rounded-toss border-2 text-left transition-all ${
                  requestType === 'overtime'
                    ? 'border-toss-blue bg-toss-blue/5'
                    : 'border-toss-gray-200 hover:border-toss-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={20} className={requestType === 'overtime' ? 'text-toss-blue' : 'text-toss-gray-400'} />
                  <span className={`font-medium ${requestType === 'overtime' ? 'text-toss-blue' : 'text-toss-gray-700'}`}>
                    추가근무 신청
                  </span>
                </div>
                <p className="text-xs text-toss-gray-500">야근, 주말근무 등</p>
              </button>
              <button
                onClick={() => setRequestType('leave')}
                className={`p-4 rounded-toss border-2 text-left transition-all ${
                  requestType === 'leave'
                    ? 'border-toss-blue bg-toss-blue/5'
                    : 'border-toss-gray-200 hover:border-toss-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CalendarIcon size={20} className={requestType === 'leave' ? 'text-toss-blue' : 'text-toss-gray-400'} />
                  <span className={`font-medium ${requestType === 'leave' ? 'text-toss-blue' : 'text-toss-gray-700'}`}>
                    휴가 신청
                  </span>
                </div>
                <p className="text-xs text-toss-gray-500">연차, 반차, 대체휴무</p>
              </button>
            </div>
          </div>

          {/* 휴가 신청 폼 */}
          {requestType === 'leave' && (
            <>
              {/* 잔여 연차 표시 */}
              <div className="flex gap-4 p-3 bg-toss-gray-50 rounded-toss">
                <div>
                  <span className="text-sm text-toss-gray-500">잔여 연차: </span>
                  <span className="font-bold text-toss-blue">{remainingLeave}일</span>
                </div>
                <div>
                  <span className="text-sm text-toss-gray-500">남은 대체휴무: </span>
                  <span className="font-bold text-toss-gray-700">{remainingComp}일</span>
                </div>
              </div>

              {/* 휴가 유형 */}
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  휴가 유형 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(LEAVE_TYPES).map(([key, value]) => {
                    const isDisabled = key === 'comp' && remainingComp === 0
                    return (
                      <button
                        key={key}
                        onClick={() => !isDisabled && setRequestForm({ ...requestForm, leave_type: key })}
                        disabled={isDisabled}
                        className={`p-3 rounded-toss border text-left transition-all ${
                          requestForm.leave_type === key
                            ? 'border-toss-blue bg-toss-blue/5'
                            : isDisabled
                            ? 'border-toss-gray-100 bg-toss-gray-50 cursor-not-allowed'
                            : 'border-toss-gray-200 hover:border-toss-gray-300'
                        }`}
                      >
                        <p className={`font-medium text-sm ${
                          requestForm.leave_type === key ? 'text-toss-blue' :
                          isDisabled ? 'text-toss-gray-400' : 'text-toss-gray-700'
                        }`}>
                          {value.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDisabled ? 'text-toss-gray-300' : 'text-toss-gray-500'}`}>
                          {key === 'comp' && isDisabled ? '사용 불가' : `${value.days}일 차감`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 날짜 선택 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                    {['full', 'comp'].includes(requestForm.leave_type) ? '시작일' : '날짜'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={requestForm.start_date}
                    onChange={(e) => setRequestForm({ ...requestForm, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  />
                </div>
                {['full', 'comp'].includes(requestForm.leave_type) && (
                  <div>
                    <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={requestForm.end_date}
                      onChange={(e) => setRequestForm({ ...requestForm, end_date: e.target.value })}
                      min={requestForm.start_date}
                      className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                    />
                  </div>
                )}
              </div>

              {/* 사유 */}
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  사유 (선택)
                </label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue resize-none"
                  placeholder="사유를 입력하세요"
                />
              </div>

              {/* 사용 일수 표시 */}
              {requestForm.start_date && (
                <div className="p-3 bg-toss-blue/5 rounded-toss border border-toss-blue/20">
                  <p className="text-sm text-toss-gray-700">
                    사용 일수:{' '}
                    <span className="font-bold text-toss-blue">
                      {calculateDays(
                        requestForm.leave_type,
                        requestForm.start_date,
                        ['full', 'comp'].includes(requestForm.leave_type) ? requestForm.end_date : requestForm.start_date
                      )}일
                    </span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* 추가근무 신청 폼 */}
          {requestType === 'overtime' && (
            <>
              {/* 시작 일시 */}
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  시작 일시 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={overtimeForm.start_date}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  />
                  <input
                    type="time"
                    value={overtimeForm.start_time}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, start_time: e.target.value })}
                    className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  />
                </div>
              </div>

              {/* 종료 일시 */}
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  종료 일시 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={overtimeForm.end_date}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, end_date: e.target.value })}
                    min={overtimeForm.start_date}
                    className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  />
                  <input
                    type="time"
                    value={overtimeForm.end_time}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, end_time: e.target.value })}
                    className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  />
                </div>
              </div>

              {/* 사유 */}
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overtimeForm.reason}
                  onChange={(e) => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue resize-none"
                  placeholder="추가근무 사유를 입력하세요"
                />
              </div>

              {/* 시간 계산 표시 */}
              {overtimeForm.start_date && overtimeForm.start_time && overtimeForm.end_date && overtimeForm.end_time && (
                <div className="p-3 bg-toss-blue/5 rounded-toss border border-toss-blue/20">
                  <p className="text-sm text-toss-gray-700">
                    추가근무 시간:{' '}
                    <span className="font-bold text-toss-blue">
                      {(() => {
                        const start = new Date(`${overtimeForm.start_date}T${overtimeForm.start_time}`)
                        const end = new Date(`${overtimeForm.end_date}T${overtimeForm.end_time}`)
                        const diff = (end - start) / (1000 * 60 * 60)
                        if (diff > 0) {
                          const hours = Math.floor(diff)
                          const minutes = Math.round((diff - hours) * 60)
                          return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`
                        }
                        return '0시간'
                      })()}
                    </span>
                  </p>
                </div>
              )}
            </>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRequestModalOpen(false)
                setRequestType('leave')
                setRequestForm({ leave_type: 'full', start_date: '', end_date: '', reason: '' })
                setOvertimeForm({ start_date: '', start_time: '', end_date: '', end_time: '', reason: '' })
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={requestType === 'overtime' ? handleCreateOvertimeRequest : handleCreateRequest}
              className="flex-1"
              disabled={loading}
            >
              신청하기
            </Button>
          </div>
        </div>
      </Modal>

      {/* 반려 모달 */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false)
          setRejectTarget(null)
          setRejectReason('')
        }}
        title="신청 반려"
      >
        <div className="space-y-4">
          <p className="text-toss-gray-700">
            <span className="font-medium">{rejectTarget?.isDocument ? rejectTarget?.drafter?.name : rejectTarget?._name}</span>님의 신청을 반려합니다.
          </p>
          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
              반려 사유
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue resize-none"
              placeholder="반려 사유를 입력하세요"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRejectModalOpen(false)
                setRejectTarget(null)
                setRejectReason('')
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button variant="danger" onClick={handleReject} className="flex-1" disabled={loading}>
              반려하기
            </Button>
          </div>
        </div>
      </Modal>

      {/* 연차 수정 모달 */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditTarget(null)
        }}
        title="연차 수정"
      >
        <div className="space-y-4">
          <p className="text-toss-gray-700">
            <span className="font-medium">{editTarget?.name}</span>님의 {currentYear}년 연차
          </p>
          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
              총 연차 일수
            </label>
            <input
              type="number"
              value={editDays}
              onChange={(e) => setEditDays(e.target.value)}
              min={0}
              step={0.5}
              className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false)
                setEditTarget(null)
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button onClick={handleUpdateLeave} className="flex-1" disabled={loading}>
              저장
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default LeavePage
