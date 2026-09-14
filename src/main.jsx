import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

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
