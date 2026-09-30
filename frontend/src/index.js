import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts/fonts.css';
import './index.css';
import App from './App';

// Mesure d'audience Umami : chargée seulement si les deux variables sont définies (onglet Environment de Dokploy)
const UMAMI_URL = process.env.REACT_APP_UMAMI_URL;
const UMAMI_WEBSITE_ID = process.env.REACT_APP_UMAMI_WEBSITE_ID;

if (UMAMI_URL && UMAMI_WEBSITE_ID) {
  // Aucune donnée envoyée depuis l'espace admin
  window.umamiBeforeSend = (type, payload) => {
    const path = new URL(payload.url, window.location.origin).pathname;
    return path === '/admin' || path.startsWith('/admin/') ? null : payload;
  };
  const script = document.createElement('script');
  script.defer = true;
  script.src = `${UMAMI_URL.replace(/\/$/, '')}/script.js`;
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  // Seul le site en ligne est compté, pas le développement local
  script.dataset.domains = 'deuxpasunmonde.fr,www.deuxpasunmonde.fr';
  script.dataset.beforeSend = 'umamiBeforeSend';
  document.head.appendChild(script);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
