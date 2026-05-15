// Self-rendering HTML template for the live preview WebView (and the hidden
// render WebView used during PDF export).
//
// Key features:
//   - markdown-it / texmath / katex bundled inline (offline-capable)
//   - KaTeX woff2 fonts base64-embedded in the CSS (math renders without network)
//   - Per-paragraph dir (ltr/rtl) based on first directional char
//   - Light + dark themes, switchable at runtime via document.body.dataset.theme
//   - Subtle scrollbar hint via WebKit pseudo-elements (decorative only — the
//     real interactive scrollbar is RN-rendered ScrollIndicator)
//   - Each block element gets data-source-line (from markdown-it's token.map)
//     so the RN side can drive scroll-sync between editor and preview
//   - WebView exposes:
//       window.renderMarkdown(src)   — re-render content
//       window.setTheme('light' | 'dark')
//       window.scrollToHeading(id)   — TOC jump (smooth)
//       window.scrollToLine(n)       — scroll-sync from editor (instant)

import { MARKDOWN_IT_JS, KATEX_JS, TEXMATH_JS, KATEX_CSS } from './bundled';
import type { Theme } from './theme';

function safeForScript(s: string): string {
  return s.replace(/<\/script/gi, '<\\/script');
}

function safeJSON(s: string): string {
  return JSON.stringify(s).replace(/<\/script/gi, '<\\/script');
}

