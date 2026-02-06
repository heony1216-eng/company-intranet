// 보고서 형식 인쇄 유틸리티 (숨겨진 iframe 방식)

interface PrintReportOptions {
  title: string
  date?: string
  content: string
}

export function printReport({ title, date, content }: PrintReportOptions) {
  const today = date || new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #2c6eb6;
    }
    .report-header h1 {
      font-size: 24px;
      font-weight: 800;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .report-header .org-name {
      font-size: 14px;
      color: #2c6eb6;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .report-header .date {
      font-size: 13px;
      color: #666;
    }
    .stats-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-box {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .stat-box .label {
      font-size: 11px;
      color: #888;
      margin-bottom: 2px;
    }
    .stat-box .value {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .stat-box .unit {
      font-size: 12px;
      font-weight: 400;
      color: #888;
    }
    .stat-box.highlight {
      border-color: #2c6eb6;
      background: #f0f6ff;
    }
    .stat-box.highlight .value {
      color: #2c6eb6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    table th {
      background: #2c6eb6;
      color: white;
      font-weight: 600;
      padding: 8px 10px;
      text-align: center;
      font-size: 12px;
    }
    table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e5e5e5;
      font-size: 12px;
    }
    table tr:nth-child(even) {
      background: #f8f9fa;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #333;
      margin: 16px 0 8px;
      padding-left: 8px;
      border-left: 3px solid #2c6eb6;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="org-name">한인구조단</div>
    <h1>${title}</h1>
    <div class="date">작성일: ${today}</div>
  </div>
  ${content}
</body>
</html>`

  const existingFrame = document.getElementById('print-report-frame') as HTMLIFrameElement
  if (existingFrame) existingFrame.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'print-report-frame'
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) return

  iframeDoc.open()
  iframeDoc.write(html)
  iframeDoc.close()

  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }
}
