// 주간 업무보고 발표 모드용 슬라이드 생성 유틸리티
// 보고서 배열을 "표지 → 사람별 슬라이드(자동 분할) → 사진 → 끝" 순서의 슬라이드 배열로 바꾼다.
// 분할은 화면에서 실제로 잰 행 높이(SlideMetrics)를 기준으로 하므로 내용이 잘리지 않고 모두 보인다.
// 화면과 무관한 순수 함수만 두어 렌더링 컴포넌트와 분리한다.
import { parseWeeklyTasks, type TaskDetail, type WeeklyTask } from './weeklyTaskUtils'

// 발표에 필요한 보고서 필드 (work_logs 행 + 조인된 사용자 정보)
export interface PresentationReport {
    id: string
    work_date: string
    morning_work: string
    this_week_work?: string | null
    special_notes?: string | null
    file_urls?: unknown[] | null
    user?: { name?: string | null; team?: string | null; rank?: string | null } | null
}

export interface PersonInfo {
    name: string
    team: string
    rank: string
}

// 표지의 발표 순서 항목 (이름 클릭 시 이동할 슬라이드 위치 포함)
export interface CoverEntry extends PersonInfo {
    slideIndex: number
}

// 슬라이드 한 장에 들어가는 업무 카드 (제목 머리글 + 업무내용 항목들)
export interface SlideTaskGroup {
    no: number            // 보고서 안에서의 업무 순번
    title: string
    continued: boolean    // 앞 슬라이드에서 이어지는 카드면 "(계속)" 표시
    details: TaskDetail[]
}

export type Slide =
    | { kind: 'cover'; title: string; entries: CoverEntry[] }
    | {
        kind: 'person'
        person: PersonInfo
        page: number
        pageCount: number
        groups: SlideTaskGroup[]
        thisWeekWork: string   // 마지막 장에만 채워짐
        specialNotes: string   // 마지막 장에만 채워짐
    }
    | { kind: 'photos'; person: PersonInfo; page: number; pageCount: number; urls: string[] }
    | { kind: 'end'; title: string; reportCount: number }

// 보고서 하나의 표 행 (업무 순번 + 업무내용 행). 측정 레이어와 분할 로직이 같은 순서를 쓴다.
export interface ReportRow {
    taskIndex: number
    detail: TaskDetail
}

// 화면에서 잰 높이 (1280×720 기준 슬라이드의 px)
export interface ReportMeasure {
    rowHeights: number[]     // flattenRows 순서와 같은 업무내용 항목 높이
    titleHeights: number[]   // 업무 카드의 머리글·테두리·카드 간격 높이 (업무 순서와 같음, "(계속)" 표시 포함)
    extrasHeight: number     // 금주 업무·특이사항 카드 높이 (카드 간격 포함, 없으면 0)
}

export interface SlideMetrics {
    capacity: number                       // 카드들이 들어갈 수 있는 본문 높이
    reports: Record<string, ReportMeasure> // 보고서 id별 측정값
}

// 사진 슬라이드 한 장당 사진 수
const PHOTOS_PER_SLIDE = 4

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']

// Dropbox 공유 링크를 바로 볼 수 있는 이미지 링크로 변환 (목록 페이지와 같은 규칙)
const toDirectImageUrl = (url: string) =>
    url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '')
        .replace('&dl=0', '')
        .replace('?dl=1', '')
        .replace('&dl=1', '')

// 첨부 파일 목록에서 이미지 URL만 뽑는다 (문자열 또는 { url } 객체 모두 지원)
export const getImageUrls = (fileUrls: unknown[] | null | undefined): string[] =>
    (fileUrls || [])
        .map(item => (typeof item === 'string' ? item : (item as { url?: string } | null)?.url || ''))
        .filter(Boolean)
        .map(toDirectImageUrl)
        .filter(url => IMAGE_EXTENSIONS.some(ext => url.toLowerCase().includes(ext)))

const toPersonInfo = (report: PresentationReport): PersonInfo => ({
    name: report.user?.name || '알 수 없음',
    team: report.user?.team || '팀 미설정',
    rank: report.user?.rank || ''
})

// 발표 순서: 팀 → 이름 가나다순 (팀 미설정은 맨 뒤)
export const sortReportsForPresentation = (reports: PresentationReport[]): PresentationReport[] =>
    [...reports].sort((a, b) => {
        const teamA = a.user?.team || ''
        const teamB = b.user?.team || ''
        if (teamA !== teamB) {
            if (!teamA) return 1
            if (!teamB) return -1
            return teamA.localeCompare(teamB, 'ko')
        }
        return (a.user?.name || '').localeCompare(b.user?.name || '', 'ko')
    })

// 발표용으로 업무 목록을 정리한다: 빈 업무내용 행은 빼고, 제목만 있는 업무는 빈 행 하나로 제목이 보이게 한다
export const normalizeTasks = (report: PresentationReport): WeeklyTask[] =>
    parseWeeklyTasks(report.morning_work)
        .map(task => {
            const details = task.details.filter(d => (d.content || '').trim())
            return {
                title: task.title || '',
                details: details.length > 0 || !task.title.trim()
                    ? details
                    : [{ content: '', progress: '', remark: '' }]
            }
        })
        .filter(task => task.details.length > 0)

// 업무 목록을 표 행 순서로 펼친다
export const flattenRows = (tasks: WeeklyTask[]): ReportRow[] =>
    tasks.flatMap((task, taskIndex) => task.details.map(detail => ({ taskIndex, detail })))

