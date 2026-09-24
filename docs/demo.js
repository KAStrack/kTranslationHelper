/*
 * Demo wiring, shared by every demo page (index.html, about.html, contact.html).
 *
 * Everything the plugin needs is in the kTranslationHelper.init() call below; the rest is the
 * demo "app": the language switcher, the activation button, and each page's widgets.
 * Each page says which widgets it wants with <body data-page="…">.
 */
import { i18n, LANGUAGES } from './demo-i18n.js';

const config = { backend: 'static', showKey: false, ...(window.DEMO_CONFIG || {}) };
const usePhp = config.backend === 'php';
const $ = (id) => document.getElementById(id);

/* ----- Page language -------------------------------------------------- */

const storage = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } },
};

// ?lang= wins (and is remembered), so links like index.html?lang=ar work; otherwise the saved choice.
const params = new URLSearchParams(location.search);
let lang = params.get('lang') || storage.get('demo:lang') || 'en';
if (!LANGUAGES.some((l) => l.code === lang)) lang = 'en';
storage.set('demo:lang', lang);

await i18n.loadAll();
i18n.setLanguage(lang);
document.documentElement.classList.remove('loading'); // see the inline script in <head>

const select = $('lang-select');
for (const l of LANGUAGES) {
  select.append(new Option(l.name, l.code, false, l.code === lang));
}
select.addEventListener('change', () => {
  storage.set('demo:lang', select.value);
  const url = new URL(location.href);
  url.searchParams.set('lang', select.value);
  // A full page load: translation mode stays on because the plugin persists its state.
  location.assign(url);
});

/* ----- Backend -------------------------------------------------------- */

// "No backend": a callback instead of a URL, which GETs a static JSON file.
// This works on any static host, where POSTing to a .json file would fail.
async function staticSubmit() {
  const res = await fetch('static-backend/response.json', { cache: 'no-store' });
  return res.json(); // { ok: false, message: "The demo page does not have a backend, …" }
}

/* ----- The plugin ----------------------------------------------------- */

// Translate the plugin's own interface too, when a locale file exists (see uiLocale in demo-i18n.js).
// French has none yet, so the plugin's interface falls back to English there.
let uiStrings = {};
if (LANGUAGES.some((l) => l.code === lang && l.uiLocale)) {
  try {
    const res = await fetch(`dist/locales/${lang}.json`);
    if (res.ok) uiStrings = await res.json();
  } catch (_) { /* fall back to English */ }
}

const toggleBtn = $('kth-toggle');
const syncToggle = (on) => toggleBtn.setAttribute('aria-pressed', String(on));

// The same configuration on every page. Because the plugin remembers that it is active
// (localStorage by default), it switches itself back on as the visitor moves between pages.
const helper = window.kTranslationHelper.init({
  keyAttribute: 'data-i18n',
  attrMapAttribute: 'data-i18n-attr',
  missingAttribute: 'data-i18n-missing',
  defaultLanguage: 'en',
  languages: LANGUAGES,
  trigger: 'shift+click',
  prefill: 'current',
  allowHtml: (el) => el.hasAttribute('data-i18n-html'),
  ignoreSelector: '[data-i18n-ignore]', // example 12: text the plugin must leave alone
  review: !usePhp, // the PHP backend writes suggestions straight into the files, so there is nobody to comment to
  maxLength: 2000, // the same limit as MAX_LENGTH in backend/lib.php
  showKey: !!config.showKey,
  strings: uiStrings,
  uiLanguage: Object.keys(uiStrings).length ? lang : 'en', // French has no locale, so its UI is English

  // Give the editor the raw templates ("Hello {name}") rather than the rendered text.
  getSource: (key, code) => i18n.raw(key, code),

  ...(usePhp ? { submitUrl: 'backend/update.php' } : { submit: staticSubmit }),

  // Apply suggestions ourselves: put them in the demo's dictionary and re-render, so templates show
  // their values. Called for every applied suggestion, whatever language it is in. With the static
  // backend (which always answers "not saved") this still changes the page, until it is reloaded.
  // `text` is what the backend stored when it says so (the PHP backend sanitises HTML).
  updateInPlace: ({ key, lang, text }) => {
    i18n.set(key, lang, text);
    i18n.render();
  },
  onActivate: () => syncToggle(true),
  onDeactivate: () => syncToggle(false),
});
syncToggle(helper.isActive());

