// 입소현황 목록 (강화·부평 센터 공용)
// - PC: 화면 폭에 맞는 표 (가로 스크롤 없이 퇴소·수정·삭제 버튼이 항상 보임)
// - 모바일: 사람 단위 카드 (호실 배지 + 이름 강조 → 날짜 → 행정상황 순)
// 페이지마다 컬럼 이름이 달라서(강화: ganghwa/bupyeong/location, 부평: name/gender/nationality)
// toView로 공통 형태(AdmissionView)로 바꿔 받는다.
import type { MutableRefObject } from 'react'
import { Edit2, Trash2, Building2 } from 'lucide-react'

export interface AdmissionView {
    name: string
    gender: string
    country: string
    room: string               // 호실 번호 또는 병원명(호실)
    admissionDate: string      // YYYY-MM-DD
    expectedDischarge: string  // 자동 계산된 퇴소 예정일 ('' = 표시 안 함)
    dischargeDate: string      // 실제(직접 입력) 퇴소일 ('' = 없음)
    adminStatus: string        // 행정상황
    notes: string              // 비고
}

type Accent = 'blue' | 'emerald'

interface AdmissionRecordListProps<T extends { id: string }> {
    records: T[]
    toView: (record: T) => AdmissionView
    variant: 'active' | 'discharged'
    accent: Accent
    roomLabel: string                          // 표 머리글 (예: 호실, 호실·병원)
    focusId?: string | null                    // 통합검색 ?focus= 로 들어온 기록
    focusRef?: MutableRefObject<HTMLElement | null>
    onDischarge?: (id: string) => void
    onEdit: (record: T) => void
    onDelete: (id: string) => void
}

// 센터별 강조색 (Tailwind가 찾을 수 있게 전체 클래스명을 그대로 적는다)
const ACCENT: Record<Accent, { badge: string; date: string; edit: string }> = {
    blue: {
        badge: 'bg-blue-50 text-blue-700',
        date: 'text-blue-600',
        edit: 'text-toss-blue hover:bg-blue-100',
    },
    emerald: {
        badge: 'bg-emerald-50 text-emerald-700',
        date: 'text-emerald-600',
        edit: 'text-emerald-600 hover:bg-emerald-100',
    },
}

// ===== 날짜 도우미 =====

const formatDate = (d: string) => (d ? d.replace(/-/g, '.') : '-')

const startOfToday = () => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

// 오늘부터 해당 날짜까지 남은 일수 (지난 날짜는 음수)
const daysUntil = (d: string): number | null => {
    if (!d) return null
    const [y, m, day] = d.split('-').map(Number)
    if (!y || !m || !day) return null
    return Math.round((new Date(y, m - 1, day).getTime() - startOfToday().getTime()) / 86400000)
}

// 오늘~한 달 이내 (기존 화면의 빨간색 표시 기준과 같다)
const isWithinOneMonth = (d: string) => {
    const n = daysUntil(d)
    if (n === null || n < 0) return false
    const today = startOfToday()
    const limit = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
    return n <= Math.round((limit.getTime() - today.getTime()) / 86400000)
}

const dDayText = (n: number) => (n === 0 ? 'D-day' : `D-${n}`)

// 순수 호실 번호인지 (예: 302, 302호) — 병원명 등은 배지 대신 글로 보여 준다
const isRoomNumber = (room: string) => /^\d+호?$/.test((room || '').trim())

// ===== 작은 부품 =====

// 퇴소 예정일: 한 달 이내면 빨간색 + D-day
const ExpectedDate = ({ date, accent, compact = false }: { date: string; accent: Accent; compact?: boolean }) => {
    if (!date) return <span className="text-toss-gray-300">-</span>
    const soon = isWithinOneMonth(date)
    const n = daysUntil(date)
    return (
        <span className={`inline-flex items-center gap-1.5 ${compact ? 'flex-wrap' : 'whitespace-nowrap'}`}>
            <span className={`font-semibold tabular-nums ${soon ? 'text-red-500' : ACCENT[accent].date}`}>{formatDate(date)}</span>
            {soon && n !== null && (
                <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 text-[11px] font-bold tabular-nums">{dDayText(n)}</span>
            )}
        </span>
    )
}

