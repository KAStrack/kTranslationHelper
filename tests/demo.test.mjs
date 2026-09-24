#!/usr/bin/env node
/*
 * End-to-end tests for kTranslationHelper and its demo, in headless Chromium.
 *
 *   npm install --no-save playwright   # once (plus `npx playwright install chromium` if needed)
 *   node tests/demo.test.mjs           # or: npm test
 *
 * Starts `php -S` on a free port, runs every check against both demo backends, and restores
 * docs/lang/*.json before and after. Set SHOTS=some/dir to save screenshots.
 * Exits with status 1 if any check fails.
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
try {
  ({ chromium } = (await import('playwright')).default ?? (await import('playwright')));
} catch (_) {
  console.error('Playwright is not installed. Run: npm install --no-save playwright');
  process.exit(2);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANG = join(ROOT, 'docs/lang') + '/';
const SHOTS = process.env.SHOTS ? resolve(process.env.SHOTS) + '/' : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = (page, name, opts = {}) => (SHOTS ? page.screenshot({ path: SHOTS + name, ...opts }) : null);
const resetTranslations = () => execFileSync('php', [join(ROOT, 'docs/backend/reset.php')], { stdio: 'ignore' });

const port = await new Promise((ok) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); });
});
const ORIGIN = `http://127.0.0.1:${port}`;
const BASE = `${ORIGIN}/`;

resetTranslations();
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'docs')], { stdio: 'ignore' });
// Runs on every exit, including an uncaught error, so php -S never lingers and docs/lang/ is restored.
process.on('exit', () => { php.kill(); try { resetTranslations(); } catch (_) { /* php missing */ } });
for (let i = 0; i < 50; i++) {
  try { await fetch(BASE); break; } catch (_) { await new Promise((r) => setTimeout(r, 100)); }
}

const results = [];
const check = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
const browser = await chromium.launch();


async function newPage(backend, { colorScheme = 'light', viewport = { width: 1280, height: 900 }, hasTouch = false, isMobile = false, reducedMotion = 'no-preference' } = {}) {
  const ctx = await browser.newContext({ colorScheme, viewport, hasTouch, isMobile, reducedMotion });
  await ctx.route(BASE + 'config.js', (r) => r.fulfill({
    contentType: 'application/javascript',
    body: `window.DEMO_CONFIG = { backend: '${backend}', showKey: false };`,
  }));
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  return { ctx, page };
}
const ready = (page) => page.waitForFunction(() => document.querySelector('#lang-select option'));
const dlg = (page) => page.locator('[data-ktranslationhelper-ui] dialog').first();

