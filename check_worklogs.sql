-- work_logs 테이블의 user_id 컬럼 타입 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_logs' AND column_name = 'user_id';

-- notices 테이블의 author_id 컬럼 타입 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notices' AND column_name = 'author_id';
