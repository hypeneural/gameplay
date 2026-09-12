import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { themeCssVariables } from '@christmas-games/theme';
import { App } from './app/App.js';
import './styles.css';
import './shell.css';
import './christmas-magic.css';
import './crystal-controls.css';
import './magic-photo.css';

const preloadRecoveryKey = 'christmas-games:preload-recovery';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (sessionStorage.getItem(preloadRecoveryKey)) {
    console.error('A dynamic game chunk could not be recovered after one reload.', event.payload);
    return;
  }
  sessionStorage.setItem(preloadRecoveryKey, '1');
  window.location.reload();
});
window.setTimeout(() => sessionStorage.removeItem(preloadRecoveryKey), 10_000);

const root = document.querySelector<HTMLDivElement>('#root');
if (!root) {
  throw new Error('Root element was not found.');
}

const themeStyle = document.createElement('style');
themeStyle.textContent = themeCssVariables;
document.head.append(themeStyle);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
