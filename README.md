# 🏢 회사 인트라넷 - 업무일지 관리 시스템

한인구조단 부평지사의 업무일지 및 공지사항 관리를 위한 웹 애플리케이션입니다.

![Toss Design](https://img.shields.io/badge/Design-Toss-3182F6?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)

---

## ✨ 주요 기능

### 📝 업무일지 관리
- **일반 사용자**: 본인이 작성한 업무일지만 조회 및 관리
- **관리자**: 모든 직원의 업무일지를 한눈에 확인 가능
- 제목, 작업일, 특이사항, 착오출동 기록
- PDF 파일 첨부 기능

### 📸 이미지 업로드 (WebP 자동 압축)
- 다중 이미지 업로드 지원
- 클라이언트 사이드 자동 압축 (최대 300KB 이하)
- WebP 포맷 자동 변환으로 저장 공간 절약
- 이미지 갤러리 뷰 (클릭 시 전체 화면 확대)
- 좌우 네비게이션으로 편리한 이미지 탐색

### 🆘 구조현황 관리 (박호정 전용)
- 특정 사용자(박호정)만 접근 가능한 구조현황 입력 폼
- 체류지, 성명, 구조요청일, 진행상황 기록
- 여러 건의 구조 정보를 동적으로 추가/삭제

### 📢 공지사항
- 관리자만 작성/수정/삭제 가능
- 중요 공지사항 상단 고정 (Pin) 기능
- 작성자 및 작성일시 표시

### 👤 마이페이지
- 개인정보 수정 (이름, 직책, 소속팀)
- 업무일지 및 공지사항에 표시될 정보 관리

---

## 🎨 디자인 시스템

**Toss Style Guide** 적용:
- 그라데이션 제거, 솔리드 컬러 사용
- Primary Color: `#3182F6` (Toss Blue)
- Background: `#F9FAFB` (Light Gray)
- Border Radius: 12px, 16px, 20px
- 풍부한 여백과 깔끔한 레이아웃
- 부드러운 전환 애니메이션

---

## 🛠️ 기술 스택

### Frontend
- **React 19** - 최신 React 버전
- **Vite 7** - 빠른 빌드 도구
- **React Router DOM 7** - 클라이언트 사이드 라우팅
- **Tailwind CSS 3** - 유틸리티 기반 스타일링
- **Lucide React** - 아이콘 라이브러리

### Backend
- **Supabase** - PostgreSQL 데이터베이스
- **Supabase Storage** - 파일 저장소 (PDF, 이미지)
- **Supabase Auth** - 인증 시스템
- **Row Level Security (RLS)** - 권한 기반 데이터 접근 제어

### 이미지 처리
- **browser-image-compression** - 클라이언트 사이드 이미지 압축
- WebP 포맷 자동 변환
- 최대 300KB 이하로 자동 압축

---

## 📦 설치 방법

### 1. 저장소 클론
```bash
git clone https://github.com/사용자명/company-intranet.git
cd company-intranet
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경변수 설정
`.env` 파일 생성:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Supabase 데이터베이스 설정
`supabase/schema.sql` 파일을 Supabase SQL Editor에서 실행:
- 테이블 생성 (users, notices, work_logs)
- RLS 정책 설정
- Storage 버킷 생성 및 정책 설정

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## 🚀 배포

### GitHub Pages 배포

상세한 배포 가이드는 [DEPLOY.md](./DEPLOY.md) 참고

#### 빠른 배포
```bash
# 자동 배포 스크립트 실행
./deploy.sh

# 또는 수동 배포
npm run deploy
```

GitHub Actions가 자동으로 빌드 및 배포를 진행합니다.

**배포 URL**: `https://사용자명.github.io/company-intranet/`

---

## 📁 프로젝트 구조

```
company-intranet/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 배포 설정
├── public/                      # 정적 파일
├── src/
│   ├── components/
│   │   ├── common/             # 재사용 컴포넌트
│   │   │   ├── index.jsx       # Button, Input, Card, Modal
│   │   │   └── ImageGallery.jsx # 이미지 갤러리
│   │   └── layout/             # 레이아웃 컴포넌트
│   │       ├── Layout.jsx
│   │       ├── Header.jsx
│   │       └── Sidebar.jsx
│   ├── hooks/
│   │   └── useAuth.jsx         # 인증 Hook
│   ├── lib/
│   │   └── supabase.js         # Supabase 클라이언트
│   ├── pages/
│   │   ├── Dashboard.jsx       # 대시보드
│   │   ├── LoginPage.jsx       # 로그인
│   │   ├── NoticePage.jsx      # 공지사항
│   │   ├── WorkLogPage.jsx     # 업무일지
│   │   └── MyPage.jsx          # 마이페이지
│   ├── utils/
│   │   └── imageCompression.js # 이미지 압축 유틸
│   ├── App.jsx                 # 라우팅 설정
│   └── main.jsx                # 진입점
├── supabase/
│   └── schema.sql              # 데이터베이스 스키마
├── .env.example                # 환경변수 예시
├── deploy.sh                   # 배포 스크립트
├── DEPLOY.md                   # 배포 가이드
└── README.md
```

---

## 🔐 권한 시스템

### 일반 사용자 (role: 'user')
- ✅ 본인의 업무일지 작성/조회/수정/삭제
- ✅ 모든 공지사항 조회
- ✅ 개인정보 수정
- ❌ 타인의 업무일지 조회
- ❌ 공지사항 작성/수정/삭제

### 관리자 (role: 'admin')
- ✅ 모든 직원의 업무일지 조회
- ✅ 공지사항 작성/수정/삭제/고정
- ✅ 대시보드 통계 확인
- ✅ 모든 일반 사용자 권한

### 특수 권한 (박호정)
- ✅ 구조현황 입력 폼 접근 가능
- ✅ 구조 정보 추가/수정/삭제

---

## 📸 스크린샷

### 업무일지 작성
- 제목, 작업일 입력
- 구조현황 (박호정 전용)
- 특이사항, 착오출동
- 다중 이미지 업로드 (WebP 자동 압축)
- PDF 파일 첨부

### 이미지 갤러리
- 썸네일 그리드 뷰
- 클릭 시 전체 화면 확대
- 좌우 네비게이션
- 이미지 카운터 표시

---

## 🧪 테스트

```bash
# 빌드 테스트
npm run build

# 프리뷰 (빌드 결과 확인)
npm run preview

# 린트 검사
npm run lint
```

---

## 📝 데이터베이스 스키마

### users 테이블
```sql
- id (UUID, Primary Key)
- email (TEXT, Unique)
- name (TEXT)
- position (TEXT)          # 직책
- team (TEXT)              # 소속팀
- role (TEXT)              # 'user' | 'admin'
- avatar_url (TEXT)
- created_at (TIMESTAMP)
```

### work_logs 테이블
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- title (TEXT)
- work_date (DATE)
- rescue_situations (JSONB)  # 구조현황 배열
- special_notes (TEXT)       # 특이사항
- false_dispatch (TEXT)      # 착오출동
- images (TEXT[])            # 이미지 URL 배열
- pdf_url (TEXT)
- created_at (TIMESTAMP)
```

### notices 테이블
```sql
- id (UUID, Primary Key)
- title (TEXT)
- content (TEXT)
- author_id (UUID, Foreign Key)
- is_pinned (BOOLEAN)
- created_at (TIMESTAMP)
```

---

## 🔧 트러블슈팅

### 이미지 업로드 실패
1. Supabase Storage 버킷 확인 (`work_log_images`)
2. RLS 정책 설정 확인
3. 브라우저 콘솔에서 에러 메시지 확인

### 권한 오류
1. Supabase에서 users 테이블의 role 컬럼 확인
2. RLS 정책이 올바르게 설정되었는지 확인

### 빌드 오류
1. Node.js 버전 확인 (20 이상 권장)
2. `node_modules` 삭제 후 재설치: `rm -rf node_modules && npm install`
3. 환경변수 확인 (`.env` 파일)

---

## 📄 라이선스

MIT License

---

## 👥 기여

이슈 및 PR은 언제나 환영합니다!

---

## 📞 문의

문제가 발생하면 GitHub Issues에 등록해주세요.

**개발**: Claude Code + React + Vite + Supabase  
**디자인**: Toss Design System  
**배포**: GitHub Pages
