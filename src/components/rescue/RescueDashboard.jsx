import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Maximize2, Minimize2 } from 'lucide-react';

// 전세계 국기 데이터
const flagData = {
  '한국': '🇰🇷', '북한': '🇰🇵', '일본': '🇯🇵', '중국': '🇨🇳', '대만': '🇹🇼',
  '홍콩': '🇭🇰', '마카오': '🇲🇴', '몽골': '🇲🇳', '베트남': '🇻🇳', '태국': '🇹🇭',
  '필리핀': '🇵🇭', '캄보디아': '🇰🇭', '라오스': '🇱🇦', '미얀마': '🇲🇲', '말레이시아': '🇲🇾',
  '싱가폴': '🇸🇬', '인도네시아': '🇮🇩', '브루나이': '🇧🇳', '동티모르': '🇹🇱', '인도': '🇮🇳',
  '파키스탄': '🇵🇰', '방글라데시': '🇧🇩', '스리랑카': '🇱🇰', '네팔': '🇳🇵', '부탄': '🇧🇹',
  '몰디브': '🇲🇻', '아프가니스탄': '🇦🇫', '카자흐스탄': '🇰🇿', '우즈베키스탄': '🇺🇿',
  '키르기스스탄': '🇰🇬', '타지키스탄': '🇹🇯', '투르크메니스탄': '🇹🇲',
  '이란': '🇮🇷', '이라크': '🇮🇶', '시리아': '🇸🇾', '레바논': '🇱🇧', '요르단': '🇯🇴',
  '이스라엘': '🇮🇱', '팔레스타인': '🇵🇸', '사우디아라비아': '🇸🇦', '아랍에미리트': '🇦🇪',
  '카타르': '🇶🇦', '쿠웨이트': '🇰🇼', '바레인': '🇧🇭', '오만': '🇴🇲', '예멘': '🇾🇪', '터키': '🇹🇷',
  '영국': '🇬🇧', '프랑스': '🇫🇷', '독일': '🇩🇪', '이탈리아': '🇮🇹', '스페인': '🇪🇸',
  '포르투갈': '🇵🇹', '네덜란드': '🇳🇱', '벨기에': '🇧🇪', '룩셈부르크': '🇱🇺', '스위스': '🇨🇭',
  '오스트리아': '🇦🇹', '폴란드': '🇵🇱', '체코': '🇨🇿', '슬로바키아': '🇸🇰', '헝가리': '🇭🇺',
  '루마니아': '🇷🇴', '불가리아': '🇧🇬', '그리스': '🇬🇷', '크로아티아': '🇭🇷', '세르비아': '🇷🇸',
  '슬로베니아': '🇸🇮', '보스니아': '🇧🇦', '몬테네그로': '🇲🇪', '북마케도니아': '🇲🇰',
  '알바니아': '🇦🇱', '코소보': '🇽🇰', '우크라이나': '🇺🇦', '벨라루스': '🇧🇾', '몰도바': '🇲🇩',
  '러시아': '🇷🇺', '에스토니아': '🇪🇪', '라트비아': '🇱🇻', '리투아니아': '🇱🇹',
  '핀란드': '🇫🇮', '스웨덴': '🇸🇪', '노르웨이': '🇳🇴', '덴마크': '🇩🇰', '아이슬란드': '🇮🇸',
  '아일랜드': '🇮🇪', '몰타': '🇲🇹', '키프로스': '🇨🇾', '조지아': '🇬🇪', '아르메니아': '🇦🇲',
  '아제르바이잔': '🇦🇿', '모나코': '🇲🇨', '안도라': '🇦🇩', '산마리노': '🇸🇲', '바티칸': '🇻🇦',
  '미국': '🇺🇸', '캐나다': '🇨🇦', '멕시코': '🇲🇽',
  '과테말라': '🇬🇹', '벨리즈': '🇧🇿', '엘살바도르': '🇸🇻', '온두라스': '🇭🇳', '니카라과': '🇳🇮',
  '코스타리카': '🇨🇷', '파나마': '🇵🇦', '쿠바': '🇨🇺', '자메이카': '🇯🇲', '아이티': '🇭🇹',
  '도미니카공화국': '🇩🇴', '푸에르토리코': '🇵🇷', '바하마': '🇧🇸', '트리니다드토바고': '🇹🇹',
  '바베이도스': '🇧🇧',
  '브라질': '🇧🇷', '아르헨티나': '🇦🇷', '칠레': '🇨🇱', '페루': '🇵🇪', '콜롬비아': '🇨🇴',
  '베네수엘라': '🇻🇪', '에콰도르': '🇪🇨', '볼리비아': '🇧🇴', '파라과이': '🇵🇾', '우루과이': '🇺🇾',
  '가이아나': '🇬🇾', '수리남': '🇸🇷',
  '호주': '🇦🇺', '뉴질랜드': '🇳🇿', '파푸아뉴기니': '🇵🇬', '피지': '🇫🇯', '사모아': '🇼🇸',
  '통가': '🇹🇴', '바누아투': '🇻🇺', '솔로몬제도': '🇸🇧', '괌': '🇬🇺',
  '이집트': '🇪🇬', '리비아': '🇱🇾', '튀니지': '🇹🇳', '알제리': '🇩🇿', '모로코': '🇲🇦',
  '남아프리카공화국': '🇿🇦', '나이지리아': '🇳🇬', '케냐': '🇰🇪', '에티오피아': '🇪🇹', '가나': '🇬🇭',
  '탄자니아': '🇹🇿', '우간다': '🇺🇬', '짐바브웨': '🇿🇼', '모잠비크': '🇲🇿', '앙골라': '🇦🇴',
  '카메룬': '🇨🇲', '코트디부아르': '🇨🇮', '세네갈': '🇸🇳', '콩고민주공화국': '🇨🇩', '콩고': '🇨🇬',
  '수단': '🇸🇩', '남수단': '🇸🇸', '소말리아': '🇸🇴', '르완다': '🇷🇼', '마다가스카르': '🇲🇬',
  '모리셔스': '🇲🇺', '나미비아': '🇳🇦', '보츠와나': '🇧🇼', '잠비아': '🇿🇲', '말라위': '🇲🇼',
  '모리타니': '🇲🇷', '말리': '🇲🇱', '니제르': '🇳🇪', '차드': '🇹🇩', '부르키나파소': '🇧🇫',
  '토고': '🇹🇬', '베냉': '🇧🇯', '라이베리아': '🇱🇷', '시에라리온': '🇸🇱', '기니': '🇬🇳',
  '감비아': '🇬🇲', '카보베르데': '🇨🇻', '지부티': '🇩🇯', '에리트레아': '🇪🇷',
};

