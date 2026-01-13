# ⚡ 빠른 시작 가이드 (5분 완성)

GitHub Pages에 5분 안에 배포하는 방법입니다.

---

## 📝 체크리스트

배포 전 준비사항을 확인하세요:

- [ ] GitHub 계정 있음
- [ ] Git 설치됨 (`git --version`으로 확인)
- [ ] Supabase 프로젝트 생성됨
- [ ] Supabase에서 schema.sql 실행 완료
- [ ] Supabase Storage 버킷 생성 (`work_log_images`, `work_logs_pdfs`)

---

## 🚀 배포 3단계

### 1단계: GitHub 저장소 생성 (1분)

1. https://github.com/new 접속
2. Repository name: `company-intranet` 입력
3. Public 선택
4. **Create repository** 클릭
5. 생성된 저장소 URL 복사 (예: https://github.com/heony/company-intranet.git)

---

### 2단계: 코드 푸시 (2분)

터미널에서 프로젝트 폴더로 이동 후 실행:

```bash
# Git 초기화
git init
git add .
git commit -m "초기 배포"

# GitHub 연결 (URL을 1단계에서 복사한 주소로 변경)
git remote add origin https://github.com/사용자명/company-intranet.git

# 푸시
git branch -M main
git push -u origin main
```

---

### 3단계: GitHub 설정 (2분)

#### 3-1. Secrets 설정
1. GitHub 저장소 페이지 → **Settings** 탭
2. 왼쪽 메뉴 → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭
4. 아래 2개 Secret 추가:

**Secret 1:**
```
Name: VITE_SUPABASE_URL
Value: https://xxxxx.supabase.co
```

**Secret 2:**
```
Name: VITE_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> 💡 Supabase 키 찾기: Supabase Dashboard → Settings → API

#### 3-2. Pages 활성화
1. 같은 Settings 페이지에서 왼쪽 메뉴 → **Pages**
2. **Source**를 `GitHub Actions` 선택
3. **Save** 클릭

---

## ✅ 배포 완료!

1. **Actions** 탭에서 배포 진행 상황 확인 (약 1-2분 소요)
2. 초록색 체크 표시가 나타나면 완료
3. 브라우저에서 접속:
   ```
   https://사용자명.github.io/company-intranet/
   ```

---

## 🔄 코드 수정 후 재배포

```bash
# 간단한 방법 (자동 스크립트)
./deploy.sh

# 또는 수동으로
git add .
git commit -m "수정 내용"
git push origin main
```

푸시하면 자동으로 재배포됩니다!

---

## ❓ 문제 해결

### "페이지가 404 오류"
**해결**: `vite.config.js` 파일 확인
```javascript
base: '/company-intranet/'  // 저장소 이름과 일치해야 함
```

### "환경변수 오류"
**해결**: GitHub Secrets 다시 확인 (오타 주의)

### "이미지 업로드 안됨"
**해결**: Supabase Storage 버킷 및 RLS 정책 확인

---

## 📚 더 자세한 가이드

- [DEPLOY.md](./DEPLOY.md) - 상세한 배포 가이드
- [README.md](./README.md) - 프로젝트 전체 문서

배포 성공하세요! 🎉
