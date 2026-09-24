#!/usr/bin/env node
/*
 * WCAG 2.1 AA audit of the demo and the documentation with axe-core, in headless Chromium.
 *
 *   npm install --no-save playwright axe-core   # once (both at once: --no-save prunes the other)
 *   node tests/a11y.test.mjs                    # or: npm run test:a11y
 *
 * Audits each page in several states (translation mode off and on, editor / list / help open, dark
 * mode, Arabic, 320px) with the wcag2a, wcag2aa, wcag21a and wcag21aa rule sets, plus a few checks
 * axe cannot make: horizontal overflow at 320px and a visible focus ring on highlighted text.
 * Exits with status 1 on any violation.
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let chromium;
let axeSrc;
try {
  ({ chromium } = (await import('playwright')).default ?? (await import('playwright')));
  axeSrc = readFileSync(join(dirname(fileURLToPath(import.meta.resolve('axe-core/package.json'))), 'axe.min.js'), 'utf8');
} catch (_) {
  console.error('Playwright and axe-core are needed. Run: npm install --no-save playwright axe-core');
  process.exit(2);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = await new Promise((ok) => {
  const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); });
});
const ORIGIN = `http://127.0.0.1:${port}`;
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', join(ROOT, 'docs')], { stdio: 'ignore' });
process.on('exit', () => php.kill());
for (let i = 0; i < 50; i++) {
  try { await fetch(ORIGIN + '/'); break; } catch (_) { await new Promise((r) => setTimeout(r, 100)); }
}

const browser = await chromium.launch();
const problems = [];
const seen = new Set();
const ready = (p) => p.waitForFunction(() => document.querySelector('#lang-select option'));
const on = async (p) => { await p.click('#kth-toggle'); await p.waitForTimeout(200); };

async function audit(label, setup, { scheme = 'light', width = 1280 } = {}) {
  const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 } });
  await ctx.route(ORIGIN + '/config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: `window.DEMO_CONFIG = { backend: 'php', showKey: false };` }));
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  await setup(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) problems.push(`${label}: page is ${overflow}px wider than the ${width}px viewport (WCAG 1.4.10 reflow)`);
  await page.addScriptTag({ content: axeSrc });
  const res = await page.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
  let n = 0;
  for (const v of res.violations) {
    for (const node of v.nodes) {
      const key = `${v.id}|${node.target.join(' ')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      n++;
      problems.push(`${label}: [${v.impact}] ${v.id} at ${node.target.join(' ')}\n      ${node.failureSummary.split('\n').slice(1).join(' ').trim()}`);
    }
  }
  console.log(`${n ? 'FAIL' : 'PASS'}  ${label}${overflow > 0 ? '  (overflow)' : ''}`);
  await ctx.close();
}

await audit('home, mode off', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); });
await audit('home, mode on', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); });
await audit('home, mode on, dark', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); }, { scheme: 'dark' });
await audit('editor open', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); await p.click('#greeting', { modifiers: ['Shift'] }); await p.waitForTimeout(200); });
await audit('editor, other language, Spanish page', async (p) => { await p.goto(ORIGIN + '/?lang=es'); await ready(p); await on(p); await p.click('[data-i18n="ex.text.item3"]', { modifiers: ['Shift'] }); await p.waitForTimeout(200); await p.locator('[data-ktranslationhelper-ui] dialog select').first().selectOption('fr'); await p.waitForTimeout(200); });
await audit('editor open, dark', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); await p.click('#greeting', { modifiers: ['Shift'] }); await p.waitForTimeout(200); }, { scheme: 'dark' });
await audit('list open', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); await p.click('[data-ktranslationhelper-ui] .badge button:has-text("All text")'); });
await audit('list open, dark', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); await p.click('[data-ktranslationhelper-ui] .badge button:has-text("All text")'); }, { scheme: 'dark' });
await audit('help open', async (p) => { await p.goto(ORIGIN + '/?lang=en'); await ready(p); await on(p); await p.click('[data-ktranslationhelper-ui] .badge button:has-text("Help")'); });
await audit('about, mode on', async (p) => { await p.goto(ORIGIN + '/about.html?lang=en'); await ready(p); await on(p); });
await audit('contact, mode on, after submit', async (p) => { await p.goto(ORIGIN + '/contact.html?lang=en'); await ready(p); await on(p); await p.click('button[type=submit][data-i18n]'); });
await audit('home, Arabic, mode on', async (p) => { await p.goto(ORIGIN + '/?lang=ar'); await ready(p); await on(p); });
await audit('home, Chinese, dark', async (p) => { await p.goto(ORIGIN + '/?lang=zh-Hans'); await ready(p); await on(p); }, { scheme: 'dark' });
await audit('home, French (no UI locale), 320px', async (p) => { await p.goto(ORIGIN + '/?lang=fr'); await ready(p); await on(p); }, { width: 320 });
await audit('about, 320px', async (p) => { await p.goto(ORIGIN + '/about.html?lang=en'); await ready(p); await on(p); }, { width: 320 });
await audit('contact, 320px', async (p) => { await p.goto(ORIGIN + '/contact.html?lang=en'); await ready(p); await on(p); }, { width: 320 });
await audit('docs', async (p) => { await p.goto(ORIGIN + '/docs/'); });
await audit('docs, dark', async (p) => { await p.goto(ORIGIN + '/docs/'); }, { scheme: 'dark' });
await audit('docs, 320px', async (p) => { await p.goto(ORIGIN + '/docs/'); }, { width: 320 });

// Focus must stay visible on highlighted text while translation mode is on (WCAG 2.4.7).
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(ORIGIN + '/?lang=en'); await ready(page); await on(page);
  await page.keyboard.press('Tab'); // from the toggle button to the first highlighted link, as a keyboard user would
  const cs = await page.evaluate(() => {
    const e = document.activeElement; const c = getComputedStyle(e);
    return { el: e.getAttribute('data-i18n'), outline: c.outlineStyle, width: c.outlineWidth, shadow: c.boxShadow };
  });
  const ok = cs.el === 'ex.links.link' && cs.outline === 'solid' && parseFloat(cs.width) >= 3 && cs.shadow !== 'none';
  console.log(`${ok ? 'PASS' : 'FAIL'}  focus ring on highlighted text`);
  if (!ok) problems.push(`focus ring on highlighted text: ${JSON.stringify(cs)} (WCAG 2.4.7)`);
  await ctx.close();
}

await browser.close();
php.kill();
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log('  - ' + p);
}
console.log(`\n${problems.length ? 'FAILED' : 'All accessibility checks passed'}`);
process.exit(problems.length ? 1 : 0);
