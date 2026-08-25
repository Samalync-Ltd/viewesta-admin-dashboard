import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerNotificationServiceWorker } from './api/notifications'

// Dark mode only. Tailwind runs with darkMode:"class", so the `dark` class on
// <html> is what every `dark:` utility keys off. index.html ships with it, and
// this pins it in case a document was cached while the old theme toggle had
// swapped in `light`.
document.documentElement.classList.remove('light')
document.documentElement.classList.add('dark')
try {
  localStorage.removeItem('viewesta_theme')
} catch {
  /* private mode / storage disabled — the class above is what matters */
}

void registerNotificationServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
