-- 국가별 구조 통계 테이블
CREATE TABLE rescue_country_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,        -- 국가 코드 (예: PH, KH, VN)
  country_name TEXT NOT NULL,        -- 국가명 (예: 필리핀, 캄보디아, 베트남)
  rescue_count INTEGER DEFAULT 0,    -- 구조 요청자 수
  stat_type TEXT NOT NULL CHECK (stat_type IN ('in_progress', 'completed')),  -- 구조 진행 / 구조 난항
  display_order INTEGER DEFAULT 0,   -- 표시 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 구조현황 참고 이미지 테이블
CREATE TABLE rescue_reference_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 구조 통계 요약 (이번 주, 이번 달, 올해, 총 구조자)
CREATE TABLE rescue_summary_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key TEXT NOT NULL UNIQUE,     -- this_week, this_month, this_year, total
  stat_value INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 데이터 삽입
INSERT INTO rescue_summary_stats (stat_key, stat_value) VALUES
  ('this_week', 0),
  ('this_month', 0),
  ('this_year', 0),
  ('total', 0);

-- RLS 정책
ALTER TABLE rescue_country_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescue_summary_stats ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자 조회 가능
CREATE POLICY "Anyone can view rescue_country_stats" ON rescue_country_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can view rescue_reference_images" ON rescue_reference_images FOR SELECT USING (true);
CREATE POLICY "Anyone can view rescue_summary_stats" ON rescue_summary_stats FOR SELECT USING (true);

-- 모든 인증된 사용자가 수정 가능
CREATE POLICY "Authenticated users can insert rescue_country_stats" ON rescue_country_stats FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rescue_country_stats" ON rescue_country_stats FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete rescue_country_stats" ON rescue_country_stats FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert rescue_reference_images" ON rescue_reference_images FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update rescue_reference_images" ON rescue_reference_images FOR UPDATE
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete rescue_reference_images" ON rescue_reference_images FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rescue_summary_stats" ON rescue_summary_stats FOR UPDATE
  USING (auth.uid() IS NOT NULL);
