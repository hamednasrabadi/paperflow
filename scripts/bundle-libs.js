// Bundles markdown-it / texmath / katex JS + CSS into lib/bundled.ts so the
// WebView runs everything offline. KaTeX fonts (woff2) are base64-embedded
// directly into the CSS so math renders correctly without any network access.
//
// Run after `npm install` or whenever any of these libs change:
//   node scripts/bundle-libs.js

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readBin(rel) {
  return fs.readFileSync(path.join(root, rel));
}

// 1. Read library JS bundles.
const markdownIt = read('node_modules/markdown-it/dist/markdown-it.min.js');
const katexJs = read('node_modules/katex/dist/katex.min.js');
const texmath = read('node_modules/markdown-it-texmath/texmath.js');

// 2. Read KaTeX CSS and inline the font files as base64 data URIs.
const katexCssRaw = read('node_modules/katex/dist/katex.min.css');
const fontsDir = path.join(root, 'node_modules/katex/dist/fonts');

// Match `url(fonts/<NAME>.woff2) format("woff2")` and replace with data: URI.
const inlinedCss = katexCssRaw.replace(
  /url\(fonts\/([^)]+\.woff2)\)\s*format\(["']?woff2["']?\)/gi,
  (_, fontName) => {
    const fontPath = path.join(fontsDir, fontName);
    if (!fs.existsSync(fontPath)) return _;
    const base64 = readBin(`node_modules/katex/dist/fonts/${fontName}`).toString('base64');
    return `url(data:font/woff2;base64,${base64}) format("woff2")`;
  }
);

// Drop fallback woff/ttf URLs to shrink CSS — woff2 is supported by every
// WebView we target.
const katexCss = inlinedCss
  .replace(/,\s*url\(fonts\/[^)]+\.woff\)\s*format\(["']?woff["']?\)/gi, '')
  .replace(/,\s*url\(fonts\/[^)]+\.ttf\)\s*format\(["']?truetype["']?\)/gi, '');

const out = `// AUTO-GENERATED. Regenerate with: node scripts/bundle-libs.js
/* eslint-disable */

export const MARKDOWN_IT_JS = ${JSON.stringify(markdownIt)};
export const KATEX_JS = ${JSON.stringify(katexJs)};
export const TEXMATH_JS = ${JSON.stringify(texmath)};
export const KATEX_CSS = ${JSON.stringify(katexCss)};
`;

const outPath = path.join(root, 'lib/bundled.ts');
fs.writeFileSync(outPath, out, 'utf8');

console.log('Wrote lib/bundled.ts');
console.log('Sizes (chars):', {
  'markdown-it': markdownIt.length,
  katex: katexJs.length,
  texmath: texmath.length,
  'katex-css (with embedded fonts)': katexCss.length,
  total: markdownIt.length + katexJs.length + texmath.length + katexCss.length,
});