const APP_CSS = `
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }

  body {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11.5pt;
    line-height: 1.85;
    margin: 0;
    padding: 24px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    direction: ltr;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  body[data-theme="light"] { background: #ffffff; color: #1a1a1a; }
  body[data-theme="light"] h1 { color: #0f172a; border-bottom-color: #2563eb; }
  body[data-theme="light"] h2 { color: #1e40af; }
  body[data-theme="light"] h3 { color: #1e3a5f; }
  body[data-theme="light"] h4 { color: #334155; }
  body[data-theme="light"] strong { color: #0f172a; }
  body[data-theme="light"] em { color: #475569; }
  body[data-theme="light"] code { background: #f1f5f9; color: #be185d; }
  body[data-theme="light"] blockquote { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }
  body[data-theme="light"] a { color: #2563eb; }
  body[data-theme="light"] hr { background: linear-gradient(to right, #dbeafe, #93c5fd, #dbeafe); }
  body[data-theme="light"] th { background: #f1f5f9; color: #1e3a5f; }
  body[data-theme="light"] tr:nth-child(even) { background: #f9fafb; }
  body[data-theme="light"] th, body[data-theme="light"] td { border-color: #d1d5db; }
  body[data-theme="light"] .prompt-label { background: #dbeafe; color: #1e40af; }
  body[data-theme="light"] .response-label { background: #dcfce7; color: #166534; }
  body[data-theme="light"] #content:empty::before { color: #94a3b8; }

  body[data-theme="dark"] { background: #0b1220; color: #e2e8f0; }
  body[data-theme="dark"] h1 { color: #f1f5f9; border-bottom-color: #3b82f6; }
  body[data-theme="dark"] h2 { color: #93c5fd; }
  body[data-theme="dark"] h3 { color: #bfdbfe; }
  body[data-theme="dark"] h4 { color: #cbd5e1; }
  body[data-theme="dark"] strong { color: #f8fafc; }
  body[data-theme="dark"] em { color: #cbd5e1; }
  body[data-theme="dark"] code { background: #1f2937; color: #f472b6; }
  body[data-theme="dark"] blockquote { background: #172033; color: #93c5fd; border-color: #3b82f6; }
  body[data-theme="dark"] a { color: #60a5fa; }
  body[data-theme="dark"] hr { background: linear-gradient(to right, #1e293b, #3b82f6, #1e293b); }
  body[data-theme="dark"] th { background: #1f2937; color: #93c5fd; }
  body[data-theme="dark"] tr:nth-child(even) { background: #111827; }
  body[data-theme="dark"] th, body[data-theme="dark"] td { border-color: #374151; }
  body[data-theme="dark"] .prompt-label { background: #1e3a8a; color: #bfdbfe; }
  body[data-theme="dark"] .response-label { background: #14532d; color: #bbf7d0; }
  body[data-theme="dark"] #content:empty::before { color: #64748b; }
  body[data-theme="dark"] .katex { color: #e2e8f0; }

  [dir="ltr"] {
    direction: ltr;
    text-align: left;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  [dir="rtl"] {
    direction: rtl;
    text-align: right;
    font-family: 'Vazirmatn', 'Tahoma', system-ui, sans-serif;
  }

  h1 {
    font-size: 22pt;
    font-weight: 800;
    border-bottom: 3px solid;
    padding-bottom: 10px;
    margin-top: 0;
    margin-bottom: 22px;
    letter-spacing: -0.3px;
    scroll-margin-top: 24px;
  }
  h2, h3, h4 { scroll-margin-top: 24px; }
  h2 { font-size: 16pt; font-weight: 700; margin-top: 30px; margin-bottom: 12px; }
  h3 { font-size: 14pt; font-weight: 700; margin-top: 24px; margin-bottom: 10px; }
  h4 { font-size: 12pt; font-weight: 600; margin-top: 18px; margin-bottom: 8px; }

  p { margin: 8px 0; orphans: 3; widows: 3; }
  strong { font-weight: 700; }

  ul, ol { padding-inline-start: 24px; padding-inline-end: 0; margin: 8px 0; }
  li { margin: 5px 0; }

  blockquote {
    border-inline-start: 4px solid;
    margin: 14px 0;
    padding: 12px 18px;
    border-radius: 6px;
  }

  hr { border: none; height: 2px; margin: 30px 0; }

  code {
    font-family: 'Consolas', 'Courier New', monospace;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.88em;
    direction: ltr;
    unicode-bidi: embed;
  }
  pre code { display: block; padding: 12px; overflow-x: auto; }
  a { text-decoration: none; }

  /* Math always LTR */
  .katex,
  .katex-display,
  .katex-display > .katex,
  .katex-html,
  .katex .base {
    direction: ltr !important;
    unicode-bidi: bidi-override !important;
    text-align: left !important;
  }
  .katex-display {
    display: block !important;
    margin: 16px auto !important;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 6px 0;
  }
  .katex:not(.katex-display .katex) {
    direction: ltr !important;
    unicode-bidi: isolate !important;
    display: inline-block;
  }
  .katex { font-size: 1.05em; }

  .prompt-label, .response-label {
    display: inline-block;
    font-weight: 600;
    font-size: 9.5pt;
    padding: 3px 14px;
    border-radius: 12px;
    margin: 22px 0 6px 0;
    letter-spacing: 0.5px;
  }

  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 11pt; }
  th, td { border: 1px solid; padding: 8px 12px; }
  th { font-weight: 700; }

  img { max-width: 100%; height: auto; border-radius: 6px; }

  #content:empty::before {
    content: 'Start typing markdown to see preview…';
    font-style: italic;
  }

  /* Hide native scrollbar — we render our own indicator overlay in RN */
  ::-webkit-scrollbar { width: 0; height: 0; }
`;

const PDF_PAGE_CSS = `
  @page {
    size: A4;
    margin: 2cm 2.2cm;
    @bottom-center {
      content: counter(page);
      font-size: 9pt;
      color: #999;
    }
  }
  body { padding: 0; }
`;

const APPLY_DIR_FN = `
  function applyDirections(root) {
    var LATIN = /[A-Za-z]/;
    var RTL = /[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/;
    var blocks = root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, dt, dd');
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      var clone = el.cloneNode(true);
      var ignore = clone.querySelectorAll('.katex, code, pre');
      for (var j = 0; j < ignore.length; j++) ignore[j].parentNode.removeChild(ignore[j]);
      var text = clone.textContent || '';
      var dir = null;
      for (var k = 0; k < text.length; k++) {
        var c = text[k];
        if (LATIN.test(c)) { dir = 'ltr'; break; }
        if (RTL.test(c)) { dir = 'rtl'; break; }
      }
      if (dir) el.setAttribute('dir', dir);
    }
  }
`;

const ASSIGN_HEADING_IDS_FN = `
  function assignHeadingIds(root) {
    var hs = root.querySelectorAll('h1, h2, h3, h4');
    for (var i = 0; i < hs.length; i++) {
      hs[i].id = 'h-' + i;
    }
  }
`;

