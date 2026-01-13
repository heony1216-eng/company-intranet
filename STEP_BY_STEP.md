# 📋 단계별 배포 가이드

## 현재 상황
✅ 로컬 코드 준비 완료
❌ GitHub 저장소 미생성

---

## 🚀 지금 따라하세요!

### STEP 1: GitHub 저장소 생성 (브라우저)

1. **새 탭에서 GitHub 열기**
   ```
   https://github.com/new
   ```
   
2. **정보 입력**
   ```
   Repository name: company-intranet
   Description: 한인구조단 업무일지 관리 시스템
   Public 선택
   ```
   
3. **중요! 체크박스 모두 해제**
   ```
   ❌ Add a README file
   ❌ Add .gitignore
   ❌ Choose a license
   ```
   (이미 로컬에 있으므로)

4. **Create repository 클릭**

---

### STEP 2: GitHub 사용자명 확인

생성된 저장소 페이지 상단의 URL을 보면:
```
https://github.com/사용자명/company-intranet
```

여기서 **사용자명**을 확인하세요!
(예: heony1216-eng 또는 다른 이름)

---

### STEP 3: Git Remote 설정 (터미널)

터미널에서 다음 명령어 실행:

```bash
# 사용자명을 실제 GitHub 사용자명으로 변경!
git remote add origin https://github.com/사용자명/company-intranet.git

# 설정 확인
git remote -v
```

**출력 예시:**
```
origin  https://github.com/heony1216-eng/company-intranet.git (fetch)
origin  https://github.com/heony1216-eng/company-intranet.git (push)
```

---

### STEP 4: 코드 푸시 (터미널)

```bash
# 모든 파일 추가
git add .

# 커밋
git commit -m "feat: 업무일지 관리 시스템 초기 배포

- 업무일지 CRUD 기능
- 이미지 WebP 300KB 압축
- 구조현황 관리 (박호정 전용)
- Toss 디자인 시스템
- GitHub Actions 자동 배포"

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

푸시가 성공하면:
```
Enumerating objects: XX, done.
Writing objects: 100% (XX/XX), done.
Total XX (delta X), reused X (delta X)
```

---

### STEP 5: GitHub Secrets 설정 (브라우저)

#### 5-1. Supabase 키 준비

Supabase 대시보드에서:
1. https://supabase.com 로그인
2. 프로젝트 선택
3. Settings → API 클릭
4. 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public 키**: `eyJhbGciOiJ...` (긴 문자열)

#### 5-2. GitHub에 등록

1. GitHub 저장소 페이지에서 **Settings** 탭
2. 왼쪽 메뉴 → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭

**Secret 1:**
```
Name: VITE_SUPABASE_URL
Secret: https://xxxxx.supabase.co
```
→ Add secret 클릭

**Secret 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Secret: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ Add secret 클릭

---

### STEP 6: GitHub Pages 활성화 (브라우저)

1. 같은 **Settings** 페이지
2. 왼쪽 메뉴 → **Pages** 클릭
3. **Source** 드롭다운:
   - ❌ `Deploy from a branch`
   - ✅ `GitHub Actions` ← 이것 선택!
4. 자동 저장됨

---

### STEP 7: 배포 확인 (브라우저)

1. **Actions** 탭 클릭
2. "Deploy to GitHub Pages" 워크플로우 확인
3. 🟡 진행 중... (1-2분)
4. ✅ 초록색 체크 → 성공!

**배포된 사이트:**
```
https://사용자명.github.io/company-intranet/
```

예시:
```
https://heony1216-eng.github.io/company-intranet/
```

---

## ✅ 성공 확인

배포된 사이트에 접속하여:
- [ ] 로그인 페이지 표시됨
- [ ] 레이아웃이 정상적으로 보임
- [ ] 로그인 시도 가능

---

## ❌ 실패 시 문제 해결

### 문제 1: push rejected
```
error: failed to push some refs
```

**해결:**
```bash
git pull origin main --rebase
git push origin main
```

### 문제 2: Actions 탭에서 빌드 실패
**원인**: Secrets 미설정 또는 오타  
**해결**: STEP 5 다시 확인

### 문제 3: 404 페이지
**원인**: vite.config.js의 base 경로 불일치  
**해결**: 
- 저장소 이름이 `company-intranet`이 맞는지 확인
- vite.config.js에서 `base: '/company-intranet/'` 확인

---

## 🎉 완료!

모든 단계를 완료하셨다면 축하합니다!

**다음 단계:**
1. 팀원 초대
2. 관리자 권한 설정
3. 업무일지 작성 시작!

**문제가 있나요?**
- 배포가이드.md 참고
- GitHub Issues 탭에서 질문