// 국가 코드 -> 한글 국가명 매핑
const countryCodeToName = {
  'PH': '필리핀', 'KH': '캄보디아', 'VN': '베트남', 'GT': '과테말라', 'US': '미국',
  'BR': '브라질', 'CL': '칠레', 'NL': '네덜란드', 'CN': '중국', 'TH': '태국',
  'AU': '호주', 'SG': '싱가폴', 'JP': '일본', 'MY': '말레이시아', 'ID': '인도네시아',
  'IN': '인도', 'MX': '멕시코', 'PE': '페루', 'CO': '콜롬비아', 'EC': '에콰도르',
  'MM': '미얀마', 'LA': '라오스', 'BD': '방글라데시', 'NP': '네팔', 'PK': '파키스탄',
  'AE': '아랍에미리트', 'SA': '사우디아라비아', 'QA': '카타르', 'KW': '쿠웨이트', 'RU': '러시아',
  'UA': '우크라이나', 'PL': '폴란드', 'DE': '독일', 'FR': '프랑스', 'GB': '영국',
  'IT': '이탈리아', 'ES': '스페인', 'CA': '캐나다', 'NZ': '뉴질랜드', 'ZA': '남아프리카공화국',
  'KE': '케냐', 'NG': '나이지리아', 'EG': '이집트', 'MA': '모로코', 'TR': '터키'
};

// 레이아웃 상수
const LAYOUT = {
  statsTop: 245,
  statsHeight: 114,
  statsBoxes: [
    { left: 330, width: 310 },
    { left: 647, width: 310 },
    { left: 964, width: 315 },
    { left: 1282, width: 310 },
  ],
  tableDataTop: 457,
  rowHeight: 57,
  leftTable: { left: 330, width: 626 },
  rightTable: { left: 965, width: 625 },
  columnWidth: 313,
};

