import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useDocumentLedger() {
  const { profile, isAdmin, isSubAdmin } = useAuth()
  const [labels, setLabels] = useState([])
  const [ledgerData, setLedgerData] = useState([])
  const [selectedLabel, setSelectedLabel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 라벨 목록 조회 (모든 라벨 조회 - 누구나 볼 수 있음)
  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('document_ledger_labels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setLabels(data || [])

      // 첫 번째 라벨 자동 선택 (자기 팀 라벨 우선)
      if (data && data.length > 0 && !selectedLabel) {
        const myTeamLabel = data.find(label => label.name === profile?.team)
        setSelectedLabel(myTeamLabel || data[0])
      }
    } catch (err) {
      setError(err.message)
      console.error('라벨 조회 에러:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedLabel, profile?.team])

  // 라벨 추가
  const addLabel = async (name) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('document_ledger_labels')
        .insert([{ name }])
        .select()
        .single()

      if (error) throw error
      setLabels(prev => [...prev, data])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      console.error('라벨 추가 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 라벨 수정
  const updateLabel = async (id, name) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('document_ledger_labels')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setLabels(prev => prev.map(label => label.id === id ? data : label))
      if (selectedLabel?.id === id) {
        setSelectedLabel(data)
      }
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      console.error('라벨 수정 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 라벨 삭제
  const deleteLabel = async (id) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('document_ledger_labels')
        .delete()
        .eq('id', id)

      if (error) throw error
      setLabels(prev => prev.filter(label => label.id !== id))

      // 삭제된 라벨이 선택된 상태였다면 다른 라벨 선택
      if (selectedLabel?.id === id) {
        const remaining = labels.filter(l => l.id !== id)
        setSelectedLabel(remaining.length > 0 ? remaining[0] : null)
      }
      return { success: true }
    } catch (err) {
      setError(err.message)
      console.error('라벨 삭제 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 문서 대장 데이터 조회
  const fetchLedgerData = useCallback(async (labelId) => {
    if (!labelId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('document_ledger')
        .select('*')
        .eq('label_id', labelId)
        .order('row_number', { ascending: true })

      if (error) throw error
      setLedgerData(data || [])
    } catch (err) {
      setError(err.message)
      console.error('대장 데이터 조회 에러:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 문서 대장 항목 추가
  const addLedgerItem = async (item) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('document_ledger')
        .insert([item])
        .select()
        .single()

      if (error) throw error
      setLedgerData(prev => [...prev, data].sort((a, b) => a.row_number - b.row_number))
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      console.error('항목 추가 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 문서 대장 항목 수정
  const updateLedgerItem = async (id, updates) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('document_ledger')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setLedgerData(prev => prev.map(item => item.id === id ? data : item))
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      console.error('항목 수정 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 문서 대장 항목 삭제 및 연번 재정렬
  const deleteLedgerItem = async (id) => {
    try {
      setLoading(true)

      // 1. 항목 삭제
      const { error } = await supabase
        .from('document_ledger')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 2. 남은 항목들 연번 재정렬
      const remainingItems = ledgerData
        .filter(item => item.id !== id)
        .sort((a, b) => a.row_number - b.row_number)

      // 3. DB에서 연번 업데이트
      const updates = remainingItems.map((item, index) => ({
        id: item.id,
        row_number: index + 1
      }))

      for (const update of updates) {
        if (update.row_number !== remainingItems.find(item => item.id === update.id)?.row_number) {
          await supabase
            .from('document_ledger')
            .update({ row_number: update.row_number })
            .eq('id', update.id)
        }
      }

      // 4. 로컬 상태 업데이트 (재정렬된 연번 적용)
      setLedgerData(remainingItems.map((item, index) => ({
        ...item,
        row_number: index + 1
      })))

      return { success: true }
    } catch (err) {
      setError(err.message)
      console.error('항목 삭제 에러:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 다음 연번 가져오기
  const getNextRowNumber = () => {
    if (ledgerData.length === 0) return 1
    return Math.max(...ledgerData.map(item => item.row_number)) + 1
  }

  // 초기 라벨 로드 (프로필 로드 후)
  useEffect(() => {
    if (profile) {
      fetchLabels()
    }
  }, [profile?.team, isAdmin, isSubAdmin])

  // 선택된 라벨 변경 시 데이터 로드
  useEffect(() => {
    if (selectedLabel?.id) {
      fetchLedgerData(selectedLabel.id)
    }
  }, [selectedLabel?.id, fetchLedgerData])

  return {
    // 상태
    labels,
    ledgerData,
    selectedLabel,
    loading,
    error,

    // 라벨 관련
    setSelectedLabel,
    addLabel,
    updateLabel,
    deleteLabel,
    fetchLabels,

    // 대장 데이터 관련
    fetchLedgerData,
    addLedgerItem,
    updateLedgerItem,
    deleteLedgerItem,
    getNextRowNumber,
  }
}
