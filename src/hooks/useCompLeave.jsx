import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useCompLeave = () => {
    const { user } = useAuth()
    const [compLeave, setCompLeave] = useState(null)
    const [loading, setLoading] = useState(true)

    // 대체휴무 정보 조회
    const fetchCompLeave = useCallback(async () => {
        if (!user) return

        setLoading(true)

        const { data } = await supabase
            .from('comp_leaves')
            .select('*')
            .eq('user_id', user.user_id)
            .eq('year', new Date().getFullYear())
            .single()

        setCompLeave(data)
        setLoading(false)
    }, [user])

    useEffect(() => {
        fetchCompLeave()
    }, [fetchCompLeave])

    // 대체휴무 사용 (8시간 = 1일)
    const useCompLeave = async (hours) => {
        if (!compLeave) return { error: '대체휴무가 없습니다.' }

        const remainingHours = compLeave.total_hours - compLeave.used_hours
        if (hours > remainingHours) {
            return { error: '사용 가능한 대체휴무가 부족합니다.' }
        }

        const { error } = await supabase
            .from('comp_leaves')
            .update({
                used_hours: compLeave.used_hours + hours,
                updated_at: new Date().toISOString()
            })
            .eq('id', compLeave.id)

        if (!error) {
            fetchCompLeave()
        }

        return { error }
    }

    // 대체휴무 복원 (연차 삭제 시)
    const restoreCompLeave = async (hours) => {
        if (!compLeave) return { error: '대체휴무가 없습니다.' }

        const { error } = await supabase
            .from('comp_leaves')
            .update({
                used_hours: Math.max(0, compLeave.used_hours - hours),
                updated_at: new Date().toISOString()
            })
            .eq('id', compLeave.id)

        if (!error) {
            fetchCompLeave()
        }

        return { error }
    }

    // 남은 대체휴무 시간
    const remainingHours = compLeave ? compLeave.total_hours - compLeave.used_hours : 0
    // 남은 대체휴무 일수 (8시간 = 1일)
    const remainingDays = remainingHours / 8

    return {
        compLeave,
        loading,
        remainingHours,
        remainingDays,
        hasCompLeave: remainingHours > 0,
        useCompLeave,
        restoreCompLeave,
        refresh: fetchCompLeave
    }
}

export default useCompLeave
