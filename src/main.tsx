import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { AndroidBackButton } from './components/AndroidBackButton';
import { ConfirmProvider } from './components/ConfirmDialog';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ConfirmProvider>
        <AndroidBackButton />
        <App />
      </ConfirmProvider>
    </HashRouter>
  </React.StrictMode>
);
