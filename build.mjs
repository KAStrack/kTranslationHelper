#!/usr/bin/env node
// Builds dist/ from src/ktranslationhelper.js with no dependencies.
//   dist/ktranslationhelper.mjs — ES module (import kTranslationHelper from '…')
//   dist/ktranslationhelper.js  — classic script, exposes window.kTranslationHelper
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'src/ktranslationhelper.js'), 'utf8');
mkdirSync(join(root, 'dist'), { recursive: true });

const esm = src.replace(/\s*\/\/ @build:esm-only$/gm, '');
writeFileSync(join(root, 'dist/ktranslationhelper.mjs'), esm);

const [banner, ...rest] = src.split(/(?<=\*\/)\n/);
const body = rest.join('\n').replace(/^.*\/\/ @build:esm-only$/gm, '').trimEnd();
const iife = `${banner}
(function (global) {
  'use strict';
${body.replace(/^(?=.)/gm, '  ')}

  global.kTranslationHelper = kTranslationHelper;
  if (typeof module === 'object' && module.exports) module.exports = kTranslationHelper;
})(typeof window !== 'undefined' ? window : globalThis);
`;
writeFileSync(join(root, 'dist/ktranslationhelper.js'), iife);

// Type declarations, once for each build.
copyFileSync(join(root, 'src/ktranslationhelper.d.ts'), join(root, 'dist/ktranslationhelper.d.ts'));
copyFileSync(join(root, 'src/ktranslationhelper.d.ts'), join(root, 'dist/ktranslationhelper.d.mts'));

// UI string locales: copy src/locales/*.json and generate en.json from the built-in defaults.
mkdirSync(join(root, 'dist/locales'), { recursive: true });
const { default: k } = await import(pathToFileURL(join(root, 'dist/ktranslationhelper.mjs')).href);
writeFileSync(join(root, 'dist/locales/en.json'), JSON.stringify(k.strings, null, 2) + '\n');
for (const f of readdirSync(join(root, 'src/locales')).filter((n) => n.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(join(root, 'src/locales', f), 'utf8'));
  const missing = Object.keys(k.strings).filter((key) => !(key in data));
  if (missing.length) console.warn(`  locales/${f} is missing: ${missing.join(', ')}`);
  copyFileSync(join(root, 'src/locales', f), join(root, 'dist/locales', f));
}
console.log('Built dist/ktranslationhelper.js, dist/ktranslationhelper.mjs, dist/ktranslationhelper.d.ts and dist/locales/');
