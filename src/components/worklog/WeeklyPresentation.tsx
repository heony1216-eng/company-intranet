// 주간 업무보고 발표 모드 (전체화면 슬라이드 쇼)
// - PPT 슬라이드 쇼처럼 화면에는 슬라이드만 보인다. 조작 버튼은 마우스를 움직일 때만 오른쪽 위에 잠깐 나타난다.
// - 1280×720 기준으로 그린 슬라이드를 화면 크기에 맞춰 통째로 확대/축소한다.
// - 업무마다 큰 제목 + 글머리표 항목으로 보여주고, 섹션 높이를 숨김 레이어에서 실제로 잰 뒤 장을 나눈다.
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
    type ReactNode
} from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Minimize2, X } from 'lucide-react'
import {
    buildSlides,
    flattenRows,
    getExtras,
    normalizeTasks,
    type CoverEntry,
    type PersonInfo,
    type PresentationReport,
    type ReportMeasure,
    type Slide,
    type SlideMetrics,
    type SlideTaskGroup
} from '../../utils/weeklyPresentationSlides'
import type { TaskDetail } from '../../utils/weeklyTaskUtils'
import type { ScreenInfo } from '../../utils/screens'

// 슬라이드 기준 크기 (16:9)
const SLIDE_W = 1280
const SLIDE_H = 720
// 업무 섹션 사이 간격 (본문의 space-y-8)
const SECTION_GAP = 32
// 항목 사이 간격 (목록의 space-y-2)
const ITEM_GAP = 8
// 한 장을 끝까지 채우지 않도록 본문 아래에 남겨 두는 여유 (답답해 보이지 않게)
const CAPACITY_MARGIN = 48
// 마우스가 멈춘 뒤 조작 버튼을 숨기기까지의 시간
const CONTROLS_HIDE_MS = 2500

interface WeeklyPresentationProps {
    reports: PresentationReport[]
    title: string                 // 표지 제목 (예: 2026년 9월 3주차 주간업무보고)
    screen?: ScreenInfo | null    // 전체화면을 띄울 모니터 (없으면 현재 모니터)
    onClose: () => void
}

// 구형 웹뷰에서는 requestFullscreen이 Promise를 돌려주지 않을 수 있어 안전하게 감싼다.
// screen을 주면 그 모니터에 전체화면을 띄운다 (Window Management API 지원 브라우저).
const safeRequestFullscreen = (el: HTMLElement | null, screen?: ScreenInfo | null) => {
    try {
        const options = screen ? ({ screen: screen.raw } as unknown as FullscreenOptions) : undefined
        const result = el?.requestFullscreen?.(options)
        if (result && typeof result.catch === 'function') result.catch(() => { /* 거부되면 창 안에서 발표 */ })
    } catch { /* 지원하지 않는 환경 */ }
}

const safeExitFullscreen = () => {
    try {
        if (!document.fullscreenElement) return
        const result = document.exitFullscreen?.()
        if (result && typeof result.catch === 'function') result.catch(() => { /* 무시 */ })
    } catch { /* 무시 */ }
}

// ===== 글 표시 부품 =====

// 줄바꿈으로 나뉜 글을 줄 단위로 나누고, 앞에 붙은 "-", "•" 같은 기호는 뗀다 (글머리표를 따로 그리므로)
const toLines = (text: string): string[] =>
    (text || '')
        .split('\n')
        .map(line => line.replace(/^\s*[-•·*▪◦]\s*/, '').trim())
        .filter(Boolean)

// 글머리표 목록. 한 줄이면 글머리표 하나, 여러 줄이면 줄마다 하나.
const BulletLines = ({ text, className }: { text: string; className: string }) => {
    const lines = toLines(text)
    if (lines.length === 0) return <p className={`${className} text-toss-gray-400`}>-</p>
    return (
        <ul className="space-y-1.5">
            {lines.map((line, i) => (
                <li key={i} className={`flex gap-4 ${className}`}>
                    <span className="shrink-0 text-toss-blue">•</span>
                    <span className="min-w-0 break-words">{line}</span>
                </li>
            ))}
        </ul>
    )
}

