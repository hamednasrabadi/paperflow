import type { Heading } from './store';

// Extract H1–H4 headings from markdown source. Each heading carries:
//   - id           : matches the id assigned in the WebView DOM (h-0, h-1, ...)
//   - sourceOffset : character index, used to set TextInput cursor for editor jump
//   - sourceLine   : line index, used for scroll-sync between editor and preview
//
// Lines inside fenced code blocks (```...```) are skipped.
export function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const out: Heading[] = [];
  let inFence = false;
  let charIdx = 0;
  let n = 0;

  lines.forEach((line, lineIdx) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
    } else if (!inFence) {
      const m = line.match(/^(#{1,4})\s+(.+?)\s*$/);
      if (m) {
        out.push({
          id: `h-${n++}`,
          text: m[2].trim().replace(/\*\*|__|\*|_|`/g, ''),
          level: m[1].length,
          sourceOffset: charIdx,
          sourceLine: lineIdx,
        });
      }
    }
    charIdx += line.length + 1;
  });

  return out;
}
