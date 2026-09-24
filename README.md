# kTranslationHelper

A dependency-free JavaScript plugin for multi-language websites that lets visitors **flag and fix translations**:
correct a mistake in the language they're reading, or add a missing translation for any language you support.

- Highlights every translatable element; **Shift + click** (or long-press on touch screens) opens an editor.
- Links and buttons keep working, and the mode **stays on across page loads** until the visitor exits.
- Shows the current text, the original, and any existing translation; **remembers the last language** used
  and warns when it isn't the page's language.
- Handles attributes (placeholders, tooltips, `alt`), nested strings, content added after load,
  mixed-language pages, right-to-left languages, optional HTML, and **placeholder checks** (`{name}`, `%s`).
- Sends `{ key, lang, text, … }` to your URL or your own function. Storing it is up to your backend.
- Keyboard shortcut (Shift + F2) for the focused text, unsent edits kept as drafts, a character limit
  with counter, and text you can exclude (`ignoreSelector`, `canEdit`).
- Shows how many strings on the page still need translating, with a **Next missing** button to work
  through them, and marks the ones the visitor has already suggested.
- Works **without a backend** too: changes are applied to the page until it is reloaded.
- The plugin's own UI is isolated in a Shadow DOM, follows the page's light/dark theme, is themeable with
  CSS variables and translatable (`es`, `zh-Hans`, `ar` included). TypeScript declarations included.

📖 **Documentation:** [`https://kastrack.github.io/kTranslationHelper/docs`](https://kastrack.github.io/kTranslationHelper/docs/) · 🧪 **Demo:** [`https://kastrack.github.io/kTranslationHelper`](https://kastrack.github.io/kTranslationHelper/)

## Quick start

```html
<script src="dist/ktranslationhelper.js"></script>

<h1 data-i18n="home.title">Bienvenido</h1>
<button id="suggest">Suggest translations</button>

<script>
  const helper = kTranslationHelper.init({
    keyAttribute: 'data-i18n',   // required: attribute holding the translation key
    defaultLanguage: 'en',       // required: language present when nothing else says otherwise
    languages: ['en', 'es', 'de', { code: 'ar', name: 'العربية', dir: 'rtl' }],
    submitUrl: '/api/translation-suggestions',
  });
  document.getElementById('suggest').addEventListener('click', () => helper.toggle());
</script>
```

An ES module build is at `dist/ktranslationhelper.mjs`. See the documentation for every option,
the payload/response contract and guidance on writing a backend.

## Running the demo

The demo is a small bakery site with three pages (Home, About, Contact) in English, Spanish, Simplified Chinese
and Arabic, plus an empty French file. Turn translation mode on and move between the pages: it stays on.
Switch to French to see the missing count and work through the gaps with **Next missing**.
Choose its backend in `demo/config.js`:

| `backend`  | Where it runs | What happens to suggestions |
|------------|---------------|-----------------------------|
| `'static'` (default) | Any static host | A callback reads `demo/static-backend/response.json`, which replies that nothing was saved |
| `'php'` | Your machine | `demo/backend/update.php` writes them straight into `demo/lang/*.json` |

```sh
# PHP 8.1+
php -S localhost:8000
# then open http://localhost:8000/demo/
```

**Reset translations** on the page, or `php demo/backend/reset.php`, restores the files from `demo/lang/original/`.

> The PHP backend is for local development only. It rejects requests from public IP addresses and should
> never be deployed to a public server.

## Tests

```sh
npm install --no-save playwright axe-core
npm test          # end-to-end suite: starts php -S, tests both demo backends, restores demo/lang/
npm run test:a11y # WCAG 2.1 AA audit of the demo and docs with axe-core
```

## Project layout

```
src/ktranslationhelper.js   Source (ES module)
src/locales/*.json          Interface text translations
dist/                       Built files: ktranslationhelper.js (classic), .mjs (ES module), locales/
build.mjs                   node build.mjs — rebuilds dist/ (no dependencies)
docs/index.html             Documentation
demo/                       Demo site (3 pages), JSON translations and the two demo backends
tests/demo.test.mjs         End-to-end tests
CLAUDE.md                   Layout, commands and conventions for contributors (and Claude)
```

## Browser support

Current Chrome, Edge, Firefox and Safari. Uses `<dialog>`, Shadow DOM and ES2020.

## Licence

MIT — see [LICENSE](LICENSE).
