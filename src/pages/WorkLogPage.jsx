import { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, FileText, Upload, Trash2, Calendar, Download, File, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const WorkLogPage = () => {
    const { profile, isAdmin } = useAuth()
    const [worklogs, setWorklogs] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedWorklog, setSelectedWorklog] = useState(null)
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        work_date: new Date().toISOString().split('T')[0],
        morning_work: '',
        afternoon_work: '',
        next_day_work: '',
        special_notes: '',
        rescue_situations: [],
        files: []
    })

    const emptyRescueRow = {
        number: '',
        location: '',
        name: '',
        request_date: '',
        status: '',
        details: ''  // 상세 진행상황
    }

    const [selectedRescueIndex, setSelectedRescueIndex] = useState(null)

    useEffect(() => {
        fetchWorklogs()
    }, [])

    // 날짜 변경 시 전날 구조현황 자동 로드
    useEffect(() => {
        if (formData.work_date) {
            loadPreviousDayRescue()
        }
    }, [formData.work_date])

    const loadPreviousDayRescue = async () => {
        try {
            const selectedDate = new Date(formData.work_date)
            const previousDate = new Date(selectedDate)
            previousDate.setDate(previousDate.getDate() - 1)
            const prevDateStr = previousDate.toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('work_logs')
                .select('rescue_situations')
                .eq('user_id', profile.user_id)
                .eq('work_date', prevDateStr)
                .single()

            if (!error && data && data.rescue_situations && data.rescue_situations.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    rescue_situations: data.rescue_situations.map((item, index) => ({
                        ...item,
                        number: index + 1
                    }))
                }))
            }
        } catch (error) {
            // 전날 데이터 없음 - 정상
            console.log('No previous day data')
        }
    }

    const fetchWorklogs = async () => {
        try {
            let query = supabase
                .from('work_logs')
                .select(`
                    *,
                    user:users!work_logs_user_id_fkey(name, team, rank)
                `)
                .order('work_date', { ascending: false })

            // Non-admin users can only see their own logs
            if (!isAdmin && profile) {
                query = query.eq('user_id', profile.user_id)
            }

            const { data, error } = await query

            if (error) throw error
            setWorklogs(data || [])
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

    const addRescueRow = () => {
        setFormData(prev => ({
            ...prev,
            rescue_situations: [...prev.rescue_situations, { ...emptyRescueRow, number: prev.rescue_situations.length + 1 }]
        }))
    }

    const removeRescueRow = (index) => {
        setFormData(prev => ({
            ...prev,
            rescue_situations: prev.rescue_situations.filter((_, i) => i !== index)
                .map((row, i) => ({ ...row, number: i + 1 }))
        }))
    }

    const updateRescueRow = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            rescue_situations: prev.rescue_situations.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
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
                work_date: formData.work_date,
                morning_work: formData.morning_work,
                afternoon_work: formData.afternoon_work,
                next_day_work: formData.next_day_work,
                special_notes: formData.special_notes,
                rescue_situations: formData.rescue_situations,
                file_urls: fileUrls,
                user_id: profile.user_id,
                is_read: false
            })

            if (error) throw error

            setIsModalOpen(false)
            resetForm()
            fetchWorklogs()
            alert('업무일지가 저장되었습니다.')
        } catch (error) {
            console.error('Error creating worklog:', error)
            alert('업무일지 저장에 실패했습니다: ' + error.message)
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
            rescue_situations: [],
            files: []
        })
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

        // 관리자가 읽지 않은 일지를 읽으면 is_read 업데이트
        if (isAdmin && !worklog.is_read) {
            await supabase
                .from('work_logs')
                .update({ is_read: true })
                .eq('id', worklog.id)
            fetchWorklogs()
        }
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

    return (
        <div className="space-y-6">
            {/* User Info Header */}
            <Card className="bg-toss-blue text-white">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-1">
                            {isAdmin ? '전체 업무일지' : `${profile?.name || '사용자'}님의 업무일지`}
                        </h2>
                        <p className="text-white/90">
                            {isAdmin ? '관리자 권한으로 모든 직원의 업무일지를 확인할 수 있습니다' :
                             `${profile?.team ? `${profile.team} · ` : ''}${profile?.rank || '직급 미설정'}`}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-toss-gray-900">업무일지</h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    새 업무일지 작성
                </Button>
            </div>

            {/* Worklog List */}
            <div className="grid gap-4">
                {loading ? (
                    <Card>
                        <div className="text-center text-toss-gray-500 py-8">
                            로딩 중...
                        </div>
                    </Card>
                ) : worklogs.length > 0 ? (
                    worklogs.map((log) => (
                        <Card
                            key={log.id}
                            className={`hover:shadow-toss-lg transition-shadow cursor-pointer ${
                                isAdmin && !log.is_read ? 'bg-blue-50 border-2 border-blue-200' : ''
                            }`}
                            onClick={() => viewWorklogDetail(log)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className="text-sm bg-toss-gray-100 text-toss-gray-600 px-3 py-1 rounded-full flex items-center gap-1">
                                            <Calendar size={14} />
                                            {formatDate(log.work_date)}
                                        </span>
                                        {isAdmin && log.user && (
                                            <>
                                                <span className="text-sm text-toss-gray-500">
                                                    {log.user.name} · {log.user.team || '팀 미설정'}
                                                </span>
                                                {!log.is_read && (
                                                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-medium">
                                                        NEW
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        {log.morning_work && (
                                            <p className="text-sm text-toss-gray-700">
                                                <span className="font-medium">오전:</span> {log.morning_work.substring(0, 50)}{log.morning_work.length > 50 ? '...' : ''}
                                            </p>
                                        )}
                                        {log.afternoon_work && (
                                            <p className="text-sm text-toss-gray-700">
                                                <span className="font-medium">오후:</span> {log.afternoon_work.substring(0, 50)}{log.afternoon_work.length > 50 ? '...' : ''}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 mt-2">
                                        {log.file_urls && log.file_urls.length > 0 && (
                                            <span className="inline-flex items-center gap-1 text-toss-gray-500 text-sm">
                                                <File size={16} />
                                                파일 {log.file_urls.length}개
                                            </span>
                                        )}
                                        {log.rescue_situations && log.rescue_situations.length > 0 && (
                                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-sm font-medium">
                                                구조현황 {log.rescue_situations.length}건
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {(profile?.user_id === log.user_id || isAdmin) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl ml-4 transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <div className="text-center text-toss-gray-500 py-8">
                            등록된 업무일지가 없습니다
                        </div>
                    </Card>
                )}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="새 업무일지 작성"
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* 작업일 */}
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

                    {/* 오전 업무 */}
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

                    {/* 오후 업무 */}
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

                    {/* 익일 업무 */}
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

                    {/* 특이사항(비고) */}
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

                    {/* 구조현황 테이블 */}
                    <div className="space-y-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-emerald-900 text-lg">구조현황</h3>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={addRescueRow} variant="primary">
                                    <Plus size={16} />
                                    추가
                                </Button>
                            </div>
                        </div>

                        {formData.rescue_situations.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full bg-white rounded-xl">
                                    <thead className="bg-emerald-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">번호</th>
                                            <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">체류지</th>
                                            <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">성명</th>
                                            <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">구조요청</th>
                                            <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">구조진행상황</th>
                                            <th className="px-3 py-2 text-center text-sm font-medium text-emerald-900">삭제</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.rescue_situations.map((row, index) => (
                                            <tr
                                                key={index}
                                                className={`border-t border-emerald-100 cursor-pointer transition-colors ${
                                                    selectedRescueIndex === index ? 'bg-emerald-100' : 'hover:bg-emerald-50'
                                                }`}
                                                onClick={() => setSelectedRescueIndex(index)}
                                            >
                                                <td className="px-3 py-2">
                                                    <span className="text-sm font-medium">{row.number}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.location}
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            updateRescueRow(index, 'location', e.target.value)
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        placeholder="체류지"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.name}
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            updateRescueRow(index, 'name', e.target.value)
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        placeholder="성명"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.request_date}
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            updateRescueRow(index, 'request_date', e.target.value)
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        placeholder="25.01.13"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={row.status}
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            updateRescueRow(index, 'status', e.target.value)
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                        placeholder="간략 상태"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            removeRescueRow(index)
                                                        }}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-emerald-700 text-center py-6">
                                구조현황을 추가하려면 '추가' 버튼을 클릭하세요
                            </p>
                        )}

                        {/* 상세 구조진행상황 입력 영역 */}
                        {selectedRescueIndex !== null && formData.rescue_situations[selectedRescueIndex] && (
                            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-emerald-200">
                                <label className="block text-sm font-bold text-emerald-900 mb-2">
                                    [{formData.rescue_situations[selectedRescueIndex].number}번] 상세 구조진행상황
                                    {formData.rescue_situations[selectedRescueIndex].name &&
                                        ` - ${formData.rescue_situations[selectedRescueIndex].name}`}
                                </label>
                                <textarea
                                    value={formData.rescue_situations[selectedRescueIndex].details || ''}
                                    onChange={(e) => updateRescueRow(selectedRescueIndex, 'details', e.target.value)}
                                    rows={6}
                                    className="w-full px-4 py-3 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-all"
                                    placeholder="상세한 구조진행상황을 입력하세요&#10;&#10;예시:&#10;- 1차 연락: 25.01.10 14:30 가족에게 연락&#10;- 2차 연락: 25.01.11 09:00 본인과 통화 완료&#10;- 귀국 일정: 25.01.15 예정&#10;- 비고: 건강상태 양호, 항공권 예매 완료"
                                />
                            </div>
                        )}
                    </div>

                    {/* 파일 첨부 */}
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
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="flex-1"
                            loading={uploading}
                            disabled={uploading}
                        >
                            {uploading ? '업로드 중...' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedWorklog}
                onClose={() => setSelectedWorklog(null)}
                title="업무일지 상세"
            >
                {selectedWorklog && (
                    <div className="space-y-5 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm bg-toss-gray-100 text-toss-gray-700 px-3 py-1.5 rounded-full font-medium">
                                {formatDate(selectedWorklog.work_date)}
                            </span>
                            {selectedWorklog.user && (
                                <span className="text-sm text-toss-gray-600">
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

                        {selectedWorklog.rescue_situations && selectedWorklog.rescue_situations.length > 0 && (
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                                <h4 className="font-bold text-emerald-900 text-lg mb-3">구조현황</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full bg-white rounded-xl">
                                        <thead className="bg-emerald-100">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">번호</th>
                                                <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">체류지</th>
                                                <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">성명</th>
                                                <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">구조요청</th>
                                                <th className="px-3 py-2 text-left text-sm font-medium text-emerald-900">진행상황</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedWorklog.rescue_situations.map((situation, index) => (
                                                <>
                                                    <tr key={index} className="border-t border-emerald-100">
                                                        <td className="px-3 py-2 text-sm">{situation.number}</td>
                                                        <td className="px-3 py-2 text-sm">{situation.location}</td>
                                                        <td className="px-3 py-2 text-sm font-medium">{situation.name}</td>
                                                        <td className="px-3 py-2 text-sm">{situation.request_date}</td>
                                                        <td className="px-3 py-2 text-sm">{situation.status}</td>
                                                    </tr>
                                                    {situation.details && (
                                                        <tr key={`${index}-details`} className="bg-emerald-50">
                                                            <td colSpan={5} className="px-3 py-3">
                                                                <div className="text-xs text-emerald-800 font-medium mb-1">
                                                                    상세 진행상황:
                                                                </div>
                                                                <div className="text-sm text-toss-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-emerald-200">
                                                                    {situation.details}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

export default WorkLogPage
