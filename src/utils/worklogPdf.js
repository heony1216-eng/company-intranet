/**
 * 업무보고서 PDF 생성 (브라우저 인쇄 기능 사용 - 텍스트 기반)
 * 이미지 기반이 아닌 텍스트 기반으로 생성되어 편집 가능
 */

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
            margin: 15mm 15mm 20mm 15mm;
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

        .section-header {
            background-color: #f8f9fa;
            border: 1px solid #333;
            padding: 12px 15px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 20px;
        }
        .section-content {
            border: 1px solid #333;
            border-top: none;
            padding: 20px;
            font-size: 14px;
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
            .section-header {
                page-break-after: avoid;
            }
            .section-content {
                page-break-inside: auto;
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
        작성일: ${formatDate(worklog.work_date)}
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

    <div class="section-header">Ⅰ. 금주 업무 수행 내용</div>
    <div class="section-content">
        ${textToLines(worklog.morning_work)}
    </div>

    <div class="section-header">Ⅱ. 특이사항 및 건의사항</div>
    <div class="section-content">
        ${textToLines(worklog.special_notes)}
    </div>

    <div class="footer">
        한인구조단
    </div>

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
            margin: 15mm 15mm 20mm 15mm;
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

        .section-header {
            background-color: #f8f9fa;
            border: 1px solid #333;
            padding: 12px 15px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 20px;
        }
        .section-content {
            border: 1px solid #333;
            border-top: none;
            padding: 20px;
            font-size: 14px;
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
            .section-header {
                page-break-after: avoid;
            }
            .section-content {
                page-break-inside: auto;
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
        작성일: ${formatDate(worklog.work_date)}
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

    <div class="section-header">Ⅰ. 금월 업무 수행 내용</div>
    <div class="section-content">
        ${textToLines(worklog.morning_work)}
    </div>

    <div class="section-header">Ⅱ. 특이사항 및 건의사항</div>
    <div class="section-content">
        ${textToLines(worklog.special_notes)}
    </div>

    <div class="footer">
        한인구조단
    </div>

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
    // 업무 항목을 리스트로 변환
    const parseTasksToList = (taskString) => {
        if (!taskString) return '<p style="color: #666; text-align: center;">-</p>'

        const lines = taskString.split('\n').filter(line => line.trim())
        if (lines.length === 0) return '<p style="color: #666; text-align: center;">-</p>'

        return lines.map((line, index) => {
            const match = line.match(/^(.+?)\s*\((\d+)%\)$/)
            let content = line
            let progress = '-'

            if (match) {
                content = match[1].trim()
                progress = match[2] + '%'
            }

            return `
                <div style="display: flex; border-bottom: 1px solid #ddd; padding: 8px 0;">
                    <span style="width: 40px; text-align: center; flex-shrink: 0;">${index + 1}</span>
                    <span style="flex: 1; padding: 0 10px;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                    <span style="width: 60px; text-align: center; flex-shrink: 0;">${progress}</span>
                </div>
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
            margin: 15mm 15mm 20mm 15mm;
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

        .section-header {
            background-color: #f8f9fa;
            border: 1px solid #333;
            padding: 12px 15px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 15px;
        }
        .section-subheader {
            display: flex;
            border: 1px solid #333;
            border-top: none;
            background-color: #fafafa;
            font-weight: 600;
            font-size: 13px;
        }
        .section-subheader span {
            padding: 8px;
            text-align: center;
        }
        .section-content {
            border: 1px solid #333;
            border-top: none;
            padding: 15px;
            font-size: 13px;
            min-height: 30px;
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
            .section-header, .section-subheader {
                page-break-after: avoid;
            }
            .section-content {
                page-break-inside: auto;
            }
            .section-content > div {
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
        작성일: ${formatDate(worklog.work_date)}
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

    <div class="section-header">Ⅰ. 오전 업무</div>
    <div class="section-subheader">
        <span style="width: 40px;">No</span>
        <span style="flex: 1;">업무 내용</span>
        <span style="width: 60px;">진척률</span>
    </div>
    <div class="section-content">
        ${parseTasksToList(worklog.morning_work)}
    </div>

    <div class="section-header">Ⅱ. 오후 업무</div>
    <div class="section-subheader">
        <span style="width: 40px;">No</span>
        <span style="flex: 1;">업무 내용</span>
        <span style="width: 60px;">진척률</span>
    </div>
    <div class="section-content">
        ${parseTasksToList(worklog.afternoon_work)}
    </div>

    <div class="section-header">Ⅲ. 익일 업무</div>
    <div class="section-content">
        ${textToLines(worklog.next_day_work)}
    </div>

    <div class="section-header">Ⅳ. 특이사항 및 비고</div>
    <div class="section-content">
        ${textToLines(worklog.special_notes)}
    </div>

    <div class="footer">
        한인구조단
    </div>

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
