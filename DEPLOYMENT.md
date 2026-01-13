# 배포 가이드

## GitHub Pages 자동 배포

이 프로젝트는 GitHub Actions를 통해 GitHub Pages에 자동으로 배포됩니다.

### 사전 준비

1. **GitHub Repository Settings**에서 Pages 활성화:
   - Settings → Pages → Source: "GitHub Actions"

2. **Repository Secrets 설정** (Settings → Secrets and variables → Actions):
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

### 배포 방법

`main` 브랜치에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update"
git push origin main
```

### 수동 배포

GitHub Actions 탭에서 "Run workflow" 버튼으로 수동 배포 가능합니다.

---

## Supabase 설정

### Storage 버킷 생성

Supabase Dashboard에서 다음 버킷을 생성하세요:

1. **work_logs_pdfs** - PDF 파일 저장용
2. **work_log_images** - 이미지 파일 저장용

각 버킷 설정:
- Public bucket: ON
- Allowed MIME types: 
  - work_logs_pdfs: `application/pdf`
  - work_log_images: `image/*`

### RLS 정책 (Storage)

```sql
-- work_logs_pdfs 버킷 정책
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work_logs_pdfs');

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'work_logs_pdfs');

-- work_log_images 버킷 정책
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work_log_images');

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'work_log_images');
```

---

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```