// 금주 업무 · 특이사항 (앞뒤 공백 제거)
export const getExtras = (report: PresentationReport) => ({
    thisWeekWork: (report.this_week_work || '').trim(),
    specialNotes: (report.special_notes || '').trim()
})

// 잰 높이를 기준으로 업무 카드를 여러 장으로 나눈다. 카드 높이 = 머리글 높이 + 항목 높이의 합.
// 카드가 다음 장으로 이어지면 머리글을 다시 그리므로 그 장에서도 머리글 높이를 더한다.
// 측정값이 없으면 한 장에 모두 넣는다 (화면의 AutoFit이 줄여서 보여준다).
const paginate = (
    tasks: WeeklyTask[],
    measure: ReportMeasure | undefined,
    capacity: number
): { pages: SlideTaskGroup[][]; heights: number[] } => {
    const pages: SlideTaskGroup[][] = []
    const heights: number[] = []
    let page: SlideTaskGroup[] = []
    let pageHeight = 0 // 이 장에 확정된 카드 높이의 합 (진행 중인 카드 제외)

    const flush = (pendingHeight: number) => {
        if (page.length === 0) return
        pages.push(page)
        heights.push(pageHeight + pendingHeight)
        page = []
        pageHeight = 0
    }

    let rowIndex = 0
    tasks.forEach((task, taskIndex) => {
        const titleHeight = measure?.titleHeights[taskIndex] ?? 0
        let group: SlideTaskGroup | null = null
        let groupRowsHeight = 0
        let started = false // 이 업무의 행이 이미 앞 슬라이드에 들어갔는지

        for (const detail of task.details) {
            const rowHeight = measure?.rowHeights[rowIndex] ?? 0
            rowIndex += 1
            const groupHeightWithRow = titleHeight + groupRowsHeight + rowHeight
            const pageHasRows = pageHeight > 0 || (group !== null && group.details.length > 0)

            // 이 행을 넣으면 넘칠 때: 지금까지 넣은 행으로 이 장을 마무리하고 다음 장으로 넘긴다
            if (measure && pageHasRows && pageHeight + groupHeightWithRow > capacity) {
                flush(group ? titleHeight + groupRowsHeight : 0)
                group = null
                groupRowsHeight = 0
            }
            if (!group) {
                group = { no: taskIndex + 1, title: task.title || '-', continued: started, details: [] }
                page.push(group)
                started = true
            }
            group.details.push(detail)
            groupRowsHeight += rowHeight
        }
        if (group) pageHeight += titleHeight + groupRowsHeight
    })
    flush(0)

    return { pages, heights }
}

// 보고서 하나를 사람 슬라이드 1장 이상으로 나눈다
const buildPersonSlides = (
    report: PresentationReport,
    person: PersonInfo,
    metrics: SlideMetrics | null | undefined
): Slide[] => {
    const tasks = normalizeTasks(report)
    const usable = Boolean(metrics && metrics.capacity > 0)
    const capacity = usable && metrics ? metrics.capacity : Infinity
    const measure = usable && metrics ? metrics.reports[report.id] : undefined

    const { pages, heights } = paginate(tasks, measure, capacity)

    // 업무가 하나도 없어도 사람 슬라이드는 1장 만든다
    if (pages.length === 0) {
        pages.push([])
        heights.push(0)
    }

    // 금주 업무·특이사항은 마지막 장 아래에 붙이되, 자리가 없으면 별도 장으로 뺀다
    const { thisWeekWork, specialNotes } = getExtras(report)
    const hasExtras = Boolean(thisWeekWork || specialNotes)
    const lastPageHasRows = pages[pages.length - 1].length > 0
    if (hasExtras && measure && lastPageHasRows && heights[heights.length - 1] + measure.extrasHeight > capacity) {
        pages.push([])
    }

    const pageCount = pages.length
    return pages.map((groups, i) => {
        const isLast = i === pageCount - 1
        return {
            kind: 'person',
            person,
            page: i + 1,
            pageCount,
            groups,
            thisWeekWork: isLast ? thisWeekWork : '',
            specialNotes: isLast ? specialNotes : ''
        }
    })
}

// 첨부 이미지를 사진 슬라이드로 나눈다 (없으면 빈 배열)
const buildPhotoSlides = (report: PresentationReport, person: PersonInfo): Slide[] => {
    const urls = getImageUrls(report.file_urls)
    const pageCount = Math.ceil(urls.length / PHOTOS_PER_SLIDE)
    const slides: Slide[] = []
    for (let i = 0; i < pageCount; i++) {
        slides.push({
            kind: 'photos',
            person,
            page: i + 1,
            pageCount,
            urls: urls.slice(i * PHOTOS_PER_SLIDE, (i + 1) * PHOTOS_PER_SLIDE)
        })
    }
    return slides
}

// 발표 슬라이드 전체를 만든다. metrics가 없으면 사람마다 한 장씩만 만든다(측정 전 임시 상태).
export const buildSlides = (
    reports: PresentationReport[],
    title: string,
    metrics?: SlideMetrics | null
): Slide[] => {
    const sorted = sortReportsForPresentation(reports)
    const entries: CoverEntry[] = []
    const slides: Slide[] = [{ kind: 'cover', title, entries }]

    sorted.forEach(report => {
        const person = toPersonInfo(report)
        entries.push({ ...person, slideIndex: slides.length })
        slides.push(...buildPersonSlides(report, person, metrics))
        slides.push(...buildPhotoSlides(report, person))
    })

    slides.push({ kind: 'end', title, reportCount: sorted.length })
    return slides
}
