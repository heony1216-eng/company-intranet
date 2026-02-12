import { useState, useMemo } from 'react'
import { Card } from '../components/common'
import { Search, Globe, Users, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import {
  overseasKoreanData,
  REGIONS,
  REGION_TOTALS,
  TOTAL_OVERSEAS_KOREANS,
  type Region,
} from '../constants/overseasKoreanData'

export default function OverseasKoreanStatusPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<Region>('전체')
  const [sortField, setSortField] = useState<'country' | 'population'>('population')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 60

  // 필터링 + 정렬
  const filteredRecords = useMemo(() => {
    let result = [...overseasKoreanData]

    // 지역 필터
    if (selectedRegion !== '전체') {
      result = result.filter(r => r.region === selectedRegion)
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(r => r.country.toLowerCase().includes(q))
    }

    // 정렬
    result.sort((a, b) => {
      if (sortField === 'population') {
        return sortDir === 'asc' ? a.population - b.population : b.population - a.population
      }
      return sortDir === 'asc'
        ? a.country.localeCompare(b.country, 'ko')
        : b.country.localeCompare(a.country, 'ko')
    })

    return result
  }, [searchQuery, selectedRegion, sortField, sortDir])

  // 페이지 리셋
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedRegion, sortField, sortDir])

  // 정렬 토글
  const toggleSort = (field: 'country' | 'population') => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'population' ? 'desc' : 'asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage))
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // 현재 필터 기준 합계
  const filteredTotal = filteredRecords.reduce((sum, r) => sum + r.population, 0)

  const formatNumber = (n: number) => n.toLocaleString()

  // 지역별 색상
  const regionColors: Record<string, { badge: string; bg: string }> = {
    '동북아시아': { badge: 'bg-red-50 text-red-700 border-red-200', bg: 'from-red-500 to-red-600' },
    '남아시아태평양': { badge: 'bg-blue-50 text-blue-700 border-blue-200', bg: 'from-blue-500 to-blue-600' },
    '북미': { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', bg: 'from-indigo-500 to-indigo-600' },
    '중남미': { badge: 'bg-amber-50 text-amber-700 border-amber-200', bg: 'from-amber-500 to-amber-600' },
    '러시아·CIS': { badge: 'bg-purple-50 text-purple-700 border-purple-200', bg: 'from-purple-500 to-purple-600' },
    '유럽': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bg: 'from-emerald-500 to-emerald-600' },
    '아프리카': { badge: 'bg-orange-50 text-orange-700 border-orange-200', bg: 'from-orange-500 to-orange-600' },
    '중동': { badge: 'bg-teal-50 text-teal-700 border-teal-200', bg: 'from-teal-500 to-teal-600' },
  }

  // 상위 5개국 (전체 기준)
  const top5 = useMemo(() => {
    return [...overseasKoreanData]
      .sort((a, b) => b.population - a.population)
      .slice(0, 5)
  }, [])

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card className="bg-gradient-to-r from-toss-blue to-blue-600 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <Globe size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1">재외동포 현황조회</h2>
            <p className="text-white/90 text-sm">2025 재외동포현황 (기준: 2024.12.31, 출처: 재외동포청)</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-white/70 text-xs">전 세계 재외동포</p>
            <p className="text-2xl font-bold">{formatNumber(TOTAL_OVERSEAS_KOREANS)}<span className="text-sm font-normal text-white/80 ml-1">명</span></p>
            <p className="text-white/70 text-xs">194개국</p>
          </div>
        </div>
      </Card>

      {/* 상위 5개국 + 지역별 분포 요약 (가로 2단) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 상위 5개국 */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-toss-blue" />
            <h3 className="text-sm font-bold text-toss-gray-800">상위 5개국</h3>
          </div>
          <div className="space-y-2">
            {top5.map((record, i) => {
              const widthPct = (record.population / top5[0].population) * 100
              return (
                <div key={record.country} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                    i === 2 ? 'bg-orange-300 text-orange-800' :
                    'bg-toss-gray-100 text-toss-gray-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm font-medium text-toss-gray-800 w-24 shrink-0">{record.country}</span>
                  <div className="flex-1 h-5 bg-toss-gray-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-toss-blue to-blue-400 rounded-full transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-toss-gray-700 tabular-nums w-24 text-right">{formatNumber(record.population)}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 지역별 분포 */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-toss-blue" />
            <h3 className="text-sm font-bold text-toss-gray-800">지역별 분포</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(REGION_TOTALS).map(([region, total]) => {
              const pct = ((total / TOTAL_OVERSEAS_KOREANS) * 100).toFixed(1)
              const isActive = selectedRegion === region
              return (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(isActive ? '전체' : region as Region)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-toss-blue/10 ring-1 ring-toss-blue'
                      : 'bg-toss-gray-50 hover:bg-toss-gray-100'
                  }`}
                >
                  <div>
                    <p className="text-xs text-toss-gray-500">{region}</p>
                    <p className="text-sm font-bold text-toss-gray-800">{formatNumber(total)}</p>
                  </div>
                  <span className="text-xs text-toss-gray-400 font-medium">{pct}%</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      {/* 검색 + 지역 필터 + 리스트 */}
      <Card className="p-0 overflow-hidden">
        {/* 검색 & 필터 바 */}
        <div className="px-4 pt-4 pb-3 border-b border-toss-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-400" />
              <input
                type="text"
                placeholder="국가명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-toss-gray-200 rounded-lg focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue outline-none text-sm"
              />
            </div>
            {/* 정렬 버튼 */}
            <div className="flex items-center border border-toss-gray-200 rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => toggleSort('population')}
                className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 ${
                  sortField === 'population' ? 'bg-toss-blue text-white' : 'bg-white text-toss-gray-600 hover:bg-toss-gray-50'
                }`}
              >
                인구순 {sortField === 'population' && <SortIcon field="population" />}
              </button>
              <button
                onClick={() => toggleSort('country')}
                className={`px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1 border-l border-toss-gray-200 ${
                  sortField === 'country' ? 'bg-toss-blue text-white' : 'bg-white text-toss-gray-600 hover:bg-toss-gray-50'
                }`}
              >
                이름순 {sortField === 'country' && <SortIcon field="country" />}
              </button>
            </div>
          </div>

          {/* 지역 필터 탭 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {REGIONS.map(region => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  selectedRegion === region
                    ? 'bg-toss-blue text-white border-toss-blue'
                    : 'bg-white text-toss-gray-600 border-toss-gray-200 hover:border-toss-blue hover:text-toss-blue'
                }`}
              >
                {region}
                {region !== '전체' && (
                  <span className="ml-1 opacity-70">
                    {overseasKoreanData.filter(r => r.region === region).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 결과 요약 */}
          <p className="mt-2 text-xs text-toss-gray-400">
            {selectedRegion !== '전체' && <span className="text-toss-blue font-medium">{selectedRegion} · </span>}
            {filteredRecords.length}개국 · 총 {formatNumber(filteredTotal)}명
          </p>
        </div>

        {/* 반응형 다열 리스트: 모바일 1열, md 2열, lg 3열 */}
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-toss-gray-400">
            <Users size={40} className="mb-3" />
            <p className="text-sm">검색 결과가 없습니다</p>
          </div>
        ) : (
          <>
            {/* 모바일: 단순 1열 리스트 */}
            <div className="md:hidden divide-y divide-toss-gray-100">
              {paginatedRecords.map((record, index) => {
                const rank = (currentPage - 1) * itemsPerPage + index + 1
                return (
                  <div key={record.country} className="flex items-center gap-2.5 px-4 py-2 hover:bg-toss-gray-50">
                    <span className="text-xs text-toss-gray-400 tabular-nums w-6 text-right shrink-0">{rank}</span>
                    <span className="text-sm font-semibold text-toss-gray-900 truncate">{record.country}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border shrink-0 ${regionColors[record.region]?.badge || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {record.region}
                    </span>
                    <span className="text-sm font-bold text-toss-gray-700 tabular-nums ml-auto shrink-0">{formatNumber(record.population)}</span>
                  </div>
                )
              })}
            </div>

            {/* 태블릿: 2열 */}
            <div className="hidden md:grid md:grid-cols-2 lg:hidden divide-x divide-toss-gray-100">
              {(() => {
                const colSize = Math.ceil(paginatedRecords.length / 2)
                return [0, 1].map(colIdx => (
                  <div key={colIdx} className="divide-y divide-toss-gray-100">
                    {paginatedRecords.slice(colIdx * colSize, (colIdx + 1) * colSize).map((record, i) => {
                      const rank = (currentPage - 1) * itemsPerPage + (colIdx * colSize) + i + 1
                      return (
                        <div key={record.country} className="flex items-center gap-2 px-3 py-1.5 hover:bg-toss-gray-50">
                          <span className="text-[11px] text-toss-gray-400 tabular-nums w-5 text-right shrink-0">{rank}</span>
                          <span className="text-[13px] font-semibold text-toss-gray-900 truncate">{record.country}</span>
                          <span className={`px-1 py-px text-[9px] font-medium rounded border shrink-0 ${regionColors[record.region]?.badge || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {record.region}
                          </span>
                          <span className="text-[13px] font-bold text-toss-gray-700 tabular-nums ml-auto shrink-0">{formatNumber(record.population)}</span>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>

            {/* 데스크탑: 3열 */}
            <div className="hidden lg:grid lg:grid-cols-3 divide-x divide-toss-gray-100">
              {(() => {
                const colSize = Math.ceil(paginatedRecords.length / 3)
                return [0, 1, 2].map(colIdx => (
                  <div key={colIdx} className="divide-y divide-toss-gray-100">
                    {paginatedRecords.slice(colIdx * colSize, (colIdx + 1) * colSize).map((record, i) => {
                      const rank = (currentPage - 1) * itemsPerPage + (colIdx * colSize) + i + 1
                      return (
                        <div key={record.country} className="flex items-center gap-2 px-3 py-1.5 hover:bg-toss-gray-50">
                          <span className="text-[11px] text-toss-gray-400 tabular-nums w-5 text-right shrink-0">{rank}</span>
                          <span className="text-[13px] font-semibold text-toss-gray-900 truncate">{record.country}</span>
                          <span className={`px-1 py-px text-[9px] font-medium rounded border shrink-0 ${regionColors[record.region]?.badge || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {record.region}
                          </span>
                          <span className="text-[13px] font-bold text-toss-gray-700 tabular-nums ml-auto shrink-0">{formatNumber(record.population)}</span>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-toss-gray-100 bg-toss-gray-50">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-toss-gray-200 bg-white hover:bg-toss-gray-50 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} /> 이전
                </button>
                <span className="text-xs text-toss-gray-500">
                  <strong className="text-toss-gray-700">{currentPage}</strong> / {totalPages} 페이지
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-toss-gray-200 bg-white hover:bg-toss-gray-50 disabled:opacity-30 transition-colors"
                >
                  다음 <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
