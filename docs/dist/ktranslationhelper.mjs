/*!
 * kTranslationHelper v0.1.2
 * Let users flag and fix missing or incorrect translations on multi-language sites.
 * MIT License
 */

const VERSION = '0.1.2';

/* ------------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------------ */

const RTL_LANGS = new Set([
  'ar', 'arc', 'ckb', 'dv', 'fa', 'he', 'iw', 'khw', 'ks', 'ps', 'sd', 'syr', 'ug', 'ur', 'yi',
]);

const DEFAULT_STRINGS = {
  // Instruction bubble. {keys} is replaced with the trigger's modifier keys, e.g. "Shift".
  message: 'Hold {keys} and click any highlighted text to suggest a translation.',
  messageClick: 'Click any highlighted text to suggest a translation.',
  messageTouch: 'Press and hold any highlighted text to suggest a translation.',
  messageHotkey: 'You can also focus some text and press {keys}.',
  gotIt: 'Got it',

  // Floating badge
  badge: 'Translation mode',
  badgeMissing: '{count} missing',
  modeOn: 'Translation mode is on.', // announced to screen readers (visually hidden)
  modeOff: 'Translation mode is off.',
  pick: 'Pick text',
  pickHint: 'Click the text you want to translate. Press Esc to cancel.',
  list: 'All text',
  exit: 'Exit',

  // Editor dialog
  title: 'Suggest a translation',
  key: 'Key',
  which: 'Text to translate',
  whichText: 'Text',
  whichParent: 'Surrounding element',
  current: 'Current text ({lang})',
  original: 'Original ({lang})',
  existing: 'Existing {lang} translation',
  noExisting: 'There is no {lang} translation yet.',
  fallbackNotice: 'This text has not been translated into {lang} yet, so a fallback is shown.',
  targetLang: 'Translate to',
  otherLangNotice: 'You are translating into {target}, not the page language ({page}).',
  usePageLang: 'Switch to {page}',
  proposal: 'Your translation',
  htmlAllowed: 'HTML formatting is allowed.',
  comment: 'Comment (optional)',
  commentPlaceholder: 'Anything a reviewer should know?',
  missingPlaceholders: 'Your text is missing these placeholders: {list}',
  charCount: '{count} / {max}',
  tooLong: 'Please shorten the text to {max} characters.',
  draftRestored: 'Your unsent draft has been restored.',
  discardDraft: 'Discard',
  alreadySuggested: 'You have already suggested a translation for this text.',
  unchanged: 'The text has not been changed.',
  empty: 'Please enter a translation.',
  cancel: 'Cancel',
  submit: 'Submit for review', // button label with review: true
  submitting: 'Sending…',
  save: 'Save', // … with review: false
  saving: 'Saving…',
  apply: 'Apply', // … in local mode (nothing is sent or saved)
  success: 'Thank you! Your suggestion has been sent.',
  localApplied: 'Applied to this page only. It will be lost when the page is reloaded.',
  error: 'Sorry, your suggestion could not be sent.',
  nextMissing: 'Next missing ({count})',
  close: 'Close',

  // List dialog
  listTitle: 'Translatable text on this page',
  listFilter: 'Filter…',
  listMissingOnly: 'Missing only',
  listEmpty: 'No translatable text found.',
  listMissing: 'missing',
  listHidden: 'hidden',
  listSuggested: 'suggested',

  // Help dialog. Sentences are picked to match the configuration; see _helpItems().
  help: 'Help',
  helpTitle: 'How translation mode works',
  helpLegend: 'Legend',
  legendText: 'Translatable text',
  legendHover: 'Solid outline: the text under the pointer',
  legendMissing: 'Not translated yet; a fallback is shown',
  legendSuggested: 'You have already suggested a translation for it (this session)',
  helpHow: 'How it works',
  helpPick: '"{pick}" opens the next text you click or tap.',
  helpList: '"{list}" lists every text on this page, including text that cannot be clicked, with a filter.',
  helpMissing: 'The badge shows how many texts on this page are not translated yet. After filling one in, "Next missing" takes you to the next.',
  helpEditor: 'In the editor, correct the text in the page language, or choose another language and translate it.',
  helpEditorPageOnly: 'In the editor, correct the text. Only the page language can be edited here.',
  helpPlaceholders: 'Keep placeholders such as {example} exactly as they are; the app fills them in.',
  helpPlaceholdersGeneric: 'Keep placeholders exactly as they are; the app fills them in.',
  helpHtml: 'Some texts allow HTML formatting; the editor says so.',
  helpDrafts: 'If you close the editor without sending, your edit is kept until the page is reloaded.',
  helpLocal: 'Suggestions are not sent anywhere: they change this page only, until it is reloaded.',
  helpApplyAlways: 'Suggestions are sent for review; this page shows your change straight away.',
  helpApplySuccess: 'Suggestions are sent for review; this page shows your change once it has been accepted.',
  helpApplyNever: 'Suggestions are sent for review; this page keeps its current text.',
  helpSavedAlways: 'Suggestions are saved straight away, and this page shows your change.',
  helpSavedSuccess: 'Suggestions are saved straight away; this page shows your change once it has been saved.',
  helpSavedNever: 'Suggestions are saved straight away; reload the page to see them.',
  helpExit: '"{exit}" turns translation mode off. Until then it stays on as you move around the site.',
  helpExitNoPersist: '"{exit}" turns translation mode off.',
};

const DEFAULTS = {
  // --- What is translatable ------------------------------------------------
  keyAttribute: null, // REQUIRED. Attribute holding the translation key, e.g. 'data-i18n'.
  attrMapAttribute: null, // Optional. e.g. 'data-i18n-attr' with value "placeholder:form.email; title:form.tip".
  missingAttribute: null, // Optional. Attribute your app sets when it rendered a fallback, e.g. 'data-i18n-missing'.
  ignoreSelector: null, // Optional. Elements matching this (or inside one) are left alone, e.g. '[data-i18n-ignore]'.
  canEdit: null, // Optional. (element, key, attribute) => boolean, to exclude individual strings.
  allowUrlAttributes: false, // Offer URL attributes (href, src, action …) from attrMapAttribute for editing. Most translators shouldn't see them.

  // --- Languages -----------------------------------------------------------
  defaultLanguage: null, // REQUIRED. Language present on the page when nothing else says otherwise.
  langAttribute: null, // Optional. Attribute holding the language of an element (searched on ancestors too).
  useLangAttribute: true, // Fall back to the nearest standard `lang` attribute.
  sourceLanguage: null, // Optional. Language your strings are authored in (shown as "Original"). Defaults to defaultLanguage.
  languages: null, // Optional. ['en', 'es'] or [{ code: 'ar', name: 'العربية', dir: 'rtl' }].
  rememberLanguage: true, // Remember the last language translated into.

  // --- Interaction ---------------------------------------------------------
  trigger: 'shift+click', // 'shift+click', 'alt+click', 'mod+click', 'click', … or (event) => boolean
  hotkey: 'shift+f2', // Opens the editor for the focused (or hovered) text. 'mod+shift+e', … or false.
  longPress: true, // Press-and-hold on touch screens opens the editor.
  longPressDelay: 550,
  message: null, // Overrides the instruction message text.
  showMessage: 'session', // 'always' | 'session' | 'once' | false

  // --- Editor --------------------------------------------------------------
  prefill: 'current', // 'current' | 'blank' | 'target' | (context) => string
  allowHtml: false, // true | false | (element, key) => boolean
  showKey: false,
  review: true, // Suggestions go to a reviewer. false: your backend applies them directly (no comment box).
  showComment: true, // Optional comment for the reviewer; only shown when review is true.
  placeholderPattern: /\{\{?\s*[\w.-]+\s*\}\}?|%(?:\d+\$)?[sdif]/g, // or null to disable checks
  maxLength: null, // Show a character counter and refuse longer suggestions (counted in code points).
  getSource: null, // async (key, lang) => string | null — raw strings (templates) from your app

  // --- Submitting ----------------------------------------------------------
  submitUrl: null, // URL that receives suggestions …
  submit: null, // … or async (payload) => ({ ok, message }). Neither: "local mode", the page is changed and nothing is sent.
  method: 'POST',
  encoding: 'json', // 'json' | 'form'
  headers: null, // object or async (payload) => object, e.g. for CSRF tokens
  credentials: 'same-origin',
  buildPayload: null, // (payload, context) => payload
  updateInPlace: 'always', // 'always' | 'success' (true) | false | (context) => void
  suggestedAttribute: 'data-kth-suggested', // Set on text the visitor has suggested this session; null to disable.
  closeDelay: 1200, // ms to show the success message before closing (0 = stay open)

  // --- Persistence ---------------------------------------------------------
  persist: 'localStorage', // 'localStorage' | 'sessionStorage' | 'cookie' | false
  storageKey: 'kTranslationHelper',
  cookieDays: null, // cookie persistence only; null = session cookie
  autoActivate: true, // Re-activate on page load when it was active before.

  // --- Chrome --------------------------------------------------------------
  showBadge: true,
  showPick: true,
  showList: true,
  showHelp: true, // "Help" on the badge: a legend and how it works, matching this configuration.
  strings: {},
  uiLanguage: 'en', // Language of `strings` (BCP 47), so screen readers pronounce the interface correctly.
  theme: 'auto', // 'auto' (follows <html>'s color-scheme, then the OS setting) | 'light' | 'dark'
  zIndex: 2147483000,
  nonce: null, // CSP nonce for the plugin's <style> elements. Defaults to the nonce of the <script> that loaded it.

  // --- Events --------------------------------------------------------------
  onActivate: null,
  onDeactivate: null,
  onOpen: null,
  onClose: null,
  onBeforeSubmit: null, // (payload) => false to cancel
  onSubmit: null, // (result, payload) => void
  onError: null, // (error | result, payload) => void
};

/* ------------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------------ */

const IS_MAC = typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');

// The CSP nonce of the <script> that loaded the classic build (null for modules), reused for the styles.
const SCRIPT_NONCE = typeof document !== 'undefined' && document.currentScript ? (document.currentScript.nonce || '') : '';

function fmt(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m));
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value') el.value = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

function attrSel(name, value) {
  return value == null ? `[${CSS.escape(name)}]` : `[${CSS.escape(name)}="${CSS.escape(value)}"]`;
}

