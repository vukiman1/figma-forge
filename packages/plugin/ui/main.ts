import { createApp } from 'vue';

import App from './App.vue';

import './style.css';

const FATAL_STYLE =
  'color:#f24822;font:11px/1.5 monospace;padding:8px;margin:0;white-space:pre-wrap;word-break:break-word';

const showFatal = (message: string): void => {
  const root = document.getElementById('app');
  if (root === null) return;
  root.textContent = message;
  root.setAttribute('style', FATAL_STYLE);
};

const describeFailure = (err: unknown): string =>
  err instanceof Error ? (err.stack ?? err.message) : String(err);

globalThis.addEventListener('error', e => showFatal(`error: ${e.message}`));
globalThis.addEventListener('unhandledrejection', e => showFatal(`rejection: ${String(e.reason)}`));

try {
  const app = createApp(App);
  app.config.errorHandler = err => showFatal(describeFailure(err));
  app.mount('#app');
} catch (err) {
  showFatal(describeFailure(err));
}
