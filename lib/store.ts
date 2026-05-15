import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import type { ThemePref } from './theme';
import { extractHeadings } from './markdown';

export type ViewMode = 'edit' | 'preview';

export interface Heading {
  id: string;
  text: string;
  level: number;
  sourceOffset: number;
  sourceLine: number;
}

interface PaperflowState {
  // Document
  markdown: string;
  setMarkdown: (md: string) => void;

  // View tab (transient)
  view: ViewMode;
  setView: (v: ViewMode) => void;

  // Settings (persisted)
  livePreviewSplit: boolean;
  setLivePreviewSplit: (val: boolean) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  splitRatio: number;
  setSplitRatio: (r: number) => void;

  // Derived (re-computed in setMarkdown)
  headings: Heading[];

  // One-shot navigation requests (TOC)
  scrollToHeadingId: string | null;
  setScrollToHeadingId: (id: string | null) => void;
  scrollToHeadingOffset: number | null;
  setScrollToHeadingOffset: (offset: number | null) => void;

  // Continuous scroll-sync (editor cursor line → preview)
  syncSourceLine: number | null;
  setSyncSourceLine: (line: number | null) => void;
}

const DEFAULT_MARKDOWN = `# Welcome to Paperflow

A clean **markdown** editor with live preview and PDF export.

## Features

- Edit markdown with full formatting
- Live preview with math rendering
- Export to PDF, share anywhere
- Persian + English with proper RTL/LTR handling

## Math example

Inline: $E = mc^2$

Display:
$$
\\int_0^\\infty e^{-x^2}\\, dx = \\frac{\\sqrt{\\pi}}{2}
$$

## نمونه فارسی

این یک متن آزمایشی است. فرمول‌ها مثل $\\bar{X} = \\frac{1}{n}\\sum_{i=1}^n X_i$ به صورت چپ به راست نمایش داده می‌شوند.
`;

export const useStore = create<PaperflowState>()(
  persist(
    (set) => ({
      markdown: DEFAULT_MARKDOWN,
      setMarkdown: (md) => set({ markdown: md, headings: extractHeadings(md) }),

      view: 'edit',
      setView: (v) => set({ view: v }),

      livePreviewSplit: false,
      setLivePreviewSplit: (val) => set({ livePreviewSplit: val }),
      theme: 'system',
      setTheme: (t) => set({ theme: t }),
      splitRatio: 0.5,
      setSplitRatio: (r) => set({ splitRatio: Math.max(0.15, Math.min(0.85, r)) }),

      headings: extractHeadings(DEFAULT_MARKDOWN),

      scrollToHeadingId: null,
      setScrollToHeadingId: (id) => set({ scrollToHeadingId: id }),
      scrollToHeadingOffset: null,
      setScrollToHeadingOffset: (offset) => set({ scrollToHeadingOffset: offset }),

      syncSourceLine: null,
      setSyncSourceLine: (line) => set({ syncSourceLine: line }),
    }),
    {
      name: 'paperflow-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        markdown: state.markdown,
        livePreviewSplit: state.livePreviewSplit,
        theme: state.theme,
        splitRatio: state.splitRatio,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.headings = extractHeadings(state.markdown);
        }
      },
    }
  )
);
