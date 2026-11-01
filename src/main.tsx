import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// In development mode, clean up any service worker registrations and caches to prevent iframe preview hanging
if (import.meta.env.DEV && typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name).catch(() => {});
      }
    }).catch(() => {});
  }
}

// In production, register Service Worker for offline PWA functionality with immediate auto-update
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => {});
            }
          });
        }
      },
      onNeedRefresh() {
        updateSW(true);
      },
      onOfflineReady() {
        console.log('App ready to work offline.');
      },
    });
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Kendala Memuat Jimpitan RT">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