// 진척률: 막대 게이지 + 숫자 (100% 초록, 50% 이상 파랑, 그 외 주황). 배경 상자는 없다. 값이 없으면 아무것도 그리지 않는다.
const ProgressBadge = ({ value }: { value: string }) => {
    const n = Number(value)
    if (!value || Number.isNaN(n)) return null
    const pct = Math.max(0, Math.min(100, n))
    const tone = pct >= 100
        ? { text: 'text-green-600', bar: 'bg-green-500' }
        : pct >= 50
            ? { text: 'text-toss-blue', bar: 'bg-toss-blue' }
            : { text: 'text-amber-500', bar: 'bg-amber-400' }
    return (
        <div className="shrink-0 flex items-center gap-3 h-[42px]">
            <div className="w-24 h-2.5 rounded-full bg-toss-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`w-16 text-right text-[26px] font-bold tabular-nums ${tone.text}`}>{pct}%</span>
        </div>
    )
}

// ===== 카드 (실제 슬라이드와 측정 레이어가 같은 부품을 써야 높이가 같다) =====

// 업무내용 항목: 글머리표 내용 + (있으면) 비고, 오른쪽에 진척률 배지
const DetailItem = ({ detail, measureKey }: { detail: TaskDetail; measureKey?: string }) => (
    <li data-measure={measureKey} className="flex items-start gap-6 py-1">
        <div className="flex-1 min-w-0">
            <BulletLines text={detail.content} className="text-[26px] leading-relaxed text-toss-gray-800" />
            {detail.remark?.trim() && (
                <p className="mt-1 ml-8 flex gap-2 text-[21px] leading-snug text-toss-gray-500">
                    <span className="shrink-0 font-semibold text-toss-gray-400">비고</span>
                    <span className="min-w-0 break-words whitespace-pre-wrap">{detail.remark.trim()}</span>
                </p>
            )}
        </div>
        <ProgressBadge value={detail.progress} />
    </li>
)

// 업무 섹션: 번호 배지 + 큰 제목, 그 아래 항목 목록 (상자 없이 여백으로 구분)
const TaskCard = ({ group, children, measureKey }: { group: SlideTaskGroup; children?: ReactNode; measureKey?: string }) => (
    <section data-measure={measureKey}>
        <header className="flex items-center gap-4 mb-3">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-toss-blue text-white text-[22px] font-bold flex items-center justify-center tabular-nums">
                {String(group.no).padStart(2, '0')}
            </span>
            <h3 className="text-[34px] font-bold text-toss-gray-900 leading-tight min-w-0 break-words">{group.title}</h3>
            {group.continued && <span className="shrink-0 text-[20px] text-toss-gray-400">(계속)</span>}
        </header>
        <ul className="pl-4 space-y-2">{children}</ul>
    </section>
)

const ExtraCard = ({ label, text }: { label: string; text: string }) => (
    <section className="min-w-0 pl-5 border-l-4 border-toss-blue">
        <h3 className="text-[30px] font-bold text-toss-blue leading-tight mb-3">{label}</h3>
        <BulletLines text={text} className="text-[26px] leading-relaxed text-toss-gray-800" />
    </section>
)

