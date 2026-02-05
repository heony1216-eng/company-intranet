# Claude Code 프로젝트 규칙

## 파일 생성 규칙

- **새 파일은 무조건 TypeScript로 생성** (`.tsx`, `.ts`)
- 기존 `.jsx`, `.js` 파일 수정 시 → 가능하면 `.tsx`, `.ts`로 변환
- React 컴포넌트 → `.tsx`
- 유틸리티/훅/스토어 → `.ts`

## 코드 스타일

- 한국어 주석 사용
- Tailwind CSS 사용
- Toss 디자인 시스템 컬러 (`toss-blue`, `toss-gray-*` 등)

## 상태 관리

- 전역 상태: Zustand (`src/stores/`)
- 로컬 상태: useState
- 공통 훅: `src/hooks/` (useAsync, usePagination, useDebounce 등)

## 프로젝트 구조

```
src/
├── components/     # 재사용 컴포넌트
├── pages/          # 페이지 컴포넌트
├── hooks/          # 커스텀 훅
├── stores/         # Zustand 스토어
├── utils/          # 유틸리티 함수
├── lib/            # 외부 라이브러리 설정 (supabase, dropbox)
└── constants/      # 상수 정의
```

## 배포

- `npm run deploy` → GitHub Pages 배포
