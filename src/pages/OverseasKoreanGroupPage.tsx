import { useState, useEffect, useCallback } from 'react'
import { Card, PageHeader } from '../components/common'
import { Search, Building, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, Mail, MapPin, User, Info } from 'lucide-react'

// 한인회 단체 정보 API 응답 타입
interface GroupRecord {
  id?: number
  grp_nm: string
  country_nm: string
  country_iso_alp2?: string
  charger_nm?: string
  email?: string
  homepage_url?: string
  foreign_addr?: string
  fndtn_dt?: string
  group_intro?: string
}

const API_KEY = import.meta.env.VITE_DATA_GO_KR_API_KEY || ''
const BASE_URL = 'https://apis.data.go.kr/1262000/OverseasKoreanGroupService/getOverseasKoreanGroupList'

export default function OverseasKoreanGroupPage() {
  const [records, setRecords] = useState<GroupRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<GroupRecord | null>(null)
  const itemsPerPage = 20

  // 데이터 조회
  const fetchData = useCallback(async (page: number, country?: string) => {
    if (!API_KEY) {
      setError('API 키가 설정되지 않았습니다. .env 파일에 VITE_DATA_GO_KR_API_KEY를 추가해주세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        serviceKey: API_KEY,
        numOfRows: String(itemsPerPage),
        pageNo: String(page),
        returnType: 'JSON',
      })
      if (country) {
        params.set('cond[country_nm::EQ]', country)
      }

      const response = await fetch(`${BASE_URL}?${params}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const json = await response.json()
      const data = json?.data || json?.response?.body?.items || []
      const total = json?.totalCount || json?.response?.body?.totalCount || 0
      setRecords(Array.isArray(data) ? data : [])
      setTotalCount(total)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(`데이터를 불러오는 중 오류가 발생했습니다: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(1)
  }, [fetchData])

  // 검색
  const handleSearch = () => {
    setCurrentPage(1)
    fetchData(1, searchQuery.trim() || undefined)
  }

  // 국가 필터
  const handleCountryFilter = (country: string) => {
    setCountryFilter(country)
    setSearchQuery(country)
    setCurrentPage(1)
    fetchData(1, country || undefined)
  }

  // 페이지 이동
  const goToPage = (page: number) => {
    setCurrentPage(page)
    fetchData(page, countryFilter || undefined)
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="space-y-6">
      <PageHeader
        title="재외동포 단체정보 (한인회)"
        subtitle="해외에 등록된 한인회, 한글학교 등 주요 단체 정보를 조회합니다"
        icon={Building}
      />

      {/* 검색 */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
            <input
              type="text"
              placeholder="국가명으로 검색 (예: 미국, 일본, 호주)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 border border-toss-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            <Search size={16} />
            검색
          </button>
          <button
            onClick={() => { setSearchQuery(''); setCountryFilter(''); fetchData(1) }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 border border-toss-gray-200 rounded-lg hover:bg-toss-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            초기화
          </button>
        </div>
        {totalCount > 0 && (
          <p className="mt-3 text-sm text-toss-gray-500">
            총 <strong>{totalCount.toLocaleString()}</strong>개 단체 조회됨
          </p>
        )}
      </Card>

      {/* 에러 */}
      {error && (
        <Card className="p-4 border-l-4 border-red-500 bg-red-50">
          <p className="text-red-700 text-sm">{error}</p>
        </Card>
      )}

      {/* 카드 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 && !error ? (
        <Card className="p-0">
          <div className="flex flex-col items-center justify-center py-20 text-toss-gray-400">
            <Building size={48} className="mb-4" />
            <p>{totalCount === 0 ? '데이터를 불러오는 중이거나 API 키를 확인해주세요' : '검색 결과가 없습니다'}</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((record, index) => (
              <Card
                key={record.id || index}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border border-toss-gray-100"
                onClick={() => setSelectedRecord(record)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-toss-gray-900 truncate">{record.grp_nm || '-'}</h3>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full cursor-pointer hover:bg-emerald-100"
                      onClick={(e) => { e.stopPropagation(); handleCountryFilter(record.country_nm) }}
                    >
                      {record.country_nm || '-'}
                    </span>
                  </div>
                </div>
                {record.charger_nm && (
                  <p className="text-sm text-toss-gray-600 flex items-center gap-1.5 mb-1">
                    <User size={14} className="text-toss-gray-400 flex-shrink-0" />
                    {record.charger_nm}
                  </p>
                )}
                {record.email && (
                  <p className="text-sm text-toss-gray-600 flex items-center gap-1.5 mb-1">
                    <Mail size={14} className="text-toss-gray-400 flex-shrink-0" />
                    <span className="truncate">{record.email}</span>
                  </p>
                )}
                {record.foreign_addr && (
                  <p className="text-sm text-toss-gray-500 flex items-start gap-1.5 mt-2">
                    <MapPin size={14} className="text-toss-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{record.foreign_addr}</span>
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-toss-gray-200 hover:bg-toss-gray-50 disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-toss-gray-600 px-3">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-toss-gray-200 hover:bg-toss-gray-50 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* 상세 모달 */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedRecord(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-toss-gray-900 pr-4">{selectedRecord.grp_nm}</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-toss-gray-400 hover:text-toss-gray-600 flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full mb-4">
                {selectedRecord.country_nm}
              </span>

              <div className="space-y-3">
                {selectedRecord.charger_nm && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={16} className="text-toss-gray-400" />
                    <span className="text-toss-gray-600">대표자:</span>
                    <span className="font-medium">{selectedRecord.charger_nm}</span>
                  </div>
                )}
                {selectedRecord.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={16} className="text-toss-gray-400" />
                    <span className="text-toss-gray-600">이메일:</span>
                    <a href={`mailto:${selectedRecord.email}`} className="text-toss-blue hover:underline">{selectedRecord.email}</a>
                  </div>
                )}
                {selectedRecord.homepage_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink size={16} className="text-toss-gray-400" />
                    <span className="text-toss-gray-600">홈페이지:</span>
                    <a href={selectedRecord.homepage_url} target="_blank" rel="noopener noreferrer" className="text-toss-blue hover:underline truncate">
                      {selectedRecord.homepage_url}
                    </a>
                  </div>
                )}
                {selectedRecord.foreign_addr && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={16} className="text-toss-gray-400 mt-0.5" />
                    <span className="text-toss-gray-600">주소:</span>
                    <span>{selectedRecord.foreign_addr}</span>
                  </div>
                )}
                {selectedRecord.fndtn_dt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Info size={16} className="text-toss-gray-400" />
                    <span className="text-toss-gray-600">설립일:</span>
                    <span>{selectedRecord.fndtn_dt}</span>
                  </div>
                )}
                {selectedRecord.group_intro && (
                  <div className="mt-4 p-3 bg-toss-gray-50 rounded-lg">
                    <p className="text-sm text-toss-gray-500 mb-1">단체 소개</p>
                    <p className="text-sm text-toss-gray-700 whitespace-pre-line">{selectedRecord.group_intro}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
