import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useDocument = () => {
    const { user, isAdmin, isSubAdmin } = useAuth()
    const [documents, setDocuments] = useState([])
    const [pendingDocuments, setPendingDocuments] = useState([])
    const [labels, setLabels] = useState([])
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
    }, [fetchLabels, fetchDocuments])

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
                attachments: documentData.attachments || null
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

        // 근태관련 라벨(code=4)이고 추가근무 시간이 있으면 대체휴무 생성
        if (doc.label_id) {
            const { data: label } = await supabase
                .from('document_labels')
                .select('code')
                .eq('id', doc.label_id)
                .single()

            if (label?.code === 4 && doc.extra_work_hours > 0) {
                // 기존 대체휴무 조회
                const { data: existingComp } = await supabase
                    .from('comp_leaves')
                    .select('*')
                    .eq('user_id', doc.drafter_id)
                    .eq('year', new Date().getFullYear())
                    .single()

                if (existingComp) {
                    // 기존 대체휴무에 시간 추가
                    await supabase
                        .from('comp_leaves')
                        .update({
                            total_hours: existingComp.total_hours + doc.extra_work_hours,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingComp.id)
                } else {
                    // 새 대체휴무 생성
                    await supabase
                        .from('comp_leaves')
                        .insert({
                            user_id: doc.drafter_id,
                            document_id: documentId,
                            total_hours: doc.extra_work_hours,
                            used_hours: 0,
                            year: new Date().getFullYear(),
                            description: doc.title
                        })
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
        pendingDocuments,
        labels,
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
