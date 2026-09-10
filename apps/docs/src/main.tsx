import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@paic/ui';
import { analytics } from '@paic/analytics';
import App from './App';
import './index.css';

analytics.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);