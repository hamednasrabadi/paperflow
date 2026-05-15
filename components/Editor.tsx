import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { ScrollIndicator } from './ScrollIndicator';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const LINE_HEIGHT = 22;

export function Editor({ value, onChange }: Props) {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const scrollToOffset = useStore((s) => s.scrollToHeadingOffset);
  const setScrollToOffset = useStore((s) => s.setScrollToHeadingOffset);
  const setSyncSourceLine = useStore((s) => s.setSyncSourceLine);

  const [contentH, setContentH] = useState(0);
  const [viewH, setViewH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);

  // Latest cursor line, cached on every onSelectionChange. Reading this in
  // onChangeText lets typing drive the sync without ever syncing FROM the raw
  // selection event (which fires bogus values on focus restore).
  const cursorLineRef = useRef(0);

  // RAF-throttled sync. Coalesces rapid scroll/typing updates so injectJavaScript
  // gets called at most once per frame, and only when the line actually changed.
  const targetLineRef = useRef<number>(-1);
  const rafIdRef = useRef<number | null>(null);
  const lastSentLineRef = useRef<number>(-1);

  const triggerSync = (line: number) => {
    targetLineRef.current = line;
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const l = targetLineRef.current;
      if (l === lastSentLineRef.current) return;
      lastSentLineRef.current = l;
      setSyncSourceLine(l);
    });
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // TOC jump: brief controlled selection forces TextInput to scroll the cursor
  // into view. Cleared after a tick so the user can move freely.
  useEffect(() => {
    if (scrollToOffset == null) return;
    setPendingSelection({ start: scrollToOffset, end: scrollToOffset });
    inputRef.current?.focus();
    const t = setTimeout(() => setPendingSelection(undefined), 80);
    setScrollToOffset(null);
    return () => clearTimeout(t);
  }, [scrollToOffset, setScrollToOffset]);

  // Drag scrollbar → land cursor at the corresponding line (TextInput
  // auto-scrolls to keep selection visible).
  const onScrollbarDrag = (y: number) => {
    const targetLine = Math.max(0, Math.floor(y / LINE_HEIGHT));
    const lines = value.split('\n');
    let offset = 0;
    for (let i = 0; i < Math.min(targetLine, lines.length); i++) {
      offset += lines[i].length + 1;
    }
    setPendingSelection({ start: offset, end: offset });
    setTimeout(() => setPendingSelection(undefined), 60);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={(text) => {
          onChange(text);
          // Typing → sync to wherever the cursor currently is. The editor's
          // own auto-scroll (when typing past the bottom) will also fire
          // onScroll, but that's fine — RAF + dedup makes it idempotent.
          triggerSync(cursorLineRef.current);
        }}
        multiline
        autoCorrect={false}
        autoCapitalize="none"
        textAlignVertical="top"
        placeholder="Type or paste markdown here…"
        placeholderTextColor={colors.placeholder}
        keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
        selectionColor={colors.accent}
        selection={pendingSelection}
        scrollEnabled
        onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
        onContentSizeChange={(e) => setContentH(e.nativeEvent.contentSize.height)}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setScrollY(y);
          triggerSync(Math.max(0, Math.floor(y / LINE_HEIGHT)));
        }}
        onSelectionChange={(e) => {
          // Cache cursor line — DO NOT fire sync from this event (raw
          // selection-change fires on focus with the cursor at the previous
          // position, which is often the end of the doc, causing the preview
          // to jump to the bottom and back).
          const charPos = e.nativeEvent.selection.start;
          cursorLineRef.current =
            value.substring(0, charPos).split('\n').length - 1;
        }}
      />
      <ScrollIndicator
        contentHeight={contentH}
        viewportHeight={viewH}
        scrollY={scrollY}
        onScrollToY={onScrollbarDrag}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: LINE_HEIGHT,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    padding: 16,
    paddingRight: 24,
    textAlignVertical: 'top',
  },
});
