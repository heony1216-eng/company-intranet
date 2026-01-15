import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // 브라우저에서 직접 호출 (프로덕션에서는 서버 사이드 권장)
})

/**
 * 일일 업무일지를 기반으로 주간 업무 요약 생성
 * @param {Array} dailyLogs - 일일 업무일지 배열
 * @returns {Promise<string>} - 요약된 주간 업무
 */
export const summarizeWeeklyWork = async (dailyLogs) => {
    if (!dailyLogs || dailyLogs.length === 0) {
        throw new Error('요약할 일일 업무일지가 없습니다.')
    }

    // 일일 업무일지를 날짜순으로 정렬하고 텍스트로 변환
    const sortedLogs = [...dailyLogs].sort((a, b) =>
        new Date(a.work_date) - new Date(b.work_date)
    )

    const logsText = sortedLogs.map(log => {
        const date = new Date(log.work_date).toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        })
        const morning = log.morning_work || ''
        const afternoon = log.afternoon_work || ''
        const notes = log.special_notes || ''

        return `[${date}]
오전: ${morning}
오후: ${afternoon}
${notes ? `특이사항: ${notes}` : ''}`
    }).join('\n\n')

    const prompt = `다음은 한 주간의 일일 업무일지입니다. 이를 바탕으로 주간 업무 보고서 형식으로 요약해주세요.

요약 시 다음 사항을 지켜주세요:
- 중복되는 내용은 통합하여 간결하게 작성
- 주요 업무 성과와 진행 상황 위주로 작성
- 특이사항이 있다면 별도로 언급
- 전문적이고 격식있는 문체 사용
- 불필요한 인사말이나 서두 없이 바로 업무 내용으로 시작
- 300자 내외로 작성

===일일 업무일지===
${logsText}
==================

주간 업무 요약:`

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '당신은 한국 기업의 업무 보고서 작성을 돕는 어시스턴트입니다. 간결하고 전문적인 문체로 작성해주세요.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        })

        return response.choices[0].message.content.trim()
    } catch (error) {
        console.error('OpenAI API 오류:', error)
        if (error.code === 'invalid_api_key') {
            throw new Error('OpenAI API 키가 유효하지 않습니다. 설정을 확인해주세요.')
        }
        throw new Error('AI 요약 생성에 실패했습니다: ' + error.message)
    }
}

/**
 * 월간 업무 요약 생성
 * @param {Array} logs - 해당 월의 업무일지 배열 (일일 또는 주간)
 * @returns {Promise<string>} - 요약된 월간 업무
 */
export const summarizeMonthlyWork = async (logs) => {
    if (!logs || logs.length === 0) {
        throw new Error('요약할 업무일지가 없습니다.')
    }

    const sortedLogs = [...logs].sort((a, b) =>
        new Date(a.work_date) - new Date(b.work_date)
    )

    const logsText = sortedLogs.map(log => {
        const date = new Date(log.work_date).toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric'
        })
        const work = log.morning_work || ''
        const afternoon = log.afternoon_work || ''
        const notes = log.special_notes || ''

        return `[${date}] ${work} ${afternoon} ${notes ? `(특이: ${notes})` : ''}`
    }).join('\n')

    const prompt = `다음은 한 달간의 업무 기록입니다. 이를 바탕으로 월간 업무 보고서 형식으로 요약해주세요.

요약 시 다음 사항을 지켜주세요:
- 주요 프로젝트/업무별로 그룹핑하여 정리
- 월간 주요 성과와 진행 상황 위주로 작성
- 전문적이고 격식있는 문체 사용
- 불필요한 인사말 없이 바로 내용으로 시작
- 500자 내외로 작성

===업무 기록===
${logsText}
===============

월간 업무 요약:`

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '당신은 한국 기업의 업무 보고서 작성을 돕는 어시스턴트입니다. 간결하고 전문적인 문체로 작성해주세요.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 700
        })

        return response.choices[0].message.content.trim()
    } catch (error) {
        console.error('OpenAI API 오류:', error)
        throw new Error('AI 요약 생성에 실패했습니다: ' + error.message)
    }
}

export default openai
