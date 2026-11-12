import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/app/styles.css';
import { App } from '@/app/App';
import { ToastProvider } from '@/shared/ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
