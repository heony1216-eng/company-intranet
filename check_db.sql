-- users 테이블의 전체 구조와 데이터
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- users 테이블의 실제 데이터
SELECT * FROM users;

-- notices 테이블 구조
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'notices'
ORDER BY ordinal_position;

-- rescue_situations 테이블 구조
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'rescue_situations'
ORDER BY ordinal_position;

-- 모든 외래키 확인
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('notices', 'rescue_situations');

-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('notices', 'rescue_situations');
