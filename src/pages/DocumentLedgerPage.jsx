import { useState, useRef, useEffect } from 'react'
import { Card, Button, Modal } from '../components/common'
import { Plus, Edit, Trash2, Tag, Check, X, Upload, Download } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useDocumentLedger } from '../hooks/useDocumentLedger'
import * as XLSX from 'xlsx'

const DocumentLedgerPage = () => {
  const { isAdmin, isSubAdmin, profile } = useAuth()
  const {
    labels,
    ledgerData,
    selectedLabel,
    loading,
    setSelectedLabel,
    addLabel,
    updateLabel,
    deleteLabel,
    addLedgerItem,
    updateLedgerItem,
    deleteLedgerItem,
    getNextRowNumber,
  } = useDocumentLedger()

  // 모달 상태
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleteLabelModalOpen, setIsDeleteLabelModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLabelTarget, setDeleteLabelTarget] = useState(null)

  // 라벨 관리 모달 상태
  const [labelMode, setLabelMode] = useState('list')
  const [editingLabel, setEditingLabel] = useState(null)
  const [newLabelName, setNewLabelName] = useState('')

  // 인라인 편집 상태
  const [editingCell, setEditingCell] = useState(null) // { id, field }
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  // 업로드 상태
  const [isUploading, setIsUploading] = useState(false)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // 새 행 추가 중인지
  const [isAddingRow, setIsAddingRow] = useState(false)
  const [newRowData, setNewRowData] = useState({
    row_number: 1,
    doc_number: '',
    content: '',
    receiver_org: '',
    receiver_date: '',
    sender_org: '',
    sender_date: '',
    note: '',
  })

  // 편집 시작
  const startEdit = (item, field) => {
    if (!isAdmin && !isSubAdmin) return
    setEditingCell({ id: item.id, field })
    setEditValue(item[field] || '')
  }

  // 편집 저장
  const saveEdit = async () => {
    if (!editingCell) return

    const { id, field } = editingCell
    const item = ledgerData.find(i => i.id === id)

    if (item && item[field] !== editValue) {
      await updateLedgerItem(id, { [field]: editValue })
    }

    setEditingCell(null)
    setEditValue('')
  }

  // 편집 취소
  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  // 키보드 이벤트 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // 새 행 추가 (저장 후 계속 입력 모드 유지)
  const handleAddRow = async (continueAdding = false) => {
    if (!selectedLabel) return

    // 내용이 비어있으면 추가하지 않음
    if (!newRowData.content.trim() && !newRowData.doc_number.trim()) {
      if (!continueAdding) {
        setIsAddingRow(false)
      }
      return
    }

    const itemData = {
      ...newRowData,
      row_number: getNextRowNumber(),
      label_id: selectedLabel.id,
      created_by: profile?.id,
    }

    const result = await addLedgerItem(itemData)
    if (result.success) {
      // 다음 행 준비
      setNewRowData({
        row_number: getNextRowNumber() + 1,
        doc_number: '',
        content: '',
        receiver_org: '',
        receiver_date: '',
        sender_org: '',
        sender_date: '',
        note: '',
      })

      // continueAdding이 true면 입력 모드 유지
      if (!continueAdding) {
        setIsAddingRow(false)
      }
    }
  }

  // 새 행 입력 값 변경
  const handleNewRowChange = (field, value) => {
    setNewRowData(prev => ({ ...prev, [field]: value }))
  }

  // 새 행 키보드 이벤트
  const handleNewRowKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Enter 누르면 저장하고 다음 행 계속 입력
      handleAddRow(true)
    } else if (e.key === 'Escape') {
      // 내용이 있으면 저장하고 종료, 없으면 그냥 종료
      if (newRowData.content.trim() || newRowData.doc_number.trim()) {
        handleAddRow(false)
      } else {
        setIsAddingRow(false)
        setNewRowData({
          row_number: 1,
          doc_number: '',
          content: '',
          receiver_org: '',
          receiver_date: '',
          sender_org: '',
          sender_date: '',
          note: '',
        })
      }
    }
  }

  // 항목 삭제 모달 열기
  const openDeleteModal = (item) => {
    setDeleteTarget(item)
    setIsDeleteModalOpen(true)
  }

  // 항목 삭제 확인
  const handleDeleteItem = async () => {
    if (!deleteTarget) return
    await deleteLedgerItem(deleteTarget.id)
    setIsDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  // 라벨 추가
  const handleAddLabel = async () => {
    if (!newLabelName.trim()) {
      alert('라벨 이름을 입력해주세요.')
      return
    }

    const result = await addLabel(newLabelName.trim())
    if (result.success) {
      setNewLabelName('')
      setLabelMode('list')
    }
  }

  // 라벨 수정
  const handleUpdateLabel = async () => {
    if (!newLabelName.trim() || !editingLabel) return

    const result = await updateLabel(editingLabel.id, newLabelName.trim())
    if (result.success) {
      setNewLabelName('')
      setEditingLabel(null)
      setLabelMode('list')
    }
  }

  // 라벨 삭제 모달 열기
  const openDeleteLabelModal = (label) => {
    setDeleteLabelTarget(label)
    setIsDeleteLabelModalOpen(true)
  }

  // 라벨 삭제 확인
  const handleDeleteLabel = async () => {
    if (!deleteLabelTarget) return
    await deleteLabel(deleteLabelTarget.id)
    setIsDeleteLabelModalOpen(false)
    setDeleteLabelTarget(null)
  }

  // 엑셀 파일 업로드 처리
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // 헤더 행 찾기 (연번, 위치, 내용 등이 있는 행)
      let headerRowIndex = -1
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i]
        if (row && row.some(cell => cell && String(cell).includes('연번'))) {
          headerRowIndex = i
          break
        }
      }

      if (headerRowIndex === -1) {
        alert('엑셀 형식이 올바르지 않습니다. 연번, 위치, 내용 등의 헤더가 필요합니다.')
        return
      }

      // 데이터 행 파싱 (헤더 다음 행부터)
      const parsedData = []
      for (let i = headerRowIndex + 2; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue

        // 연번이 숫자인 행만 처리
        const rowNumber = row[0]
        if (!rowNumber || isNaN(Number(rowNumber))) continue

        // 내용이 비어있으면 스킵
        const content = row[2]
        if (!content || String(content).trim() === '') continue

        parsedData.push({
          row_number: Number(rowNumber),
          doc_number: row[1] ? String(row[1]).trim() : '',
          content: row[2] ? String(row[2]).trim() : '',
          receiver_org: row[3] ? String(row[3]).trim() : '',
          receiver_date: row[4] ? String(row[4]).trim() : '',
          sender_org: row[5] ? String(row[5]).trim() : '',
          sender_date: row[6] ? String(row[6]).trim() : '',
          note: row[7] ? String(row[7]).trim() : '',
        })
      }

      if (parsedData.length === 0) {
        alert('업로드할 데이터가 없습니다.')
        return
      }

      setUploadPreview(parsedData)
      setIsUploadModalOpen(true)
    } catch (error) {
      console.error('엑셀 파싱 에러:', error)
      alert('엑셀 파일을 읽는 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 업로드 확인 (데이터 저장)
  const handleConfirmUpload = async () => {
    if (!uploadPreview || !selectedLabel) return

    setIsUploading(true)
    try {
      for (const item of uploadPreview) {
        await addLedgerItem({
          ...item,
          label_id: selectedLabel.id,
          created_by: profile?.id,
        })
      }
      setIsUploadModalOpen(false)
      setUploadPreview(null)
      alert(`${uploadPreview.length}개의 문서가 추가되었습니다.`)
    } catch (error) {
      console.error('업로드 저장 에러:', error)
      alert('데이터 저장 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  // 엑셀 다운로드 - 기존 템플릿 형식 그대로 재현
  const handleDownload = () => {
    if (!selectedLabel) return

    const wb = XLSX.utils.book_new()

    // 데이터 정렬
    const sortedData = [...ledgerData].sort((a, b) => a.row_number - b.row_number)

    // 워크시트 데이터 구성 (기존 템플릿과 동일한 구조)
    const wsData = [
      // 1행: 제목
      [`${currentYear}년도 문서 수,발신 대장`, null, null, null, null, null, null, null],
      // 2행: 부서명
      [selectedLabel.name, null, null, null, null, null, null, null],
      // 3행: 헤더 1
      ['연번', '위치', '내용', '수 신', null, '발 신', null, '비고'],
      // 4행: 헤더 2
      [null, null, null, '기관명', '날짜', '기관명', '날짜', null],
    ]

    // 데이터 행 추가 (5행부터)
    if (sortedData.length > 0) {
      sortedData.forEach(item => {
        wsData.push([
          String(item.row_number),
          item.doc_number || '',
          item.content || '',
          item.receiver_org || '',
          item.receiver_date || '',
          item.sender_org || '',
          item.sender_date || '',
          item.note || '',
        ])
      })
    } else {
      // 빈 데이터일 때 기본 행 추가 (1~23)
      for (let i = 1; i <= 23; i++) {
        wsData.push([String(i), '', '', '', '', '', '', ''])
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 병합 셀 (기존 템플릿과 동일)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },  // A1:H1 제목
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },  // A2:H2 부서명
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },  // A3:A4 연번
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },  // B3:B4 위치
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },  // C3:C4 내용
      { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } },  // D3:E3 수신
      { s: { r: 2, c: 5 }, e: { r: 2, c: 6 } },  // F3:G3 발신
      { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } },  // H3:H4 비고
    ]

    // 행 높이 설정
    const rowCount = wsData.length
    ws['!rows'] = []
    ws['!rows'][0] = { hpt: 42, hpx: 42 }  // 제목
    ws['!rows'][1] = { hpt: 42, hpx: 42 }  // 부서명
    for (let i = 2; i < rowCount; i++) {
      ws['!rows'][i] = { hpt: 25.5, hpx: 25.5 }
    }

    // 열 너비 설정
    ws['!cols'] = [
      { wch: 6 },   // A: 연번
      { wch: 12 },  // B: 위치
      { wch: 40 },  // C: 내용
      { wch: 15 },  // D: 수신 기관명
      { wch: 10 },  // E: 수신 날짜
      { wch: 15 },  // F: 발신 기관명
      { wch: 10 },  // G: 발신 날짜
      { wch: 25 },  // H: 비고
    ]

    XLSX.utils.book_append_sheet(wb, ws, `${currentYear}년도`)

    // .xls 형식으로 다운로드
    XLSX.writeFile(wb, `${currentYear}년_문서수발신대장_${selectedLabel.name}.xls`, { bookType: 'xls' })
  }

  // 편집 셀 포커스
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // 연도
  const currentYear = new Date().getFullYear()

  // 편집 가능한 셀 렌더링
  const EditableCell = ({ item, field, className = '', align = 'left' }) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field
    const canEdit = isAdmin || isSubAdmin

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1 bg-toss-blue/5 border border-toss-blue rounded text-sm focus:outline-none focus:ring-1 focus:ring-toss-blue ${align === 'center' ? 'text-center' : ''}`}
        />
      )
    }

    return (
      <div
        onClick={() => canEdit && startEdit(item, field)}
        className={`px-2 py-1 min-h-[28px] ${canEdit ? 'cursor-text hover:bg-toss-gray-50 rounded' : ''} ${className} ${align === 'center' ? 'text-center' : ''}`}
      >
        {item[field] || <span className="text-toss-gray-300">-</span>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-toss-gray-900">문서 수발신 대장</h1>
          <p className="text-toss-gray-500 mt-1">{currentYear}년도</p>
        </div>
        <div className="flex items-center gap-3">
          {(isAdmin || isSubAdmin) && selectedLabel && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload size={18} />
                업로드
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownload}
              >
                <Download size={18} />
                다운로드
              </Button>
            </>
          )}
          {(isAdmin || isSubAdmin) && (
            <Button variant="secondary" onClick={() => {
              setLabelMode('list')
              setNewLabelName('')
              setEditingLabel(null)
              setIsLabelModalOpen(true)
            }}>
              <Tag size={18} />
              라벨 관리
            </Button>
          )}
        </div>
      </div>

      {/* 라벨 탭 */}
      <div className="flex items-center gap-2 border-b border-toss-gray-200">
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => setSelectedLabel(label)}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              selectedLabel?.id === label.id
                ? 'text-toss-blue'
                : 'text-toss-gray-500 hover:text-toss-gray-700'
            }`}
          >
            {label.name}
            {selectedLabel?.id === label.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-toss-blue" />
            )}
          </button>
        ))}
        {labels.length === 0 && (
          <div className="px-4 py-3 text-sm text-toss-gray-400">
            라벨을 추가해주세요
          </div>
        )}
      </div>

      {/* 테이블 */}
      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-toss-gray-200 bg-toss-gray-50">
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-14">번호</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-24">위치</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-left min-w-[200px]">내용</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-28 bg-blue-50/50">수신 기관</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-20 bg-blue-50/50">수신일</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-28 bg-green-50/50">발신 기관</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-20 bg-green-50/50">발신일</th>
                <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-left min-w-[120px]">비고</th>
                {(isAdmin || isSubAdmin) && (
                  <th className="px-3 py-3 text-xs font-semibold text-toss-gray-500 text-center w-12"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-toss-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={(isAdmin || isSubAdmin) ? 9 : 8} className="px-4 py-12 text-center text-toss-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : (
                <>
                  {/* 새 행 추가 - 상단에 배치 */}
                  {isAddingRow && (isAdmin || isSubAdmin) && (
                    <tr className="bg-toss-blue/5">
                      <td className="px-3 py-2 text-sm text-center text-toss-gray-400">
                        {getNextRowNumber()}
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={newRowData.doc_number}
                          onChange={(e) => handleNewRowChange('doc_number', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'doc_number')}
                          placeholder="위치"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={newRowData.content}
                          onChange={(e) => handleNewRowChange('content', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'content')}
                          placeholder="내용"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                          autoFocus
                        />
                      </td>
                      <td className="px-1 py-1 bg-blue-50/30">
                        <input
                          type="text"
                          value={newRowData.receiver_org}
                          onChange={(e) => handleNewRowChange('receiver_org', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'receiver_org')}
                          placeholder="수신 기관"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                        />
                      </td>
                      <td className="px-1 py-1 bg-blue-50/30">
                        <input
                          type="text"
                          value={newRowData.receiver_date}
                          onChange={(e) => handleNewRowChange('receiver_date', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'receiver_date')}
                          placeholder="0122"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                        />
                      </td>
                      <td className="px-1 py-1 bg-green-50/30">
                        <input
                          type="text"
                          value={newRowData.sender_org}
                          onChange={(e) => handleNewRowChange('sender_org', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'sender_org')}
                          placeholder="발신 기관"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                        />
                      </td>
                      <td className="px-1 py-1 bg-green-50/30">
                        <input
                          type="text"
                          value={newRowData.sender_date}
                          onChange={(e) => handleNewRowChange('sender_date', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'sender_date')}
                          placeholder="0105"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="text"
                          value={newRowData.note}
                          onChange={(e) => handleNewRowChange('note', e.target.value)}
                          onKeyDown={(e) => handleNewRowKeyDown(e, 'note')}
                          placeholder="비고"
                          className="w-full px-2 py-1 text-sm bg-white border border-toss-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-toss-blue focus:border-toss-blue"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAddRow(true)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                            title="저장 후 계속 (Enter)"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (newRowData.content.trim() || newRowData.doc_number.trim()) {
                                handleAddRow(false)
                              } else {
                                setIsAddingRow(false)
                              }
                            }}
                            className="p-1 text-toss-gray-400 hover:bg-toss-gray-100 rounded-full transition-colors"
                            title="종료 (Esc)"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* 데이터 행 - 내림차순 (최신이 위) */}
                  {[...ledgerData].sort((a, b) => b.row_number - a.row_number).map((item) => (
                    <tr key={item.id} className="hover:bg-toss-gray-50/50 transition-colors">
                      <td className="px-3 py-2 text-sm text-center text-toss-gray-500 font-medium">
                        {item.row_number}
                      </td>
                      <td className="px-1 py-1 text-sm">
                        <EditableCell item={item} field="doc_number" align="center" />
                      </td>
                      <td className="px-1 py-1 text-sm">
                        <EditableCell item={item} field="content" />
                      </td>
                      <td className="px-1 py-1 text-sm bg-blue-50/30">
                        <EditableCell item={item} field="receiver_org" align="center" />
                      </td>
                      <td className="px-1 py-1 text-sm bg-blue-50/30">
                        <EditableCell item={item} field="receiver_date" align="center" />
                      </td>
                      <td className="px-1 py-1 text-sm bg-green-50/30">
                        <EditableCell item={item} field="sender_org" align="center" />
                      </td>
                      <td className="px-1 py-1 text-sm bg-green-50/30">
                        <EditableCell item={item} field="sender_date" align="center" />
                      </td>
                      <td className="px-1 py-1 text-sm">
                        <EditableCell item={item} field="note" />
                      </td>
                      {(isAdmin || isSubAdmin) && (
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => openDeleteModal(item)}
                            className="p-1.5 text-toss-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* 빈 상태 */}
                  {ledgerData.length === 0 && !isAddingRow && (
                    <tr>
                      <td colSpan={(isAdmin || isSubAdmin) ? 9 : 8} className="px-4 py-12 text-center text-toss-gray-400">
                        {selectedLabel ? '등록된 문서가 없습니다' : '라벨을 선택해주세요'}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* 행 추가 버튼 */}
        {selectedLabel && (isAdmin || isSubAdmin) && !isAddingRow && (
          <div className="border-t border-toss-gray-100">
            <button
              onClick={() => setIsAddingRow(true)}
              className="w-full px-4 py-3 text-sm text-toss-gray-500 hover:text-toss-blue hover:bg-toss-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              새 문서 추가
            </button>
          </div>
        )}
      </Card>

      {/* 안내 메시지 */}
      {(isAdmin || isSubAdmin) && (
        <p className="text-xs text-toss-gray-400 text-center">
          셀 클릭하여 수정 · 새 문서 추가 시 Enter로 저장 후 계속 입력, Esc로 종료
        </p>
      )}

      {/* 라벨 관리 모달 */}
      <Modal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        title="라벨 관리"
      >
        <div className="space-y-4">
          {labelMode === 'list' && (
            <>
              <div className="space-y-2">
                {labels.length > 0 ? (
                  labels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center justify-between p-3 bg-toss-gray-50 rounded-toss"
                    >
                      <span className="font-medium text-toss-gray-900">{label.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingLabel(label)
                            setNewLabelName(label.name)
                            setLabelMode('edit')
                          }}
                          className="p-1 text-toss-gray-500 hover:bg-toss-gray-200 rounded"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteLabelModal(label)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-toss-gray-500">
                    등록된 라벨이 없습니다
                  </div>
                )}
              </div>

              <Button
                onClick={() => {
                  setNewLabelName('')
                  setLabelMode('add')
                }}
                className="w-full"
              >
                <Plus size={18} />
                새 라벨 추가
              </Button>
            </>
          )}

          {labelMode === 'add' && (
            <>
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  라벨 이름
                </label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                  className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  placeholder="라벨 이름을 입력하세요"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setLabelMode('list')}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleAddLabel}
                  className="flex-1"
                >
                  추가하기
                </Button>
              </div>
            </>
          )}

          {labelMode === 'edit' && (
            <>
              <div>
                <label className="block text-sm font-medium text-toss-gray-700 mb-2">
                  라벨 이름
                </label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateLabel()}
                  className="w-full px-4 py-3 bg-toss-gray-100 border-0 rounded-toss focus:ring-2 focus:ring-toss-blue"
                  placeholder="라벨 이름을 입력하세요"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingLabel(null)
                    setLabelMode('list')
                  }}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleUpdateLabel}
                  className="flex-1"
                >
                  수정하기
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 문서 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeleteTarget(null)
        }}
        title="문서 삭제"
      >
        <div className="space-y-4">
          <p className="text-toss-gray-700">
            이 문서를 삭제하시겠습니까?
          </p>
          {deleteTarget && (
            <div className="p-3 bg-toss-gray-50 rounded-toss text-sm">
              <p className="font-medium text-toss-gray-900">{deleteTarget.content || '(내용 없음)'}</p>
              {deleteTarget.doc_number && (
                <p className="text-toss-gray-500 mt-1">위치: {deleteTarget.doc_number}</p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDeleteTarget(null)
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteItem}
              className="flex-1"
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* 라벨 삭제 확인 모달 */}
      <Modal
        isOpen={isDeleteLabelModalOpen}
        onClose={() => {
          setIsDeleteLabelModalOpen(false)
          setDeleteLabelTarget(null)
        }}
        title="라벨 삭제"
      >
        <div className="space-y-4">
          <p className="text-toss-gray-700">
            <span className="font-medium text-toss-gray-900">"{deleteLabelTarget?.name}"</span> 라벨을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-red-500">
            해당 라벨의 모든 문서 데이터가 함께 삭제됩니다.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteLabelModalOpen(false)
                setDeleteLabelTarget(null)
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteLabel}
              className="flex-1"
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      {/* 엑셀 업로드 미리보기 모달 */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false)
          setUploadPreview(null)
        }}
        title="엑셀 업로드 미리보기"
        size="xl"
      >
        <div className="space-y-4">
          <p className="text-toss-gray-700">
            <span className="font-bold text-toss-blue">{uploadPreview?.length || 0}개</span>의 문서를 업로드합니다.
          </p>

          <div className="max-h-[400px] overflow-auto border border-toss-gray-200 rounded-toss">
            <table className="w-full text-sm">
              <thead className="bg-toss-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-toss-gray-500">번호</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-toss-gray-500">위치</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-toss-gray-500">내용</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-toss-gray-500">수신</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-toss-gray-500">발신</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-toss-gray-100">
                {uploadPreview?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2 text-toss-gray-500">{item.row_number}</td>
                    <td className="px-2 py-2">{item.doc_number || '-'}</td>
                    <td className="px-2 py-2 max-w-[200px] truncate">{item.content}</td>
                    <td className="px-2 py-2 text-toss-gray-500">
                      {item.receiver_org && `${item.receiver_org} (${item.receiver_date || '-'})`}
                    </td>
                    <td className="px-2 py-2 text-toss-gray-500">
                      {item.sender_org && `${item.sender_org} (${item.sender_date || '-'})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadModalOpen(false)
                setUploadPreview(null)
              }}
              className="flex-1"
              disabled={isUploading}
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmUpload}
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DocumentLedgerPage
