import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 배포 설정
  // 저장소 이름이 'company-intranet'인 경우
  base: '/company-intranet/',
})
