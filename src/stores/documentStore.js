import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useDocumentStore = create((set, get) => ({
    documents: [],
    allDocuments: [],
    pendingDocuments: [],
    labels: [],
    users: [],
    loading: true,
    error: null,

    // Actions
    fetchLabels: async () => {
        try {
            const { data, error } = await supabase
                .from('document_labels')
                .select('*')
                .order('code')

            if (error) throw error
            set({ labels: data || [] })
        } catch (err) {
            set({ error: '라벨 목록을 불러오는데 실패했습니다.' })
        }
    },

    fetchUsers: async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('user_id, name, rank, team')
                .order('name')

            if (error) throw error
            set({ users: data || [] })
        } catch (err) {
            set({ error: '사용자 목록을 불러오는데 실패했습니다.' })
        }
    },

    fetchDocuments: async (userId, canManage) => {
        if (!userId) return

        set({ loading: true, error: null })

        try {
            // 본인이 작성한 기안서
            const { data: myDocs, error: myDocsError } = await supabase
                .from('documents')
                .select('*, document_labels(*)')
                .eq('drafter_id', userId)
                .order('created_at', { ascending: false })

            if (myDocsError) throw myDocsError

            // 전체 기안서 조회
            const { data: all, error: allError } = await supabase
                .from('documents')
                .select('*, document_labels(*)')
                .order('created_at', { ascending: false })

            if (allError) throw allError

            let pending = []
            if (canManage) {
                const { data: pendingData, error: pendingError } = await supabase
                    .from('documents')
                    .select('*, document_labels(*)')
                    .in('status', ['pending', 'chairman_approved'])
                    .order('created_at', { ascending: false })

                if (pendingError) throw pendingError
                pending = pendingData || []
            }

            set({
                documents: myDocs || [],
                allDocuments: all || [],
                pendingDocuments: pending,
                loading: false
            })
        } catch (err) {
            set({ error: '기안서 목록을 불러오는데 실패했습니다.', loading: false })
        }
    },

    createDocument: async (documentData, userId) => {
        if (!userId) return { error: '로그인이 필요합니다.' }

        const today = new Date()
        const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

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
                drafter_id: userId,
                status: 'pending',
                execution_date: documentData.execution_date || null,
                payment_method: documentData.payment_method || null,
                expense_items: documentData.expense_items || null,
                attachments: documentData.attachments || null,
                attendance_type: documentData.attendance_type || null,
                leave_type: documentData.leave_type || null,
                leave_start_date: documentData.leave_start_date || null,
                leave_end_date: documentData.leave_end_date || null,
                leave_days: documentData.leave_days || null,
                is_private: documentData.is_private || false
            })
            .select()
            .single()

        return { data, error }
    },

    updateDocument: async (documentId, documentData, userId) => {
        if (!userId) return { error: '로그인이 필요합니다.' }

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
                attendance_type: documentData.attendance_type || null,
                leave_type: documentData.leave_type || null,
                leave_start_date: documentData.leave_start_date || null,
                leave_end_date: documentData.leave_end_date || null,
                leave_days: documentData.leave_days || null,
                is_private: documentData.is_private || false,
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId)
            .eq('drafter_id', userId)
            .eq('status', 'pending')
            .select()
            .single()

        return { data, error }
    },

    approveDocument: async (documentId, approvalType = 'chairman', canManage) => {
        if (!canManage) return { error: '권한이 없습니다.' }

        const { data: doc } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single()

        if (!doc) return { error: '기안서를 찾을 수 없습니다.' }

        const totalAmount = (doc.expense_items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        const needsDirectorApproval = totalAmount >= 1000000

        let newStatus = 'approved'
        if (needsDirectorApproval && approvalType === 'chairman' && doc.status === 'pending') {
            newStatus = 'chairman_approved'
        }

        const { data, error } = await supabase
            .from('documents')
            .update({
                status: newStatus,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId)
            .select()
            .single()

        return { data, error }
    },

    rejectDocument: async (documentId, reason, canManage) => {
        if (!canManage) return { error: '권한이 없습니다.' }

        const { data, error } = await supabase
            .from('documents')
            .update({
                status: 'rejected',
                rejected_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', documentId)
            .select()
            .single()

        return { data, error }
    },

    deleteDocument: async (documentId, force = false, canManage, userId) => {
        let query = supabase.from('documents').delete().eq('id', documentId)

        if (!force && !canManage) {
            query = query.eq('drafter_id', userId).eq('status', 'pending')
        }

        const { error } = await query

        return { error }
    },

    // Label management
    createLabel: async (name, color) => {
        const { labels } = get()
        const maxCode = labels.reduce((max, l) => Math.max(max, l.code || 0), 0)

        const { data, error } = await supabase
            .from('document_labels')
            .insert({ name, color, code: maxCode + 1 })
            .select()
            .single()

        if (!error && data) {
            set({ labels: [...labels, data] })
        }

        return { data, error }
    },

    updateLabel: async (labelId, updates) => {
        const { data, error } = await supabase
            .from('document_labels')
            .update(updates)
            .eq('id', labelId)
            .select()
            .single()

        if (!error && data) {
            const { labels } = get()
            set({ labels: labels.map(l => l.id === labelId ? data : l) })
        }

        return { data, error }
    },

    deleteLabel: async (labelId) => {
        const { error } = await supabase
            .from('document_labels')
            .delete()
            .eq('id', labelId)

        if (!error) {
            const { labels } = get()
            set({ labels: labels.filter(l => l.id !== labelId) })
        }

        return { error }
    },

    refresh: async (userId, canManage) => {
        const { fetchDocuments, fetchLabels, fetchUsers } = get()
        await Promise.all([
            fetchDocuments(userId, canManage),
            fetchLabels(),
            fetchUsers()
        ])
    }
}))

export default useDocumentStore