// Activation is the app's job: a button and a keyboard shortcut.
toggleBtn.addEventListener('click', () => helper.toggle());
window.addEventListener('keydown', (e) => {
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyT') {
    e.preventDefault();
    helper.toggle();
  }
});

/* ----- Theme switch ---------------------------------------------------- */

// The site's own light/dark switch. The inline script in <head> sets data-theme before the first
// paint; here it is kept up to date and cycled. The plugin (theme: 'auto') follows the page's
// color-scheme, so it switches with the site rather than with the operating system.
const THEMES = ['auto', 'light', 'dark'];
const themeBtn = $('theme-btn');
const darkMq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const pref = storage.get('demo:theme') || 'auto';
  document.documentElement.setAttribute('data-theme', pref === 'auto' ? (darkMq.matches ? 'dark' : 'light') : pref);
  themeBtn.querySelector('span').setAttribute('data-i18n', `header.theme${pref[0].toUpperCase()}${pref.slice(1)}`);
  i18n.render(themeBtn);
}
themeBtn.addEventListener('click', () => {
  const pref = storage.get('demo:theme') || 'auto';
  storage.set('demo:theme', THEMES[(THEMES.indexOf(pref) + 1) % THEMES.length]);
  applyTheme();
});
darkMq.addEventListener('change', applyTheme);
applyTheme();

/* ----- Page widgets --------------------------------------------------- */

const pages = {
  home() {
    // Backend note in the hero
    $('backend-name').textContent = usePhp ? 'PHP' : 'static';
    $('backend-text').setAttribute('data-i18n', usePhp ? 'hero.backendPhp' : 'hero.backendStatic');
    i18n.render($('backend-note'));

    // 2. Basket counter
    let count = 0;
    const counter = $('basket-count');
    $('basket-btn').addEventListener('click', () => {
      count += 1;
      counter.setAttribute('data-i18n-vars', JSON.stringify({ count }));
      i18n.render(counter);
    });

    // 3. Greeting with placeholders
    const greeting = $('greeting');
    $('name-input').addEventListener('input', (e) => {
      const vars = JSON.parse(greeting.getAttribute('data-i18n-vars'));
      vars.name = e.target.value.trim() || '…';
      greeting.setAttribute('data-i18n-vars', JSON.stringify(vars));
      i18n.render(greeting);
    });

    // 7. Dynamic notifications
    let n = 0;
    const notices = $('notices');
    $('notify-btn').addEventListener('click', () => {
      const div = document.createElement('div');
      div.className = 'notice';
      div.setAttribute('data-i18n', `ex.dynamic.n${(n++ % 3) + 1}`);
      notices.prepend(div);
      i18n.render(div);
      while (notices.children.length > 3) notices.lastElementChild.remove();
    });

    // Reset (PHP backend only)
    const resetBtn = $('reset-btn');
    const resetDone = $('reset-done');
    const resetError = $('reset-error');
    resetBtn.hidden = !usePhp;
    resetBtn.addEventListener('click', async () => {
      resetBtn.disabled = true;
      try {
        const res = await fetch('backend/reset.php', { method: 'POST', headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) throw new Error(data.message || `HTTP ${res.status}`);
        await i18n.loadAll();
        i18n.render();
        helper.clearCache();
        resetDone.hidden = false;
        setTimeout(() => { resetDone.hidden = true; }, 3000);
      } catch (err) {
        resetError.textContent = err.message;
        resetError.hidden = false;
        setTimeout(() => { resetError.hidden = true; }, 6000);
      } finally {
        resetBtn.disabled = false;
      }
    });
  },

  about() {
    // Nothing interactive: the page shows placeholders in running text, locale-formatted
    // numbers, and a key (the image's alt text) shared with the home page.
  },

  contact() {
    // A form whose messages only appear after submitting. They are translatable like
    // everything else, and are highlighted as soon as they appear.
    const form = $('contact-form');
    const result = $('form-result');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const message = form.elements.message.value.trim();
      const ok = !!(name && message);
      result.setAttribute('data-i18n', ok ? 'contact.form.sent' : 'contact.form.required');
      result.setAttribute('data-i18n-vars', JSON.stringify({ name }));
      result.className = `form-result ${ok ? 'ok' : 'err'}`;
      result.hidden = false;
      i18n.render(result);
      if (ok) form.reset();
    });
  },
};

pages[document.body.dataset.page]?.();
