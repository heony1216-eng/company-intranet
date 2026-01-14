import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('[MAIN] JavaScript is executing! Version:', new Date().toISOString())
console.log('[MAIN] Environment:', import.meta.env.MODE)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
