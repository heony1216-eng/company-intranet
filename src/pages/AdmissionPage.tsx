import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, Trash2, Edit2, AlertTriangle, Eye, Building2, ChevronDown, ChevronUp, Download, Upload, LogOut, FileSpreadsheet, Printer } from 'lucide-react'
import { printReport } from '../utils/printReport'
import * as XLSX from 'xlsx'
import AdmissionDashboard from '../components/admission/AdmissionDashboard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

// 입소날짜로부터 4개월 후 퇴소날짜 계산
const calculateDischargeDate = (admissionDate: string): string => {
  if (!admissionDate) return ''
  const date = new Date(admissionDate)
  date.setMonth(date.getMonth() + 4)
  return date.toISOString().split('T')[0]
}

// 날짜 포맷팅 (YYYY-MM-DD → YYYY.MM.DD)
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  return dateStr.replace(/-/g, '.')
}

// 퇴소예정일이 한 달 이내인지 확인
const isWithinOneMonth = (dateStr: string): boolean => {
  if (!dateStr) return false
  const target = new Date(dateStr)
  const now = new Date()
  const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  return target <= oneMonthLater && target >= now
}

interface AdmissionRecord {
  id: string
  admission_date: string
  bupyeong: string
  ganghwa: string
  room: string
  discharge_date: string
  location: string
  notes: string
  is_discharged: boolean
  created_at: string
  updated_at: string
  created_by: string
}

interface FormData {
  admission_date: string
  bupyeong: string
  ganghwa: string
  room: string
  discharge_date: string
  location: string
  notes: string
}

const emptyForm: FormData = {
  admission_date: '',
  bupyeong: '',
  ganghwa: '',
  room: '',
  discharge_date: '',
  location: '',
  notes: '',
}

