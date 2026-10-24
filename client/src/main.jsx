import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import '@fontsource-variable/inter/index.css';
import './index.css';
import App from './App.jsx';

// Faqat dasturlash rejimida: tekshiruv vositasi uchun sessiya tokenini ?__t= orqali qabul qiladi (production build'da yo'q)
if (import.meta.env.DEV) {
  const t = new URLSearchParams(location.search).get('__t');
  if (t) localStorage.setItem('bosmachi_token', t);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
);
