import { useState, useEffect } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, Trash2, Edit2, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const RescuePage = () => {
    const { profile, isAdmin } = useAuth()
    const [rescueSituations, setRescueSituations] = useState([])
    const [filteredRescueSituations, setFilteredRescueSituations] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedRescue, setSelectedRescue] = useState(null)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    const [formData, setFormData] = useState({
        number: '',
        location: '',
        name: '',
        request_date: '',
        status: '',
        details: '',
        is_completed: false
    })

    useEffect(() => {
        fetchRescueSituations()
    }, [])

    useEffect(() => {
        // 모든 데이터 표시 (필터링 없음)
        console.log('[RescuePage] rescueSituations updated:', rescueSituations.length, 'items')
        setFilteredRescueSituations(rescueSituations)
        setCurrentPage(1)
    }, [rescueSituations])

    const fetchRescueSituations = async () => {
        try {
            console.log('[RescuePage] Fetching rescue situations...')
            const { data, error } = await supabase
                .from('rescue_situations')
                .select('*')
                .order('created_at', { ascending: false })

            console.log('[RescuePage] Fetch result:', { data, error })

            if (error) {
                console.error('[RescuePage] Fetch error:', error)
                throw error
            }

            console.log('[RescuePage] Setting rescue situations:', data?.length || 0, 'items')
            setRescueSituations(data || [])
        } catch (error) {
            console.error('[RescuePage] Error fetching rescue situations:', error)
            alert('데이터 조회 중 오류가 발생했습니다: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            number: '',
            location: '',
            name: '',
            request_date: '',
            status: '',
            details: '',
            is_completed: false
        })
        setIsEditMode(false)
        setSelectedRescue(null)
    }

    const handleCreate = async () => {
        if (!formData.name || !formData.location) {
            alert('성명과 체류지는 필수 입력 항목입니다.')
            return
        }

        try {
            console.log('[RescuePage] Creating rescue situation with data:', {
                ...formData,
                user_id: profile.user_id
            })

            const { data, error } = await supabase.from('rescue_situations').insert({
                ...formData,
                user_id: profile.user_id
            }).select()

            console.log('[RescuePage] Insert result:', { data, error })

            if (error) {
                console.error('[RescuePage] Insert error:', error)
                throw error
            }

            console.log('[RescuePage] Successfully created, now fetching...')
            setIsModalOpen(false)
            resetForm()
            await fetchRescueSituations()
            alert('구조현황이 저장되었습니다.')
        } catch (error) {
            console.error('[RescuePage] Error creating rescue situation:', error)
            alert('구조현황 저장에 실패했습니다: ' + error.message)
        }
    }

    const handleEdit = async () => {
        if (!formData.name || !formData.location) {
            alert('성명과 체류지는 필수 입력 항목입니다.')
            return
        }

        try {
            const { error } = await supabase
                .from('rescue_situations')
                .update(formData)
                .eq('id', selectedRescue.id)

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchRescueSituations()
            alert('구조현황이 수정되었습니다.')
        } catch (error) {
            console.error('Error updating rescue situation:', error)
            alert('구조현황 수정에 실패했습니다: ' + error.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const { error } = await supabase.from('rescue_situations').delete().eq('id', id)
            if (error) throw error
            fetchRescueSituations()
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting rescue situation:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    const toggleComplete = async (rescue) => {
        try {
            const { error } = await supabase
                .from('rescue_situations')
                .update({ is_completed: !rescue.is_completed })
                .eq('id', rescue.id)

            if (error) throw error
            fetchRescueSituations()
        } catch (error) {
            console.error('Error toggling complete:', error)
            alert('상태 변경에 실패했습니다.')
        }
    }

    const openEditModal = (rescue) => {
        setFormData(rescue)
        setSelectedRescue(rescue)
        setIsEditMode(true)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    // 페이지네이션
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredRescueSituations.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredRescueSituations.length / itemsPerPage)

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="bg-toss-blue text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">구조현황 관리</h2>
                        <p className="text-white/90">
                            {isAdmin ? '전체 구조현황을 관리할 수 있습니다' : '구조현황을 등록하고 관리하세요'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-toss-gray-900">구조현황</h1>
                <Button onClick={openCreateModal}>
                    <Plus size={18} />
                    새 구조현황 등록
                </Button>
            </div>

            {/* Table */}
            <Card>
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-8">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-toss-blue/10 border-b-2 border-toss-blue/20">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-16">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">체류지</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">성명</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">구조요청</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-900">진행상황</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-20">완료</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-900 w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-100">
                                    {currentItems.map((rescue, index) => (
                                        <tr key={rescue.id} className={`hover:bg-toss-gray-50 transition-colors ${rescue.is_completed ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-3 text-sm text-center text-toss-gray-600">
                                                {filteredRescueSituations.length - (indexOfFirstItem + index)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-900">{rescue.location || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-900 font-medium">{rescue.name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-700">{rescue.request_date || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-toss-gray-700">{rescue.status || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={rescue.is_completed || false}
                                                    onChange={() => toggleComplete(rescue)}
                                                    className="w-5 h-5 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {(profile?.user_id === rescue.user_id || isAdmin) && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(rescue)}
                                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                                title="수정"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(rescue.id)}
                                                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                                title="삭제"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-toss-gray-200">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded-lg text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    이전
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => goToPage(i + 1)}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                            currentPage === i + 1
                                                ? 'bg-toss-blue text-white'
                                                : 'text-toss-gray-700 hover:bg-toss-gray-100'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 rounded-lg text-sm font-medium text-toss-gray-700 hover:bg-toss-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-toss-gray-500 py-8">
                        등록된 구조현황이 없습니다
                    </div>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    resetForm()
                }}
                title={isEditMode ? '구조현황 수정' : '새 구조현황 등록'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            체류지 *
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="체류지를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            성명 *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="성명을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            구조요청 일자
                        </label>
                        <input
                            type="text"
                            value={formData.request_date}
                            onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="예: 25.01.13"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            진행상황 (간략)
                        </label>
                        <input
                            type="text"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                            placeholder="현재 진행상황을 간략히 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            상세 구조진행상황
                        </label>
                        <textarea
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            rows={8}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="상세한 구조진행상황을 입력하세요&#10;&#10;예시:&#10;- 1차 연락: 25.01.10 14:30 가족에게 연락&#10;- 2차 연락: 25.01.11 09:00 본인과 통화 완료&#10;- 귀국 일정: 25.01.15 예정&#10;- 비고: 건강상태 양호, 항공권 예매 완료"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_completed"
                            checked={formData.is_completed || false}
                            onChange={(e) => setFormData({ ...formData, is_completed: e.target.checked })}
                            className="w-5 h-5 text-toss-blue border-gray-300 rounded focus:ring-toss-blue cursor-pointer"
                        />
                        <label htmlFor="is_completed" className="text-sm font-medium text-toss-gray-700 cursor-pointer">
                            완료 처리
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsModalOpen(false)
                                resetForm()
                            }}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={isEditMode ? handleEdit : handleCreate}
                            className="flex-1"
                        >
                            {isEditMode ? '수정하기' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default RescuePage
