# Changelog

## Unreleased

### Added

- **Front-end apply.** `updateInPlace` now defaults to `'always'`: the page changes as soon as a
  suggestion is submitted, whatever the backend answers (`'success'` restores the old behaviour, `true`
  is an alias). `init()` no longer requires `submitUrl` or `submit`: with neither, the plugin runs in
  local mode, applying changes to the page only ("Applied to this page only…"). A function passed as
  `updateInPlace` is now called after every submit, for every language, with `ok`, `result` and
  `pageLang`, and may return `false` to say it applied nothing.
- **Next missing.** With `missingAttribute` set, the badge shows how many strings on the page are still
  fallbacks, *All text* has a *Missing only* filter, and after filling in a gap the editor stays open
  with a *Next missing* button that scrolls to and opens the next one.
- **Drafts.** Closing the editor with an unsent edit keeps it for that string and language until the page
  is reloaded; reopening restores it with a *Discard* link.
- **Theme.** New `theme` option (`'auto' | 'light' | 'dark'`). `'auto'` follows the page's own
  `color-scheme` (a site's light/dark switch), then the operating system.
- **Keyboard hotkey.** New `hotkey` option, default `'shift+f2'`: opens the editor for the focused
  translatable text, or the text under the mouse. The instruction message mentions it.
- **Exclusions.** New `ignoreSelector` (no highlighting, editor or listing for matching subtrees) and
  `canEdit(element, key, attribute)` options.
- **Suggested marks.** New `suggestedAttribute` option (default `data-kth-suggested`): text the visitor
  has already suggested this session gets a green outline (`--kth-suggested`), a *suggested* tag in the
  list and a note in the editor. Remembered in `sessionStorage`.
- **`maxLength`** option: character counter under the text box and refusal of longer suggestions.
- **Language names in the page's language**: "Alemán (Deutsch)" on a Spanish page, via
  `Intl.DisplayNames`; the field labels and notices use the localised name.
- **Scroll and flash**: choosing a string from *All text* or *Next missing* scrolls to it and pulses its
  outline (`kth-flash`).
- **Help button** on the badge (`showHelp`, `helper.help()`): a legend of the outline colours and a
  "how it works" list, both assembled from the configuration (trigger, hotkey, touch, pick and list
  buttons, missing counts, languages, placeholders, HTML, drafts, local mode or backend, review,
  persistence).
- **`review`** option (default true). With `review: false`, or in local mode, the comment box is not
  shown and the help text says suggestions are saved rather than sent for review. The submit button
  now reads "Submit for review", "Save" (`review: false`) or "Apply" (local mode); new `save`, `saving`
  and `apply` strings, and `submit` changed from "Submit".
- **TypeScript declarations** (`dist/ktranslationhelper.d.ts`, `.d.mts`; `types` in `package.json`).
- **`nonce`** option for sites with a strict Content Security Policy: it is put on the plugin's two
  `<style>` elements, and defaults to the nonce of the `<script>` that loaded the classic build. The badge's
  z-index is set through the CSSOM instead of an inline `style` attribute, which such a policy blocks.
- Docs: new *Keyboard*, *Drafts & suggested marks*, *Local mode* and *Limits* (shadow roots, iframes,
  ICU plurals) sections.
- New interface strings (`messageHotkey`, `badgeMissing`, `charCount`, `tooLong`, `draftRestored`,
  `discardDraft`, `alreadySuggested`, `localApplied`, `nextMissing`, `listMissingOnly`,
  `listSuggested`), translated in `es`, `zh-Hans` and `ar`.
- Demo: a light/dark theme switch in the header, an *Excluded text* example (12), `maxLength: 2000`
  matching the PHP backend, and suggestions applied through an `updateInPlace` function so the static
  demo changes the page too.

### Accessibility (WCAG 2.1 AA)

- Keyboard focus on highlighted text has its own ring (`--kth-focus`, `--kth-focus-gap`); the highlight
  outline used to hide the browser's focus indicator while translation mode was on.
- Default highlight colour is now `#cf6a00` (was `#f59e0b`), which meets the 3:1 non-text ratio on light
  backgrounds. Dark-mode primary buttons use dark text on the accent; the "missing" and "suggested" tags
  use higher-contrast colours per theme.
- New `uiLanguage` option marks the plugin's own text with its language (`lang` on the UI root), so a
  page in a language without a locale file is not read with the wrong pronunciation.
- The scroll-to flash respects `prefers-reduced-motion`.
- The proposal box is now named by its caption alone (it used to be "Your translation 44 / 2000 …",
  because the counter, hints and warnings sat inside the `<label>`); the hint, counter, draft note,
  placeholder warning and status are linked with `aria-describedby` instead. Validation errors mark the
  box `aria-invalid` and are announced assertively.
- Live regions (the toast, the editor's status and the placeholder warning) stay in the tree while
  empty instead of being `display: none` until needed, so their first message is announced reliably.
  The placeholder warning is now a live region.
- Turning the mode on or off is announced to screen readers (new `modeOn` / `modeOff` strings, translated).
- Missing and suggested text now differ in outline style as well as colour (dotted and double), so the
  three states can be told apart without colour vision; the help legend shows the same styles.
- Closing an editor opened from *All text* or *Next missing* puts focus on the edited text, or on the
  *All text* button; it used to land on a button inside the closed list dialog.
- Docs: a skip link, and the scrollable tables and code blocks have accessible names.
- Demo and docs: navigation wraps at 320px, the docs title breaks instead of overflowing, code blocks
  and tables are keyboard-scrollable, contrast fixes (eyebrow text, form field borders, toggle colour,
  "required" badge in dark mode), reduced-motion handling, decorative card numbers hidden from screen
  readers, and the "?" button has an accessible name.
- New `tests/a11y.test.mjs` (axe-core) audits the demo and docs; `npm run test:a11y`.

### Changed

- **Repository layout for GitHub Pages.** The demo moved from `demo/` to `docs/`, the documentation to
  `docs/docs/`, and the built files from `dist/` to `docs/dist/` (`package.json` entry points updated to
  match). `node build.mjs` writes to `docs/dist/`; run the demo with `php -S localhost:8000 -t docs`.

### Fixed

Bug fixes from a code review.

- Security hardening. Attribute mappings never offer event handlers, `style`, `srcdoc`, `formaction` or
  `is`, and offer URL attributes (`href`, `src`, `action` …) only with the new `allowUrlAttributes: true`,
  since translators are rarely developers; even then a `javascript:`, `data:` or `vbscript:` value is not
  applied to the page;
  the payload's `url` no longer includes the fragment (which can hold tokens); `init()` refuses a
  `method` of GET or HEAD, which `fetch` cannot send a body with. The docs' minimal PHP example now
  checks `Sec-Fetch-Site`, as its own checklist asks, and the docs say plainly that the activation button
  is not access control.
- A `sessionStorage` entry that isn't a list (a `storageKey` shared with another script) no longer
  breaks activation and the editor.
- The context menu on translatable text is only suppressed on touch screens when `longPress` is on.
- `{constructor}` and similar in an interface string no longer print built-in functions.

- Editor: clicking the dialog's own scrollbar, or releasing a text selection that started in the text
  box over the backdrop, no longer closes the dialog and loses the edit. Only a click that starts and
  ends on the backdrop closes it.
- `init()` can now be called from `<head>`: the interface is mounted once `<body>` exists.
- `open({ key })` for a key that isn't on the page no longer shows the whole page's text as
  "Current text".
- `showBadge: false` now hides only the badge; the instruction message and toasts still show.
- `showMessage: 'once'` now means the first time ever, as documented; it used to show again on every
  manual activation. Turning the mode off also hides the message and any toast.
- With `updateInPlace: false` (or a function that returns `false`), a suggestion the backend accepted
  was still treated as unsent: it got no *suggested* mark, and reopening the string restored it as an
  "unsent draft". The bookkeeping now follows the backend's answer; only the page change depends on
  `updateInPlace`.
- Changing *Text to translate* (an element with several strings) discarded what had been typed and
  carried the comment over to the other string. The edit is now kept as a draft, like closing the
  editor, and the other string starts clean.
- `init()` in `<head>` with `autoActivate`: the missing count and the *suggested* marks were computed
  before `<body>` existed and stayed empty until an editor was opened.
- Language matching: a bare tag still stands for its variants (`en` for `en-GB`), but two tagged
  variants are no longer treated as the same language. A `zh-Hans` page with `zh-Hant` in `languages`
  now offers both, instead of treating Traditional as the page language.
- `ha` (Hausa) and `ku` (Kurmanji Kurdish) are no longer assumed to be right-to-left; both are written
  in Latin script (Sorani, `ckb`, still is right-to-left).
- `theme: 'auto'` no longer re-reads the page's computed style for the plugin's own class changes on
  `<html>` (every activation and modifier key press).
- Demo backend: the same-origin guard described below was missing, so a form post from any other
  website open in the same browser could write to the translation files. `update.php` and `reset.php`
  now refuse requests whose `Sec-Fetch-Site` isn't `same-origin` or whose `Origin` isn't their own host.
  The sanitiser also really keeps `tel:` links and relative links with a query string now.
- If the backend returns `text` in its response, the plugin uses it for the in-place update and its
  cache, so sanitised HTML is what appears on the page rather than what was typed.
- `destroy()` while an editor is still loading or a submit is in flight no longer throws.
- `getSource` returning `''` is treated as "no translation", like `null`.
- A throwing `buildPayload` shows the error status and calls `onError` instead of an unhandled rejection.
- The badge and dialogs follow the page's computed text direction (bottom-left on RTL pages).
- In-place updates and the `lang`/`pageLang` payload fields handle region subtags (`en-GB` page,
  `en` in `languages`).
- Toasts are announced by screen readers (text set after the live region is shown).
- "Meta" is labelled "Win" on non-Mac systems in the instruction message.
- Demo backend: the translation key is checked before the lock is taken (PHP does not run `finally`
  on `exit`); cross-site requests are refused via `Sec-Fetch-Site`; relative links with a query string
  and `tel:` links are allowed in HTML strings.
- Demo: attribute maps are parsed exactly as the plugin parses them; inline English fallback text matches
  `en.json`; no flash of English/left-to-right content before the saved language renders; the plugin's
  locale list is a flag on `LANGUAGES` instead of a separate array.
- Docs: `original`, `pageLang`, `showBadge`, `showMessage`, `rememberLanguage`, `persist` and the
  response contract now describe what actually happens; tables are real tables again (screen readers);
  where to call `init()`.
- Tests: `php -S` is stopped and `demo/lang/` restored even when a check throws; 28 new checks
  (form encoding, cookie persistence, `showMessage: 'once'`, `onBeforeSubmit`, error path, stored text,
  validation messages, Esc in pick mode, `open({ key })`, `init()` in `<head>`, RTL, and more).
- CLAUDE.md: no more zip deliverables or per-change version bumps.

## 0.1.2 — 2026-09-23

- Demo: the "Reset translations" button showed with the static backend, where there is nothing to reset.
  It now only appears with the PHP backend (the `.btn` style was overriding the `hidden` attribute).

## 0.1.1 — 2026-09-23

Demo and project housekeeping; the plugin itself is unchanged apart from its version number.

- Demo: new About and Contact pages, linked from a shared navigation bar, to show translation mode,
  the remembered target language and the page language all carrying across page loads.
- Demo: placeholders in running text, locale-formatted numbers, a key shared between two pages,
  a form with messages that only appear after submitting, and a translatable opening-hours table.
- Demo: `?lang=` is now remembered, so links such as `index.html?lang=ar` carry over to other pages.
- Added `tests/demo.test.mjs`, an end-to-end suite (Playwright + `php -S`); run with `npm test`.
- Added `CLAUDE.md` with project layout, commands and conventions.

## 0.1.0 — 2026-09-23

First release.

- Highlighting of translatable elements (text and attributes), with missing-translation marking.
- Configurable trigger (default Shift + click), long-press on touch screens, and "Pick text" mode.
- Editor dialog: current / original / existing text, remembered target language with a page-language
  warning, prefill modes, placeholder checks, optional HTML, optional comment and key display.
- "All text" list for strings that can't be clicked.
- Submit to a URL (JSON or form) or a custom function; `{ ok, message }` response contract.
- State persists across page loads (localStorage by default; sessionStorage or cookie optional).
- Shadow-DOM UI with CSS variables, light/dark themes, RTL support, and es / zh-Hans / ar interface text.
- Demo page (en, es, zh-Hans, ar, fr) with a static backend and a local PHP backend; documentation page.
