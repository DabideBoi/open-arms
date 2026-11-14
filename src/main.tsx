import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadConfig } from './config/loadConfig';
import './theme.css';
import './index.css';

// Load public/config/*.json before App (and the game systems) are imported.
loadConfig().then(async () => {
  const { default: App } = await import('./App');
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
