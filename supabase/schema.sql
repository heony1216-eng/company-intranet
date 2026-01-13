-- Users 테이블 (Supabase Auth와 연동)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT,          -- 직책
  team TEXT,              -- 소속팀
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notices 테이블 (공지사항)
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Logs 테이블 (업무일지) - 업데이트된 스키마
CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 기본 정보
  title TEXT NOT NULL,
  content TEXT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- 구조 현황 (박호정 전용) - JSONB 배열
  rescue_situations JSONB DEFAULT '[]'::jsonb,
  
  -- 특이사항 및 착오 출동
  special_notes TEXT,
  false_dispatch TEXT,
  
  -- 첨부 파일
  pdf_url TEXT,
  images TEXT[] DEFAULT '{}',  -- 이미지 URL 배열
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage buckets 생성 (Supabase Dashboard에서)
-- 1. work_logs_pdfs - PDF 파일용
-- 2. work_log_images - 이미지 파일용

-- RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Users 정책
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Notices 정책
CREATE POLICY "Anyone can view notices" ON notices FOR SELECT USING (true);
CREATE POLICY "Admins can insert notices" ON notices FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update notices" ON notices FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete notices" ON notices FOR DELETE 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Work Logs 정책 (권한 분리 적용)
-- 일반 사용자: 본인 업무일지만 조회
CREATE POLICY "Users can view own logs" ON work_logs FOR SELECT 
  USING (auth.uid() = user_id);
-- 관리자: 모든 업무일지 조회
CREATE POLICY "Admins can view all logs" ON work_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
-- 본인 업무일지 생성
CREATE POLICY "Users can create own logs" ON work_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
-- 본인 업무일지 수정
CREATE POLICY "Users can update own logs" ON work_logs FOR UPDATE 
  USING (auth.uid() = user_id);
-- 본인 업무일지 삭제
CREATE POLICY "Users can delete own logs" ON work_logs FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 기존 테이블 마이그레이션용 SQL (이미 테이블이 있는 경우)
-- ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS rescue_situations JSONB DEFAULT '[]'::jsonb;
-- ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS special_notes TEXT;
-- ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS false_dispatch TEXT;
-- ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- =====================================================
-- Storage Bucket RLS 정책 (Supabase Dashboard에서 실행)
-- =====================================================

-- work_logs_pdfs 버킷 정책
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'work_logs_pdfs');

-- CREATE POLICY "Allow public read for pdfs" ON storage.objects
--   FOR SELECT TO public
--   USING (bucket_id = 'work_logs_pdfs');

-- work_log_images 버킷 정책
-- CREATE POLICY "Allow authenticated image uploads" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'work_log_images');

-- CREATE POLICY "Allow public read for images" ON storage.objects
--   FOR SELECT TO public
--   USING (bucket_id = 'work_log_images');

-- =====================================================
-- rescue_situations JSONB 구조 예시:
-- [
--   {
--     "number": 1,
--     "location": "미국 뉴욕",
--     "name": "홍길동",
--     "request_date": "25.01.12",
--     "status": "구조 진행 중 - 현지 영사관 연락 완료"
--   }
-- ]
-- =====================================================

