import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'

const isDev = import.meta.env.DEV

if (isDev) {
  console.log('[MAIN] JavaScript is executing! Version:', new Date().toISOString())
  console.log('[MAIN] Environment:', import.meta.env.MODE)
  console.log('[MAIN] Platform:', Capacitor.getPlatform())
}

// Capacitor 앱에서 자동 업데이트 체크
const initApp = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LiveUpdate } = await import('@capawesome/capacitor-live-update')

      // 앱 시작 시 업데이트 체크
      const result = await LiveUpdate.sync()
      if (isDev) console.log('[LiveUpdate] Sync result:', result)

      if (result.nextBundleId && isDev) {
        console.log('[LiveUpdate] New bundle available, will be applied on next restart')
      }
    } catch (error) {
      if (isDev) console.log('[LiveUpdate] Not available or error:', error.message)
    }
  }
}

initApp()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
