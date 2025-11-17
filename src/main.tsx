import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { LandingPage } from './screens/LandingPage/LandingPage.tsx'
import './index.css'
import App from './App.tsx'

// Apply saved theme before React mounts, to avoid a flash
;(function applyInitialTheme() {
  try {
    const raw = localStorage.getItem('soodo-settings')
    const root = document.documentElement
    root.classList.remove('dark')
    if (raw) {
      const parsed = JSON.parse(raw)
      const theme = parsed?.theme as 'light' | 'dark' | 'system' | undefined
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      if (theme === 'dark' || (theme === 'system' && prefersDark)) {
        root.classList.add('dark')
      }
    }
  } catch {
    // ignore theme errors
  }
})()

function Root() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<App />} />
        <Route path="/app/*" element={<App />} />
      </Routes>
    </Router>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)