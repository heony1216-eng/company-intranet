import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, Button, Modal, PageHeader } from '../components/common'
import { Upload, Download, Search, Trash2, Phone, Plus, Edit, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import * as XLSX from 'xlsx'

// 국내/국외 탭 타입
type ContactType = 'domestic' | 'overseas'

interface Contact {
  id: number
  name: string
  department: string
  position: string
  phone: string
  email: string
  memo: string
  continent: string
  type: ContactType
  created_at: string
}

const TAB_LABELS: Record<ContactType, string> = {
  domestic: '국내',
  overseas: '국외',
}

// 국내 컬럼 정의
const DOMESTIC_COLUMNS = [
  { key: 'name', label: '이름', width: 10 },
  { key: 'department', label: '부서', width: 15 },
  { key: 'position', label: '직급', width: 10 },
  { key: 'phone', label: '전화번호', width: 15 },
  { key: 'email', label: '이메일', width: 25 },
  { key: 'memo', label: '비고', width: 20 },
] as const

// 국외 컬럼 정의
const OVERSEAS_COLUMNS = [
  { key: 'continent', label: '대륙', width: 10 },
  { key: 'department', label: '소속한인회', width: 20 },
  { key: 'position', label: '직위', width: 10 },
  { key: 'name', label: '성명', width: 10 },
  { key: 'phone', label: '대표전화', width: 15 },
  { key: 'email', label: '이메일', width: 25 },
] as const

// 폼 초기값
const EMPTY_FORM = {
  name: '', department: '', position: '', phone: '', email: '', memo: '', continent: '',
}

const ContactPage = () => {
  const { isAdmin, isSubAdmin } = useAuth()
  const canManage = isAdmin || isSubAdmin
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [activeTab, setActiveTab] = useState<ContactType>('domestic')

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // 현재 탭에 맞는 컬럼
  const columns = activeTab === 'domestic' ? DOMESTIC_COLUMNS : OVERSEAS_COLUMNS

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('department')
        .order('continent')
        .order('name')

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('연락처 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 현재 탭에 해당하는 연락처만
  const tabContacts = useMemo(() => {
    return contacts.filter(c => c.type === activeTab)
  }, [contacts, activeTab])

  // 필터 목록 추출 (국내: 부서, 국외: 대륙)
  const filterOptions = useMemo(() => {
    if (activeTab === 'domestic') {
      const depts = [...new Set(tabContacts.map(c => c.department).filter(Boolean))]
      return depts.sort()
    } else {
      const continents = [...new Set(tabContacts.map(c => c.continent).filter(Boolean))]
      return continents.sort()
    }
  }, [tabContacts, activeTab])

  // 검색 + 필터
  const filteredContacts = useMemo(() => {
    return tabContacts.filter(c => {
      const matchSearch = !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.memo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.continent?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchFilter = !filterDept || (
        activeTab === 'domestic'
          ? c.department === filterDept
          : c.continent === filterDept
      )
      return matchSearch && matchFilter
    })
  }, [tabContacts, searchTerm, filterDept, activeTab])

  // 탭별 건수
  const domesticCount = useMemo(() => contacts.filter(c => c.type === 'domestic').length, [contacts])
  const overseasCount = useMemo(() => contacts.filter(c => c.type === 'overseas').length, [contacts])

  // 탭 전환 시 필터 초기화
  const handleTabChange = (tab: ContactType) => {
    setActiveTab(tab)
    setSearchTerm('')
    setFilterDept('')
  }

  // === 개별 CRUD ===

  // 추가 모달 열기
  const openAddModal = () => {
    setEditingContact(null)
    setFormData(EMPTY_FORM)
    setIsModalOpen(true)
  }

  // 수정 모달 열기
  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name || '',
      department: contact.department || '',
      position: contact.position || '',
      phone: contact.phone || '',
      email: contact.email || '',
      memo: contact.memo || '',
      continent: contact.continent || '',
    })
    setIsModalOpen(true)
  }

  // 저장 (추가 or 수정)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert(activeTab === 'domestic' ? '이름을 입력하세요.' : '성명을 입력하세요.')
      return
    }

    setSaving(true)
    try {
      if (editingContact) {
        // 수정
        const { error } = await supabase
          .from('contacts')
          .update({
            name: formData.name,
            department: formData.department,
            position: formData.position,
            phone: formData.phone,
            email: formData.email,
            memo: formData.memo,
            continent: formData.continent,
          })
          .eq('id', editingContact.id)

        if (error) throw error
      } else {
        // 추가
        const { error } = await supabase
          .from('contacts')
          .insert({
            ...formData,
            type: activeTab,
          })

        if (error) throw error
      }

      setIsModalOpen(false)
      fetchContacts()
    } catch (error: any) {
      console.error('저장 오류:', error)
      alert(`저장 중 오류가 발생했습니다.\n${error?.message || ''}`)
    } finally {
      setSaving(false)
    }
  }

  // 개별 삭제
  const handleDelete = async (contact: Contact) => {
    if (!confirm(`"${contact.name}" 연락처를 삭제하시겠습니까?`)) return

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)

      if (error) throw error
      fetchContacts()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // === 엑셀 업로드 ===
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        alert('엑셀 파일에 데이터가 없습니다.')
        return
      }

      let mapped: any[]

      if (activeTab === 'overseas') {
        mapped = rows.map(row => ({
          continent: row['대륙'] || row['continent'] || '',
          department: row['소속한인회'] || row['한인회'] || row['소속'] || row['부서'] || row['department'] || '',
          position: row['직위'] || row['직급'] || row['position'] || '',
          name: row['성명'] || row['이름'] || row['name'] || '',
          phone: String(row['대표전화'] || row['전화번호'] || row['phone'] || row['연락처'] || ''),
          email: row['이메일'] || row['email'] || row['메일'] || '',
          memo: '',
          type: 'overseas',
        })).filter(r => r.name)
      } else {
        mapped = rows.map(row => ({
          name: row['이름'] || row['name'] || row['성명'] || '',
          department: row['부서'] || row['department'] || row['소속'] || row['기관'] || '',
          position: row['직급'] || row['position'] || row['직위'] || row['직책'] || '',
          phone: String(row['전화번호'] || row['phone'] || row['연락처'] || row['휴대폰'] || row['핸드폰'] || ''),
          email: row['이메일'] || row['email'] || row['메일'] || '',
          memo: row['비고'] || row['memo'] || row['메모'] || '',
          continent: '',
          type: 'domestic',
        })).filter(r => r.name)
      }

      if (mapped.length === 0) {
        alert('유효한 데이터가 없습니다. 엑셀에 "이름" 또는 "성명" 컬럼이 있는지 확인하세요.')
        return
      }

      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .eq('type', activeTab)

      if (deleteError) throw deleteError

      for (let i = 0; i < mapped.length; i += 50) {
        const batch = mapped.slice(i, i + 50)
        const { error: insertError } = await supabase
          .from('contacts')
          .insert(batch)
        if (insertError) throw insertError
      }

      alert(`${TAB_LABELS[activeTab]} 연락처 ${mapped.length}건이 업로드되었습니다.`)
      fetchContacts()
    } catch (error: any) {
      console.error('업로드 오류:', error)
      alert(`업로드 중 오류가 발생했습니다.\n${error?.message || JSON.stringify(error)}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // === 엑셀 다운로드 ===
  const handleDownload = () => {
    let exportData: any[]

    if (activeTab === 'overseas') {
      exportData = filteredContacts.map(c => ({
        '대륙': c.continent,
        '소속한인회': c.department,
        '직위': c.position,
        '성명': c.name,
        '대표전화': c.phone,
        '이메일': c.email,
      }))
    } else {
      exportData = filteredContacts.map(c => ({
        '이름': c.name,
        '부서': c.department,
        '직급': c.position,
        '전화번호': c.phone,
        '이메일': c.email,
        '비고': c.memo,
      }))
    }

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '연락처')
    ws['!cols'] = columns.map(col => ({ wch: col.width }))

    const label = TAB_LABELS[activeTab]
    XLSX.writeFile(wb, `연락처_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 현재 탭 전체 삭제
  const handleDeleteAll = async () => {
    const label = TAB_LABELS[activeTab]
    if (!confirm(`${label} 연락처를 모두 삭제하시겠습니까?`)) return

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('type', activeTab)

      if (error) throw error
      fetchContacts()
      alert(`${label} 연락처가 모두 삭제되었습니다.`)
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // 셀 렌더링
  const renderCell = (contact: Contact, key: string) => {
    const value = (contact as any)[key] || ''

    if (key === 'phone' && value) {
      return <a href={`tel:${value}`} className="text-toss-gray-700 hover:text-toss-blue hover:underline text-sm">{value}</a>
    }
    if (key === 'email' && value) {
      return <a href={`mailto:${value}`} className="text-toss-gray-700 hover:text-toss-blue hover:underline text-sm">{value}</a>
    }
    if (key === 'name') {
      return <span className="font-medium text-toss-gray-900 text-sm">{value}</span>
    }
    return <span className="text-toss-gray-700 text-sm">{value}</span>
  }

  // 폼 필드 렌더링
  const formFields = activeTab === 'domestic'
    ? [
        { key: 'name', label: '이름', required: true },
        { key: 'department', label: '부서' },
        { key: 'position', label: '직급' },
        { key: 'phone', label: '전화번호' },
        { key: 'email', label: '이메일' },
        { key: 'memo', label: '비고' },
      ]
    : [
        { key: 'continent', label: '대륙' },
        { key: 'department', label: '소속한인회' },
        { key: 'position', label: '직위' },
        { key: 'name', label: '성명', required: true },
        { key: 'phone', label: '대표전화' },
        { key: 'email', label: '이메일' },
      ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-toss-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="연락처"
        subtitle={`${TAB_LABELS[activeTab]} ${filteredContacts.length}건`}
        icon={Phone}
        actions={
          <>
            {canManage && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-toss-blue text-white hover:bg-toss-blue-dark rounded-toss text-sm font-medium transition-all"
              >
                <Plus size={16} />
                추가
              </button>
            )}
            {tabContacts.length > 0 && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-toss-gray-100 text-toss-gray-700 hover:bg-toss-gray-200 rounded-toss text-sm font-medium transition-all"
              >
                <Download size={16} />
                다운로드
              </button>
            )}
            {canManage && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-toss-gray-100 text-toss-gray-700 hover:bg-toss-gray-200 rounded-toss text-sm font-medium transition-all disabled:opacity-50"
                >
                  <Upload size={16} />
                  {uploading ? '업로드 중...' : '엑셀 업로드'}
                </button>
                {tabContacts.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-toss text-sm font-medium transition-all"
                  >
                    <Trash2 size={16} />
                    전체삭제
                  </button>
                )}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </>
        }
      />

      {/* 국내/국외 탭 */}
      <div className="flex gap-1 bg-toss-gray-100 p-1 rounded-toss-lg w-fit">
        {(['domestic', 'overseas'] as ContactType[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-5 py-2.5 rounded-toss font-medium text-sm transition-all ${
              activeTab === tab
                ? 'bg-white text-toss-blue shadow-sm'
                : 'text-toss-gray-500 hover:text-toss-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
            <span className={`ml-1.5 text-xs ${
              activeTab === tab ? 'text-toss-blue/60' : 'text-toss-gray-400'
            }`}>
              {tab === 'domestic' ? domesticCount : overseasCount}
            </span>
          </button>
        ))}
      </div>

      {/* 검색/필터 */}
      <Card padding="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'domestic' ? '이름, 부서, 전화번호 등 검색...' : '성명, 한인회, 대륙 등 검색...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-toss-gray-100 border-0 rounded-toss text-sm focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
            />
          </div>
          {filterOptions.length > 0 && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2.5 bg-toss-gray-100 border-0 rounded-toss text-sm focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
            >
              <option value="">{activeTab === 'domestic' ? '전체 부서' : '전체 대륙'}</option>
              {filterOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* 연락처 목록 */}
      {tabContacts.length === 0 ? (
        <Card>
          <div className="text-center py-16 text-toss-gray-500">
            <Phone size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">{TAB_LABELS[activeTab]} 연락처가 없습니다</p>
            {canManage && (
              <p className="text-sm">
                엑셀 파일을 업로드하거나 직접 추가하세요.<br />
                <span className="text-toss-gray-400">
                  {activeTab === 'domestic'
                    ? '컬럼: 이름, 부서, 직급, 전화번호, 이메일, 비고'
                    : '컬럼: 대륙, 소속한인회, 직위, 성명, 대표전화, 이메일'}
                </span>
              </p>
            )}
          </div>
        </Card>
      ) : filteredContacts.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-toss-gray-500">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <p>검색 결과가 없습니다</p>
          </div>
        </Card>
      ) : (
        <>
          {/* 데스크탑 테이블 */}
          <Card padding="p-0" className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-toss-gray-100 bg-toss-gray-50">
                  {columns.map(col => (
                    <th key={col.key} className="text-left px-3 py-2.5 text-xs font-bold text-toss-gray-600 uppercase">
                      {col.label}
                    </th>
                  ))}
                  {canManage && (
                    <th className="text-right px-3 py-2.5 text-xs font-bold text-toss-gray-600 uppercase w-20">관리</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-toss-gray-50 hover:bg-toss-gray-50/50 transition-colors group">
                    {columns.map(col => (
                      <td key={col.key} className="px-3 py-2">
                        {renderCell(contact, col.key)}
                      </td>
                    ))}
                    {canManage && (
                      <td className="px-3 py-2 text-right">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(contact)}
                            className="p-1.5 text-toss-gray-400 hover:text-toss-blue hover:bg-toss-blue/10 rounded-toss transition-all"
                            title="수정"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(contact)}
                            className="p-1.5 text-toss-gray-400 hover:text-red-500 hover:bg-red-50 rounded-toss transition-all"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} padding="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-toss-gray-900">{contact.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {activeTab === 'overseas' && contact.continent && (
                        <span className="text-sm text-toss-gray-500">{contact.continent}</span>
                      )}
                      {contact.department && (
                        <span className="text-sm text-toss-gray-500">{contact.department}</span>
                      )}
                      {contact.position && (
                        <span className="text-sm text-toss-gray-400">· {contact.position}</span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-1.5 text-toss-gray-400 hover:text-toss-blue"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact)}
                        className="p-1.5 text-toss-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="block text-sm text-toss-gray-700 hover:text-toss-blue">
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="block text-sm text-toss-gray-700 hover:text-toss-blue">
                      {contact.email}
                    </a>
                  )}
                  {contact.memo && (
                    <p className="text-sm text-toss-gray-400">{contact.memo}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 추가/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContact ? '연락처 수정' : '연락처 추가'}
      >
        <div className="space-y-4">
          {formFields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-toss-gray-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type={field.key === 'email' ? 'email' : 'text'}
                value={(formData as any)[field.key]}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.label}
                className="w-full px-4 py-2.5 bg-toss-gray-100 border-0 rounded-toss text-sm focus:ring-2 focus:ring-toss-blue focus:bg-white transition-all"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-4 border-t border-toss-gray-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingContact ? '수정' : '추가'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ContactPage
