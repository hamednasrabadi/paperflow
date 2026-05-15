import { useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildHTML, buildStaticHTML } from '@/lib/htmlTemplate';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export function Toolbar() {
  const setMarkdown = useStore((s) => s.setMarkdown);
  const markdown = useStore((s) => s.markdown);
  const headings = useStore((s) => s.headings);
  const { theme, colors } = useTheme();

  const [renderingMd, setRenderingMd] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const renderRef = useRef<WebView>(null);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/markdown', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const picked = result.assets[0];
      const file = new File(picked.uri);
      const content = await file.text();
      setMarkdown(content);
    } catch (err) {
      Alert.alert('Import failed', String(err));
    }
  };

  const handleExport = () => {
    if (exporting) return;
    setExporting(true);
    setRenderingMd(markdown);
  };

  const onRenderMessage = async (event: WebViewMessageEvent) => {
    let data: { type?: string; bodyHTML?: string; msg?: string };
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === 'error') {
      console.warn('[Export render]', data.msg);
      return;
    }
    if (data.type !== 'rendered' || !data.bodyHTML) return;

    setRenderingMd(null);

    try {
      const html = buildStaticHTML({ bodyHTML: data.bodyHTML, forPDF: true });
      const result = await Print.printToFileAsync({ html, base64: false });
      if (!result?.uri) {
        Alert.alert('Export failed', 'No PDF was generated.');
        return;
      }

      // Rename to a meaningful filename based on the first H1
      const desiredName = makeFileName(markdown) + '.pdf';
      const dirSep = result.uri.lastIndexOf('/');
      const newUri = dirSep > -1 ? result.uri.substring(0, dirSep + 1) + desiredName : result.uri;

      let shareUri = result.uri;
      if (newUri !== result.uri) {
        try {
          const tempFile = new File(result.uri);
          const target = new File(newUri);
          if (target.exists) target.delete();
          tempFile.move(target);
          shareUri = newUri;
        } catch (renameErr) {
          console.warn('[Export rename]', renameErr);
          // fall back to the original uri
        }
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Save or share PDF',
        });
      } else {
        Alert.alert('PDF created', `Saved at:\n${shareUri}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.warn('[Export]', err);
      Alert.alert('Export failed', msg);
    } finally {
      setExporting(false);
    }
  };

  const tocCount = headings.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <IconButton label="Import" onPress={handleImport} colors={colors} />
      <IconButton
        label={`Outline${tocCount ? ` (${tocCount})` : ''}`}
        onPress={() => router.push('/toc')}
        variant="ghost"
        colors={colors}
        disabled={tocCount === 0}
      />
      <View style={styles.spacer} />
      <IconButton
        label="Settings"
        onPress={() => router.push('/settings')}
        variant="ghost"
        colors={colors}
      />
      <IconButton
        label={exporting ? 'Exporting…' : 'Export PDF'}
        onPress={handleExport}
        variant="primary"
        colors={colors}
        disabled={exporting}
      />

      {renderingMd !== null && (
        <View style={styles.hiddenWebview} pointerEvents="none">
          <WebView
            ref={renderRef}
            originWhitelist={['*']}
            source={{
              html: buildHTML({ markdown: renderingMd, theme }),
              baseUrl: 'https://paperflow.local/',
            }}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onMessage={onRenderMessage}
            onError={(e) => {
              console.warn('[Export render onError]', e.nativeEvent);
              setExporting(false);
              setRenderingMd(null);
              Alert.alert('Export failed', e.nativeEvent.description || 'Render error');
            }}
          />
        </View>
      )}
    </View>
  );
}

function IconButton({
  label,
  onPress,
  variant = 'default',
  disabled = false,
  colors,
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'ghost';
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const bg =
    variant === 'primary' ? colors.accent : variant === 'ghost' ? 'transparent' : colors.surfaceAlt;
  const fg =
    variant === 'primary' ? colors.accentText : variant === 'ghost' ? colors.textMuted : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}>
      <Text style={[styles.btnLabel, { color: fg }, variant === 'ghost' && { fontWeight: '500' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// Slugify the first H1 of the markdown into a filesystem-safe filename.
// Preserves Persian / Arabic so a Persian-titled doc stays Persian-named.
function makeFileName(md: string): string {
  const h1 = md.match(/^#\s+(.+?)\s*$/m);
  if (h1?.[1]) {
    const slug = h1[1]
      .trim()
      // replace separator-like punctuation with dashes
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/[\s—–_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (slug.length > 0) return slug.slice(0, 80);
  }
  const date = new Date().toISOString().slice(0, 10);
  return `paperflow-${date}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spacer: { flex: 1 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnPressed: { opacity: 0.7 },
  btnDisabled: { opacity: 0.4 },
  btnLabel: { fontSize: 13, fontWeight: '600' },
  hiddenWebview: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