// 금주 업무 · 특이사항 카드 (둘 다 있으면 나란히)
const ExtrasCards = ({ thisWeekWork, specialNotes, measureKey }: { thisWeekWork: string; specialNotes: string; measureKey?: string }) => (
    <div data-measure={measureKey} className={`grid gap-10 ${thisWeekWork && specialNotes ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {thisWeekWork && <ExtraCard label="금주 업무" text={thisWeekWork} />}
        {specialNotes && <ExtraCard label="특이사항" text={specialNotes} />}
    </div>
)

// 내용이 영역보다 크면 CSS zoom으로 줄여 모두 보이게 한다 (측정 오차나 카드 하나가 한 장보다 긴 경우의 안전장치)
const AutoFit = ({ className = '', children }: { className?: string; children: ReactNode }) => {
    const outerRef = useRef<HTMLDivElement>(null)
    const innerRef = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
        const outer = outerRef.current
        const inner = innerRef.current
        if (!outer || !inner) return
        inner.style.setProperty('zoom', '1')
        const available = outer.clientHeight
        const natural = inner.scrollHeight
        if (available > 0 && natural > available) {
            inner.style.setProperty('zoom', String(Math.max(0.3, available / natural)))
        }
    })
    return (
        <div ref={outerRef} className={`overflow-hidden ${className}`}>
            <div ref={innerRef}>{children}</div>
        </div>
    )
}

// 사람 슬라이드 · 사진 슬라이드 공통 머리글
const PersonHeader = ({ person, subtitle, right }: { person: PersonInfo; subtitle: string; right?: string }) => (
    <header className="flex items-end justify-between pb-5 border-b-2 border-toss-gray-200 shrink-0">
        <div className="min-w-0">
            <div className="text-[20px] font-semibold text-toss-blue truncate">{subtitle}</div>
            <div className="mt-1 flex items-center gap-5 min-w-0">
                <span className="text-[52px] font-bold text-toss-gray-900 leading-none shrink-0">{person.name}</span>
                <span className="px-4 py-1.5 rounded-full bg-toss-gray-100 text-[22px] font-medium text-toss-gray-600 truncate">
                    {person.team}{person.rank ? ` · ${person.rank}` : ''}
                </span>
            </div>
        </div>
        {right && <div className="text-[24px] text-toss-gray-400 tabular-nums shrink-0">{right}</div>}
    </header>
)

// ===== 슬라이드 종류별 화면 =====

const CoverSlide = ({ title, entries, onJump }: { title: string; entries: CoverEntry[]; onJump: (i: number) => void }) => {
    const many = entries.length > 10
    return (
        <div className="h-full flex flex-col px-20 py-16">
            <div className="text-[22px] font-semibold tracking-widest text-toss-blue">주간 업무보고</div>
            <h1 className="mt-3 text-[56px] font-bold leading-tight text-toss-gray-900">{title}</h1>
            <div className="mt-2 text-[22px] text-toss-gray-500">발표 순서 · {entries.length}건 (이름을 누르면 바로 이동)</div>
            <AutoFit className="mt-10 flex-1 min-h-0">
                <div className={`grid gap-x-10 gap-y-2 ${many ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {entries.map((entry, i) => (
                        <button
                            key={`${entry.name}-${i}`}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onJump(entry.slideIndex) }}
                            className={`flex items-center gap-4 text-left rounded-xl px-4 py-2.5 hover:bg-toss-gray-100 transition-colors ${many ? 'text-[22px]' : 'text-[26px]'}`}
                        >
                            <span className="w-10 h-10 shrink-0 rounded-full bg-toss-blue text-white flex items-center justify-center font-bold text-[20px]">{i + 1}</span>
                            <span className="font-semibold text-toss-gray-900 shrink-0">{entry.name}</span>
                            <span className="text-toss-gray-500 truncate">{entry.team}{entry.rank ? ` · ${entry.rank}` : ''}</span>
                        </button>
                    ))}
                </div>
            </AutoFit>
        </div>
    )
}

const PersonSlide = ({ slide, subtitle }: { slide: Extract<Slide, { kind: 'person' }>; subtitle: string }) => {
    const hasExtras = Boolean(slide.thisWeekWork || slide.specialNotes)
    return (
        <div className="h-full flex flex-col px-16 py-12">
            <PersonHeader
                person={slide.person}
                subtitle={subtitle}
                right={slide.pageCount > 1 ? `${slide.page} / ${slide.pageCount}` : undefined}
            />
            <AutoFit className="flex-1 min-h-0 mt-8">
                <div className="space-y-8">
                    {slide.groups.map(group => (
                        <TaskCard key={`${group.no}-${group.continued ? 'c' : 'f'}`} group={group}>
                            {group.details.map((detail, i) => <DetailItem key={i} detail={detail} />)}
                        </TaskCard>
                    ))}
                    {slide.groups.length === 0 && !hasExtras && (
                        <div className="py-24 text-center text-[26px] text-toss-gray-400">등록된 주간 업무가 없습니다</div>
                    )}
                    {hasExtras && <ExtrasCards thisWeekWork={slide.thisWeekWork} specialNotes={slide.specialNotes} />}
                </div>
            </AutoFit>
        </div>
    )
}

