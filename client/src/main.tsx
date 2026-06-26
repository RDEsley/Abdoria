import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/afk/afk-patrol.css'
import './perf-mobile.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
