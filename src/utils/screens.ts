// 여러 모니터 지원 (Window Management API, Chrome·Edge 100 이상)
// 발표 화면을 특정 모니터에 전체화면으로 띄울 때 쓴다. 지원하지 않는 브라우저에서는 조용히 현재 모니터만 쓴다.

// 브라우저가 주는 모니터 정보 중 화면에 필요한 것만 추린 형태
export interface ScreenInfo {
    label: string        // 모니터 이름 (예: DELL U2720Q, 내장 디스플레이)
    isPrimary: boolean   // 주 모니터
    isInternal: boolean  // 노트북 내장 화면
    isCurrent: boolean   // 지금 브라우저 창이 있는 모니터
    width: number
    height: number
    raw: unknown         // requestFullscreen({ screen })에 그대로 넘길 브라우저 객체
}

interface ScreenDetailedLike {
    label?: string
    isPrimary?: boolean
    isInternal?: boolean
    width: number
    height: number
}

interface ScreenDetailsLike {
    screens: ScreenDetailedLike[]
    currentScreen: ScreenDetailedLike
}

const STORAGE_KEY = 'weeklyPresentation.screenLabel'

// 모니터가 2대 이상 연결돼 있는지 (권한 없이 확인할 수 있다)
export const isMultiScreen = (): boolean =>
    Boolean((window.screen as { isExtended?: boolean }).isExtended)

// 모니터를 골라 전체화면을 띄울 수 있는 브라우저인지
export const canPickScreen = (): boolean =>
    typeof (window as { getScreenDetails?: unknown }).getScreenDetails === 'function'

// 모니터 목록을 가져온다. 처음 호출하면 브라우저가 "창 관리" 권한을 묻고, 거부하면 예외가 난다.
export const getScreens = async (): Promise<ScreenInfo[]> => {
    const api = window as unknown as { getScreenDetails: () => Promise<ScreenDetailsLike> }
    const details = await api.getScreenDetails()
    return details.screens.map((screen, index) => ({
        label: screen.label || `모니터 ${index + 1}`,
        isPrimary: Boolean(screen.isPrimary),
        isInternal: Boolean(screen.isInternal),
        isCurrent: screen === details.currentScreen,
        width: screen.width,
        height: screen.height,
        raw: screen
    }))
}

// 목록에 붙여 보여줄 설명 (예: "1920×1080 · 주 모니터 · 현재 창")
export const describeScreen = (screen: ScreenInfo): string => {
    const parts = [`${screen.width}×${screen.height}`]
    if (screen.isInternal) parts.push('내장 화면')
    if (screen.isPrimary) parts.push('주 모니터')
    if (screen.isCurrent) parts.push('현재 창')
    return parts.join(' · ')
}

// 마지막으로 고른 모니터 이름을 기억해 두었다가 다음 발표 때 기본으로 고른다
export const getSavedScreenLabel = (): string => {
    try {
        return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
        return ''
    }
}

export const saveScreenLabel = (label: string) => {
    try {
        localStorage.setItem(STORAGE_KEY, label)
    } catch { /* 저장 못 해도 발표에는 지장 없음 */ }
}
