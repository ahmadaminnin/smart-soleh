import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// Initialize Firebase configuration from environment variables
// This must happen before the app initializes
if (typeof window !== 'undefined') {
  window.__firebase_config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  
  // Log Firebase config status for debugging
  const config = window.__firebase_config;
  const hasValidConfig = config.projectId && config.apiKey && config.authDomain;
  console.log('[Firebase] Configuration status:', hasValidConfig ? '✓ Loaded' : '✗ Missing (check env vars)');
  if (!hasValidConfig) {
    console.warn('[Firebase] Missing environment variables:', {
      hasProjectId: !!config.projectId,
      hasApiKey: !!config.apiKey,
      hasAuthDomain: !!config.authDomain
    });
  }
}

// Simple global error overlay for non-React errors
function installGlobalErrorOverlay() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (ev) => {
    try {
      const root = document.getElementById('root');
      if (!root) return;
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.color = 'white';
      overlay.style.zIndex = '999999';
      overlay.style.padding = '24px';
      overlay.innerHTML = `<h2 style="color:#ffb4b4">Uncaught Error</h2><pre style="white-space:pre-wrap;max-height:80vh;overflow:auto">${String(ev.error || ev.message)}</pre>`;
      root.appendChild(overlay);
    } catch (e) {
      // ignore
    }
  });
}

installGlobalErrorOverlay();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
