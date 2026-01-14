import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, FileText, Upload, Trash2, Calendar, Download, File, X, Edit2, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const WorkLog2Page = () => {
    const { profile, isAdmin } = useAuth()
    const [worklogs, setWorklogs] = useState([])
    const [filteredWorklogs, setFilteredWorklogs] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedWorklog, setSelectedWorklog] = useState(null)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedUserId, setSelectedUserId] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        work_date: new Date().toISOString().split('T')[0],
        morning_work: '',
        afternoon_work: '',
        next_day_work: '',
        special_notes: '',
        files: [],
        existingFileUrls: []
    })

    const startYear = 2026
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)

    useEffect(() => {
        fetchWorklogs()
    }, [])

    useEffect(() => {
        filterWorklogsByDate()
    }, [worklogs, selectedYear, selectedMonth, selectedUserId])

    const filterWorklogsByDate = () => {
        const filtered = worklogs.filter(log => {
            const logDate = new Date(log.work_date)
            const dateMatch = logDate.getFullYear() === selectedYear && logDate.getMonth() + 1 === selectedMonth
            const userMatch = selectedUserId === 'all' || log.user_id === selectedUserId
            return dateMatch && userMatch
        })
        setFilteredWorklogs(filtered)
        setCurrentPage(1)
    }

    const uniqueUsers = Array.from(new Set(worklogs.map(log => log.user_id)))
        .map(userId => {
            const log = worklogs.find(l => l.user_id === userId)
            return { user_id: userId, name: log?.user?.name || '알 수 없음' }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

    const fetchWorklogs = async () => {
        try {
            let query = supabase
                .from('work_logs')
                .select('*')
                .eq('type', 'worklog2')
                .order('work_date', { ascending: false })

            if (!isAdmin && profile) {
                query = query.eq('user_id', profile.user_id)
            }

            const { data: worklogsData, error: worklogsError } = await query

            if (worklogsError) throw worklogsError

            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('user_id, name, team, rank')

            if (usersError) throw usersError

            const worklogsWithUsers = worklogsData.map(worklog => {
                const user = usersData.find(u => u.user_id === worklog.user_id)
                return {
                    ...worklog,
                    user: user || { name: '알 수 없음', team: '-', rank: '-' }
                }
            })

            setWorklogs(worklogsWithUsers || [])
        } catch (error) {
            console.error('Error fetching worklogs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        const fileData = selectedFiles.map(file => ({
            file,
            name: file.name,
            size: (file.size / 1024).toFixed(0) + 'KB'
        }))
        setFormData(prev => ({
            ...prev,
            files: [...prev.files, ...fileData]
        }))
    }

    const removeFile = (index) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }))
    }

    const removeExistingFile = (index) => {
        setFormData(prev => ({
            ...prev,
            existingFileUrls: prev.existingFileUrls.filter((_, i) => i !== index)
        }))
    }

    const uploadFiles = async (files) => {
        const urls = await Promise.all(
            files.map(async (fileData) => {
                const fileName = `${profile.user_id}/${Date.now()}_${fileData.file.name}`
                const { error } = await supabase.storage
                    .from('work_log_files')
                    .upload(fileName, fileData.file)

                if (error) throw error

                const { data: urlData } = supabase.storage
                    .from('work_log_files')
                    .getPublicUrl(fileName)

                return urlData.publicUrl
            })
        )
        return urls
    }

    const handleCreate = async () => {
        if (!formData.morning_work && !formData.afternoon_work) {
            alert('오전 또는 오후 업무 중 하나는 입력해주세요.')
            return
        }

        try {
            setUploading(true)
            let fileUrls = []

            if (formData.files.length > 0) {
                fileUrls = await uploadFiles(formData.files)
            }

            const { error } = await supabase.from('work_logs').insert({
                type: 'worklog2',
                work_date: formData.work_date,
                morning_work: formData.morning_work,
                afternoon_work: formData.afternoon_work,
                next_day_work: formData.next_day_work,
                special_notes: formData.special_notes,
                file_urls: fileUrls,
                user_id: profile.user_id,
                is_read: false
            })

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('업무일지2가 저장되었습니다.')
        } catch (error) {
            console.error('Error creating worklog:', error)
            alert('업무일지2 저장에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        if (!formData.morning_work && !formData.afternoon_work) {
            alert('오전 또는 오후 업무 중 하나는 입력해주세요.')
            return
        }

        try {
            setUploading(true)
            let newFileUrls = []

            if (formData.files.length > 0) {
                newFileUrls = await uploadFiles(formData.files)
            }

            const allFileUrls = [...formData.existingFileUrls, ...newFileUrls]

            const { error } = await supabase
                .from('work_logs')
                .update({
                    work_date: formData.work_date,
                    morning_work: formData.morning_work,
                    afternoon_work: formData.afternoon_work,
                    next_day_work: formData.next_day_work,
                    special_notes: formData.special_notes,
                    file_urls: allFileUrls
                })
                .eq('id', selectedWorklog.id)

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('업무일지2가 수정되었습니다.')
        } catch (error) {
            console.error('Error updating worklog:', error)
            alert('업무일지2 수정에 실패했습니다: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            work_date: new Date().toISOString().split('T')[0],
            morning_work: '',
            afternoon_work: '',
            next_day_work: '',
            special_notes: '',
            files: [],
            existingFileUrls: []
        })
        setIsEditMode(false)
        setSelectedWorklog(null)
    }

    const openEditModal = (worklog) => {
        setFormData({
            work_date: worklog.work_date,
            morning_work: worklog.morning_work || '',
            afternoon_work: worklog.afternoon_work || '',
            next_day_work: worklog.next_day_work || '',
            special_notes: worklog.special_notes || '',
            files: [],
            existingFileUrls: worklog.file_urls || []
        })
        setSelectedWorklog(worklog)
        setIsEditMode(true)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const handleDelete = async (worklogId) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const { error } = await supabase.from('work_logs').delete().eq('id', worklogId)
            if (error) throw error
            fetchWorklogs()
            alert('삭제되었습니다.')
        } catch (error) {
            console.error('Error deleting worklog:', error)
            alert('삭제에 실패했습니다.')
        }
    }

    const viewWorklogDetail = async (worklog) => {
        setSelectedWorklog(worklog)

        if (isAdmin && !worklog.is_read) {
            await supabase
                .from('work_logs')
                .update({ is_read: true })
                .eq('id', worklog.id)
            fetchWorklogs()
        }
    }

    const handlePrint = (worklog) => {
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <html>
                <head>
                    <title>업무일지2 - ${formatDate(worklog.work_date)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .section { margin: 20px 0; }
                        .section h2 { background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
                        .section p { margin: 10px 0; white-space: pre-wrap; }
                    </style>
                </head>
                <body>
                    <h1>업무일지2</h1>
                    <p><strong>날짜:</strong> ${formatDate(worklog.work_date)}</p>
                    <p><strong>작성자:</strong> ${worklog.user?.name} (${worklog.user?.team})</p>
                    ${worklog.morning_work ? `<div class="section"><h2>오전 업무</h2><p>${worklog.morning_work}</p></div>` : ''}
                    ${worklog.afternoon_work ? `<div class="section"><h2>오후 업무</h2><p>${worklog.afternoon_work}</p></div>` : ''}
                    ${worklog.next_day_work ? `<div class="section"><h2>익일 업무</h2><p>${worklog.next_day_work}</p></div>` : ''}
                    ${worklog.special_notes ? `<div class="section"><h2>특이사항</h2><p>${worklog.special_notes}</p></div>` : ''}
                </body>
            </html>
        `)
        printWindow.document.close()
        printWindow.print()
    }

    const getWeekday = (dateString) => {
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
        const date = new Date(dateString)
        return days[date.getDay()]
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) + ` (${getWeekday(dateString)})`
    }

    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentItems = filteredWorklogs.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(filteredWorklogs.length / itemsPerPage)

    const goToPage = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    return (
        <div className="space-y-6">
            <Card className="bg-toss-blue text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">
                            {isAdmin ? '전체 업무일지2' : `${profile?.name || '사용자'}님의 업무일지2`}
                        </h2>
                        <p className="text-white/90">
                            {isAdmin ? '관리자 권한으로 모든 직원의 업무일지2를 확인할 수 있습니다' :
                             `${profile?.team ? `${profile.team} · ` : ''}${profile?.rank || '직급 미설정'}`}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-toss-gray-900">업무일지2</h1>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}년</option>
                        ))}
                    </select>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                    >
                        {months.map(month => (
                            <option key={month} value={month}>{month}월</option>
                        ))}
                    </select>

                    {isAdmin && uniqueUsers.length > 0 && (
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="px-4 py-2 bg-white border border-toss-gray-300 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                        >
                            <option value="all">전체 작성자</option>
                            {uniqueUsers.map(user => (
                                <option key={user.user_id} value={user.user_id}>{user.name}</option>
                            ))}
                        </select>
                    )}

                    <Button onClick={openCreateModal}>
                        <Plus size={18} />
                        새 업무일지2 작성
                    </Button>
                </div>
            </div>

            <Card>
                {loading ? (
                    <div className="text-center text-toss-gray-500 py-8">로딩 중...</div>
                ) : currentItems.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-toss-gray-100 border-b-2 border-toss-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-700 w-16">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">작업일</th>
                                        {isAdmin && (
                                            <>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">작성자</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">팀</th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">오전 업무</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-toss-gray-700">오후 업무</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-toss-gray-700 w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-toss-gray-200">
                                    {currentItems.map((log, index) => (
                                        <tr
                                            key={log.id}
                                            className={`hover:bg-toss-gray-50 transition-colors ${
                                                isAdmin && !log.is_read ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-sm text-center text-toss-gray-600">
                                                {filteredWorklogs.length - (indexOfFirstItem + index)}
                                            </td>
                                            <td
                                                className="px-4 py-3 text-sm text-toss-gray-900 cursor-pointer hover:text-toss-blue"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-toss-gray-400" />
                                                    {new Date(log.work_date).toLocaleDateString('ko-KR')}
                                                    {isAdmin && !log.is_read && (
                                                        <span className="inline-block bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium ml-2">
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <>
                                                    <td
                                                        className="px-4 py-3 text-sm text-toss-gray-900 cursor-pointer hover:text-toss-blue hover:underline"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedUserId(log.user_id)
                                                        }}
                                                    >
                                                        {log.user?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-toss-gray-600">{log.user?.team || '-'}</td>
                                                </>
                                            )}
                                            <td
                                                className="px-4 py-3 text-sm text-toss-gray-700 max-w-xs truncate cursor-pointer"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                {log.morning_work || '-'}
                                            </td>
                                            <td
                                                className="px-4 py-3 text-sm text-toss-gray-700 max-w-xs truncate cursor-pointer"
                                                onClick={() => viewWorklogDetail(log)}
                                            >
                                                {log.afternoon_work || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handlePrint(log)}
                                                        className="p-2 text-toss-gray-600 hover:bg-toss-gray-100 rounded-lg transition-colors"
                                                        title="인쇄"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    {(profile?.user_id === log.user_id || isAdmin) && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(log)}
                                                                className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                                title="수정"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(log.id)}
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
                        {selectedYear}년 {selectedMonth}월에 등록된 업무일지2가 없습니다
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    resetForm()
                }}
                title={isEditMode ? '업무일지2 수정' : '새 업무일지2 작성'}
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            작업일 *
                        </label>
                        <input
                            type="date"
                            value={formData.work_date}
                            onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent transition-all"
                        />
                        <p className="text-sm text-toss-gray-500 mt-1">
                            {formatDate(formData.work_date)}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            오전 업무
                        </label>
                        <textarea
                            value={formData.morning_work}
                            onChange={(e) => setFormData({ ...formData, morning_work: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="오전에 수행한 업무를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            오후 업무
                        </label>
                        <textarea
                            value={formData.afternoon_work}
                            onChange={(e) => setFormData({ ...formData, afternoon_work: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="오후에 수행한 업무를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            익일 업무
                        </label>
                        <textarea
                            value={formData.next_day_work}
                            onChange={(e) => setFormData({ ...formData, next_day_work: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="다음날 수행할 업무를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            특이사항(비고)
                        </label>
                        <textarea
                            value={formData.special_notes}
                            onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-toss-gray-50 border border-toss-gray-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent resize-none transition-all"
                            placeholder="특이사항이나 비고사항을 입력하세요"
                        />
                    </div>

                    {isEditMode && formData.existingFileUrls.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                                기존 파일
                            </label>
                            <div className="space-y-2">
                                {formData.existingFileUrls.map((url, index) => {
                                    const fileName = url.split('/').pop()
                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 bg-toss-gray-50 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <File size={16} className="text-toss-gray-500" />
                                                <span className="text-sm text-toss-gray-700">{fileName}</span>
                                            </div>
                                            <button
                                                onClick={() => removeExistingFile(index)}
                                                className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                            파일 첨부 (모든 파일 형식)
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-6 border-2 border-dashed border-toss-gray-300 rounded-2xl hover:border-toss-blue hover:bg-toss-blue/5 transition-all"
                        >
                            <div className="flex flex-col items-center gap-2 text-toss-gray-600">
                                <Upload size={28} />
                                <span className="font-medium">파일 선택하기</span>
                                <span className="text-xs text-toss-gray-500">여러 파일 선택 가능</span>
                            </div>
                        </button>

                        {formData.files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {formData.files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-toss-gray-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <File size={16} className="text-toss-gray-500" />
                                            <span className="text-sm text-toss-gray-700">{file.name}</span>
                                            <span className="text-xs text-toss-gray-500">({file.size})</span>
                                        </div>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
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
                            loading={uploading}
                            disabled={uploading}
                        >
                            {uploading ? '업로드 중...' : isEditMode ? '수정하기' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!selectedWorklog && !isModalOpen}
                onClose={() => setSelectedWorklog(null)}
                title="업무일지2 상세"
            >
                {selectedWorklog && (
                    <div className="space-y-5 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center gap-3 flex-wrap bg-toss-blue p-4 rounded-xl -mx-6 -mt-6 mb-4">
                            <span className="text-sm bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">
                                {formatDate(selectedWorklog.work_date)}
                            </span>
                            {selectedWorklog.user && (
                                <span className="text-sm text-white/90">
                                    {selectedWorklog.user.name} · {selectedWorklog.user.team || '팀 미설정'}
                                </span>
                            )}
                        </div>

                        {selectedWorklog.morning_work && (
                            <div className="bg-amber-50 p-4 rounded-xl">
                                <h4 className="font-bold text-amber-900 mb-2">오전 업무</h4>
                                <p className="text-toss-gray-700 whitespace-pre-wrap">{selectedWorklog.morning_work}</p>
                            </div>
                        )}

                        {selectedWorklog.afternoon_work && (
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h4 className="font-bold text-blue-900 mb-2">오후 업무</h4>
                                <p className="text-toss-gray-700 whitespace-pre-wrap">{selectedWorklog.afternoon_work}</p>
                            </div>
                        )}

                        {selectedWorklog.next_day_work && (
                            <div className="bg-purple-50 p-4 rounded-xl">
                                <h4 className="font-bold text-purple-900 mb-2">익일 업무</h4>
                                <p className="text-toss-gray-700 whitespace-pre-wrap">{selectedWorklog.next_day_work}</p>
                            </div>
                        )}

                        {selectedWorklog.special_notes && (
                            <div className="bg-toss-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-toss-gray-900 mb-2">특이사항(비고)</h4>
                                <p className="text-toss-gray-700 whitespace-pre-wrap">{selectedWorklog.special_notes}</p>
                            </div>
                        )}

                        {selectedWorklog.file_urls && selectedWorklog.file_urls.length > 0 && (
                            <div>
                                <h4 className="font-bold text-toss-gray-900 mb-3">첨부 파일 ({selectedWorklog.file_urls.length}개)</h4>
                                <div className="space-y-2">
                                    {selectedWorklog.file_urls.map((url, index) => {
                                        const fileName = url.split('/').pop()
                                        return (
                                            <a
                                                key={index}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 p-3 bg-toss-gray-50 rounded-xl hover:bg-toss-gray-100 transition-colors"
                                            >
                                                <File size={16} className="text-toss-gray-500" />
                                                <span className="text-sm text-toss-blue hover:underline flex-1">{fileName}</span>
                                                <Download size={16} className="text-toss-gray-500" />
                                            </a>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default WorkLog2Page
