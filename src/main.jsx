import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { register } from './serviceWorker'
import { initMobileOptimizations } from './utils/mobileOptimizations'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker for PWA functionality
register()

// Initialize mobile optimizations
initMobileOptimizations()
