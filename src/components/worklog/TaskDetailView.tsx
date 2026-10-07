// 주간·월간 업무보고 상세의 업무 목록
// - sm 이상: 표 (No · 제목 · 업무내용 · 진척률 · 비고)
// - 모바일: 업무별 카드 (번호·제목 → 업무내용 → 진척률 막대·비고)
//   좁은 폭에서 5열 표가 업무내용을 몇 글자씩 쪼개고, 줄바꿈 금지인 제목이 잘리던 문제를 없앤다
import type { WeeklyTask } from '../../utils/weeklyTaskUtils'

// 진척률 숫자 (0~100), 값이 없거나 숫자가 아니면 null
const parseProgress = (value: string): number | null => {
    const n = Number(value)
    return value && !Number.isNaN(n) ? Math.max(0, Math.min(100, n)) : null
}

// 진척률 색: 100% 초록, 50% 이상 파랑, 그 외 노랑 (기존 표의 배지 색과 같은 기준)
const tone = (n: number) =>
    n >= 100
        ? { pill: 'bg-green-100 text-green-700', bar: 'bg-green-500', text: 'text-green-600' }
        : n >= 50
            ? { pill: 'bg-blue-100 text-blue-700', bar: 'bg-toss-blue', text: 'text-toss-blue' }
            : { pill: 'bg-yellow-100 text-yellow-700', bar: 'bg-amber-400', text: 'text-amber-600' }

export default function TaskDetailView({ tasks }: { tasks: WeeklyTask[] }) {
    return (
        <>
            {/* ===== 태블릿·PC: 표 ===== */}
            <div className="hidden sm:block bg-toss-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-toss-gray-200">
                        <tr>
                            <th className="px-3 py-2 text-center font-semibold text-toss-gray-700 whitespace-nowrap w-10">No</th>
                            <th className="px-3 py-2 text-left font-semibold text-toss-gray-700 whitespace-nowrap">제목</th>
                            <th className="px-3 py-2 text-left font-semibold text-toss-gray-700">업무내용</th>
                            <th className="px-3 py-2 text-center font-semibold text-toss-gray-700 whitespace-nowrap w-16">진척률</th>
                            <th className="px-3 py-2 text-left font-semibold text-toss-gray-700 whitespace-nowrap">비고</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-toss-gray-100">
                        {tasks.map((task, idx) =>
                            task.details.map((detail, dIdx) => {
                                const p = parseProgress(detail.progress)
                                return (
                                    <tr key={`${idx}-${dIdx}`}>
                                        {dIdx === 0 && (
                                            <>
                                                <td className="px-3 py-2 text-center text-toss-gray-500 align-top" rowSpan={task.details.length}>{idx + 1}</td>
                                                {/* 제목은 줄바꿈 허용 (긴 제목이 잘리지 않게), 너무 넓어지지 않게 최대 폭 */}
                                                <td className="px-3 py-2 text-toss-gray-900 font-medium align-top min-w-[8.5rem] max-w-[12rem] break-words" rowSpan={task.details.length}>
                                                    {task.title || '-'}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-3 py-2 text-toss-gray-900 whitespace-pre-wrap break-words">{detail.content || '-'}</td>
                                        <td className="px-3 py-2 text-center">
                                            {p !== null ? (
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tone(p).pill}`}>
                                                    {detail.progress}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-toss-gray-600 break-words">{detail.remark || '-'}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== 모바일: 업무별 카드 ===== */}
            <div className="sm:hidden space-y-2.5">
                {tasks.map((task, idx) => (
                    <div key={idx} className="rounded-xl border border-toss-gray-200 bg-white overflow-hidden">
                        {/* 번호 + 제목 */}
                        <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-toss-gray-50 border-b border-toss-gray-100">
                            <span className="mt-px w-5 h-5 flex-shrink-0 rounded-md bg-toss-gray-200 text-[11px] font-bold text-toss-gray-600 flex items-center justify-center tabular-nums">
                                {idx + 1}
                            </span>
                            <p className="min-w-0 flex-1 text-sm font-semibold text-toss-gray-900 break-words">{task.title || '-'}</p>
                        </div>
                        {/* 업무내용 행들 */}
                        <ul className="divide-y divide-toss-gray-100">
                            {task.details.map((detail, dIdx) => {
                                const p = parseProgress(detail.progress)
                                return (
                                    <li key={dIdx} className="px-3.5 py-2.5">
                                        <p className="text-sm leading-relaxed text-toss-gray-900 whitespace-pre-wrap break-words">{detail.content || '-'}</p>
                                        {(p !== null || detail.remark) && (
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                {p !== null && (
                                                    <span className="flex items-center gap-2">
                                                        <span className="inline-block w-16 h-1.5 rounded-full bg-toss-gray-100 overflow-hidden">
                                                            <span className={`block h-full rounded-full ${tone(p).bar}`} style={{ width: `${p}%` }} />
                                                        </span>
                                                        <span className={`text-xs font-bold tabular-nums ${tone(p).text}`}>{detail.progress}%</span>
                                                    </span>
                                                )}
                                                {detail.remark && (
                                                    <span className="min-w-0 text-xs text-toss-gray-500 break-words">
                                                        <span className="font-semibold">비고</span> {detail.remark}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    )
}