/* ---------------- static backend ---------------- */
{
  const { ctx, page } = await newPage('static');
  await page.goto(BASE + '?lang=en');
  await ready(page);
  check('no errors on load', page.errors.length === 0, page.errors.join(' | '));
  check('static: reset button not shown', await page.locator('#reset-btn').isHidden());
  await page.click('#kth-toggle');
  check('activates', await page.evaluate(() => document.documentElement.classList.contains('kth-active')));
  check('toggle pressed', (await page.getAttribute('#kth-toggle', 'aria-pressed')) === 'true');
  const bubble = page.locator('[data-ktranslationhelper-ui] .bubble');
  check('message shown', await bubble.isVisible(), await bubble.textContent());
  await shot(page, '01-active.png');

  // plain click on a link-ish button still works
  await page.click('#basket-btn');
  check('plain click still works', (await page.textContent('#basket-count')).includes('1'));

  // shift+click the link: editor opens, no navigation
  await page.click('.link', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  check('shift+click link opens editor', await dlg(page).evaluate((d) => d.open));
  check('no navigation', new URL(page.url()).pathname === '/');
  check('only one page', ctx.pages().length === 1);
  await page.keyboard.press('Escape');

  // plain text
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  check('prefilled with current', (await ta.inputValue()) === 'Fresh bread every morning');
  check('key hidden by default', !(await dlg(page).locator('.key').count()));
  check('review on: comment box shown', (await dlg(page).locator('textarea.comment').count()) === 1);
  check('review on: button says Submit for review', (await dlg(page).locator('.btn.primary').textContent()) === 'Submit for review');
  await shot(page, '02-editor.png');
  // A text selection that starts in the textarea and is released over the backdrop must not close the dialog
  const tb = await ta.boundingBox();
  await page.mouse.move(tb.x + 10, tb.y + 10);
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 4 });
  await page.mouse.up();
  check('drag out of textarea keeps dialog open', await dlg(page).evaluate((d) => d.open));
  await ta.fill('Fresh bread every single morning');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(400);
  const st = await dlg(page).locator('.status').textContent();
  check('static message shown', st.includes('does not have a backend'), st);
  check("updateInPlace 'always': page changed despite ok: false", (await page.textContent('[data-i18n="ex.text.item1"]')) === 'Fresh bread every single morning');
  check('suggested mark set', await page.locator('[data-i18n="ex.text.item1"][data-kth-suggested]').count() === 1);
  await shot(page, '03-static-error.png');
  await page.mouse.click(5, 5);
  check('backdrop click closes dialog', !(await dlg(page).evaluate((d) => d.open)));

  // help dialog: legend and steps built from the demo's configuration
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("Help")');
  const helpDlg = page.locator('[data-ktranslationhelper-ui] dialog').nth(2);
  const legend = await helpDlg.locator('.legend li').allTextContents();
  const steps = await helpDlg.locator('.steps li').allTextContents();
  check('help: legend has translatable, hover, missing, suggested', legend.length === 4 && legend[2].includes('Not translated yet') && legend[3].includes('suggested'), legend.join(' | '));
  check('help: steps mention Shift, F2, Pick text, review', steps[0].includes('Shift') && steps[0].includes('F2') && steps.some((t) => t.startsWith('"Pick text"')) && steps.some((t) => t.includes('sent for review')), steps.join(' | '));
  await shot(page, '02b-help.png');
  await helpDlg.locator('.btn.primary').click();
  check('help closes', !(await helpDlg.evaluate((d) => d.open)));

  // excluded text (ignoreSelector): no outline, no editor, not listed
  const legal = page.locator('[data-i18n-ignore]');
  check('ignored text not highlighted', (await legal.evaluate((e) => getComputedStyle(e).outlineStyle)) === 'none');
  await legal.click({ modifiers: ['Shift'] });
  check('ignored text has no editor', !(await dlg(page).evaluate((d) => d.open)));

  // hotkey: focus translatable text, press Shift+F2
  await page.focus('.link');
  await page.keyboard.press('Shift+F2');
  await page.waitForTimeout(200);
  check('hotkey opens editor for focused text', (await dlg(page).evaluate((d) => d.open)) && (await ta.inputValue()) === 'Read the documentation');
  await page.keyboard.press('Escape');

  // placeholders
  await page.click('#greeting', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  check('template shown, not rendered', (await ta.inputValue()) === 'Hello {name}, you have {count} new messages.', await ta.inputValue());
  await ta.fill('Hello, you have {count} new messages.');
  const warn = dlg(page).locator('.warn');
  check('placeholder warning', (await warn.textContent()).includes('{name}'));
  await shot(page, '04-placeholders.png');
  await page.keyboard.press('Escape');

  // nested (label + tooltip)
  await page.click('[data-i18n="ex.nested.button"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  const opts = await dlg(page).locator('select').first().locator('option').allTextContents();
  check('nested offers 2 choices', opts.length === 2, opts.join(' / '));
  await page.keyboard.press('Escape');

  // attribute
  await page.click('input[type=search]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  check('placeholder attribute editable', (await ta.inputValue()) === 'Search our products…', await ta.inputValue());
  await page.keyboard.press('Escape');

  // html
  await page.click('[data-i18n="ex.html.sentence"] strong', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  check('html raw markup', (await ta.inputValue()).includes('<a href="#terms">'));
  await page.keyboard.press('Escape');

  // dynamic
  await page.click('#notify-btn');
  const outline = await page.locator('.notice').first().evaluate((e) => getComputedStyle(e).outlineStyle);
  check('dynamic content highlighted', outline === 'dashed', outline);

  // pick mode: Esc cancels, otherwise the next click opens the editor
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("Pick text")');
  check('pick mode armed', await page.evaluate(() => document.documentElement.classList.contains('kth-picking')));
  await page.keyboard.press('Escape');
  check('Esc cancels pick mode', !(await page.evaluate(() => document.documentElement.classList.contains('kth-picking'))));
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("Pick text")');
  await page.click('[data-i18n="ex.text.item2"]');
  await page.waitForTimeout(200);
  check('pick mode opens editor', (await ta.inputValue()).includes('Free delivery'));
  await page.keyboard.press('Escape');

  // list
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("All text")');
  const rows = page.locator('[data-ktranslationhelper-ui] .list li button');
  const n = await rows.count();
  check('list shows strings', n > 55, String(n));
  await page.fill('[data-ktranslationhelper-ui] input[type=search]', 'legal team');
  check('ignored text not listed', (await rows.count()) === 0);
  await page.fill('[data-ktranslationhelper-ui] input[type=search]', 'single morning');
  check('list shows suggested tag', (await rows.first().locator('.tag.suggested').count()) === 1);
  await page.fill('[data-ktranslationhelper-ui] input[type=search]', 'express');
  check('list filter', (await rows.count()) === 1);
  await shot(page, '05-list.png');
  await rows.first().click();
  await page.waitForTimeout(200);
  check('list row opens editor', (await ta.inputValue()) === 'Express (next day)');
  await page.keyboard.press('Escape');

  // persistence across reload
  await page.reload();
  await ready(page);
  await page.waitForTimeout(200);
  check('stays active after reload', await page.evaluate(() => document.documentElement.classList.contains('kth-active')));
  check('front-end change did not survive reload', (await page.textContent('[data-i18n="ex.text.item1"]')) === 'Fresh bread every morning');
  check('suggested mark survives reload in the session', await page.locator('[data-i18n="ex.text.item1"][data-kth-suggested]').count() === 1);
  check('message not repeated in session', !(await bubble.isVisible()));
  check('toggle reflects state', (await page.getAttribute('#kth-toggle', 'aria-pressed')) === 'true');

  // exit
  await page.click('[data-ktranslationhelper-ui] .badge .exit');
  check('exit deactivates', !(await page.evaluate(() => document.documentElement.classList.contains('kth-active'))));
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  check('inactive: no editor', !(await dlg(page).evaluate((d) => d.open)));
  await page.reload(); await ready(page);
  check('stays off after reload', !(await page.evaluate(() => document.documentElement.classList.contains('kth-active'))));
  check('no errors (static)', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}

/* ---------------- php backend ---------------- */
{
  const { ctx, page } = await newPage('php');
  await page.goto(BASE + '?lang=es');
  await ready(page);
  check('php: reset button shown', await page.locator('#reset-btn').isVisible());
  check('es missing marked', await page.locator('[data-i18n="ex.text.item3"][data-i18n-missing]').count() === 1);
  await page.click('#kth-toggle');
  await shot(page, '06-es-active.png');

  // correction in page language
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  check('es UI strings used', (await dlg(page).locator('h2').textContent()) === 'Sugerir una traducción');
  check('es: plugin UI marked lang=es', (await page.locator('[data-ktranslationhelper-ui] .root').getAttribute('lang')) === 'es');
  check('review off: no comment box', (await dlg(page).locator('textarea.comment').count()) === 0);
  check('review off: button says Guardar', (await dlg(page).locator('.btn.primary').textContent()) === 'Guardar');
  await ta.fill('Pan recién horneado cada mañana');
  await ta.press('Control+Enter');
  await page.waitForTimeout(500);
  let es = JSON.parse(readFileSync(LANG + 'es.json', 'utf8'));
  check('php wrote es.json', es['ex.text.item1'] === 'Pan recién horneado cada mañana');
  check('updated in place', (await page.textContent('[data-i18n="ex.text.item1"]')) === 'Pan recién horneado cada mañana');
  await page.waitForTimeout(1300);
  check('closes after success', !(await dlg(page).evaluate((d) => d.open)));

  // missing string in es → fallback notice, fill it
  await page.click('[data-i18n="ex.text.item3"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  check('fallback notice', await dlg(page).locator('.warn').first().isVisible());
  await ta.fill('Abierto los siete días de la semana');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(500);
  es = JSON.parse(readFileSync(LANG + 'es.json', 'utf8'));
  check('missing es key added', es['ex.text.item3'] === 'Abierto los siete días de la semana');
  check('missing flag cleared', await page.locator('[data-i18n="ex.text.item3"][data-i18n-missing]').count() === 0);
  // One Spanish gap remains (ex.dynamic.body): the editor stays open and offers it
  await page.waitForTimeout(1300);
  const nextBtn = dlg(page).locator('.btn.next');
  check('next missing offered after filling a gap', (await dlg(page).evaluate((d) => d.open)) && (await nextBtn.textContent()) === 'Siguiente sin traducir (1)', await nextBtn.textContent());
  check('badge shows missing count', (await page.locator('[data-ktranslationhelper-ui] .badge .count').textContent()) === '1 sin traducir');
  await nextBtn.click();
  await page.waitForTimeout(200);
  check('next missing opens the remaining gap', (await ta.inputValue()).startsWith('Highlighting is done with CSS'));
  check('next missing flashes the element', await page.locator('[data-i18n="ex.dynamic.body"].kth-flash').count() === 1);
  await page.keyboard.press('Escape');

  // translate into French from the Spanish page
  await page.click('[data-i18n="ex.text.item2"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  const langSel = dlg(page).locator('select').first();
  const frLabel = await langSel.locator('option[value=fr]').textContent();
  check('language names in the page language', frLabel === 'Francés (Français)', frLabel);
  await langSel.selectOption('fr');
  await page.waitForTimeout(200);
  check('other-language notice', await dlg(page).locator('.notice').isVisible());
  check('notice uses localised names', (await dlg(page).locator('.notice span').textContent()).includes('Francés'));
  check('no existing fr', (await dlg(page).locator('.ref.none').count()) === 1);
  check('textarea lang=fr', (await ta.getAttribute('lang')) === 'fr');
  await shot(page, '07-other-lang.png');
  await ta.fill('Livraison gratuite dès 30 € d’achat');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(500);
  const fr = JSON.parse(readFileSync(LANG + 'fr.json', 'utf8'));
  check('php wrote fr.json', fr['ex.text.item2'] === 'Livraison gratuite dès 30 € d’achat');
  check('es text unchanged in page', (await page.textContent('[data-i18n="ex.text.item2"]')).startsWith('Envío'));
  await page.waitForTimeout(1300);

  // remembered language
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  check('remembers fr', (await dlg(page).locator('select').first().inputValue()) === 'fr');
  await dlg(page).locator('.notice button').click();
  await page.waitForTimeout(200);
  check('switch back to page lang', (await dlg(page).locator('select').first().inputValue()) === 'es');
  await page.keyboard.press('Escape');

  // html sanitised
  await page.click('[data-i18n="ex.html.sentence"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  await ta.fill('Acepta <a href="javascript:alert(1)" onclick="x()">esto</a><script>alert(1)</script> <strong>ya</strong> o <a href="about.html?lang=es">lee más</a>');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(500);
  es = JSON.parse(readFileSync(LANG + 'es.json', 'utf8'));
  const cleaned = 'Acepta <a>esto</a> <strong>ya</strong> o <a href="about.html?lang=es">lee más</a>';
  check('html sanitised, relative link with query kept', es['ex.html.sentence'] === cleaned, es['ex.html.sentence']);
  const inPage = await page.locator('[data-i18n="ex.html.sentence"]').innerHTML();
  check('sanitised text applied in place, not what was typed', inPage === cleaned, inPage);
  await page.waitForTimeout(1300);

  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("Ayuda")');
  const helpEs = await page.locator('[data-ktranslationhelper-ui] dialog').nth(2).locator('.steps li').allTextContents();
  check('review off: help says saved, in Spanish', helpEs.some((t) => t.startsWith('Las sugerencias se guardan')) && !helpEs.some((t) => t.includes('revisión')), helpEs.join(' | '));
  await page.keyboard.press('Escape');

  // form-encoded post (encoding: 'form') lands in $_POST
  const formPost = await page.evaluate(async () => {
    const body = new URLSearchParams({ key: 'ex.text.item3', lang: 'fr', text: 'Ouvert sept jours sur sept' });
    const r = await fetch('backend/update.php', { method: 'POST', body });
    return [r.status, await r.json()];
  });
  const frForm = JSON.parse(readFileSync(LANG + 'fr.json', 'utf8'));
  check('form-encoded post accepted', formPost[0] === 200 && frForm['ex.text.item3'] === 'Ouvert sept jours sur sept', JSON.stringify(formPost));

  // unknown key rejected
  const bad = await page.evaluate(async () => {
    const r = await fetch('backend/update.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'nope.key', lang: 'es', text: 'x' }) });
    return [r.status, await r.json()];
  });
  check('unknown key rejected', bad[0] === 404, JSON.stringify(bad));
  const bad2 = await page.evaluate(async () => {
    const r = await fetch('backend/update.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'ex.text.item1', lang: '../../x', text: 'x' }) });
    return [r.status, await r.json()];
  });
  check('path traversal rejected', bad2[0] === 422, JSON.stringify(bad2));
  // Requests from another website open in the same browser (they still come from this computer)
  const post = (headers, body = 'key=ex.text.item1&lang=fr&text=pwned', file = 'update.php') =>
    fetch(`${BASE}backend/${file}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body })
      .then(async (r) => [r.status, await r.json()]);
  const xsite = await post({ 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' });
  const xorigin = await post({ Origin: 'https://evil.example' }); // an older browser: no Sec-Fetch-Site
  const xnull = await post({ Origin: 'null' });
  const xreset = await post({ 'Sec-Fetch-Site': 'cross-site' }, '', 'reset.php');
  const frAfter = JSON.parse(readFileSync(LANG + 'fr.json', 'utf8'));
  check('cross-site post refused (Sec-Fetch-Site)', xsite[0] === 403 && xsite[1].ok === false, JSON.stringify(xsite));
  check('cross-origin post refused (Origin)', xorigin[0] === 403 && xnull[0] === 403, JSON.stringify([xorigin, xnull]));
  check('cross-site reset refused', xreset[0] === 403, JSON.stringify(xreset));
  check('nothing written by refused posts', frAfter['ex.text.item1'] !== 'pwned');
  const same = await post({ 'Sec-Fetch-Site': 'same-origin', Origin: ORIGIN }, 'key=ex.text.item1&lang=fr&text=Pain frais');
  check('same-origin post accepted', same[0] === 200, JSON.stringify(same));
  const tel = await post({ 'Content-Type': 'application/json' }, JSON.stringify({ key: 'ex.html.sentence', lang: 'fr', text: 'Appelez <a href="tel:+33100000000">ici</a>' }));
  check('tel: links kept by the sanitiser', tel[1].text === 'Appelez <a href="tel:+33100000000">ici</a>', JSON.stringify(tel));

  // reset
  await page.click('#reset-btn');
  await page.waitForTimeout(600);
  es = JSON.parse(readFileSync(LANG + 'es.json', 'utf8'));
  const fr2 = JSON.parse(readFileSync(LANG + 'fr.json', 'utf8'));
  check('reset restores es', es['ex.text.item1'] === 'Pan recién hecho cada mañana' && !('ex.text.item3' in es));
  check('reset restores fr', Object.keys(fr2).length === 0);
  check('page re-rendered after reset', (await page.textContent('[data-i18n="ex.text.item1"]')) === 'Pan recién hecho cada mañana');
  const unexpected = page.errors.filter((e) => !/status of (404|422)/.test(e));
  check('no unexpected errors (php)', unexpected.length === 0, unexpected.join(' | '));
  await ctx.close();
}

/* ---------------- screenshots: RTL, zh, dark, mobile ---------------- */
{
  const { ctx, page } = await newPage('static');
  await page.goto(BASE + '?lang=ar'); await ready(page);
  await page.click('#kth-toggle');
  await shot(page, '08-ar.png');
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  await shot(page, '09-ar-editor.png');
  check('ar textarea rtl', (await page.locator('[data-ktranslationhelper-ui] textarea.proposal').getAttribute('dir')) === 'rtl');
  check('ar plugin UI follows page direction', (await page.locator('[data-ktranslationhelper-ui] .root').getAttribute('dir')) === 'rtl');
  await ctx.close();
}
{
  const { ctx, page } = await newPage('static', { colorScheme: 'dark' });
  await page.goto(BASE + '?lang=zh-Hans'); await ready(page);
  await page.click('#kth-toggle');
  await page.click('#greeting', { modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  await shot(page, '10-zh-dark-editor.png');
  await ctx.close();
}
{
  const { ctx, page } = await newPage('static', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto(BASE + '?lang=fr'); await ready(page);
  await page.tap('#kth-toggle');
  await page.waitForTimeout(200);
  const msg = await page.locator('[data-ktranslationhelper-ui] .bubble span').textContent();
  check('touch message', msg.includes('Press and hold'), msg);
  // French has no translations at all: every string is a gap
  const countText = await page.locator('[data-ktranslationhelper-ui] .badge .count').textContent();
  const missingCount = Number(countText.split(' ')[0]);
  check('fr: badge counts missing strings', /^\d+ missing$/.test(countText) && missingCount > 50, countText);
  check('fr: English UI marked lang=en', (await page.locator('[data-ktranslationhelper-ui] .root').getAttribute('lang')) === 'en');
  await page.tap('[data-ktranslationhelper-ui] .badge button:has-text("All text")');
  await page.locator('[data-ktranslationhelper-ui] .tools input[type=checkbox]').check();
  check('fr: "missing only" filter', (await page.locator('[data-ktranslationhelper-ui] .list li button').count()) === missingCount);
  await page.locator('[data-ktranslationhelper-ui] .tools input[type=checkbox]').uncheck();
  await page.locator('[data-ktranslationhelper-ui] dialog[open] .x').click();
  await shot(page, '11-mobile-fr.png');

  // drafts: an unsent edit is kept for this page load
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  await page.evaluate(() => document.querySelector('[data-i18n="hero.title"]').dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true, button: 0, detail: 1 })));
  await page.waitForTimeout(200);
  await ta.fill('Aidez-nous à traduire cette page');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('[data-i18n="hero.title"]').dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true, button: 0, detail: 1 })));
  await page.waitForTimeout(200);
  check('draft restored', (await ta.inputValue()) === 'Aidez-nous à traduire cette page' && (await dlg(page).locator('.draft').isVisible()));
  await shot(page, '11b-draft.png');
  await dlg(page).locator('.draft button').click();
  check('draft discarded', (await ta.inputValue()) === 'Help us translate this page' && (await dlg(page).locator('.draft').count()) === 0);
  await page.keyboard.press('Escape');
  // long-press via CDP touch events
  const box = await page.locator('[data-i18n="hero.title"]').boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const pt = { x: box.x + 20, y: box.y + 10 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
  await page.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  check('long-press opens editor', await dlg(page).evaluate((d) => d.open));
  await shot(page, '12-mobile-editor.png');
  check('no errors (mobile)', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}

/* ---------------- custom config: validation, alt trigger, sessionStorage persistence, custom submit ---------------- */
{
  const { ctx, page } = await newPage('static');
  await page.goto(ORIGIN + '/docs/');
  await shot(page, '13-docs.png');
  await page.setContent(`<html lang="de"><body><p id="a" data-k="x.a">Hallo Welt</p><p id="b" data-k="x.b">Tschüss</p></body></html>`);
  await page.addScriptTag({ url: ORIGIN + '/dist/ktranslationhelper.js' });
  const r = await page.evaluate(async () => {
    const out = {};
    try { kTranslationHelper.init({ keyAttribute: 'data-k' }); } catch (e) { out.validation = e.message; }
    window.sent = [];
    window.h = kTranslationHelper.init({
      keyAttribute: 'data-k', defaultLanguage: 'en', trigger: 'alt+click', persist: 'sessionStorage',
      showComment: false, prefill: 'blank',
      submit: async (p) => { window.sent.push(p); return 'Danke!'; },
    });
    h.activate();
    return out;
  });
  check('validation error', /defaultLanguage/.test(r.validation || ''), r.validation);
  await page.click('#a', { modifiers: ['Shift'] });
  check('shift ignored with alt trigger', !(await dlg(page).evaluate((d) => d.open)));
  await page.click('#a', { modifiers: ['Alt'] });
  await page.waitForTimeout(150);
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  check('alt trigger opens, blank prefill', (await dlg(page).evaluate((d) => d.open)) && (await ta.inputValue()) === '');
  check('no language select without languages', (await dlg(page).locator('select').count()) === 0);
  check('lang from <html lang>', (await dlg(page).locator('.lbl').first().textContent()).includes('Deutsch'));
  await ta.fill('Hallo, Welt');
  await ta.press('Control+Enter');
  await page.waitForTimeout(200);
  const sent = await page.evaluate(() => window.sent[0]);
  check('custom submit payload', sent && sent.key === 'x.a' && sent.lang === 'de' && sent.text === 'Hallo, Welt' && sent.original === 'Hallo Welt', JSON.stringify(sent));
  check('string result = success message', (await dlg(page).locator('.status').textContent()) === 'Danke!');
  check('in-place update', (await page.textContent('#a')) === 'Hallo, Welt');
  await page.waitForTimeout(1300);

  // validation: empty and unchanged proposals are refused before anything is sent
  await page.click('#b', { modifiers: ['Alt'] });
  await page.waitForTimeout(150);
  await ta.press('Control+Enter');
  check('empty proposal refused', (await dlg(page).locator('.status').textContent()) === 'Please enter a translation.');
  await ta.fill('Tschüss');
  await ta.press('Control+Enter');
  check('unchanged proposal refused', (await dlg(page).locator('.status').textContent()) === 'The text has not been changed.');
  check('nothing sent for refused proposals', (await page.evaluate(() => window.sent.length)) === 1);
  await page.keyboard.press('Escape');

  // open({ key }) for a key that isn't on the page starts empty, not with the whole page's text
  await page.evaluate(() => h.open({ key: 'x.missing' }));
  await page.waitForTimeout(150);
  check('open({key}) without element starts empty', (await dlg(page).evaluate((d) => d.open)) && (await dlg(page).locator('.ref').first().textContent()) === '');
  await page.keyboard.press('Escape');

  await page.evaluate(() => h.destroy());
  check('destroy cleans up', await page.evaluate(() => !document.querySelector('[data-ktranslationhelper-ui]') && !document.querySelector('style[data-ktranslationhelper]') && !document.documentElement.classList.contains('kth-active')));
  check('no errors (custom)', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}

/* ---------------- custom config 2: cookie persistence, showMessage 'once', form encoding, onBeforeSubmit, error path, stored text ---------------- */
{
  const { ctx, page } = await newPage('static');
  const requests = [];
  await ctx.route('**/api/suggest', async (r) => {
    const body = Object.fromEntries(new URLSearchParams(r.request().postData() || ''));
    requests.push({ contentType: r.request().headers()['content-type'], body });
    if (body.text === 'fail') return r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Server said no' }) });
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Stored', text: body.text.toUpperCase() }) });
  });
  await page.goto(ORIGIN + '/docs/');
  await page.setContent(`<html lang="en"><body><p id="a" data-k="x.a">Hello world</p></body></html>`);
  await page.addScriptTag({ url: ORIGIN + '/dist/ktranslationhelper.js' });
  await page.evaluate(() => {
    window.applied = null; window.errors = [];
    window.h = kTranslationHelper.init({
      keyAttribute: 'data-k', defaultLanguage: 'en', persist: 'cookie', showMessage: 'once', closeDelay: 0,
      submitUrl: '/api/suggest', encoding: 'form',
      onBeforeSubmit: (p) => (p.text === 'veto' ? false : undefined),
      onError: (e) => window.errors.push(e),
      updateInPlace: (c) => { window.applied = c.text; },
    });
    h.activate();
  });
  const bubble = page.locator('[data-ktranslationhelper-ui] .bubble');
  check('cookie persistence set', (await page.evaluate(() => document.cookie)).includes('kTranslationHelper%3Aactive=1'));
  check("showMessage 'once': shown the first time", await bubble.isVisible());
  await page.evaluate(() => { h.deactivate(); h.activate(); });
  check('cookie persistence cleared and set again', (await page.evaluate(() => document.cookie)).includes('kTranslationHelper%3Aactive=1'));
  check("showMessage 'once': not shown again", !(await bubble.isVisible()));
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  await page.click('#a', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  await ta.fill('veto');
  await ta.press('Control+Enter');
  await page.waitForTimeout(150);
  check('onBeforeSubmit false cancels', requests.length === 0 && (await dlg(page).evaluate((d) => d.open)));
  await ta.fill('fail');
  await ta.press('Control+Enter');
  await page.waitForTimeout(300);
  check('form encoding used', requests.length === 1 && String(requests[0].contentType).includes('x-www-form-urlencoded') && requests[0].body.key === 'x.a', JSON.stringify(requests[0]));
  check('server error shown, dialog stays open', (await dlg(page).locator('.status').textContent()) === 'Server said no' && (await dlg(page).evaluate((d) => d.open)));
  check('onError called', (await page.evaluate(() => window.errors.length)) === 1);
  await ta.fill('hello there');
  await ta.press('Control+Enter');
  await page.waitForTimeout(300);
  check('stored text from response used for in-place update', (await page.evaluate(() => window.applied)) === 'HELLO THERE');
  check('updateInPlace function: page untouched', (await page.textContent('#a')) === 'Hello world');
  check('closeDelay 0 keeps dialog open', await dlg(page).evaluate((d) => d.open));
  await page.evaluate(() => h.deactivate());
  check('cookie removed on deactivate', !(await page.evaluate(() => document.cookie)).includes('kTranslationHelper%3Aactive'));
  const unexpected2 = page.errors.filter((e) => !/status of 500/.test(e));
  check('no unexpected errors (custom 2)', unexpected2.length === 0, unexpected2.join(' | '));
  await ctx.close();
}

/* ---------------- init() in <head>, showBadge: false, getSource returning '' ---------------- */
{
  const { ctx, page } = await newPage('static');
  await ctx.route(BASE + 'head-init.html', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html>
<html lang="fr"><head>
<script src="/dist/ktranslationhelper.js"></script>
<script>
  window.h = kTranslationHelper.init({
    keyAttribute: 'data-k', defaultLanguage: 'en', persist: false, showBadge: false, showMessage: 'always',
    getSource: () => '', submit: async () => true,
  });
</script>
</head><body><p id="a" data-k="x.a">Bonjour</p></body></html>` }));
  await page.goto(BASE + 'head-init.html');
  check('init() in <head> does not throw', page.errors.length === 0, page.errors.join(' | '));
  await page.evaluate(() => h.activate());
  check('UI mounted once <body> exists', (await page.locator('[data-ktranslationhelper-ui]').count()) === 1);
  check('showBadge false hides the badge only', (await page.locator('[data-ktranslationhelper-ui] .badge').isHidden()) && (await page.locator('[data-ktranslationhelper-ui] .bubble').isVisible()));
  await page.click('#a', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check("getSource returning '' falls back to the page text", (await dlg(page).locator('.ref').first().textContent()) === 'Bonjour');
  await ctx.close();
}

/* ---------------- updateInPlace: false, "which" select drafts, init() in <head> with autoActivate, script subtags ---------------- */
{
  const { ctx, page } = await newPage('static');
  await page.goto(ORIGIN + '/docs/');
  await page.setContent(`<html lang="en"><body><p id="a" data-k="x.a">Hello world</p><button id="b" data-k="x.b" data-ka="title:x.t" title="Tip">Label</button></body></html>`);
  await page.addScriptTag({ url: ORIGIN + '/dist/ktranslationhelper.js' });
  await page.evaluate(() => {
    window.h = kTranslationHelper.init({
      keyAttribute: 'data-k', attrMapAttribute: 'data-ka', defaultLanguage: 'en', persist: false, showMessage: false,
      closeDelay: 0, updateInPlace: false, submit: async () => ({ ok: true, message: 'Queued for review' }),
    });
    h.activate();
  });
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  // updateInPlace: false (a review queue): the suggestion is sent, so it is not a draft and gets the mark
  await page.click('#a', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  await ta.fill('Hello there');
  await ta.press('Control+Enter');
  await page.waitForTimeout(200);
  check('updateInPlace false: page untouched', (await page.textContent('#a')) === 'Hello world');
  check('updateInPlace false: suggested mark set', (await page.locator('#a[data-kth-suggested]').count()) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.click('#a', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check('updateInPlace false: sent suggestion is not restored as a draft', (await dlg(page).locator('.draft').count()) === 0 && (await ta.inputValue()) === 'Hello world');
  check('updateInPlace false: editor says already suggested', (await dlg(page).locator('.hint:has-text("already suggested")').count()) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  // "Text to translate": switching strings keeps the edit as a draft and starts the other string clean
  await page.click('#b', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  const which = dlg(page).locator('select').first();
  await ta.fill('My typed label');
  await which.selectOption('1');
  await page.waitForTimeout(150);
  check('which: other string starts from its own text', (await ta.inputValue()) === 'Tip' && (await dlg(page).locator('.draft').count()) === 0, await ta.inputValue());
  await which.selectOption('0');
  await page.waitForTimeout(150);
  check('which: edit kept as a draft', (await ta.inputValue()) === 'My typed label' && (await dlg(page).locator('.draft').count()) === 1, await ta.inputValue());
  await page.keyboard.press('Escape');
  check('no errors (review queue)', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}
{
  const { ctx, page } = await newPage('static');
  await ctx.route(BASE + 'head-count.html', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html>
<html lang="en"><head>
<script src="/dist/ktranslationhelper.js"></script>
<script>
  localStorage.setItem('kTranslationHelper:active', '1'); // as left by a previous page
  window.h = kTranslationHelper.init({ keyAttribute: 'data-k', missingAttribute: 'data-m', defaultLanguage: 'en', showMessage: false });
</script>
</head><body><p data-k="x.a" data-m>Hello</p><p data-k="x.b" data-m>World</p></body></html>` }));
  await page.goto(BASE + 'head-count.html');
  await page.waitForTimeout(200);
  check('init() in <head> + autoActivate: active', await page.evaluate(() => document.documentElement.classList.contains('kth-active')));
  check('init() in <head> + autoActivate: missing count shown once <body> exists', (await page.locator('[data-ktranslationhelper-ui] .badge .count').textContent()) === '2 missing');
  await page.evaluate(() => { h.deactivate(); localStorage.clear(); });
  await ctx.close();
}
{
  const { ctx, page } = await newPage('static');
  await page.goto(ORIGIN + '/docs/');
  await page.setContent(`<html lang="zh-Hans"><body><p id="a" data-k="x.a">你好</p></body></html>`);
  await page.addScriptTag({ url: ORIGIN + '/dist/ktranslationhelper.js' });
  await page.evaluate(() => {
    window.h = kTranslationHelper.init({ keyAttribute: 'data-k', defaultLanguage: 'en', languages: ['zh-Hant', 'en'], persist: false, showMessage: false, rememberLanguage: false, submit: async () => true });
    h.activate();
  });
  await page.click('#a', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  const langSel = dlg(page).locator('select').first();
  const codes = await langSel.locator('option').evaluateAll((os) => os.map((o) => o.value));
  check('zh-Hans page: zh-Hans offered alongside zh-Hant', codes.join(',') === 'zh-Hans,zh-Hant,en' && (await langSel.inputValue()) === 'zh-Hans', codes.join(','));
  await langSel.selectOption('zh-Hant');
  await page.waitForTimeout(150);
  check('zh-Hant is another language, not the page language', await dlg(page).locator('.notice').isVisible());
  await page.keyboard.press('Escape');
  check('no errors (subtags)', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}

/* ---------------- accessibility details: reduced motion, decorative numbers, focusable code blocks ---------------- */
{
  const { ctx, page } = await newPage('static', { reducedMotion: 'reduce' });
  await page.goto(BASE + '?lang=en'); await ready(page);
  await page.click('#kth-toggle');
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("All text")');
  await page.fill('[data-ktranslationhelper-ui] input[type=search]', 'express');
  await page.locator('[data-ktranslationhelper-ui] .list li button').first().click();
  await page.waitForTimeout(100);
  const anim = await page.locator('[data-i18n="ex.hidden.optExpress"]').evaluate((e) => getComputedStyle(e).animationName);
  check('reduced motion: no flash animation', anim === 'none', anim);
  check('card numbers hidden from screen readers', (await page.locator('.num[aria-hidden="true"]').count()) === 12);
  check('"?" button has an accessible name', (await page.getAttribute('.icon-btn', 'aria-label')) === 'Tips for searching');
  await page.goto(ORIGIN + '/docs/');
  check('docs code blocks and tables are focusable', (await page.locator('pre:not([tabindex="0"])').count()) === 0 && (await page.locator('.tbl:not([tabindex="0"])').count()) === 0);
  await ctx.close();
}

/* ---------------- local mode, maxLength, theme, canEdit, hotkey off ---------------- */
{
  const { ctx, page } = await newPage('static');
  await page.goto(ORIGIN + '/docs/');
  await page.setContent(`<html lang="en"><body><p id="a" data-k="x.a">Hello world</p><p id="b" data-k="x.b">Bye</p><a id="l" href="#" data-k="x.l">Link</a></body></html>`);
  await page.addScriptTag({ url: ORIGIN + '/dist/ktranslationhelper.js' });
  await page.evaluate(() => {
    window.submitted = [];
    window.h = kTranslationHelper.init({
      keyAttribute: 'data-k', defaultLanguage: 'en', persist: false, showMessage: false, closeDelay: 0,
      maxLength: 12, canEdit: (el, key) => key !== 'x.b',
      onSubmit: (r, p) => window.submitted.push([r, p]),
    });
    h.activate();
  });
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  check('theme auto follows OS (light)', (await page.locator('[data-ktranslationhelper-ui] .root').getAttribute('data-theme')) === 'light');
  await page.evaluate(() => { document.documentElement.style.colorScheme = 'dark'; });
  await page.waitForTimeout(100);
  check("theme auto follows the page's color-scheme", (await page.locator('[data-ktranslationhelper-ui] .root').getAttribute('data-theme')) === 'dark');
  await page.evaluate(() => { document.documentElement.style.colorScheme = ''; });

  await page.click('#b', { modifiers: ['Shift'] });
  check('canEdit false: no editor', !(await dlg(page).evaluate((d) => d.open)));
  await page.click('#a', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check('maxLength counter', (await dlg(page).locator('.meta-row .hint').textContent()) === '11 / 12');
  await ta.fill('Hello there, world');
  check('counter warns when over', (await dlg(page).locator('.meta-row .warn').textContent()) === '18 / 12');
  await ta.press('Control+Enter');
  check('too long refused', (await dlg(page).locator('.status').textContent()) === 'Please shorten the text to 12 characters.');
  await ta.fill('Hello, you');
  await ta.press('Control+Enter');
  await page.waitForTimeout(200);
  check('local mode: applied to the page', (await page.textContent('#a')) === 'Hello, you');
  check('local mode: message', (await dlg(page).locator('.status').textContent()) === 'Applied to this page only. It will be lost when the page is reloaded.');
  check('local mode: no comment box', (await dlg(page).locator('textarea.comment').count()) === 0);
  check('local mode: button says Apply', (await dlg(page).locator('.btn.primary').textContent()) === 'Apply');
  check('local mode: onSubmit with result.local', (await page.evaluate(() => window.submitted.length === 1 && window.submitted[0][0].local === true && window.submitted[0][1].text === 'Hello, you')));
  await page.keyboard.press('Escape');
  await page.evaluate(() => h.help());
  const helpLocal = page.locator('[data-ktranslationhelper-ui] dialog').nth(2);
  const legendLocal = await helpLocal.locator('.legend li').allTextContents();
  const stepsLocal = await helpLocal.locator('.steps li').allTextContents();
  check('help: legend without the missing row (no missingAttribute)', legendLocal.length === 3 && !legendLocal.some((t) => t.includes('Not translated yet')), legendLocal.join(' | '));
  check('help: local mode and page-only wording', stepsLocal.some((t) => t.startsWith('Suggestions are not sent')) && stepsLocal.some((t) => t.includes('Only the page language')), stepsLocal.join(' | '));
  await page.keyboard.press('Escape');
  await page.evaluate(() => h.destroy());

  // hotkey off
  await page.evaluate(() => {
    window.h = kTranslationHelper.init({ keyAttribute: 'data-k', defaultLanguage: 'en', persist: false, showMessage: false, hotkey: false, theme: 'dark', showHelp: false });
    h.activate();
  });
  check("theme: 'dark' forced", (await page.locator('[data-ktranslationhelper-ui] .root').getAttribute('data-theme')) === 'dark');
  check('showHelp: false hides the button', await page.locator('[data-ktranslationhelper-ui] .badge button:has-text("Help")').isHidden());
  await page.focus('#l');
  await page.keyboard.press('Shift+F2');
  check('hotkey: false does nothing', !(await dlg(page).evaluate((d) => d.open)));
  check('type declarations built', existsSync(join(ROOT, 'docs/dist/ktranslationhelper.d.ts')) && existsSync(join(ROOT, 'docs/dist/ktranslationhelper.d.mts')));
  check('no errors (features)', page.errors.length === 0, page.errors.join(' | '));
  await ctx.close();
}

/* ---------------- between pages ---------------- */
{
  const { ctx, page } = await newPage('php');
  await page.goto(BASE + 'index.html?lang=en');
  await ready(page);
  await page.click('#kth-toggle');
  const active = () => page.evaluate(() => document.documentElement.classList.contains('kth-active'));
  const bubble = page.locator('[data-ktranslationhelper-ui] .bubble');
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');

  // Choose Spanish as the target on the home page, then leave without submitting
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  await dlg(page).locator('select').first().selectOption('es');
  await page.keyboard.press('Escape');

  // A normal click on a nav link navigates as usual
  await page.click('.nav a[href="about.html"]');
  await page.waitForURL('**/about.html');
  await ready(page);
  await page.waitForTimeout(150);
  check('about: still active after navigating', await active());
  check('about: toggle in sync', (await page.getAttribute('#kth-toggle', 'aria-pressed')) === 'true');
  check('about: badge shown', await page.locator('[data-ktranslationhelper-ui] .badge').isVisible());
  check('about: message not repeated', !(await bubble.isVisible()));
  check('about: page title translatable', (await page.title()).startsWith('About us'));
  check('about: numbers formatted', (await page.textContent('[data-i18n="about.stat.loaves"]')) === '1,200 loaves a day');
  await shot(page, '20-about.png');

  await page.click('[data-i18n="about.story.p2"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check('about: remembers target language across pages', (await dlg(page).locator('select').first().inputValue()) === 'es');
  check('about: template shown', (await dlg(page).locator('.ref').first().textContent()).includes('{count}'));
  await ta.fill('Hoy trabajan {count} panaderos por turnos para tener el primer pan listo a las siete.');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(400);
  const es = JSON.parse(readFileSync(LANG + 'es.json', 'utf8'));
  check('about: suggestion saved to es.json', es['about.story.p2'].startsWith('Hoy trabajan {count}'));
  check('about: English text untouched', (await page.textContent('[data-i18n="about.story.p2"]')).startsWith('Today 12 bakers'));
  await page.waitForTimeout(1300);

  // A key shared by two pages: fix the image alt text here, see it on the home page
  await page.click('img.photo', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  await dlg(page).locator('.notice button').click(); // back to the page language (English)
  await page.waitForTimeout(150);
  await ta.fill('A round sourdough loaf on a wooden board');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(400);
  check('about: alt updated in place', (await page.getAttribute('img.photo', 'alt')) === 'A round sourdough loaf on a wooden board');
  await page.waitForTimeout(1300);

  await page.click('.nav a[href="contact.html"]');
  await page.waitForURL('**/contact.html');
  await ready(page);
  await page.waitForTimeout(150);
  check('contact: still active', await active());

  // Shift+click on the submit button edits its label and does not submit the form
  await page.click('button[type=submit][data-i18n]', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check('contact: shift+click submit opens editor', (await ta.inputValue()) === 'Send message');
  check('contact: form not submitted', await page.locator('#form-result').isHidden());
  await page.keyboard.press('Escape');

  // Normal submit shows a message that appears later and is highlighted
  await page.click('button[type=submit][data-i18n]');
  check('contact: validation message shown', (await page.textContent('#form-result')).includes('Please fill in'));
  // dashed, or solid when the mouse happens to be over it after the click
  check('contact: late message highlighted', ['dashed', 'solid'].includes(await page.locator('#form-result').evaluate((e) => getComputedStyle(e).outlineStyle)));
  await page.fill('input[name=name]', 'Sam');
  await page.fill('textarea[name=message]', 'Do you have rye bread?');
  await page.click('button[type=submit][data-i18n]');
  check('contact: sent message uses name', (await page.textContent('#form-result')).includes('Thanks, Sam!'));
  await page.click('#form-result', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check('contact: editor shows {name} template', (await dlg(page).locator('.ref').first().textContent()).includes('{name}'));
  await page.keyboard.press('Escape');

  // Placeholder attribute + option list
  await page.click('textarea[name=message]', { modifiers: ['Shift'] });
  await page.waitForTimeout(150);
  check('contact: textarea placeholder editable', (await ta.inputValue()) === 'How can we help?');
  await page.keyboard.press('Escape');
  await shot(page, '21-contact.png');

  await page.click('.nav a[href="index.html"]');
  await page.waitForURL('**/index.html');
  await ready(page);
  check('home: shared key fixed on the other page', (await page.getAttribute('img.photo', 'alt')) === 'A round sourdough loaf on a wooden board');

  // Exit on one page → off everywhere
  await page.click('[data-ktranslationhelper-ui] .badge .exit');
  await page.click('.nav a[href="about.html"]');
  await page.waitForURL('**/about.html');
  await ready(page);
  check('exit carries across pages', !(await active()));

  // Page language carries across pages too
  await page.selectOption('#lang-select', 'ar');
  await page.waitForURL('**lang=ar');
  await ready(page);
  await page.click('.nav a[href="contact.html"]');
  await page.waitForURL('**/contact.html');
  await ready(page);
  check('page language carries across pages', await page.evaluate(() => document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl'));
  await page.click('#kth-toggle');
  await shot(page, '22-contact-ar.png');
  const unexpected = page.errors.filter((e) => !/status of (404|422)/.test(e));
  check('no unexpected errors (pages)', unexpected.length === 0, unexpected.join(' | '));
  await ctx.close();
}

/* ---------------- security hardening and accessibility (review fixes) ---------------- */
{
  const { ctx, page } = await newPage('static');
  await page.goto(BASE + '?lang=en#secret-token');
  await ready(page);

  // A sessionStorage entry that isn't a list (another script sharing the storageKey) must not break anything
  await page.evaluate(() => sessionStorage.setItem('kTranslationHelper:suggested', '{"a":1}'));
  await page.click('#kth-toggle');
  await page.waitForTimeout(200);
  check('corrupt suggested list: activates', await page.evaluate(() => document.documentElement.classList.contains('kth-active')));
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(300);
  check('corrupt suggested list: editor opens', await dlg(page).evaluate((d) => d.open));
  check('corrupt suggested list: no errors', page.errors.length === 0, page.errors.join(' | '));

  // Screen readers: the mode change is announced, the text box is named by its caption alone and described by the rest
  const announce = page.locator('[data-ktranslationhelper-ui] .sr-only');
  check('activation announced', (await announce.textContent()).startsWith('Translation mode is on.'), await announce.textContent());
  check('proposal box named by its caption only', (await dlg(page).getByRole('textbox', { name: 'Your translation', exact: true }).count()) === 1);
  check('proposal label uses for/id', (await dlg(page).locator('label[for="kth-proposal-1"]').count()) === 1 && (await dlg(page).locator('label textarea').count()) === 0);
  const ta = page.locator('[data-ktranslationhelper-ui] textarea.proposal');
  const describedBy = await ta.getAttribute('aria-describedby');
  check('proposal described by counter, warning and status', ['kth-count-1', 'kth-placeholders-1', 'kth-status-1'].every((id) => describedBy.split(' ').includes(id)), describedBy);
  check('live regions are in the tree while empty', await dlg(page).evaluate((d) => {
    const st = d.querySelector('.status'); const ph = d.querySelector('#kth-placeholders-1');
    return getComputedStyle(st).display !== 'none' && ph.getAttribute('role') === 'status' && getComputedStyle(ph).display !== 'none';
  }));
  check('toast region present before use', await page.locator('[data-ktranslationhelper-ui] .toast').evaluate((t) => !t.hidden && t.getAttribute('role') === 'status'));
  await ta.fill('');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(100);
  check('validation error marks the box invalid and is assertive', (await ta.getAttribute('aria-invalid')) === 'true' && (await dlg(page).locator('.status').getAttribute('aria-live')) === 'assertive');
  await ta.type('x');
  check('typing clears aria-invalid', (await ta.getAttribute('aria-invalid')) === null);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);

  // Focus after closing an editor opened from the list goes to the text (if focusable), else to "All text"
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("All text")');
  await page.locator('[data-ktranslationhelper-ui] dialog[open] input[type=search]').fill(await page.textContent('[data-i18n="ex.links.link"]'));
  await page.locator('[data-ktranslationhelper-ui] dialog[open] .list button').first().click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('list → editor → Esc focuses the edited link', (await page.evaluate(() => document.activeElement.getAttribute('data-i18n'))) === 'ex.links.link');
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("All text")');
  await page.locator('[data-ktranslationhelper-ui] dialog[open] .list button').first().click(); // the page <title>: not focusable
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('list → editor → Esc falls back to the All text button', (await page.evaluate(() => {
    const host = document.querySelector('[data-ktranslationhelper-ui]');
    return document.activeElement === host && host.shadowRoot.activeElement && host.shadowRoot.activeElement.textContent;
  })) === 'All text');

  // Attribute mappings never offer code attributes, and URL attributes only with allowUrlAttributes;
  // script URLs are not applied even then; the payload url has no fragment
  const r = await page.evaluate(async () => {
    document.body.insertAdjacentHTML('beforeend',
      '<a id="probe" href="/x" title="tip" data-i18n="x.w" data-i18n-attr="onclick:x.y; href:x.z; style:x.s; title:x.t">hi</a>');
    const el = document.getElementById('probe');
    let url = null;
    const base = { keyAttribute: 'data-i18n', attrMapAttribute: 'data-i18n-attr', defaultLanguage: 'en', storageKey: 'probe', persist: false, showMessage: false };
    const h0 = kTranslationHelper.init(base);
    h0.open(el); await new Promise((res) => setTimeout(res, 250));
    const host0 = document.querySelectorAll('[data-ktranslationhelper-ui]')[1];
    const whichDefault = [...host0.shadowRoot.querySelectorAll('dialog[open] select option')].map((o) => o.textContent);
    h0.destroy(); await new Promise((res) => setTimeout(res, 250));
    const h = kTranslationHelper.init({ ...base, allowUrlAttributes: true, onBeforeSubmit: (p) => { url = p.url; } });
    const host = document.querySelectorAll('[data-ktranslationhelper-ui]')[1];
    const wait = () => new Promise((res) => setTimeout(res, 250));
    const submit = async (target, text) => {
      h.open(target); await wait();
      const d = host.shadowRoot.querySelector('dialog[open]');
      const t = d.querySelector('textarea.proposal'); t.value = text; t.dispatchEvent(new Event('input'));
      d.querySelector('form').requestSubmit(); await wait(); h.close(); await wait();
    };
    h.open(el); await wait();
    const which = [...host.shadowRoot.querySelectorAll('dialog[open] select option')].map((o) => o.textContent);
    h.close(); await wait();
    await submit({ key: 'x.y', attribute: 'onclick' }, 'alert(1)');
    await submit({ key: 'x.s', attribute: 'style' }, 'color:red');
    await submit({ key: 'x.z', attribute: 'href' }, 'javascript:alert(1)');
    const hrefAfterScript = el.getAttribute('href');
    await submit({ key: 'x.z', attribute: 'href' }, 'https://example.com/');
    await submit({ key: 'x.t', attribute: 'title' }, 'new tip');
    h.destroy();
    return { whichDefault, which, onclick: el.getAttribute('onclick'), style: el.getAttribute('style'), hrefAfterScript, href: el.getAttribute('href'), title: el.getAttribute('title'), url };
  });
  check('by default only text attributes are offered (no href, onclick, style)', r.whichDefault.length === 2 && !r.whichDefault.some((t) => /href|onclick|style/.test(t)), r.whichDefault.join(' / '));
  check('allowUrlAttributes offers href but never code attributes', r.which.length === 3 && r.which.some((t) => /href/.test(t)) && !r.which.some((t) => /onclick|style/.test(t)), r.which.join(' / '));
  check('onclick / style never written', r.onclick === null && r.style === null);
  check('javascript: href not applied', r.hrefAfterScript === '/x', r.hrefAfterScript);
  check('ordinary href and title applied', r.href === 'https://example.com/' && r.title === 'new tip');
  check('payload url has no fragment', typeof r.url === 'string' && !r.url.includes('#') && r.url.includes('lang=en'), r.url);

  // CSP nonce and the method guard
  const csp = await page.evaluate(() => {
    const h = kTranslationHelper.init({ keyAttribute: 'data-i18n', defaultLanguage: 'en', storageKey: 'probe2', persist: false, nonce: 'abc' });
    const host = [...document.querySelectorAll('[data-ktranslationhelper-ui]')].pop();
    const out = {
      page: [...document.querySelectorAll('style[data-ktranslationhelper]')].pop().nonce,
      shadow: host.shadowRoot.querySelector('style').nonce,
      inlineStyle: host.shadowRoot.querySelector('.root').getAttribute('style'),
      z: host.shadowRoot.querySelector('.root').style.getPropertyValue('--z'),
    };
    h.destroy();
    try { kTranslationHelper.init({ keyAttribute: 'data-i18n', defaultLanguage: 'en', persist: false, method: 'GET', submitUrl: '/x' }); out.getThrew = false; }
    catch (e) { out.getThrew = /GET/.test(e.message); }
    return out;
  });
  check('nonce on both style elements', csp.page === 'abc' && csp.shadow === 'abc', JSON.stringify(csp));
  check('z-index set through the CSSOM', csp.z === '2147483000' && (csp.inlineStyle || '').includes('--z'));
  check('method GET refused at init', csp.getThrew === true);

  // Missing text is dotted, suggested text double: told apart without colour
  await page.click('[data-ktranslationhelper-ui] .badge .exit');
  check('deactivation announced', (await announce.textContent()) === 'Translation mode is off.');
  await page.goto(BASE + '?lang=es');
  await ready(page);
  await page.click('#kth-toggle');
  await page.waitForTimeout(200);
  check('missing text has a dotted outline', (await page.locator('[data-i18n="ex.text.item3"]').evaluate((e) => getComputedStyle(e).outlineStyle)) === 'dotted');
  await page.click('[data-i18n="ex.text.item1"]', { modifiers: ['Shift'] });
  await page.waitForTimeout(300);
  await page.locator('[data-ktranslationhelper-ui] textarea.proposal').fill('Pan fresco cada mañana, sí');
  await page.click('[data-ktranslationhelper-ui] .btn.primary');
  await page.waitForTimeout(400);
  check('suggested text has a double outline', (await page.locator('[data-i18n="ex.text.item1"]').evaluate((e) => getComputedStyle(e).outlineStyle)) === 'double');
  await page.keyboard.press('Escape'); // the static backend answers ok: false, so the editor stays open
  await page.waitForTimeout(200);
  await page.click('[data-ktranslationhelper-ui] .badge button:has-text("Ayuda")');
  await page.waitForTimeout(200);
  check('legend swatches use the same styles', await page.locator('[data-ktranslationhelper-ui] dialog[open]').evaluate((d) =>
    getComputedStyle(d.querySelector('.swatch.missing')).outlineStyle === 'dotted' && getComputedStyle(d.querySelector('.swatch.suggested')).outlineStyle === 'double'));
  const unexpected = page.errors.filter((e) => !/status of (404|422)/.test(e));
  check('no unexpected errors (review fixes)', unexpected.length === 0, unexpected.join(' | '));
  await ctx.close();
}

await browser.close();

for (const r of results) console.log(r.filter(Boolean).join('  '));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