// 호실 배지 (호실 번호면 숫자, 병원 등 글자면 건물 아이콘)
const RoomBadge = ({ room, accent, muted, size }: { room: string; accent: Accent; muted: boolean; size: 'sm' | 'lg' }) => {
    const colors = muted ? 'bg-toss-gray-100 text-toss-gray-500' : ACCENT[accent].badge
    const box = size === 'lg' ? 'w-12 h-12 rounded-xl text-base' : 'min-w-[2.75rem] h-8 px-2 rounded-lg text-sm'
    const content = !room ? '-' : isRoomNumber(room) ? room.replace('호', '') : <Building2 size={size === 'lg' ? 20 : 16} />
    return (
        <span className={`inline-flex flex-shrink-0 items-center justify-center font-bold tabular-nums ${box} ${colors}`} title={room || '호실 미정'}>
            {content}
        </span>
    )
}

// 이름 아래 보조 정보: 성별 · 국가 (+ 병원명이면 병원명)
const subInfo = (v: AdmissionView) =>
    [v.gender, v.country, v.room && !isRoomNumber(v.room) ? v.room : ''].filter(Boolean).join(' · ') || '-'

// ===== 목록 =====

export default function AdmissionRecordList<T extends { id: string }>({
    records,
    toView,
    variant,
    accent,
    roomLabel,
    focusId,
    focusRef,
    onDischarge,
    onEdit,
    onDelete,
}: AdmissionRecordListProps<T>) {
    const isActive = variant === 'active'
    const muted = !isActive

    // 검색으로 들어온 기록: 화면에 실제로 보이는 쪽(PC 표 또는 모바일 카드)에 스크롤 기준을 건다
    const bindFocus = (id: string) => (el: HTMLElement | null) => {
        if (focusRef && id === focusId && el && el.offsetParent !== null) focusRef.current = el
    }

    const actionButtons = (record: T, view: AdmissionView, size: 'sm' | 'md') => {
        const icon = size === 'md' ? 16 : 15
        return (
            <div className="flex items-center gap-1 whitespace-nowrap">
                {isActive && onDischarge && (
                    <button
                        onClick={() => onDischarge(record.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                        title={`${view.name || '이 기록'} 퇴소 처리`}
                    >
                        퇴소
                    </button>
                )}
                <button
                    onClick={() => onEdit(record)}
                    className={`p-1.5 rounded-lg transition-colors ${ACCENT[accent].edit}`}
                    title="수정"
                    aria-label="수정"
                >
                    <Edit2 size={icon} />
                </button>
                <button
                    onClick={() => onDelete(record.id)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="삭제"
                    aria-label="삭제"
                >
                    <Trash2 size={icon} />
                </button>
            </div>
        )
    }

    return (
        <>
            {/* ===== PC: 표 ===== */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-toss-gray-50 border-b border-toss-gray-200 text-xs font-semibold text-toss-gray-500">
                            <th className="w-10 px-2 py-3 text-center">No</th>
                            <th className="px-3 py-3 text-left whitespace-nowrap">성명</th>
                            <th className="px-3 py-3 text-center whitespace-nowrap">{roomLabel}</th>
                            <th className="px-3 py-3 text-left whitespace-nowrap">입소일</th>
                            <th className="px-3 py-3 text-left whitespace-nowrap">{isActive ? '퇴소 예정' : '퇴소일'}</th>
                            <th className="px-3 py-3 text-left whitespace-nowrap">행정상황 · 비고</th>
                            <th className="px-3 py-3 text-center w-px whitespace-nowrap">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-toss-gray-100">
                        {records.map((record, index) => {
                            const v = toView(record)
                            const focused = record.id === focusId
                            const showActual = isActive && v.dischargeDate && v.dischargeDate !== v.expectedDischarge
                            return (
                                <tr
                                    key={record.id}
                                    ref={bindFocus(record.id)}
                                    className={`transition-colors ${focused ? 'bg-toss-blue/10' : 'hover:bg-toss-gray-50'}`}
                                >
                                    <td className="px-2 py-3.5 text-center text-sm text-toss-gray-400 tabular-nums">{index + 1}</td>
                                    <td className="px-3 py-3.5">
                                        {/* 이름은 한 줄 고정 (좁은 폭에서 글자 단위로 쪼개지지 않게) */}
                                        <p className={`text-[15px] leading-snug whitespace-nowrap ${muted ? 'font-medium text-toss-gray-600' : 'font-semibold text-toss-gray-900'}`}>
                                            {v.name || '-'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-toss-gray-500">{subInfo(v)}</p>
                                    </td>
                                    <td className="px-3 py-3.5 text-center">
                                        <RoomBadge room={v.room} accent={accent} muted={muted} size="sm" />
                                    </td>
                                    <td className={`px-3 py-3.5 text-sm tabular-nums whitespace-nowrap ${muted ? 'text-toss-gray-500' : 'text-toss-gray-800'}`}>
                                        {formatDate(v.admissionDate)}
                                    </td>
                                    <td className="px-3 py-3.5 text-sm">
                                        {isActive ? (
                                            <>
                                                {/* 자리가 모자라면 D-day 표시가 날짜 아래로 내려간다 */}
                                                <ExpectedDate date={v.expectedDischarge} accent={accent} compact />
                                                {showActual && (
                                                    <p className="mt-0.5 text-xs text-orange-600">
                                                        실제 퇴소 <span className="font-semibold tabular-nums whitespace-nowrap">{formatDate(v.dischargeDate)}</span>
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-toss-gray-600 tabular-nums whitespace-nowrap">{formatDate(v.dischargeDate)}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3.5 min-w-[7rem]">
                                        {v.adminStatus ? (
                                            <p className={`text-sm whitespace-pre-line ${muted ? 'text-toss-gray-500' : 'text-toss-gray-800'}`}>{v.adminStatus}</p>
                                        ) : (
                                            !v.notes && <span className="text-sm text-toss-gray-300">-</span>
                                        )}
                                        {v.notes && (
                                            <p className="mt-0.5 text-xs text-toss-gray-500 line-clamp-2" title={v.notes}>
                                                <span className="font-semibold">비고</span> {v.notes}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <div className="flex justify-center">{actionButtons(record, v, 'md')}</div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== 모바일: 사람 단위 카드 ===== */}
            <div className="md:hidden divide-y divide-toss-gray-100">
                {records.map((record) => {
                    const v = toView(record)
                    const focused = record.id === focusId
                    const showActual = isActive && v.dischargeDate && v.dischargeDate !== v.expectedDischarge
                    return (
                        <div
                            key={record.id}
                            ref={bindFocus(record.id)}
                            className={`px-4 py-4 ${focused ? 'bg-toss-blue/10' : ''}`}
                        >
                            {/* 1) 누구·어디: 호실 배지 + 이름 + 성별·국가 + 관리 버튼 */}
                            <div className="flex items-start gap-3">
                                <RoomBadge room={v.room} accent={accent} muted={muted} size="lg" />
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <p className={`text-base leading-tight ${muted ? 'font-semibold text-toss-gray-600' : 'font-bold text-toss-gray-900'}`}>
                                        {v.name || '-'}
                                    </p>
                                    <p className="mt-1 text-sm text-toss-gray-500 break-words">{subInfo(v)}</p>
                                </div>
                                {actionButtons(record, v, 'sm')}
                            </div>

                            {/* 2) 언제: 입소일 / 퇴소 예정(또는 퇴소일) — 이름 줄과 왼쪽을 맞춘다 */}
                            <div className="mt-3 pl-[3.75rem] grid grid-cols-2 gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs text-toss-gray-400">입소일</p>
                                    <p className={`text-sm tabular-nums ${muted ? 'text-toss-gray-500' : 'font-medium text-toss-gray-800'}`}>{formatDate(v.admissionDate)}</p>
                                </div>
                                {/* 병원 입원 등으로 퇴소 예정일이 없으면 빈 칸을 보여 주지 않는다 */}
                                {(!isActive || v.expectedDischarge) && (
                                    <div className="min-w-0">
                                        <p className="text-xs text-toss-gray-400">{isActive ? '퇴소 예정' : '퇴소일'}</p>
                                        <div className="text-sm">
                                            {isActive
                                                ? <ExpectedDate date={v.expectedDischarge} accent={accent} compact />
                                                : <span className="text-toss-gray-500 tabular-nums">{formatDate(v.dischargeDate)}</span>}
                                        </div>
                                    </div>
                                )}
                                {showActual && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-orange-600">
                                            실제 퇴소 <span className="font-semibold tabular-nums">{formatDate(v.dischargeDate)}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* 3) 상태: 행정상황 · 비고 */}
                            {(v.adminStatus || v.notes) && (
                                <div className="mt-3 ml-[3.75rem] rounded-lg bg-toss-gray-50 px-3 py-2.5 space-y-1">
                                    {v.adminStatus && (
                                        <p className={`text-sm whitespace-pre-line ${muted ? 'text-toss-gray-500' : 'text-toss-gray-800'}`}>
                                            <span className="mr-1.5 text-xs font-semibold text-toss-gray-500">행정</span>
                                            {v.adminStatus}
                                        </p>
                                    )}
                                    {v.notes && (
                                        <p className="text-sm text-toss-gray-500 break-words">
                                            <span className="mr-1.5 text-xs font-semibold">비고</span>
                                            {v.notes}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </>
    )
}