export interface BuildHTMLOpts {
  markdown: string;
  theme: Theme;
}

export function buildHTML({ markdown, theme }: BuildHTMLOpts): string {
  const renderScript = `
    (function() {
      ${APPLY_DIR_FN}
      ${ASSIGN_HEADING_IDS_FN}

      var md = window.markdownit({
        html: true,
        linkify: true,
        typographer: true,
      }).use(window.markdownitTexmath, {
        engine: window.katex,
        delimiters: 'dollars',
        katexOptions: {
          throwOnError: false,
          strict: false,
          trust: true,
          displayMode: false,
        },
      });

      // Inject data-source-line on every block-level token so the RN side
      // can scroll the preview to the line currently visible in the editor.
      md.core.ruler.push('paperflow_source_line', function(state) {
        var tokens = state.tokens;
        for (var i = 0; i < tokens.length; i++) {
          var t = tokens[i];
          if (t.map && t.type.endsWith('_open')) {
            t.attrSet('data-source-line', String(t.map[0]));
          }
        }
      });

      window.renderMarkdown = function(source) {
        var processed = source
          .replace(/^## Prompt:\\s*\\n?/gm, '<div class="prompt-label">Prompt</div>\\n')
          .replace(/^## Response:\\s*\\n?/gm, '<div class="response-label">Response</div>\\n');
        var contentEl = document.getElementById('content');
        try {
          contentEl.innerHTML = md.render(processed);
          applyDirections(contentEl);
          assignHeadingIds(contentEl);
        } catch (e) {
          contentEl.innerHTML =
            '<pre style="color:#dc2626;background:#fef2f2;padding:16px;border-radius:8px;">' +
            (e && e.message ? e.message : String(e)) + '</pre>';
        }
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'rendered',
            bodyHTML: contentEl.innerHTML,
          }));
        }
      };

      window.setTheme = function(t) {
        document.body.dataset.theme = (t === 'dark') ? 'dark' : 'light';
      };

      window.scrollToHeading = function(id) {
        var el = document.getElementById(id);
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      // Scroll-sync from the editor: find the first block at-or-after the given
      // source line and scroll instantly (no smooth — we want it to track typing).
      window.scrollToLine = function(line) {
        var els = document.querySelectorAll('[data-source-line]');
        for (var i = 0; i < els.length; i++) {
          var l = parseInt(els[i].getAttribute('data-source-line'), 10);
          if (!isNaN(l) && l >= line) {
            els[i].scrollIntoView({ behavior: 'auto', block: 'start' });
            return;
          }
        }
        // Past the last block — scroll to bottom
        window.scrollTo(0, document.body.scrollHeight);
      };

      window.scrollToY = function(y) {
        window.scrollTo({ top: y, behavior: 'auto' });
      };

      window.renderMarkdown(window.__INITIAL_MD || '');
    })();
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${KATEX_CSS}</style>
<style>${APP_CSS}</style>
</head>
<body data-theme="${theme}">
<div id="content"></div>

<script>${safeForScript(MARKDOWN_IT_JS)}</script>
<script>${safeForScript(KATEX_JS)}</script>
<script>
  (function() {
    window.__module = { exports: {} };
    window.__require = function(name) {
      if (name === 'katex') return window.katex;
      throw new Error('paperflow: unknown require(' + name + ')');
    };
    window.module = window.__module;
    window.require = window.__require;
  })();
</script>
<script>${safeForScript(TEXMATH_JS)}</script>
<script>
  window.markdownitTexmath = window.__module.exports;
  delete window.__module;
  delete window.__require;
</script>
<script>window.__INITIAL_MD = ${safeJSON(markdown)};</script>
<script>${renderScript}</script>
</body>
</html>`;
}

export interface BuildStaticHTMLOpts {
  bodyHTML: string;
  forPDF?: boolean;
}

export function buildStaticHTML({ bodyHTML, forPDF = false }: BuildStaticHTMLOpts): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${KATEX_CSS}</style>
<style>${APP_CSS}</style>
${forPDF ? `<style>${PDF_PAGE_CSS}</style>` : ''}
</head>
<body data-theme="light">
<div id="content">${bodyHTML}</div>
</body>
</html>`;
}
