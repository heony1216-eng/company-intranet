// 주간 업무보고 업무 항목 유틸리티

// 업무내용 행 (제목 아래 여러 개 가능)
export interface TaskDetail {
  content: string    // 업무내용
  progress: string   // 진척률 (0-100)
  remark: string     // 비고
}

// 하나의 업무 항목 (제목 + 여러 업무내용)
export interface WeeklyTask {
  title: string         // 제목
  details: TaskDetail[] // 업무내용 목록
}

// 빈 업무내용 행 생성
export const createEmptyDetail = (): TaskDetail => ({
  content: '',
  progress: '',
  remark: ''
})

// 빈 업무 항목 생성
export const createEmptyWeeklyTask = (): WeeklyTask => ({
  title: '',
  details: [createEmptyDetail()]
})

// JSON 직렬화 (DB 저장용)
export const weeklyTasksToString = (tasks: WeeklyTask[]): string => {
  // 내용이 있는 항목만 필터링
  const filtered = tasks.filter(t =>
    t.title.trim() || t.details.some(d => d.content.trim())
  )
  return filtered.length > 0 ? JSON.stringify(filtered) : ''
}

// 문자열 또는 객체 -> 업무 배열 (레거시 호환)
export const parseWeeklyTasks = (input: any): WeeklyTask[] => {
  if (!input) return [createEmptyWeeklyTask()]

  const convertArray = (arr: any[]): WeeklyTask[] => {
    if (!arr.length) return [createEmptyWeeklyTask()]
    if (typeof arr[0] === 'object') {
      // 새 형식: details 배열이 있는 경우
      if ('details' in arr[0]) {
        return arr as WeeklyTask[]
      }
      // 이전 형식: content가 직접 있는 경우
      if ('content' in arr[0]) {
        return arr.map((item: any) => ({
          title: item.title || '',
          details: [{
            content: item.content || '',
            progress: item.progress || '',
            remark: item.remark || ''
          }]
        }))
      }
    }
    return [createEmptyWeeklyTask()]
  }

  // 이미 배열인 경우 (Supabase 자동 파싱)
  if (Array.isArray(input)) {
    return convertArray(input)
  }

  // 문자열인 경우
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return convertArray(parsed)
      }
    } catch {
      // JSON 파싱 실패 = 레거시 형식
    }
    // 레거시 형식: 전체를 하나의 업무 항목으로 변환
    return [{
      title: '',
      details: [{ content: input, progress: '', remark: '' }]
    }]
  }

  return [createEmptyWeeklyTask()]
}

// 리스트 미리보기용 요약
export const getWeeklyTaskPreview = (input: any): string => {
  if (!input) return '-'

  // 이미 파싱된 배열로 들어온 경우 (Supabase가 자동 파싱)
  const extractPreview = (arr: any[]): string => {
    if (!arr.length) return '-'
    const first = arr[0]
    const suffix = arr.length > 1 ? ` 외 ${arr.length - 1}건` : ''
    // 새 형식 (details 배열)
    if (first && 'details' in first) {
      const display = first.title || first.details?.[0]?.content || '-'
      return (display + suffix).substring(0, 80)
    }
    // 이전 형식 (content 직접)
    if (first && 'content' in first) {
      const display = first.title || first.content
      return (display + suffix).substring(0, 80)
    }
    return '-'
  }

  // 이미 배열인 경우
  if (Array.isArray(input)) {
    return extractPreview(input)
  }

  // 문자열인 경우
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) {
        return extractPreview(parsed)
      }
    } catch {
      // 레거시 형식
    }
    // 레거시 텍스트에서 첫 줄 의미 있는 내용 추출
    const lines = input.split('\n').filter((l: string) => l.trim() && !l.startsWith('---'))
    return (lines[0] || input).substring(0, 80)
  }

  return '-'
}