const PhotosSlide = ({ slide, subtitle }: { slide: Extract<Slide, { kind: 'photos' }>; subtitle: string }) => {
    const count = slide.urls.length
    const grid = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
    return (
        <div className="h-full flex flex-col px-16 py-12">
            <PersonHeader
                person={slide.person}
                subtitle={`${subtitle} · 첨부 사진`}
                right={slide.pageCount > 1 ? `${slide.page} / ${slide.pageCount}` : undefined}
            />
            <div className={`flex-1 min-h-0 mt-5 grid gap-4 ${grid}`}>
                {slide.urls.map((url, i) => (
                    <div key={`${url}-${i}`} className="min-h-0 rounded-xl bg-toss-gray-50 overflow-hidden flex items-center justify-center">
                        <img src={url} alt={`${slide.person.name} 첨부 사진 ${i + 1}`} className="max-w-full max-h-full object-contain" draggable={false} />
                    </div>
                ))}
            </div>
        </div>
    )
}

const EndSlide = ({ title, reportCount, onRestart }: { title: string; reportCount: number; onRestart: () => void }) => (
    <div className="h-full flex flex-col items-center justify-center text-center px-20">
        <div className="text-[22px] font-semibold tracking-widest text-toss-blue">주간 업무보고</div>
        <h1 className="mt-4 text-[56px] font-bold text-toss-gray-900">발표가 끝났습니다</h1>
        <p className="mt-4 text-[26px] text-toss-gray-500">{title} · 총 {reportCount}건</p>
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRestart() }}
            className="mt-12 px-8 py-4 rounded-toss-lg bg-toss-gray-100 text-toss-gray-800 text-[22px] font-semibold hover:bg-toss-gray-200 transition-colors"
        >
            처음으로
        </button>
    </div>
)

const SlideView = ({ slide, title, onJump }: { slide: Slide; title: string; onJump: (i: number) => void }) => {
    switch (slide.kind) {
        case 'cover': return <CoverSlide title={slide.title} entries={slide.entries} onJump={onJump} />
        case 'person': return <PersonSlide slide={slide} subtitle={title} />
        case 'photos': return <PhotosSlide slide={slide} subtitle={title} />
        case 'end': return <EndSlide title={slide.title} reportCount={slide.reportCount} onRestart={() => onJump(0)} />
    }
}

