import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Download, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'

interface AdmissionRecord {
  id: string
  admission_date: string
  bupyeong: string
  ganghwa: string
  room: string
  discharge_date: string
  location: string
  notes: string
}

interface Stats {
  total: number
  active: number
  discharged: number
}

interface AdmissionDashboardProps {
  isOpen: boolean
  onClose: () => void
  records: AdmissionRecord[]
  stats: Stats
}

// 입소날짜로부터 4개월 후 퇴소날짜 계산
const calculateDischargeDate = (admissionDate: string): string => {
  if (!admissionDate) return ''
  const date = new Date(admissionDate)
  date.setMonth(date.getMonth() + 4)
  return date.toISOString().split('T')[0]
}

// 날짜 포맷팅
const formatDateShort = (dateStr: string): string => {
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

// 한 페이지에 표시 가능한 최대 행 수
const ROWS_PER_PAGE = 16

export default function AdmissionDashboard({ isOpen, onClose, records, stats }: AdmissionDashboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [canvasDataUrl, setCanvasDataUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ESC 키로 모달 닫기, 좌우 화살표로 페이지 이동
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFullscreen) {
        onClose()
      }
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        setCurrentPage(prev => prev - 1)
      }
      if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isFullscreen, onClose, currentPage, totalPages])

  // Canvas에 이미지 그리기
  const drawCanvas = useCallback(async (page: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsLoading(true)

    const scale = 2
    const W = 1920
    const H = 1080
    canvas.width = W * scale
    canvas.height = H * scale

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.scale(scale, scale)

    const baseUrl = import.meta.env.BASE_URL || '/'

    // 1. back_2.jpg 배경
    const backImg = new Image()
    backImg.crossOrigin = 'anonymous'
    backImg.src = `${baseUrl}back_2.jpg`
    await new Promise<void>((resolve) => {
      backImg.onload = () => resolve()
      backImg.onerror = () => resolve()
    })
    ctx.drawImage(backImg, 0, 0, W, H)

    // 상단 제목 아래부터 시작
    const contentStartY = 155

    // 페이지 계산
    const pages = Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE))
    setTotalPages(pages)

    const isFirstPage = page === 0
    const pageRecords = records.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)

    // === 색상 ===
    const BLUE_HEADER = '#3b6cb5'
    const BLUE_HEADER_TEXT = '#ffffff'
    const ROW_WHITE = 'rgba(255, 255, 255, 0.95)'
    const ROW_LIGHT = 'rgba(245, 247, 250, 0.95)'
    const TEXT_DARK = '#1a2332'
    const TEXT_NORMAL = '#2d3748'
    const TEXT_LIGHT = '#718096'

    // 2. 통계 박스 (첫 페이지에만)
    let tableStartY = contentStartY
    if (isFirstPage) {
      const statsH = 90
      const statsW = 260
      const statsGap = 12
      const totalStatsW = 3 * statsW + 2 * statsGap
      const statsStartX = (W - totalStatsW) / 2

      const statBoxes = [
        { label: '총 입소', value: stats.total },
        { label: '현재 입소 중', value: stats.active },
        { label: '퇴소 완료', value: stats.discharged },
      ]

      statBoxes.forEach((box, i) => {
        const x = statsStartX + i * (statsW + statsGap)

        // 파란 헤더 라벨 영역 (직각)
        ctx.fillStyle = BLUE_HEADER
        ctx.fillRect(x, contentStartY, statsW, 36)

        // 라벨 텍스트
        ctx.fillStyle = BLUE_HEADER_TEXT
        ctx.font = 'bold 17px Pretendard, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(box.label, x + statsW / 2, contentStartY + 18)

        // 흰색 숫자 영역 (직각)
        ctx.fillStyle = ROW_WHITE
        ctx.fillRect(x, contentStartY + 36, statsW, statsH - 36)

        // 숫자 + 명
        ctx.fillStyle = TEXT_DARK
        ctx.font = 'bold 38px Pretendard, -apple-system, sans-serif'
        const numStr = `${box.value}`
        const numW = ctx.measureText(numStr).width
        ctx.fillText(numStr, x + statsW / 2 - 10, contentStartY + 36 + (statsH - 36) / 2)
        ctx.fillStyle = TEXT_LIGHT
        ctx.font = '20px Pretendard, -apple-system, sans-serif'
        ctx.fillText('명', x + statsW / 2 - 10 + numW / 2 + 8, contentStartY + 36 + (statsH - 36) / 2 + 2)
      })

      tableStartY = contentStartY + statsH + 20
    }

    // 3. 테이블
    const tableLeft = 60
    const tableW = W - 120
    const rowH = 46
    const headerRowH = 48

    // 컬럼 너비
    const cols = [
      { label: 'No', width: 55 },
      { label: '입소날짜', width: 160 },
      { label: '부평', width: 190 },
      { label: '강화', width: 190 },
      { label: '현재위치(호실)', width: 280 },
      { label: '퇴소예정', width: 160 },
      { label: '비고', width: 0 },
    ]
    const usedWidth = cols.reduce((sum, c) => sum + c.width, 0)
    cols[cols.length - 1].width = tableW - usedWidth

    // 테이블 헤더 (파란색, 직각)
    ctx.fillStyle = BLUE_HEADER
    ctx.fillRect(tableLeft, tableStartY, tableW, headerRowH)

    // 헤더 텍스트 (흰색, 더 크게)
    ctx.fillStyle = BLUE_HEADER_TEXT
    ctx.font = 'bold 18px Pretendard, -apple-system, sans-serif'
    ctx.textBaseline = 'middle'
    let colX = tableLeft
    cols.forEach((col) => {
      ctx.textAlign = 'center'
      ctx.fillText(col.label, colX + col.width / 2, tableStartY + headerRowH / 2)
      colX += col.width
    })

    // 테이블 데이터 행
    pageRecords.forEach((record, index) => {
      const globalIndex = page * ROWS_PER_PAGE + index
      const y = tableStartY + headerRowH + index * rowH
      // 강화에 이름 있으면 자동 계산, 아니면 저장된 값
      const dischargeDate = record.ganghwa
        ? (record.discharge_date || calculateDischargeDate(record.admission_date))
        : (record.discharge_date || '')

      // 행 배경 (교차 색상, 직각)
      ctx.fillStyle = index % 2 === 0 ? ROW_WHITE : ROW_LIGHT
      ctx.fillRect(tableLeft, y, tableW, rowH)

      // 데이터
      ctx.textBaseline = 'middle'
      const cellY = y + rowH / 2
      let cx = tableLeft

      // No
      ctx.fillStyle = TEXT_LIGHT
      ctx.font = '16px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${globalIndex + 1}`, cx + cols[0].width / 2, cellY)
      cx += cols[0].width

      // 입소날짜
      ctx.fillStyle = TEXT_DARK
      ctx.font = '600 17px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(formatDateShort(record.admission_date), cx + cols[1].width / 2, cellY)
      cx += cols[1].width

      // 부평
      ctx.fillStyle = TEXT_NORMAL
      ctx.font = 'bold 17px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(record.bupyeong || '-', cx + cols[2].width / 2, cellY)
      cx += cols[2].width

      // 강화
      ctx.fillText(record.ganghwa || '-', cx + cols[3].width / 2, cellY)
      cx += cols[3].width

      // 현재위치(호실)
      const locationDisplay = record.location && record.room
        ? `${record.location}(${record.room})`
        : record.location || record.room || '-'
      ctx.fillText(locationDisplay, cx + cols[4].width / 2, cellY)
      cx += cols[4].width

      // 퇴소예정 (부평에 이름 있고 날짜 없으면 미정, 한 달 이내면 빨간색, 없으면 '-')
      const isDischargePending = !record.ganghwa && record.bupyeong && !dischargeDate
      if (isDischargePending) {
        ctx.fillStyle = '#2563eb'
        ctx.font = '600 17px Pretendard, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('미정', cx + cols[5].width / 2, cellY)
      } else if (dischargeDate) {
        ctx.fillStyle = isWithinOneMonth(dischargeDate) ? '#ef4444' : '#2563eb'
        ctx.font = '600 17px Pretendard, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(formatDateShort(dischargeDate), cx + cols[5].width / 2, cellY)
      } else {
        ctx.fillStyle = TEXT_LIGHT
        ctx.font = '17px Pretendard, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('-', cx + cols[5].width / 2, cellY)
      }
      cx += cols[5].width

      // 비고
      ctx.fillStyle = TEXT_NORMAL
      ctx.font = '16px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'left'
      const maxNoteWidth = cols[6].width - 20
      let noteText = record.notes || '-'
      while (ctx.measureText(noteText).width > maxNoteWidth && noteText.length > 1) {
        noteText = noteText.slice(0, -1)
      }
      if (noteText !== (record.notes || '-') && noteText.length > 0) {
        noteText += '...'
      }
      ctx.fillText(noteText, cx + 10, cellY)
    })

    // 페이지 정보 (여러 페이지일 때)
    if (pages > 1) {
      const totalTableH = headerRowH + pageRecords.length * rowH
      const pageInfoY = tableStartY + totalTableH + 25
      ctx.fillStyle = TEXT_LIGHT
      ctx.font = '600 16px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${page + 1} / ${pages} 페이지`, W / 2, pageInfoY)
    }

    setCanvasDataUrl(canvas.toDataURL('image/png'))
    setIsLoading(false)
  }, [records, stats])

  // isOpen이 true가 되면 Canvas 그리기
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0)
      const timer = setTimeout(() => {
        drawCanvas(0)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, drawCanvas])

  // 페이지 변경 시 다시 그리기
  useEffect(() => {
    if (isOpen) {
      drawCanvas(currentPage)
    }
  }, [currentPage, isOpen, drawCanvas])

  // 전체화면 토글
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  // 이미지 다운로드
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const pageStr = totalPages > 1 ? `_${currentPage + 1}` : ''
        link.download = `입소현황${pageStr}_${new Date().toISOString().split('T')[0]}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
    }, 'image/png')
  }, [currentPage, totalPages])

  const goToPrevPage = () => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1)
  }
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        style={{ display: 'none' }}
      />

      {!isFullscreen && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          title="닫기 (ESC)"
        >
          <X size={28} />
        </button>
      )}

      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full h-full"
      >
        {isLoading ? (
          <div className="text-white text-xl">로딩 중...</div>
        ) : canvasDataUrl ? (
          <>
            <img
              src={canvasDataUrl}
              alt="입소현황판"
              className={`max-w-full max-h-full object-contain ${isFullscreen ? 'w-full h-full' : ''}`}
              style={{
                maxWidth: isFullscreen ? '100%' : '90vw',
                maxHeight: isFullscreen ? '100%' : '90vh',
              }}
            />

            {!isFullscreen && (
              <div className="absolute bottom-4 right-4 flex gap-3 z-50">
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 bg-white/90 rounded-lg shadow-lg px-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="이전 페이지"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 px-2">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages - 1}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="다음 페이지"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all text-gray-800"
                  title="이미지 다운로드"
                >
                  <Download size={20} />
                  <span className="font-medium">저장</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all text-gray-800"
                  title="전체화면"
                >
                  <Maximize2 size={20} />
                  <span className="font-medium">전체화면</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-white text-xl">이미지를 생성할 수 없습니다.</div>
        )}
      </div>
    </div>
  )
}
