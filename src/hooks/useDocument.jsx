import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useDocument = () => {
    const { user, isAdmin, isSubAdmin } = useAuth()
    const [documents, setDocuments] = useState([])
    const [allDocuments, setAllDocuments] = useState([])
    const [pendingDocuments, setPendingDocuments] = useState([])
    const [labels, setLabels] = useState([])
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    const canManage = isAdmin || isSubAdmin

    // 라벨 목록 조회
    const fetchLabels = useCallback(async () => {
        const { data } = await supabase
            .from('document_labels')
            .select('*')
            .order('code')

        if (data) {
            setLabels(data)
        }
    }, [])

    // 사용자 목록 조회
    const fetchUsers = useCallback(async () => {
        const { data } = await supabase
            .from('users')
            .select('user_id, name, rank, team')
            .order('name')

        if (data) {
            setUsers(data)
        }
    }, [])

    // 기안서 목록 조회
    const fetchDocuments = useCallback(async () => {
        if (!user) return

        setLoading(true)

        // 본인이 작성한 기안서
        const { data: myDocs } = await supabase
            .from('documents')
            .select('*, document_labels(*)')
            .eq('drafter_id', user.user_id)
            .order('created_at', { ascending: false })

        if (myDocs) {
            setDocuments(myDocs)
        }

        // 전체 기안서 조회 (is_private이 true면 관리자만 볼 수 있음)
        const { data: all } = await supabase
            .from('documents')
            .select('*, document_labels(*)')
            .order('created_at', { ascending: false })

        if (all) {
            setAllDocuments(all)
        }

        // 관리자인 경우 대기중인 기안서도 조회 (pending + chairman_approved)
        if (canManage) {
            const { data: pending } = await supabase
                .from('documents')
                .select('*, document_labels(*)')
                .in('status', ['pending', 'chairman_approved'])
                .order('created_at', { ascending: false })

            if (pending) {
                setPendingDocuments(pending)
            }
        }

        setLoading(false)
    }, [user, canManage])

    useEffect(() => {
        fetchLabels()
        fetchDocuments()
        fetchUsers()
    }, [fetchLabels, fetchDocuments, fetchUsers])

    // 기안서 작성
    const createDocument = async (documentData) => {
        if (!user) return { error: '로그인이 필요합니다.' }

        // 기안번호 생성 (YYYY/MM/DD-N 형식)
        const today = new Date()
        const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

        // 오늘 작성된 기안서 개수 조회
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
        const { count } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay)

        const docNumber = `${dateStr}-${(count || 0) + 1}`

        const { data, error } = await supabase
            .from('documents')
            .insert({
                label_id: documentData.label_id,
                title: documentData.title,
                content: documentData.content,
                extra_work_hours: documentData.extra_work_hours || 0,
                doc_number: docNumber,
                drafter_id: user.user_id,
                status: 'pending',
                execution_date: documentData.execution_date || null,
                payment_method: documentData.payment_method || null,
                expense_items: documentData.expense_items || null,
                attachments: documentData.attachments || null,
                // 휴가 신청 관련 필드
                attendance_type: documentData.attendance_type || null,
                leave_type: documentData.leave_type || null,
                leave_start_date: documentData.leave_start_date || null,
                leave_end_date: documentData.leave_end_date || null,
                leave_days: documentData.leave_days || null,
                // 비공개 설정
                is_private: documentData.is_private || false
            })
            .select()
            .single()

        if (error) {
            console.error('Create document error:', error)
        } else {
            fetchDocuments()
        }

        return { data, error }
    }

    // 기안서 수정 (pending 상태일 때만)
    const updateDocument = async (documentId, documentData) => {
        if (!user) return { error: '로그인이 필요합니다.' }

        const { data, error } = await supabase
            .from('documents')
            .update({
                label_id: documentData.label_id,
                title: documentData.title,
                content: documentData.content,
                extra_work_hours: documentData.extra_work_hours || 0,
                execution_date: documentData.execution_date || null,
                payment_method: documentData.payment_method || null,
                expense_items: documentData.expense_items || null,
                attachments: documentData.attachments || null,
                // 휴가 신청 관련 필드
                attendance_type: documentData.attendance_type || null,
                leave_type: documentData.leave_type || null,
                leave_start_date: documentData.leave_start_date || null,
                leave_end_date: documentData.leave_end_date || null,
                leave_days: documentData.leave_days || null,
                is_private: documentData.is_private || false,
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId)
            .eq('drafter_id', user.user_id)
            .eq('status', 'pending')
            .select()
            .single()

        if (error) {
            console.error('Update document error:', error)
        } else {
            fetchDocuments()
        }

        return { data, error }
    }

    // 기안서 승인 (회장 승인)
    const approveDocument = async (documentId, approvalType = 'chairman') => {
        if (!canManage) return { error: '권한이 없습니다.' }

        const { data: doc } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single()

        if (!doc) return { error: '기안서를 찾을 수 없습니다.' }

        // 총 금액 계산
        const totalAmount = (doc.expense_items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        const needsDirectorApproval = totalAmount >= 1000000

        // 100만원 이상이고 회장 승인인 경우 -> chairman_approved 상태로
        if (needsDirectorApproval && approvalType === 'chairman') {
            const { error } = await supabase
                .from('documents')
                .update({
                    status: 'chairman_approved',
                    approver_id: user.user_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', documentId)

            if (error) return { error }
            fetchDocuments()
            return { error: null }
        }

        // 이사장 승인 또는 100만원 미만 승인 -> approved 상태로
        const updateData = {
            status: 'approved',
            approver_id: user.user_id,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        const { error } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', documentId)

        if (error) return { error }

        // 근태관련 라벨(code=4) 처리
        if (doc.label_id) {
            const { data: label } = await supabase
                .from('document_labels')
                .select('code')
                .eq('id', doc.label_id)
                .single()

            if (label?.code === 4) {
                const currentYear = new Date().getFullYear()

                // 추가근무 신청인 경우 - 대체휴무 적립
                if (doc.attendance_type === 'overtime' && doc.extra_work_hours > 0) {
                    const { data: existingComp } = await supabase
                        .from('comp_leaves')
                        .select('*')
                        .eq('user_id', doc.drafter_id)
                        .eq('year', currentYear)
                        .single()

                    if (existingComp) {
                        await supabase
                            .from('comp_leaves')
                            .update({
                                total_hours: existingComp.total_hours + doc.extra_work_hours,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingComp.id)
                    } else {
                        await supabase
                            .from('comp_leaves')
                            .insert({
                                user_id: doc.drafter_id,
                                document_id: documentId,
                                total_hours: doc.extra_work_hours,
                                used_hours: 0,
                                year: currentYear,
                                description: doc.title
                            })
                    }
                }

                // 휴가 신청인 경우 - 연차/대체휴무 차감 및 일정 추가
                if (doc.attendance_type === 'leave' && doc.leave_type) {
                    // 연차/대체휴무 차감
                    if (doc.leave_days > 0) {
                        if (doc.leave_type === 'comp') {
                            // 대체휴무 차감
                            const hoursToUse = doc.leave_days * 8
                            const { data: compLeave } = await supabase
                                .from('comp_leaves')
                                .select('*')
                                .eq('user_id', doc.drafter_id)
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
                            // 연차 차감 (full, half_am, half_pm, out_2h, out_3h)
                            const { data: annualLeave } = await supabase
                                .from('annual_leaves')
                                .select('*')
                                .eq('user_id', doc.drafter_id)
                                .eq('year', currentYear)
                                .single()

                            if (annualLeave) {
                                await supabase
                                    .from('annual_leaves')
                                    .update({
                                        used_days: annualLeave.used_days + doc.leave_days,
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', annualLeave.id)
                            }
                        }
                    }

                    // 휴가 승인 시 일정에 자동 추가
                    const { data: drafter } = await supabase
                        .from('users')
                        .select('name, rank')
                        .eq('user_id', doc.drafter_id)
                        .single()

                    if (drafter) {
                        // 휴가 유형별 라벨
                        const leaveTypeLabels = {
                            full: '연차',
                            half_am: '오전반차',
                            half_pm: '오후반차',
                            out_2h: '조퇴',
                            out_3h: '조퇴',
                            comp: '대체휴무'
                        }

                        // 제목에서 휴가 유형 추출 (제목 우선, 없으면 leave_type 사용)
                        let leaveLabel = '휴가'
                        if (doc.title) {
                            if (doc.title.includes('조퇴')) leaveLabel = '조퇴'
                            else if (doc.title.includes('오전반차')) leaveLabel = '오전반차'
                            else if (doc.title.includes('오후반차')) leaveLabel = '오후반차'
                            else if (doc.title.includes('반차')) leaveLabel = '반차'
                            else if (doc.title.includes('연차')) leaveLabel = '연차'
                            else if (doc.title.includes('외출')) leaveLabel = '외출'
                            else if (doc.title.includes('휴가')) leaveLabel = '휴가'
                            else if (doc.title.includes('대체휴무')) leaveLabel = '대체휴무'
                            else if (doc.leave_type) leaveLabel = leaveTypeLabels[doc.leave_type] || '휴가'
                        } else if (doc.leave_type) {
                            leaveLabel = leaveTypeLabels[doc.leave_type] || '휴가'
                        }

                        const eventTitle = `[${leaveLabel}] ${drafter.name}${drafter.rank ? ' ' + drafter.rank : ''}`

                        // 이벤트 생성할 날짜들
                        let eventDates = []

                        if (doc.leave_start_date) {
                            // leave_start_date가 있는 경우: 시작일~종료일 범위
                            const startDateStr = doc.leave_start_date
                            const endDateStr = doc.leave_end_date || doc.leave_start_date
                            const start = new Date(startDateStr + 'T00:00:00')
                            const end = new Date(endDateStr + 'T00:00:00')

                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                const year = d.getFullYear()
                                const month = String(d.getMonth() + 1).padStart(2, '0')
                                const day = String(d.getDate()).padStart(2, '0')
                                eventDates.push(`${year}-${month}-${day}`)
                            }
                        } else {
                            // leave_start_date가 없는 경우: 제목에서 날짜 파싱
                            // 예: "0127,0129 조퇴신청서" -> [01-27, 01-29]
                            const docYear = new Date(doc.created_at).getFullYear()
                            const datePattern = /(\d{4})/g
                            const matches = doc.title.match(datePattern)

                            if (matches) {
                                for (const match of matches) {
                                    const month = match.substring(0, 2)
                                    const day = match.substring(2, 4)
                                    // 유효한 월/일인지 확인
                                    if (parseInt(month) >= 1 && parseInt(month) <= 12 &&
                                        parseInt(day) >= 1 && parseInt(day) <= 31) {
                                        eventDates.push(`${docYear}-${month}-${day}`)
                                    }
                                }
                            }
                        }

                        // 각 날짜에 일정 추가
                        for (const eventDate of eventDates) {
                            await supabase
                                .from('events')
                                .insert({
                                    event_date: eventDate,
                                    title: eventTitle,
                                    event_type: 'leave',
                                    description: doc.title,
                                    created_by: doc.drafter_id
                                })
                        }
                    }
                }
            }
        }

        fetchDocuments()
        return { error: null }
    }

    // 기안서 반려
    const rejectDocument = async (documentId, reason) => {
        if (!canManage) return { error: '권한이 없습니다.' }

        const { error } = await supabase
            .from('documents')
            .update({
                status: 'rejected',
                approver_id: user.user_id,
                rejected_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId)

        if (!error) {
            fetchDocuments()
        }

        return { error }
    }

    // 기안서 삭제 (관리자 또는 본인이 작성한 pending 상태)
    const deleteDocument = async (documentId, isOwnerDelete = false) => {
        // 본인이 작성한 pending 기안서 삭제
        if (isOwnerDelete) {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', documentId)
                .eq('drafter_id', user.user_id)
                .eq('status', 'pending')

            if (error) {
                console.error('Delete document error:', error)
            } else {
                fetchDocuments()
            }

            return { error }
        }

        // 관리자 삭제
        if (!canManage) return { error: '권한이 없습니다.' }

        // 연결된 대체휴무 기록 먼저 삭제
        await supabase
            .from('comp_leaves')
            .delete()
            .eq('document_id', documentId)

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)

        if (error) {
            console.error('Delete document error:', error)
        } else {
            fetchDocuments()
        }

        return { error }
    }

    // 라벨 추가
    const addLabel = async (name, color) => {
        if (!canManage) return { error: '권한이 없습니다.' }

        // 다음 코드 번호 조회
        const { data: maxCode } = await supabase
            .from('document_labels')
            .select('code')
            .order('code', { ascending: false })
            .limit(1)
            .single()

        const nextCode = (maxCode?.code || 0) + 1

        const { error } = await supabase
            .from('document_labels')
            .insert({ code: nextCode, name, color })

        if (!error) {
            fetchLabels()
        }

        return { error }
    }

    // 라벨 수정
    const updateLabel = async (labelId, name, color) => {
        if (!canManage) return { error: '권한이 없습니다.' }

        const { error } = await supabase
            .from('document_labels')
            .update({ name, color })
            .eq('id', labelId)

        if (!error) {
            fetchLabels()
        }

        return { error }
    }

    // 라벨 삭제
    const deleteLabel = async (labelId) => {
        if (!canManage) return { error: '권한이 없습니다.' }

        const { error } = await supabase
            .from('document_labels')
            .delete()
            .eq('id', labelId)

        if (!error) {
            fetchLabels()
        }

        return { error }
    }

    return {
        documents,
        allDocuments,
        pendingDocuments,
        labels,
        users,
        loading,
        canManage,
        createDocument,
        updateDocument,
        approveDocument,
        rejectDocument,
        deleteDocument,
        addLabel,
        updateLabel,
        deleteLabel,
        refresh: fetchDocuments
    }
}

export default useDocument
