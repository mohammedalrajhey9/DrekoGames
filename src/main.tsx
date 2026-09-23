import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary'

const mountApp = () => {
  try {
    const root = document.getElementById('root')
    if (!root) {
      throw new Error('root element not found')
    }
    // ensure some visible content exists immediately for Electron windows
    try {
      if (!root.querySelector('#app-mounting')) {
        const tmp = document.createElement('div')
        tmp.id = 'app-mounting'
        tmp.textContent = 'Launching Dreko Games...'
        tmp.style.cssText = 'color:#fff;padding:24px;font-family:sans-serif'
        root.appendChild(tmp)
      }
    } catch {}
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  } catch (e) {
    try { console.error('[main.tsx] failed to mount App', e) } catch {}
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(mountApp, 16)
} else {
  window.addEventListener('DOMContentLoaded', () => setTimeout(mountApp, 16), { once: true })
}
