import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for offline PWA functionality
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, reload ready.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
