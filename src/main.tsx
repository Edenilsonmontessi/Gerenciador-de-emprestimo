import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { LocalDataProvider } from './contexts/SupabaseContext';
import 'vite/modulepreload-polyfill';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LocalDataProvider>
        <App />
      </LocalDataProvider>
    </BrowserRouter>
  </StrictMode>
);