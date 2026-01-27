-- 문서 수발신 대장 라벨 테이블
CREATE TABLE IF NOT EXISTS document_ledger_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 라벨 데이터 삽입
INSERT INTO document_ledger_labels (name) VALUES
  ('운영지원팀'),
  ('구조사업팀')
ON CONFLICT (name) DO NOTHING;

-- 문서 수발신 대장 테이블
CREATE TABLE IF NOT EXISTS document_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id UUID NOT NULL REFERENCES document_ledger_labels(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,          -- 연번
  doc_number VARCHAR(50),               -- 위치 (예: 13-발신1)
  content TEXT,                         -- 내용
  receiver_org VARCHAR(200),            -- 수신 기관명
  receiver_date VARCHAR(20),            -- 수신 날짜
  sender_org VARCHAR(200),              -- 발신 기관명
  sender_date VARCHAR(20),              -- 발신 날짜
  note TEXT,                            -- 비고
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_document_ledger_label_id ON document_ledger(label_id);
CREATE INDEX IF NOT EXISTS idx_document_ledger_row_number ON document_ledger(row_number);

-- RLS 정책 (선택사항 - 필요시 활성화)
-- ALTER TABLE document_ledger ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_ledger_labels ENABLE ROW LEVEL SECURITY;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_ledger_updated_at
  BEFORE UPDATE ON document_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_ledger_labels_updated_at
  BEFORE UPDATE ON document_ledger_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
