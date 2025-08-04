import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  // StrictMode 임시 비활성화 - WebRTC 중복 연결 방지
  // <StrictMode>
    <BrowserRouter>
    <App />
    </BrowserRouter>
  // </StrictMode>,
)
