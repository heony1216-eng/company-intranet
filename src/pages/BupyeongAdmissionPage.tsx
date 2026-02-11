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

// 호실이 순수 호실번호인지 판별 (숫자, 숫자+호 형태만 true)
// 예: "301", "301호", "3호" → true (퇴소 예정일 계산)
// 예: "OO병원", "OO병원(301호)", "병원" → false (퇴소 예정일 미표시)
const isRoomOnly = (room: string): boolean => {
  if (!room) return true
  const trimmed = room.trim()
  return /^\d+호?$/.test(trimmed)
}

// 부평 센터 전용 테이블명
const TABLE_NAME = 'bupyeong_admission_records'

interface AdmissionRecord {
  id: string
  admission_date: string
  name: string              // 성명
  gender: string            // 성별
  room: string              // 호실 또는 병원명(호실)
  discharge_date: string    // 실제 퇴소일
  nationality: string       // 국가
  admin_status: string      // 행정상황
  notes: string             // 비고
  is_discharged: boolean
  created_at: string
  updated_at: string
  created_by: string
}

interface FormData {
  admission_date: string
  name: string              // 성명
  gender: string            // 성별
  room: string              // 호실 또는 병원명(호실)
  discharge_date: string    // 실제 퇴소일
  nationality: string       // 국가
  admin_status: string      // 행정상황
  notes: string             // 비고
}

const emptyForm: FormData = {
  admission_date: '',
  name: '',
  gender: '',
  room: '',
  discharge_date: '',
  nationality: '',
  admin_status: '',
  notes: '',
}

