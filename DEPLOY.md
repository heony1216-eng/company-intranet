# 🚀 GitHub Pages 배포 가이드

이 문서는 회사 인트라넷 시스템을 GitHub Pages에 배포하는 방법을 상세히 설명합니다.

## 📋 사전 준비사항

- GitHub 계정
- Supabase 프로젝트 (데이터베이스 및 스토리지)
- Node.js 20 이상

---

## 1️⃣ GitHub 저장소 생성

1. GitHub에 로그인
2. 우측 상단의 `+` 버튼 클릭 → `New repository` 선택
3. Repository name: `company-intranet` (원하는 이름으로 변경 가능)
4. Public 또는 Private 선택
5. `Create repository` 클릭

---

## 2️⃣ 로컬 저장소 설정 및 푸시

터미널에서 프로젝트 폴더로 이동 후 실행:

```bash
# Git 저장소 초기화 (이미 초기화되어 있다면 스킵)
git init

# 모든 파일 추가
git add .

# 커밋 생성
git commit -m "feat: 업무일지 관리 시스템 초기 배포"

# GitHub 저장소 연결 (URL을 실제 저장소 주소로 변경)
git remote add origin https://github.com/사용자명/company-intranet.git

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

---

## 3️⃣ Vite 설정 확인

`vite.config.js` 파일에서 `base` 경로가 저장소 이름과 일치하는지 확인:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/company-intranet/',  // 저장소 이름과 일치해야 함
})
```

**중요**: 
- 저장소 이름이 `my-intranet`이면 → `base: '/my-intranet/'`
- GitHub 사용자 페이지 (username.github.io)를 사용하면 → `base: '/'`

---

## 4️⃣ GitHub Secrets 설정 (환경변수)

GitHub 저장소에서 Supabase 환경변수를 안전하게 설정:

1. GitHub 저장소 페이지에서 `Settings` 탭 클릭
2. 좌측 메뉴에서 `Secrets and variables` → `Actions` 클릭
3. `New repository secret` 버튼 클릭
4. 다음 2개의 Secret 추가:

### Secret 1: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Secret: https://your-project-id.supabase.co
```

### Secret 2: VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Secret: your-supabase-anon-key
```

**Supabase 키 찾는 방법**:
- Supabase Dashboard → Project Settings → API
- `Project URL` → VITE_SUPABASE_URL
- `anon public` → VITE_SUPABASE_ANON_KEY

---

## 5️⃣ GitHub Pages 활성화

1. GitHub 저장소에서 `Settings` 탭 클릭
2. 좌측 메뉴에서 `Pages` 클릭
3. **Source** 설정:
   - `Deploy from a branch` 대신 `GitHub Actions` 선택

---

## 6️⃣ 배포 실행

### 방법 1: 자동 배포 (GitHub Actions)

이미 `.github/workflows/deploy.yml` 파일이 설정되어 있으므로:

```bash
# 변경사항 커밋 후 푸시하면 자동 배포됨
git add .
git commit -m "deploy: GitHub Pages 배포 설정 완료"
git push origin main
```

푸시 후 자동으로 배포가 시작됩니다!

### 방법 2: 수동 배포 (gh-pages 브랜치)

```bash
# 빌드 및 배포 (한 번에)
npm run deploy
```

---

## 7️⃣ 배포 확인

1. GitHub 저장소의 `Actions` 탭에서 배포 진행 상황 확인
2. 초록색 체크 표시가 나타나면 배포 완료
3. 브라우저에서 접속:
   ```
   https://사용자명.github.io/company-intranet/
   ```

---

## 🔧 문제 해결

### 문제 1: 페이지가 404 오류
**원인**: `base` 경로가 저장소 이름과 맞지 않음  
**해결**: `vite.config.js`의 `base` 값을 저장소 이름과 일치시키고 다시 배포

### 문제 2: 빌드 실패 (환경변수 오류)
**원인**: GitHub Secrets가 설정되지 않음  
**해결**: 4단계의 Secrets 설정 다시 확인

### 문제 3: 이미지가 로드되지 않음
**원인**: Supabase Storage 버킷 또는 RLS 정책 미설정  
**해결**: 
1. Supabase Dashboard → Storage
2. `work_log_images`, `work_logs_pdfs` 버킷 생성
3. RLS 정책 설정 (schema.sql 참고)

### 문제 4: CSS 스타일이 깨짐
**원인**: 잘못된 base 경로  
**해결**: vite.config.js의 base 경로 확인 및 재배포

---

## 📱 배포 후 테스트 체크리스트

- [ ] 로그인 페이지 접근 가능
- [ ] 회원가입/로그인 작동
- [ ] 대시보드 데이터 로드
- [ ] 공지사항 CRUD 작동 (관리자)
- [ ] 업무일지 작성 및 조회
- [ ] 이미지 업로드 (WebP 압축)
- [ ] 이미지 갤러리 확대 기능
- [ ] 구조현황 입력 (박호정 전용)
- [ ] 마이페이지 수정 기능

---

## 🔄 업데이트 배포

코드 수정 후 다시 배포하는 방법:

```bash
# 1. 코드 수정 후 저장

# 2. Git 커밋
git add .
git commit -m "fix: 버그 수정 내용"

# 3. 푸시 (자동 배포됨)
git push origin main
```

GitHub Actions가 자동으로 빌드 및 배포를 진행합니다!

---

## 🎯 배포 URL 예시

- **일반 저장소**: `https://사용자명.github.io/저장소명/`
- **사용자 페이지**: `https://사용자명.github.io/`

---

## 📞 도움말

배포 중 문제가 발생하면:
1. GitHub Actions 탭에서 로그 확인
2. Browser Console에서 에러 메시지 확인
3. Supabase 연결 상태 확인

배포 성공을 기원합니다! 🚀
