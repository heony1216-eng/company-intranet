import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useEvent = () => {
    const { user } = useAuth()
    const [events, setEvents] = useState([])
    const [recentEvents, setRecentEvents] = useState([])
    const [loading, setLoading] = useState(true)

    // 특정 월의 행사 조회
    const fetchEventsByMonth = useCallback(async (year, month) => {
        const startDate = new Date(year, month, 1).toISOString().split('T')[0]
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .gte('event_date', startDate)
            .lte('event_date', endDate)
            .order('event_date', { ascending: true })

        if (error) {
            console.error('Error fetching events:', error)
            return []
        }

        setEvents(data || [])
        return data || []
    }, [])

    // 최근 행사 조회
    const fetchRecentEvents = useCallback(async () => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('event_date', { ascending: false })
            .limit(10)

        if (error) {
            console.error('Error fetching recent events:', error)
            return []
        }

        setRecentEvents(data || [])
        return data || []
    }, [])

    // 행사 생성
    const createEvent = async (eventData) => {
        if (!user) return { error: '로그인이 필요합니다.' }

        const { data, error } = await supabase
            .from('events')
            .insert({
                event_date: eventData.event_date,
                title: eventData.title,
                location: eventData.location || null,
                description: eventData.description || null,
                event_type: eventData.event_type || 'general',
                start_time: eventData.start_time || null,
                end_time: eventData.end_time || null,
                created_by: user.user_id
            })
            .select()
            .single()

        if (error) {
            console.error('Create event error:', error)
        }

        return { data, error }
    }

    // 행사 수정
    const updateEvent = async (eventId, eventData) => {
        if (!user) return { error: '로그인이 필요합니다.' }

        const { data, error } = await supabase
            .from('events')
            .update({
                title: eventData.title,
                location: eventData.location || null,
                description: eventData.description || null,
                event_type: eventData.event_type || 'general',
                start_time: eventData.start_time || null,
                end_time: eventData.end_time || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', eventId)
            .select()
            .single()

        if (error) {
            console.error('Update event error:', error)
        }

        return { data, error }
    }

    // 행사 삭제
    const deleteEvent = async (eventId) => {
        if (!user) return { error: '로그인이 필요합니다.' }

        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId)

        if (error) {
            console.error('Delete event error:', error)
        }

        return { error }
    }

    // 초기 데이터 로드
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const now = new Date()
            await fetchEventsByMonth(now.getFullYear(), now.getMonth())
            await fetchRecentEvents()
            setLoading(false)
        }

        loadData()
    }, [fetchEventsByMonth, fetchRecentEvents])

    return {
        events,
        recentEvents,
        loading,
        fetchEventsByMonth,
        fetchRecentEvents,
        createEvent,
        updateEvent,
        deleteEvent
    }
}

export default useEvent
