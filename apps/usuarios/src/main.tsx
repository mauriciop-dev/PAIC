import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToastProvider } from '@paic/ui';
import { analytics } from '@paic/analytics';
import App from './App';
import './index.css';

analytics.init();

if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
