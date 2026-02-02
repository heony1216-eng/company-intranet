import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { LEAVE_TYPE_DAYS, DEFAULT_ANNUAL_LEAVE_DAYS, ATTENDANCE_LABEL_CODE } from '../constants/leave'

export function useLeave() {
  const { user, profile, isAdmin, isSubAdmin } = useAuth()
  const userId = user?.user_id || profile?.id

  const [annualLeave, setAnnualLeave] = useState(null) // 내 연차 정보
  const [compLeave, setCompLeave] = useState(null) // 내 대체휴무 정보
  const [myRequests, setMyRequests] = useState([]) // 내 신청 목록
  const [myOvertimeRequests, setMyOvertimeRequests] = useState([]) // 내 추가근무 신청 목록
  const [allRequests, setAllRequests] = useState([]) // 전체 신청 목록 (관리자)
  const [allOvertimeRequests, setAllOvertimeRequests] = useState([]) // 전체 추가근무 신청 목록 (관리자)
  const [allAnnualLeaves, setAllAnnualLeaves] = useState([]) // 전체 연차 정보 (관리자)
  const [allUsers, setAllUsers] = useState([]) // 전체 사용자 목록
  const [documentLeaves, setDocumentLeaves] = useState([]) // 기안서 근태 데이터
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const currentYear = new Date().getFullYear()
  const canManage = isAdmin || isSubAdmin

  // 내 연차 정보 조회 (없으면 생성) - 실제 사용일은 leave_requests + documents에서 계산
  const fetchAnnualLeave = useCallback(async () => {
    if (!userId) return

    try {
      let { data, error } = await supabase
        .from('annual_leaves')
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .single()

      if (error && error.code === 'PGRST116') {
        // 연차 정보가 없으면 기본값으로 생성
        const { data: newData, error: insertError } = await supabase
          .from('annual_leaves')
          .insert({
            user_id: userId,
            year: currentYear,
            total_days: DEFAULT_ANNUAL_LEAVE_DAYS,
            used_days: 0
          })
          .select()
          .single()

        if (insertError) throw insertError
        data = newData
      } else if (error) {
        throw error
      }

      // 실제 사용일 계산: leave_requests에서 승인된 연차 합계
      const yearStart = `${currentYear}-01-01`
      const yearEnd = `${currentYear}-12-31`
      const { data: approvedRequests } = await supabase
        .from('leave_requests')
        .select('days')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .gte('start_date', yearStart)
        .lte('start_date', yearEnd)
        .neq('leave_type', 'comp')

      let usedDays = (approvedRequests || []).reduce((sum, r) => sum + (r.days || 0), 0)

      // 기안서로 신청한 근태도 합산
      const { data: labelData } = await supabase
        .from('document_labels')
        .select('id')
        .eq('code', ATTENDANCE_LABEL_CODE)
        .single()

      if (labelData) {
        const { data: docLeaves } = await supabase
          .from('documents')
          .select('leave_days')
          .eq('drafter_id', userId)
          .eq('label_id', labelData.id)
          .eq('attendance_type', 'leave')
          .eq('status', 'approved')
          .gte('leave_start_date', yearStart)
          .lte('leave_start_date', yearEnd)
          .not('leave_type', 'is', null)
          .neq('leave_type', 'comp')

        usedDays += (docLeaves || []).reduce((sum, d) => sum + (d.leave_days || 0), 0)
      }

      // 계산된 실제 사용일로 설정
      setAnnualLeave({ ...data, used_days: usedDays })
    } catch (err) {
      console.error('연차 정보 조회 에러:', err)
      setError(err.message)
    }
  }, [userId, currentYear])

  // 대체휴무 정보 조회
  const fetchCompLeave = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('comp_leaves')
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setCompLeave(data || null)
    } catch (err) {
      console.error('대체휴무 정보 조회 에러:', err)
    }
  }, [userId, currentYear])

  // 내 연차 신청 목록 조회
  const fetchMyRequests = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyRequests(data || [])
    } catch (err) {
      console.error('연차 신청 목록 조회 에러:', err)
      setError(err.message)
    }
  }, [userId])

  // 내 추가근무 신청 목록 조회
  const fetchMyOvertimeRequests = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('overtime_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyOvertimeRequests(data || [])
    } catch (err) {
      console.error('추가근무 신청 목록 조회 에러:', err)
      setError(err.message)
    }
  }, [userId])

  // 전체 연차 신청 목록 조회 (관리자용)
  const fetchAllRequests = useCallback(async (statusFilter = null) => {
    if (!canManage) return

    try {
      let query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setAllRequests(data || [])
    } catch (err) {
      console.error('전체 연차 신청 조회 에러:', err)
      setError(err.message)
    }
  }, [canManage])

  // 전체 추가근무 신청 목록 조회 (관리자용)
  const fetchAllOvertimeRequests = useCallback(async (statusFilter = null) => {
    if (!canManage) return

    try {
      let query = supabase
        .from('overtime_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setAllOvertimeRequests(data || [])
    } catch (err) {
      console.error('전체 추가근무 신청 조회 에러:', err)
      setError(err.message)
    }
  }, [canManage])

  // 전체 사용자 및 연차 정보 조회 (관리자용)
  const fetchAllAnnualLeaves = useCallback(async () => {
    if (!canManage) return

    try {
      // 모든 사용자 조회
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, team')
        .order('name')

      if (usersError) throw usersError
      setAllUsers(users || [])

      // 연차 정보 조회
      const { data: leaves, error: leavesError } = await supabase
        .from('annual_leaves')
        .select('*')
        .eq('year', currentYear)

      if (leavesError) throw leavesError

      // 승인된 연차 신청 조회 (올해 것만) - leave_requests 테이블
      const yearStart = `${currentYear}-01-01`
      const yearEnd = `${currentYear}-12-31`
      const { data: approvedRequests, error: requestsError } = await supabase
        .from('leave_requests')
        .select('user_id, days, leave_type')
        .eq('status', 'approved')
        .gte('start_date', yearStart)
        .lte('start_date', yearEnd)
        .neq('leave_type', 'comp') // 대체휴무는 제외

      if (requestsError) throw requestsError

      // 기안서로 신청한 근태도 조회 (documents 테이블)
      const { data: labelData } = await supabase
        .from('document_labels')
        .select('id')
        .eq('code', ATTENDANCE_LABEL_CODE)
        .single()

      let approvedDocLeaves = []
      if (labelData) {
        const { data: docLeaves } = await supabase
          .from('documents')
          .select('drafter_id, leave_days, leave_type')
          .eq('label_id', labelData.id)
          .eq('attendance_type', 'leave')
          .eq('status', 'approved')
          .gte('leave_start_date', yearStart)
          .lte('leave_start_date', yearEnd)
          .not('leave_type', 'is', null)
          .neq('leave_type', 'comp')

        approvedDocLeaves = docLeaves || []
      }

      // 사용자별 실제 사용 일수 계산 (leave_requests + documents 합산)
      const usedDaysMap = {}
      ;(approvedRequests || []).forEach(req => {
        usedDaysMap[req.user_id] = (usedDaysMap[req.user_id] || 0) + (req.days || 0)
      })
      // 기안서 근태도 합산
      approvedDocLeaves.forEach(doc => {
        usedDaysMap[doc.drafter_id] = (usedDaysMap[doc.drafter_id] || 0) + (doc.leave_days || 0)
      })

      // annual_leaves 데이터에 실제 사용 일수 반영
      const leavesWithUsed = (leaves || []).map(leave => ({
        ...leave,
        used_days: usedDaysMap[leave.user_id] || leave.used_days || 0
      }))

      // annual_leaves에 없는 사용자들도 추가
      const existingUserIds = new Set((leaves || []).map(l => l.user_id))
      ;(users || []).forEach(user => {
        if (!existingUserIds.has(user.id) && usedDaysMap[user.id]) {
          leavesWithUsed.push({
            user_id: user.id,
            year: currentYear,
            total_days: DEFAULT_ANNUAL_LEAVE_DAYS,
            used_days: usedDaysMap[user.id]
          })
        }
      })

      setAllAnnualLeaves(leavesWithUsed)
    } catch (err) {
      console.error('전체 연차 정보 조회 에러:', err, err?.message, err?.code)
      setError(err.message)
    }
  }, [canManage, currentYear])

  // 연차 신청
  const createRequest = async (requestData) => {
    if (!userId) return { success: false, error: '로그인이 필요합니다.' }

    try {
      setLoading(true)

      // 일수 계산
      let days = 0
      const leaveType = requestData.leave_type
      if (leaveType === 'full' || leaveType === 'comp') {
        const start = new Date(requestData.start_date)
        const end = new Date(requestData.end_date)
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      } else {
        days = LEAVE_TYPE_DAYS[leaveType] || 0.5
      }

      // 대체휴무가 아닌 경우에만 잔여 연차 확인
      if (leaveType !== 'comp' && annualLeave) {
        const remaining = annualLeave.total_days - annualLeave.used_days
        if (days > remaining) {
          return { success: false, error: `잔여 연차가 부족합니다. (잔여: ${remaining}일)` }
        }
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: userId,
          leave_type: leaveType,
          start_date: requestData.start_date,
          end_date: requestData.end_date || requestData.start_date,
          days: days,
          reason: requestData.reason,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      await fetchMyRequests()
      return { success: true, data }
    } catch (err) {
      console.error('연차 신청 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 연차 신청 취소
  const cancelRequest = async (requestId) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (error) throw error

      await fetchMyRequests()
      return { success: true }
    } catch (err) {
      console.error('연차 취소 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 추가근무 신청
  const createOvertimeRequest = async (requestData) => {
    if (!userId) return { success: false, error: '로그인이 필요합니다.' }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('overtime_requests')
        .insert({
          user_id: userId,
          start_datetime: requestData.start_datetime,
          end_datetime: requestData.end_datetime,
          reason: requestData.reason,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      await fetchMyOvertimeRequests()
      return { success: true, data }
    } catch (err) {
      console.error('추가근무 신청 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 추가근무 신청 취소
  const cancelOvertimeRequest = async (requestId) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from('overtime_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (error) throw error

      await fetchMyOvertimeRequests()
      return { success: true }
    } catch (err) {
      console.error('추가근무 취소 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 연차 승인 (관리자)
  const approveRequest = async (requestId) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      // 신청 정보 조회
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      // 승인 처리
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // 대체휴무인 경우 comp_leaves에서 차감
      if (request.leave_type === 'comp') {
        const hoursToUse = request.days * 8 // 1일 = 8시간

        const { data: compLeaveData } = await supabase
          .from('comp_leaves')
          .select('*')
          .eq('user_id', request.user_id)
          .eq('year', currentYear)
          .single()

        if (compLeaveData) {
          await supabase
            .from('comp_leaves')
            .update({
              used_hours: compLeaveData.used_hours + hoursToUse,
              updated_at: new Date().toISOString()
            })
            .eq('id', compLeaveData.id)
        }
      } else {
        // 일반 연차 차감
        const { data: leaveData } = await supabase
          .from('annual_leaves')
          .select('*')
          .eq('user_id', request.user_id)
          .eq('year', currentYear)
          .single()

        if (leaveData) {
          await supabase
            .from('annual_leaves')
            .update({
              used_days: leaveData.used_days + request.days,
              updated_at: new Date().toISOString()
            })
            .eq('id', leaveData.id)
        } else {
          // 연차 레코드가 없으면 새로 생성
          await supabase
            .from('annual_leaves')
            .insert({
              user_id: request.user_id,
              year: currentYear,
              total_days: DEFAULT_ANNUAL_LEAVE_DAYS,
              used_days: request.days
            })
        }
      }

      await fetchAllRequests()
      await fetchAllAnnualLeaves()
      return { success: true }
    } catch (err) {
      console.error('연차 승인 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 연차 반려 (관리자)
  const rejectRequest = async (requestId, rejectReason) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          rejected_reason: rejectReason,
          approved_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      await fetchAllRequests()
      return { success: true }
    } catch (err) {
      console.error('연차 반려 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 추가근무 승인 (관리자)
  const approveOvertimeRequest = async (requestId) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      await fetchAllOvertimeRequests()
      return { success: true }
    } catch (err) {
      console.error('추가근무 승인 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 추가근무 반려 (관리자)
  const rejectOvertimeRequest = async (requestId, rejectReason) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('overtime_requests')
        .update({
          status: 'rejected',
          rejected_reason: rejectReason,
          approved_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      await fetchAllOvertimeRequests()
      return { success: true }
    } catch (err) {
      console.error('추가근무 반려 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 사용자 연차 수정 (관리자)
  const updateUserLeave = async (userId, totalDays) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('annual_leaves')
        .upsert({
          user_id: userId,
          year: currentYear,
          total_days: totalDays,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,year'
        })
        .select()
        .single()

      if (error) throw error

      await fetchAllAnnualLeaves()
      return { success: true, data }
    } catch (err) {
      console.error('연차 수정 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 승인된 연차 목록 (캘린더용)
  const fetchApprovedLeaves = useCallback(async (year, month) => {
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      // leave_requests에서 승인된 연차 조회
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

      if (leaveError) throw leaveError

      // 사용자 정보 조회
      const userIds = [...new Set((leaveData || []).map(r => r.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, name, team')
        .in('id', userIds)

      const userMap = {}
      ;(users || []).forEach(u => { userMap[u.id] = u })

      const result = (leaveData || []).map(r => ({
        ...r,
        user: userMap[r.user_id]
      }))

      return result
    } catch (err) {
      console.error('승인된 연차 조회 에러:', err)
      return []
    }
  }, [])

  // 기안서 근태 데이터 조회 (관리자용)
  const fetchDocumentLeaves = useCallback(async (statusFilter = null) => {
    if (!canManage) return

    try {
      // 근태관련 라벨(code=4) 조회
      const { data: labelData } = await supabase
        .from('document_labels')
        .select('id')
        .eq('code', ATTENDANCE_LABEL_CODE)
        .single()

      if (!labelData) return

      let query = supabase
        .from('documents')
        .select('*, drafter:drafter_id(name, team, position)')
        .eq('label_id', labelData.id)
        .eq('attendance_type', 'leave')
        .not('leave_type', 'is', null)
        .order('created_at', { ascending: false })

      // 상태 필터
      if (statusFilter === 'pending') {
        query = query.eq('status', 'pending')
      } else if (statusFilter === 'approved') {
        query = query.eq('status', 'approved')
      } else if (statusFilter === 'rejected') {
        query = query.eq('status', 'rejected')
      }

      const { data, error } = await query

      if (error) throw error
      setDocumentLeaves(data || [])
    } catch (err) {
      console.error('기안서 근태 조회 에러:', err)
      setError(err.message)
    }
  }, [canManage])

  // 기안서 근태 승인 (관리자)
  const approveDocumentLeave = async (docId) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('documents')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', docId)

      if (error) throw error

      await fetchDocumentLeaves()
      return { success: true }
    } catch (err) {
      console.error('기안서 근태 승인 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 기안서 근태 반려 (관리자)
  const rejectDocumentLeave = async (docId, rejectReason) => {
    if (!canManage) return { success: false, error: '권한이 없습니다.' }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('documents')
        .update({
          status: 'rejected',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejected_reason: rejectReason
        })
        .eq('id', docId)

      if (error) throw error

      await fetchDocumentLeaves()
      return { success: true }
    } catch (err) {
      console.error('기안서 근태 반려 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    if (userId) {
      fetchAnnualLeave()
      fetchCompLeave()
      fetchMyRequests()
      fetchMyOvertimeRequests()
      if (canManage) {
        fetchAllRequests()
        fetchAllOvertimeRequests()
        fetchAllAnnualLeaves()
        fetchDocumentLeaves()
      }
    }
  }, [userId, canManage, fetchAnnualLeave, fetchCompLeave, fetchMyRequests, fetchMyOvertimeRequests, fetchAllRequests, fetchAllOvertimeRequests, fetchAllAnnualLeaves, fetchDocumentLeaves])

  return {
    // 상태
    annualLeave, // 내 연차 정보 (annual_leaves 테이블)
    compLeave, // 내 대체휴무 정보
    myRequests, // 내 신청 목록
    myOvertimeRequests, // 내 추가근무 신청 목록
    allRequests, // 전체 신청 목록 (관리자)
    allOvertimeRequests, // 전체 추가근무 신청 목록 (관리자)
    allAnnualLeaves, // 전체 연차 정보 (관리자)
    allUsers, // 전체 사용자 목록
    documentLeaves, // 기안서 근태 데이터
    loading,
    error,
    canManage,
    currentYear,

    // 내 연차
    fetchAnnualLeave,
    fetchMyRequests,
    createRequest,
    cancelRequest,

    // 내 추가근무
    fetchMyOvertimeRequests,
    createOvertimeRequest,
    cancelOvertimeRequest,

    // 관리자
    fetchAllRequests,
    fetchAllOvertimeRequests,
    fetchAllAnnualLeaves,
    approveRequest,
    rejectRequest,
    approveOvertimeRequest,
    rejectOvertimeRequest,
    updateUserLeave,
    fetchDocumentLeaves,
    approveDocumentLeave,
    rejectDocumentLeave,

    // 캘린더
    fetchApprovedLeaves,
  }
}