// ===== 높이 측정 레이어 =====
// 실제 슬라이드와 같은 폭·부품으로 카드를 그려 항목·머리글·상자 높이를 잰다. 보이지 않는 곳에서 렌더링된다.
const MeasureLayer = ({ reports, onMeasured }: { reports: PresentationReport[]; onMeasured: (metrics: SlideMetrics) => void }) => {
    const rootRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const root = rootRef.current
        if (!root) return
        let cancelled = false
        const heightOf = (el: Element | null) => (el ? el.getBoundingClientRect().height : 0)

        const measure = () => {
            if (cancelled) return
            const capacity = heightOf(root.querySelector('[data-measure="body"]')) - CAPACITY_MARGIN
            const measured: Record<string, ReportMeasure> = {}
            root.querySelectorAll<HTMLElement>('[data-report]').forEach(el => {
                const extrasEl = el.querySelector('[data-measure="extras"]')
                measured[el.dataset.report as string] = {
                    rowHeights: Array.from(el.querySelectorAll('[data-measure="row"]'), node => heightOf(node) + ITEM_GAP),
                    titleHeights: Array.from(el.querySelectorAll('[data-measure="title"]'), node => heightOf(node) + SECTION_GAP),
                    extrasHeight: extrasEl ? heightOf(extrasEl) + SECTION_GAP : 0
                }
            })
            onMeasured({ capacity, reports: measured })
        }

        measure()
        // 웹폰트가 늦게 적용되면 줄바꿈이 달라질 수 있어 폰트 로드 후 한 번 더 잰다
        document.fonts?.ready.then(() => { if (!cancelled) measure() }).catch(() => { /* 무시 */ })
        return () => { cancelled = true }
    }, [reports, onMeasured])

    return (
        <div ref={rootRef} aria-hidden="true" className="absolute top-0 left-0 invisible pointer-events-none" style={{ width: SLIDE_W }}>
            {/* 카드들이 들어갈 본문 높이를 재기 위한 빈 사람 슬라이드 */}
            <div className="flex flex-col px-16 py-12" style={{ width: SLIDE_W, height: SLIDE_H }}>
                <PersonHeader person={{ name: '측정', team: '측정', rank: '측정' }} subtitle="측정" right="1 / 1" />
                <div data-measure="body" className="flex-1 min-h-0 mt-8" />
            </div>
            {reports.map(report => {
                const tasks = normalizeTasks(report)
                const { thisWeekWork, specialNotes } = getExtras(report)
                return (
                    <div key={report.id} data-report={report.id} className="px-16">
                        {/* 항목 높이: 실제 카드와 같은 폭 안에서 잰다 */}
                        <TaskCard group={{ no: 1, title: '측정', continued: false, details: [] }}>
                            {flattenRows(tasks).map((row, i) => <DetailItem key={i} measureKey="row" detail={row.detail} />)}
                        </TaskCard>
                        {/* 머리글 높이: 항목이 없는 카드로 잰다 ("(계속)" 표시까지 포함해 넉넉하게) */}
                        {tasks.map((task, i) => (
                            <TaskCard key={i} measureKey="title" group={{ no: i + 1, title: task.title || '-', continued: true, details: [] }} />
                        ))}
                        {(thisWeekWork || specialNotes) && (
                            <ExtrasCards measureKey="extras" thisWeekWork={thisWeekWork} specialNotes={specialNotes} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ===== 발표 화면 =====

const WeeklyPresentation = ({ reports, title, screen = null, onClose }: WeeklyPresentationProps) => {
    const [metrics, setMetrics] = useState<SlideMetrics | null>(null)
    const handleMeasured = useCallback((next: SlideMetrics) => setMetrics(next), [])
    const slides = useMemo(() => buildSlides(reports, title, metrics), [reports, title, metrics])
    const total = slides.length

    const [index, setIndex] = useState(0)
    const [scale, setScale] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [controlsVisible, setControlsVisible] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const hideTimer = useRef<number | undefined>(undefined)

    const goTo = useCallback((i: number) => setIndex(Math.max(0, Math.min(total - 1, i))), [total])
    const next = useCallback(() => setIndex(i => Math.min(total - 1, i + 1)), [total])
    const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])

    // 전체화면 토글 (기존 현황판과 같은 방식)
    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) safeExitFullscreen()
        else safeRequestFullscreen(containerRef.current, screen)
    }, [screen])

    // 열릴 때: 전체화면 시도(버튼 클릭 직후라 허용됨) + 뒤 화면 스크롤 잠금. 닫힐 때 원복.
    useEffect(() => {
        safeRequestFullscreen(containerRef.current, screen)
        const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onChange)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('fullscreenchange', onChange)
            document.body.style.overflow = prevOverflow
            safeExitFullscreen()
        }
        // 고른 모니터는 열릴 때 한 번만 쓴다
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 키보드: 화살표·Space·PageUp/Down(무선 프레젠터)·Home/End·F·Esc
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
                    e.preventDefault(); next(); break
                case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
                    e.preventDefault(); prev(); break
                case 'Home': e.preventDefault(); goTo(0); break
                case 'End': e.preventDefault(); goTo(total - 1); break
                case 'f': case 'F': toggleFullscreen(); break
                // 전체화면일 때 Esc는 브라우저가 먼저 전체화면을 해제하므로, 그 다음 Esc에 종료된다
                case 'Escape': if (!document.fullscreenElement) onClose(); break
                default: return
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [next, prev, goTo, total, toggleFullscreen, onClose])

    // 무대 크기에 맞춰 슬라이드 배율 계산
    useEffect(() => {
        const stage = stageRef.current
        if (!stage) return
        const update = () => {
            const rect = stage.getBoundingClientRect()
            if (rect.width > 0 && rect.height > 0) {
                setScale(Math.min(rect.width / SLIDE_W, rect.height / SLIDE_H))
            }
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(stage)
        return () => observer.disconnect()
    }, [])

    // 마우스를 움직이면 조작 버튼과 커서를 잠깐 보여준다 (PPT 슬라이드 쇼처럼)
    const revealControls = useCallback(() => {
        setControlsVisible(true)
        window.clearTimeout(hideTimer.current)
        hideTimer.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS)
    }, [])
    useEffect(() => () => window.clearTimeout(hideTimer.current), [])

    // 무대 클릭: 왼쪽 절반은 이전, 오른쪽 절반은 다음
    const handleStageClick = (e: MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        if (e.clientX - rect.left < rect.width / 2) prev()
        else next()
    }

    // 슬라이드 수가 바뀌어도(측정 완료·데이터 갱신 등) 현재 위치가 범위를 벗어나지 않게 보정
    const currentIndex = Math.min(index, total - 1)
    useEffect(() => {
        if (index > total - 1) setIndex(total - 1)
    }, [index, total])

    const slide = slides[currentIndex]
    const controlButton = 'flex items-center justify-center w-11 h-11 rounded-full bg-white/15 text-white hover:bg-white/30 transition-colors'

    return createPortal(
        <div
            ref={containerRef}
            className={`fixed inset-0 z-[100] bg-black select-none ${controlsVisible ? 'cursor-default' : 'cursor-none'}`}
            role="dialog"
            aria-modal="true"
            aria-label="주간 업무보고 발표"
            onMouseMove={revealControls}
            onTouchStart={revealControls}
        >
            <MeasureLayer reports={reports} onMeasured={handleMeasured} />

            {/* 무대: 슬라이드를 화면 비율에 맞춰 가운데에 꽉 채운다 */}
            <div ref={stageRef} className="absolute inset-0" onClick={handleStageClick}>
                <div
                    className="absolute left-1/2 top-1/2"
                    style={{ width: SLIDE_W, height: SLIDE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
                >
                    <div className="relative w-full h-full bg-white overflow-hidden text-toss-gray-900">
                        {/* 위쪽 파란 띠 (PPT 테마 느낌) */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-toss-blue" />
                        <SlideView slide={slide} title={title} onJump={goTo} />
                        {/* 슬라이드 번호 (PPT 페이지 번호처럼 오른쪽 아래에 작게) */}
                        <div className="absolute right-12 bottom-5 text-[16px] text-toss-gray-400 tabular-nums">
                            {currentIndex + 1} / {total}
                        </div>
                    </div>
                </div>
            </div>

            {/* 조작 버튼: 마우스를 움직일 때만 오른쪽 위에 잠깐 나타난다 */}
            <div
                className={`absolute top-4 right-4 flex items-center gap-2 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <button type="button" onClick={toggleFullscreen} className={controlButton} title={isFullscreen ? '전체화면 해제 (F)' : '전체화면 (F)'} aria-label="전체화면 전환">
                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button type="button" onClick={onClose} className={controlButton} title="발표 종료 (Esc)" aria-label="발표 종료">
                    <X size={20} />
                </button>
            </div>
        </div>,
        document.body
    )
}

export default WeeklyPresentation
