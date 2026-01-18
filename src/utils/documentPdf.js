/**
 * 기안서 PDF 생성 (브라우저 인쇄 기능 사용)
 * @param {Object} document - 기안서 데이터
 * @param {Object} userInfo - 기안자 정보
 * @param {string} chairmanName - 회장 이름 (기본: 이정숙)
 * @param {string} directorName - 이사장 이름 (기본: 빈 문자열)
 */
export const generateDocumentPdf = (document, userInfo, chairmanName = '이정숙', directorName = '') => {
    const createdDate = new Date(document.created_at)
    const approvedDate = document.approved_at ? new Date(document.approved_at) : createdDate

    const formatDateKorean = (date) => {
        return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
    }

    const formatDateShort = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}/${month}/${day}`
    }

    // 산출내역 테이블 생성
    const generateTableRows = () => {
        const items = document.expense_items || []
        if (items.length === 0) {
            return `
                <tr>
                    <td colspan="5" style="padding: 20px; text-align: center; color: #666;">내역 없음</td>
                </tr>
            `
        }

        return items.map(item => `
            <tr>
                <td style="padding: 10px 8px; text-align: center; border: 1px solid #000; vertical-align: middle;">${item.item || ''}</td>
                <td style="padding: 10px 8px; text-align: center; border: 1px solid #000; vertical-align: middle;">${item.category || ''}</td>
                <td style="padding: 10px 8px; text-align: center; border: 1px solid #000; vertical-align: middle;">${item.vendor || ''}</td>
                <td style="padding: 10px 8px; text-align: right; border: 1px solid #000; vertical-align: middle;">${item.amount ? Number(item.amount).toLocaleString() : ''}</td>
                <td style="padding: 10px 8px; text-align: center; border: 1px solid #000; vertical-align: middle;">${item.note || ''}</td>
            </tr>
        `).join('')
    }

    // 총합계 계산
    const totalAmount = (document.expense_items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

    // 금액을 한글로 변환
    const numberToKorean = (num) => {
        const units = ['', '만', '억', '조']
        const smallUnits = ['', '십', '백', '천']
        const nums = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

        if (num === 0) return '영'

        let result = ''
        let unitIndex = 0

        while (num > 0) {
            const part = num % 10000
            if (part > 0) {
                let partStr = ''
                let tempPart = part
                let smallUnitIndex = 0

                while (tempPart > 0) {
                    const digit = tempPart % 10
                    if (digit > 0) {
                        if (smallUnitIndex === 0) {
                            partStr = nums[digit] + partStr
                        } else {
                            partStr = (digit === 1 ? '' : nums[digit]) + smallUnits[smallUnitIndex] + partStr
                        }
                    }
                    tempPart = Math.floor(tempPart / 10)
                    smallUnitIndex++
                }
                result = partStr + units[unitIndex] + result
            }
            num = Math.floor(num / 10000)
            unitIndex++
        }

        return '금 ' + result + '원정'
    }

    // 100만원 이상이면 이사장 결재 필요
    const needsDirectorApproval = totalAmount >= 1000000

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>기안서 - ${document.title}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
            font-size: 13px;
            line-height: 1.4;
            color: #000;
            background: #fff;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm 15mm;
            margin: 0 auto;
            background: #fff;
        }

        /* 헤더 영역 */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }

        /* 제목 */
        .main-title {
            font-size: 22px;
            font-weight: bold;
            text-decoration: underline;
            padding-top: 10px;
        }

        /* 결재란 */
        .approval-box {
            border-collapse: collapse;
        }
        .approval-box td {
            border: 1px solid #000;
            text-align: center;
            font-size: 11px;
        }
        .approval-box .header-row td {
            padding: 4px 8px;
            background: #fff;
        }
        .approval-box .label-cell {
            width: 30px;
            writing-mode: vertical-rl;
            text-orientation: upright;
            letter-spacing: 2px;
            padding: 8px 4px;
            font-weight: normal;
        }
        .approval-box .position-cell {
            width: 55px;
            padding: 3px 5px;
        }
        .approval-box .name-cell {
            width: 55px;
            padding: 3px 5px;
        }
        .approval-box .date-cell {
            width: 55px;
            padding: 3px 5px;
            font-size: 10px;
        }

        /* 기안번호 */
        .doc-number {
            font-size: 11px;
            margin-bottom: 8px;
        }

        /* 메인 박스 */
        .main-box {
            border: 1px solid #000;
        }

        /* 상단 정보 테이블 */
        .info-table {
            width: 100%;
            border-collapse: collapse;
        }
        .info-table td {
            border: 1px solid #000;
            padding: 6px 12px;
            font-size: 13px;
        }
        .info-table .label {
            width: 80px;
            text-align: center;
            font-weight: normal;
        }

        /* 내용 영역 */
        .content-area {
            padding: 20px;
            min-height: 50mm;
            border-top: 1px solid #000;
        }
        .content-statement {
            text-align: center;
            font-size: 14px;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .content-list {
            font-size: 13px;
        }
        .content-list p {
            margin-bottom: 6px;
        }

        /* 산출내역 */
        .expense-section {
            margin-top: 15px;
        }
        .expense-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .expense-table th {
            background: #f0f0f0;
            border: 1px solid #000;
            padding: 10px 8px;
            font-weight: bold;
            text-align: center;
        }
        .expense-table td {
            border: 1px solid #000;
            padding: 10px 8px;
        }
        .expense-table .total-row td {
            font-weight: bold;
            background: #fff;
        }

        /* 붙임 */
        .attachment {
            margin-top: 20px;
            font-size: 12px;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { margin: 0; padding: 10mm 15mm; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="main-title">기안서(${document.title})</div>
            <table class="approval-box">
                <tr class="header-row">
                    <td rowspan="3" class="label-cell">결<br>재</td>
                    <td class="position-cell">기안자</td>
                    <td class="position-cell">회장</td>
                    ${needsDirectorApproval ? '<td class="position-cell">이사장</td>' : ''}
                </tr>
                <tr>
                    <td class="name-cell">${userInfo.name || ''}</td>
                    <td class="name-cell">${chairmanName}</td>
                    ${needsDirectorApproval ? `<td class="name-cell">${directorName}</td>` : ''}
                </tr>
                <tr>
                    <td class="date-cell">${formatDateShort(createdDate)}</td>
                    <td class="date-cell">${formatDateShort(approvedDate)}</td>
                    ${needsDirectorApproval ? `<td class="date-cell">${document.approved_at ? formatDateShort(approvedDate) : ''}</td>` : ''}
                </tr>
            </table>
        </div>

        <div class="doc-number">기안번호 : ${document.doc_number || ''}</div>

        <div class="main-box">
            <table class="info-table">
                <tr>
                    <td class="label">기 안 일</td>
                    <td>${formatDateKorean(createdDate).replace('년 ', '-').replace('월 ', '-').replace('일', '')}</td>
                </tr>
                <tr>
                    <td class="label">기 안 자</td>
                    <td>${userInfo.name || ''}</td>
                </tr>
                <tr>
                    <td class="label">기안부서</td>
                    <td>${userInfo.team || '운영지원'}</td>
                </tr>
                <tr>
                    <td class="label">직 급</td>
                    <td>${userInfo.rank || ''}</td>
                </tr>
                <tr>
                    <td class="label">제 목</td>
                    <td>${document.document_labels?.name || ''} (${document.title}) 구매의 건</td>
                </tr>
            </table>

            <div class="content-area">
                <p class="content-statement">아래와 같이 ${document.document_labels?.name || '사무용품'} 구매를 집행하고자 하오니 재가해 주시기 바랍니다.</p>

                <p style="text-align: center; margin: 20px 0;">아래-</p>

                <div class="content-list">
                    ${document.execution_date ? `<p>1. 집행기간: ${document.execution_date}</p>` : ''}
                    ${totalAmount > 0 ? `<p>${document.execution_date ? '2' : '1'}. 집행금액: ${totalAmount.toLocaleString()} 원 (${numberToKorean(totalAmount)})</p>` : ''}
                    ${document.payment_method ? `<p>${document.execution_date ? '3' : '2'}. 집행방법: ${document.payment_method}</p>` : ''}
                    ${(document.expense_items || []).length > 0 ? `<p>${document.execution_date ? '4' : '3'}. 산출내역</p>` : ''}
                </div>

                ${(document.expense_items || []).length > 0 ? `
                <div class="expense-section">
                    <table class="expense-table">
                        <thead>
                            <tr>
                                <th style="width: 25%;">적 요</th>
                                <th style="width: 15%;">사업종류</th>
                                <th style="width: 15%;">거래처</th>
                                <th style="width: 18%;">금액</th>
                                <th style="width: 12%;">비고</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateTableRows()}
                            <tr class="total-row">
                                <td colspan="3" style="text-align: center; border: 1px solid #000;">총 합계</td>
                                <td style="text-align: right; border: 1px solid #000;">${totalAmount.toLocaleString()}</td>
                                <td style="border: 1px solid #000;"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ` : `
                <div style="margin-top: 20px;">
                    <p style="white-space: pre-wrap;">${document.content || ''}</p>
                </div>
                `}

                ${(document.expense_items || []).length > 0 ? `
                <div class="attachment">
                    <p>붙임. 1.구매 목록 ${(document.expense_items || []).length}건 끝.</p>
                </div>
                ` : ''}
            </div>
        </div>
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

export default generateDocumentPdf