function normWs(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function primary(code) {
  return String(code || '').toLowerCase().split(/[-_]/)[0];
}

function sameLang(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

/**
 * Same language, allowing a bare tag to stand for its variants: 'en' matches 'en-GB'. Two tagged
 * variants never match each other ('zh-Hans' is not 'zh-Hant', 'pt-BR' is not 'pt-PT').
 */
function looseLang(a, b) {
  if (sameLang(a, b)) return true;
  if (primary(a) !== primary(b)) return false;
  return !/[-_]/.test(String(a || '')) || !/[-_]/.test(String(b || ''));
}

/*
 * Attributes whose value is code, not text, are never offered for editing or written to the page,
 * however the markup maps them. URL attributes are only offered with allowUrlAttributes, and even
 * then a value with a script scheme is not applied to the page. The backend must still validate
 * every attribute value it stores.
 */
const BLOCKED_ATTRS = new Set(['style', 'srcdoc', 'formaction', 'is']);
const URL_ATTRS = new Set(['href', 'src', 'action', 'xlink:href', 'poster', 'data', 'ping', 'cite', 'background',
  'codebase', 'longdesc', 'manifest', 'usemap']);

function editableAttr(name, allowUrl) {
  const n = String(name).toLowerCase();
  return !n.startsWith('on') && !BLOCKED_ATTRS.has(n) && (allowUrl || !URL_ATTRS.has(n));
}

/** False for a URL attribute whose value would run script (javascript:, data:, vbscript:). */
function safeAttrValue(name, value) {
  if (!URL_ATTRS.has(String(name).toLowerCase())) return true;
  return !/^(javascript|data|vbscript):/i.test(String(value).replace(/[\u0000-\u0020\u007f-\u009f]/g, ''));
}

function parseAttrMap(value, allowUrl = false) {
  if (!value) return [];
  return value.split(/[;,]/).map((part) => {
    const i = part.indexOf(':');
    if (i < 1) return null;
    const attr = part.slice(0, i).trim();
    const key = part.slice(i + 1).trim();
    return attr && key && editableAttr(attr, allowUrl) ? { attr, key } : null;
  }).filter(Boolean);
}

const MOD_NAMES = {
  shift: 'shift', alt: 'alt', option: 'alt', opt: 'alt', ctrl: 'ctrl', control: 'ctrl',
  meta: 'meta', cmd: 'meta', command: 'meta', win: 'meta', mod: IS_MAC ? 'meta' : 'ctrl',
};
const MODS = ['shift', 'alt', 'ctrl', 'meta'];

function parseTrigger(trigger) {
  if (typeof trigger === 'function') return { fn: trigger, mods: [] };
  const parts = String(trigger || 'shift+click').toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
  const mods = [...new Set(parts.filter((p) => p !== 'click').map((p) => {
    if (!MOD_NAMES[p]) throw new Error(`kTranslationHelper: unknown trigger modifier "${p}"`);
    return MOD_NAMES[p];
  }))];
  return { fn: null, mods };
}

/** 'shift+f2' → { mods: ['shift'], key: 'f2' }; null when disabled. */
function parseHotkey(hotkey) {
  if (!hotkey) return null;
  const parts = String(hotkey).toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
  const key = parts.pop();
  if (!key || MOD_NAMES[key]) throw new Error(`kTranslationHelper: hotkey "${hotkey}" needs a key after the modifiers.`);
  const mods = [...new Set(parts.map((p) => {
    if (!MOD_NAMES[p]) throw new Error(`kTranslationHelper: unknown hotkey modifier "${p}"`);
    return MOD_NAMES[p];
  }))];
  return { mods, key };
}

/** True when the event's modifier keys are exactly `mods`. */
function modsMatch(e, mods) {
  return MODS.every((m) => mods.includes(m) === !!e[`${m}Key`]);
}

function keyLabel(mod) {
  if (mod === 'alt') return IS_MAC ? 'Option' : 'Alt';
  if (mod === 'meta') return IS_MAC ? 'Cmd' : 'Win';
  if (mod === 'ctrl') return 'Ctrl';
  return 'Shift';
}

function hotkeyLabel(hk) {
  const key = hk.key.length === 1 ? hk.key.toUpperCase() : hk.key.charAt(0).toUpperCase() + hk.key.slice(1);
  return [...hk.mods.map(keyLabel), key].join(' + ');
}

/** Number of characters as a person would count them (code points), matching PHP's mb_strlen. */
function charCount(text) {
  return [...String(text || '')].length;
}

/** The page's effective text direction ('ltr' or 'rtl'), however it was set. */
function pageDir() {
  try {
    return getComputedStyle(document.documentElement).direction === 'rtl' ? 'rtl' : 'ltr';
  } catch (_) {
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
  }
}

/**
 * Close a <dialog> when its backdrop is clicked — but only when the click both started and ended
 * there. A click on the dialog's own scrollbar, or a text selection that starts in a field and is
 * released over the backdrop, also targets the dialog element and must not close it.
 */
function closeOnBackdrop(dlg) {
  const outside = (e) => {
    const r = dlg.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  let armed = false;
  dlg.addEventListener('pointerdown', (e) => { armed = e.target === dlg && outside(e); });
  dlg.addEventListener('click', (e) => {
    if (armed && e.target === dlg && outside(e)) dlg.close();
    armed = false;
  });
}

/** The name of a language, in itself by default ("Deutsch") or in `inLang` ("German" for 'en'). */
function languageName(code, inLang = code) {
  try {
    const name = new Intl.DisplayNames([inLang], { type: 'language' }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(inLang) + name.slice(1);
  } catch (_) { /* ignore */ }
  return null;
}

function makeStore(kind, prefix, cookieDays) {
  const full = (k) => `${prefix}:${k}`;
  const area = () => (kind === 'sessionStorage' ? window.sessionStorage : window.localStorage);
  return {
    get(k) {
      try {
        if (!kind) return null;
        if (kind === 'cookie') {
          const name = encodeURIComponent(full(k)) + '=';
          const hit = document.cookie.split('; ').find((c) => c.startsWith(name));
          return hit ? decodeURIComponent(hit.slice(name.length)) : null;
        }
        return area().getItem(full(k));
      } catch (_) { return null; }
    },
    set(k, v) {
      try {
        if (!kind) return;
        if (kind === 'cookie') {
          let c = `${encodeURIComponent(full(k))}=${encodeURIComponent(v)}; path=/; SameSite=Lax`;
          if (cookieDays) c += `; max-age=${Math.round(cookieDays * 86400)}`;
          if (location.protocol === 'https:') c += '; Secure';
          document.cookie = c;
          return;
        }
        area().setItem(full(k), v);
      } catch (_) { /* storage unavailable */ }
    },
    remove(k) {
      try {
        if (!kind) return;
        if (kind === 'cookie') {
          document.cookie = `${encodeURIComponent(full(k))}=; path=/; max-age=0; SameSite=Lax`;
          return;
        }
        area().removeItem(full(k));
      } catch (_) { /* storage unavailable */ }
    },
  };
}

function isVisible(el) {
  if (!el.isConnected) return false;
  if (el.closest('head')) return false;
  if (typeof el.checkVisibility === 'function') return el.checkVisibility();
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/* ------------------------------------------------------------------------ *
 * Shadow DOM styles for the plugin's own UI
 * ------------------------------------------------------------------------ */

const UI_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.root {
  --a: var(--kth-accent, #2563eb);
  --a-fg: var(--kth-accent-text, #fff);
  --bg: var(--kth-bg, #fff);
  --fg: var(--kth-text, #1f2328);
  --muted: var(--kth-muted, #59636e);
  --line: var(--kth-border, #d1d9e0);
  --soft: var(--kth-soft, #f6f8fa);
  --warn-bg: var(--kth-warn-bg, #fff8c5);
  --warn-fg: var(--kth-warn-text, #6b4f00);
  --err: var(--kth-error, #cf222e);
  --ok: var(--kth-success, #1a7f37);
  --missing: var(--kth-missing, #e11d48);
  --suggested: var(--kth-suggested, #15803d);
  font: 14px/1.45 var(--kth-font, system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif);
  color: var(--fg);
}
.root[data-theme="dark"] {
  --bg: var(--kth-bg, #1f2328);
  --fg: var(--kth-text, #e6edf3);
  --muted: var(--kth-muted, #9198a1);
  --line: var(--kth-border, #3d444d);
  --soft: var(--kth-soft, #2a3038);
  --warn-bg: var(--kth-warn-bg, #3b2e00);
  --warn-fg: var(--kth-warn-text, #f2cc60);
  --err: var(--kth-error, #ff7b72);
  --ok: var(--kth-success, #3fb950);
  --a: var(--kth-accent, #4c8dff);
  --a-fg: var(--kth-accent-text, #0b1220);
  --missing: var(--kth-missing, #ff7a95);
  --suggested: var(--kth-suggested, #3fb950);
  color-scheme: dark;
}
.root[data-theme="light"] { color-scheme: light; }
button { font: inherit; cursor: pointer; }
.bar {
  position: fixed; inset-block-end: 16px; inset-inline-end: 16px; z-index: var(--z);
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px; max-width: calc(100vw - 32px);
}
.badge {
  display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 4px; max-width: 100%; padding: 4px 4px 4px 12px;
  background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0,0,0,.14);
}
.badge .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--kth-highlight, #cf6a00); flex: none; }
.badge .label { font-weight: 600; margin-inline: 4px 6px; white-space: nowrap; }
.badge .count { font-size: 12px; margin-inline-end: 6px; white-space: nowrap; }
.badge button {
  border: 0; background: transparent; color: var(--fg); padding: 5px 10px; border-radius: 999px; white-space: nowrap;
}
.badge button:hover { background: var(--soft); }
.badge button.exit { background: var(--soft); }
.badge button[aria-pressed="true"] { background: var(--a); color: var(--a-fg); }
.bubble, .toast {
  background: var(--bg); color: var(--fg); border: 1px solid var(--line); border-radius: 10px;
  padding: 10px 12px; box-shadow: 0 4px 16px rgba(0,0,0,.14); max-width: 340px;
}
.bubble { display: flex; gap: 10px; align-items: center; }
.bubble button { border: 0; background: var(--a); color: var(--a-fg); padding: 5px 10px; border-radius: 6px; flex: none; }
.toast.ok { border-color: var(--ok); }
.toast.err { border-color: var(--err); }
/* Live regions stay in the accessibility tree while empty (display: none would silence them). */
.toast:empty { height: 0; padding: 0; border: 0; box-shadow: none; overflow: hidden; margin-block-start: -8px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
[hidden] { display: none !important; }

dialog {
  width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); padding: 0; overflow: auto;
  border: 1px solid var(--line); border-radius: 12px; background: var(--bg); color: var(--fg);
  box-shadow: 0 12px 40px rgba(0,0,0,.25);
}
dialog::backdrop { background: rgba(15, 20, 25, .45); }
.dlg { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 14px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h2 { margin: 0; font-size: 17px; font-weight: 650; }
.x { border: 0; background: transparent; color: var(--muted); font-size: 22px; line-height: 1; padding: 2px 6px; border-radius: 6px; }
.x:hover { background: var(--soft); color: var(--fg); }
.field { display: flex; flex-direction: column; gap: 5px; }
.lbl { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: none; }
.ref {
  background: var(--soft); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px;
  white-space: pre-wrap; overflow-wrap: anywhere; max-height: 9em; overflow: auto;
}
.ref.none { color: var(--muted); font-style: italic; }
.key { font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--muted); overflow-wrap: anywhere; }
select, textarea, input[type="text"], input[type="search"] {
  font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 8px;
  padding: 8px 10px; width: 100%;
}
textarea { min-height: 96px; resize: vertical; }
textarea.comment { min-height: 48px; }
select:focus-visible, textarea:focus-visible, input:focus-visible, button:focus-visible {
  outline: 2px solid var(--a); outline-offset: 1px;
}
.notice { background: var(--warn-bg); color: var(--warn-fg); border-radius: 8px; padding: 8px 10px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.notice button { border: 1px solid currentColor; background: transparent; color: inherit; border-radius: 6px; padding: 3px 9px; }
.hint { font-size: 12px; color: var(--muted); }
.warn { font-size: 12px; color: var(--warn-fg); background: var(--warn-bg); border-radius: 6px; padding: 4px 8px; }
.warn:empty { height: 0; padding: 0; overflow: hidden; margin-block-start: -5px; }
.status { font-weight: 500; }
.status:empty { height: 0; overflow: hidden; margin-block-start: -14px; }
.status.ok { color: var(--ok); }
.status.err { color: var(--err); }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn { border: 1px solid var(--line); background: var(--bg); color: var(--fg); border-radius: 8px; padding: 8px 16px; }
.btn:hover { background: var(--soft); }
.btn.primary { background: var(--a); border-color: var(--a); color: var(--a-fg); font-weight: 600; }
.btn.primary:hover { filter: brightness(1.08); }
.btn:disabled { opacity: .6; cursor: default; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 60vh; overflow: auto; }
.list button {
  width: 100%; text-align: start; border: 0; background: transparent; color: var(--fg); padding: 8px 10px; border-radius: 8px;
  display: flex; flex-direction: column; gap: 2px;
}
.list button:hover, .list button:focus-visible { background: var(--soft); }
.list .row-text { overflow-wrap: anywhere; }
.list .meta { display: flex; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--muted); }
.tag { border: 1px solid var(--line); border-radius: 999px; padding: 0 7px; }
.tag.missing { color: var(--missing); border-color: currentColor; }
.tag.suggested { color: var(--suggested); border-color: currentColor; }
.tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.tools input[type="search"] { flex: 1 1 160px; width: auto; }
.tools label { display: flex; gap: 6px; align-items: center; font-size: 13px; white-space: nowrap; }
.meta-row { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: baseline; }
.draft { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.draft button, .link-btn { border: 0; background: transparent; color: var(--a); padding: 0; text-decoration: underline; font-size: 12px; }
.actions .btn.next { margin-inline-end: auto; }
h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--muted); }
.legend, .steps { margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.legend { list-style: none; }
.legend li { display: flex; gap: 12px; align-items: center; }
.swatch {
  flex: none; width: 34px; height: 16px; margin: 3px 4px; border-radius: 3px; background: var(--soft);
  outline: 2px dashed var(--kth-highlight, #cf6a00); outline-offset: 2px;
}
.swatch.solid { outline-style: solid; box-shadow: 0 0 0 5px var(--kth-highlight-ring, rgba(207, 106, 0, .22)); }
.swatch.missing { outline: 3px dotted var(--kth-missing, #e11d48); }
.swatch.suggested { outline: 4px double var(--kth-suggested, #16a34a); }
.steps { padding-inline-start: 20px; }
`;

/* ------------------------------------------------------------------------ *
 * The helper
 * ------------------------------------------------------------------------ */

let instanceCount = 0;

class TranslationHelper {
  constructor(options = {}) {
    const cfg = { ...DEFAULTS, ...options };
    if (!cfg.keyAttribute) throw new Error('kTranslationHelper: "keyAttribute" is required.');
    if (!cfg.defaultLanguage) throw new Error('kTranslationHelper: "defaultLanguage" is required.');
    if (cfg.updateInPlace === true) cfg.updateInPlace = 'success';
    if (/^(get|head)$/i.test(String(cfg.method))) throw new Error('kTranslationHelper: "method" must allow a request body; GET and HEAD do not.');
    this.config = cfg;
    this.strings = { ...DEFAULT_STRINGS, ...(cfg.strings || {}) };
    this.id = ++instanceCount;
    this._trigger = parseTrigger(cfg.trigger);
    this._hotkey = parseHotkey(cfg.hotkey);
    this._active = false;
    this._picking = false;
    this._cache = new Map();
    this._drafts = new Map(); // unsent edits, per language + key + attribute, for this page load
    this._names = new Map(); // Intl.DisplayNames per display language
    this._store = makeStore(cfg.persist, cfg.storageKey, cfg.cookieDays);
    this._prefs = makeStore('localStorage', cfg.storageKey);
    this._session = makeStore('sessionStorage', cfg.storageKey);
    this._selector = [
      attrSel(cfg.keyAttribute),
      cfg.attrMapAttribute ? attrSel(cfg.attrMapAttribute) : null,
    ].filter(Boolean).join(',');

    this._languages = this._normaliseLanguages(cfg.languages);
    this._bound = {
      click: (e) => this._onClick(e),
      mousedown: (e) => this._onMouseDown(e),
      pointerdown: (e) => this._onPointerDown(e),
      pointermove: (e) => this._onPointerMove(e),
      pointerup: () => this._cancelLongPress(),
      contextmenu: (e) => this._onContextMenu(e),
      keydown: (e) => this._onKey(e, true),
      keyup: (e) => this._onKey(e, false),
      blur: () => document.documentElement.classList.remove('kth-mod'),
    };

    this._injectPageStyles();
    this._buildUI();

    if (cfg.autoActivate && this._store.get('active') === '1') {
      this.activate({ auto: true });
    }
  }

  /* ---------------------------- public API ------------------------------ */

  isActive() { return this._active; }

  activate({ auto = false } = {}) {
    if (this._active) return this;
    this._active = true;
    const root = document.documentElement;
    root.classList.add('kth-active');
    this._store.set('active', '1');
    const opts = { capture: true };
    document.addEventListener('click', this._bound.click, opts);
    document.addEventListener('mousedown', this._bound.mousedown, opts);
    document.addEventListener('pointerdown', this._bound.pointerdown, opts);
    document.addEventListener('pointermove', this._bound.pointermove, opts);
    document.addEventListener('pointerup', this._bound.pointerup, opts);
    document.addEventListener('pointercancel', this._bound.pointerup, opts);
    document.addEventListener('contextmenu', this._bound.contextmenu, opts);
    window.addEventListener('keydown', this._bound.keydown, opts);
    window.addEventListener('keyup', this._bound.keyup, opts);
    window.addEventListener('blur', this._bound.blur);
    this._ui.root.dir = pageDir();
    this._applyTheme();
    this._ui.bar.hidden = false;
    this._markSuggested();
    this._updateMissingCount();
    this._maybeShowMessage(auto);
    this._announce(this.strings.modeOn + (this._ui.bubble.hidden ? '' : ' ' + this._ui.bubbleText.textContent));
    this._emit('onActivate', { auto });
    return this;
  }

  deactivate() {
    if (!this._active) return this;
    this._active = false;
    this._setPicking(false);
    this._cancelLongPress();
    const root = document.documentElement;
    root.classList.remove('kth-active', 'kth-mod', 'kth-picking');
    this._store.remove('active');
    const opts = { capture: true };
    document.removeEventListener('click', this._bound.click, opts);
    document.removeEventListener('mousedown', this._bound.mousedown, opts);
    document.removeEventListener('pointerdown', this._bound.pointerdown, opts);
    document.removeEventListener('pointermove', this._bound.pointermove, opts);
    document.removeEventListener('pointerup', this._bound.pointerup, opts);
    document.removeEventListener('pointercancel', this._bound.pointerup, opts);
    document.removeEventListener('contextmenu', this._bound.contextmenu, opts);
    window.removeEventListener('keydown', this._bound.keydown, opts);
    window.removeEventListener('keyup', this._bound.keyup, opts);
    window.removeEventListener('blur', this._bound.blur);
    this._ui.bar.hidden = true;
    this._ui.bubble.hidden = true; // whether it shows again is decided by showMessage on the next activate()
    this._ui.toast.textContent = '';
    clearTimeout(this._toastTimer);
    this.close();
    if (this._ui.listDlg.open) this._ui.listDlg.close();
    if (this._ui.helpDlg.open) this._ui.helpDlg.close();
    this._announce(this.strings.modeOff);
    this._emit('onDeactivate', {});
    return this;
  }

  toggle(force) {
    const on = typeof force === 'boolean' ? force : !this._active;
    return on ? this.activate() : this.deactivate();
  }

  /** Arm "pick" mode: the next click on translatable text opens the editor. */
  pick() {
    if (!this._active) this.activate();
    this._setPicking(true);
    return this;
  }

  /** Open the editor for an element, or for { key, attribute?, element? }. */
  open(target) {
    if (!target) return this;
    let targets;
    if (target instanceof Element) {
      targets = this._collectTargets(target);
    } else {
      if (!target.key) return this;
      // el is null when the key isn't on the page; the editor then starts from getSource or empty text.
      const el = target.element || this._findElement(target.key, target.attribute || null);
      targets = [{ el, key: target.key, attr: target.attribute || null, parent: false }];
    }
    if (targets.length) this._openEditor(targets);
    return this;
  }

  /** Show the list of all translatable text on the page. */
  list() {
    if (!this._active) this.activate();
    this._openList();
    return this;
  }

  /** Show the help dialog: the legend and how translation mode works with this configuration. */
  help() {
    if (!this._active) this.activate();
    this._openHelp();
    return this;
  }

  close() {
    if (this._ui && this._ui.dlg.open) this._ui.dlg.close();
    return this;
  }

  /** Forget cached strings from getSource (e.g. after your app reloads translations). */
  clearCache() { this._cache.clear(); return this; }

  destroy() {
    this.deactivate();
    this._store.remove('active');
    clearTimeout(this._toastTimer);
    this._openToken = (this._openToken || 0) + 1; // abandon an editor that is still loading
    this._unwatchTheme();
    if (this._host) this._host.remove();
    if (this._pageStyle) this._pageStyle.remove();
    this._host = this._pageStyle = this._ui = this._state = null;
  }

  /* ---------------------------- setup ---------------------------------- */

  _normaliseLanguages(list) {
    if (!Array.isArray(list) || !list.length) return [];
    return list.map((l) => {
      const o = typeof l === 'string' ? { code: l } : { ...l };
      if (!o.code) throw new Error('kTranslationHelper: every language needs a "code".');
      o.name = o.name || languageName(o.code) || o.code;
      o.dir = o.dir || (RTL_LANGS.has(primary(o.code)) ? 'rtl' : 'ltr');
      return o;
    });
  }

  _lang(code) {
    const exact = this._languages.find((l) => sameLang(l.code, code));
    if (exact) return exact;
    const loose = this._languages.find((l) => looseLang(l.code, code));
    if (loose) return loose;
    return { code, name: languageName(code) || code, dir: RTL_LANGS.has(primary(code)) ? 'rtl' : 'ltr' };
  }

  /** A language's name as the visitor reads the page: "Alemán" on a Spanish page; falls back to the autonym. */
  _localName(l, inLang) {
    const ck = `${inLang}\u0000${l.code}`;
    if (!this._names.has(ck)) this._names.set(ck, languageName(l.code, inLang) || l.name);
    return this._names.get(ck);
  }

  /** Option label: "Alemán (Deutsch)", or just one name when they are the same. */
  _langLabel(l, inLang) {
    const local = this._localName(l, inLang);
    return local === l.name ? `${l.name} (${l.code})` : `${local} (${l.name})`;
  }

  _injectPageStyles() {
    const c = this.config;
    // Ignored elements (and everything inside them) get no highlighting.
    const sel = c.ignoreSelector
      ? `:is(${this._selector}):not(:is(${c.ignoreSelector}), :is(${c.ignoreSelector}) *)`
      : `:is(${this._selector})`;
    // Missing and suggested text differ in outline style as well as colour, for colour-blind visitors.
    const missing = c.missingAttribute ? `html.kth-active ${sel}${attrSel(c.missingAttribute)} {
  outline: 3px dotted var(--kth-missing, #e11d48) !important;
}` : '';
    const suggested = c.suggestedAttribute ? `html.kth-active ${sel}${attrSel(c.suggestedAttribute)} {
  outline: 4px double var(--kth-suggested, #16a34a) !important;
}` : '';
    const style = document.createElement('style');
    style.setAttribute('data-ktranslationhelper', '');
    if (this._nonce()) style.setAttribute('nonce', this._nonce());
    style.textContent = `
html.kth-active ${sel} {
  outline: 2px dashed var(--kth-highlight, #cf6a00) !important;
  outline-offset: 2px !important;
}
html.kth-active ${sel}:hover {
  outline-style: solid !important;
  box-shadow: 0 0 0 5px var(--kth-highlight-ring, rgba(207, 106, 0, .22)) !important;
}
${missing}
${suggested}
html.kth-active ${sel}.kth-flash { animation: kth-flash 1.2s ease-out; }
@keyframes kth-flash {
  0%, 60% { outline-style: solid; box-shadow: 0 0 0 8px var(--kth-highlight-ring, rgba(207, 106, 0, .22)); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  html.kth-active ${sel}.kth-flash { animation: none; }
}
/* Keyboard focus must stay visible under the highlight: a solid ring with a light gap, readable on any background. */
html.kth-active ${sel}:focus-visible {
  outline: 3px solid var(--kth-focus, #1d4ed8) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 2px var(--kth-focus-gap, #ffffff), 0 0 0 5px var(--kth-focus, #1d4ed8) !important;
}
html.kth-active.kth-mod ${sel} { cursor: pointer !important; }
html.kth-active.kth-picking, html.kth-active.kth-picking * { cursor: crosshair !important; }
@media (hover: none) {
  html.kth-active ${sel} { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
}`;
    document.head.appendChild(style);
    this._pageStyle = style;
  }

  /** CSP nonce for the plugin's <style> elements: the option, else the loading script's. */
  _nonce() {
    return this.config.nonce || SCRIPT_NONCE || '';
  }

  _buildUI() {
    const s = this.strings;
    const host = document.createElement('div');
    host.setAttribute('data-ktranslationhelper-ui', String(this.id));
    const shadow = host.attachShadow({ mode: 'open' });
    const css = h('style', { text: UI_CSS });
    if (this._nonce()) css.setAttribute('nonce', this._nonce());
    shadow.appendChild(css);
    const root = h('div', { class: 'root', lang: this.config.uiLanguage || 'en' });
    root.style.setProperty('--z', String(this.config.zIndex)); // CSSOM, so a strict CSP allows it
    shadow.appendChild(root);

    // Badge + instruction bubble + toast
    const ui = {};
    ui.bubbleText = h('span');
    ui.bubble = h('div', { class: 'bubble', role: 'note', hidden: true },
      ui.bubbleText,
      h('button', { type: 'button', text: s.gotIt, onclick: () => { ui.bubble.hidden = true; } }));
    // Live regions are created up front and left in the tree; they are filled (and emptied) later.
    ui.toast = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    ui.announce = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    ui.pickBtn = h('button', {
      type: 'button', text: s.pick, 'aria-pressed': 'false', hidden: !this.config.showPick,
      onclick: () => this._setPicking(!this._picking),
    });
    ui.listBtn = h('button', { type: 'button', text: s.list, hidden: !this.config.showList, onclick: () => this._openList() });
    ui.helpBtn = h('button', { type: 'button', text: s.help, hidden: !this.config.showHelp, onclick: () => this._openHelp() });
    ui.count = h('span', { class: 'tag missing count', hidden: true }); // "3 missing", needs missingAttribute
    ui.badge = h('div', { class: 'badge' },
      h('span', { class: 'dot', 'aria-hidden': 'true' }),
      h('span', { class: 'label', text: s.badge }),
      ui.count,
      ui.pickBtn, ui.listBtn, ui.helpBtn,
      h('button', { type: 'button', class: 'exit', text: s.exit, onclick: () => this.deactivate() }));
    // showBadge hides only the badge; the instruction bubble and toasts still show.
    ui.badge.hidden = !this.config.showBadge;
    ui.bar = h('div', { class: 'bar', role: 'region', 'aria-label': s.badge, hidden: true },
      ui.bubble, ui.toast, ui.badge);
    root.appendChild(ui.bar);
    root.appendChild(ui.announce);

    // Editor dialog
    ui.dlg = h('dialog', { 'aria-labelledby': `kth-title-${this.id}` });
    ui.dlg.addEventListener('close', () => { this._saveDraft(); this._restoreFocus(); this._emit('onClose', {}); });
    closeOnBackdrop(ui.dlg);
    root.appendChild(ui.dlg);

    // List dialog
    ui.listDlg = h('dialog', { 'aria-labelledby': `kth-list-title-${this.id}` });
    closeOnBackdrop(ui.listDlg);
    root.appendChild(ui.listDlg);

    // Help dialog
    ui.helpDlg = h('dialog', { 'aria-labelledby': `kth-help-title-${this.id}` });
    closeOnBackdrop(ui.helpDlg);
    root.appendChild(ui.helpDlg);

    ui.root = root;
    this._host = host;
    this._ui = ui;
    this._applyTheme();
    this._watchTheme();
    // init() may run in <head>, before <body> exists: mount as soon as it does.
    const mount = () => {
      if (!this._host) return; // destroyed before <body> existed
      document.body.appendChild(host);
      this._watchTheme();
      this._applyTheme();
      if (this._active) { // autoActivate ran before the page content existed
        this._markSuggested();
        this._updateMissingCount();
      }
    };
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount, { once: true });
  }

  /* ---------------------------- theme ---------------------------------- */

  _resolveTheme() {
    const t = this.config.theme;
    if (t === 'light' || t === 'dark') return t;
    // 'auto': an explicit color-scheme on the page wins ("dark" from a site's own theme switch),
    // otherwise the operating system preference.
    try {
      const cs = getComputedStyle(document.body || document.documentElement).colorScheme || '';
      const dark = /\bdark\b/.test(cs);
      const light = /\blight\b/.test(cs);
      if (dark !== light) return dark ? 'dark' : 'light';
    } catch (_) { /* ignore */ }
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  _applyTheme() {
    if (this._ui) this._ui.root.setAttribute('data-theme', this._resolveTheme());
  }

  /** Follow the page's theme switch (attributes on <html>/<body>) and the OS setting. */
  _watchTheme() {
    if (this.config.theme !== 'auto') return;
    if (!this._themeObserver && typeof MutationObserver === 'function') {
      // The plugin's own kth-* classes on <html> change on every activate and modifier key press;
      // those are not a theme switch, so skip the style read for them.
      const others = (v) => String(v || '').split(/\s+/).filter((c) => c && !c.startsWith('kth-')).sort().join(' ');
      this._themeObserver = new MutationObserver((records) => {
        if (records.some((r) => r.attributeName !== 'class' || others(r.oldValue) !== others(r.target.className))) {
          this._applyTheme();
        }
      });
      this._themeObserver.observe(document.documentElement, { attributes: true, attributeOldValue: true });
    }
    if (this._themeObserver && document.body && !this._bodyWatched) {
      this._bodyWatched = true;
      this._themeObserver.observe(document.body, { attributes: true, attributeOldValue: true });
    }
    if (!this._themeMq && typeof matchMedia === 'function') {
      this._themeMq = matchMedia('(prefers-color-scheme: dark)');
      this._bound.theme = () => this._applyTheme();
      if (this._themeMq.addEventListener) this._themeMq.addEventListener('change', this._bound.theme);
    }
  }

  _unwatchTheme() {
    if (this._themeObserver) this._themeObserver.disconnect();
    if (this._themeMq && this._themeMq.removeEventListener) this._themeMq.removeEventListener('change', this._bound.theme);
    this._themeObserver = this._themeMq = null;
  }

  /* ---------------------------- drafts --------------------------------- */

  _draftKey(st) { return `${st.targetLang}\u0000${st.t.key}\u0000${st.t.attr || ''}`; }

  /** Called when the editor closes: keep an unsent edit for this page load. */
  _saveDraft() {
    const st = this._state;
    if (!st || !st.t || st.applied) return;
    const k = this._draftKey(st);
    const text = String(st.text || '');
    if (st.edited && text.trim() && text !== this._prefillFor(st)) this._drafts.set(k, { text, comment: st.comment || '' });
    else this._drafts.delete(k);
  }

  _restoreDraft(st) {
    const d = this._drafts.get(this._draftKey(st));
    st.draft = !!d;
    if (d) {
      st.text = d.text;
      st.comment = d.comment;
      st.edited = true;
    }
  }

  _maybeShowMessage(auto) {
    const mode = this.config.showMessage;
    if (!mode) return;
    // 'once': the first time ever. 'session': once per browser session when re-activated on page
    // load, but every time the visitor turns the mode on themselves. 'always': every activation.
    const flagStore = mode === 'once' ? this._prefs : makeStore('sessionStorage', this.config.storageKey);
    const shown = flagStore.get('messageShown') === '1';
    if ((mode === 'once' && shown) || (mode === 'session' && auto && shown)) return;
    flagStore.set('messageShown', '1');
    this._ui.bubbleText.textContent = this._messageText();
    this._ui.bubble.hidden = false;
  }

  _messageText() {
    const s = this.strings;
    if (this.config.message) return this.config.message;
    const touch = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
    if (touch && this.config.longPress) return s.messageTouch;
    let text = (this._trigger.fn || !this._trigger.mods.length)
      ? s.messageClick
      : fmt(s.message, { keys: this._trigger.mods.map(keyLabel).join(' + ') });
    if (this._hotkey) text += ' ' + fmt(s.messageHotkey, { keys: hotkeyLabel(this._hotkey) });
    return text;
  }

  _toast(text, kind) {
    const t = this._ui.toast;
    t.className = `toast ${kind || ''}`;
    t.textContent = text;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { t.textContent = ''; }, 4000);
  }

  /** Say something to screen readers only (a visually hidden live region). */
  _announce(text) {
    if (!this._ui) return;
    this._ui.announce.textContent = '';
    this._ui.announce.textContent = text;
  }

  /**
   * After the editor closes: put focus back where the visitor can carry on. The browser returns it
   * to what was focused before the dialog opened, which for a string chosen from the list is a
   * button inside the now-closed list dialog, i.e. nowhere. Prefer the string itself, else "All text".
   */
  _restoreFocus() {
    const st = this._state;
    if (!st || !st.returnFocus) return;
    const el = st.returnFocus;
    st.returnFocus = null;
    try { if (el.isConnected && isVisible(el)) el.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    if (document.activeElement === el) return;
    const btn = this._ui.listBtn;
    if (this._active && btn && !btn.hidden && !this._ui.badge.hidden) btn.focus();
  }

  _emit(name, ...args) {
    const fn = this.config[name];
    if (typeof fn === 'function') {
      try { return fn.apply(this, args); } catch (err) { console.error(`kTranslationHelper ${name}:`, err); }
    }
    return undefined;
  }

  /* ---------------------------- events --------------------------------- */

  _isOwn(e) {
    return this._host && e.composedPath().includes(this._host);
  }

  _targetEl(e) {
    let n = e.target;
    if (n && n.nodeType !== 1) n = n.parentElement;
    return this._translatable(n);
  }

  /** The nearest translatable element at or above `node`, or null (also when it is ignored). */
  _translatable(node) {
    if (!node || !node.closest) return null;
    const el = node.closest(this._selector);
    if (!el || this._ignored(el)) return null;
    return el;
  }

  _ignored(el) {
    const ig = this.config.ignoreSelector;
    return !!(ig && el.closest(ig)) || !!(this._host && this._host.contains(el));
  }

  _matches(e) {
    const t = this._trigger;
    if (t.fn) return !!t.fn(e);
    // Ignore keyboard-generated clicks (Enter/Space) for plain-click triggers.
    if (!t.mods.length && e.detail === 0) return false;
    return modsMatch(e, t.mods);
  }

  _swallow(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  _onMouseDown(e) {
    if (this._isOwn(e) || e.button !== 0) return;
    // Stop text selection / focus / select-dropdowns for trigger clicks.
    if (this._picking || (this._matches(e) && this._targetEl(e))) e.preventDefault();
  }

  _onClick(e) {
    if (this._isOwn(e)) return;
    if (this._suppressClick) {
      this._suppressClick = false;
      this._swallow(e);
      return;
    }
    if (this._picking) {
      this._swallow(e);
      const el = this._targetEl(e);
      if (el) {
        this._setPicking(false);
        this.open(el);
      }
      return;
    }
    if (e.button !== 0) return;
    const el = this._targetEl(e);
    if (el && this._matches(e)) {
      this._swallow(e);
      this.open(el);
    }
  }

  _onPointerDown(e) {
    if (!this.config.longPress || e.pointerType !== 'touch' || this._isOwn(e)) return;
    const el = this._targetEl(e);
    if (!el) return;
    this._cancelLongPress();
    this._lp = {
      x: e.clientX, y: e.clientY,
      timer: setTimeout(() => {
        this._lp = null;
        this._suppressClick = true;
        setTimeout(() => { this._suppressClick = false; }, 800);
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) { /* ignore */ } }
        this.open(el);
      }, this.config.longPressDelay),
    };
  }

  _onPointerMove(e) {
    this._pointer = { x: e.clientX, y: e.clientY }; // for the hotkey: "the text under the mouse"
    if (this._lp && Math.hypot(e.clientX - this._lp.x, e.clientY - this._lp.y) > 10) this._cancelLongPress();
  }

  _cancelLongPress() {
    if (this._lp) clearTimeout(this._lp.timer);
    this._lp = null;
  }

  _onContextMenu(e) {
    if (this._isOwn(e)) return;
    // A long-press on touch screens raises contextmenu; don't show the system menu over the editor.
    if (this._suppressClick || (this.config.longPress && (this._lp ||
        (this._targetEl(e) && typeof matchMedia === 'function' && matchMedia('(hover: none)').matches)))) {
      e.preventDefault();
    }
  }

  _onKey(e, down) {
    if (down && e.key === 'Escape' && this._picking) {
      this._setPicking(false);
      return;
    }
    if (down && this._onHotkey(e)) return;
    if (this._trigger.fn || !this._trigger.mods.length) return;
    const all = this._trigger.mods.every((m) => e[`${m}Key`]);
    document.documentElement.classList.toggle('kth-mod', !!all);
  }

  /** The hotkey opens the editor for the focused translatable text, else the text under the mouse. */
  _onHotkey(e) {
    const hk = this._hotkey;
    if (!hk || String(e.key).toLowerCase() !== hk.key || !modsMatch(e, hk.mods) || this._isOwn(e)) return false;
    if (this._ui && (this._ui.dlg.open || this._ui.listDlg.open || this._ui.helpDlg.open)) return false;
    let el = this._translatable(document.activeElement);
    if (!el && this._pointer) {
      const under = document.elementFromPoint(this._pointer.x, this._pointer.y);
      el = under && !this._isOwnNode(under) ? this._translatable(under) : null;
    }
    if (!el) return false;
    e.preventDefault();
    e.stopPropagation();
    this.open(el);
    return true;
  }

  _isOwnNode(node) {
    return !!(this._host && (node === this._host || this._host.contains(node)));
  }

  _setPicking(on) {
    this._picking = !!on;
    document.documentElement.classList.toggle('kth-picking', this._picking);
    if (this._ui) {
      this._ui.pickBtn.setAttribute('aria-pressed', String(this._picking));
      if (this._picking) this._toast(this.strings.pickHint);
      else if (this._ui.toast.textContent === this.strings.pickHint) this._ui.toast.textContent = '';
    }
  }

  /* ---------------------------- targets -------------------------------- */

  _ownTargets(node, parent) {
    const c = this.config;
    const out = [];
    const key = node.getAttribute(c.keyAttribute);
    if (key) out.push({ el: node, key, attr: null, parent });
    if (c.attrMapAttribute) {
      for (const m of parseAttrMap(node.getAttribute(c.attrMapAttribute), c.allowUrlAttributes)) {
        out.push({ el: node, key: m.key, attr: m.attr, parent });
      }
    }
    if (typeof c.canEdit === 'function') return out.filter((t) => c.canEdit(t.el, t.key, t.attr) !== false);
    return out;
  }

  /** Elements whose page-language text is a fallback (missingAttribute), in document order. */
  _missingElements() {
    const c = this.config;
    if (!c.missingAttribute) return [];
    return [...document.querySelectorAll(`${this._selector}`)]
      .filter((el) => el.hasAttribute(c.missingAttribute) && !this._ignored(el) &&
        this._ownTargets(el, false).some((t) => !t.attr));
  }

  _updateMissingCount() {
    if (!this._ui || !this._active) return;
    const n = this._missingElements().length;
    this._ui.count.textContent = n ? fmt(this.strings.badgeMissing, { count: n }) : '';
    this._ui.count.hidden = !n;
  }

  /** Scroll an element into view and pulse its outline, so the visitor sees which text is meant. */
  _reveal(el) {
    if (!el || !isVisible(el)) return;
    try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) { /* ignore */ }
    el.classList.remove('kth-flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('kth-flash');
    setTimeout(() => el.classList.remove('kth-flash'), 1300);
  }

  /* ---------------------------- "suggested" marks ---------------------- */

  _suggestedId(key, lang, attr) { return `${lang}\u0000${key}\u0000${attr || ''}`; }

  _suggestedList() {
    try {
      const list = JSON.parse(this._session.get('suggested') || '[]');
      return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
    } catch (_) { return []; }
  }

  _wasSuggested(key, lang, attr) {
    return this._suggestedList().includes(this._suggestedId(key, lang, attr));
  }

  _rememberSuggested(key, lang, attr) {
    const id = this._suggestedId(key, lang, attr);
    const list = this._suggestedList().filter((x) => x !== id);
    list.push(id);
    this._session.set('suggested', JSON.stringify(list.slice(-200)));
  }

  /** Put suggestedAttribute on every element (in its page language) that has been suggested this session. */
  _markSuggested() {
    const c = this.config;
    if (!c.suggestedAttribute) return;
    for (const id of this._suggestedList()) {
      const [lang, key, attr] = id.split('\u0000');
      for (const el of this._elementsFor(key, attr || null)) {
        if (this._isPageLangOf(this._langOf(el), lang)) el.setAttribute(c.suggestedAttribute, '');
      }
    }
  }

  /** Whether a suggestion in `lang` applies to text whose page language is `pageLang`. */
  _isPageLangOf(pageLang, lang) {
    return sameLang(lang, pageLang) || sameLang(lang, this._lang(pageLang).code);
  }

  _collectTargets(el) {
    const out = [];
    let node = el.closest(this._selector);
    let depth = 0;
    while (node && depth < 3) {
      out.push(...this._ownTargets(node, depth > 0));
      node = node.parentElement ? node.parentElement.closest(this._selector) : null;
      depth++;
    }
    return out;
  }

  _findElement(key, attr) {
    const c = this.config;
    if (!attr) return document.querySelector(attrSel(c.keyAttribute, key));
    if (!c.attrMapAttribute) return null;
    for (const el of document.querySelectorAll(attrSel(c.attrMapAttribute))) {
      if (parseAttrMap(el.getAttribute(c.attrMapAttribute), c.allowUrlAttributes).some((m) => m.key === key && m.attr === attr)) return el;
    }
    return null;
  }

  _langOf(el) {
    const c = this.config;
    if (!el) return c.defaultLanguage;
    if (c.langAttribute) {
      const n = el.closest(attrSel(c.langAttribute));
      if (n && n.getAttribute(c.langAttribute)) return n.getAttribute(c.langAttribute);
    }
    if (c.useLangAttribute) {
      const n = el.closest('[lang]');
      if (n && n.getAttribute('lang')) return n.getAttribute('lang');
    }
    return c.defaultLanguage;
  }

  _isHtml(t) {
    if (t.attr) return false;
    const a = this.config.allowHtml;
    return typeof a === 'function' ? !!a(t.el, t.key) : !!a;
  }

  _readText(t) {
    if (!t.el) return '';
    if (t.attr) return t.el.getAttribute(t.attr) || '';
    if (this._isHtml(t)) return t.el.innerHTML.trim();
    return normWs(t.el.textContent);
  }

  async _source(key, lang) {
    const fn = this.config.getSource;
    if (typeof fn !== 'function') return null;
    const ck = `${lang}\u0000${key}`;
    if (this._cache.has(ck)) return this._cache.get(ck);
    let v = null;
    try {
      v = await fn(key, lang);
    } catch (err) {
      console.warn('kTranslationHelper getSource failed:', err);
    }
    v = typeof v === 'string' && v !== '' ? v : null; // '' means "not translated", like null
    this._cache.set(ck, v);
    return v;
  }

  _placeholders(text) {
    const p = this.config.placeholderPattern;
    if (!p || !text) return [];
    const re = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g');
    return [...new Set(String(text).match(re) || [])];
  }

  /* ---------------------------- editor --------------------------------- */

  async _openEditor(targets, { returnFocus = null } = {}) {
    const token = (this._openToken = (this._openToken || 0) + 1);
    // Keep the previous editor's unsent edit now: the dialog's close event (which also saves it)
    // fires asynchronously and may land after this state has been replaced.
    this._saveDraft();
    const st = { targets, index: 0, edited: false, busy: false, returnFocus };
    this._state = st;
    await this._loadTarget(st, 0);
    if (token !== this._openToken || !this._ui) return; // superseded, or destroyed meanwhile
    this._renderEditor();
    if (!this._ui.dlg.open) this._ui.dlg.showModal();
    this._updateMissingCount();
    this._focusEditor();
    this._emit('onOpen', { key: st.t.key, attribute: st.t.attr, element: st.t.el, lang: st.pageLang });
  }

  async _loadTarget(st, index) {
    const c = this.config;
    st.index = index;
    st.t = st.targets[index];
    st.pageLang = this._langOf(st.t.el);
    st.html = this._isHtml(st.t);
    st.domText = this._readText(st.t);
    st.current = (await this._source(st.t.key, st.pageLang)) ?? st.domText;
    st.sourceLang = c.sourceLanguage || c.defaultLanguage;
    st.original = sameLang(st.sourceLang, st.pageLang) ? null : await this._source(st.t.key, st.sourceLang);
    st.missing = !!(c.missingAttribute && st.t.el && st.t.el.hasAttribute(c.missingAttribute));
    st.wasMissing = st.missing; // st.missing is cleared once the gap is filled in
    const remembered = c.rememberLanguage ? this._prefs.get('lastLang') : null;
    const known = this._languageOptions(st.pageLang);
    st.targetLang = (remembered && known.find((l) => sameLang(l.code, remembered)))
      ? known.find((l) => sameLang(l.code, remembered)).code
      : this._lang(st.pageLang).code;
    await this._loadTargetLang(st);
    st.text = this._prefillFor(st);
    st.comment = '';
    st.edited = false;
    st.applied = false;
    this._restoreDraft(st);
  }

  async _loadTargetLang(st) {
    if (this._isPageLang(st, st.targetLang)) {
      st.existing = st.missing ? null : st.current;
      st.hasExisting = !st.missing;
    } else {
      st.existing = await this._source(st.t.key, st.targetLang);
      st.hasExisting = st.existing != null;
    }
  }

  _prefillFor(st) {
    const p = this.config.prefill;
    const ctx = {
      key: st.t.key, attribute: st.t.attr, element: st.t.el, pageLang: st.pageLang, targetLang: st.targetLang,
      current: st.current, existing: st.existing, original: st.original,
    };
    if (typeof p === 'function') return String(p(ctx) ?? '');
    if (p === 'blank') return '';
    if (p === 'target') return st.hasExisting ? st.existing : (this._isPageLang(st, st.targetLang) ? st.current : '');
    return st.current;
  }

  _isPageLang(st, code) {
    return sameLang(code, st.pageLang) || sameLang(code, this._lang(st.pageLang).code);
  }

  _languageOptions(pageLang) {
    const list = this._languages.slice();
    if (!list.some((l) => looseLang(l.code, pageLang))) {
      list.unshift(this._lang(pageLang));
    }
    return list;
  }

  _focusEditor() {
    const ta = this._ui.dlg.querySelector('textarea.proposal');
    if (ta) {
      ta.focus();
      const end = ta.value.length;
      try { ta.setSelectionRange(end, end); } catch (_) { /* ignore */ }
    }
  }

  _renderEditor() {
    const s = this.strings;
    const c = this.config;
    const st = this._state;
    const ui = this._ui;
    const page = this._lang(st.pageLang);
    const target = this._lang(st.targetLang);
    const src = this._lang(st.sourceLang);
    const langs = this._languageOptions(st.pageLang);
    const differs = !this._isPageLang(st, st.targetLang);
    // Language names as the visitor reads the page ("Alemán" on a Spanish page).
    const name = (l) => this._localName(l, st.pageLang);

    const ref = (text, lang) => h('div', {
      class: 'ref', lang: lang.code, dir: lang.dir,
    }, text);

    // After a language change: keep the visitor's edit, else prefill and restore any draft.
    const reloadTargetLang = async () => {
      const ta = ui.dlg.querySelector('textarea.proposal');
      if (ta) st.text = ta.value;
      if (c.rememberLanguage) this._prefs.set('lastLang', st.targetLang);
      await this._loadTargetLang(st);
      if (this._state !== st) return;
      if (!st.edited) {
        st.text = this._prefillFor(st);
        this._restoreDraft(st);
      } else {
        st.draft = false;
      }
      this._renderEditor();
      this._focusEditor();
    };

    // Which text (when the clicked element has several strings)
    let which = null;
    if (st.targets.length > 1) {
      const sel = h('select', {
        onchange: async (e) => {
          this._saveDraft(); // keep an edit of the string being left, like closing the editor would
          await this._loadTarget(st, Number(e.target.value));
          if (this._state !== st) return; // closed or replaced while loading
          this._renderEditor();
          this._focusEditor();
        },
      }, st.targets.map((t, i) => {
        let label = t.attr ? t.attr : s.whichText;
        if (t.parent) label = `${s.whichParent}: ${label}`;
        const preview = normWs(t.attr ? t.el.getAttribute(t.attr) : t.el.textContent).slice(0, 40);
        return h('option', { value: String(i), selected: i === st.index }, preview ? `${label} — ${preview}` : label);
      }));
      which = h('label', { class: 'field' }, h('span', { class: 'lbl', text: s.which }), sel);
    }

    const keyRow = c.showKey
      ? h('div', { class: 'field' }, h('span', { class: 'lbl', text: s.key }),
        h('div', { class: 'key', text: st.t.attr ? `${st.t.key} (${st.t.attr})` : st.t.key }))
      : null;

    const current = h('div', { class: 'field' },
      h('span', { class: 'lbl', text: fmt(s.current, { lang: name(page) }) }),
      ref(st.current, page));

    const fallback = st.missing
      ? h('div', { class: 'warn', text: fmt(s.fallbackNotice, { lang: name(page) }) }) : null;

    const original = st.original != null && st.original !== st.current
      ? h('div', { class: 'field' },
        h('span', { class: 'lbl', text: fmt(s.original, { lang: name(src) }) }),
        ref(st.original, src))
      : null;

    // Target language
    let langField = null;
    if (langs.length > 1) {
      const select = h('select', {
        onchange: (e) => { st.targetLang = e.target.value; reloadTargetLang(); },
      }, langs.map((l) => h('option', { value: l.code, selected: sameLang(l.code, st.targetLang) },
        this._langLabel(l, st.pageLang))));
      langField = h('label', { class: 'field' }, h('span', { class: 'lbl', text: s.targetLang }), select);
    }

    const notice = differs
      ? h('div', { class: 'notice' },
        h('span', { text: fmt(s.otherLangNotice, { target: name(target), page: name(page) }) }),
        h('button', {
          type: 'button',
          text: fmt(s.usePageLang, { page: name(page) }),
          onclick: () => { st.targetLang = page.code; reloadTargetLang(); },
        }))
      : null;

    const existing = differs && c.getSource
      ? h('div', { class: 'field' },
        h('span', { class: 'lbl', text: fmt(s.existing, { lang: name(target) }) }),
        st.hasExisting
          ? ref(st.existing, target)
          : h('div', { class: 'ref none', text: fmt(s.noExisting, { lang: name(target) }) }))
      : null;

    const suggestedNote = c.suggestedAttribute && this._wasSuggested(st.t.key, st.targetLang, st.t.attr)
      ? h('div', { class: 'hint', text: s.alreadySuggested }) : null;

    // Proposal. The text box is labelled by its caption alone; hints, counter, warnings and the
    // status are linked with aria-describedby and are live regions that are always in the tree.
    const id = (name) => `kth-${name}-${this.id}`;
    const status = h('div', { class: 'status', id: id('status'), role: 'status', 'aria-live': 'polite' });
    const reference = st.original != null ? st.original : st.current;
    const expected = this._placeholders(reference);
    const phWarn = h('div', { class: 'warn', id: id('placeholders'), role: 'status', 'aria-live': 'polite' });
    const counter = c.maxLength ? h('span', { class: 'hint', id: id('count') }) : null;
    const checkText = (value) => {
      const missing = expected.filter((p) => !value.includes(p));
      const warn = missing.length ? fmt(s.missingPlaceholders, { list: missing.join('  ') }) : '';
      if (phWarn.textContent !== warn) phWarn.textContent = warn; // only announce a change
      if (counter) {
        const n = charCount(value);
        counter.textContent = fmt(s.charCount, { count: n, max: c.maxLength });
        counter.className = n > c.maxLength ? 'warn' : 'hint';
      }
    };
    const ta = h('textarea', {
      id: id('proposal'), class: 'proposal', lang: target.code, dir: target.dir, spellcheck: true,
      'aria-describedby': [st.html ? id('html') : null, counter ? id('count') : null, st.draft ? id('draft') : null,
        id('placeholders'), id('status')].filter(Boolean).join(' '),
      oninput: (e) => { st.edited = true; st.text = e.target.value; checkText(e.target.value); st.setStatus(''); },
      onkeydown: (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this._submit(); }
      },
    });
    ta.value = st.text;
    checkText(st.text);
    // Errors are announced at once and, when they are about the text, mark the box invalid.
    st.setStatus = (msg, kind, invalid = false) => {
      status.className = `status ${kind || ''}`;
      status.setAttribute('aria-live', kind === 'err' ? 'assertive' : 'polite');
      status.textContent = msg || '';
      if (invalid && msg) ta.setAttribute('aria-invalid', 'true');
      else ta.removeAttribute('aria-invalid');
    };
    const draftRow = st.draft
      ? h('div', { class: 'draft hint' },
        h('span', { id: id('draft'), text: s.draftRestored }),
        h('button', {
          type: 'button', text: s.discardDraft,
          onclick: () => {
            this._drafts.delete(this._draftKey(st));
            st.text = this._prefillFor(st);
            st.comment = '';
            st.edited = false;
            st.draft = false;
            this._renderEditor();
            this._focusEditor();
          },
        }))
      : null;
    const proposal = h('div', { class: 'field' },
      h('label', { class: 'lbl', for: id('proposal'), text: s.proposal }), ta,
      (st.html || counter) ? h('div', { class: 'meta-row' },
        st.html ? h('span', { class: 'hint', id: id('html'), text: s.htmlAllowed }) : h('span'), counter) : null,
      draftRow,
      phWarn);

    const comment = this._hasComment()
      ? h('div', { class: 'field' }, h('label', { class: 'lbl', for: id('comment'), text: s.comment }),
        h('textarea', { id: id('comment'), class: 'comment', placeholder: s.commentPlaceholder, value: st.comment || '',
          oninput: (e) => { st.comment = e.target.value; } }))
      : null;

    // "Next missing": skip to the next string still showing a fallback (see _missingElements).
    const nextBtn = h('button', {
      type: 'button', class: 'btn next', hidden: true,
      onclick: () => this._openNextMissing(st),
    });
    const submitBtn = h('button', { type: 'submit', class: 'btn primary', text: this._submitLabel() });
    const form = h('form', {
      class: 'dlg', method: 'dialog', dir: pageDir(),
      onsubmit: (e) => { e.preventDefault(); this._submit(); },
    },
    h('div', { class: 'head' },
      h('h2', { id: `kth-title-${this.id}`, text: s.title }),
      h('button', { type: 'button', class: 'x', 'aria-label': s.close, text: '×', onclick: () => this.close() })),
    which, keyRow, current, fallback, original, langField, notice, existing, suggestedNote, proposal, comment, status,
    h('div', { class: 'actions' },
      nextBtn,
      h('button', { type: 'button', class: 'btn', text: s.cancel, onclick: () => this.close() }),
      submitBtn));

    st.submitBtn = submitBtn;
    st.nextBtn = nextBtn;
    ui.dlg.replaceChildren(form);
    this._updateNextButton(st);
  }

  /** Other elements still showing a fallback, after the current one in document order (wrapping). */
  _nextMissing(st) {
    const all = this._missingElements().filter((el) => el !== st.t.el);
    if (!all.length || !st.t.el) return all;
    const after = all.filter((el) => st.t.el.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    return after.concat(all.filter((el) => !after.includes(el)));
  }

  _updateNextButton(st) {
    if (!st.nextBtn) return;
    const rest = this._nextMissing(st);
    // Offered when the visitor is working through the gaps: the string opened was itself a fallback
    // (skip it, or move on after filling it in) and others remain. Plain corrections are left alone.
    const show = rest.length && st.wasMissing;
    st.nextBtn.hidden = !show;
    if (show) st.nextBtn.textContent = fmt(this.strings.nextMissing, { count: rest.length });
  }

  _openNextMissing(st) {
    const el = this._nextMissing(st)[0];
    if (!el) return;
    this._reveal(el);
    this._openEditor(this._ownTargets(el, false).filter((t) => !t.attr), { returnFocus: el });
  }

  async _submit() {
    const s = this.strings;
    const c = this.config;
    const st = this._state;
    if (!st || st.busy) return;
    const ta = this._ui.dlg.querySelector('textarea.proposal');
    const text = (ta ? ta.value : st.text || '').trim();
    const setStatus = st.setStatus;
    if (!text) { setStatus(s.empty, 'err', true); return; }
    if (c.maxLength && charCount(text) > c.maxLength) {
      setStatus(fmt(s.tooLong, { max: c.maxLength }), 'err', true);
      return;
    }
    if (this._isPageLang(st, st.targetLang) && !st.missing && text === String(st.current).trim()) {
      setStatus(s.unchanged, 'err', true);
      return;
    }

    let payload = {
      key: st.t.key,
      lang: st.targetLang,
      text,
      attribute: st.t.attr,
      html: st.html,
      pageLang: st.pageLang,
      sourceLang: st.sourceLang,
      original: st.current,
      comment: this._hasComment() ? (st.comment || '').trim() : '',
      url: location.href.replace(/#.*$/, ''), // without the fragment: it can hold tokens and is never sent to servers
    };
    if (typeof c.buildPayload === 'function') {
      try {
        payload = (await c.buildPayload(payload, { element: st.t.el })) || payload;
      } catch (err) {
        console.error('kTranslationHelper buildPayload:', err);
        setStatus(s.error, 'err');
        this._emit('onError', err, payload);
        return;
      }
      if (this._state !== st) return;
    }
    if (this._emit('onBeforeSubmit', payload) === false) return;

    st.busy = true;
    st.submitBtn.disabled = true;
    st.submitBtn.textContent = this._submitLabel(true);
    setStatus('');
    let result;
    try {
      result = await this._send(payload);
    } catch (err) {
      result = { ok: false, message: null, error: err };
    }
    st.busy = false;
    if (this._state !== st || !this._ui) return; // closed, reopened for another string, or destroyed
    st.submitBtn.disabled = false;
    st.submitBtn.textContent = this._submitLabel();

    // 'always' changes the page whatever the backend said (or even if it could not be reached).
    // A function is called either way and decides itself; returning false means "not applied".
    const mode = c.updateInPlace;
    // If the backend returned the text it stored (e.g. after sanitising HTML), show that, not what was typed.
    const stored = typeof result.text === 'string' && result.text !== '' ? { ...payload, text: result.text } : payload;
    const applied = !!mode && (result.ok || mode === 'always' || typeof mode === 'function') &&
      this._applyInPlace(st, stored, result) !== false;
    // A suggestion counts as made once it is on the page or the backend accepted it, even with
    // updateInPlace: false (a review queue): it is no longer a draft and gets the "suggested" mark.
    if (applied || result.ok) this._afterSubmit(st, stored, applied);

    if (!result.ok) {
      setStatus(result.message || s.error, 'err');
      this._emit('onError', result.error || result, payload);
      return;
    }

    if (c.rememberLanguage) this._prefs.set('lastLang', st.targetLang);
    const msg = result.message || (result.local ? s.localApplied : s.success);
    setStatus(msg, 'ok');
    this._toast(msg, 'ok');
    this._emit('onSubmit', result, payload);
    // Stay open while there is more missing text to do, so "Next missing" can be used.
    if (c.closeDelay > 0 && st.nextBtn.hidden) {
      setTimeout(() => { if (this._state === st) this.close(); }, c.closeDelay);
    }
  }

  /**
   * Bookkeeping once a suggestion has been made: it is no longer a draft and gets the "suggested"
   * mark. When it is also showing on the page (`applied`), the cache and the editor's notion of
   * the current text follow it.
   */
  _afterSubmit(st, stored, applied) {
    const c = this.config;
    if (applied) {
      this._cache.set(`${stored.lang}\u0000${stored.key}`, stored.text);
      if (this._isPageLang(st, stored.lang)) {
        st.current = stored.text;
        st.missing = false;
      }
    }
    st.applied = true;
    st.edited = false;
    st.draft = false;
    this._drafts.delete(this._draftKey(st));
    if (c.suggestedAttribute) {
      this._rememberSuggested(stored.key, stored.lang, stored.attribute);
      this._markSuggested();
    }
    this._updateMissingCount();
    this._updateNextButton(st);
  }

  async _send(payload) {
    const c = this.config;
    if (typeof c.submit === 'function') {
      return normaliseResult(await c.submit(payload));
    }
    // Local mode: nothing to send to; the change is applied to this page only.
    if (this._isLocal()) return { ok: true, message: null, local: true };
    const extra = typeof c.headers === 'function' ? await c.headers(payload) : c.headers;
    const headers = { Accept: 'application/json', ...(extra || {}) };
    let body;
    if (c.encoding === 'form') {
      body = new URLSearchParams();
      for (const [k, v] of Object.entries(payload)) {
        if (v == null) continue;
        body.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    } else {
      if (!Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
      body = JSON.stringify(payload);
    }
    const res = await fetch(c.submitUrl, { method: c.method, headers, body, credentials: c.credentials });
    const type = res.headers.get('content-type') || '';
    let data = null;
    if (type.includes('json')) {
      data = await res.json().catch(() => null);
    } else if (type.startsWith('text/plain')) {
      const t = (await res.text()).trim();
      data = t ? { message: t.slice(0, 300) } : null;
    }
    const ok = res.ok && !(data && data.ok === false);
    const out = { ok, message: (data && data.message) || null, data, status: res.status };
    if (data && typeof data.text === 'string') out.text = data.text;
    return out;
  }

  _applyInPlace(st, payload, result) {
    const c = this.config;
    const mode = c.updateInPlace;
    if (!mode) return false;
    const samePage = this._isPageLang(st, payload.lang);
    // Elements showing this string in the language that was edited (none when it's another language).
    const elements = samePage
      ? this._elementsFor(payload.key, payload.attribute).filter((el) => this._isPageLang(st, this._langOf(el)))
      : [];
    if (typeof mode === 'function') {
      // Called after every submit, whatever the outcome, so the app can update its own store too.
      return mode({
        elements, key: payload.key, attribute: payload.attribute, text: payload.text, html: payload.html,
        lang: payload.lang, pageLang: st.pageLang, ok: !!(result && result.ok), result,
      });
    }
    // Templates with placeholders need your app to render them, so leave those alone.
    if (!samePage || this._placeholders(payload.text).length) return true;
    if (payload.attribute && !safeAttrValue(payload.attribute, payload.text)) return false;
    for (const el of elements) {
      if (payload.attribute) el.setAttribute(payload.attribute, payload.text);
      else if (payload.html) el.innerHTML = payload.text;
      else el.textContent = payload.text;
      if (c.missingAttribute && !payload.attribute) el.removeAttribute(c.missingAttribute);
    }
  }

  _elementsFor(key, attr) {
    const c = this.config;
    if (!attr) return [...document.querySelectorAll(attrSel(c.keyAttribute, key))];
    if (!c.attrMapAttribute) return [];
    return [...document.querySelectorAll(attrSel(c.attrMapAttribute))]
      .filter((el) => parseAttrMap(el.getAttribute(c.attrMapAttribute), c.allowUrlAttributes).some((m) => m.key === key && m.attr === attr));
  }

  /* ---------------------------- list ----------------------------------- */

  _openList() {
    const s = this.strings;
    const c = this.config;
    const ui = this._ui;
    const seen = new Set();
    const rows = [];
    this._markSuggested();
    this._updateMissingCount();
    for (const el of document.querySelectorAll(this._selector)) {
      if (this._ignored(el)) continue;
      for (const t of this._ownTargets(el, false)) {
        const lang = this._langOf(el);
        const id = `${t.key}\u0000${t.attr || ''}\u0000${lang}`;
        if (seen.has(id)) continue;
        seen.add(id);
        rows.push({
          t, lang,
          text: normWs(t.attr ? el.getAttribute(t.attr) : el.textContent),
          missing: !!(c.missingAttribute && !t.attr && el.hasAttribute(c.missingAttribute)),
          suggested: !!(c.suggestedAttribute && this._wasSuggested(t.key, lang, t.attr)),
          hidden: !isVisible(el),
        });
      }
    }

    const listEl = h('ul', { class: 'list' });
    const filter = { q: '', missingOnly: false };
    const render = () => {
      const needle = filter.q.trim().toLowerCase();
      const hits = rows.filter((r) => (!filter.missingOnly || r.missing) && (!needle ||
        r.text.toLowerCase().includes(needle) || r.t.key.toLowerCase().includes(needle)));
      listEl.replaceChildren(...(hits.length ? hits.map((r) => h('li', {},
        h('button', {
          type: 'button',
          onclick: () => {
            ui.listDlg.close();
            this._reveal(r.t.el);
            this._openEditor([r.t], { returnFocus: r.t.el });
          },
        },
        h('span', { class: 'row-text', lang: r.lang, dir: this._lang(r.lang).dir, text: r.text || '—' }),
        h('span', { class: 'meta' },
          c.showKey ? h('span', { class: 'key', text: r.t.key }) : null,
          r.t.attr ? h('span', { class: 'tag', text: r.t.attr }) : null,
          h('span', { class: 'tag', text: r.lang }),
          r.hidden ? h('span', { class: 'tag', text: s.listHidden }) : null,
          r.suggested ? h('span', { class: 'tag suggested', text: s.listSuggested }) : null,
          r.missing ? h('span', { class: 'tag missing', text: s.listMissing }) : null))))
        : [h('li', { class: 'hint', text: s.listEmpty })]));
    };
    render();

    const missingToggle = c.missingAttribute
      ? h('label', {}, h('input', { type: 'checkbox', onchange: (e) => { filter.missingOnly = e.target.checked; render(); } }),
        h('span', { text: s.listMissingOnly }))
      : null;
    ui.listDlg.replaceChildren(h('div', { class: 'dlg', dir: pageDir() },
      h('div', { class: 'head' },
        h('h2', { id: `kth-list-title-${this.id}`, text: s.listTitle }),
        h('button', { type: 'button', class: 'x', 'aria-label': s.close, text: '×', onclick: () => ui.listDlg.close() })),
      h('div', { class: 'tools' },
        h('input', { type: 'search', placeholder: s.listFilter, 'aria-label': s.listFilter,
          oninput: (e) => { filter.q = e.target.value; render(); } }),
        missingToggle),
      listEl));
    if (!ui.listDlg.open) ui.listDlg.showModal();
  }
}

/* ------------------------------------------------------------------------ *
 * Help dialog (added to the class below; kept separate for readability)
 * ------------------------------------------------------------------------ */

/** Local mode: nothing to send to. */
TranslationHelper.prototype._isLocal = function isLocal() {
  return !this.config.submitUrl && typeof this.config.submit !== 'function';
};

/** The comment box only makes sense when someone will read it: review on, and not local mode. */
TranslationHelper.prototype._hasComment = function hasComment() {
  return !!(this.config.showComment && this.config.review && !this._isLocal());
};

/** The submit button's label for this configuration; `busy` while the request is in flight. */
TranslationHelper.prototype._submitLabel = function submitLabel(busy = false) {
  const s = this.strings;
  if (this._isLocal()) return busy ? s.saving : s.apply;
  if (!this.config.review) return busy ? s.saving : s.save;
  return busy ? s.submitting : s.submit;
};

/** The legend rows that apply to this configuration: [swatch class, text]. */
TranslationHelper.prototype._legendItems = function legendItems() {
  const s = this.strings;
  const c = this.config;
  const rows = [['', s.legendText]];
  if (typeof matchMedia !== 'function' || !matchMedia('(hover: none)').matches) rows.push(['solid', s.legendHover]);
  if (c.missingAttribute) rows.push(['missing', s.legendMissing]);
  if (c.suggestedAttribute) rows.push(['suggested', s.legendSuggested]);
  return rows;
};

/** The "how it works" sentences that apply to this configuration. */
TranslationHelper.prototype._helpItems = function helpItems() {
  const s = this.strings;
  const c = this.config;
  const items = [this._messageText()]; // how to open the editor: trigger keys, touch, hotkey
  if (c.showPick && c.showBadge) items.push(fmt(s.helpPick, { pick: s.pick }));
  if (c.showList && c.showBadge) items.push(fmt(s.helpList, { list: s.list }));
  if (c.missingAttribute) items.push(s.helpMissing);
  items.push(this._languages.length > 1 ? s.helpEditor : s.helpEditorPageOnly);
  if (c.placeholderPattern) {
    const isDefault = c.placeholderPattern.source === DEFAULTS.placeholderPattern.source;
    items.push(isDefault ? fmt(s.helpPlaceholders, { example: '{name}' }) : s.helpPlaceholdersGeneric);
  }
  if (c.allowHtml) items.push(s.helpHtml);
  items.push(s.helpDrafts);
  if (this._isLocal()) items.push(s.helpLocal);
  else {
    const when = (c.updateInPlace === 'always' || typeof c.updateInPlace === 'function') ? 'Always' : (c.updateInPlace ? 'Success' : 'Never');
    items.push(s[(c.review ? 'helpApply' : 'helpSaved') + when]);
  }
  if (c.showBadge) items.push(fmt(c.persist ? s.helpExit : s.helpExitNoPersist, { exit: s.exit }));
  return items;
};

TranslationHelper.prototype._openHelp = function openHelp() {
  const s = this.strings;
  const ui = this._ui;
  ui.helpDlg.replaceChildren(h('div', { class: 'dlg', dir: pageDir() },
    h('div', { class: 'head' },
      h('h2', { id: `kth-help-title-${this.id}`, text: s.helpTitle }),
      h('button', { type: 'button', class: 'x', 'aria-label': s.close, text: '×', onclick: () => ui.helpDlg.close() })),
    h('div', { class: 'field' },
      h('h3', { text: s.helpLegend }),
      h('ul', { class: 'legend' }, this._legendItems().map(([cls, text]) => h('li', {},
        h('span', { class: `swatch ${cls}`, 'aria-hidden': 'true' }),
        h('span', { text }))))),
    h('div', { class: 'field' },
      h('h3', { text: s.helpHow }),
      h('ol', { class: 'steps' }, this._helpItems().map((text) => h('li', { text })))),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn primary', text: s.gotIt, onclick: () => ui.helpDlg.close() }))));
  if (!ui.helpDlg.open) ui.helpDlg.showModal();
};

function normaliseResult(r) {
  if (r === undefined || r === true) return { ok: true, message: null };
  if (r === false || r === null) return { ok: false, message: null };
  if (typeof r === 'string') return { ok: true, message: r };
  return { ...r, ok: r.ok !== false, message: r.message || null };
}

const kTranslationHelper = {
  version: VERSION,
  defaults: DEFAULTS,
  strings: DEFAULT_STRINGS,
  /** Create and return a helper instance. */
  init(options) { return new TranslationHelper(options); },
  TranslationHelper,
};

export default kTranslationHelper;
export { kTranslationHelper, TranslationHelper };