function RescueDashboard({ isOpen, onClose, summaryStats, countryStats }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasDataUrl, setCanvasDataUrl] = useState(null);

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isFullscreen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  // Canvas에 이미지 그리기 (2배 해상도로 고품질 렌더링)
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsLoading(true);

    // 2배 해상도로 설정 (고품질)
    const scale = 2;
    canvas.width = 1920 * scale;
    canvas.height = 1080 * scale;

    const ctx = canvas.getContext('2d');

    // 고품질 렌더링 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 스케일 적용
    ctx.scale(scale, scale);

    const baseUrl = import.meta.env.BASE_URL || '/';

    // 1. 배경 이미지 그리기
    const backImg = new Image();
    backImg.crossOrigin = 'anonymous';
    backImg.src = `${baseUrl}back.jpg`;
    await new Promise((resolve) => {
      backImg.onload = resolve;
      backImg.onerror = resolve;
    });
    ctx.drawImage(backImg, 0, 0, 1920, 1080);

    // 2. 템플릿 이미지 그리기
    const templateImg = new Image();
    templateImg.crossOrigin = 'anonymous';
    templateImg.src = `${baseUrl}template.png`;
    await new Promise((resolve) => {
      templateImg.onload = resolve;
      templateImg.onerror = resolve;
    });
    ctx.drawImage(templateImg, 0, 0, 1920, 1080);

    // 3. 폰트 설정
    ctx.textBaseline = 'middle';

    // 4. 상단 통계 숫자 그리기
    const statsY = LAYOUT.statsTop + LAYOUT.statsHeight / 2;

    // 이번 주
    ctx.font = 'bold 48px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';
    ctx.fillText(`${summaryStats?.this_week || 0}`, LAYOUT.statsBoxes[0].left + LAYOUT.statsBoxes[0].width / 2 - 15, statsY);
    ctx.font = '24px Pretendard, -apple-system, sans-serif';
    ctx.fillText('명', LAYOUT.statsBoxes[0].left + LAYOUT.statsBoxes[0].width / 2 + 35, statsY);

    // 이번 달
    ctx.font = 'bold 48px Pretendard, -apple-system, sans-serif';
    ctx.fillText(`${summaryStats?.this_month || 0}`, LAYOUT.statsBoxes[1].left + LAYOUT.statsBoxes[1].width / 2 - 15, statsY);
    ctx.font = '24px Pretendard, -apple-system, sans-serif';
    ctx.fillText('명', LAYOUT.statsBoxes[1].left + LAYOUT.statsBoxes[1].width / 2 + 35, statsY);

    // 2026년도
    ctx.font = 'bold 48px Pretendard, -apple-system, sans-serif';
    ctx.fillText(`${summaryStats?.this_year || 0}`, LAYOUT.statsBoxes[2].left + LAYOUT.statsBoxes[2].width / 2 - 15, statsY);
    ctx.font = '24px Pretendard, -apple-system, sans-serif';
    ctx.fillText('명', LAYOUT.statsBoxes[2].left + LAYOUT.statsBoxes[2].width / 2 + 35, statsY);

    // 총 구조자 (파란색)
    ctx.font = 'bold 48px Pretendard, -apple-system, sans-serif';
    ctx.fillStyle = '#2c6eb6';
    ctx.fillText(`${summaryStats?.total || 0}`, LAYOUT.statsBoxes[3].left + LAYOUT.statsBoxes[3].width / 2 - 20, statsY);
    ctx.font = '24px Pretendard, -apple-system, sans-serif';
    ctx.fillText('명', LAYOUT.statsBoxes[3].left + LAYOUT.statsBoxes[3].width / 2 + 45, statsY);

    // 5. 왼쪽 테이블 (구조 진행) 그리기
    const inProgressList = countryStats?.in_progress || [];
    inProgressList.forEach((stat, index) => {
      const rowY = LAYOUT.tableDataTop + (index * LAYOUT.rowHeight) + (LAYOUT.rowHeight / 2);
      const countryName = stat.country_name || countryCodeToName[stat.country_code] || stat.country_code;
      const flag = flagData[countryName] || '🏳️';

      // 국기
      ctx.font = '32px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(flag, LAYOUT.leftTable.left + 25, rowY);

      // 국가명
      ctx.font = '600 24px Pretendard, -apple-system, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText(countryName, LAYOUT.leftTable.left + 70, rowY);

      // 인원수
      ctx.font = 'bold 28px Pretendard, -apple-system, sans-serif';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.fillText(`${stat.rescue_count || 0}`, LAYOUT.leftTable.left + LAYOUT.columnWidth + LAYOUT.columnWidth / 2 - 20, rowY);
      ctx.font = '24px Pretendard, -apple-system, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText('명', LAYOUT.leftTable.left + LAYOUT.columnWidth + LAYOUT.columnWidth / 2 + 25, rowY);
    });

    // 6. 오른쪽 테이블 (구조 난항) 그리기
    const completedList = countryStats?.completed || [];
    completedList.forEach((stat, index) => {
      const rowY = LAYOUT.tableDataTop + (index * LAYOUT.rowHeight) + (LAYOUT.rowHeight / 2);
      const countryName = stat.country_name || countryCodeToName[stat.country_code] || stat.country_code;
      const flag = flagData[countryName] || '🏳️';

      // 국기
      ctx.font = '32px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(flag, LAYOUT.rightTable.left + 25, rowY);

      // 국가명
      ctx.font = '600 24px Pretendard, -apple-system, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText(countryName, LAYOUT.rightTable.left + 70, rowY);

      // 인원수
      ctx.font = 'bold 28px Pretendard, -apple-system, sans-serif';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.fillText(`${stat.rescue_count || 0}`, LAYOUT.rightTable.left + LAYOUT.columnWidth + LAYOUT.columnWidth / 2 - 20, rowY);
      ctx.font = '24px Pretendard, -apple-system, sans-serif';
      ctx.fillStyle = '#374151';
      ctx.fillText('명', LAYOUT.rightTable.left + LAYOUT.columnWidth + LAYOUT.columnWidth / 2 + 25, rowY);
    });

    // Canvas를 DataURL로 변환하여 저장
    setCanvasDataUrl(canvas.toDataURL('image/png'));
    setIsLoading(false);
  }, [summaryStats, countryStats]);

  // isOpen이 true가 되면 Canvas 그리기
  useEffect(() => {
    if (isOpen) {
      // 약간의 딜레이 후 그리기 (DOM이 완전히 렌더링된 후)
      const timer = setTimeout(() => {
        drawCanvas();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, drawCanvas]);

  // 전체화면 토글
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // 이미지 다운로드 - 고품질 PNG
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // toBlob으로 고품질 PNG 생성
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `구조현황_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* 숨겨진 Canvas (실제 1920x1080 크기) */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        style={{ display: 'none' }}
      />

      {/* 닫기 버튼 */}
      {!isFullscreen && (
        <button
          onClick={onClose}
          className="absolute top-safe-4 right-safe-4 z-[60] p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
          title="닫기 (ESC)"
        >
          <X size={28} />
        </button>
      )}

      {/* 메인 컨테이너 */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center w-full h-full"
      >
        {isLoading ? (
          <div className="text-white text-xl">로딩 중...</div>
        ) : canvasDataUrl ? (
          <>
            {/* 생성된 이미지 표시 */}
            <img
              src={canvasDataUrl}
              alt="구조현황판"
              className={`max-w-full max-h-full object-contain ${isFullscreen ? 'w-full h-full' : ''}`}
              style={{
                maxWidth: isFullscreen ? '100%' : '90vw',
                maxHeight: isFullscreen ? '100%' : '90vh',
              }}
            />

            {/* 하단 버튼들 - 전체화면일 때는 숨김 */}
            {!isFullscreen && (
              <div className="absolute bottom-safe-4 right-safe-4 flex gap-3 z-50">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all text-gray-800"
                  title="이미지 다운로드"
                >
                  <Download size={20} />
                  <span className="font-medium">저장</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all text-gray-800"
                  title="전체화면"
                >
                  <Maximize2 size={20} />
                  <span className="font-medium">전체화면</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-white text-xl">이미지를 생성할 수 없습니다.</div>
        )}
      </div>
    </div>
  );
}

export default RescueDashboard;
