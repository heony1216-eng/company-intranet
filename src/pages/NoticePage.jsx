import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, Button, Modal } from '../components/common'
import { Plus, Pin, ChevronLeft, Trash2, Edit } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const NoticePage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { isAdmin, profile } = useAuth()
    const [notices, setNotices] = useState([])
    const [selectedNotice, setSelectedNotice] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isCreateMode, setIsCreateMode] = useState(false)
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({ title: '', content: '', is_pinned: false })

    useEffect(() => {
        fetchNotices()
    }, [])

    useEffect(() => {
        if (id) {
            fetchNoticeDetail(id)
        } else {
            setSelectedNotice(null)
        }
    }, [id])

    const fetchNotices = async () => {
        try {
            const { data, error } = await supabase
                .from('notices')
                .select('*, author:users(name)')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            setNotices(data || [])
        } catch (error) {
            console.error('Error fetching notices:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchNoticeDetail = async (noticeId) => {
        try {
            const { data, error } = await supabase
                .from('notices')
                .select('*, author:users(name)')
                .eq('id', noticeId)
                .single()

            if (error) throw error
            setSelectedNotice(data)
        } catch (error) {
            console.error('Error fetching notice:', error)
        }
    }

    const handleCreate = async () => {
        if (!formData.title || !formData.content) {
            alert('제목과 내용을 입력해주세요.')
            return
        }

        try {
            const { error } = await supabase.from('notices').insert({
                title: formData.title,
                content: formData.content,
                is_pinned: formData.is_pinned,
                author_id: profile.user_id
            })

            if (error) throw error
            setIsModalOpen(false)
            setFormData({ title: '', content: '', is_pinned: false })
            fetchNotices()
            alert('공지사항이 등록되었습니다.')
        } catch (error) {
            console.error('Error creating notice:', error)
            alert('공지사항 등록에 실패했습니다: ' + error.message)
        }
    }

    const handleUpdate = async () => {
        try {
            const { error } = await supabase
                .from('notices')
                .update({
                    title: formData.title,
                    content: formData.content,
                    is_pinned: formData.is_pinned,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedNotice.id)

            if (error) throw error
            setIsModalOpen(false)
            fetchNotices()
            fetchNoticeDetail(selectedNotice.id)
        } catch (error) {
            console.error('Error updating notice:', error)
        }
    }

    const handleDelete = async (noticeId) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const { error } = await supabase.from('notices').delete().eq('id', noticeId)
            if (error) throw error
            navigate('/notices')
            fetchNotices()
        } catch (error) {
            console.error('Error deleting notice:', error)
        }
    }

    const openEditModal = (notice) => {
        setFormData({
            title: notice.title,
            content: notice.content,
            is_pinned: notice.is_pinned
        })
        setIsCreateMode(false)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        setFormData({ title: '', content: '', is_pinned: false })
        setIsCreateMode(true)
        setIsModalOpen(true)
    }

    // Detail View
    if (selectedNotice) {
        return (
            <div className="space-y-6">
                <Link
                    to="/notices"
                    className="inline-flex items-center gap-2 text-toss-gray-500 hover:text-toss-gray-700"
                >
                    <ChevronLeft size={20} />
                    목록으로
                </Link>

                <Card>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            {selectedNotice.is_pinned && (
                                <span className="bg-toss-blue text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <Pin size={12} /> 고정
                                </span>
                            )}
                        </div>
                        {isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(selectedNotice)}
                                    className="p-2 text-toss-gray-500 hover:bg-toss-gray-100 rounded-toss"
                                >
                                    <Edit size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedNotice.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-toss"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-toss-gray-900 mb-2">
                        {selectedNotice.title}
                    </h1>

                    <div className="flex items-center gap-4 text-sm text-toss-gray-500 mb-6 pb-6 border-b border-toss-gray-100">
                        <span>{selectedNotice.author?.name || '관리자'}</span>
                        <span>{new Date(selectedNotice.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</span>
                    </div>

                    <div className="prose max-w-none text-toss-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedNotice.content}
                    </div>
                </Card>
            </div>
        )
    }

    // List View
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-toss-gray-900">공지사항</h1>
                {isAdmin && (
                    <Button onClick={openCreateModal}>
                        <Plus size={18} />
                        새 공지 작성
                    </Button>
                )}
            </div>

            <Card padding="p-0">
                {loading ? (
                    <div className="p-8 text-center text-toss-gray-500">
                        로딩 중...
                    </div>
                ) : notices.length > 0 ? (
                    <div className="divide-y divide-toss-gray-100">
                        {notices.map((notice) => (
                            <Link
                                key={notice.id}
                                to={`/notices/${notice.id}`}
                                className="block p-4 hover:bg-toss-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {notice.is_pinned && (
                                        <span className="bg-toss-blue text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Pin size={10} /> 고정
                                        </span>
                                    )}
                                    <h3 className="font-medium text-toss-gray-900 flex-1 truncate">
                                        {notice.title}
                                    </h3>
                                    <span className="text-sm text-toss-gray-400 shrink-0">
                                        {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                                <p className="text-sm text-toss-gray-500 mt-1 truncate">
                                    {notice.content}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-toss-gray-500">
                        등록된 공지사항이 없습니다
                    </div>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isCreateMode ? '새 공지 작성' : '공지 수정'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            제목
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                            placeholder="공지 제목을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            내용
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue resize-none"
                            placeholder="공지 내용을 입력하세요"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.is_pinned}
                            onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                            className="w-5 h-5 rounded border-toss-gray-300 text-toss-blue focus:ring-toss-blue"
                        />
                        <span className="text-sm text-toss-gray-700">상단 고정</span>
                    </label>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={isCreateMode ? handleCreate : handleUpdate}
                            className="flex-1"
                        >
                            {isCreateMode ? '작성하기' : '수정하기'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default NoticePage
