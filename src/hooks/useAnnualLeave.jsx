import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * 연차 관리 훅
 */
// 연차 유형별 차감 일수
const LEAVE_TYPE_DAYS = {
    full: 1,
    half_am: 0.5,
    half_pm: 0.5,
    out_2h: 0.25,
    out_3h: 0.375,
    comp: 1  // 대체휴무 (연차에서 차감하지 않음, comp_leaves에서 차감)
}

export const useAnnualLeave = () => {
    const { user, isAdmin, isSubAdmin } = useAuth()
    const canManage = isAdmin || isSubAdmin // 관리자 또는 부관리자
    const [annualLeave, setAnnualLeave] = useState(null)
    const [compLeave, setCompLeave] = useState(null)
    const [leaveRequests, setLeaveRequests] = useState([])
    const [pendingRequests, setPendingRequests] = useState([])
    const [loading, setLoading] = useState(true)

    const currentYear = new Date().getFullYear()

    // 연차 정보 조회
    const fetchAnnualLeave = useCallback(async () => {
        if (!user?.user_id) return

        const { data, error } = await supabase
            .from('annual_leaves')
            .select('*')
            .eq('user_id', user.user_id)
            .eq('year', currentYear)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching annual leave:', error)
        }

        // 연차 정보가 없으면 기본값 생성
        if (!data) {
            const { data: newData, error: insertError } = await supabase
                .from('annual_leaves')
                .insert([{
                    user_id: user.user_id,
                    year: currentYear,
                    total_days: 15,
                    used_days: 0
                }])
                .select()
                .single()

            if (!insertError) {
                setAnnualLeave(newData)
            }
        } else {
            setAnnualLeave(data)
        }
    }, [user?.user_id, currentYear])

    // 대체휴무 정보 조회
    const fetchCompLeave = useCallback(async () => {
        if (!user?.user_id) return

        const { data, error } = await supabase
            .from('comp_leaves')
            .select('*')
            .eq('user_id', user.user_id)
            .eq('year', currentYear)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching comp leave:', error)
        }

        setCompLeave(data || null)
    }, [user?.user_id, currentYear])

    // 내 연차 신청 목록 조회
    const fetchMyRequests = useCallback(async () => {
        if (!user?.user_id) return

        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('user_id', user.user_id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching leave requests:', error)
        } else {
            setLeaveRequests(data || [])
        }
    }, [user?.user_id])

    // 대기중인 연차 신청 조회 (관리자/부관리자용)
    const fetchPendingRequests = useCallback(async () => {
        if (!canManage) return

        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching pending requests:', error)
        } else {
            setPendingRequests(data || [])
        }
    }, [canManage])

    // 연차 신청
    const submitLeaveRequest = async ({ startDate, endDate, leaveType, reason }) => {
        if (!user?.user_id) {
            return { error: { message: '로그인이 필요합니다.' } }
        }

        // 일수 계산
        let days = 0
        if (leaveType === 'full' || leaveType === 'comp') {
            // 연차 또는 대체휴무는 날짜 범위로 계산
            const start = new Date(startDate)
            const end = new Date(endDate)
            days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
        } else {
            // 반차, 외출/조퇴는 고정 일수
            days = LEAVE_TYPE_DAYS[leaveType] || 0.5
        }

        // 대체휴무가 아닌 경우에만 잔여 연차 확인
        if (leaveType !== 'comp' && annualLeave) {
            const remaining = annualLeave.total_days - annualLeave.used_days
            if (days > remaining) {
                return { error: { message: `잔여 연차가 부족합니다. (잔여: ${remaining}일)` } }
            }
        }

        const { data, error } = await supabase
            .from('leave_requests')
            .insert([{
                user_id: user.user_id,
                start_date: startDate,
                end_date: endDate,
                leave_type: leaveType,
                days: days,
                reason: reason,
                status: 'pending'
            }])
            .select()
            .single()

        if (error) {
            console.error('Submit leave request error:', error)
        } else {
            await fetchMyRequests()
        }

        return { data, error }
    }

    // 연차 신청 취소
    const cancelLeaveRequest = async (requestId) => {
        const { error } = await supabase
            .from('leave_requests')
            .delete()
            .eq('id', requestId)
            .eq('user_id', user.user_id)
            .eq('status', 'pending')

        if (!error) {
            await fetchMyRequests()
        }

        return { error }
    }

    // 연차 신청 수정 (pending 상태일 때만)
    const updateLeaveRequest = async (requestId, { startDate, endDate, leaveType, reason }) => {
        if (!user?.user_id) {
            return { error: { message: '로그인이 필요합니다.' } }
        }

        // 일수 계산
        let days = 0
        if (leaveType === 'full' || leaveType === 'comp') {
            const start = new Date(startDate)
            const end = new Date(endDate)
            days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
        } else {
            days = LEAVE_TYPE_DAYS[leaveType] || 0.5
        }

        // 대체휴무가 아닌 경우에만 잔여 연차 확인
        if (leaveType !== 'comp' && annualLeave) {
            const remaining = annualLeave.total_days - annualLeave.used_days
            if (days > remaining) {
                return { error: { message: `잔여 연차가 부족합니다. (잔여: ${remaining}일)` } }
            }
        }

        const { data, error } = await supabase
            .from('leave_requests')
            .update({
                start_date: startDate,
                end_date: endDate,
                leave_type: leaveType,
                days: days,
                reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .eq('user_id', user.user_id)
            .eq('status', 'pending')
            .select()
            .single()

        if (error) {
            console.error('Update leave request error:', error)
        } else {
            await fetchMyRequests()
        }

        return { data, error }
    }

    // 연차 승인 (관리자/부관리자)
    const approveLeaveRequest = async (requestId) => {
        if (!canManage) {
            return { error: { message: '권한이 없습니다.' } }
        }

        // 신청 정보 조회
        const { data: request } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (!request) {
            return { error: { message: '신청 정보를 찾을 수 없습니다.' } }
        }

        // 신청 상태 업데이트
        const { error: updateError } = await supabase
            .from('leave_requests')
            .update({
                status: 'approved',
                approved_by: user.user_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId)

        if (updateError) {
            return { error: updateError }
        }

        // 대체휴무인 경우 comp_leaves에서 차감
        if (request.leave_type === 'comp') {
            const hoursToUse = request.days * 8  // 1일 = 8시간

            const { data: compLeave } = await supabase
                .from('comp_leaves')
                .select('*')
                .eq('user_id', request.user_id)
                .eq('year', currentYear)
                .single()

            if (compLeave) {
                await supabase
                    .from('comp_leaves')
                    .update({
                        used_hours: compLeave.used_hours + hoursToUse,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', compLeave.id)
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
            }
        }

        await fetchPendingRequests()
        return { error: null }
    }

    // 연차 반려 (관리자/부관리자)
    const rejectLeaveRequest = async (requestId, rejectedReason) => {
        if (!canManage) {
            return { error: { message: '권한이 없습니다.' } }
        }

        const { error } = await supabase
            .from('leave_requests')
            .update({
                status: 'rejected',
                rejected_reason: rejectedReason,
                approved_by: user.user_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId)

        if (!error) {
            await fetchPendingRequests()
        }

        return { error }
    }

    // 모든 사용자의 연차 정보 조회 (관리자/부관리자용)
    const fetchAllAnnualLeaves = async () => {
        if (!canManage) return { data: null, error: { message: '권한이 없습니다.' } }

        const { data, error } = await supabase
            .from('annual_leaves')
            .select('*')
            .eq('year', currentYear)
            .order('user_id')

        return { data, error }
    }

    // 사용자 연차 수정 (관리자/부관리자용)
    const updateUserAnnualLeave = async (userId, totalDays) => {
        if (!canManage) return { error: { message: '권한이 없습니다.' } }

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

        return { data, error }
    }

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            await Promise.all([
                fetchAnnualLeave(),
                fetchCompLeave(),
                fetchMyRequests(),
                fetchPendingRequests()
            ])
            setLoading(false)
        }

        if (user?.user_id) {
            loadData()
        } else {
            setLoading(false)
        }
    }, [user?.user_id, fetchAnnualLeave, fetchCompLeave, fetchMyRequests, fetchPendingRequests])

    return {
        annualLeave,
        compLeave,
        leaveRequests,
        pendingRequests,
        loading,
        canManage, // 관리자 또는 부관리자 여부
        submitLeaveRequest,
        cancelLeaveRequest,
        updateLeaveRequest,
        approveLeaveRequest,
        rejectLeaveRequest,
        fetchAllAnnualLeaves,
        updateUserAnnualLeave,
        refresh: () => {
            fetchAnnualLeave()
            fetchCompLeave()
            fetchMyRequests()
            fetchPendingRequests()
        }
    }
}
