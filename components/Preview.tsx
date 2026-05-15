import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ScrollIndicator } from './ScrollIndicator';
import { buildHTML } from '@/lib/htmlTemplate';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

interface Props {
  markdown: string;
}

const DEBOUNCE_MS = 300;

const ERROR_HOOK = `
  (function() {
    function send(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    window.onerror = function(msg, url, line, col) {
      send({ type: 'error', msg: String(msg), line: line, col: col });
      return false;
    };
    window.addEventListener('unhandledrejection', function(e) {
      send({ type: 'error', msg: 'Unhandled: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)) });
    });
    true;
  })();
  true;
`;

export function Preview({ markdown }: Props) {
  const webRef = useRef<WebView>(null);
  const { theme, colors } = useTheme();
  const scrollToHeadingId = useStore((s) => s.scrollToHeadingId);
  const setScrollToHeadingId = useStore((s) => s.setScrollToHeadingId);
  const syncSourceLine = useStore((s) => s.syncSourceLine);

  const [debounced, setDebounced] = useState(markdown);
  const [error, setError] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [viewH, setViewH] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(markdown), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [markdown]);

  const initialHTML = useMemo(() => buildHTML({ markdown: debounced, theme }), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps  -- intentional: only first value
  const [firstHTML] = useState(initialHTML);

  useEffect(() => {
    const safe = JSON.stringify(debounced).replace(/<\/script/gi, '<\\/script');
    webRef.current?.injectJavaScript(
      `if (window.renderMarkdown) { window.renderMarkdown(${safe}); } true;`
    );
  }, [debounced]);

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `if (window.setTheme) { window.setTheme(${JSON.stringify(theme)}); } true;`
    );
  }, [theme]);

  // TOC jump (smooth)
  useEffect(() => {
    if (!scrollToHeadingId) return;
    webRef.current?.injectJavaScript(
      `if (window.scrollToHeading) { window.scrollToHeading(${JSON.stringify(scrollToHeadingId)}); } true;`
    );
    setScrollToHeadingId(null);
  }, [scrollToHeadingId, setScrollToHeadingId]);

  // Scroll-sync from editor (instant, follows source line). Dedup so we don't
  // re-inject when the same line value bounces through the store.
  const lastSyncedLineRef = useRef<number | null>(null);
  useEffect(() => {
    if (syncSourceLine == null) return;
    if (syncSourceLine === lastSyncedLineRef.current) return;
    lastSyncedLineRef.current = syncSourceLine;
    webRef.current?.injectJavaScript(
      `if (window.scrollToLine) { window.scrollToLine(${syncSourceLine}); } true;`
    );
  }, [syncSourceLine]);

  // Drag the scroll indicator → tell the WebView to scroll
  const onScrollbarDrag = (y: number) => {
    webRef.current?.injectJavaScript(`window.scrollTo(0, ${y}); true;`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {error && (
        <View
          style={[
            styles.errorBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.danger },
          ]}>
          <Text style={[styles.errorText, { color: colors.danger }]} numberOfLines={3}>
            {error}
          </Text>
        </View>
      )}
      <View style={styles.webviewWrap}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: firstHTML, baseUrl: 'https://paperflow.local/' }}
          style={[styles.webview, { backgroundColor: colors.bg }]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          scalesPageToFit={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState
          injectedJavaScriptBeforeContentLoaded={ERROR_HOOK}
          onMessage={(event: WebViewMessageEvent) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'error') {
                setError(data.msg);
                console.warn('[Preview WebView]', data);
              } else if (data.type === 'rendered') {
                setError(null);
              }
            } catch {
              // ignore
            }
          }}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setScrollY(contentOffset.y);
            setContentH(contentSize.height);
            setViewH(layoutMeasurement.height);
          }}
          onError={(e) => {
            const desc = e.nativeEvent.description || 'WebView load error';
            setError(desc);
            console.warn('[Preview onError]', e.nativeEvent);
          }}
          renderLoading={() => (
            <View style={[styles.loading, { backgroundColor: colors.bg }]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        />
        <ScrollIndicator
          contentHeight={contentH}
          viewportHeight={viewH}
          scrollY={scrollY}
          onScrollToY={onScrollbarDrag}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webviewWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
