/**
 * 업무보고서 PDF 생성 (브라우저 인쇄 기능 사용 - 텍스트 기반)
 * 이미지 기반이 아닌 텍스트 기반으로 생성되어 편집 가능
 */

// 날짜를 YYYYMMDD 형식으로 변환
const formatDateCompact = (dateString) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

/**
 * 주간 업무보고서 PDF 생성
 * @param {Object} worklog - 업무보고 데이터
 * @param {Function} getWeekNumber - 주차 계산 함수
 * @param {Function} formatDate - 날짜 포맷 함수
 */
export const generateWeeklyWorklogPdf = (worklog, getWeekNumber, formatDate) => {
    // 텍스트를 줄 단위 div로 변환
    const textToLines = (text) => {
        if (!text) return '<p style="color: #666;">-</p>'
        return text.split('\n').map(line =>
            `<p style="margin: 0 0 8px 0; line-height: 1.8;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '&nbsp;'}</p>`
        ).join('')
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>주간 업무보고서 - ${getWeekNumber(worklog.work_date)}</title>
    <style>
        @page {
            size: A4;
            margin: 25mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #000;
            background: #fff;
        }

        .date-header {
            text-align: right;
            font-size: 13px;
            color: #666;
            margin-bottom: 10px;
        }

        .title-section {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
        }
        .main-title {
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 12px;
            color: #1a1a1a;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            border: 1px solid #333;
            padding: 10px 15px;
            font-size: 14px;
        }
        .info-table .label {
            background-color: #f8f9fa;
            font-weight: 600;
            text-align: center;
            width: 15%;
        }
        .info-table .value {
            width: 35%;
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .content-table td {
            border: 1px solid #333;
            padding: 0;
            font-size: 14px;
            vertical-align: top;
        }
        .content-table .section-title {
            background-color: #f8f9fa;
            font-weight: 600;
            padding: 12px 15px;
        }
        .content-table .section-body {
            padding: 20px;
            min-height: 50px;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            color: #333;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            p {
                page-break-inside: avoid;
                orphans: 2;
                widows: 2;
            }
        }
    </style>
</head>
<body>
    <div class="date-header">
        작성일: ${formatDateCompact(worklog.work_date)}
    </div>

    <div class="title-section">
        <h1 class="main-title">주 간 업 무 보 고 서</h1>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">보고기간</td>
            <td class="value">${getWeekNumber(worklog.work_date)}</td>
            <td class="label">소속</td>
            <td class="value">${worklog.user?.team || '-'}</td>
        </tr>
        <tr>
            <td class="label">직급</td>
            <td class="value">${worklog.user?.rank || '-'}</td>
            <td class="label">성명</td>
            <td class="value">${worklog.user?.name || '-'}</td>
        </tr>
    </table>

    <table class="content-table">
        <tr>
            <td class="section-title">Ⅰ. 금주 업무 수행 내용</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.morning_work)}
            </td>
        </tr>
    </table>

    <table class="content-table">
        <tr>
            <td class="section-title">Ⅱ. 금주 업무</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.this_week_work)}
            </td>
        </tr>
    </table>

    <table class="content-table">
        <tr>
            <td class="section-title">Ⅲ. 특이사항 및 건의사항</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.special_notes)}
            </td>
        </tr>
    </table>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        }
    </script>
</body>
</html>
`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    printWindow.document.write(html)
    printWindow.document.close()
}

/**
 * 월간 업무보고서 PDF 생성
 * @param {Object} worklog - 업무보고 데이터
 * @param {Function} getMonthLabel - 월 라벨 함수
 * @param {Function} formatDate - 날짜 포맷 함수
 */
export const generateMonthlyWorklogPdf = (worklog, getMonthLabel, formatDate) => {
    const textToLines = (text) => {
        if (!text) return '<p style="color: #666;">-</p>'
        return text.split('\n').map(line =>
            `<p style="margin: 0 0 8px 0; line-height: 1.8;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '&nbsp;'}</p>`
        ).join('')
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>월간 업무보고서 - ${getMonthLabel(worklog.work_date)}</title>
    <style>
        @page {
            size: A4;
            margin: 25mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #000;
            background: #fff;
        }

        .date-header {
            text-align: right;
            font-size: 13px;
            color: #666;
            margin-bottom: 10px;
        }

        .title-section {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
        }
        .main-title {
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 12px;
            color: #1a1a1a;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            border: 1px solid #333;
            padding: 10px 15px;
            font-size: 14px;
        }
        .info-table .label {
            background-color: #f8f9fa;
            font-weight: 600;
            text-align: center;
            width: 15%;
        }
        .info-table .value {
            width: 35%;
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .content-table td {
            border: 1px solid #333;
            padding: 0;
            font-size: 14px;
            vertical-align: top;
        }
        .content-table .section-title {
            background-color: #f8f9fa;
            font-weight: 600;
            padding: 12px 15px;
        }
        .content-table .section-body {
            padding: 20px;
            min-height: 50px;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            color: #333;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            p {
                page-break-inside: avoid;
                orphans: 2;
                widows: 2;
            }
        }
    </style>
