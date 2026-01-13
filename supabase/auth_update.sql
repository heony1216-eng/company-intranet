-- =====================================================
-- 인증 시스템 업데이트 SQL
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. rank (직급) 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rank TEXT;

-- 2. handle_new_user 함수 업데이트 (회원가입 시 메타데이터 저장)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, position, rank)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'position',
    new.raw_user_meta_data->>'rank'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 관리자 계정 설정
-- =====================================================
-- 방법 1: Supabase Dashboard > Authentication > Users에서 생성
--   - 이메일: admin@save365.kr
--   - 비밀번호: admin
--   - 생성 후 아래 SQL 실행

-- 방법 2: 이미 생성된 경우 role만 업데이트
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@save365.kr';
