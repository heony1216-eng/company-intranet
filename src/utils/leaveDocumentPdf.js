// 연차 유형 한글 매핑
const LEAVE_TYPE_LABELS = {
    full: '연차',
    half_am: '오전 반차',
    half_pm: '오후 반차',
    out_2h: '외출/조퇴 2시간',
    out_3h: '외출/조퇴 3시간'
}

/**
 * 연차신청서 PDF 생성 (브라우저 인쇄 기능 사용)
 */
export const generateLeaveDocumentPdf = (request, userInfo, approverName = '이정숙', docNumber = 1) => {
    const startDate = new Date(request.start_date)
    const endDate = new Date(request.end_date)
    const createdDate = new Date(request.created_at)

    const formatDateKorean = (date) => {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
    }

    const formatDateShort = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}/${month}/${day}`
    }

    const formatDateCompact = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${month}${day}`
    }

    // 기안번호는 올린 날짜(created_at) 기준
    const docDateStr = formatDateShort(createdDate)
    const docNumberStr = `${docDateStr} -${docNumber} 운영지원`
    const leaveTypeLabel = LEAVE_TYPE_LABELS[request.leave_type] || '연차'

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>연차신청서 - ${userInfo.name}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #000;
            background: #fff;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            margin: 0 auto;
            background: #fff;
        }

        /* 헤더 영역 */
        .header {
            position: relative;
            margin-bottom: 15px;
            padding-top: 10px;
        }
        .title {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            text-decoration: underline;
            padding-bottom: 15px;
        }

        /* 결재란 - 우측 상단 */
        .approval-box {
            position: absolute;
            top: 0;
            right: 0;
        }
        .approval-table {
            border-collapse: collapse;
            font-size: 11px;
        }
        .approval-table td {
            border: 1px solid #000;
            text-align: center;
            padding: 4px 12px;
            height: 22px;
        }
        .approval-table .label-cell {
            width: 30px;
            padding: 4px 6px;
        }
        .approval-table .name-cell {
            width: 55px;
        }

        /* 기안번호 */
        .doc-number {
            font-size: 12px;
            margin-bottom: 10px;
        }

        /* 메인 박스 */
        .main-box {
            border: 1px solid #000;
            padding: 20px 25px;
            min-height: 200mm;
            position: relative;
        }

        /* 소속/직위/성명 */
        .info-line {
            font-size: 14px;
            margin-bottom: 12px;
        }

        /* 안내문구 */
        .statement {
            font-size: 14px;
            margin: 25px 0;
        }

        /* 내부 박스 */
        .inner-box {
            border: 1px solid #000;
            width: 65%;
            margin: 30px auto;
            padding: 15px 20px;
        }
        .inner-line {
            font-size: 13px;
            margin-bottom: 10px;
        }
        .date-line {
            font-size: 13px;
            margin-bottom: 5px;
        }
        .date-line span {
            margin-left: 20px;
        }
        .date-sub {
            font-size: 13px;
            margin-left: 65px;
            margin-bottom: 5px;
        }
        .total-days {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin-top: 20px;
        }

        /* 하단 날짜/기관명 */
        .footer-area {
            position: absolute;
            bottom: 30px;
            left: 0;
            right: 0;
            text-align: center;
        }
        .footer-date {
            font-size: 14px;
            margin-bottom: 15px;
        }
        .org-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a4ed8;
        }

        /* 페이지 번호 */
        .page-num {
            position: absolute;
            bottom: 10px;
            left: 20px;
            font-size: 12px;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { margin: 0; padding: 15mm 20mm; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="title">연차신청서(${formatDateCompact(createdDate)})</div>

            <div class="approval-box">
                <table class="approval-table">
                    <tr>
                        <td rowspan="3" class="label-cell">결<br>재</td>
                        <td class="name-cell">기안자</td>
                        <td class="name-cell">회장</td>
                    </tr>
                    <tr>
                        <td class="name-cell">${userInfo.name || ''}</td>
                        <td class="name-cell">${approverName}</td>
                    </tr>
                    <tr>
                        <td class="name-cell">${formatDateShort(createdDate)}</td>
                        <td class="name-cell">${formatDateShort(createdDate)}</td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="doc-number">기안번호 : ${docNumberStr}</div>

        <div class="main-box">
            <div class="info-line">소속 : ${userInfo.team || '-'}</div>
            <div class="info-line">직위 : ${userInfo.rank || '-'}</div>
            <div class="info-line">성명 : ${userInfo.name || '-'}</div>

            <div class="statement">
                상기인은 다음과 같은 사유로 인하여 (${leaveTypeLabel})계를 제출합니다.
            </div>

            <div class="inner-box">
                <div class="inner-line">사유 : ${request.reason || '개인사유'}</div>
                <div class="inner-line">첨부 :</div>
                <div class="date-line">일시 :<span>1. ${formatDateKorean(startDate)}부터</span></div>
                <div class="date-sub">${formatDateKorean(endDate)}까지</div>
                <div class="total-days">(총 ${request.days}일)</div>
            </div>

            <div class="footer-area">
                <div class="footer-date">${formatDateKorean(createdDate)}</div>
                <div class="org-name">사단법인 한인구조단</div>
            </div>
        </div>

        <div class="page-num">7</div>
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

export default generateLeaveDocumentPdf