</head>
<body>
    <div class="date-header">
        작성일: ${formatDateCompact(worklog.work_date)}
    </div>

    <div class="title-section">
        <h1 class="main-title">월 간 업 무 보 고 서</h1>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">보고기간</td>
            <td class="value">${getMonthLabel(worklog.work_date)}</td>
            <td class="label">소속</td>
            <td class="value">${worklog.user?.team || '-'}</td>
        </tr>
        <tr>
            <td class="label">직급</td>
            <td class="value">${worklog.user?.rank || '-'}</td>
            <td class="label">성명</td>
            <td class="value">${worklog.user?.name || '-'}</td>
        </tr>
    </table>

    <table class="content-table">
        <tr>
            <td class="section-title">Ⅰ. 금월 업무 수행 내용</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.morning_work)}
            </td>
        </tr>
    </table>

    <table class="content-table">
        <tr>
            <td class="section-title">Ⅱ. 특이사항 및 건의사항</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.special_notes)}
            </td>
        </tr>
    </table>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        }
    </script>
</body>
</html>
`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    printWindow.document.write(html)
    printWindow.document.close()
}

/**
 * 일일 업무보고서 PDF 생성
 * @param {Object} worklog - 업무보고 데이터
 * @param {Function} formatDate - 날짜 포맷 함수
 */
export const generateDailyWorklogPdf = (worklog, formatDate) => {
    // 업무 항목 구분자
    const TASK_SEPARATOR = '\n---TASK---\n'

    // 업무 항목을 테이블 행으로 변환
    const parseTasksToTableRows = (taskString) => {
        if (!taskString) return '<tr><td colspan="3" style="text-align: center; color: #666; padding: 15px;">-</td></tr>'

        // 새 형식(TASK_SEPARATOR) 또는 기존 형식(\n) 지원
        const hasSeparator = taskString.includes('---TASK---')
        const items = hasSeparator
            ? taskString.split(TASK_SEPARATOR).filter(item => item.trim())
            : taskString.split('\n').filter(line => line.trim())

        if (items.length === 0) return '<tr><td colspan="3" style="text-align: center; color: #666; padding: 15px;">-</td></tr>'

        return items.map((item, index) => {
            // 여러 줄인 경우 마지막 줄에서 진척도 추출
            const lines = item.trim().split('\n')
            const lastLine = lines[lines.length - 1]
            const match = lastLine.match(/^(.+?)\s*\((\d+)%\)$/)

            let content = item.trim()
            let progress = '-'

            if (match && lines.length === 1) {
                // 단일 줄이고 진척도가 있는 경우
                content = match[1].trim()
                progress = match[2] + '%'
            } else if (match && lines.length > 1) {
                // 여러 줄이고 마지막 줄에 진척도가 있는 경우
                lines[lines.length - 1] = match[1].trim()
                content = lines.join('\n')
                progress = match[2] + '%'
            }

            // 줄바꿈을 <br>로 변환하여 표시
            const contentHtml = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

            return `
                <tr>
                    <td style="width: 40px; text-align: center; padding: 8px; border: 1px solid #333;">${index + 1}</td>
                    <td style="padding: 8px 10px; border: 1px solid #333;">${contentHtml}</td>
                    <td style="width: 60px; text-align: center; padding: 8px; border: 1px solid #333;">${progress}</td>
                </tr>
            `
        }).join('')
    }

    const textToLines = (text) => {
        if (!text) return '<p style="color: #666;">-</p>'
        return text.split('\n').map(line =>
            `<p style="margin: 0 0 8px 0; line-height: 1.8;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '&nbsp;'}</p>`
        ).join('')
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>일일 업무보고서 - ${formatDate(worklog.work_date)}</title>
    <style>
        @page {
            size: A4;
            margin: 25mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #000;
            background: #fff;
        }

        .date-header {
            text-align: right;
            font-size: 13px;
            color: #666;
            margin-bottom: 10px;
        }

        .title-section {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
        }
        .main-title {
            font-size: 26px;
            font-weight: bold;
            letter-spacing: 12px;
            color: #1a1a1a;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .info-table td {
            border: 1px solid #333;
            padding: 10px 15px;
            font-size: 14px;
        }
        .info-table .label {
            background-color: #f8f9fa;
            font-weight: 600;
            text-align: center;
            width: 15%;
        }
        .info-table .value {
            width: 35%;
        }

        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .content-table td, .content-table th {
            border: 1px solid #333;
            padding: 0;
            font-size: 13px;
            vertical-align: top;
        }
        .content-table .section-title {
            background-color: #f8f9fa;
            font-weight: 600;
            padding: 12px 15px;
            text-align: left;
        }
        .content-table .section-body {
            padding: 15px;
            min-height: 30px;
        }
        .content-table .subheader {
            background-color: #fafafa;
            font-weight: 600;
            padding: 8px;
            text-align: center;
        }

        .task-table {
            width: 100%;
            border-collapse: collapse;
        }
        .task-table td, .task-table th {
            border: 1px solid #333;
            font-size: 13px;
        }
        .task-table th {
            background-color: #fafafa;
            font-weight: 600;
            padding: 8px;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            color: #333;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            tr {
                page-break-inside: avoid;
            }
            p {
                page-break-inside: avoid;
                orphans: 2;
                widows: 2;
            }
        }
    </style>