export default function AdmissionPage() {
  const { profile, isAdmin } = useAuth()
  const [records, setRecords] = useState<AdmissionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDischargeConfirmOpen, setIsDischargeConfirmOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AdmissionRecord | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [dischargeTargetId, setDischargeTargetId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [showDischarged, setShowDischarged] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 데이터 조회
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('admission_records')
        .select('*')
        .order('admission_date', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      console.error('입소현황 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // 입소 중 / 퇴소 완료 분리
  const activeRecordsList = records.filter(r => !r.is_discharged)
  const dischargedRecordsList = records.filter(r => r.is_discharged)

  // 추가 모달 열기
  const handleAdd = () => {
    setEditingRecord(null)
    setFormData(emptyForm)
    setIsModalOpen(true)
  }

  // 수정 모달 열기
  const handleEdit = (record: AdmissionRecord) => {
    setEditingRecord(record)
    setFormData({
      admission_date: record.admission_date || '',
      bupyeong: record.bupyeong || '',
      ganghwa: record.ganghwa || '',
      room: record.room || '',
      discharge_date: record.discharge_date || (record.bupyeong && !record.ganghwa ? '미정' : ''),
      location: record.location || '',
      notes: record.notes || '',
    })
    setIsModalOpen(true)
  }

  // 삭제 확인 모달
  const handleDeleteConfirm = (id: string) => {
    setDeleteTargetId(id)
    setIsDeleteConfirmOpen(true)
  }

  // 삭제 실행
  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      const { error } = await supabase
        .from('admission_records')
        .delete()
        .eq('id', deleteTargetId)

      if (error) throw error
      await fetchRecords()
    } catch (err) {
      console.error('삭제 오류:', err)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleteConfirmOpen(false)
      setDeleteTargetId(null)
    }
  }

  // 퇴소 확인 모달
  const handleDischargeConfirm = (id: string) => {
    setDischargeTargetId(id)
    setIsDischargeConfirmOpen(true)
  }

  // 퇴소 실행
  const handleDischarge = async () => {
    if (!dischargeTargetId) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('admission_records')
        .update({ is_discharged: true, discharge_date: today })
        .eq('id', dischargeTargetId)

      if (error) throw error
      await fetchRecords()
    } catch (err: any) {
      console.error('퇴소 처리 오류:', err)
      alert(`퇴소 처리 중 오류가 발생했습니다.\n${err?.message || JSON.stringify(err)}`)
    } finally {
      setIsDischargeConfirmOpen(false)
      setDischargeTargetId(null)
    }
  }

  // 저장 (추가/수정)
  const handleSave = async () => {
    if (!formData.admission_date) {
      alert('입소날짜를 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      // 강화에 이름이 있으면 자동 4개월 계산, 부평이면 직접 입력한 값 사용
      // "미정"이나 빈 값이면 discharge_date를 null로 저장 (DB가 date 타입)
      let dischargeDate: string | null = null
      if (formData.ganghwa) {
        dischargeDate = calculateDischargeDate(formData.admission_date)
      } else if (formData.discharge_date && formData.discharge_date !== '미정') {
        dischargeDate = formData.discharge_date
      }
      const payload = {
        admission_date: formData.admission_date,
        bupyeong: formData.bupyeong,
        ganghwa: formData.ganghwa,
        room: formData.room,
        discharge_date: dischargeDate,
        location: formData.location,
        notes: formData.notes,
      }

      if (editingRecord) {
        // 수정
        const { error } = await supabase
          .from('admission_records')
          .update(payload)
          .eq('id', editingRecord.id)
        if (error) throw error
      } else {
        // 추가
        const { error } = await supabase
          .from('admission_records')
          .insert({ ...payload, is_discharged: false })
        if (error) throw error
      }

      await fetchRecords()
      setIsModalOpen(false)
      setFormData(emptyForm)
      setEditingRecord(null)
    } catch (err: any) {
      console.error('저장 오류:', err)
      alert(`저장 중 오류가 발생했습니다.\n${err?.message || JSON.stringify(err)}`)
    } finally {
      setSaving(false)
    }
  }

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (records.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }

    const excelData = records.map((record, index) => {
      // 강화에 이름 있으면 자동 계산, 부평이면 저장된 값 사용
      const dischargeDate = record.ganghwa
        ? (record.discharge_date || calculateDischargeDate(record.admission_date))
        : (record.discharge_date || '')
      return {
        'No': index + 1,
        '입소날짜': formatDate(record.admission_date),
        '부평': record.bupyeong || '',
        '강화': record.ganghwa || '',
        '현재위치': record.location || '',
        '호실': record.room || '',
        '퇴소예정': (!record.ganghwa && record.bupyeong && !dischargeDate) ? '미정' : formatDate(dischargeDate),
        '비고': record.notes || '',
        '상태': record.is_discharged ? '퇴소' : '입소 중',
      }
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '입소현황')

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 14 },  // 입소날짜
      { wch: 15 },  // 부평
      { wch: 15 },  // 강화
      { wch: 20 },  // 현재위치
      { wch: 10 },  // 호실
      { wch: 14 },  // 퇴소예정
      { wch: 25 },  // 비고
      { wch: 10 },  // 상태
    ]

    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `입소현황_${today}.xlsx`)
  }

  // 엑셀 양식(템플릿) 다운로드
  const handleTemplateDownload = () => {
    const headers = [['입소날짜', '부평', '강화', '현재위치', '호실', '퇴소예정', '비고']]
    const ws = XLSX.utils.aoa_to_sheet(headers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '입소현황')

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 14 },  // 입소날짜
      { wch: 15 },  // 부평
      { wch: 15 },  // 강화
      { wch: 20 },  // 현재위치
      { wch: 10 },  // 호실
      { wch: 14 },  // 퇴소예정
      { wch: 25 },  // 비고
    ]

    XLSX.writeFile(wb, '입소현황_양식.xlsx')
  }

  // 엑셀 업로드 및 중복 체크
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 입력 초기화 (같은 파일 재업로드 가능하게)
    if (fileInputRef.current) fileInputRef.current.value = ''

    setUploading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

      if (rows.length === 0) {
        alert('업로드한 파일에 데이터가 없습니다.')
        return
      }

      // 날짜 파싱 헬퍼: 엑셀 시리얼 넘버 또는 문자열 → YYYY-MM-DD
      const parseDate = (val: any): string => {
        if (!val) return ''
        // 엑셀 시리얼 넘버 (숫자)
        if (typeof val === 'number') {
          const date = new Date((val - 25569) * 86400 * 1000)
          return date.toISOString().split('T')[0]
        }
        const str = String(val).trim()
        // YYYY.MM.DD 또는 YYYY-MM-DD
        const match = str.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
        if (match) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
        }
        return str
      }

      // 업로드된 행을 파싱
      const uploadedRows = rows.map(row => ({
        admission_date: parseDate(row['입소날짜']),
        bupyeong: String(row['부평'] || '').trim(),
        ganghwa: String(row['강화'] || '').trim(),
        room: String(row['호실'] || '').trim(),
        discharge_date: parseDate(row['퇴소예정']),
        location: String(row['현재위치'] || row['병원명'] || '').trim(),
        notes: String(row['비고'] || '').trim(),
      })).filter(row => row.admission_date) // 입소날짜 없는 행 제외

      if (uploadedRows.length === 0) {
        alert('유효한 데이터가 없습니다. 입소날짜가 필수입니다.')
        return
      }

      // 기존 레코드와 비교하여 중복 체크
      let insertCount = 0
      let updateCount = 0
      let skipCount = 0

      for (const row of uploadedRows) {
        // 이름(부평 또는 강화) + 입소날짜로 매칭
        const nameToMatch = row.bupyeong || row.ganghwa
        const existingRecord = records.find(r => {
          const existingName = r.bupyeong || r.ganghwa
          return existingName === nameToMatch && r.admission_date === row.admission_date
        })

        if (existingRecord) {
          // 매칭된 레코드가 있으면 변경사항 확인
          const hasChanges =
            existingRecord.room !== row.room ||
            existingRecord.location !== row.location ||
            existingRecord.notes !== row.notes ||
            existingRecord.bupyeong !== row.bupyeong ||
            existingRecord.ganghwa !== row.ganghwa

          if (hasChanges) {
            // 변경된 필드만 업데이트
            const dischargeDate = row.ganghwa
              ? calculateDischargeDate(row.admission_date)
              : (row.discharge_date || null)
            const { error } = await supabase
              .from('admission_records')
              .update({
                bupyeong: row.bupyeong,
                ganghwa: row.ganghwa,
                room: row.room,
                location: row.location,
                notes: row.notes,
                discharge_date: dischargeDate,
              })
              .eq('id', existingRecord.id)

            if (error) throw error
            updateCount++
          } else {
            // 완전히 동일하면 스킵
            skipCount++
          }
        } else {
          // 새로운 레코드 삽입
          const dischargeDate = row.ganghwa
            ? calculateDischargeDate(row.admission_date)
            : (row.discharge_date || null)
          const { error } = await supabase
            .from('admission_records')
            .insert({
              admission_date: row.admission_date,
              bupyeong: row.bupyeong,
              ganghwa: row.ganghwa,
              room: row.room,
              discharge_date: dischargeDate,
              location: row.location,
              notes: row.notes,
              is_discharged: false,
            })

          if (error) throw error
          insertCount++
        }
      }

      await fetchRecords()

      const messages = []
      if (insertCount > 0) messages.push(`신규 추가: ${insertCount}건`)
      if (updateCount > 0) messages.push(`수정: ${updateCount}건`)
      if (skipCount > 0) messages.push(`중복 스킵: ${skipCount}건`)
      alert(`업로드 완료!\n${messages.join('\n')}`)
    } catch (err: any) {
      console.error('엑셀 업로드 오류:', err)
      alert(`업로드 중 오류가 발생했습니다.\n${err?.message || JSON.stringify(err)}`)
    } finally {
      setUploading(false)
    }
  }

  // 통계 계산
  const totalRecords = records.length
  const activeCount = activeRecordsList.length
  const dischargedCount = dischargedRecordsList.length

  // 대시보드에는 입소 중인 기록만 전달
  const dashboardRecords = activeRecordsList

  // 입소현황 보고서 인쇄
  const handlePrintAdmission = () => {
    const printRecords = activeRecordsList
    const content = `
      <div class="stats-grid">
        <div class="stat-box"><div class="label">총 입소</div><div class="value">${totalRecords}<span class="unit"> 명</span></div></div>
        <div class="stat-box highlight"><div class="label">현재 입소 중</div><div class="value">${activeCount}<span class="unit"> 명</span></div></div>
        <div class="stat-box"><div class="label">퇴소 완료</div><div class="value">${dischargedCount}<span class="unit"> 명</span></div></div>
      </div>
      <div class="section-title">현재 입소 중 (${activeCount}명)</div>
      <table>
        <thead><tr><th>No</th><th>입소날짜</th><th>부평</th><th>강화</th><th>현재위치(호실)</th><th>퇴소예정</th><th>비고</th></tr></thead>
        <tbody>
          ${printRecords.map((r, i) => {
            const dischargeDate = r.ganghwa
              ? (r.discharge_date || calculateDischargeDate(r.admission_date))
              : (r.discharge_date || '')
            const locationDisplay = r.location && r.room
              ? `${r.location}(${r.room})`
              : r.location || r.room || '-'
            const isDischargePending = !r.ganghwa && r.bupyeong && !dischargeDate
            const dischargeTxt = isDischargePending ? '미정' : (dischargeDate ? formatDate(dischargeDate) : '-')
            return `<tr>
              <td style="text-align:center">${i + 1}</td>
              <td style="text-align:center">${formatDate(r.admission_date)}</td>
              <td style="text-align:center">${r.bupyeong || '-'}</td>
              <td style="text-align:center">${r.ganghwa || '-'}</td>
              <td style="text-align:center">${locationDisplay}</td>
              <td style="text-align:center">${dischargeTxt}</td>
              <td>${r.notes || '-'}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    `

    printReport({ title: '입소현황 보고서', content })
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">입소현황 관리</h2>
            <p className="text-white/90">
              {isAdmin ? '전체 입소현황을 관리할 수 있습니다' : '입소현황을 등록하고 관리하세요'}
            </p>
          </div>
        </div>
      </Card>

      {/* 통계 섹션 */}
      <Card padding="p-0">
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 bg-blue-50 border-b border-blue-100 cursor-pointer"
          onClick={() => setShowStats(!showStats)}
        >
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-toss-gray-900">입소 현황 통계</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setIsDashboardOpen(true); }}
              className="p-2 text-toss-blue hover:bg-blue-100 rounded-lg transition-colors"
              title="입소현황판 보기"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrintAdmission(); }}
              className="p-2 text-toss-gray-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="입소현황 인쇄"
            >
              <Printer size={18} />
            </button>
            {showStats ? <ChevronUp size={20} className="text-toss-gray-500" /> : <ChevronDown size={20} className="text-toss-gray-500" />}
          </div>
        </div>

        {showStats && (
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border-2 border-toss-gray-200 rounded-xl p-3 text-center">
                <p className="text-xs text-toss-gray-500 mb-1">총 입소</p>
                <p className="text-2xl font-bold text-toss-gray-900">{totalRecords}<span className="text-sm font-normal ml-1">명</span></p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 mb-1">현재 입소 중</p>
                <p className="text-2xl font-bold text-blue-600">{activeCount}<span className="text-sm font-normal ml-1">명</span></p>
              </div>
              <div className="bg-white border-2 border-toss-gray-200 rounded-xl p-3 text-center">
                <p className="text-xs text-toss-gray-500 mb-1">퇴소 완료</p>
                <p className="text-2xl font-bold text-toss-gray-900">{dischargedCount}<span className="text-sm font-normal ml-1">명</span></p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 입소 목록 (현재 입소 중) */}
      <Card padding="p-0">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-toss-gray-100">
          <h3 className="font-bold text-toss-gray-900">입소 목록 <span className="text-sm font-normal text-blue-600 ml-1">({activeCount}명)</span></h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={handleTemplateDownload}>
              <FileSpreadsheet size={16} className="mr-1" />
              양식
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={16} className="mr-1" />
              {uploading ? '업로드 중...' : '업로드'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
            />
            <Button variant="secondary" size="sm" onClick={handleExcelDownload}>
              <Download size={16} className="mr-1" />
              다운로드
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <Plus size={16} className="mr-1" />
              추가
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-toss-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeRecordsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-toss-gray-400">
            <Building2 size={48} className="mb-4" />
            <p className="text-lg font-medium">현재 입소 중인 기록이 없습니다</p>
            <p className="text-sm mt-1">+ 추가 버튼으로 새 기록을 등록해주세요</p>
          </div>
        ) : (
          <>
            {/* 데스크탑 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-toss-gray-50 border-b border-toss-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">입소날짜</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">부평</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">강화</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">현재위치(호실)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">퇴소예정</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">비고</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecordsList.map((record, index) => {
                    // 강화에 이름 있으면 자동 계산, 부평이면 저장된 값 또는 미정
                    const dischargeDate = record.ganghwa
                      ? (record.discharge_date || calculateDischargeDate(record.admission_date))
                      : (record.discharge_date || '')
                    const isDischargePending = !record.ganghwa && record.bupyeong && !dischargeDate
                    // 현재위치(호실) 표시: 둘 다 있으면 "위치(호실)", 하나만 있으면 그것만
                    const locationDisplay = record.location && record.room
                      ? `${record.location}(${record.room})`
                      : record.location || record.room || '-'
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-toss-gray-100 hover:bg-toss-gray-50 transition-colors bg-blue-50/30"
                      >
                        <td className="px-4 py-3 text-sm text-toss-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-toss-gray-900">{formatDate(record.admission_date)}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-700">{record.bupyeong || '-'}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-700">{record.ganghwa || '-'}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-700">{locationDisplay}</td>
                        <td className="px-4 py-3 text-sm">
                          {isDischargePending ? (
                            <span className="font-medium text-blue-600">미정</span>
                          ) : dischargeDate ? (
                            <span className={`font-medium ${isWithinOneMonth(dischargeDate) ? 'text-red-500' : 'text-blue-600'}`}>{formatDate(dischargeDate)}</span>
                          ) : (
                            <span className="text-toss-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-toss-gray-500 max-w-[200px] truncate">{record.notes || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDischargeConfirm(record.id)}
                              className="p-1.5 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                              title="퇴소"
                            >
                              <LogOut size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-toss-blue hover:bg-blue-100 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(record.id)}
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="md:hidden divide-y divide-toss-gray-100">
              {activeRecordsList.map((record, index) => {
                const dischargeDate = record.ganghwa
                  ? (record.discharge_date || calculateDischargeDate(record.admission_date))
                  : (record.discharge_date || '')
                const isDischargePending = !record.ganghwa && record.bupyeong && !dischargeDate
                return (
                  <div key={record.id} className="p-4 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-toss-gray-400">No. {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDischargeConfirm(record.id)}
                          className="p-1.5 text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                        >
                          <LogOut size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-toss-blue hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(record.id)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-toss-gray-400 text-xs">입소날짜</span>
                        <p className="font-medium text-toss-gray-900">{formatDate(record.admission_date)}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">퇴소예정</span>
                        {isDischargePending ? (
                          <p className="font-medium text-blue-600">미정</p>
                        ) : dischargeDate ? (
                          <p className={`font-medium ${isWithinOneMonth(dischargeDate) ? 'text-red-500' : 'text-blue-600'}`}>{formatDate(dischargeDate)}</p>
                        ) : (
                          <p className="text-toss-gray-400">-</p>
                        )}
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">부평</span>
                        <p className="text-toss-gray-700">{record.bupyeong || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">강화</span>
                        <p className="text-toss-gray-700">{record.ganghwa || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">현재위치(호실)</span>
                        <p className="text-toss-gray-700">{
                          record.location && record.room
                            ? `${record.location}(${record.room})`
                            : record.location || record.room || '-'
                        }</p>
                      </div>
                      {record.notes && (
                        <div className="col-span-2">
                          <span className="text-toss-gray-400 text-xs">비고</span>
                          <p className="text-toss-gray-500">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* 퇴소 목록 */}
      {dischargedRecordsList.length > 0 && (
        <Card padding="p-0">
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gray-50 border-b border-toss-gray-200 cursor-pointer"
            onClick={() => setShowDischarged(!showDischarged)}
          >
            <h3 className="font-bold text-toss-gray-700">퇴소 목록 <span className="text-sm font-normal text-toss-gray-500 ml-1">({dischargedCount}명)</span></h3>
            {showDischarged ? <ChevronUp size={20} className="text-toss-gray-500" /> : <ChevronDown size={20} className="text-toss-gray-500" />}
          </div>

          {showDischarged && (
            <>
              {/* 데스크탑 테이블 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-toss-gray-50 border-b border-toss-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">입소날짜</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">부평</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">강화</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">현재위치(호실)</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">퇴소날짜</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-toss-gray-600 uppercase">비고</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dischargedRecordsList.map((record, index) => (
                      <tr
                        key={record.id}
                        className="border-b border-toss-gray-100 hover:bg-toss-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-toss-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-500">{formatDate(record.admission_date)}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-500">{record.bupyeong || '-'}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-500">{record.ganghwa || '-'}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-500">{
                          record.location && record.room
                            ? `${record.location}(${record.room})`
                            : record.location || record.room || '-'
                        }</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-500">{formatDate(record.discharge_date)}</td>
                        <td className="px-4 py-3 text-sm text-toss-gray-400 max-w-[200px] truncate">{record.notes || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-toss-blue hover:bg-blue-100 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteConfirm(record.id)}
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="md:hidden divide-y divide-toss-gray-100">
                {dischargedRecordsList.map((record, index) => (
                  <div key={record.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-toss-gray-400">No. {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-toss-blue hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(record.id)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-toss-gray-400 text-xs">입소날짜</span>
                        <p className="text-toss-gray-500">{formatDate(record.admission_date)}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">퇴소날짜</span>
                        <p className="text-toss-gray-500">{formatDate(record.discharge_date)}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">부평</span>
                        <p className="text-toss-gray-500">{record.bupyeong || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">강화</span>
                        <p className="text-toss-gray-500">{record.ganghwa || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">현재위치(호실)</span>
                        <p className="text-toss-gray-500">{
                          record.location && record.room
                            ? `${record.location}(${record.room})`
                            : record.location || record.room || '-'
                        }</p>
                      </div>
                      {record.notes && (
                        <div className="col-span-2">
                          <span className="text-toss-gray-400 text-xs">비고</span>
                          <p className="text-toss-gray-400">{record.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); setFormData(emptyForm); }}
        title={editingRecord ? '입소 기록 수정' : '입소 기록 추가'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-1">
              입소날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue"
            />
            {formData.admission_date && formData.ganghwa && (
              <p className="text-xs text-toss-gray-400 mt-1">
                강화 퇴소 예정일: {formatDate(calculateDischargeDate(formData.admission_date))} (4개월 후 자동 계산)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">부평</label>
              <input
                type="text"
                value={formData.bupyeong}
                onChange={(e) => setFormData({ ...formData, bupyeong: e.target.value })}
                placeholder="이름"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">강화</label>
              <input
                type="text"
                value={formData.ganghwa}
                onChange={(e) => setFormData({ ...formData, ganghwa: e.target.value })}
                placeholder="이름"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">현재위치</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="현재위치"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">호실</label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="호실 번호"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue"
              />
            </div>
          </div>

          {/* 부평에 이름이 있고 강화에 없을 때만 퇴소예정일 선택 */}
          {formData.bupyeong && !formData.ganghwa && (
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">퇴소예정일</label>
              <div className="flex gap-2">
                <select
                  value={formData.discharge_date === '미정' ? '미정' : formData.discharge_date ? 'date' : '미정'}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '미정') {
                      setFormData({ ...formData, discharge_date: '미정' })
                    } else {
                      // 날짜 선택 시 기존 유효한 날짜가 있으면 유지
                      const existing = formData.discharge_date !== '미정' ? formData.discharge_date : ''
                      setFormData({ ...formData, discharge_date: existing })
                    }
                  }}
                  className="px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue bg-white"
                >
                  <option value="미정">미정</option>
                  <option value="date">날짜 선택</option>
                </select>
                {formData.discharge_date !== '미정' && (
                  <input
                    type="date"
                    value={formData.discharge_date}
                    onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
                    className="flex-1 px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue"
                  />
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-1">비고</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="비고 사항"
              rows={3}
              className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/50 focus:border-toss-blue resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setIsModalOpen(false); setEditingRecord(null); setFormData(emptyForm); }}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : editingRecord ? '수정' : '등록'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTargetId(null); }}
        title="삭제 확인"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">이 입소 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTargetId(null); }}
            >
              취소
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleDelete}
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* 퇴소 확인 모달 */}
      <Modal
        isOpen={isDischargeConfirmOpen}
        onClose={() => { setIsDischargeConfirmOpen(false); setDischargeTargetId(null); }}
        title="퇴소 확인"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
            <LogOut size={24} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700">이 입소자를 퇴소 처리하시겠습니까? 퇴소날짜가 오늘({formatDate(new Date().toISOString().split('T')[0])})로 설정됩니다.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => { setIsDischargeConfirmOpen(false); setDischargeTargetId(null); }}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1 !bg-orange-500 hover:!bg-orange-600"
              onClick={handleDischarge}
            >
              퇴소 처리
            </Button>
          </div>
        </div>
      </Modal>

      {/* 현황판 대시보드 (입소 중만 표시) */}
      <AdmissionDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        records={dashboardRecords}
        stats={{ total: totalRecords, active: activeCount, discharged: dischargedCount }}
      />
    </div>
  )
}
