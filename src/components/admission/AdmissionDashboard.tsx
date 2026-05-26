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
  admin_status: string
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
  backgroundImage?: string
  centerType?: 'ganghwa' | 'bupyeong'
}

// 입소날짜로부터 4개월 후 퇴소날짜 계산
const calculateDischargeDate = (admissionDate: string): string => {
  if (!admissionDate) return ''
  const date = new Date(admissionDate)
  date.setMonth(date.getMonth() + 4)
  return date.toISOString().split('T')[0]
}

// 이름 마스킹 (가운데 글자를 O로 처리)
const maskName = (name: string): string => {
  if (!name) return '-'
  if (name.length === 1) return name
  if (name.length === 2) return name[0] + 'O'
  const first = name[0]
  const last = name[name.length - 1]
  const middle = 'O'.repeat(name.length - 2)
  return first + middle + last
}

// 호실이 순수 숫자+호 형태인지 (부평: 국문 포함 시 퇴소예정일 미표시)
const isRoomOnly = (room: string): boolean => {
  if (!room) return true
  return /^\d+호?$/.test(room.trim())
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
const ROWS_PER_PAGE = 6

export default function AdmissionDashboard({ isOpen, onClose, records, stats, backgroundImage, centerType }: AdmissionDashboardProps) {
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

    // 1. 배경 이미지
    const bgFile = backgroundImage || 'back_2.jpg'
    const backImg = new Image()
    backImg.crossOrigin = 'anonymous'
    backImg.src = `${baseUrl}${bgFile}`
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
      const statsH = 120
      const statsW = 300
      const statsGap = 16
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
        ctx.fillRect(x, contentStartY, statsW, 44)

        // 라벨 텍스트
        ctx.fillStyle = BLUE_HEADER_TEXT
        ctx.font = 'bold 26px Pretendard, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(box.label, x + statsW / 2, contentStartY + 22)

        // 흰색 숫자 영역 (직각)
        ctx.fillStyle = ROW_WHITE
        ctx.fillRect(x, contentStartY + 44, statsW, statsH - 44)

        // 숫자 + 명
        ctx.fillStyle = TEXT_DARK
        ctx.font = 'bold 50px Pretendard, -apple-system, sans-serif'
        const numStr = `${box.value}`
        const numW = ctx.measureText(numStr).width
        ctx.fillText(numStr, x + statsW / 2 - 10, contentStartY + 44 + (statsH - 44) / 2)
        ctx.fillStyle = TEXT_LIGHT
        ctx.font = '28px Pretendard, -apple-system, sans-serif'
        ctx.fillText('명', x + statsW / 2 - 10 + numW / 2 + 10, contentStartY + 44 + (statsH - 44) / 2 + 4)
      })

      tableStartY = contentStartY + statsH + 20
    }

    // 3. 테이블
    const tableLeft = 60
    const tableW = W - 120
    const rowH = 100
    const headerRowH = 50

    // 컬럼 너비 (입소목록과 동일한 구조)
    const roomLabel = centerType === 'bupyeong' ? '호실/병원명' : '호실'
    const roomWidth = centerType === 'bupyeong' ? 180 : 80
    const cols = [
      { label: 'No', width: 60 },
      { label: '국가', width: 160 },
      { label: '입소일', width: 220 },
      { label: '성명', width: 160 },
      { label: '성별', width: 100 },
      { label: roomLabel, width: roomWidth },
      { label: '행정상황', width: centerType === 'bupyeong' ? 400 : 300 },
      { label: '비고', width: 0 },
    ]
    const usedWidth = cols.reduce((sum, c) => sum + c.width, 0)
    cols[cols.length - 1].width = tableW - usedWidth

    // 테이블 헤더 (파란색, 직각)
    ctx.fillStyle = BLUE_HEADER
    ctx.fillRect(tableLeft, tableStartY, tableW, headerRowH)

    // 헤더 텍스트 (흰색)
    ctx.fillStyle = BLUE_HEADER_TEXT
    ctx.font = 'bold 26px Pretendard, -apple-system, sans-serif'
    ctx.textBaseline = 'middle'
    let colX = tableLeft
    cols.forEach((col) => {
      ctx.textAlign = 'center'
      ctx.fillText(col.label, colX + col.width / 2, tableStartY + headerRowH / 2)
      colX += col.width
    })

    // 행정상황 컬럼 최대 텍스트 너비
    const adminMaxTextWidth = cols[6].width - 20
    // 비고 컬럼 최대 텍스트 너비
    const noteMaxTextWidth = cols[7].width - 20

    // 테이블 데이터 행
    pageRecords.forEach((record, index) => {
      const globalIndex = page * ROWS_PER_PAGE + index
      const y = tableStartY + headerRowH + index * rowH
      // 퇴소예정일 자동 계산 (부평: 호실이 국문 포함이면 미표시)
      const showDischarge = centerType !== 'bupyeong' || isRoomOnly(record.room)
      const dischargeDate = showDischarge
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
      ctx.font = '30px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${globalIndex + 1}`, cx + cols[0].width / 2, cellY)
      cx += cols[0].width

      // 국가 (location)
      ctx.fillStyle = TEXT_NORMAL
      ctx.font = 'bold 30px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(record.location || '-', cx + cols[1].width / 2, cellY)
      cx += cols[1].width

      // 입소일
      ctx.fillStyle = TEXT_DARK
      ctx.font = '600 30px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(formatDateShort(record.admission_date), cx + cols[2].width / 2, cellY)
      cx += cols[2].width

      // 성명 (ganghwa) - 마스킹 처리
      ctx.fillStyle = TEXT_NORMAL
      ctx.font = 'bold 30px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(maskName(record.ganghwa), cx + cols[3].width / 2, cellY)
      cx += cols[3].width

      // 성별 (bupyeong)
      ctx.fillText(record.bupyeong || '-', cx + cols[4].width / 2, cellY)
      cx += cols[4].width

      // 호실
      ctx.fillText(record.room || '-', cx + cols[5].width / 2, cellY)
      cx += cols[5].width

      // 행정상황 (여러 줄 지원)
      ctx.fillStyle = TEXT_NORMAL
      ctx.font = '22px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      const adminFullText = record.admin_status || '-'
      // 쉼표로 분리하여 여러 줄로 표시
      const adminParts = adminFullText.split(/[,،]\s*/).filter(Boolean)
      const adminLineHeight = 26
      const adminTotalHeight = adminParts.length * adminLineHeight
      const adminStartY = cellY - adminTotalHeight / 2 + adminLineHeight / 2
      adminParts.forEach((part, lineIdx) => {
        let lineText = part.trim()
        // 각 줄이 컬럼 너비를 초과하면 잘라내기
        while (ctx.measureText(lineText).width > adminMaxTextWidth && lineText.length > 1) {
          lineText = lineText.slice(0, -1)
        }
        if (lineText !== part.trim() && lineText.length > 0) {
          lineText += '..'
        }
        ctx.fillText(lineText, cx + cols[6].width / 2, adminStartY + lineIdx * adminLineHeight)
      })
      cx += cols[6].width

      // 비고 (가운데 정렬)
      ctx.font = '26px Pretendard, -apple-system, sans-serif'
      let noteText = record.notes || '-'
      while (ctx.measureText(noteText).width > noteMaxTextWidth && noteText.length > 1) {
        noteText = noteText.slice(0, -1)
      }
      if (noteText !== (record.notes || '-') && noteText.length > 0) {
        noteText += '..'
      }
      ctx.fillText(noteText, cx + cols[7].width / 2, cellY)
    })

    // 페이지 정보 (여러 페이지일 때)
    if (pages > 1) {
      const totalTableH = headerRowH + pageRecords.length * rowH
      const pageInfoY = tableStartY + totalTableH + 25
      ctx.fillStyle = TEXT_LIGHT
      ctx.font = '600 28px Pretendard, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${page + 1} / ${pages} 페이지`, W / 2, pageInfoY)
    }

    setCanvasDataUrl(canvas.toDataURL('image/png'))
    setIsLoading(false)
  }, [records, stats, backgroundImage, centerType])

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