</head>
<body>
    <div class="date-header">
        작성일: ${formatDateCompact(worklog.work_date)}
    </div>

    <div class="title-section">
        <h1 class="main-title">일 일 업 무 보 고 서</h1>
    </div>

    <table class="info-table">
        <tr>
            <td class="label">보고일자</td>
            <td class="value">${formatDate(worklog.work_date)}</td>
            <td class="label">소속</td>
            <td class="value">${worklog.user?.team || '-'}</td>
        </tr>
        <tr>
            <td class="label">직급</td>
            <td class="value">${worklog.user?.rank || '-'}</td>
            <td class="label">성명</td>
            <td class="value">${worklog.user?.name || '-'}</td>
        </tr>
    </table>

    <table class="content-table">
        <tr>
            <td class="section-title" colspan="3">Ⅰ. 오전 업무</td>
        </tr>
    </table>
    <table class="task-table">
        <thead>
            <tr>
                <th style="width: 40px;">No</th>
                <th>업무 내용</th>
                <th style="width: 60px;">진척률</th>
            </tr>
        </thead>
        <tbody>
            ${parseTasksToTableRows(worklog.morning_work)}
        </tbody>
    </table>

    <table class="content-table" style="margin-top: 15px;">
        <tr>
            <td class="section-title" colspan="3">Ⅱ. 오후 업무</td>
        </tr>
    </table>
    <table class="task-table">
        <thead>
            <tr>
                <th style="width: 40px;">No</th>
                <th>업무 내용</th>
                <th style="width: 60px;">진척률</th>
            </tr>
        </thead>
        <tbody>
            ${parseTasksToTableRows(worklog.afternoon_work)}
        </tbody>
    </table>

    <table class="content-table" style="margin-top: 15px;">
        <tr>
            <td class="section-title">Ⅲ. 익일 업무</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.next_day_work)}
            </td>
        </tr>
    </table>

    <table class="content-table" style="margin-top: 15px;">
        <tr>
            <td class="section-title">Ⅳ. 특이사항 및 비고</td>
        </tr>
        <tr>
            <td class="section-body">
                ${textToLines(worklog.special_notes)}
            </td>
        </tr>
    </table>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 300);
        }
    </script>
</body>
</html>
`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    printWindow.document.write(html)
    printWindow.document.close()
}

export default {
    generateWeeklyWorklogPdf,
    generateMonthlyWorklogPdf,
    generateDailyWorklogPdf
}
