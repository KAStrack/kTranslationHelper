/*
 * A deliberately tiny i18n layer that stands in for "your app".
 * kTranslationHelper does not depend on it: the plugin only reads the
 * data-i18n / data-i18n-attr / data-i18n-missing attributes this renders,
 * and (optionally) asks for raw strings through getSource().
 */

// uiLocale: the plugin ships a translation of its own interface in dist/locales/<code>.json.
export const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr', uiLocale: true },
  { code: 'zh-Hans', name: '简体中文', dir: 'ltr', uiLocale: true },
  { code: 'ar', name: 'العربية', dir: 'rtl', uiLocale: true },
  { code: 'fr', name: 'Français', dir: 'ltr' },
];

const KEY = 'data-i18n';
const ATTRS = 'data-i18n-attr';
const MISSING = 'data-i18n-missing';
const HTML = 'data-i18n-html';
const VARS = 'data-i18n-vars';

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch (_) {
    return null;
  }
}

export const i18n = {
  fallback: 'en',
  lang: 'en',
  dicts: {},

  async loadAll() {
    await Promise.all(LANGUAGES.map(async (l) => {
      this.dicts[l.code] = (await fetchJson(`lang/${l.code}.json`)) || {};
    }));
  },

  setLanguage(code) {
    const lang = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
    this.lang = lang.code;
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;
    this.render();
  },

  /** The raw string (template) for key in lang, or null when it has not been translated. */
  raw(key, lang) {
    const d = this.dicts[lang];
    return d && Object.prototype.hasOwnProperty.call(d, key) && d[key] !== '' ? d[key] : null;
  },

  set(key, lang, text) {
    (this.dicts[lang] ||= {})[key] = text;
  },

  lookup(key, lang) {
    const own = this.raw(key, lang);
    if (own != null) return { text: own, missing: false };
    const fb = this.raw(key, this.fallback);
    return { text: fb ?? key, missing: true };
  },

  /** Fill {placeholders}. Numbers are formatted for the language (1,200 · 1.200 · ١٬٢٠٠). */
  format(str, vars, lang = this.lang) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => {
      if (!(k in vars)) return m;
      const v = vars[k];
      return typeof v === 'number' ? new Intl.NumberFormat(lang).format(v) : String(v);
    });
  },

  langOf(el) {
    const n = el.closest('[lang]');
    return (n && n.getAttribute('lang')) || this.lang;
  },

  /** Render every translatable element inside root (default: the whole document). */
  render(root = document) {
    const sel = `[${KEY}],[${ATTRS}]`;
    const els = [...root.querySelectorAll(sel)];
    if (root instanceof Element && root.matches(sel)) els.unshift(root);
    for (const el of els) {
      const lang = this.langOf(el);
      const key = el.getAttribute(KEY);
      if (key) {
        const { text, missing } = this.lookup(key, lang);
        let vars = null;
        try { vars = el.hasAttribute(VARS) ? JSON.parse(el.getAttribute(VARS)) : null; } catch (_) { vars = null; }
        const out = this.format(text, vars, lang);
        // Only elements that opt in with data-i18n-html are rendered as HTML.
        if (el.hasAttribute(HTML)) el.innerHTML = out;
        else el.textContent = out;
        el.toggleAttribute(MISSING, missing);
      }
      const map = el.getAttribute(ATTRS);
      if (map) {
        // "attr:key; attr:key" — parsed like the plugin does it: first colon, pairs separated by ; or ,
        for (const part of map.split(/[;,]/)) {
          const i = part.indexOf(':');
          const attr = part.slice(0, i).trim();
          const k = part.slice(i + 1).trim();
          if (i > 0 && attr && k) el.setAttribute(attr, this.lookup(k, lang).text);
        }
      }
    }
  },
};
