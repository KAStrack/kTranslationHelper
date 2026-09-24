/*
 * Demo settings — the one switch you need to change.
 *
 * backend:
 *   'static' — No server-side code. Works on any static host (GitHub Pages, Netlify, S3 …).
 *              Suggestions are "sent" to static-backend/response.json, which always answers
 *              that nothing was saved.
 *   'php'    — Self-hosted. Suggestions are POSTed to backend/update.php, which writes them
 *              straight into demo/lang/*.json. Run from the project root:
 *                  php -S localhost:8000
 *              then open http://localhost:8000/demo/
 *
 * showKey: show the translation key in the editor (useful for developers).
 */
window.DEMO_CONFIG = {
  backend: 'static',
  showKey: false,
};