export default function BupyeongAdmissionPage() {
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
        .from(TABLE_NAME)
        .select('*')
        .order('admission_date', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      console.error('부평 입소현황 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // 호실 또는 병원명(호실)에서 숫자 추출 (정렬용)
  const getRoomNumber = (room: string): number => {
    if (!room) return Infinity
    const num = parseInt(room.replace(/[^0-9]/g, ''), 10)
    return isNaN(num) ? Infinity : num
  }

  // 입소 중 / 퇴소 완료 분리 + 호실 오름차순 정렬
  const activeRecordsList = records
    .filter(r => !r.is_discharged)
    .sort((a, b) => getRoomNumber(a.room) - getRoomNumber(b.room))
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
      name: record.name || '',
      gender: record.gender || '',
      room: record.room || '',
      discharge_date: record.discharge_date || '',
      nationality: record.nationality || '',
      admin_status: record.admin_status || '',
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
        .from(TABLE_NAME)
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
        .from(TABLE_NAME)
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
      alert('입소일을 입력해주세요.')
      return
    }
    if (!formData.name) {
      alert('성명을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        admission_date: formData.admission_date,
        name: formData.name,
        gender: formData.gender,
        room: formData.room,
        discharge_date: formData.discharge_date || null,
        nationality: formData.nationality,
        admin_status: formData.admin_status,
        notes: formData.notes,
      }

      if (editingRecord) {
        const { error } = await supabase
          .from(TABLE_NAME)
          .update(payload)
          .eq('id', editingRecord.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from(TABLE_NAME)
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
      const autoDischarge = isRoomOnly(record.room) ? calculateDischargeDate(record.admission_date) : ''
      return {
        'No': index + 1,
        '국가': record.nationality || '',
        '입소일': formatDate(record.admission_date),
        '성명': record.name || '',
        '성별': record.gender || '',
        '호실 또는 병원명(호실)': record.room || '',
        '퇴소 예정일': autoDischarge ? formatDate(autoDischarge) : '',
        '실제 퇴소일': formatDate(record.discharge_date),
        '행정상황': record.admin_status || '',
        '비고': record.notes || '',
        '상태': record.is_discharged ? '퇴소' : '입소 중',
      }
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '부평센터')

    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 12 },  // 국가
      { wch: 14 },  // 입소일
      { wch: 12 },  // 성명
      { wch: 8 },   // 성별
      { wch: 15 },  // 호실 또는 병원명(호실)
      { wch: 14 },  // 퇴소 예정일
      { wch: 14 },  // 실제 퇴소일
      { wch: 15 },  // 행정상황
      { wch: 25 },  // 비고
      { wch: 10 },  // 상태
    ]

    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `부평센터_입소현황_${today}.xlsx`)
  }

  // 엑셀 양식(템플릿) 다운로드
  const handleTemplateDownload = () => {
    const headers = [['국가', '입소일', '성명', '성별', '호실 또는 병원명(호실)', '실제 퇴소일', '행정상황', '비고']]
    const ws = XLSX.utils.aoa_to_sheet(headers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '부평센터')

    ws['!cols'] = [
      { wch: 12 },  // 국가
      { wch: 14 },  // 입소일
      { wch: 12 },  // 성명
      { wch: 8 },   // 성별
      { wch: 15 },  // 호실 또는 병원명(호실)
      { wch: 14 },  // 실제 퇴소일
      { wch: 15 },  // 행정상황
      { wch: 25 },  // 비고
    ]

    XLSX.writeFile(wb, '부평센터_입소현황_양식.xlsx')
  }

  // 엑셀 업로드 및 중복 체크
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

      // 날짜 파싱 헬퍼
      const parseDate = (val: any): string => {
        if (!val) return ''
        if (typeof val === 'number') {
          const date = new Date((val - 25569) * 86400 * 1000)
          return date.toISOString().split('T')[0]
        }
        const str = String(val).trim()
        // YYYY.MM.DD 형식
        const match4 = str.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
        if (match4) {
          return `${match4[1]}-${match4[2].padStart(2, '0')}-${match4[3].padStart(2, '0')}`
        }
        // YY.MM.DD 형식 (예: 25.09.22 → 2025-09-22)
        const match2 = str.match(/(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
        if (match2) {
          const year = parseInt(match2[1], 10)
          const fullYear = year >= 50 ? 1900 + year : 2000 + year
          return `${fullYear}-${match2[2].padStart(2, '0')}-${match2[3].padStart(2, '0')}`
        }
        return str
      }

      // 업로드된 행을 파싱
      const uploadedRows = rows.map(row => ({
        admission_date: parseDate(row['입소일'] || row['입소날짜']),
        name: String(row['성명'] || '').trim(),
        gender: String(row['성별'] || '').trim(),
        room: String(row['호실 또는 병원명(호실)'] || row['호실'] || '').trim(),
        discharge_date: parseDate(row['실제 퇴소일'] || row['퇴소일'] || row['퇴소예정']),
        nationality: String(row['국가'] || row['현재위치'] || '').trim(),
        admin_status: String(row['행정상황'] || '').trim(),
        notes: String(row['비고'] || '').trim(),
      })).filter(row => row.admission_date)

      if (uploadedRows.length === 0) {
        alert('유효한 데이터가 없습니다. 입소일이 필수입니다.')
        return
      }

      let insertCount = 0
      let updateCount = 0
      let skipCount = 0

      for (const row of uploadedRows) {
        // 성명 + 입소일로 매칭
        const existingRecord = records.find(r =>
          r.name === row.name && r.admission_date === row.admission_date
        )

        if (existingRecord) {
          const hasChanges =
            existingRecord.room !== row.room ||
            existingRecord.nationality !== row.nationality ||
            existingRecord.admin_status !== row.admin_status ||
            existingRecord.notes !== row.notes ||
            existingRecord.gender !== row.gender

          if (hasChanges) {
            const { error } = await supabase
              .from(TABLE_NAME)
              .update({
                name: row.name,
                gender: row.gender,
                room: row.room,
                nationality: row.nationality,
                admin_status: row.admin_status,
                notes: row.notes,
                discharge_date: row.discharge_date || null,
              })
              .eq('id', existingRecord.id)

            if (error) throw error
            updateCount++
          } else {
            skipCount++
          }
        } else {
          const { error } = await supabase
            .from(TABLE_NAME)
            .insert({
              admission_date: row.admission_date,
              name: row.name,
              gender: row.gender,
              room: row.room,
              discharge_date: row.discharge_date || null,
              nationality: row.nationality,
              admin_status: row.admin_status,
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

  // 대시보드에 전달할 레코드 (AdmissionDashboard 인터페이스에 맞게 매핑)
  const dashboardRecords = activeRecordsList.map(r => ({
    id: r.id,
    admission_date: r.admission_date,
    bupyeong: r.gender,           // 성별
    ganghwa: r.name,               // 성명
    room: r.room,
    discharge_date: r.discharge_date,
    location: r.nationality,       // 국가
    admin_status: r.admin_status,
    notes: r.notes,
  }))

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
        <thead><tr>
          <th>No</th>
          <th>국가</th>
          <th>입소일</th>
          <th>성명</th>
          <th>성별</th>
          <th>호실 또는 병원명(호실)</th>
          <th>퇴소 예정일</th>
          <th>실제 퇴소일</th>
          <th>행정상황</th>
          <th>비고</th>
        </tr></thead>
        <tbody>
          ${printRecords.map((r, i) => {
            const autoDischarge = isRoomOnly(r.room) ? calculateDischargeDate(r.admission_date) : ''
            return `<tr>
              <td style="text-align:center">${i + 1}</td>
              <td style="text-align:center">${r.nationality || '-'}</td>
              <td style="text-align:center">${formatDate(r.admission_date)}</td>
              <td style="text-align:center">${r.name || '-'}</td>
              <td style="text-align:center">${r.gender || '-'}</td>
              <td style="text-align:center">${r.room || '-'}</td>
              <td style="text-align:center">${autoDischarge ? formatDate(autoDischarge) : '-'}</td>
              <td style="text-align:center">${r.discharge_date ? formatDate(r.discharge_date) : '-'}</td>
              <td style="text-align:center;white-space:pre-line">${r.admin_status || '-'}</td>
              <td>${r.notes || '-'}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    `

    printReport({ title: '부평 센터 입소현황 보고서', content })
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">부평 센터 입소현황</h2>
            <p className="text-white/90">
              {isAdmin ? '부평 센터 입소현황을 관리할 수 있습니다' : '부평 센터 입소현황을 등록하고 관리하세요'}
            </p>
          </div>
        </div>
      </Card>

      {/* 통계 섹션 */}
      <Card padding="p-0">
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 bg-emerald-50 border-b border-emerald-100 cursor-pointer"
          onClick={() => setShowStats(!showStats)}
        >
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-toss-gray-900">입소 현황 통계</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setIsDashboardOpen(true); }}
              className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
              title="입소현황판 보기"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrintAdmission(); }}
              className="p-2 text-toss-gray-600 hover:bg-emerald-100 rounded-lg transition-colors"
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
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 mb-1">현재 입소 중</p>
                <p className="text-2xl font-bold text-emerald-600">{activeCount}<span className="text-sm font-normal ml-1">명</span></p>
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
          <h3 className="font-bold text-toss-gray-900">입소 목록 <span className="text-sm font-normal text-emerald-600 ml-1">({activeCount}명)</span></h3>
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
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase w-12">No</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">국가</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">입소일</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">성명</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">성별</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">호실 또는 병원명(호실)</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase" colSpan={2}>퇴소일</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">행정상황</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">비고</th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase w-24">관리</th>
                  </tr>
                  <tr className="bg-toss-gray-50 border-b border-toss-gray-200">
                    <th colSpan={6}></th>
                    <th className="px-2 py-1 text-center text-[10px] font-medium text-toss-gray-500">퇴소 예정일</th>
                    <th className="px-2 py-1 text-center text-[10px] font-medium text-toss-gray-500">실제 퇴소일</th>
                    <th colSpan={3}></th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecordsList.map((record, index) => {
                    const roomOnly = isRoomOnly(record.room)
                    const autoDischarge = roomOnly ? calculateDischargeDate(record.admission_date) : ''
                    const manualDischarge = record.discharge_date
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-toss-gray-100 hover:bg-toss-gray-50 transition-colors bg-emerald-50/30"
                      >
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{index + 1}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-700 text-center">{record.nationality || '-'}</td>
                        <td className="px-3 py-3 text-sm font-medium text-toss-gray-900 text-center">{formatDate(record.admission_date)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-toss-gray-900 text-center">{record.name || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-700 text-center">{record.gender || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-700 text-center">{record.room || '-'}</td>
                        <td className="px-3 py-3 text-sm text-center">
                          {autoDischarge ? (
                            <span className={`font-medium ${isWithinOneMonth(autoDischarge) ? 'text-red-500' : 'text-emerald-600'}`}>
                              {formatDate(autoDischarge)}
                            </span>
                          ) : (
                            <span className="text-toss-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-center">
                          {manualDischarge && manualDischarge !== autoDischarge ? (
                            <span className={`font-medium ${isWithinOneMonth(manualDischarge) ? 'text-red-500' : 'text-orange-600'}`}>
                              {formatDate(manualDischarge)}
                            </span>
                          ) : (
                            <span className="text-toss-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center whitespace-pre-line">{record.admin_status || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 max-w-[150px] truncate">{record.notes || '-'}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                            <button
                              onClick={() => handleDischargeConfirm(record.id)}
                              className="px-2 py-1 text-xs font-medium text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                              title="퇴소"
                            >
                              퇴소
                            </button>
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
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
                const roomOnly = isRoomOnly(record.room)
                const autoDischarge = roomOnly ? calculateDischargeDate(record.admission_date) : ''
                const manualDischarge = record.discharge_date
                return (
                  <div key={record.id} className="px-3 py-2 bg-emerald-50/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-toss-gray-400">No. {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDischargeConfirm(record.id)}
                          className="px-2 py-0.5 text-xs font-medium text-orange-500 hover:bg-orange-100 rounded-lg transition-colors"
                        >
                          퇴소
                        </button>
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConfirm(record.id)}
                          className="p-1 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-sm">
                      <div>
                        <span className="text-toss-gray-400 text-[11px]">성명</span>
                        <p className="font-medium text-toss-gray-900">{record.name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-[11px]">국가</span>
                        <p className="text-toss-gray-700">{record.nationality || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-[11px]">성별</span>
                        <p className="text-toss-gray-700">{record.gender || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-[11px]">입소일</span>
                        <p className="font-medium text-toss-gray-900">{formatDate(record.admission_date)}</p>
                      </div>
                      {autoDischarge && (
                        <div>
                          <span className="text-toss-gray-400 text-[11px]">퇴소 예정일</span>
                          <p className={`font-medium ${isWithinOneMonth(autoDischarge) ? 'text-red-500' : 'text-emerald-600'}`}>
                            {formatDate(autoDischarge)}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-toss-gray-400 text-[11px]">호실/병원명</span>
                        <p className="text-toss-gray-700">{record.room || '-'}</p>
                      </div>
                      {manualDischarge && manualDischarge !== autoDischarge && (
                        <div>
                          <span className="text-toss-gray-400 text-[11px]">실제 퇴소일</span>
                          <p className={`font-medium ${isWithinOneMonth(manualDischarge) ? 'text-red-500' : 'text-orange-600'}`}>
                            {formatDate(manualDischarge)}
                          </p>
                        </div>
                      )}
                      {record.admin_status && (
                        <div className="col-span-2">
                          <span className="text-toss-gray-400 text-[11px]">행정상황</span>
                          <p className="text-toss-gray-500 whitespace-pre-line">{record.admin_status}</p>
                        </div>
                      )}
                      {record.notes && (
                        <div className="col-span-3">
                          <span className="text-toss-gray-400 text-[11px]">비고</span>
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
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase w-12">No</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">국가</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">입소일</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">성명</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">성별</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">호실 또는 병원명(호실)</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">퇴소일</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">행정상황</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase">비고</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-toss-gray-600 uppercase w-20">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dischargedRecordsList.map((record, index) => (
                      <tr
                        key={record.id}
                        className="border-b border-toss-gray-100 hover:bg-toss-gray-50 transition-colors"
                      >
                        <td className="px-3 py-3 text-sm text-toss-gray-400 text-center">{index + 1}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{record.nationality || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{formatDate(record.admission_date)}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{record.name || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{record.gender || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{record.room || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-500 text-center">{formatDate(record.discharge_date)}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-400 text-center whitespace-pre-line">{record.admin_status || '-'}</td>
                        <td className="px-3 py-3 text-sm text-toss-gray-400 max-w-[150px] truncate">{record.notes || '-'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
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
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
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
                        <span className="text-toss-gray-400 text-xs">성명</span>
                        <p className="text-toss-gray-500">{record.name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">국가</span>
                        <p className="text-toss-gray-500">{record.nationality || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">입소일</span>
                        <p className="text-toss-gray-500">{formatDate(record.admission_date)}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">퇴소일</span>
                        <p className="text-toss-gray-500">{formatDate(record.discharge_date)}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">성별</span>
                        <p className="text-toss-gray-500">{record.gender || '-'}</p>
                      </div>
                      <div>
                        <span className="text-toss-gray-400 text-xs">호실 또는 병원명(호실)</span>
                        <p className="text-toss-gray-500">{record.room || '-'}</p>
                      </div>
                      {record.admin_status && (
                        <div>
                          <span className="text-toss-gray-400 text-xs">행정상황</span>
                          <p className="text-toss-gray-400 whitespace-pre-line">{record.admin_status}</p>
                        </div>
                      )}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">
                성명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="성명"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">국가</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="국가"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">성별</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-white"
              >
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1">호실 또는 병원명(호실)</label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="예: 301호 또는 OO병원(301호)"
                className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-1">
              입소일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.admission_date}
              onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            {formData.admission_date && isRoomOnly(formData.room) && (
              <p className="text-xs text-toss-gray-400 mt-1">
                퇴소 예정일: {formatDate(calculateDischargeDate(formData.admission_date))} (자동 계산)
              </p>
            )}
            {formData.admission_date && !isRoomOnly(formData.room) && (
              <p className="text-xs text-orange-400 mt-1">
                병원명 입력 시 퇴소 예정일이 표시되지 않습니다
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-1">실제 퇴소일</label>
            <input
              type="date"
              value={formData.discharge_date}
              onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
              className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <p className="text-xs text-toss-gray-400 mt-1">
              퇴소 예정일과 별개로, 실제 퇴소한 날짜를 입력하세요
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-1">행정상황</label>
            <textarea
              value={formData.admin_status}
              onChange={(e) => setFormData({ ...formData, admin_status: e.target.value })}
              placeholder="행정상황 입력 (여러 줄 가능)"
              rows={3}
              className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-toss-gray-700 mb-1">비고</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="비고 사항"
              rows={3}
              className="w-full px-3 py-2 border border-toss-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
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
        backgroundImage="back_bp.jpg"
      />
    </div>
  )
}
