import { applyTheme, readTheme } from './utils/theme';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { register } from './serviceWorker'
import { initMobileOptimizations } from './utils/mobileOptimizations'
import { Analytics } from '@vercel/analytics/react'

applyTheme(readTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {import.meta.env.VITE_ENABLE_ANALYTICS === 'true' && <Analytics />}
  </React.StrictMode>,
)

// Register service worker for PWA functionality
register()

// Initialize mobile optimizations
initMobileOptimizations()
