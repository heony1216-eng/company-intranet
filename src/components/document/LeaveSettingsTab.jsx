import { useState, useMemo } from 'react'
import { Card } from '../common'
import { Users, Search, Edit3, Save, X } from 'lucide-react'

const LeaveSettingsTab = ({
    users,
    allLeaves,
    onSaveTotalDays
}) => {
    const [leaveSearchTerm, setLeaveSearchTerm] = useState('')
    const [editingUserId, setEditingUserId] = useState(null)
    const [editTotalDays, setEditTotalDays] = useState('')
    const [savingUserId, setSavingUserId] = useState(null)

    // 사용자별 연차 정보 가져오기
    const getLeaveInfo = (userId) => {
        return allLeaves.find(l => l.user_id === userId)
    }

    // 연차 설정 검색 필터
    const filteredLeaveUsers = useMemo(() => {
        if (!leaveSearchTerm) return users
        return users.filter(u =>
            u.name?.toLowerCase().includes(leaveSearchTerm.toLowerCase()) ||
            u.team?.toLowerCase().includes(leaveSearchTerm.toLowerCase())
        )
    }, [users, leaveSearchTerm])

    // 연차 수정 시작
    const handleEditStart = (userId, total) => {
        setEditingUserId(userId)
        setEditTotalDays(total.toString())
    }

    // 연차 저장
    const handleSaveTotalDays = async (userId) => {
        const totalDays = parseFloat(editTotalDays)
        if (isNaN(totalDays) || totalDays < 0) {
            alert('올바른 연차 일수를 입력해주세요')
            return
        }
        setSavingUserId(userId)
        try {
            await onSaveTotalDays(userId, totalDays)
            setEditingUserId(null)
        } catch (err) {
            alert('저장 중 오류가 발생했습니다')
        } finally {
            setSavingUserId(null)
        }
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-toss-gray-900 flex items-center gap-2">
                    <Users className="text-toss-blue" size={20} />
                    직원별 연차 현황
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" size={16} />
                    <input
                        type="text"
                        value={leaveSearchTerm}
                        onChange={(e) => setLeaveSearchTerm(e.target.value)}
                        placeholder="이름 또는 팀으로 검색"
                        className="pl-9 pr-4 py-2 bg-toss-gray-50 border border-toss-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-toss-blue focus:border-transparent"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-toss-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">이름</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-toss-gray-500">팀</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">총 연차</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">사용</th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-toss-gray-500">잔여</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeaveUsers.map((u) => {
                            const leave = getLeaveInfo(u.user_id)
                            const total = leave?.total_days || 15
                            const used = leave?.used_days || 0
                            const remaining = total - used
                            const isEditing = editingUserId === u.user_id
                            const isSaving = savingUserId === u.user_id

                            return (
                                <tr key={u.user_id} className="border-b border-toss-gray-100 hover:bg-toss-gray-50">
                                    <td className="py-3 px-4">
                                        <p className="font-medium text-toss-gray-900">{u.name}</p>
                                        {u.rank && <p className="text-xs text-toss-gray-500">{u.rank}</p>}
                                    </td>
                                    <td className="py-3 px-4 text-toss-gray-600">{u.team || '-'}</td>
                                    <td className="py-3 px-4 text-center">
                                        {isEditing ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <input
                                                    type="number"
                                                    value={editTotalDays}
                                                    onChange={(e) => setEditTotalDays(e.target.value)}
                                                    step="0.5"
                                                    min="0"
                                                    className="w-16 px-2 py-1 text-center bg-white border border-toss-gray-300 rounded-lg text-sm"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveTotalDays(u.user_id)} disabled={isSaving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                    {isSaving ? <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                                                </button>
                                                <button onClick={() => setEditingUserId(null)} disabled={isSaving} className="p-1 text-toss-gray-500 hover:bg-toss-gray-100 rounded"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditStart(u.user_id, total)} className="inline-flex items-center gap-1 text-toss-gray-900 hover:text-toss-blue transition-colors group">
                                                {total}일<Edit3 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center text-toss-blue font-medium">{used}일</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`font-bold ${remaining <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>{remaining}일</span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {filteredLeaveUsers.length === 0 && (
                <div className="py-12 text-center text-toss-gray-500">검색 결과가 없습니다</div>
            )}
        </Card>
    )
}

export default LeaveSettingsTab
